from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.order import Transaction
from app.models.position import Position
from app.models.user import User
from app.modules.market_data.live import get_price

router = APIRouter()


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    display_name: str
    portfolio_value: float
    total_return: float
    total_return_percent: float
    win_rate: float = 0.0
    total_trades: int = 0
    is_current_user: bool = False


@router.get("/", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ranks active users by total portfolio value (cash + open positions marked
    at live prices) against the configured starting balance. Win rate is the
    share of sells that realised a profit.
    """
    users = (await db.execute(
        select(User).where(User.is_active == True)  # noqa: E712
    )).scalars().all()

    positions = (await db.execute(select(Position))).scalars().all()
    holdings_value: dict[str, float] = {}
    for p in positions:
        price = get_price(p.symbol, p.avg_cost)
        holdings_value[p.user_id] = holdings_value.get(p.user_id, 0.0) + p.quantity * price

    # Per-user trade stats straight from the transaction log
    sells = case((Transaction.side == "sell", 1), else_=0)
    winning_sells = case((((Transaction.side == "sell") & (Transaction.realized_pnl > 0)), 1), else_=0)
    stats_rows = (await db.execute(
        select(Transaction.user_id, func.count(), func.sum(sells), func.sum(winning_sells))
        .group_by(Transaction.user_id)
    )).all()
    stats = {uid: (int(n), int(s or 0), int(w or 0)) for uid, n, s, w in stats_rows}

    initial = settings.INITIAL_VIRTUAL_BALANCE
    ranked = sorted(
        ((u, u.virtual_balance + holdings_value.get(u.id, 0.0)) for u in users),
        key=lambda pair: pair[1],
        reverse=True,
    )[:limit]

    return [
        LeaderboardEntry(
            rank=i,
            user_id=u.id,
            username=u.username,
            display_name=u.display_name,
            portfolio_value=value,
            total_return=value - initial,
            total_return_percent=(value - initial) / initial * 100,
            win_rate=round(stats[u.id][2] / stats[u.id][1] * 100, 1) if u.id in stats and stats[u.id][1] else 0.0,
            total_trades=stats[u.id][0] if u.id in stats else 0,
            is_current_user=u.id == current_user.id,
        )
        for i, (u, value) in enumerate(ranked, 1)
    ]
