from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # App
    APP_NAME: str = "Faux Trading"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./faux_trading.db"  # use requirements-postgres.txt for PostgreSQL

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://fauxtrading.app",
    ]

    # Virtual trading
    INITIAL_VIRTUAL_BALANCE: float = 10_000_000.0  # ₹1 crore
    TRADING_FEE_PERCENT: float = 0.001   # 0.1%
    SLIPPAGE_PERCENT: float = 0.0005     # 0.05%

    # Live market data (yfinance). Falls back to simulated prices when unavailable.
    LIVE_MARKET_DATA: bool = True
    LIVE_REFRESH_SECONDS: int = 60
    DAILY_REFRESH_SECONDS: int = 900

    # AI service mode: "mock" uses MockAIService, "live" uses MLModelAIService
    AI_MODE: str = "mock"
    AI_MODEL_API_URL: str = ""
    AI_MODEL_API_KEY: str = ""

    # GNews API — free tier: 100 req/day — https://gnews.io
    GNEWS_API_KEY: str = ""


settings = Settings()
