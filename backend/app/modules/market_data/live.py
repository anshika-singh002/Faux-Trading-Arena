"""
Live market data (yfinance) with in-memory caches.

Background tasks keep three caches warm; request handlers only ever read them,
so they never block on the network:

* quotes   - latest price + previous close, every LIVE_REFRESH_SECONDS
* daily    - ~2 years of daily OHLCV for every stock and market index, every
             DAILY_REFRESH_SECONDS (feeds charts, AI features, backtests)
* intraday - fetched on demand and cached briefly

If live data is disabled or unavailable, callers fall back to the simulated
MOCK_BASE_PRICES, so the app keeps working offline.
"""
import asyncio
import logging
import threading
import time
from datetime import datetime, time as dtime
from typing import Optional
from zoneinfo import ZoneInfo

import pandas as pd

from app.core.config import settings

logger = logging.getLogger(__name__)

# Stock universe (Nifty 50 + ABCAPITAL) lives in universe.py
from app.modules.market_data.universe import (  # noqa: E402
    AI_SYMBOLS, STOCK_NAMES, STOCK_SECTORS, STOCK_TICKERS,
)

# app symbol -> (display name, Yahoo Finance ticker)
INDEX_TICKERS: dict[str, tuple[str, str]] = {
    "NIFTY":     ("NIFTY 50",   "^NSEI"),
    "SENSEX":    ("SENSEX",     "^BSESN"),
    "BANKNIFTY": ("NIFTY Bank", "^NSEBANK"),
    "NIFTYIT":   ("NIFTY IT",   "^CNXIT"),
    "INDIAVIX":  ("India VIX",  "^INDIAVIX"),
    "USDINR":    ("USD/INR",    "INR=X"),
}

_lock = threading.Lock()
_quotes: dict[str, dict] = {}                 # app symbol -> {price, previous_close}
_quotes_at: float = 0.0
_daily: dict[str, pd.DataFrame] = {}          # app symbol -> daily OHLCV
_daily_at: float = 0.0
_intraday: dict[tuple, tuple[float, list]] = {}   # (symbol, range) -> (ts, points)
_fundamentals: dict[str, dict] = {}           # symbol -> {market_cap, pe, eps}
_fundamentals_at: float = 0.0
FUNDAMENTALS_REFRESH_SECONDS = 6 * 3600

IST = ZoneInfo("Asia/Kolkata")

# range key -> (yfinance period, interval, cache seconds, uses the daily cache)
RANGE_MAP: dict[str, tuple[str, str, int, bool]] = {
    "1D": ("1d",  "5m",  60,   False),
    "1W": ("5d",  "15m", 120,  False),
    "1M": ("1mo", "1d",  600,  True),
    "3M": ("3mo", "1d",  600,  True),
    "6M": ("6mo", "1d",  600,  True),
    "1Y": ("1y",  "1d",  600,  True),
    "5Y": ("5y",  "1wk", 3600, False),
}
_RANGE_DAYS = {"1M": 31, "3M": 93, "6M": 186, "1Y": 366}


def _all_tickers() -> dict[str, str]:
    tickers = dict(STOCK_TICKERS)
    tickers.update({sym: t for sym, (_, t) in INDEX_TICKERS.items()})
    return tickers


def _normalise(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case OHLCV columns, drop empty rows, tz-naive index."""
    df = df.rename(columns=str.lower)
    df = df[["open", "high", "low", "close", "volume"]].dropna(subset=["close"])
    if getattr(df.index, "tz", None) is not None:
        df.index = df.index.tz_convert(IST).tz_localize(None)
    return df


# ── Quotes ───────────────────────────────────────────────────────────────────

def _fetch_quotes_blocking() -> dict[str, dict]:
    import yfinance as yf

    tickers = _all_tickers()
    df = yf.download(
        list(tickers.values()), period="5d", interval="1d",
        progress=False, auto_adjust=False, threads=True,
    )
    closes = df["Close"]
    out: dict[str, dict] = {}
    for symbol, ticker in tickers.items():
        if ticker not in closes.columns:
            continue
        series = closes[ticker].dropna()
        if len(series) == 0:
            continue
        price = float(series.iloc[-1])
        prev = float(series.iloc[-2]) if len(series) > 1 else price
        out[symbol] = {
            "price": price, "previous_close": prev,
            "date": str(series.index[-1].date()),   # trading day of the latest price
            "fetched_at": time.time(),
        }
    return out


async def refresh_quotes() -> bool:
    """Refresh the quote cache. Returns True if any live quote was received."""
    global _quotes_at
    try:
        fresh = await asyncio.to_thread(_fetch_quotes_blocking)
    except Exception as exc:  # network down, rate limit, schema change...
        logger.warning("Live quote refresh failed: %s", exc)
        return False
    if not fresh:
        return False
    with _lock:
        _quotes.update(fresh)
        _quotes_at = time.time()
    return True


def _fetch_one_blocking(symbol: str) -> Optional[dict]:
    import yfinance as yf

    ticker = _all_tickers().get(symbol)
    if not ticker:
        return None
    df = yf.download(ticker, period="5d", interval="1d", progress=False, auto_adjust=False)
    close = df["Close"]
    if hasattr(close, "columns"):
        close = close.iloc[:, 0]
    series = close.dropna()
    if len(series) == 0:
        return None
    price = float(series.iloc[-1])
    prev = float(series.iloc[-2]) if len(series) > 1 else price
    return {"price": price, "previous_close": prev,
            "date": str(series.index[-1].date()), "fetched_at": time.time()}


async def fresh_price(symbol: str, max_age: float = 15.0) -> Optional[float]:
    """
    Price for order execution. Reuses the cache when it is at most `max_age`
    seconds old, otherwise fetches this one symbol right now. If that fetch
    fails, a cached price up to 90 seconds old is still accepted; anything older
    returns None so the order is refused instead of filling on a stale price.
    """
    symbol = symbol.upper()
    cached = get_live_quote(symbol)
    now = time.time()
    if cached and now - cached.get("fetched_at", now) <= max_age:
        return cached["price"]
    if settings.LIVE_MARKET_DATA:
        try:
            fresh = await asyncio.wait_for(asyncio.to_thread(_fetch_one_blocking, symbol), timeout=8)
        except Exception as exc:
            logger.warning("Fresh price fetch failed for %s: %s", symbol, exc)
            fresh = None
        if fresh:
            with _lock:
                _quotes[symbol] = fresh
            return fresh["price"]
        if cached and now - cached.get("fetched_at", now) <= 90:
            return cached["price"]
        return None
    return get_price(symbol)


def _is_fresh() -> bool:
    return (
        settings.LIVE_MARKET_DATA
        and _quotes_at > 0
        and time.time() - _quotes_at < settings.LIVE_REFRESH_SECONDS * 5
    )


def get_live_quote(symbol: str) -> Optional[dict]:
    """Cached live quote for a symbol, or None if unavailable/stale."""
    if not _is_fresh():
        return None
    with _lock:
        return _quotes.get(symbol.upper())


def get_price(symbol: str, default: Optional[float] = None) -> Optional[float]:
    """
    Live price, else `default`. With live data switched on there is no invented
    fallback: callers must handle None (trading refuses, portfolios value at cost).
    The simulated base price is used only when LIVE_MARKET_DATA is explicitly off.
    """
    q = get_live_quote(symbol)
    if q:
        return q["price"]
    if not settings.LIVE_MARKET_DATA:
        from app.modules.market_data.router import MOCK_BASE_PRICES

        return MOCK_BASE_PRICES.get(symbol.upper(), default)
    return default


def day_change_percent(symbol: str) -> Optional[float]:
    q = get_live_quote(symbol)
    if not q or not q["previous_close"]:
        return None
    return (q["price"] - q["previous_close"]) / q["previous_close"] * 100


# ── Daily history ────────────────────────────────────────────────────────────

def _fetch_daily_blocking() -> dict[str, pd.DataFrame]:
    import yfinance as yf

    tickers = _all_tickers()
    df = yf.download(
        list(tickers.values()), period="2y", interval="1d",
        progress=False, auto_adjust=False, threads=True, group_by="ticker",
    )
    out: dict[str, pd.DataFrame] = {}
    for symbol, ticker in tickers.items():
        try:
            sub = _normalise(df[ticker])
        except Exception:
            continue
        if len(sub) > 0:
            out[symbol] = sub
    return out


async def refresh_daily() -> bool:
    global _daily_at
    try:
        fresh = await asyncio.to_thread(_fetch_daily_blocking)
    except Exception as exc:
        logger.warning("Daily history refresh failed: %s", exc)
        return False
    if not fresh:
        return False
    with _lock:
        _daily.update(fresh)
        _daily_at = time.time()
    return True


def get_daily(symbol: str) -> Optional[pd.DataFrame]:
    """Cached daily OHLCV (about 2 years) for a stock or index, or None."""
    if not settings.LIVE_MARKET_DATA:
        return None
    with _lock:
        df = _daily.get(symbol.upper())
    return None if df is None else df.copy()


def get_model_inputs(symbol: str) -> Optional[dict[str, pd.DataFrame]]:
    """Stock + NIFTY + BANKNIFTY + VIX candles for AI feature engineering."""
    frames = {
        "stock": get_daily(symbol),
        "nifty": get_daily("NIFTY"),
        "bank": get_daily("BANKNIFTY"),
        "vix": get_daily("INDIAVIX"),
    }
    if any(f is None or len(f) < 70 for f in frames.values()):
        return None
    return frames  # type: ignore[return-value]


def _blocking_history(symbol: str, **kwargs) -> pd.DataFrame:
    import yfinance as yf

    ticker = _all_tickers().get(symbol.upper())
    if not ticker:
        return pd.DataFrame()
    df = yf.Ticker(ticker).history(auto_adjust=False, **kwargs)
    if df is None or df.empty:
        return pd.DataFrame()
    return _normalise(df)


def _to_points(df: pd.DataFrame) -> list[dict]:
    points = []
    for ts, row in df.iterrows():
        # Index is IST-naive; chart wants a UTC unix timestamp
        epoch = int(pd.Timestamp(ts).tz_localize(IST).timestamp())
        points.append({
            "time": epoch,
            "open": round(float(row["open"]), 2), "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2), "close": round(float(row["close"]), 2),
            "volume": int(row["volume"]) if pd.notna(row["volume"]) else 0,
        })
    # Charts need strictly increasing times
    dedup: dict[int, dict] = {p["time"]: p for p in points}
    return [dedup[t] for t in sorted(dedup)]


async def get_ohlcv(symbol: str, range_key: str) -> Optional[list[dict]]:
    """Real OHLCV candles for a chart range, or None if unavailable."""
    if not settings.LIVE_MARKET_DATA or range_key not in RANGE_MAP:
        return None
    symbol = symbol.upper()
    if symbol not in _all_tickers():
        return None
    period, interval, ttl, from_daily = RANGE_MAP[range_key]

    cached = _intraday.get((symbol, range_key))
    if cached and time.time() - cached[0] < ttl:
        return cached[1]

    df: Optional[pd.DataFrame] = None
    if from_daily:
        daily = get_daily(symbol)
        if daily is not None and len(daily):
            cutoff = daily.index.max() - pd.Timedelta(days=_RANGE_DAYS[range_key])
            df = daily[daily.index >= cutoff]
    if df is None or df.empty:
        try:
            df = await asyncio.to_thread(_blocking_history, symbol, period=period, interval=interval)
        except Exception as exc:
            logger.warning("History fetch failed for %s %s: %s", symbol, range_key, exc)
            return None
    if df.empty:
        return None
    points = _to_points(df)
    _intraday[(symbol, range_key)] = (time.time(), points)
    return points


async def get_history_between(symbol: str, start: str, end: str) -> Optional[pd.DataFrame]:
    """Daily OHLCV between two ISO dates (for backtests), or None if unavailable."""
    if not settings.LIVE_MARKET_DATA or symbol.upper() not in _all_tickers():
        return None
    try:
        df = await asyncio.to_thread(
            _blocking_history, symbol, start=start, end=end, interval="1d",
        )
    except Exception as exc:
        logger.warning("Backtest history fetch failed for %s: %s", symbol, exc)
        return None
    return df if len(df) else None


# ── Fundamentals (market cap, P/E, EPS) ──────────────────────────────────────

def _fundamentals_for(symbol: str, ticker: str) -> Optional[dict]:
    import yfinance as yf

    t = yf.Ticker(ticker)
    # `info` is the richest source but flaky; fast_info is the fallback for market cap
    info: dict = {}
    try:
        info = t.info or {}
    except Exception as exc:
        logger.debug("Yahoo info unavailable for %s: %s", symbol, exc)
    cap = info.get("marketCap")
    if not cap:
        try:
            cap = t.fast_info.market_cap
        except Exception as exc:
            logger.debug("Market cap unavailable for %s: %s", symbol, exc)
    if cap or info.get("trailingPE") or info.get("trailingEps"):
        return {"market_cap": cap, "pe": info.get("trailingPE"), "eps": info.get("trailingEps")}
    return None


def _fetch_fundamentals_blocking() -> dict[str, dict]:
    from concurrent.futures import ThreadPoolExecutor

    items = list(STOCK_TICKERS.items())
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda kv: _fundamentals_for(*kv), items))
    return {sym: res for (sym, _), res in zip(items, results) if res}


async def refresh_fundamentals() -> bool:
    global _fundamentals_at
    try:
        fresh = await asyncio.to_thread(_fetch_fundamentals_blocking)
    except Exception as exc:
        logger.warning("Fundamentals refresh failed: %s", exc)
        return False
    if not fresh:
        return False
    with _lock:
        _fundamentals.update(fresh)
        _fundamentals_at = time.time()
    return True


def get_full_quote(symbol: str) -> Optional[dict]:
    """
    Everything the market pages show for a stock: live price and day change,
    today's open/high/low, volume vs 20-day average, 52-week range, fundamentals.
    """
    q = get_live_quote(symbol)
    if q is None:
        return None
    symbol = symbol.upper()
    price, prev = q["price"], q["previous_close"]
    out = {
        "symbol": symbol, "price": round(price, 2), "previous_close": round(prev, 2),
        "change": round(price - prev, 2),
        "change_percent": round((price - prev) / prev * 100, 2) if prev else 0.0,
        "open": None, "high": None, "low": None, "volume": None, "avg_volume": None,
        "week52_high": None, "week52_low": None,
        "market_cap": None, "pe": None, "eps": None, "is_live": True,
    }
    daily = get_daily(symbol)
    if daily is not None and len(daily):
        last = daily.iloc[-1]
        year = daily.tail(252)
        out.update({
            "open": round(float(last["open"]), 2), "high": round(float(last["high"]), 2),
            "low": round(float(last["low"]), 2), "volume": int(last["volume"]),
            "avg_volume": int(daily["volume"].tail(20).mean()),
            "week52_high": round(float(year["high"].max()), 2),
            "week52_low": round(float(year["low"].min()), 2),
        })
    with _lock:
        out.update({k: v for k, v in _fundamentals.get(symbol, {}).items() if v is not None})
    return out


# ── Background loop ──────────────────────────────────────────────────────────

async def refresh_loop() -> None:
    """Keep the quote and daily caches warm until cancelled."""
    last_daily = 0.0
    last_fundamentals = 0.0
    while True:
        await refresh_quotes()
        if time.time() - last_fundamentals > FUNDAMENTALS_REFRESH_SECONDS:
            if await refresh_fundamentals():
                last_fundamentals = time.time()
            else:
                # Market cap / P/E missing: retry in 5 minutes instead of waiting 6 hours
                last_fundamentals = time.time() - FUNDAMENTALS_REFRESH_SECONDS + 300
        if time.time() - last_daily > settings.DAILY_REFRESH_SECONDS:
            if await refresh_daily():
                last_daily = time.time()
            else:
                last_daily = time.time() - settings.DAILY_REFRESH_SECONDS + 60  # retry in a minute
        await asyncio.sleep(settings.LIVE_REFRESH_SECONDS)


# ── Market hours ─────────────────────────────────────────────────────────────

def market_status(now: Optional[datetime] = None) -> dict:
    """
    NSE regular session: Mon-Fri 09:15-15:30 IST.

    Exchange holidays are detected from the data instead of a hard-coded calendar:
    if it is a weekday 10:00-15:30 IST but NIFTY's latest price is still from an
    earlier day, the exchange did not trade today, so the market is closed.
    """
    now = (now or datetime.now(IST)).astimezone(IST)
    in_hours = now.weekday() < 5 and dtime(9, 15) <= now.time() <= dtime(15, 30)
    is_open, reason = in_hours, None
    if in_hours and now.time() >= dtime(10, 0):
        q = get_live_quote("NIFTY")
        if q and q.get("date") and q["date"] < str(now.date()):
            is_open, reason = False, "holiday"
    elif not in_hours:
        reason = "weekend" if now.weekday() >= 5 else "after hours"
    return {"is_open": is_open, "as_of": now.isoformat(), "exchange": "NSE", "reason": reason}
