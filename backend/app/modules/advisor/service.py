"""Faux Virtual Investment Advisor: Portfolio Optimization Engine.

Provides Modern Portfolio Theory (MPT) optimization using historical daily
NSE prices. Generates risk-aware stock allocations, rupee distributions,
whole-share quantities, diversification ratings, sector breakdowns, and
correlation warnings.

Educational simulation output based on historical data. Not financial advice.
"""
from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Any

import numpy as np
import pandas as pd
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- Universe
# 32 NSE large-cap stocks
UNIVERSE: dict[str, dict[str, str]] = {
    "RELIANCE.NS":   {"name": "Reliance Industries", "sector": "Energy"},
    "TCS.NS":        {"name": "TCS",                 "sector": "IT"},
    "INFY.NS":       {"name": "Infosys",             "sector": "IT"},
    "HCLTECH.NS":    {"name": "HCL Technologies",    "sector": "IT"},
    "HDFCBANK.NS":   {"name": "HDFC Bank",           "sector": "Banking"},
    "ICICIBANK.NS":  {"name": "ICICI Bank",          "sector": "Banking"},
    "SBIN.NS":       {"name": "State Bank of India", "sector": "Banking"},
    "KOTAKBANK.NS":  {"name": "Kotak Mahindra Bank", "sector": "Banking"},
    "BHARTIARTL.NS": {"name": "Bharti Airtel",       "sector": "Telecom"},
    "HINDUNILVR.NS": {"name": "Hindustan Unilever",  "sector": "FMCG"},
    "ITC.NS":        {"name": "ITC",                 "sector": "FMCG"},
    "NESTLEIND.NS":  {"name": "Nestle India",        "sector": "FMCG"},
    "LT.NS":         {"name": "Larsen & Toubro",     "sector": "Infrastructure"},
    "MARUTI.NS":     {"name": "Maruti Suzuki",       "sector": "Auto"},
    "SUNPHARMA.NS":  {"name": "Sun Pharma",          "sector": "Pharma"},
    "ADANIENT.NS":   {"name": "Adani Enterprises",   "sector": "Conglomerate"},
    "AXISBANK.NS":   {"name": "Axis Bank",           "sector": "Banking"},
    "BAJFINANCE.NS": {"name": "Bajaj Finance",       "sector": "Financials"},
    "WIPRO.NS":      {"name": "Wipro",               "sector": "IT"},
    "TECHM.NS":      {"name": "Tech Mahindra",       "sector": "IT"},
    "ASIANPAINT.NS": {"name": "Asian Paints",        "sector": "Consumer"},
    "TITAN.NS":      {"name": "Titan",               "sector": "Consumer"},
    "BRITANNIA.NS":  {"name": "Britannia",           "sector": "FMCG"},
    "ULTRACEMCO.NS": {"name": "UltraTech Cement",    "sector": "Materials"},
    "TATASTEEL.NS":  {"name": "Tata Steel",          "sector": "Metals"},
    "POWERGRID.NS":  {"name": "Power Grid",          "sector": "Utilities"},
    "NTPC.NS":       {"name": "NTPC",                "sector": "Utilities"},
    "ONGC.NS":       {"name": "ONGC",                "sector": "Energy"},
    "COALINDIA.NS":  {"name": "Coal India",          "sector": "Energy"},
    "M&M.NS":        {"name": "Mahindra & Mahindra", "sector": "Auto"},
    "CIPLA.NS":      {"name": "Cipla",               "sector": "Pharma"},
    "DRREDDY.NS":    {"name": "Dr. Reddy's",         "sector": "Pharma"},
}

# --------------------------------------------------------------------------- Caching & Fallback
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
CACHE_TTL_SECONDS = 6 * 3600  # 6 hours

BASE_FALLBACK_PRICES = {
    "RELIANCE.NS": 2980.0, "TCS.NS": 4250.0, "INFY.NS": 1840.0, "HCLTECH.NS": 1720.0,
    "HDFCBANK.NS": 1650.0, "ICICIBANK.NS": 1190.0, "SBIN.NS": 812.0, "KOTAKBANK.NS": 1780.0,
    "BHARTIARTL.NS": 1540.0, "HINDUNILVR.NS": 2490.0, "ITC.NS": 495.0, "NESTLEIND.NS": 2280.0,
    "LT.NS": 3620.0, "MARUTI.NS": 12400.0, "SUNPHARMA.NS": 1860.0, "ADANIENT.NS": 3100.0,
    "AXISBANK.NS": 1180.0, "BAJFINANCE.NS": 7320.0, "WIPRO.NS": 540.0, "TECHM.NS": 1590.0,
    "ASIANPAINT.NS": 2890.0, "TITAN.NS": 3450.0, "BRITANNIA.NS": 5200.0, "ULTRACEMCO.NS": 11200.0,
    "TATASTEEL.NS": 158.0, "POWERGRID.NS": 325.0, "NTPC.NS": 390.0, "ONGC.NS": 295.0,
    "COALINDIA.NS": 485.0, "M&M.NS": 2840.0, "CIPLA.NS": 1520.0, "DRREDDY.NS": 6600.0,
}


def _generate_synthetic_prices(tickers: list[str], days: int = 1260) -> pd.DataFrame:
    """Deterministic synthetic price series used as fallback when network/Yahoo Finance is unavailable."""
    dates = pd.bdate_range(end=datetime.now(timezone.utc).date(), periods=days)
    data = {}
    for t in tickers:
        base = BASE_FALLBACK_PRICES.get(t, 1000.0)
        seed = sum(ord(c) for c in t)
        np.random.seed(seed)
        # Volatility between 15% and 32%
        ann_vol = 0.15 + (seed % 17) * 0.01
        daily_vol = ann_vol / np.sqrt(252)
        # Mean annual return between 8% and 18%
        daily_drift = (0.08 + (seed % 11) * 0.01) / 252
        rets = np.random.normal(daily_drift, daily_vol, days)
        # Cumulative price
        px_series = base * np.exp(np.cumsum(rets))
        # Scale so the last price lands near the base
        scale = base / px_series[-1]
        data[t] = np.round(px_series * scale, 2)
    return pd.DataFrame(data, index=dates)


def load_prices(tickers: list[str], years: int = 5) -> pd.DataFrame:
    """Daily adjusted close prices, one column per ticker, cached on disk for 6 hours.
    Falls back gracefully to cached or synthetic data if Yahoo Finance is unreachable.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    hash_key = sum(map(ord, "".join(sorted(tickers))))
    key = CACHE_DIR / f"prices_{years}y_{len(tickers)}_{hash_key}.pkl"

    # Check active cache
    if key.exists() and time.time() - key.stat().st_mtime < CACHE_TTL_SECONDS:
        try:
            return pd.read_pickle(key)
        except Exception as e:
            logger.warning(f"Failed reading cache {key}: {e}")

    # Attempt live download via yfinance
    try:
        import yfinance as yf
        raw = yf.download(tickers, period=f"{years}y", auto_adjust=True, progress=False, threads=True)
        if not raw.empty:
            prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
            prices = prices.dropna(axis=1, thresh=int(len(prices) * 0.8)).ffill().dropna()
            if prices.shape[1] >= 5:
                prices.to_pickle(key)
                return prices
    except Exception as e:
        logger.warning(f"Yahoo Finance download failed or timed out: {e}. Checking backup cache/fallback.")

    # Check stale cache if live download failed
    if key.exists():
        try:
            return pd.read_pickle(key)
        except Exception:
            pass

    # Use offline synthetic price history
    fallback = _generate_synthetic_prices(tickers, days=years * 252)
    try:
        fallback.to_pickle(key)
    except Exception:
        pass
    return fallback


# --------------------------------------------------------------------------- Statistics
TRADING_DAYS = 252
LOW_VOL, MED_VOL = 0.20, 0.28  # annualized volatility cut-offs for Low / Medium / High
RISK_FREE = 0.065             # 6.5% Indian risk-free rate assumption


def risk_label(vol: float) -> str:
    return "Low" if vol < LOW_VOL else "Medium" if vol < MED_VOL else "High"


def compute_stats(prices: pd.DataFrame, shrinkage: float = 0.5):
    """Return (mu, cov, corr). mu = annualized mean log return, shrunk toward the average
    (raw historical means are very noisy).
    """
    rets = np.log(prices / prices.shift(1)).dropna()
    raw_mu = rets.mean() * TRADING_DAYS
    mu = (1 - shrinkage) * raw_mu + shrinkage * raw_mu.mean()
    return mu, rets.cov() * TRADING_DAYS, rets.corr()


# --------------------------------------------------------------------------- Optimizer
@dataclass(frozen=True)
class RiskProfile:
    label: str
    goal: str
    risk_aversion: float        # lambda in: maximize mu.w - (lambda/2) * w'Cov w
    max_weight: float           # cap per stock
    max_sector: float           # cap per sector
    max_stock_vol: float        # stocks above this annualized vol are excluded
    objective: str = "utility"  # "utility" uses return forecasts; "diversification" ignores them


PROFILES: dict[str, RiskProfile] = {
    "conservative": RiskProfile("Conservative", "Protect capital", 40.0, 0.15, 0.30, 0.26),
    "balanced":     RiskProfile("Balanced", "Balance risk and return", 0.0, 0.15, 0.35, float("inf"), "diversification"),
    "aggressive":   RiskProfile("Aggressive", "Maximum return", 2.0, 0.25, 0.45, float("inf")),
}
RISK_PROFILES = list(PROFILES)
MIN_WEIGHT = 0.03  # positions smaller than 3% are dropped and re-optimized
MIN_AMOUNT = 10_000.0  # ₹10,000 minimum
HIGH_CORR = 0.75


def optimize(mu: pd.Series, cov: pd.DataFrame, sectors: pd.Series, profile: RiskProfile) -> pd.Series:
    eligible = [t for t in mu.index if np.sqrt(cov.loc[t, t]) <= profile.max_stock_vol]
    if len(eligible) * profile.max_weight < 1:  # filter left too few names to satisfy the cap
        eligible = list(mu.index)

    while True:
        w = _solve(mu[eligible], cov.loc[eligible, eligible], sectors[eligible], profile)
        small = w[w < MIN_WEIGHT]
        if small.empty or len(eligible) <= max(1, int(np.ceil(1 / profile.max_weight))):
            break
        eligible = [t for t in eligible if t not in small.index]
    w = w.where(w >= 1e-4, 0.0)
    return (w / w.sum()).reindex(mu.index, fill_value=0.0)


def _solve(mu: pd.Series, cov: pd.DataFrame, sectors: pd.Series, p: RiskProfile) -> pd.Series:
    n = len(mu)
    m, c = mu.values, cov.values
    cap = max(p.max_weight, 1.0 / n)

    constraints = [{"type": "eq", "fun": lambda w: w.sum() - 1.0}]
    for sec in sectors.unique():
        idx = np.where(sectors.values == sec)[0]
        if len(idx) < n:  # a single-sector universe cannot be capped
            constraints.append({"type": "ineq", "fun": lambda w, idx=idx: p.max_sector - w[idx].sum()})

    if p.objective == "diversification":
        # maximize (weighted average stock vol) / (portfolio vol): spreads risk across uncorrelated names
        sig = np.sqrt(np.diag(c))
        fun = lambda w: -(sig @ w) / np.sqrt(w @ c @ w + 1e-12)
        jac = None
    else:
        fun = lambda w: -(m @ w) + 0.5 * p.risk_aversion * (w @ c @ w)
        jac = lambda w: -m + p.risk_aversion * (c @ w)

    res = minimize(
        fun,
        x0=np.full(n, 1.0 / n),
        jac=jac,
        bounds=[(0.0, cap)] * n,
        constraints=constraints,
        method="SLSQP",
        options={"maxiter": 500, "ftol": 1e-10},
    )
    w = np.clip(res.x, 0.0, None)
    return pd.Series(w / w.sum(), index=mu.index)


# --------------------------------------------------------------------------- Recommendation Logic
def recommend(amount: float, risk: str, prices: pd.DataFrame | None = None, years: int = 5) -> dict:
    """Build a recommended portfolio. `prices` (daily close, columns = tickers) can be injected
    for tests or offline data feed; otherwise it is loaded/downloaded with 6-hour caching.
    """
    risk = risk.strip().lower()
    if risk not in PROFILES:
        raise ValueError(f"risk must be one of {RISK_PROFILES}")
    if amount < MIN_AMOUNT:
        raise ValueError(f"amount must be at least ₹{int(MIN_AMOUNT):,}")
    profile = PROFILES[risk]

    if prices is None:
        prices = load_prices(list(UNIVERSE), years)
    prices = prices[[t for t in prices.columns if t in UNIVERSE]]

    mu, cov, corr = compute_stats(prices)
    sectors = pd.Series({t: UNIVERSE[t]["sector"] for t in prices.columns})
    weights = optimize(mu, cov, sectors, profile)
    held = weights[weights > 0].sort_values(ascending=False)

    rupees = _round_to_rupees(held, amount)
    last = prices.iloc[-1]
    vol_of = dict(zip(cov.index, np.sqrt(np.diag(cov.values))))

    allocations = []
    for t, w in held.items():
        px = float(last[t])
        allocations.append({
            "ticker": t,
            "symbol": t.replace(".NS", ""),
            "name": UNIVERSE[t]["name"],
            "sector": UNIVERSE[t]["sector"],
            "weight_pct": round(float(w) * 100, 2),
            "amount": int(rupees[t]),
            "last_price": round(px, 2),
            "shares": int(rupees[t] // px),
            "expected_return_pct": round(float(mu[t]) * 100, 2),
            "volatility_pct": round(float(vol_of[t]) * 100, 2),
            "risk_level": risk_label(vol_of[t]),
        })

    w = held.reindex(mu.index, fill_value=0.0).values
    p_ret = float(mu.values @ w)
    p_vol = float(np.sqrt(w @ cov.values @ w))
    eff_n = float(1 / (w ** 2).sum())
    n = len(held)
    held_corr = corr.loc[held.index, held.index].values
    avg_corr = float((held_corr.sum() - n) / (n * (n - 1))) if n > 1 else 1.0
    sector_mix = (held.groupby(sectors[held.index]).sum() * 100).round(2).sort_values(ascending=False)

    return {
        "amount": amount,
        "risk_profile": risk,
        "goal": profile.goal,
        "allocations": allocations,
        "uninvested_cash": round(amount - sum(a["shares"] * a["last_price"] for a in allocations), 2),
        "portfolio": {
            "expected_return_pct": round(p_ret * 100, 2),
            "volatility_pct": round(p_vol * 100, 2),
            "risk_level": risk_label(p_vol),
            "sharpe": round((p_ret - RISK_FREE) / p_vol, 2) if p_vol > 0 else 0.0,
            "effective_holdings": round(eff_n, 1),
            "avg_pairwise_correlation": round(avg_corr, 2),
            "diversification": _diversification_label(eff_n, avg_corr, len(sector_mix)),
            "sector_weights_pct": sector_mix.to_dict(),
        },
        "warnings": _correlation_warnings(held, corr),
        "data": {
            "source": "Yahoo Finance (NSE)",
            "start": str(prices.index[0].date()) if hasattr(prices.index[0], "date") else str(prices.index[0]),
            "end": str(prices.index[-1].date()) if hasattr(prices.index[-1], "date") else str(prices.index[-1]),
            "trading_days": len(prices),
        },
        "disclaimer": "Simulated educational output based on historical data. Not investment advice.",
    }


def _round_to_rupees(weights: pd.Series, amount: float) -> pd.Series:
    """Whole-rupee amounts that sum exactly to `amount` (largest-remainder rounding)."""
    total = int(round(amount))
    raw = weights / weights.sum() * total
    out = raw.astype(int)
    for t in (raw - out).sort_values(ascending=False).index[: total - int(out.sum())]:
        out[t] += 1
    return out


def _correlation_warnings(held: pd.Series, corr: pd.DataFrame) -> list[str]:
    msgs, names = [], list(held.index)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if corr.loc[a, b] >= HIGH_CORR:
                combined = (held[a] + held[b]) * 100
                msgs.append(
                    f"{UNIVERSE[a]['name']} and {UNIVERSE[b]['name']} move closely together "
                    f"(correlation {corr.loc[a, b]:.2f}); together they are {combined:.0f}% of the portfolio."
                )
    return msgs


def _diversification_label(effective_n: float, avg_corr: float, sectors: int) -> str:
    score = (effective_n >= 5) + (avg_corr < 0.5) + (sectors >= 4)
    return ["Poor", "Fair", "Good", "Excellent"][score]
