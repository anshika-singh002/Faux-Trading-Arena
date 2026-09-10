"""
Market data router.
Currently returns simulated OHLCV data.
When a real market data provider is integrated,
replace the simulation functions with API calls.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import math
import time

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
    # Indian Stocks (NSE)
    "SBIN": 812.0, "RELIANCE": 2980.0, "HDFCBANK": 1650.0,
    "ICICIBANK": 1190.0, "INFY": 1840.0, "TCS": 4250.0,
    "ITC": 495.0, "LT": 3620.0, "BHARTIARTL": 1540.0, "ABCAPITAL": 228.0,
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
    return generate_ohlcv(symbol.upper(), range)


@router.get("/indices", response_model=list[IndexSnapshot])
async def get_indices():
    return [
        IndexSnapshot(name="S&P 500",      symbol="SPX",  value=5234.82, change=24.10,   change_percent=0.46),
        IndexSnapshot(name="NASDAQ",       symbol="IXIC", value=16438.50, change=88.40,  change_percent=0.54),
        IndexSnapshot(name="DOW",          symbol="DJI",  value=38893.20, change=-45.20, change_percent=-0.12),
        IndexSnapshot(name="Russell 2000", symbol="RUT",  value=2089.40, change=12.30,   change_percent=0.59),
        IndexSnapshot(name="VIX",          symbol="VIX",  value=14.82,  change=-0.54,    change_percent=-3.52),
        IndexSnapshot(name="10Y Yield",    symbol="TNX",  value=4.218,  change=0.032,    change_percent=0.76),
    ]


@router.get("/movers/gainers")
async def get_gainers():
    return [
        {"symbol": "AMD",  "name": "Advanced Micro Dev.", "price": 168.73, "change_percent": 1.52},
        {"symbol": "NVDA", "name": "NVIDIA Corp.",        "price": 875.40, "change_percent": 1.50},
        {"symbol": "NFLX", "name": "Netflix Inc.",        "price": 685.40, "change_percent": 0.78},
        {"symbol": "BTC",  "name": "Bitcoin",             "price": 64820,  "change_percent": 1.68},
        {"symbol": "AAPL", "name": "Apple Inc.",          "price": 192.53, "change_percent": 0.99},
    ]


@router.get("/movers/losers")
async def get_losers():
    return [
        {"symbol": "TSLA", "name": "Tesla Inc.",        "price": 248.50, "change_percent": -2.24},
        {"symbol": "DIS",  "name": "Walt Disney Co.",   "price": 111.42, "change_percent": -0.61},
        {"symbol": "XOM",  "name": "Exxon Mobil Corp.", "price": 116.83, "change_percent": -0.40},
        {"symbol": "JNJ",  "name": "Johnson & Johnson", "price": 152.47, "change_percent": -0.41},
        {"symbol": "BA",   "name": "Boeing Co.",        "price": 185.60, "change_percent": -1.12},
    ]
