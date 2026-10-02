from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# SQLite doesn't support pool_size / max_overflow; PostgreSQL does.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    async with engine.begin() as conn:
        # Import all models to register them
        from app.models import (  # noqa: F401
            user, asset, order, position,
            transaction, strategy, backtest,
            ai_model, notification, audit_log,
        )
        await conn.run_sync(Base.metadata.create_all)
