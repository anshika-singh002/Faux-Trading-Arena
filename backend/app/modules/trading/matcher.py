"""
Limit-order matching.

Open limit orders are checked against live prices on every pass:
  buy  fills when the market price <= limit price
  sell fills when the market price >= limit price
Orders only fill against real live quotes, never simulated prices. Balance and
shares are re-validated at fill time; an order that can no longer be funded is
cancelled and the user is notified.
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.notification import Notification
from app.models.order import Order
from app.models.user import User
from app.modules.market_data import live
from app.modules.trading.locks import user_lock
from app.modules.trading.service import TradingEngine

logger = logging.getLogger(__name__)


def _notify(db, order: Order, title: str, message: str) -> None:
    db.add(Notification(
        user_id=order.user_id,
        notification_type="order_filled" if order.status == "filled" else "order_cancelled",
        title=title,
        message=message,
        related_symbol=order.symbol,
        related_order_id=order.id,
    ))


async def match_open_orders() -> int:
    """One matching pass. Returns the number of orders filled."""
    filled = 0
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Order).where(Order.status == "open", Order.order_type == "limit")
        )
        for order in result.scalars().all():
            quote = live.get_live_quote(order.symbol)
            if quote is None or order.price is None:
                continue
            price = quote["price"]
            triggered = (order.side == "buy" and price <= order.price) or \
                        (order.side == "sell" and price >= order.price)
            if not triggered:
                continue

            async with user_lock(order.user_id):
                await db.refresh(order)
                if order.status != "open":      # cancelled while we waited
                    continue
                user = await db.get(User, order.user_id)
                await db.refresh(user)
                fee = price * order.quantity * settings.TRADING_FEE_PERCENT

                if order.side == "buy" and user.virtual_balance < price * order.quantity + fee:
                    order.status = "cancelled"
                    _notify(db, order, "Order Cancelled",
                            f"{order.symbol} BUY {order.quantity:g} limit order cancelled: insufficient balance")
                    await db.commit()
                    continue
                if order.side == "sell":
                    pos = await TradingEngine._get_position(db, user.id, order.symbol)
                    if not pos or pos.quantity < order.quantity:
                        order.status = "cancelled"
                        _notify(db, order, "Order Cancelled",
                                f"{order.symbol} SELL {order.quantity:g} limit order cancelled: insufficient shares")
                        await db.commit()
                        continue

                order.status = "filled"
                order.avg_fill_price = price
                order.filled_quantity = order.quantity
                order.filled_at = datetime.now(timezone.utc)
                await TradingEngine._execute_order(db, user, order, price)
                _notify(db, order, "Limit Order Filled",
                        f"{order.symbol} {order.side.upper()} {order.quantity:g} @ \u20b9{price:,.2f} \u2014 Filled")
                await db.commit()
                filled += 1
    return filled


async def matcher_loop() -> None:
    """Background task: match open orders until cancelled."""
    while True:
        await asyncio.sleep(max(10, settings.LIVE_REFRESH_SECONDS // 2))
        try:
            n = await match_open_orders()
            if n:
                logger.info("Filled %d limit order(s)", n)
        except Exception:
            logger.exception("Limit-order matching pass failed")
