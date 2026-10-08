from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.modules.trading.locks import user_lock
from app.modules.trading.service import TradingEngine
from app.modules.market_data.live import fresh_price, get_price, STOCK_TICKERS

router = APIRouter()


class PlaceOrderRequest(BaseModel):
    symbol: str
    side: str          # "buy" | "sell"
    order_type: str    # "market" | "limit"
    quantity: float
    price: Optional[float] = None  # limit price


class OrderResponse(BaseModel):
    id: str
    symbol: str
    side: str
    order_type: str
    quantity: float
    filled_quantity: float
    price: Optional[float]
    avg_fill_price: Optional[float]
    status: str
    estimated_total: float
    estimated_fees: float

    class Config:
        from_attributes = True


@router.post("/order", response_model=OrderResponse, status_code=201)
async def place_order(
    payload: PlaceOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    symbol = payload.symbol.upper()
    # Market orders fill at a price fetched within the last few seconds, never a stale one
    market_price = await fresh_price(symbol) if payload.order_type == "market" else get_price(symbol)
    if not market_price:
        if symbol not in STOCK_TICKERS:
            raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")
        raise HTTPException(
            status_code=503,
            detail=f"Live price for {symbol} is unavailable right now, so the order was not placed. Try again shortly.",
        )

    # Serialise per user: validation + execution + commit happen under one lock,
    # so two simultaneous orders can't both pass the same balance/position check.
    async with user_lock(current_user.id):
        await db.refresh(current_user)
        order = await TradingEngine.place_order(
            db=db,
            user=current_user,
            symbol=symbol,
            side=payload.side,
            order_type=payload.order_type,
            quantity=payload.quantity,
            price=payload.price,
            mock_market_price=market_price,
        )

        if order.status == "filled":
            verb = "BUY" if order.side == "buy" else "SELL"
            db.add(Notification(
                user_id=current_user.id,
                notification_type="order_filled",
                title="Order Filled",
                message=f"{symbol} {verb} {order.quantity:g} @ ₹{order.avg_fill_price:,.2f} — Filled",
                related_symbol=symbol,
                related_order_id=order.id,
            ))
        await db.commit()
    return order


@router.delete("/order/{order_id}", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    async with user_lock(current_user.id):
        order = await TradingEngine.cancel_order(db, current_user, order_id)
        await db.commit()
    return order
