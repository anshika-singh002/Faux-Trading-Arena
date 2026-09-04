from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.order import Order, Transaction

router = APIRouter()


class OrderOut(BaseModel):
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
    created_at: str
    filled_at: Optional[str]

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: str
    order_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    fees: float
    total: float
    realized_pnl: Optional[float]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[OrderOut])
async def list_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(desc(Order.created_at))
        .limit(limit)
    )
    if status:
        stmt = stmt.where(Order.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()
