from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.strategy import Strategy

router = APIRouter()


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    symbol: Optional[str] = None
    rules: list[dict]
    is_public: bool = False


class StrategyOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    symbol: Optional[str]
    rules: list
    is_active: bool
    is_public: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[StrategyOut])
async def list_strategies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(Strategy.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=StrategyOut, status_code=201)
async def create_strategy(
    payload: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    strategy = Strategy(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        symbol=payload.symbol,
        rules=payload.rules,
        is_public=payload.is_public,
    )
    db.add(strategy)
    await db.flush()
    await db.refresh(strategy)
    return strategy


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    await db.delete(strategy)
