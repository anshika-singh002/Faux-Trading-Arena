"""
End-to-end API tests against a throw-away SQLite database.

The real dev database is never touched: get_db is overridden and the matcher's
session factory is patched. Live market data is faked by seeding the quote cache.
"""
import asyncio
import time

import numpy as np
import pandas as pd
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.modules.market_data import live
from app.modules.trading import matcher


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as conn:
        from app.models import (  # noqa: F401
            user, asset, order, position, transaction, strategy, backtest,
            ai_model, notification, audit_log,
        )
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(matcher, "AsyncSessionLocal", session_factory)
    monkeypatch.setattr(settings, "LIVE_MARKET_DATA", True)
    monkeypatch.setattr(settings, "INITIAL_VIRTUAL_BALANCE", 10_000_000.0)
    monkeypatch.setattr(live, "_quotes", {})
    monkeypatch.setattr(live, "_quotes_at", 0.0)
    monkeypatch.setattr(live, "_daily", {})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await engine.dispose()


def quote(symbol, price, prev=None):
    live._quotes[symbol] = {"price": price, "previous_close": prev or price}
    live._quotes_at = time.time()


_counter = 0


async def signup(client, name="alice"):
    """Register a user and return auth headers."""
    global _counter
    _counter += 1
    r = await client.post("/api/v1/auth/register", json={
        "email": f"{name}{_counter}@example.com", "username": f"{name}{_counter}",
        "display_name": name.title(), "password": "correct-horse-battery",
    })
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def order(symbol="SBIN", side="buy", qty=10, order_type="market", price=None):
    return {"symbol": symbol, "side": side, "order_type": order_type, "quantity": qty, "price": price}


# ── 1. starting balance bug ──────────────────────────────────────────────────

async def test_new_account_shows_zero_return(client):
    h = await signup(client)
    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    assert p["total_value"] == pytest.approx(10_000_000.0)
    assert p["total_return"] == pytest.approx(0.0)
    assert p["total_return_percent"] == pytest.approx(0.0)


# ── 2. live prices drive P&L ────────────────────────────────────────────────

async def test_portfolio_value_follows_live_price(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    r = await client.post("/api/v1/trading/order", json=order(qty=100), headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["avg_fill_price"] == pytest.approx(1000.0)

    quote("SBIN", 1100.0)   # price rises 10%
    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    pos = p["positions"][0]
    assert pos["current_price"] == pytest.approx(1100.0)
    assert pos["unrealized_pnl"] == pytest.approx(10_000.0)
    assert p["total_return"] == pytest.approx(10_000.0 - 100.0 * 1000.0 * settings.TRADING_FEE_PERCENT)


# ── 3. notifications ─────────────────────────────────────────────────────────

async def test_filled_order_creates_notification_and_mark_read(client):
    h = await signup(client)
    quote("TCS", 2000.0)
    await client.post("/api/v1/trading/order", json=order("TCS", qty=5), headers=h)

    notes = (await client.get("/api/v1/notifications/", headers=h)).json()
    assert len(notes) == 1
    assert notes[0]["title"] == "Order Filled" and "TCS BUY 5" in notes[0]["message"]
    assert notes[0]["is_read"] is False and notes[0]["related_symbol"] == "TCS"

    await client.post(f"/api/v1/notifications/{notes[0]['id']}/read", headers=h)
    notes = (await client.get("/api/v1/notifications/", headers=h)).json()
    assert notes[0]["is_read"] is True


async def test_notifications_are_private_per_user(client):
    a, b = await signup(client, "ann"), await signup(client, "bob")
    quote("ITC", 264.0)
    await client.post("/api/v1/trading/order", json=order("ITC", qty=10), headers=a)
    assert len(await_json(await client.get("/api/v1/notifications/", headers=a))) == 1
    assert await_json(await client.get("/api/v1/notifications/", headers=b)) == []


def await_json(resp):
    return resp.json()


# ── race conditions ──────────────────────────────────────────────────────────

async def test_simultaneous_orders_cannot_overdraw_balance(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    # Each order costs ~60% of the 1 crore balance; only one can possibly succeed.
    qty = 6_000
    results = await asyncio.gather(*[
        client.post("/api/v1/trading/order", json=order(qty=qty), headers=h) for _ in range(5)
    ])
    codes = sorted(r.status_code for r in results)
    assert codes.count(201) == 1 and codes.count(400) == 4

    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    assert p["cash"] >= 0
    assert p["positions"][0]["quantity"] == qty


async def test_insufficient_balance_message_uses_rupees(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    r = await client.post("/api/v1/trading/order", json=order(qty=100_000), headers=h)
    assert r.status_code == 400
    assert "₹" in r.json()["detail"] and "$" not in r.json()["detail"]


# ── limit orders ─────────────────────────────────────────────────────────────

async def test_limit_buy_fills_only_when_price_reaches_limit(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    r = await client.post("/api/v1/trading/order", json=order(qty=10, order_type="limit", price=950.0), headers=h)
    assert r.status_code == 201 and r.json()["status"] == "open"

    assert await matcher.match_open_orders() == 0          # 1000 > 950: not yet
    quote("SBIN", 940.0)
    assert await matcher.match_open_orders() == 1          # 940 <= 950: fills

    orders = (await client.get("/api/v1/orders/", headers=h)).json()
    assert orders[0]["status"] == "filled" and orders[0]["avg_fill_price"] == pytest.approx(940.0)
    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    assert p["positions"][0]["quantity"] == 10
    titles = [n["title"] for n in (await client.get("/api/v1/notifications/", headers=h)).json()]
    assert "Limit Order Filled" in titles


async def test_limit_sell_fills_when_price_rises(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    await client.post("/api/v1/trading/order", json=order(qty=10), headers=h)
    await client.post("/api/v1/trading/order", json=order(side="sell", qty=10, order_type="limit", price=1050.0), headers=h)

    quote("SBIN", 1040.0)
    assert await matcher.match_open_orders() == 0
    quote("SBIN", 1060.0)
    assert await matcher.match_open_orders() == 1
    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    assert p["positions"] == []


async def test_limit_order_never_fills_on_simulated_prices(client):
    h = await signup(client)
    await client.post("/api/v1/trading/order", json=order(qty=1, order_type="limit", price=999_999.0), headers=h)
    live._quotes_at = 0.0     # no live data
    assert await matcher.match_open_orders() == 0


async def test_limit_order_cancelled_if_no_longer_affordable(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    # Two limit orders that each need ~60% of the balance: both pass the placement check,
    # but only the first can be funded when the price hits the limit.
    for _ in range(2):
        r = await client.post("/api/v1/trading/order", json=order(qty=6_000, order_type="limit", price=950.0), headers=h)
        assert r.status_code == 201
    quote("SBIN", 900.0)
    await matcher.match_open_orders()
    statuses = sorted(o["status"] for o in (await client.get("/api/v1/orders/", headers=h)).json())
    assert statuses == ["cancelled", "filled"]
    titles = [n["title"] for n in (await client.get("/api/v1/notifications/", headers=h)).json()]
    assert "Order Cancelled" in titles


async def test_cancel_open_limit_order(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    placed = (await client.post("/api/v1/trading/order", json=order(order_type="limit", price=900.0), headers=h)).json()
    r = await client.delete(f"/api/v1/trading/order/{placed['id']}", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    quote("SBIN", 800.0)
    assert await matcher.match_open_orders() == 0


# ── leaderboard ──────────────────────────────────────────────────────────────

async def test_leaderboard_ranks_by_live_portfolio_value(client):
    winner, loser = await signup(client, "win"), await signup(client, "lose")
    quote("SBIN", 1000.0)
    await client.post("/api/v1/trading/order", json=order(qty=1000), headers=winner)
    await client.post("/api/v1/trading/order", json=order(qty=1000), headers=loser)
    # loser sells later at a loss; winner keeps the position as price rises
    quote("SBIN", 900.0)
    await client.post("/api/v1/trading/order", json=order(side="sell", qty=1000), headers=loser)
    quote("SBIN", 1200.0)

    rows = (await client.get("/api/v1/leaderboard/", headers=winner)).json()
    assert [r["username"][:3] for r in rows] == ["win", "los"]
    assert rows[0]["is_current_user"] is True and rows[1]["is_current_user"] is False
    # open position valued at the live price, not just cash
    assert rows[0]["portfolio_value"] > 10_000_000.0 + 190_000
    assert rows[0]["total_return_percent"] > 0 > rows[1]["total_return_percent"]
    assert rows[1]["total_trades"] == 2 and rows[1]["win_rate"] == 0.0
    assert rows[0]["total_trades"] == 1


async def test_leaderboard_win_rate(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    await client.post("/api/v1/trading/order", json=order(qty=100), headers=h)
    quote("SBIN", 1100.0)
    await client.post("/api/v1/trading/order", json=order(side="sell", qty=50), headers=h)   # win
    quote("SBIN", 900.0)
    await client.post("/api/v1/trading/order", json=order(side="sell", qty=50), headers=h)   # loss
    row = (await client.get("/api/v1/leaderboard/", headers=h)).json()[0]
    assert row["win_rate"] == 50.0 and row["total_trades"] == 3


# ── demo account, reset, strategies ──────────────────────────────────────────

async def test_demo_login_returns_a_working_token_for_the_same_account(client):
    first = (await client.post("/api/v1/auth/demo")).json()
    second = (await client.post("/api/v1/auth/demo")).json()
    assert first["user_id"] == second["user_id"] and first["username"] == "demo_trader"
    h = {"Authorization": f"Bearer {first['access_token']}"}
    assert (await client.get("/api/v1/portfolio/", headers=h)).status_code == 200


async def test_demo_account_cannot_be_logged_into_directly(client):
    await client.post("/api/v1/auth/demo")
    r = await client.post("/api/v1/auth/login", json={"email": "demo@fauxtrading.app", "password": "demo"})
    assert r.status_code == 401


async def test_reset_portfolio_restores_balance_and_clears_trades(client):
    h = await signup(client)
    quote("SBIN", 1000.0)
    await client.post("/api/v1/trading/order", json=order(qty=100), headers=h)
    r = await client.post("/api/v1/portfolio/reset", headers=h)
    assert r.json()["virtual_balance"] == pytest.approx(10_000_000.0)
    p = (await client.get("/api/v1/portfolio/", headers=h)).json()
    assert p["positions"] == [] and p["cash"] == pytest.approx(10_000_000.0)
    assert (await client.get("/api/v1/orders/transactions", headers=h)).json() == []


async def test_strategy_create_list_delete(client):
    h = await signup(client)
    rule = {"indicator": "rsi_14", "operator": "less_than", "value": 30, "action": "buy",
            "positionSizeType": "percent_cash", "positionSizeValue": 50}
    r = await client.post("/api/v1/strategies/", json={"name": "RSI dip", "symbol": "SBIN", "rules": [rule]}, headers=h)
    assert r.status_code == 201, r.text
    listed = (await client.get("/api/v1/strategies/", headers=h)).json()
    assert len(listed) == 1 and listed[0]["name"] == "RSI dip"
    assert (await client.delete(f"/api/v1/strategies/{listed[0]['id']}", headers=h)).status_code == 204
    assert (await client.get("/api/v1/strategies/", headers=h)).json() == []


# ── backtest endpoint on (fake) real history ─────────────────────────────────

def fake_history(start, end):
    idx = pd.bdate_range(pd.Timestamp(start), pd.Timestamp(end))
    t = np.arange(len(idx))
    close = 100 + 20 * np.sin(2 * np.pi * t / 60) + t * 0.05
    opens = np.concatenate([[close[0]], close[:-1]])
    return pd.DataFrame({"open": opens, "high": close * 1.01, "low": close * 0.99,
                         "close": close, "volume": np.full(len(idx), 1e6)}, index=idx)


async def test_backtest_endpoint_runs_strategy_on_history(client, monkeypatch):
    async def fake_get_history(symbol, start, end):
        return fake_history(start, end)
    monkeypatch.setattr(live, "get_history_between", fake_get_history)

    h = await signup(client)
    rule = {"indicator": "sma_20", "operator": "crosses_above", "value": "sma_50", "action": "buy",
            "positionSizeType": "percent_cash", "positionSizeValue": 100}
    sell = {**rule, "operator": "crosses_below", "action": "sell"}
    strat = (await client.post("/api/v1/strategies/", json={"name": "x", "symbol": "SBIN", "rules": [rule, sell]}, headers=h)).json()

    r = await client.post("/api/v1/backtesting/", headers=h, json={
        "strategy_id": strat["id"], "symbol": "SBIN", "start_date": "2025-01-01", "end_date": "2025-12-31",
        "starting_capital": 1_000_000, "fee_percent": 0.1, "slippage_percent": 0.05, "benchmark_symbol": "NIFTY",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "completed" and body["results"]["data_source"] == "yahoo_finance"
    assert body["results"]["rules_used"] == "strategy"
    assert body["results"]["portfolio_values"][0]["date"] >= "2025-01-01"
    again = (await client.get(f"/api/v1/backtesting/{body['id']}", headers=h)).json()
    assert again["total_trades"] == body["total_trades"]


async def test_backtest_rejects_bad_requests(client, monkeypatch):
    h = await signup(client)
    base = {"strategy_id": "nope", "symbol": "SBIN", "start_date": "2025-01-01", "end_date": "2025-06-01"}
    assert (await client.post("/api/v1/backtesting/", headers=h, json={**base, "end_date": "2024-01-01"})).status_code == 400
    assert (await client.post("/api/v1/backtesting/", headers=h, json={**base, "symbol": "AAPL"})).status_code == 400
    assert (await client.post("/api/v1/backtesting/", headers=h, json=base)).status_code == 404   # unknown strategy
    monkeypatch.setattr(settings, "LIVE_MARKET_DATA", False)
    assert (await client.post("/api/v1/backtesting/", headers=h, json=base)).status_code == 503


# ── market endpoints ─────────────────────────────────────────────────────────

async def test_market_quotes_endpoint_is_live_when_cache_is_warm(client):
    quote("SBIN", 940.0, 954.0)
    rows = (await client.get("/api/v1/market/quotes")).json()
    by = {r["symbol"]: r for r in rows}
    assert by["SBIN"]["is_live"] is True and by["SBIN"]["change_percent"] == pytest.approx(-1.47, abs=0.01)
    assert "TCS" not in by                        # no live quote cached: left out, never faked
    assert (await client.get("/api/v1/market/indices")).json() == []   # no live index data either
    assert (await client.get("/api/v1/market/status")).json()["exchange"] == "NSE"


async def test_deleting_a_strategy_also_removes_its_backtests(client, monkeypatch):
    """Regression: a strategy that had been backtested used to fail to delete (500)."""
    async def fake_get_history(symbol, start, end):
        return fake_history(start, end)
    monkeypatch.setattr(live, "get_history_between", fake_get_history)

    h = await signup(client)
    rule = {"indicator": "sma_20", "operator": "crosses_above", "value": "sma_50", "action": "buy",
            "positionSizeType": "percent_cash", "positionSizeValue": 100}
    strat = (await client.post("/api/v1/strategies/", json={"name": "x", "symbol": "SBIN", "rules": [rule]}, headers=h)).json()
    bt = await client.post("/api/v1/backtesting/", headers=h, json={
        "strategy_id": strat["id"], "symbol": "SBIN", "start_date": "2025-01-01", "end_date": "2025-12-31",
        "starting_capital": 1_000_000, "fee_percent": 0.1, "slippage_percent": 0.05, "benchmark_symbol": "NIFTY",
    })
    assert bt.status_code == 201

    assert (await client.delete(f"/api/v1/strategies/{strat['id']}", headers=h)).status_code == 204
    assert (await client.get("/api/v1/strategies/", headers=h)).json() == []
    assert (await client.get(f"/api/v1/backtesting/{bt.json()['id']}", headers=h)).status_code == 404


async def test_order_is_refused_without_a_live_price(client, monkeypatch):
    """With live data on and no quote cached, trading must not fall back to an invented price."""
    monkeypatch.setattr(live, "_fetch_one_blocking", lambda symbol: None)   # simulate Yahoo being down
    token = (await client.post("/api/v1/auth/demo")).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    r = await client.post("/api/v1/trading/order", headers=h,
                          json={"symbol": "TCS", "side": "buy", "order_type": "market", "quantity": 1})
    assert r.status_code == 503 and "unavailable" in r.json()["detail"]
    r = await client.post("/api/v1/trading/order", headers=h,
                          json={"symbol": "NOPE", "side": "buy", "order_type": "market", "quantity": 1})
    assert r.status_code == 404


async def test_risk_endpoint(client):
    r = await client.get("/api/v1/market/risk/TCS")
    assert r.status_code == 200 and r.json()["available"] is False   # no history cached
    assert (await client.get("/api/v1/market/risk/NOPE")).status_code == 404
    assert len((await client.get("/api/v1/market/risk")).json()) == len(live.STOCK_TICKERS) >= 50


async def test_assets_lists_nifty_50_with_ai_flag(client):
    rows = (await client.get("/api/v1/market/assets")).json()
    by = {r["symbol"]: r for r in rows}
    assert len(rows) >= 50 and by["TCS"]["ai_supported"] is True and by["WIPRO"]["ai_supported"] is False
    assert all(r["sector"] for r in rows)


async def test_market_order_uses_a_fresh_price(client, monkeypatch):
    """A cached quote older than 15s is replaced by a just-fetched price before a market order fills."""
    import time as _t
    live._quotes["WIPRO"] = {"price": 100.0, "previous_close": 100.0, "date": "2026-10-07", "fetched_at": _t.time() - 60}
    live._quotes_at = _t.time()
    monkeypatch.setattr(live, "_fetch_one_blocking", lambda s: {"price": 111.0, "previous_close": 100.0, "date": "2026-10-07", "fetched_at": _t.time()})
    token = (await client.post("/api/v1/auth/demo")).json()["access_token"]
    r = await client.post("/api/v1/trading/order", headers={"Authorization": f"Bearer {token}"},
                          json={"symbol": "WIPRO", "side": "buy", "order_type": "market", "quantity": 1})
    assert r.status_code == 201 and r.json()["avg_fill_price"] == pytest.approx(111.0)


async def test_change_password_flow(client):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "pw@example.com", "username": "pwuser", "display_name": "PW", "password": "oldpassword1"})
    assert reg.status_code == 201
    h = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    bad = await client.post("/api/v1/auth/change-password", headers=h,
                            json={"current_password": "wrong", "new_password": "newpassword1"})
    assert bad.status_code == 400
    short = await client.post("/api/v1/auth/change-password", headers=h,
                              json={"current_password": "oldpassword1", "new_password": "short"})
    assert short.status_code == 422
    ok = await client.post("/api/v1/auth/change-password", headers=h,
                           json={"current_password": "oldpassword1", "new_password": "newpassword1"})
    assert ok.status_code == 200
    assert (await client.post("/api/v1/auth/login", json={"email": "pw@example.com", "password": "newpassword1"})).status_code == 200
    assert (await client.post("/api/v1/auth/login", json={"email": "pw@example.com", "password": "oldpassword1"})).status_code == 401
