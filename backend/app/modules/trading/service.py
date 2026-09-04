"""
Trading Engine — all order validation and execution happens server-side.
The frontend is NEVER trusted for balance or position calculations.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.order import Order, Transaction
from app.models.position import Position
from app.models.user import User
from app.core.config import settings


class TradingEngine:

    @staticmethod
    async def place_order(
        db: AsyncSession,
        user: User,
        symbol: str,
        side: str,          # "buy" | "sell"
        order_type: str,    # "market" | "limit"
        quantity: float,
        price: Optional[float],  # required for limit orders
        mock_market_price: float,
    ) -> Order:
        """
        Validates and places a virtual order.
        All balance and position checks are done here — never on the client.
        """
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        if order_type == "limit" and not price:
            raise HTTPException(status_code=400, detail="Limit orders require a price")
        if side not in ("buy", "sell"):
            raise HTTPException(status_code=400, detail="Invalid order side")

        exec_price = mock_market_price if order_type == "market" else price
        fee = exec_price * quantity * settings.TRADING_FEE_PERCENT
        total_cost = exec_price * quantity

        # ---- Server-side balance validation ----
        if side == "buy":
            required = total_cost + fee
            if user.virtual_balance < required:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient virtual balance. Required: ${required:.2f}, Available: ${user.virtual_balance:.2f}",
                )

        # ---- Server-side position validation for sells ----
        if side == "sell":
            position = await TradingEngine._get_position(db, user.id, symbol)
            if not position or position.quantity < quantity:
                held = position.quantity if position else 0
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient shares. Trying to sell {quantity}, holding {held}",
                )

        # Create order
        order = Order(
            user_id=user.id,
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            estimated_total=total_cost,
            estimated_fees=fee,
            status="filled" if order_type == "market" else "open",
            avg_fill_price=exec_price if order_type == "market" else None,
            filled_quantity=quantity if order_type == "market" else 0,
            filled_at=datetime.now(timezone.utc) if order_type == "market" else None,
        )
        db.add(order)
        await db.flush()

        # Execute market orders immediately
        if order_type == "market":
            await TradingEngine._execute_order(db, user, order, exec_price)

        await db.flush()
        return order

    @staticmethod
    async def _execute_order(
        db: AsyncSession,
        user: User,
        order: Order,
        fill_price: float,
    ) -> Transaction:
        """Execute a filled order: update balance, position, create transaction."""
        fee = fill_price * order.quantity * settings.TRADING_FEE_PERCENT
        total = fill_price * order.quantity
        realized_pnl = None

        if order.side == "buy":
            # Deduct from balance
            user.virtual_balance -= (total + fee)
            await TradingEngine._update_position(db, user.id, order.symbol, order.quantity, fill_price)

        elif order.side == "sell":
            position = await TradingEngine._get_position(db, user.id, order.symbol)
            if position:
                realized_pnl = (fill_price - position.avg_cost) * order.quantity
                position.realized_pnl += realized_pnl
                position.quantity -= order.quantity
                position.cost_basis = position.avg_cost * position.quantity

                if position.quantity <= 0:
                    await db.delete(position)
            # Add to balance
            user.virtual_balance += (total - fee)

        # Create transaction record
        tx = Transaction(
            order_id=order.id,
            user_id=user.id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=fill_price,
            fees=fee,
            total=total,
            realized_pnl=realized_pnl,
        )
        db.add(tx)
        await db.flush()
        return tx

    @staticmethod
    async def _get_position(db: AsyncSession, user_id: str, symbol: str) -> Optional[Position]:
        result = await db.execute(
            select(Position).where(
                Position.user_id == user_id,
                Position.symbol == symbol,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _update_position(
        db: AsyncSession,
        user_id: str,
        symbol: str,
        quantity: float,
        price: float,
    ) -> None:
        position = await TradingEngine._get_position(db, user_id, symbol)
        if position:
            # Weighted average cost basis
            total_cost = position.avg_cost * position.quantity + price * quantity
            position.quantity += quantity
            position.avg_cost = total_cost / position.quantity
            position.cost_basis = position.avg_cost * position.quantity
        else:
            position = Position(
                user_id=user_id,
                symbol=symbol,
                quantity=quantity,
                avg_cost=price,
                cost_basis=price * quantity,
            )
            db.add(position)

    @staticmethod
    async def cancel_order(db: AsyncSession, user: User, order_id: str) -> Order:
        result = await db.execute(
            select(Order).where(Order.id == order_id, Order.user_id == user.id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status not in ("open", "pending"):
            raise HTTPException(status_code=400, detail=f"Cannot cancel order with status: {order.status}")
        order.status = "cancelled"
        order.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return order
