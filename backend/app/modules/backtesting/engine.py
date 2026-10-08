"""
Backtesting engine: runs a user's rule-based strategy over daily candles.

Pure functions (no I/O) so they are easy to test. Signals are evaluated on a
day's close and executed at the NEXT day's open, which avoids look-ahead bias.
If a strategy has no rules, a 20/50-day SMA crossover is used.
"""
import math
from typing import Any, Optional

import numpy as np
import pandas as pd

RISK_FREE_RATE = 0.065  # annual, approx. Indian 10y G-Sec yield
TRADING_DAYS = 252

DEFAULT_RULES: list[dict] = [
    {"indicator": "sma_20", "operator": "crosses_above", "value": "sma_50",
     "action": "buy", "position_size_type": "percent_cash", "position_size_value": 100},
    {"indicator": "sma_20", "operator": "crosses_below", "value": "sma_50",
     "action": "sell", "position_size_type": "percent_cash", "position_size_value": 100},
]


def _rule_get(rule: dict, snake: str, default: Any = None) -> Any:
    """Rules may arrive snake_case (API) or camelCase (frontend builder)."""
    if snake in rule:
        return rule[snake]
    parts = snake.split("_")
    camel = parts[0] + "".join(p.title() for p in parts[1:])
    return rule.get(camel, default)


def compute_indicators(df: pd.DataFrame) -> dict[str, pd.Series]:
    close, high, low = df["close"], df["high"], df["low"]
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rsi = 100 - 100 / (1 + gain / loss.replace(0, np.nan))
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    bb_mid, bb_std = close.rolling(20).mean(), close.rolling(20).std()
    true_range = pd.concat(
        [high - low, (high - close.shift()).abs(), (low - close.shift()).abs()], axis=1
    ).max(axis=1)
    return {
        "price": close,
        "sma_20": close.rolling(20).mean(),
        "sma_50": close.rolling(50).mean(),
        "sma_200": close.rolling(200).mean(),
        "ema_12": ema12,
        "ema_26": ema26,
        "rsi_14": rsi,
        "macd": ema12 - ema26,
        "volume": df["volume"].astype(float),
        "bollinger_upper": bb_mid + 2 * bb_std,
        "bollinger_lower": bb_mid - 2 * bb_std,
        "atr": true_range.rolling(14).mean(),
    }


def _rule_fires(rule: dict, ind: dict[str, pd.Series], i: int) -> bool:
    left_s = ind.get(rule["indicator"])
    if left_s is None or i < 1:
        return False
    value = rule["value"]
    right_s = ind.get(value) if isinstance(value, str) else None
    if isinstance(value, str) and right_s is None:
        return False

    def right_at(k: int) -> float:
        return float(right_s.iloc[k]) if right_s is not None else float(value)

    left, left_prev = float(left_s.iloc[i]), float(left_s.iloc[i - 1])
    right, right_prev = right_at(i), right_at(i - 1)
    if any(math.isnan(x) for x in (left, left_prev, right, right_prev)):
        return False

    op = rule["operator"]
    if op == "crosses_above":
        return left_prev <= right_prev and left > right
    if op == "crosses_below":
        return left_prev >= right_prev and left < right
    if op == "greater_than":
        return left > right
    if op == "less_than":
        return left < right
    if op == "equals":
        return abs(left - right) <= abs(right) * 0.001
    return False


def run_backtest(
    df: pd.DataFrame,
    rules: Optional[list[dict]],
    capital: float,
    fee_percent: float = 0.1,
    slippage_percent: float = 0.05,
    benchmark_close: Optional[pd.Series] = None,
    trade_from: Optional[pd.Timestamp] = None,
) -> dict:
    """
    df: daily candles (open/high/low/close/volume) indexed by date. It may start
    before `trade_from` so long indicators are warmed up; trading and all
    reported metrics begin on `trade_from`.
    """
    rules = [
        {
            "indicator": _rule_get(r, "indicator"), "operator": _rule_get(r, "operator"),
            "value": _rule_get(r, "value"), "action": _rule_get(r, "action"),
            "size_type": _rule_get(r, "position_size_type", "percent_cash"),
            "size_value": float(_rule_get(r, "position_size_value", 100)),
        }
        for r in (rules or DEFAULT_RULES)
    ]
    start_idx = 0 if trade_from is None else int(df.index.searchsorted(trade_from))
    if len(df) - start_idx < 30:
        raise ValueError("Not enough price history for the selected range (need at least 30 trading days)")

    ind = compute_indicators(df)
    opens, closes = df["open"].astype(float), df["close"].astype(float)
    fee, slip = fee_percent / 100, slippage_percent / 100

    cash, shares, avg_cost = capital, 0.0, 0.0
    trades: list[dict] = []
    equity: list[float] = []
    pending: list[dict] = []   # signals decided yesterday, executed at today's open

    for i in range(start_idx, len(df)):
        date = df.index[i].strftime("%Y-%m-%d")

        for rule in pending:
            if rule["action"] == "buy":
                px = float(opens.iloc[i]) * (1 + slip)
                budget = {
                    "fixed_amount": rule["size_value"],
                    "percent_portfolio": (cash + shares * px) * rule["size_value"] / 100,
                    "percent_cash": cash * rule["size_value"] / 100,
                }.get(rule["size_type"], cash)
                budget = min(budget, cash)
                qty = budget / (px * (1 + fee)) if px > 0 else 0
                if qty > 1e-9:
                    cost = qty * px * (1 + fee)
                    avg_cost = (avg_cost * shares + qty * px) / (shares + qty)
                    shares += qty
                    cash -= cost
                    trades.append({"date": date, "action": "buy", "price": round(px, 2),
                                   "quantity": round(qty, 4), "value": round(cost, 2)})
            elif shares > 0:
                px = float(opens.iloc[i]) * (1 - slip)
                if rule["size_type"] == "fixed_amount":
                    qty = min(shares, rule["size_value"] / px)
                else:
                    qty = shares * min(rule["size_value"], 100) / 100
                if qty > 1e-9:
                    proceeds = qty * px * (1 - fee)
                    pnl = proceeds - qty * avg_cost
                    shares -= qty
                    cash += proceeds
                    if shares < 1e-9:
                        shares, avg_cost = 0.0, 0.0
                    trades.append({"date": date, "action": "sell", "price": round(px, 2),
                                   "quantity": round(qty, 4), "value": round(proceeds, 2),
                                   "pnl": round(pnl, 2)})

        equity.append(cash + shares * float(closes.iloc[i]))
        pending = [r for r in rules if _rule_fires(r, ind, i)]

    return _metrics(df.iloc[start_idx:], equity, trades, capital, benchmark_close)


def _metrics(df, equity, trades, capital, benchmark_close) -> dict:
    eq = pd.Series(equity, index=df.index)
    final = float(eq.iloc[-1])
    total_return = final - capital
    days = max((df.index[-1] - df.index[0]).days, 1)
    cagr = ((final / capital) ** (365 / days) - 1) * 100 if final > 0 else -100.0

    daily = eq.pct_change().dropna()
    vol = float(daily.std() * math.sqrt(TRADING_DAYS)) if len(daily) > 1 else 0.0
    mean_excess = float(daily.mean()) * TRADING_DAYS - RISK_FREE_RATE if len(daily) else 0.0
    sharpe = mean_excess / vol if vol > 0 else 0.0
    downside = daily[daily < 0]
    d_vol = float(downside.std() * math.sqrt(TRADING_DAYS)) if len(downside) > 1 else 0.0
    sortino = mean_excess / d_vol if d_vol > 0 else 0.0

    drawdown = (eq - eq.cummax()) / eq.cummax() * 100
    max_dd = float(drawdown.min())
    longest, run = 0, 0
    for d in drawdown:
        run = run + 1 if d < 0 else 0
        longest = max(longest, run)

    sells = [t for t in trades if t["action"] == "sell"]
    wins = [t["pnl"] for t in sells if t["pnl"] > 0]
    losses = [-t["pnl"] for t in sells if t["pnl"] < 0]
    win_rate = len(wins) / len(sells) * 100 if sells else 0.0
    profit_factor = (sum(wins) / sum(losses)) if losses else (float("inf") if wins else 0.0)
    avg_trade = (sum(t["pnl"] for t in sells) / len(sells) / capital * 100) if sells else 0.0

    bench = None
    if benchmark_close is not None and len(benchmark_close) > 1:
        b = benchmark_close.reindex(df.index.union(benchmark_close.index)).ffill().reindex(df.index).bfill()
        bench = b / float(b.iloc[0]) * capital
    bench_final = float(bench.iloc[-1]) if bench is not None else capital

    step = max(1, len(eq) // 250)  # keep the payload small
    series = [
        {"date": eq.index[i].strftime("%Y-%m-%d"), "value": round(float(eq.iloc[i]), 2),
         "benchmark": round(float(bench.iloc[i]), 2) if bench is not None else round(capital, 2)}
        for i in range(0, len(eq), step)
    ]
    return {
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return / capital * 100, 2),
        "benchmark_return": round(bench_final - capital, 2),
        "benchmark_return_percent": round((bench_final - capital) / capital * 100, 2),
        "cagr": round(cagr, 2),
        "sharpe_ratio": round(sharpe, 3),
        "sortino_ratio": round(sortino, 3),
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_duration": longest,
        "volatility": round(vol * 100, 2),
        "win_rate": round(win_rate, 1),
        "profit_factor": round(profit_factor, 2) if math.isfinite(profit_factor) else 999.0,
        "total_trades": len(trades),
        "avg_trade_return": round(avg_trade, 2),
        "portfolio_values": series,
        "trades": trades[-200:],
    }
