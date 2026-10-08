"""Tests for the AI service layer."""
import pytest
from app.modules.ai.service import MockAIService


@pytest.mark.asyncio
async def test_mock_prediction_is_flagged():
    service = MockAIService()
    result = await service.get_prediction("AAPL", 192.53)
    assert result.is_mock is True
    assert result.symbol == "AAPL"
    assert result.status == "available"
    assert 0 <= result.confidence_score <= 1
    assert result.direction in ("bullish", "bearish", "neutral")


@pytest.mark.asyncio
async def test_mock_prediction_price_is_reasonable():
    service = MockAIService()
    price = 192.53
    result = await service.get_prediction("AAPL", price)
    # Prediction shouldn't be wildly off from current
    assert abs(result.predicted_price_short - price) / price < 0.10


@pytest.mark.asyncio
async def test_mock_portfolio_insight():
    service = MockAIService()
    positions = [
        {"symbol": "AAPL", "market_value": 10000, "weight": 20},
        {"symbol": "NVDA", "market_value": 15000, "weight": 30},
    ]
    result = await service.get_portfolio_insight(positions, cash=25000.0)
    assert result.is_mock is True
    assert result.status == "available"
    assert result.insight_type == "portfolio_advice"


@pytest.mark.asyncio
async def test_mock_chat_responds():
    service = MockAIService()
    result = await service.chat("What is RSI?", [], {})
    assert result.is_mock is True
    assert len(result.content) > 0
    assert "RSI" in result.content or "rsi" in result.content.lower()


@pytest.mark.asyncio
async def test_mock_chat_handles_unknown_question():
    service = MockAIService()
    result = await service.chat("What is the meaning of life?", [], {})
    assert result.is_mock is True
    assert len(result.content) > 50  # Should return some content


@pytest.mark.asyncio
async def test_explain_backtest():
    service = MockAIService()
    result_str = await service.explain_backtest({
        "total_return_percent": 25.0,
        "sharpe_ratio": 1.4,
        "max_drawdown": -8.5,
        "total_trades": 18,
    })
    assert isinstance(result_str, str)
    assert len(result_str) > 0


def _seed_real_looking_candles(monkeypatch):
    """Stand-in for the Yahoo Finance daily cache (the network is never used in tests)."""
    import numpy as np
    import pandas as pd
    from app.modules.market_data import live

    idx = pd.bdate_range("2025-01-01", periods=400)
    rng = np.random.default_rng(7)
    frames = {}
    for sym, base in (("SBIN", 800.0), ("NIFTY", 22000.0), ("BANKNIFTY", 50000.0), ("INDIAVIX", 14.0)):
        close = base * np.exp(np.cumsum(rng.normal(0, 0.01, len(idx))))
        frames[sym] = pd.DataFrame(
            {"open": close * 0.998, "high": close * 1.01, "low": close * 0.99,
             "close": close, "volume": rng.integers(1_000_000, 5_000_000, len(idx)).astype(float)},
            index=idx)
    monkeypatch.setattr(live, "_daily", frames)
    monkeypatch.setattr(live.settings, "LIVE_MARKET_DATA", True)


@pytest.mark.asyncio
async def test_xgboost_model2_prediction(monkeypatch):
    from app.modules.ai.ml_service import XGBoostAIService
    _seed_real_looking_candles(monkeypatch)
    service = XGBoostAIService()
    result = await service.get_prediction("SBIN", 812.0)
    assert result.is_mock is False
    assert result.symbol == "SBIN"
    assert result.status == "available"
    assert result.direction in ("bullish", "bearish", "neutral")
    assert 0 <= result.confidence_score <= 1.0
    assert any("Probabilities:" in kf for kf in result.key_factors)
    assert any("Recommendation:" in kf for kf in result.key_factors)


@pytest.mark.asyncio
async def test_xgboost_model2_is_flagged_mock_without_real_candles(monkeypatch):
    """No market data yet: the service must say so instead of predicting from fake candles."""
    from app.modules.ai.ml_service import XGBoostAIService
    from app.modules.market_data import live
    monkeypatch.setattr(live, "_daily", {})
    result = await XGBoostAIService().get_prediction("SBIN", 812.0)
    assert result.is_mock is True


def test_model1_runs_live_on_real_candles(monkeypatch):
    from app.modules.ai.ml_service import model1_service
    _seed_real_looking_candles(monkeypatch)
    result = model1_service.predict("SBIN", 812.0)
    assert result.is_live is True
    assert result.direction in ("UP", "DOWN", "NEUTRAL")
    assert result.p_up + result.p_down == pytest.approx(1.0, abs=1e-3)


def test_model1_falls_back_to_stored_predictions_without_candles(monkeypatch):
    from app.modules.ai.ml_service import model1_service
    from app.modules.market_data import live
    monkeypatch.setattr(live, "_daily", {})
    result = model1_service.predict("SBIN", 812.0)
    assert result.is_live is False          # honest: these are stored test-set predictions
    assert result.direction in ("UP", "DOWN", "NEUTRAL")


@pytest.mark.asyncio
async def test_xgboost_model2_fallback_for_unsupported_symbol():
    from app.modules.ai.ml_service import XGBoostAIService
    service = XGBoostAIService()
    result = await service.get_prediction("NONEXISTENT_STOCK", 100.0)
    assert result.is_mock is True
    assert result.symbol == "NONEXISTENT_STOCK"

