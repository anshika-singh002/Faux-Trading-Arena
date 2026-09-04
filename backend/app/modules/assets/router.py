from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.asset import Asset, MarketPrice

router = APIRouter()


class AssetOut(BaseModel):
    id: str
    symbol: str
    name: str
    asset_type: str
    sector: Optional[str]
    exchange: str
    currency: str
    logo_url: Optional[str]

    class Config:
        from_attributes = True


class QuoteOut(BaseModel):
    symbol: str
    price: float
    open: float
    high: float
    low: float
    previous_close: float
    volume: float
    market_cap: Optional[float]
    pe: Optional[float]
    week_52_high: Optional[float]
    week_52_low: Optional[float]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AssetOut])
async def list_assets(
    q: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Asset).where(Asset.is_active == True)  # noqa: E712
    if q:
        stmt = stmt.where(
            (Asset.symbol.ilike(f"%{q}%")) | (Asset.name.ilike(f"%{q}%"))
        )
    if asset_type:
        stmt = stmt.where(Asset.asset_type == asset_type)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{symbol}", response_model=AssetOut)
async def get_asset(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset).where(Asset.symbol == symbol.upper()))
    asset = result.scalar_one_or_none()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{symbol}/quote", response_model=QuoteOut)
async def get_quote(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MarketPrice)
        .where(MarketPrice.symbol == symbol.upper())
        .order_by(MarketPrice.timestamp.desc())
        .limit(1)
    )
    price = result.scalar_one_or_none()
    if not price:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Quote not found")
    return price
