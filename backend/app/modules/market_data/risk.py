"""Per-stock risk assessment from real price history.

Two kinds of danger are flagged:
  * "falling"     - the stock is in a downtrend, so buying now may lose money
  * "overheated"  - the stock has run up fast and is stretched, so today's
                    profit may reverse

Everything is computed from the cached Yahoo daily candles plus the live quote.
Nothing here is a prediction or financial advice; it is a rules-based check on
observable facts, and every reason carries the numbers behind it.
"""

from __future__ import annotations

import math
from typing import Optional

import pandas as pd

from app.modules.market_data import live


def _rsi(close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) <= period:
        return None
    delta = close.diff().dropna()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    last_gain, last_loss = float(gain.iloc[-1]), float(loss.iloc[-1])
    if last_loss == 0:
        return 100.0
    return 100 - 100 / (1 + last_gain / last_loss)


def _pct(now: float, then: float) -> float:
    return (now / then - 1) * 100 if then else 0.0


def assess(symbol: str) -> dict:
    """Risk report for one stock. `available` is False when there is no real data."""
    symbol = symbol.upper()
    df = live.get_daily(symbol)
    quote = live.get_live_quote(symbol)
    if df is None or len(df) < 60:
        return {"symbol": symbol, "available": False, "level": "unknown", "kind": None,
                "score": 0, "reasons": [], "stats": {}}

    close = df["close"].astype(float).dropna()
    price = float(quote["price"]) if quote else float(close.iloc[-1])
    # Make sure the latest live price is the last point of the series
    if quote and abs(price - float(close.iloc[-1])) > 1e-9:
        series = pd.concat([close, pd.Series([price])], ignore_index=True)
    else:
        series = close.reset_index(drop=True)

    prev_close = quote["previous_close"] if quote and quote.get("previous_close") else float(close.iloc[-1])
    day_pct = _pct(price, prev_close)
    ret5 = _pct(price, float(series.iloc[-6])) if len(series) > 6 else 0.0
    ret20 = _pct(price, float(series.iloc[-21])) if len(series) > 21 else 0.0
    sma20 = float(series.tail(20).mean())
    sma50 = float(series.tail(50).mean())
    rsi = _rsi(series)
    daily = series.pct_change().dropna()
    vol = float(daily.tail(60).std() * math.sqrt(252) * 100) if len(daily) >= 20 else 0.0
    worst_day = float(daily.tail(20).min() * 100) if len(daily) >= 20 else 0.0
    year = series.tail(252)
    hi52, lo52 = float(year.max()), float(year.min())
    off_high = _pct(price, hi52)
    above_low = _pct(price, lo52)
    stretch = _pct(price, sma50)

    score_down = 0
    score_hot = 0
    reasons: list[dict] = []

    def add(severity: str, text: str, kind: str, points: int) -> None:
        nonlocal score_down, score_hot
        reasons.append({"severity": severity, "kind": kind, "text": text})
        if kind == "falling":
            score_down += points
        elif kind == "overheated":
            score_hot += points
        else:
            score_down += points  # volatility hurts both directions; counted with the generic score

    # ── Falling ──
    if day_pct <= -3:
        add("high", f"Down {abs(day_pct):.2f}% today, a sharp one-day fall", "falling", 2)
    elif day_pct <= -1:
        add("medium", f"Down {abs(day_pct):.2f}% today", "falling", 1)
    if price < sma20 < sma50:
        add("high", f"Trading below both its 20-day (₹{sma20:,.2f}) and 50-day (₹{sma50:,.2f}) averages, a downtrend", "falling", 2)
    elif price < sma20:
        add("medium", f"Trading below its 20-day average (₹{sma20:,.2f})", "falling", 1)
    if ret20 <= -10:
        add("high", f"Lost {abs(ret20):.1f}% over the last 20 trading days", "falling", 2)
    elif ret20 <= -5:
        add("medium", f"Lost {abs(ret20):.1f}% over the last 20 trading days", "falling", 1)
    if above_low <= 10:
        add("medium", f"Only {above_low:.1f}% above its 52-week low (₹{lo52:,.2f})", "falling", 1)

    # ── Overheated (profit may reverse) ──
    if rsi is not None and rsi >= 70:
        add("high", f"RSI is {rsi:.0f}, which is overbought; stocks this stretched often pull back", "overheated", 2)
    if ret20 >= 15:
        add("high", f"Up {ret20:.1f}% in 20 trading days, a very fast run-up", "overheated", 2)
    elif ret20 >= 8:
        add("medium", f"Up {ret20:.1f}% in 20 trading days", "overheated", 1)
    if stretch >= 15:
        add("medium", f"Trades {stretch:.1f}% above its 50-day average, which is stretched", "overheated", 1)
    if off_high >= -2 and ret20 >= 5:
        add("medium", "At its 52-week high after a rally; a reversal would erase gains quickly", "overheated", 1)

    # ── Volatility ──
    if vol >= 55:
        add("high", f"Very volatile: {vol:.0f}% annualised swings", "volatile", 2)
    elif vol >= 40:
        add("medium", f"Volatile: {vol:.0f}% annualised swings", "volatile", 1)
    if worst_day <= -4:
        add("medium", f"Had a {abs(worst_day):.1f}% one-day drop in the last 20 sessions", "volatile", 1)

    score = score_down + score_hot
    level = "high" if score >= 4 else "medium" if score >= 2 else "low"
    if score_hot > 0 and score_hot >= score_down:
        kind = "overheated"
    elif score_down > 0:
        kind = "falling"
    else:
        kind = None

    return {
        "symbol": symbol,
        "available": True,
        "level": level,
        "kind": kind,
        "score": score,
        "reasons": reasons,
        "stats": {
            "price": round(price, 2),
            "day_change_pct": round(day_pct, 2),
            "return_5d_pct": round(ret5, 2),
            "return_20d_pct": round(ret20, 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "rsi14": round(rsi, 1) if rsi is not None else None,
            "volatility_pct": round(vol, 1),
            "week52_high": round(hi52, 2),
            "week52_low": round(lo52, 2),
            "from_52w_high_pct": round(off_high, 2),
            "is_live_price": bool(quote),
        },
    }
