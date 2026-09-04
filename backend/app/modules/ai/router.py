from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.modules.ai.service import ai_service
from app.modules.market_data.router import MOCK_BASE_PRICES

router = APIRouter()


class PredictionOut(BaseModel):
    symbol: str
    current_price: float
    predicted_price_short: float
    predicted_price_medium: float
    direction: str
    confidence: str
    confidence_score: float
    status: str
    explanation: str
    key_factors: list[str]
    risk_factors: list[str]
    generated_at: str
    is_mock: bool


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    context: dict = {}


class ChatResponse(BaseModel):
    content: str
    context_used: list[str]
    is_mock: bool


@router.get("/predict/{symbol}", response_model=PredictionOut)
async def predict(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    symbol = symbol.upper()
    price = MOCK_BASE_PRICES.get(symbol)
    if not price:
        raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")

    result = await ai_service.get_prediction(symbol=symbol, current_price=price)
    return result.__dict__


@router.get("/portfolio-insight")
async def portfolio_insight(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch portfolio to build context
    from sqlalchemy import select
    from app.models.position import Position

    result = await db.execute(
        select(Position).where(Position.user_id == current_user.id)
    )
    positions = result.scalars().all()
    positions_data = [
        {
            "symbol": p.symbol,
            "quantity": p.quantity,
            "avg_cost": p.avg_cost,
            "market_value": p.quantity * MOCK_BASE_PRICES.get(p.symbol, p.avg_cost),
            "weight": 0,
        }
        for p in positions
    ]
    insight = await ai_service.get_portfolio_insight(
        positions=positions_data,
        cash=current_user.virtual_balance,
    )
    return insight.__dict__


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    response = await ai_service.chat(
        message=payload.message,
        history=payload.history,
        context=payload.context,
    )
    return ChatResponse(
        content=response.content,
        context_used=response.context_used,
        is_mock=response.is_mock,
    )
