"""FastAPI router for Faux Virtual Investment Advisor."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.security import get_current_user
from app.models.user import User
from app.modules.advisor.service import (
    PROFILES,
    RISK_PROFILES,
    MIN_AMOUNT,
    PriceDataUnavailable,
    recommend,
)

router = APIRouter()


class RiskProfileOut(BaseModel):
    id: str
    label: str
    goal: str
    risk_aversion: float
    max_weight_pct: float
    max_sector_pct: float
    max_stock_vol_pct: Optional[float]
    objective: str


class ProfilesResponse(BaseModel):
    profiles: list[RiskProfileOut]


class RecommendRequest(BaseModel):
    amount: float = Field(..., ge=MIN_AMOUNT, description=f"Investment amount in rupees (min ₹{int(MIN_AMOUNT):,})")
    risk: str = Field(..., description="Risk profile: conservative | balanced | aggressive")


class AllocationOut(BaseModel):
    ticker: str
    symbol: str
    name: str
    sector: str
    weight_pct: float
    amount: int
    last_price: float
    shares: int
    expected_return_pct: float
    volatility_pct: float
    risk_level: str


class PortfolioStatsOut(BaseModel):
    expected_return_pct: float
    volatility_pct: float
    risk_level: str
    sharpe: float
    effective_holdings: float
    avg_pairwise_correlation: float
    diversification: str
    sector_weights_pct: dict[str, float]


class DataInfoOut(BaseModel):
    source: str
    start: str
    end: str
    trading_days: int


class RecommendResponse(BaseModel):
    amount: float
    risk_profile: str
    goal: str
    allocations: list[AllocationOut]
    uninvested_cash: float
    portfolio: PortfolioStatsOut
    warnings: list[str]
    data: DataInfoOut
    disclaimer: str


@router.get("/profiles", response_model=ProfilesResponse)
async def get_profiles(current_user: User = Depends(get_current_user)):
    """List available risk profiles and their mathematical/risk constraints."""
    profile_list = []
    for k, p in PROFILES.items():
        profile_list.append(RiskProfileOut(
            id=k,
            label=p.label,
            goal=p.goal,
            risk_aversion=p.risk_aversion,
            max_weight_pct=round(p.max_weight * 100, 1),
            max_sector_pct=round(p.max_sector * 100, 1),
            max_stock_vol_pct=round(p.max_stock_vol * 100, 1) if p.max_stock_vol != float("inf") else None,
            objective=p.objective,
        ))
    return ProfilesResponse(profiles=profile_list)


@router.post("/recommend", response_model=RecommendResponse)
async def recommend_portfolio(
    payload: RecommendRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate risk-adjusted portfolio recommendation based on Modern Portfolio Theory."""
    risk_key = payload.risk.strip().lower()
    if risk_key not in PROFILES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid risk profile '{payload.risk}'. Must be one of: {RISK_PROFILES}",
        )

    if payload.amount < MIN_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Investment amount must be at least ₹{int(MIN_AMOUNT):,}",
        )

    try:
        result = recommend(amount=payload.amount, risk=risk_key)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except PriceDataUnavailable as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Portfolio optimization failed: {str(e)}",
        )


# ── Advisor notification ───────────────────────────────────────────────────────

@router.post("/notify", status_code=201)
async def create_advisor_notification(
    payload: RecommendRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(__import__("app.core.database", fromlist=["get_db"]).get_db),
):
    """
    Run advisor recommendation and store the result as a notification
    so the user sees it in the notification bell.
    """
    from app.models.notification import Notification

    risk_key = payload.risk.strip().lower()
    if risk_key not in PROFILES:
        raise HTTPException(status_code=422, detail=f"Invalid risk profile '{payload.risk}'")

    try:
        result = recommend(amount=payload.amount, risk=risk_key)
    except PriceDataUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Build a compact summary message
    top3 = result.allocations[:3] if result.allocations else []
    top_str = ", ".join(f"{a.symbol} ({a.weight_pct:.0f}%)" for a in top3)
    profile_label = PROFILES[risk_key].label
    message = (
        f"{profile_label} portfolio recommendation for ₹{int(payload.amount):,}: "
        f"Top picks — {top_str}. "
        f"Expected return: {result.portfolio.expected_return_pct:.1f}%, "
        f"Volatility: {result.portfolio.volatility_pct:.1f}%."
    )

    notif = Notification(
        user_id=current_user.id,
        notification_type="ai_insight",
        title=f"Advisor: {profile_label} recommendation ready",
        message=message,
        is_read=False,
    )
    db.add(notif)
    await db.commit()

    return {"message": "Notification created", "notification_id": notif.id}
