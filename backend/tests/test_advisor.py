"""Tests for Faux Virtual Investment Advisor."""
import pytest
import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.models.user import User
from app.modules.advisor.service import (
    UNIVERSE,
    PROFILES,
    RiskProfile,
    compute_stats,
    optimize,
    recommend,
    _round_to_rupees,
    _correlation_warnings,
    _diversification_label,
    _generate_synthetic_prices,
    risk_label,
)
from app.modules.advisor.router import (
    get_profiles,
    recommend_portfolio,
    RecommendRequest,
)


@pytest.fixture(scope="module")
def mock_prices() -> pd.DataFrame:
    """Deterministic synthetic price history for tests."""
    tickers = list(UNIVERSE.keys())
    return _generate_synthetic_prices(tickers, days=500)


def make_mock_user() -> User:
    u = User()
    u.id = "test-advisor-user"
    u.username = "test_trader"
    u.email = "trader@test.com"
    u.virtual_balance = 10_000_000.0
    u.is_active = True
    return u


def test_invalid_risk_profile_raises(mock_prices):
    with pytest.raises(ValueError, match="risk must be one of"):
        recommend(amount=100_000, risk="ultra_aggressive", prices=mock_prices)


def test_minimum_investment_validation(mock_prices):
    with pytest.raises(ValueError, match="amount must be at least"):
        recommend(amount=5_000, risk="balanced", prices=mock_prices)


def test_weights_sum_to_one(mock_prices):
    for rk in ("conservative", "balanced", "aggressive"):
        rec = recommend(amount=500_000, risk=rk, prices=mock_prices)
        total_weight = sum(a["weight_pct"] for a in rec["allocations"])
        assert total_weight == pytest.approx(100.0, abs=0.5)


def test_non_negative_weights(mock_prices):
    for rk in ("conservative", "balanced", "aggressive"):
        rec = recommend(amount=500_000, risk=rk, prices=mock_prices)
        for alloc in rec["allocations"]:
            assert alloc["weight_pct"] >= 0.0
            assert alloc["amount"] >= 0
            assert alloc["shares"] >= 0


def test_stock_weight_cap_conservative(mock_prices):
    rec = recommend(amount=1_000_000, risk="conservative", prices=mock_prices)
    for a in rec["allocations"]:
        # Conservative max weight is 15% (allow small numerical tolerance for rounding)
        assert a["weight_pct"] <= 15.5


def test_stock_weight_cap_aggressive(mock_prices):
    rec = recommend(amount=1_000_000, risk="aggressive", prices=mock_prices)
    for a in rec["allocations"]:
        # Aggressive max weight is 25%
        assert a["weight_pct"] <= 25.5


def test_sector_allocation_cap(mock_prices):
    rec = recommend(amount=1_000_000, risk="conservative", prices=mock_prices)
    sector_weights = rec["portfolio"]["sector_weights_pct"]
    for sec, w in sector_weights.items():
        # Conservative sector cap is 30%
        assert w <= 30.5


def test_largest_remainder_rupee_allocation():
    weights = pd.Series({"AAPL": 0.505, "GOOG": 0.295, "MSFT": 0.200})
    amount = 100_003.0
    allocated = _round_to_rupees(weights, amount)
    assert allocated.sum() == int(amount)
    assert isinstance(allocated["AAPL"], (int, np.integer))


def test_whole_shares_calculation(mock_prices):
    rec = recommend(amount=250_000, risk="balanced", prices=mock_prices)
    assert rec["uninvested_cash"] >= 0
    total_spent = sum(a["shares"] * a["last_price"] for a in rec["allocations"])
    assert total_spent + rec["uninvested_cash"] == pytest.approx(250_000, abs=1.0)


def test_correlation_warnings():
    held = pd.Series({"RELIANCE.NS": 0.5, "TCS.NS": 0.5})
    # High correlation matrix
    corr = pd.DataFrame(
        [[1.0, 0.85], [0.85, 1.0]],
        index=["RELIANCE.NS", "TCS.NS"],
        columns=["RELIANCE.NS", "TCS.NS"],
    )
    warnings = _correlation_warnings(held, corr)
    assert len(warnings) == 1
    assert "0.85" in warnings[0]


def test_diversification_label():
    assert _diversification_label(effective_n=8.0, avg_corr=0.3, sectors=5) == "Excellent"
    assert _diversification_label(effective_n=2.0, avg_corr=0.8, sectors=1) == "Poor"


def test_risk_label():
    assert risk_label(0.15) == "Low"
    assert risk_label(0.25) == "Medium"
    assert risk_label(0.35) == "High"


@pytest.mark.asyncio
async def test_api_get_profiles():
    user = make_mock_user()
    response = await get_profiles(current_user=user)
    assert len(response.profiles) == 3
    ids = [p.id for p in response.profiles]
    assert "conservative" in ids
    assert "balanced" in ids
    assert "aggressive" in ids


@pytest.mark.asyncio
async def test_api_recommend_success():
    user = make_mock_user()
    req = RecommendRequest(amount=100_000.0, risk="balanced")
    response = await recommend_portfolio(payload=req, current_user=user)
    assert response["amount"] == 100_000.0
    assert response["risk_profile"] == "balanced"
    assert len(response["allocations"]) > 0
    assert "portfolio" in response
    assert response["portfolio"]["risk_level"] in ("Low", "Medium", "High")
    assert "disclaimer" in response


@pytest.mark.asyncio
async def test_api_recommend_invalid_profile():
    user = make_mock_user()
    req = RecommendRequest(amount=100_000.0, risk="invalid_profile")
    with pytest.raises(HTTPException) as exc_info:
        await recommend_portfolio(payload=req, current_user=user)
    assert exc_info.value.status_code == 422
    assert "Invalid risk profile" in exc_info.value.detail
