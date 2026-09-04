from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User


class UserService:

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> User | None:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> User:
        user = User(**kwargs)
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_last_login(db: AsyncSession, user_id: str) -> None:
        user = await UserService.get_by_id(db, user_id)
        if user:
            user.last_login = datetime.now(timezone.utc)
            await db.flush()

    @staticmethod
    async def update_balance(db: AsyncSession, user_id: str, new_balance: float) -> None:
        user = await UserService.get_by_id(db, user_id)
        if user:
            user.virtual_balance = new_balance
            await db.flush()
