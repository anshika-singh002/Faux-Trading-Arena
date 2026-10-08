"""
AI Coach grounded in live data.

Questions that mention a supported stock get a briefing built from the live
quote, technical indicators from real daily candles, the XGBoost model's
current signal and recent headlines. Questions about the user's portfolio get
their actual holdings, valued at live prices, with a risk check. Anything else
returns None so the caller can fall back to the general educational answers.
"""
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position
from app.models.user import User
from app.modules.market_data import live

ALIASES: dict[str, list[str]] = {
    "SBIN": [r"\bsbin\b", r"\bsbi\b", r"state bank"],
    "RELIANCE": [r"reliance", r"\bril\b"],
    "HDFCBANK": [r"hdfc"],
    "ICICIBANK": [r"icici"],
    "INFY": [r"\binfy\b", r"infosys"],
    "TCS": [r"\btcs\b", r"tata consultancy"],
    "ITC": [r"\bitc\b"],
    "LT": [r"\bl&t\b", r"\blt\b", r"larsen"],
    "BHARTIARTL": [r"airtel", r"bharti"],
    "ABCAPITAL": [r"abcapital", r"aditya birla"],
}

# Every other stock is matched by its ticker or full company name
for _sym, _name in live.STOCK_NAMES.items():
    ALIASES.setdefault(_sym, [r"" + re.escape(_sym.lower()) + r"", re.escape(_name.lower().rstrip(".")) ])

SECTORS = {
    "SBIN": "Banking", "HDFCBANK": "Banking", "ICICIBANK": "Banking", "ABCAPITAL": "NBFC",
    "INFY": "IT", "TCS": "IT", "RELIANCE": "Energy", "ITC": "FMCG", "LT": "Infra",
    "BHARTIARTL": "Telecom",
}

PORTFOLIO_WORDS = ("portfolio", "holding", "my stocks", "my positions", "allocation",
                   "diversif", "my risk", "how am i doing", "my p&l", "my profit")
MARKET_WORDS = ("market", "nifty", "sensex", "indices", "today")


def _inr(x: float) -> str:
    return f"₹{x:,.2f}"


def _find_symbols(message: str) -> list[str]:
    text = message.lower()
    return [sym for sym, pats in ALIASES.items() if any(re.search(p, text) for p in pats)]


def _technicals(symbol: str) -> Optional[dict]:
    from app.modules.backtesting.engine import compute_indicators

    df = live.get_daily(symbol)
    if df is None or len(df) < 60:
        return None
    ind = compute_indicators(df)
    last = lambda name: float(ind[name].iloc[-1])  # noqa: E731
    close = float(df["close"].iloc[-1])
    month_ago = float(df["close"].iloc[-22]) if len(df) > 22 else close
    return {
        "rsi": last("rsi_14"), "sma20": last("sma_20"), "sma50": last("sma_50"),
        "close": close, "month_return": (close - month_ago) / month_ago * 100,
    }


def _rsi_note(rsi: float) -> str:
    return "overbought territory" if rsi > 70 else "oversold territory" if rsi < 30 else "a neutral zone"


async def _stock_brief(symbol: str, holdings: dict[str, Position]) -> tuple[str, list[str]]:
    from app.modules.ai.ml_service import model1_service
    from app.modules.ai.router import _live_headlines, _COMPANY_NAMES

    used = []
    name = _COMPANY_NAMES.get(symbol, symbol)
    lines = [f"**{name} ({symbol})**"]

    full = live.get_full_quote(symbol)
    if full:
        used.append("live quote")
        arrow = "up" if full["change_percent"] >= 0 else "down"
        lines.append(f"- Price: **{_inr(full['price'])}**, {arrow} {abs(full['change_percent']):.2f}% today")
        if full.get("week52_low") and full.get("week52_high"):
            lines.append(f"- 52-week range: {_inr(full['week52_low'])} to {_inr(full['week52_high'])}")
    else:
        lines.append("- Price: unavailable (the live market feed is not responding right now)")

    tech = _technicals(symbol)
    if tech:
        used.append("technical indicators")
        trend = "above" if tech["close"] > tech["sma50"] else "below"
        lines.append(f"- RSI(14): **{tech['rsi']:.0f}**, in {_rsi_note(tech['rsi'])}")
        lines.append(f"- Trading {trend} its 50-day average ({_inr(tech['sma50'])}); {tech['month_return']:+.1f}% over the past month")

    if symbol in live.AI_SYMBOLS:
        sig = model1_service.predict(symbol, live.get_price(symbol) or 0.0)
        used.append("XGBoost model")
        direction = {"UP": "leans **up**", "DOWN": "leans **down**", "NEUTRAL": "has **no clear direction**"}[sig.direction]
        source = "from today's candles" if sig.is_live else "from its stored test-set output"
        lines.append(f"- XGBoost 5-day signal ({source}): {direction} ({sig.p_up * 100:.0f}% up / {sig.p_down * 100:.0f}% down)")
    else:
        lines.append("- XGBoost signal: not available (the models were trained on 10 specific stocks)")

    heads = await _live_headlines(symbol, 3)
    if heads:
        used.append("news headlines")
        avg = sum(h["score"] for h in heads) / len(heads)
        mood = "positive" if avg > 0.15 else "negative" if avg < -0.15 else "mixed"
        lines.append(f"- News tone is **{mood}**. Latest: “{heads[0]['title']}” ({heads[0]['source']})")

    pos = holdings.get(symbol)
    if pos:
        price = live.get_price(symbol, pos.avg_cost)
        pnl = (price - pos.avg_cost) * pos.quantity
        lines.append(f"- You hold **{pos.quantity:g} shares** at an average cost of {_inr(pos.avg_cost)}: unrealised {_inr(pnl)} ({(price / pos.avg_cost - 1) * 100:+.1f}%)")
        used.append("your position")

    lines.append("\n_Educational information from market data and a statistical model. Not financial advice._")
    return "\n".join(lines), used


def _portfolio_brief(user: User, positions: list[Position]) -> tuple[str, list[str]]:
    if not positions:
        return (
            f"You hold no positions yet and have **{_inr(user.virtual_balance)}** in cash. "
            "Browse the Market page to place your first trade, or ask me about a stock.",
            ["your portfolio"],
        )
    rows, invested_value = [], 0.0
    for p in positions:
        price = live.get_price(p.symbol, p.avg_cost)
        mv = p.quantity * price
        invested_value += mv
        rows.append((p, price, mv))
    total = user.virtual_balance + invested_value
    lines = [f"**Your portfolio is worth {_inr(total)}** ({_inr(invested_value)} invested, {user.virtual_balance / total * 100:.0f}% cash)\n"]
    sector_w: dict[str, float] = {}
    flags = []
    for p, price, mv in sorted(rows, key=lambda r: -r[2]):
        w = mv / total * 100
        pnl_pct = (price / p.avg_cost - 1) * 100
        lines.append(f"- **{p.symbol}**: {w:.0f}% of portfolio, {pnl_pct:+.1f}% vs your cost")
        _sec = SECTORS.get(p.symbol) or live.STOCK_SECTORS.get(p.symbol, "Other")
        sector_w[_sec] = sector_w.get(_sec, 0) + w
        if w > 25:
            flags.append(f"{p.symbol} is {w:.0f}% of your portfolio. A single stock above ~25% concentrates risk")
        if pnl_pct < -10:
            flags.append(f"{p.symbol} is down {abs(pnl_pct):.0f}% from your cost. Decide whether your original reason still holds")
    for sector, w in sector_w.items():
        if w > 50:
            flags.append(f"{w:.0f}% of the portfolio is in {sector}. Consider spreading across sectors")
    if user.virtual_balance / total > 0.7:
        flags.append("Most of your portfolio is idle cash, which is safe but earns nothing")
    lines.append("\n**Risk check**" if flags else "\n**Risk check**: nothing unusual. Positions look reasonably balanced.")
    lines += [f"- {f}" for f in flags]
    lines.append("\n_Educational information, not financial advice._")
    return "\n".join(lines), ["your portfolio", "live quotes"]


async def _market_brief() -> tuple[str, list[str]]:
    lines = ["**Market snapshot (NSE)**"]
    status = live.market_status()
    lines.append(f"- Market is currently **{'open' if status['is_open'] else 'closed'}**")
    used = ["market hours"]
    for sym in ("NIFTY", "SENSEX", "BANKNIFTY", "INDIAVIX"):
        q = live.get_live_quote(sym)
        if q and q["previous_close"]:
            name = live.INDEX_TICKERS[sym][0]
            pct = (q["price"] - q["previous_close"]) / q["previous_close"] * 100
            lines.append(f"- {name}: **{q['price']:,.2f}** ({pct:+.2f}%)")
            used = ["live indices", "market hours"]
    movers = [(s, live.day_change_percent(s)) for s in live.STOCK_TICKERS]
    movers = sorted([m for m in movers if m[1] is not None], key=lambda m: m[1])
    if movers:
        lines.append(f"- Biggest riser among your 10 stocks: **{movers[-1][0]}** ({movers[-1][1]:+.2f}%)")
        lines.append(f"- Biggest faller: **{movers[0][0]}** ({movers[0][1]:+.2f}%)")
    lines.append("\n_Educational information, not financial advice._")
    return "\n".join(lines), used


async def coach_reply(
    message: str, user: User, db: AsyncSession,
) -> Optional[tuple[str, list[str]]]:
    """Return (markdown reply, data sources used), or None for a general question."""
    text = message.lower()
    positions = (await db.execute(select(Position).where(Position.user_id == user.id))).scalars().all()
    holdings = {p.symbol: p for p in positions}

    symbols = _find_symbols(message)
    if symbols:
        parts, used = [], []
        for sym in symbols[:2]:
            body, u = await _stock_brief(sym, holdings)
            parts.append(body)
            used += u
        content = "\n\n".join(parts)
    elif any(w in text for w in PORTFOLIO_WORDS):
        content, used = _portfolio_brief(user, positions)
    elif any(w in text for w in MARKET_WORDS) and not any(w in text for w in ("rsi", "sma", "ema", "macd")):
        content, used = await _market_brief()
    else:
        return None
    stamp = datetime.now(live.IST).strftime("%d %b, %H:%M IST")
    return f"{content}\n\n_Data as of {stamp}._", sorted(set(used))
