"""Tests for the backtesting engine (pure functions, no network)."""
import numpy as np
import pandas as pd
import pytest

from app.modules.backtesting.engine import compute_indicators, run_backtest


def make_candles(closes, start="2024-01-01") -> pd.DataFrame:
    """Daily candles whose open == previous close, so fills are easy to reason about."""
    closes = np.asarray(closes, dtype=float)
    idx = pd.bdate_range(start, periods=len(closes))
    opens = np.concatenate([[closes[0]], closes[:-1]])
    return pd.DataFrame(
        {"open": opens, "high": np.maximum(opens, closes) * 1.01,
         "low": np.minimum(opens, closes) * 0.99, "close": closes,
         "volume": np.full(len(closes), 1_000_000.0)},
        index=idx,
    )


def wave(n=300, base=100.0, amp=15.0, period=60):
    t = np.arange(n)
    return base + amp * np.sin(2 * np.pi * t / period) + t * 0.02


def test_default_strategy_returns_valid_structure():
    result = run_backtest(make_candles(wave()), None, 1_000_000.0)
    for key in ("total_return", "total_return_percent", "sharpe_ratio", "sortino_ratio",
                "max_drawdown", "win_rate", "total_trades", "cagr", "profit_factor",
                "portfolio_values", "trades", "benchmark_return_percent"):
        assert key in result
    assert isinstance(result["portfolio_values"], list) and result["portfolio_values"]
    assert result["total_trades"] > 0


def test_drawdown_negative_or_zero_and_win_rate_in_range():
    result = run_backtest(make_candles(wave()), None, 500_000.0)
    assert result["max_drawdown"] <= 0
    assert 0 <= result["win_rate"] <= 100


def test_rsi_rules_only_trade_after_their_condition_was_true():
    """Every fill must follow a close where the rule's condition held (signal day = previous bar)."""
    rules = [
        {"indicator": "rsi_14", "operator": "less_than", "value": 30, "action": "buy",
         "positionSizeType": "percent_cash", "positionSizeValue": 100},
        {"indicator": "rsi_14", "operator": "greater_than", "value": 70, "action": "sell",
         "positionSizeType": "percent_cash", "positionSizeValue": 100},
    ]
    candles = make_candles(wave(400, amp=25, period=50))
    rsi = compute_indicators(candles)["rsi_14"]
    result = run_backtest(candles, rules, 1_000_000.0)
    actions = [t["action"] for t in result["trades"]]
    assert "buy" in actions and "sell" in actions
    for t in result["trades"]:
        signal_day_rsi = rsi.iloc[candles.index.get_loc(pd.Timestamp(t["date"])) - 1]
        assert signal_day_rsi < 30 if t["action"] == "buy" else signal_day_rsi > 70


def test_signals_execute_at_next_open_not_same_close():
    # Price steps from 100 to 200 on day 40. A "price > 150" rule fires on day 40's close,
    # so the buy must fill at day 41's open (which equals day 40's close of 200), never at 100.
    closes = [100.0] * 40 + [200.0] * 40
    rules = [{"indicator": "price", "operator": "greater_than", "value": 150, "action": "buy",
              "position_size_type": "percent_cash", "position_size_value": 100}]
    result = run_backtest(make_candles(closes), rules, 100_000.0, fee_percent=0, slippage_percent=0)
    first_buy = next(t for t in result["trades"] if t["action"] == "buy")
    assert first_buy["price"] == pytest.approx(200.0)


def test_fees_and_slippage_reduce_returns():
    candles = make_candles(wave())
    free = run_backtest(candles, None, 1_000_000.0, fee_percent=0, slippage_percent=0)
    costly = run_backtest(candles, None, 1_000_000.0, fee_percent=0.5, slippage_percent=0.5)
    assert costly["total_return"] < free["total_return"]


def test_benchmark_buy_and_hold_matches_price_change():
    closes = np.linspace(100, 150, 120)
    bench = make_candles(closes)["close"]
    result = run_backtest(make_candles(wave(120)), None, 100_000.0, benchmark_close=bench)
    assert result["benchmark_return_percent"] == pytest.approx(50.0, abs=0.5)


def test_trade_from_ignores_warmup_period():
    candles = make_candles(wave(400))
    start = candles.index[250]
    result = run_backtest(candles, None, 1_000_000.0, trade_from=start)
    assert result["portfolio_values"][0]["date"] >= start.strftime("%Y-%m-%d")
    assert all(t["date"] >= start.strftime("%Y-%m-%d") for t in result["trades"])


def test_too_little_history_raises():
    with pytest.raises(ValueError):
        run_backtest(make_candles(wave(20)), None, 100_000.0)


def test_unknown_indicator_never_fires():
    rules = [{"indicator": "does_not_exist", "operator": "greater_than", "value": 0,
              "action": "buy", "position_size_type": "percent_cash", "position_size_value": 100}]
    result = run_backtest(make_candles(wave()), rules, 100_000.0)
    assert result["total_trades"] == 0
    assert result["total_return"] == 0


def test_indicators_have_expected_ranges():
    ind = compute_indicators(make_candles(wave(300)))
    rsi = ind["rsi_14"].dropna()
    assert ((rsi >= 0) & (rsi <= 100)).all()
    assert (ind["bollinger_upper"].dropna() >= ind["bollinger_lower"].dropna()).all()
