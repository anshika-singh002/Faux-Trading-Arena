"""
Backtesting engine.
Currently uses simulated OHLCV data.
When real historical data is available, replace _fetch_ohlcv().
"""
import math
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.strategy import Strategy, Backtest

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_id: str
    symbol: str
    start_date: str
    end_date: str
    starting_capital: float = 100_000.0
    fee_percent: float = 0.1
    slippage_percent: float = 0.05
    benchmark_symbol: str = "SPY"


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


def _run_backtest_sync(strategy_rules: list, symbol: str, days: int, capital: float, fee_pct: float) -> dict:
    """
    Simplified backtesting engine using simulated OHLCV.
    Executes strategy rules against historical price series.
    """
    seed = sum(ord(c) for c in symbol)
    now = int(time.time())
    base_prices = {
        "AAPL": 192.53, "MSFT": 415.32, "GOOGL": 175.84, "AMZN": 198.73,
        "NVDA": 875.40, "TSLA": 248.50, "META": 523.17, "SPY": 524.82,
        "QQQ": 457.30, "BTC": 64820.0, "ETH": 3412.50,
    }
    base = base_prices.get(symbol, 100.0)
    price = base * 0.7  # start lower to simulate history

    prices = []
    for i in range(days):
        r = math.sin(seed * i * 0.08) * 0.012 + 0.0003
        price *= (1 + r)
        prices.append(round(price, 2))

    # Simple SMA crossover backtest (representative of rule-based strategies)
    window_short, window_long = 20, 50
    cash = capital
    shares = 0.0
    trades = []
    portfolio_values = []
    peak = capital

    for i in range(window_long, days):
        sma_short = sum(prices[i - window_short:i]) / window_short
        sma_long = sum(prices[i - window_long:i]) / window_long
        prev_short = sum(prices[i - window_short - 1:i - 1]) / window_short
        prev_long = sum(prices[i - window_long - 1:i - 1]) / window_long

        p = prices[i]
        fee = p * fee_pct / 100

        # Golden cross
        if prev_short <= prev_long and sma_short > sma_long and shares == 0 and cash > p:
            shares = (cash - fee) / p
            cash = 0
            trades.append({"action": "buy", "price": p, "day": i})

        # Death cross
        elif prev_short >= prev_long and sma_short < sma_long and shares > 0:
            cash = shares * p - fee
            pnl = cash - capital
            trades.append({"action": "sell", "price": p, "day": i, "pnl": pnl})
            shares = 0

        val = cash + shares * p
        portfolio_values.append(val)
        peak = max(peak, val)

    final_value = cash + shares * prices[-1]
    total_return = final_value - capital
    total_return_pct = (total_return / capital) * 100

    # Max drawdown
    peak2, max_dd = capital, 0.0
    for v in portfolio_values:
        peak2 = max(peak2, v)
        dd = (v - peak2) / peak2 * 100
        max_dd = min(max_dd, dd)

    # Volatility / Sharpe
    if len(portfolio_values) > 1:
        returns = [(portfolio_values[i] - portfolio_values[i-1]) / portfolio_values[i-1]
                   for i in range(1, len(portfolio_values))]
        avg_r = sum(returns) / len(returns)
        variance = sum((r - avg_r)**2 for r in returns) / len(returns)
        std = math.sqrt(variance) if variance > 0 else 0.001
        annualized_std = std * math.sqrt(252)
        annualized_return = avg_r * 252
        sharpe = (annualized_return - 0.05) / annualized_std if annualized_std > 0 else 0
    else:
        sharpe = 0.0

    sell_trades = [t for t in trades if t["action"] == "sell"]
    win_rate = (sum(1 for t in sell_trades if t.get("pnl", 0) > 0) / len(sell_trades) * 100) if sell_trades else 0

    return {
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return_pct, 2),
        "sharpe_ratio": round(sharpe, 3),
        "max_drawdown": round(max_dd, 2),
        "win_rate": round(win_rate, 1),
        "total_trades": len(trades),
        "profit_factor": round(abs(total_return_pct / max_dd) if max_dd != 0 else 0, 2),
        "portfolio_values": [round(v, 2) for v in portfolio_values[-100:]],
    }


@router.post("/", response_model=BacktestOut, status_code=201)
async def run_backtest(
    payload: BacktestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    try:
        start = date.fromisoformat(payload.start_date)
        end = date.fromisoformat(payload.end_date)
        days = (end - start).days
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    days = max(30, min(days, 1825))  # 30 days to 5 years

    results = _run_backtest_sync(
        strategy_rules=[],
        symbol=payload.symbol.upper(),
        days=days,
        capital=payload.starting_capital,
        fee_pct=payload.fee_percent,
    )

    backtest = Backtest(
        user_id=current_user.id,
        strategy_id=payload.strategy_id,
        symbol=payload.symbol.upper(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        starting_capital=payload.starting_capital,
        fee_percent=payload.fee_percent,
        slippage_percent=payload.slippage_percent,
        benchmark_symbol=payload.benchmark_symbol,
        status="completed",
        results=results,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(backtest)
    await db.flush()
    await db.refresh(backtest)

    return BacktestOut(
        id=backtest.id,
        status="completed",
        total_return=results["total_return"],
        total_return_percent=results["total_return_percent"],
        sharpe_ratio=results["sharpe_ratio"],
        max_drawdown=results["max_drawdown"],
        win_rate=results["win_rate"],
        total_trades=results["total_trades"],
        results=results,
        created_at=backtest.created_at.isoformat(),
    )


@router.get("/{backtest_id}", response_model=BacktestOut)
async def get_backtest(
    backtest_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from fastapi import HTTPException
    result = await db.execute(
        select(Backtest).where(
            Backtest.id == backtest_id,
            Backtest.user_id == current_user.id,
        )
    )
    bt = result.scalar_one_or_none()
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest not found")

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
