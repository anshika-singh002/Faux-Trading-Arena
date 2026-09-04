"""
XGBoost ML Prediction Service
==============================
Loads predictions from final_predictions.csv (produced by faux_trading_global_xgboost.pkl)
and serves them through the standard AIService interface.

Model details (from your team):
- One global XGBoost model shared across all 10 companies
- Predicts UP / DOWN / NEUTRAL over next 5 trading days
- Outputs: Probability_UP, Probability_DOWN, Direction, Confidence

Supported stocks:
  SBI, Reliance, HDFC Bank, Aditya Birla Capital, ICICI Bank,
  Infosys, TCS, ITC, Larsen & Toubro, Bharti Airtel

Model accuracy (from company_performance.csv):
  Bharti Airtel: 84.29% | TCS: 82.04% | Reliance: 82.45%
  Infosys: 81.63% | L&T: 81.84% | SBI: 81.22%
"""

import logging
import csv
from pathlib import Path
from datetime import datetime, timezone

from app.modules.ai.service import (
    AIService, PredictionResult, InsightResult, CoachResponse, MockAIService
)

logger = logging.getLogger(__name__)

ML_DIR           = Path(__file__).parent.parent.parent.parent / "ml_models"
PREDICTIONS_CSV  = ML_DIR / "final_predictions.csv"
PERFORMANCE_CSV  = ML_DIR / "company_performance.csv"

# ── App symbol → model company name ──────────────────────────────────────────
SYMBOL_TO_COMPANY: dict[str, str] = {
    "SBIN":       "SBI",
    "RELIANCE":   "Reliance",
    "HDFCBANK":   "HDFC Bank",
    "ABCAPITAL":  "Aditya Birla Capital",
    "ICICIBANK":  "ICICI Bank",
    "INFY":       "Infosys",
    "TCS":        "TCS",
    "ITC":        "ITC",
    "LT":         "Larsen & Toubro",
    "BHARTIARTL": "Bharti Airtel",
}

SUPPORTED_SYMBOLS = set(SYMBOL_TO_COMPANY.keys())


def _parse_pct(value: str) -> float:
    """Parse '71.13%' → 0.7113"""
    return float(value.strip().replace("%", "")) / 100


def _confidence_label(score: float) -> str:
    if score >= 0.65: return "high"
    if score >= 0.40: return "medium"
    return "low"


def _load_predictions() -> dict[str, dict]:
    """
    Load final_predictions.csv into a dict keyed by company name.
    Returns {} if file missing.
    """
    result: dict[str, dict] = {}
    if not PREDICTIONS_CSV.exists():
        logger.warning(f"Predictions CSV not found: {PREDICTIONS_CSV}")
        return result
    with open(PREDICTIONS_CSV, newline="") as f:
        for row in csv.DictReader(f):
            company = row["Company"].strip()
            p_up    = _parse_pct(row["Probability_UP"])
            p_down  = _parse_pct(row["Probability_DOWN"])
            # Confidence in CSV = margin between UP and DOWN probabilities
            conf_score = abs(p_up - p_down)
            direction  = row["Direction"].strip().upper()
            result[company] = {
                "probability_up":   p_up,
                "probability_down": p_down,
                "direction":        direction,
                "confidence":       _confidence_label(conf_score),
                "confidence_score": conf_score,
                "horizon":          row.get("Prediction_Horizon", "5 trading days").strip(),
            }
    return result


def _load_performance() -> dict[str, dict]:
    """Load company_performance.csv keyed by company name."""
    result: dict[str, dict] = {}
    if not PERFORMANCE_CSV.exists():
        return result
    with open(PERFORMANCE_CSV, newline="") as f:
        for row in csv.DictReader(f):
            company = row["Company"].strip()
            result[company] = {
                "accuracy":          row["Accuracy"].strip(),
                "balanced_accuracy": row["Balanced_Accuracy"].strip(),
                "roc_auc":           float(row["ROC_AUC"]),
            }
    return result


class XGBoostAIService(AIService):
    """
    Real prediction service backed by your team's XGBoost model.
    Reads pre-computed predictions from final_predictions.csv.
    Falls back to MockAIService for unsupported symbols.
    """

    def __init__(self):
        self._predictions  = _load_predictions()
        self._performance  = _load_performance()
        self._fallback     = MockAIService()
        loaded = len(self._predictions)
        logger.info(f"XGBoostAIService ready — {loaded} predictions loaded")

    async def get_prediction(self, symbol: str, current_price: float) -> PredictionResult:
        now = datetime.now(timezone.utc).isoformat()

        if symbol not in SUPPORTED_SYMBOLS:
            return await self._fallback.get_prediction(symbol, current_price)

        company = SYMBOL_TO_COMPANY[symbol]
        pred    = self._predictions.get(company)
        perf    = self._performance.get(company, {})

        if not pred:
            logger.warning(f"No prediction data for {company}")
            return PredictionResult(
                symbol=symbol, current_price=current_price,
                predicted_price_short=current_price,
                predicted_price_medium=current_price,
                direction="neutral", confidence="low", confidence_score=0.0,
                status="insufficient_data",
                explanation="Prediction data not available for this stock.",
                key_factors=[], risk_factors=[],
                generated_at=now, is_mock=False,
            )

        p_up   = pred["probability_up"]
        p_down = pred["probability_down"]
        direction_raw = pred["direction"]  # "UP" | "DOWN" | "NEUTRAL"

        # Map to frontend direction format
        app_direction = {"UP": "bullish", "DOWN": "bearish", "NEUTRAL": "neutral"}.get(
            direction_raw, "neutral"
        )

        # Estimate target price (simple heuristic from confidence)
        conf = pred["confidence_score"]
        move_pct = 0.04 if conf >= 0.60 else 0.025 if conf >= 0.35 else 0.01
        if app_direction == "bullish":
            short_price  = round(current_price * (1 + move_pct * 0.4), 2)
            medium_price = round(current_price * (1 + move_pct), 2)
        elif app_direction == "bearish":
            short_price  = round(current_price * (1 - move_pct * 0.4), 2)
            medium_price = round(current_price * (1 - move_pct), 2)
        else:
            short_price = medium_price = current_price

        accuracy = perf.get("accuracy", "N/A")
        roc_auc  = perf.get("roc_auc", "N/A")

        explanation = (
            f"XGBoost model predicts {direction_raw} for {company} over the next 5 trading days. "
            f"Probability UP: {p_up:.1%} | Probability DOWN: {p_down:.1%}. "
            f"Model accuracy on {company}: {accuracy} (ROC-AUC: {roc_auc})."
        )

        return PredictionResult(
            symbol=symbol,
            current_price=current_price,
            predicted_price_short=short_price,
            predicted_price_medium=medium_price,
            direction=app_direction,
            confidence=pred["confidence"],
            confidence_score=pred["confidence_score"],
            status="available",
            explanation=explanation,
            key_factors=[
                f"P(UP) = {p_up:.1%}  |  P(DOWN) = {p_down:.1%}",
                f"Model accuracy: {accuracy}",
                f"ROC-AUC: {roc_auc}",
                f"Global XGBoost — technical + market indicators",
                f"Prediction horizon: 5 trading days",
            ],
            risk_factors=[
                "Past performance does not guarantee future results",
                "Model does not account for news or earnings events",
                "Use alongside fundamental and technical analysis",
            ],
            generated_at=now,
            is_mock=False,
        )

    async def get_portfolio_insight(self, positions: list[dict], cash: float) -> InsightResult:
        return await self._fallback.get_portfolio_insight(positions, cash)

    async def chat(self, message: str, history: list[dict], context: dict) -> CoachResponse:
        return await self._fallback.chat(message, history, context)

    async def explain_backtest(self, backtest_results: dict) -> str:
        return await self._fallback.explain_backtest(backtest_results)
