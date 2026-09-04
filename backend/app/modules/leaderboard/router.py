from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    display_name: str
    portfolio_value: float
    total_return: float
    total_return_percent: float
    is_current_user: bool = False


@router.get("/", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns ranked users by portfolio performance.
    In production, this would compute from actual portfolio values.
    Currently returns mock-seeded data for all users in the system.
    """
    result = await db.execute(
        select(User)
        .where(User.is_active == True)  # noqa: E712
        .order_by(User.virtual_balance.desc())
        .limit(limit)
    )
    users = result.scalars().all()

    entries = []
    for i, u in enumerate(users, 1):
        initial = 100_000.0
        total_return = u.virtual_balance - initial
        total_return_pct = (total_return / initial) * 100
        entries.append(LeaderboardEntry(
            rank=i,
            user_id=u.id,
            username=u.username,
            display_name=u.display_name,
            portfolio_value=u.virtual_balance,
            total_return=total_return,
            total_return_percent=total_return_pct,
            is_current_user=u.id == current_user.id,
        ))

    return entries
