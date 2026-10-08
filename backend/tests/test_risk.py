"""Risk assessment is driven by real price history, so these tests feed it known series."""

import numpy as np
import pandas as pd
import pytest

from app.modules.market_data import live, risk


def _frame(prices):
    idx = pd.bdate_range(end="2026-10-07", periods=len(prices))
    p = np.asarray(prices, dtype=float)
    return pd.DataFrame({"open": p, "high": p, "low": p, "close": p, "volume": 1_000_000}, index=idx)


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    monkeypatch.setattr(live, "_daily", {})
    monkeypatch.setattr(live, "get_live_quote", lambda s: None)


def test_unavailable_without_data():
    out = risk.assess("TCS")
    assert out["available"] is False and out["level"] == "unknown"


def test_steady_uptrend_is_low_risk():
    live._daily["TCS"] = _frame(np.linspace(100, 108, 260) + np.sin(np.arange(260)) * 0.2)
    out = risk.assess("TCS")
    assert out["available"] and out["level"] == "low"


def test_downtrend_is_flagged_falling():
    live._daily["TCS"] = _frame(np.concatenate([np.linspace(150, 120, 240), np.linspace(120, 95, 20)]))
    out = risk.assess("TCS")
    assert out["level"] in ("medium", "high")
    assert out["kind"] == "falling"
    assert any("average" in r["text"] or "Lost" in r["text"] for r in out["reasons"])


def test_sharp_rally_is_flagged_overheated():
    live._daily["TCS"] = _frame(np.concatenate([np.linspace(100, 102, 240), np.linspace(102, 135, 20)]))
    out = risk.assess("TCS")
    assert out["level"] in ("medium", "high")
    assert out["kind"] == "overheated"
    assert out["stats"]["return_20d_pct"] > 15


def test_live_price_is_used(monkeypatch):
    live._daily["TCS"] = _frame(np.linspace(100, 108, 260))
    monkeypatch.setattr(live, "get_live_quote", lambda s: {"price": 90.0, "previous_close": 108.0})
    out = risk.assess("TCS")
    assert out["stats"]["price"] == 90.0 and out["stats"]["is_live_price"] is True
    assert out["stats"]["day_change_pct"] < -10
