"""Tests for the live market data layer. The network is always faked."""
import time
from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from app.core.config import settings
from app.modules.market_data import live


@pytest.fixture(autouse=True)
def clean_live_state(monkeypatch):
    """Isolate every test from real data and from each other."""
    monkeypatch.setattr(settings, "LIVE_MARKET_DATA", True)
    monkeypatch.setattr(live, "_quotes", {})
    monkeypatch.setattr(live, "_quotes_at", 0.0)
    monkeypatch.setattr(live, "_daily", {})
    monkeypatch.setattr(live, "_daily_at", 0.0)
    monkeypatch.setattr(live, "_fundamentals", {})
    monkeypatch.setattr(live, "_intraday", {})


def fake_daily(n=300, start_price=100.0) -> pd.DataFrame:
    idx = pd.bdate_range("2025-01-01", periods=n)
    close = start_price + np.arange(n) * 0.5
    return pd.DataFrame(
        {"open": close - 0.2, "high": close + 1, "low": close - 1, "close": close,
         "volume": np.full(n, 2_000_000.0)}, index=idx)


def set_quote(symbol, price, prev):
    live._quotes[symbol] = {"price": price, "previous_close": prev}
    live._quotes_at = time.time()


async def test_refresh_quotes_populates_cache(monkeypatch):
    monkeypatch.setattr(live, "_fetch_quotes_blocking",
                        lambda: {"SBIN": {"price": 940.0, "previous_close": 954.0}})
    assert await live.refresh_quotes() is True
    assert live.get_live_quote("SBIN")["price"] == 940.0
    assert live.get_price("SBIN") == 940.0


async def test_refresh_failure_gives_no_invented_price(monkeypatch):
    def boom():
        raise RuntimeError("network down")
    monkeypatch.setattr(live, "_fetch_quotes_blocking", boom)
    assert await live.refresh_quotes() is False
    assert live.get_live_quote("SBIN") is None
    # with live data on there is no invented price: callers get None (or their own default)
    assert live.get_price("SBIN") is None
    assert live.get_price("SBIN", 100.0) == 100.0


def test_stale_quotes_are_not_served():
    set_quote("TCS", 2000.0, 2010.0)
    live._quotes_at = time.time() - settings.LIVE_REFRESH_SECONDS * 10
    assert live.get_live_quote("TCS") is None


def test_live_data_can_be_switched_off(monkeypatch):
    set_quote("TCS", 2000.0, 2010.0)
    monkeypatch.setattr(settings, "LIVE_MARKET_DATA", False)
    assert live.get_live_quote("TCS") is None
    assert live.get_daily("TCS") is None


def test_unknown_symbol_price_default():
    assert live.get_price("NOPE", 42.0) == 42.0
    assert live.get_price("NOPE") is None


def test_day_change_percent():
    set_quote("ITC", 264.0, 250.0)
    assert live.day_change_percent("ITC") == pytest.approx(5.6)
    assert live.day_change_percent("TCS") is None


def test_full_quote_combines_live_price_and_history():
    set_quote("INFY", 1100.0, 1000.0)
    live._daily["INFY"] = fake_daily()
    live._fundamentals["INFY"] = {"market_cap": 4.5e12, "pe": 21.5, "eps": 46.7}
    q = live.get_full_quote("INFY")
    assert q["price"] == 1100.0 and q["change"] == 100.0 and q["change_percent"] == 10.0
    assert q["week52_high"] >= q["week52_low"]
    assert q["avg_volume"] == 2_000_000
    assert q["pe"] == 21.5 and q["market_cap"] == 4.5e12
    assert q["is_live"] is True


def test_full_quote_is_none_without_live_price():
    assert live.get_full_quote("INFY") is None


def test_model_inputs_need_enough_history_for_every_series():
    live._daily["SBIN"] = fake_daily()
    assert live.get_model_inputs("SBIN") is None          # market series missing
    for sym in ("NIFTY", "BANKNIFTY", "INDIAVIX"):
        live._daily[sym] = fake_daily()
    inputs = live.get_model_inputs("SBIN")
    assert set(inputs) == {"stock", "nifty", "bank", "vix"}
    live._daily["INDIAVIX"] = fake_daily(30)              # too short
    assert live.get_model_inputs("SBIN") is None


async def test_ohlcv_points_are_strictly_increasing(monkeypatch):
    live._daily["LT"] = fake_daily()
    points = await live.get_ohlcv("LT", "3M")
    assert points
    times = [p["time"] for p in points]
    assert times == sorted(set(times))
    assert {"open", "high", "low", "close", "volume"} <= set(points[0])


async def test_ohlcv_unknown_symbol_or_range_returns_none():
    assert await live.get_ohlcv("AAPL", "1M") is None
    assert await live.get_ohlcv("LT", "99Y") is None


@pytest.mark.parametrize("when,expected", [
    (datetime(2026, 10, 5, 10, 0, tzinfo=live.IST), True),    # Monday mid-session
    (datetime(2026, 10, 5, 9, 14, tzinfo=live.IST), False),   # just before open
    (datetime(2026, 10, 5, 15, 30, tzinfo=live.IST), True),   # closing minute
    (datetime(2026, 10, 5, 15, 31, tzinfo=live.IST), False),  # after close
    (datetime(2026, 10, 10, 11, 0, tzinfo=live.IST), False),  # Saturday
])
def test_market_status_follows_nse_hours(when, expected):
    assert live.market_status(when)["is_open"] is expected


async def test_movers_use_live_quotes():
    from app.modules.market_data.router import get_gainers, get_losers
    set_quote("INFY", 1050.0, 1000.0)    # +5%
    set_quote("TCS", 1900.0, 2000.0)     # -5%
    set_quote("ITC", 264.0, 264.0)       # flat: neither list
    assert [g["symbol"] for g in await get_gainers()] == ["INFY"]
    assert [l["symbol"] for l in await get_losers()] == ["TCS"]


async def test_movers_empty_when_no_live_data():
    from app.modules.market_data.router import get_gainers
    assert await get_gainers() == []


def test_holiday_is_detected_from_stale_nifty_data():
    from datetime import datetime
    set_quote("NIFTY", 22000.0, 22100.0)
    live._quotes["NIFTY"]["date"] = "2026-10-06"          # last trade was yesterday
    tue_noon = datetime(2026, 10, 7, 12, 0, tzinfo=live.IST)
    st = live.market_status(tue_noon)
    assert st["is_open"] is False and st["reason"] == "holiday"
    live._quotes["NIFTY"]["date"] = "2026-10-07"          # traded today
    assert live.market_status(tue_noon)["is_open"] is True
    assert live.market_status(datetime(2026, 10, 10, 12, 0, tzinfo=live.IST))["reason"] == "weekend"
