"""
Portfolio router — all P&L calculated server-side from database state.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.position import Position
from app.modules.market_data.router import MOCK_BASE_PRICES

router = APIRouter()


class PositionOut(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    cost_basis: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float
    weight: float


class PortfolioSummary(BaseModel):
    total_value: float
    cash: float
    invested: float
    total_return: float
    total_return_percent: float
    unrealized_pnl: float
    realized_pnl: float
    positions: list[PositionOut]


@router.get("/", response_model=PortfolioSummary)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Position).where(Position.user_id == current_user.id)
    )
    positions = result.scalars().all()

    pos_out = []
    total_invested = 0.0
    total_market_value = 0.0
    total_unrealized_pnl = 0.0
    total_realized_pnl = 0.0

    for p in positions:
        current_price = MOCK_BASE_PRICES.get(p.symbol, p.avg_cost)
        market_value = p.quantity * current_price
        unrealized_pnl = market_value - p.cost_basis
        unrealized_pnl_pct = (unrealized_pnl / p.cost_basis * 100) if p.cost_basis > 0 else 0

        total_invested += p.cost_basis
        total_market_value += market_value
        total_unrealized_pnl += unrealized_pnl
        total_realized_pnl += p.realized_pnl

        pos_out.append(PositionOut(
            symbol=p.symbol,
            quantity=p.quantity,
            avg_cost=p.avg_cost,
            cost_basis=p.cost_basis,
            current_price=current_price,
            market_value=market_value,
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_percent=unrealized_pnl_pct,
            realized_pnl=p.realized_pnl,
            weight=0,  # filled below
        ))

    total_value = current_user.virtual_balance + total_market_value
    initial_balance = 100_000.0  # from config ideally

    # Calculate weights
    if total_value > 0:
        for p in pos_out:
            p.weight = (p.market_value / total_value) * 100

    total_return = total_value - initial_balance
    total_return_pct = (total_return / initial_balance) * 100

    return PortfolioSummary(
        total_value=total_value,
        cash=current_user.virtual_balance,
        invested=total_invested,
        total_return=total_return,
        total_return_percent=total_return_pct,
        unrealized_pnl=total_unrealized_pnl,
        realized_pnl=total_realized_pnl,
        positions=pos_out,
    )
