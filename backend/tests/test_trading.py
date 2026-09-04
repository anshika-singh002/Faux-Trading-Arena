"""
Tests for the trading engine.
Run: pytest tests/ -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.modules.trading.service import TradingEngine
from app.models.user import User
from app.models.position import Position


def make_user(balance: float = 100_000.0) -> User:
    u = User()
    u.id = "test-user-1"
    u.virtual_balance = balance
    return u


@pytest.mark.asyncio
async def test_buy_order_deducts_balance():
    """Buying should deduct cost + fee from balance."""
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))
    db.flush = AsyncMock()
    db.add = MagicMock()

    user = make_user(10_000.0)
    order = await TradingEngine.place_order(
        db=db, user=user, symbol="AAPL",
        side="buy", order_type="market",
        quantity=10, price=None,
        mock_market_price=100.0,
    )

    # 10 shares × $100 = $1000 + 0.1% fee = $1001
    assert user.virtual_balance == pytest.approx(10_000 - 1001.0, abs=0.01)
    assert order.status == "filled"
    assert order.filled_quantity == 10


@pytest.mark.asyncio
async def test_buy_order_rejects_insufficient_balance():
    """Buy should fail when cash is insufficient."""
    from fastapi import HTTPException
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))

    user = make_user(50.0)  # only $50
    with pytest.raises(HTTPException) as exc_info:
        await TradingEngine.place_order(
            db=db, user=user, symbol="AAPL",
            side="buy", order_type="market",
            quantity=10, price=None,
            mock_market_price=100.0,
        )
    assert exc_info.value.status_code == 400
    assert "Insufficient" in exc_info.value.detail


@pytest.mark.asyncio
async def test_sell_order_rejects_no_position():
    """Sell should fail when user has no position."""
    from fastapi import HTTPException
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))

    user = make_user(50_000.0)
    with pytest.raises(HTTPException) as exc_info:
        await TradingEngine.place_order(
            db=db, user=user, symbol="AAPL",
            side="sell", order_type="market",
            quantity=5, price=None,
            mock_market_price=100.0,
        )
    assert exc_info.value.status_code == 400
    assert "Insufficient shares" in exc_info.value.detail


@pytest.mark.asyncio
async def test_sell_order_rejects_insufficient_shares():
    """Sell should fail when user holds fewer shares than requested."""
    from fastapi import HTTPException
    db = AsyncMock()

    position = Position()
    position.user_id = "test-user-1"
    position.symbol = "AAPL"
    position.quantity = 3  # only 3 shares
    position.avg_cost = 90.0
    position.cost_basis = 270.0
    position.realized_pnl = 0.0

    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: position))

    user = make_user(50_000.0)
    with pytest.raises(HTTPException) as exc_info:
        await TradingEngine.place_order(
            db=db, user=user, symbol="AAPL",
            side="sell", order_type="market",
            quantity=5, price=None,  # trying to sell 5 but only have 3
            mock_market_price=100.0,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_invalid_quantity_rejected():
    """Zero or negative quantity should be rejected."""
    from fastapi import HTTPException
    db = AsyncMock()
    user = make_user()

    with pytest.raises(HTTPException) as exc_info:
        await TradingEngine.place_order(
            db=db, user=user, symbol="AAPL",
            side="buy", order_type="market",
            quantity=-5, price=None,
            mock_market_price=100.0,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_limit_order_requires_price():
    """Limit orders without price should be rejected."""
    from fastapi import HTTPException
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))
    user = make_user()

    with pytest.raises(HTTPException) as exc_info:
        await TradingEngine.place_order(
            db=db, user=user, symbol="AAPL",
            side="buy", order_type="limit",
            quantity=5, price=None,  # missing limit price
            mock_market_price=100.0,
        )
    assert exc_info.value.status_code == 400
