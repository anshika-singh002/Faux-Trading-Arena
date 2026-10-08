"""
Market data router.
Serves live Yahoo Finance data (see live.py); the simulation in
generate_ohlcv() is only a fallback when live data is unavailable.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import math
import time

from app.modules.market_data import live, risk

router = APIRouter()


class OHLCVPoint(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class IndexSnapshot(BaseModel):
    name: str
    symbol: str
    value: float
    change: float
    change_percent: float


MOCK_BASE_PRICES = {
    # US Stocks & Crypto
    "AAPL": 192.53, "MSFT": 415.32, "GOOGL": 175.84, "AMZN": 198.73,
    "NVDA": 875.40, "TSLA": 248.50, "META": 523.17, "JPM": 205.83,
    "V": 278.42, "JNJ": 152.47, "SPY": 524.82, "QQQ": 457.30,
    "BTC": 64820.0, "ETH": 3412.50, "AMD": 168.73, "NFLX": 685.40,
    "WMT": 84.20, "XOM": 116.83, "DIS": 111.42, "BA": 185.60,
    # Indian Stocks (NSE) — updated to real market prices Oct 2026
    "SBIN": 954.00, "RELIANCE": 1208.60, "HDFCBANK": 702.50,
    "ICICIBANK": 1348.85, "INFY": 994.00, "TCS": 2083.50,
    "ITC": 264.00, "LT": 3691.60, "BHARTIARTL": 1825.70, "ABCAPITAL": 373.00,
    # Indices & Benchmarks
    "NIFTY": 24500.0, "BANKNIFTY": 51200.0, "VIX": 13.5,
}

RANGE_CONFIG = {
    "1D":  {"points": 390,  "interval_s": 60,         "vol": 0.0015},
    "1W":  {"points": 390,  "interval_s": 5 * 60,     "vol": 0.002},
    "1M":  {"points": 22,   "interval_s": 86400,       "vol": 0.018},
    "3M":  {"points": 65,   "interval_s": 86400,       "vol": 0.022},
    "6M":  {"points": 130,  "interval_s": 86400,       "vol": 0.025},
    "1Y":  {"points": 252,  "interval_s": 86400,       "vol": 0.028},
    "5Y":  {"points": 260,  "interval_s": 7 * 86400,   "vol": 0.035},
}


def generate_ohlcv(symbol: str, range_key: str) -> list[OHLCVPoint]:
    cfg = RANGE_CONFIG.get(range_key, RANGE_CONFIG["1M"])
    base = MOCK_BASE_PRICES.get(symbol, 100.0)
    now = int(time.time())
    seed = sum(ord(c) for c in symbol)
    price = base

    points = []
    for i in range(cfg["points"]):
        t = now - (cfg["points"] - i) * cfg["interval_s"]
        r1 = (math.sin(seed * i * 0.1234) * 0.5 + 0.5)
        r2 = (math.sin(seed * i * 0.5678) * 0.5 + 0.5)
        r3 = (math.sin(seed * i * 0.9012) * 0.5 + 0.5)
        r4 = (math.sin(seed * i * 0.3456) * 0.5 + 0.5)

        change = (r1 - 0.5) * cfg["vol"] * 2
        price = price * (1 + change)
        o = price
        c = price * (1 + (r4 - 0.5) * cfg["vol"])
        h = max(o, c) + r2 * cfg["vol"] * price
        l = min(o, c) - r3 * cfg["vol"] * price
        vol = int((r1 + 0.5) * 5_000_000)
        price = c

        points.append(OHLCVPoint(
            time=t,
            open=round(o, 2),
            high=round(h, 2),
            low=round(l, 2),
            close=round(c, 2),
            volume=vol,
        ))

    return points


@router.get("/ohlcv/{symbol}", response_model=list[OHLCVPoint])
async def get_ohlcv(
    symbol: str,
    range: str = Query("1M", pattern="^(1D|1W|1M|3M|6M|1Y|5Y)$"),
):
    """Real candles from Yahoo Finance; simulated only when live data is unavailable."""
    real = await live.get_ohlcv(symbol, range)
    if real:
        return [OHLCVPoint(**p) for p in real]
    return generate_ohlcv(symbol.upper(), range)


_STATIC_INDICES = [
    IndexSnapshot(name="NIFTY 50",    symbol="NIFTY",     value=22603.05, change=-173.35, change_percent=-0.76),
    IndexSnapshot(name="SENSEX",      symbol="SENSEX",    value=72638.70, change=-432.18, change_percent=-0.59),
    IndexSnapshot(name="NIFTY Bank",  symbol="BANKNIFTY", value=55055.55, change=-72.10,  change_percent=-0.13),
    IndexSnapshot(name="NIFTY IT",    symbol="NIFTYIT",   value=27757.80, change=-377.80, change_percent=-1.34),
    IndexSnapshot(name="India VIX",   symbol="INDIAVIX",  value=13.90,    change=0.29,    change_percent=2.13),
    IndexSnapshot(name="USD/INR",     symbol="USDINR",    value=96.42,    change=0.15,    change_percent=0.16),
]


class QuoteOut(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    previous_close: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    avg_volume: Optional[int] = None
    week52_high: Optional[float] = None
    week52_low: Optional[float] = None
    market_cap: Optional[float] = None
    pe: Optional[float] = None
    eps: Optional[float] = None
    is_live: bool


@router.get("/indices", response_model=list[IndexSnapshot])
async def get_indices():
    """Live index values only. An index with no live data is left out, never faked."""
    out = []
    for static in _STATIC_INDICES:
        q = live.get_live_quote(static.symbol)
        if q:
            change = q["price"] - q["previous_close"]
            pct = (change / q["previous_close"] * 100) if q["previous_close"] else 0.0
            out.append(IndexSnapshot(
                name=static.name, symbol=static.symbol,
                value=round(q["price"], 2), change=round(change, 2),
                change_percent=round(pct, 2),
            ))
    return out


@router.get("/quotes", response_model=list[QuoteOut])
async def get_quotes():
    """Live quotes for the supported stocks. Stocks with no live data are left out, never faked."""
    out = []
    for symbol in live.STOCK_TICKERS:
        full = live.get_full_quote(symbol)
        if full:
            out.append(QuoteOut(**full))
    return out


@router.get("/assets")
async def get_assets():
    """The tradable universe (Nifty 50 + ABCAPITAL), with sector and whether an AI model covers it."""
    return [
        {"symbol": sym, "name": live.STOCK_NAMES[sym], "sector": live.STOCK_SECTORS[sym],
         "ai_supported": sym in live.AI_SYMBOLS}
        for sym in live.STOCK_TICKERS
    ]


@router.get("/risk")
async def get_all_risk():
    """Risk report for every supported stock, from real price history."""
    return [risk.assess(symbol) for symbol in live.STOCK_TICKERS]


@router.get("/risk/{symbol}")
async def get_symbol_risk(symbol: str):
    """Why buying (or holding) this stock may lose money, with the numbers behind it."""
    if symbol.upper() not in live.STOCK_TICKERS:
        raise HTTPException(status_code=404, detail="Unsupported symbol")
    return risk.assess(symbol)


@router.get("/status")
async def get_market_status():
    """Whether the NSE regular session is currently open."""
    return live.market_status()


def _movers(positive: bool) -> list[dict]:
    rows = []
    for symbol in live.STOCK_TICKERS:
        q = live.get_live_quote(symbol)
        pct = live.day_change_percent(symbol)
        if q is None or pct is None:
            continue
        if (pct > 0) == positive and pct != 0:
            rows.append({
                "symbol": symbol, "name": live.STOCK_NAMES[symbol],
                "price": round(q["price"], 2), "change_percent": round(pct, 2),
            })
    rows.sort(key=lambda r: r["change_percent"], reverse=positive)
    return rows[:5]


@router.get("/movers/gainers")
async def get_gainers():
    """Today's biggest gainers among the supported NSE stocks (live)."""
    return _movers(True)


@router.get("/movers/losers")
async def get_losers():
    """Today's biggest losers among the supported NSE stocks (live)."""
    return _movers(False)
