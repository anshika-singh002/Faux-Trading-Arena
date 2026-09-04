from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.modules.trading.service import TradingEngine
from app.modules.market_data.router import MOCK_BASE_PRICES

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
    market_price = MOCK_BASE_PRICES.get(symbol)
    if not market_price:
        raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")

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
    return order


@router.delete("/order/{order_id}", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await TradingEngine.cancel_order(db, current_user, order_id)
    return order
