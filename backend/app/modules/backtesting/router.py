"""
Backtesting API. Runs a saved strategy over REAL historical daily prices
(Yahoo Finance) using the engine in engine.py.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.strategy import Strategy, Backtest
from app.models.user import User
from app.modules.backtesting.engine import run_backtest
from app.modules.market_data import live

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_id: str
    symbol: str
    start_date: str
    end_date: str
    starting_capital: float = 1_000_000.0
    fee_percent: float = 0.1
    slippage_percent: float = 0.05
    benchmark_symbol: str = "NIFTY"


class BacktestOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    status: str
    total_return: Optional[float] = None
    total_return_percent: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: Optional[float] = None
    total_trades: Optional[int] = None
    results: Optional[dict] = None
    created_at: str


def _to_out(bt: Backtest) -> BacktestOut:
    r = bt.results or {}
    return BacktestOut(
        id=bt.id, status=bt.status,
        total_return=r.get("total_return"),
        total_return_percent=r.get("total_return_percent"),
        sharpe_ratio=r.get("sharpe_ratio"),
        max_drawdown=r.get("max_drawdown"),
        win_rate=r.get("win_rate"),
        total_trades=r.get("total_trades"),
        results=r,
        created_at=bt.created_at.isoformat(),
    )


@router.post("/", response_model=BacktestOut, status_code=201)
async def run_backtest_endpoint(
    payload: BacktestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        start = date.fromisoformat(payload.start_date)
        end = date.fromisoformat(payload.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    if end <= start:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    symbol = payload.symbol.upper()
    if symbol not in live.STOCK_TICKERS:
        raise HTTPException(status_code=400, detail=f"Unsupported symbol {symbol}")
    if not settings.LIVE_MARKET_DATA:
        raise HTTPException(status_code=503, detail="Backtesting needs live market data (LIVE_MARKET_DATA is off)")

    strategy = (await db.execute(
        select(Strategy).where(Strategy.id == payload.strategy_id, Strategy.user_id == current_user.id)
    )).scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    # Warm-up history so long indicators (SMA 200) are valid on the first day
    warmup_start = (start - timedelta(days=320)).isoformat()
    full = await live.get_history_between(symbol, warmup_start, payload.end_date)
    if full is None:
        raise HTTPException(status_code=503, detail="Could not fetch historical prices right now")
    bench_symbol = payload.benchmark_symbol.upper()
    bench_full = await live.get_history_between(bench_symbol, warmup_start, payload.end_date)

    try:
        results = run_backtest(
            full, strategy.rules, payload.starting_capital,
            payload.fee_percent, payload.slippage_percent,
            benchmark_close=bench_full["close"] if bench_full is not None else None,
            trade_from=pd.Timestamp(start),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    results["data_source"] = "yahoo_finance"
    results["rules_used"] = "strategy" if strategy.rules else "default_sma_20_50"

    backtest = Backtest(
        user_id=current_user.id,
        strategy_id=payload.strategy_id,
        symbol=symbol,
        start_date=payload.start_date,
        end_date=payload.end_date,
        starting_capital=payload.starting_capital,
        fee_percent=payload.fee_percent,
        slippage_percent=payload.slippage_percent,
        benchmark_symbol=bench_symbol,
        status="completed",
        results=results,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(backtest)
    await db.flush()
    await db.refresh(backtest)
    return _to_out(backtest)


@router.get("/{backtest_id}", response_model=BacktestOut)
async def get_backtest(
    backtest_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Backtest).where(
            Backtest.id == backtest_id,
            Backtest.user_id == current_user.id,
        )
    )
    bt = result.scalar_one_or_none()
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return _to_out(bt)
