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
