"""Tests for the backtesting engine."""
import pytest
from app.modules.backtesting.router import _run_backtest_sync


def test_backtest_returns_valid_structure():
    result = _run_backtest_sync(
        strategy_rules=[],
        symbol="SPY",
        days=252,
        capital=100_000.0,
        fee_pct=0.1,
    )
    assert "total_return" in result
    assert "total_return_percent" in result
    assert "sharpe_ratio" in result
    assert "max_drawdown" in result
    assert "win_rate" in result
    assert "total_trades" in result
    assert isinstance(result["portfolio_values"], list)


def test_backtest_drawdown_is_negative_or_zero():
    result = _run_backtest_sync(
        strategy_rules=[], symbol="SPY",
        days=252, capital=100_000.0, fee_pct=0.1,
    )
    assert result["max_drawdown"] <= 0


def test_backtest_win_rate_in_range():
    result = _run_backtest_sync(
        strategy_rules=[], symbol="AAPL",
        days=252, capital=100_000.0, fee_pct=0.1,
    )
    assert 0 <= result["win_rate"] <= 100


def test_backtest_different_symbols_give_different_results():
    r1 = _run_backtest_sync([], "AAPL", 100, 100_000.0, 0.1)
    r2 = _run_backtest_sync([], "TSLA", 100, 100_000.0, 0.1)
    # Different seeds should produce different results
    assert r1["total_return_percent"] != r2["total_return_percent"]
