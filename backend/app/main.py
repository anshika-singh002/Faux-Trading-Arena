"""
Faux Trading — FastAPI Backend
Modular monolith. Each domain is a separate router/module.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables

# Routers
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.assets.router import router as assets_router
from app.modules.market_data.router import router as market_data_router
from app.modules.orders.router import router as orders_router
from app.modules.trading.router import router as trading_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.strategies.router import router as strategies_router
from app.modules.backtesting.router import router as backtesting_router
from app.modules.ai.router import router as ai_router
from app.modules.leaderboard.router import router as leaderboard_router
from app.modules.notifications.router import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    yield
    # Shutdown


app = FastAPI(
    title="Faux Trading API",
    description="Virtual trading simulator backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router,          prefix="/api/v1/auth",          tags=["auth"])
app.include_router(users_router,         prefix="/api/v1/users",         tags=["users"])
app.include_router(assets_router,        prefix="/api/v1/assets",        tags=["assets"])
app.include_router(market_data_router,   prefix="/api/v1/market",        tags=["market"])
app.include_router(orders_router,        prefix="/api/v1/orders",        tags=["orders"])
app.include_router(trading_router,       prefix="/api/v1/trading",       tags=["trading"])
app.include_router(portfolio_router,     prefix="/api/v1/portfolio",     tags=["portfolio"])
app.include_router(strategies_router,    prefix="/api/v1/strategies",    tags=["strategies"])
app.include_router(backtesting_router,   prefix="/api/v1/backtesting",   tags=["backtesting"])
app.include_router(ai_router,            prefix="/api/v1/ai",            tags=["ai"])
app.include_router(leaderboard_router,   prefix="/api/v1/leaderboard",   tags=["leaderboard"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "faux-trading-api"}
