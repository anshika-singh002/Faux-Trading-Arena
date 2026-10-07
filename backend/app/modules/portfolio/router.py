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


# ── Risky stocks analysis ─────────────────────────────────────────────────────

# Volatility thresholds — annualised vol > these = high risk
_HIGH_VOL: dict[str, float] = {
    "SBIN": 0.28, "RELIANCE": 0.25, "HDFCBANK": 0.24,
    "ABCAPITAL": 0.38, "ICICIBANK": 0.30, "INFY": 0.27,
    "TCS": 0.24, "ITC": 0.22, "LT": 0.26, "BHARTIARTL": 0.28,
}

# Sector map for concentration check
_SECTOR: dict[str, str] = {
    "SBIN": "Banking", "HDFCBANK": "Banking", "ICICIBANK": "Banking", "ABCAPITAL": "NBFC",
    "INFY": "IT", "TCS": "IT",
    "RELIANCE": "Energy", "ITC": "FMCG", "LT": "Infra", "BHARTIARTL": "Telecom",
}


class RiskyPositionOut(BaseModel):
    symbol: str
    risk_level: str          # "high" | "medium" | "low"
    risk_reason: str
    weight: float
    unrealized_pnl_percent: float
    current_price: float


class RiskSummaryOut(BaseModel):
    has_risk: bool
    overall_risk: str        # "high" | "medium" | "low"
    risky_positions: list[RiskyPositionOut]
    warnings: list[str]
    sector_concentration: dict[str, float]   # sector → total weight %


@router.get("/risk", response_model=RiskSummaryOut)
async def get_portfolio_risk(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyse the user's current portfolio for risk signals:
    - Positions with high unrealized loss (> 10%)
    - Overweight positions (> 30% of portfolio)
    - Sector concentration (> 50% in one sector)
    - High-volatility stocks
    """
    result = await db.execute(
        select(Position).where(Position.user_id == current_user.id)
    )
    positions = result.scalars().all()

    if not positions:
        return RiskSummaryOut(
            has_risk=False, overall_risk="low",
            risky_positions=[], warnings=[],
            sector_concentration={},
        )

    # Compute total portfolio value for weight calc
    total_market = sum(
        p.quantity * MOCK_BASE_PRICES.get(p.symbol, p.avg_cost)
        for p in positions
    )
    total_value = current_user.virtual_balance + total_market
    warnings: list[str] = []
    risky: list[RiskyPositionOut] = []

    # Sector concentration
    sector_weights: dict[str, float] = {}
    for p in positions:
        price = MOCK_BASE_PRICES.get(p.symbol, p.avg_cost)
        mv = p.quantity * price
        weight = (mv / total_value * 100) if total_value > 0 else 0
        sector = _SECTOR.get(p.symbol, "Other")
        sector_weights[sector] = sector_weights.get(sector, 0) + weight

    for sector, sw in sector_weights.items():
        if sw > 50:
            warnings.append(f"High sector concentration: {sw:.1f}% in {sector}")

    # Per-position checks
    for p in positions:
        price = MOCK_BASE_PRICES.get(p.symbol, p.avg_cost)
        mv = p.quantity * price
        weight = (mv / total_value * 100) if total_value > 0 else 0
        cost = p.cost_basis if p.cost_basis > 0 else p.avg_cost * p.quantity
        unrealized_pct = ((mv - cost) / cost * 100) if cost > 0 else 0

        reasons = []
        risk_level = "low"

        # Loss threshold
        if unrealized_pct < -15:
            reasons.append(f"Down {unrealized_pct:.1f}% — significant loss")
            risk_level = "high"
        elif unrealized_pct < -8:
            reasons.append(f"Down {unrealized_pct:.1f}% — moderate loss")
            risk_level = "medium"

        # Overweight
        if weight > 35:
            reasons.append(f"Overweight: {weight:.1f}% of portfolio")
            risk_level = "high"
        elif weight > 25:
            reasons.append(f"Heavy position: {weight:.1f}% of portfolio")
            if risk_level == "low":
                risk_level = "medium"

        # High volatility stock
        vol_thr = _HIGH_VOL.get(p.symbol)
        if vol_thr and vol_thr > 0.30:
            reasons.append(f"High-volatility stock (est. {int(vol_thr*100)}% annual vol)")
            if risk_level == "low":
                risk_level = "medium"

        if reasons:
            risky.append(RiskyPositionOut(
                symbol=p.symbol,
                risk_level=risk_level,
                risk_reason=" · ".join(reasons),
                weight=round(weight, 1),
                unrealized_pnl_percent=round(unrealized_pct, 2),
                current_price=price,
            ))

    # Overall risk
    if any(r.risk_level == "high" for r in risky) or any("concentration" in w for w in warnings):
        overall = "high"
    elif risky or warnings:
        overall = "medium"
    else:
        overall = "low"

    # Add cash-heavy warning
    cash_weight = (current_user.virtual_balance / total_value * 100) if total_value > 0 else 100
    if cash_weight > 70 and positions:
        warnings.append(f"Portfolio is {cash_weight:.0f}% cash — consider deploying more capital")

    return RiskSummaryOut(
        has_risk=bool(risky or warnings),
        overall_risk=overall,
        risky_positions=risky,
        warnings=warnings,
        sector_concentration={k: round(v, 1) for k, v in sector_weights.items()},
    )
