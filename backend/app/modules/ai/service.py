"""
AI Service Layer — Faux Trading
============================================================

Architecture:
    AIService (interface)
        ├── MockAIService       ← used now (development)
        └── MLModelAIService    ← plug in when ML team delivers

To switch to real model:
    1. Set AI_MODE=live in .env
    2. Set AI_MODEL_API_URL and AI_MODEL_API_KEY
    3. Implement MLModelAIService below

The frontend will NOT require changes.
See docs/ML_INTEGRATION.md for the full contract.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
import httpx

from app.core.config import settings


@dataclass
class PredictionResult:
    symbol: str
    current_price: float
    predicted_price_short: float   # 1-day
    predicted_price_medium: float  # 1-week
    direction: str                 # bullish | bearish | neutral
    confidence: str                # low | medium | high
    confidence_score: float        # 0.0–1.0
    status: str                    # available | unavailable | loading | insufficient_data
    explanation: str
    key_factors: list[str]
    risk_factors: list[str]
    generated_at: str
    is_mock: bool


@dataclass
class InsightResult:
    insight_type: str
    title: str
    summary: str
    detail: Optional[str]
    confidence: str
    confidence_score: float
    status: str
    factors: list[str]
    generated_at: str
    is_mock: bool


@dataclass
class CoachResponse:
    content: str
    context_used: list[str]
    is_mock: bool


# ============================================================
# Abstract interface — both services must implement this
# ============================================================
class AIService(ABC):

    @abstractmethod
    async def get_prediction(self, symbol: str, current_price: float) -> PredictionResult:
        """Get price prediction and market outlook for an asset."""
        ...

    @abstractmethod
    async def get_portfolio_insight(self, positions: list[dict], cash: float) -> InsightResult:
        """Analyze portfolio risk and composition."""
        ...

    @abstractmethod
    async def chat(self, message: str, history: list[dict], context: dict) -> CoachResponse:
        """Process a coaching question with conversation history."""
        ...

    @abstractmethod
    async def explain_backtest(self, backtest_results: dict) -> str:
        """Generate plain-language explanation of backtest results."""
        ...


# ============================================================
# MOCK IMPLEMENTATION — used in development
# Clearly identified as mock throughout
# ============================================================
class MockAIService(AIService):
    """
    Mock AI service. Returns plausible-looking but entirely synthetic responses.
    All responses are flagged with is_mock=True.
    Replace with MLModelAIService when the ML team delivers their model.
    """

    async def get_prediction(self, symbol: str, current_price: float) -> PredictionResult:
        # Deterministic mock based on symbol
        seed = sum(ord(c) for c in symbol)
        direction_options = ["bullish", "bearish", "neutral"]
        direction = direction_options[seed % 3]
        score = 0.45 + (seed % 30) / 100

        multiplier = 1.015 if direction == "bullish" else 0.988 if direction == "bearish" else 1.002

        return PredictionResult(
            symbol=symbol,
            current_price=current_price,
            predicted_price_short=round(current_price * multiplier, 2),
            predicted_price_medium=round(current_price * (multiplier ** 2), 2),
            direction=direction,
            confidence="medium",
            confidence_score=round(score, 2),
            status="available",
            explanation=(
                f"[MOCK] Based on simulated analysis of {symbol}, "
                f"the momentum indicators suggest a {direction} short-term outlook. "
                "This is mock data — real ML predictions will replace this."
            ),
            key_factors=[
                "Price above 50-day moving average",
                "RSI in neutral zone (48–55)",
                "Volume slightly above 30-day average",
            ],
            risk_factors=[
                "Macro environment uncertainty",
                "Elevated valuations vs sector",
                "Potential rate sensitivity",
            ],
            generated_at=datetime.now(timezone.utc).isoformat(),
            is_mock=True,
        )

    async def get_portfolio_insight(self, positions: list[dict], cash: float) -> InsightResult:
        total = cash + sum(p.get("market_value", 0) for p in positions)
        largest = max(positions, key=lambda p: p.get("weight", 0), default={})

        return InsightResult(
            insight_type="portfolio_advice",
            title="[MOCK] Portfolio Risk Summary",
            summary=(
                f"Portfolio of {len(positions)} positions with ₹{total:,.0f} total value. "
                f"Largest position: {largest.get('symbol', 'N/A')} at {largest.get('weight', 0):.1f}%. "
                "This is mock data."
            ),
            detail="Real portfolio analysis will use ML-based risk modeling. See docs/ML_INTEGRATION.md.",
            confidence="medium",
            confidence_score=0.65,
            status="available",
            factors=[
                f"{len(positions)} open positions",
                f"Cash: ${cash:,.0f}",
                "Simulated risk score: moderate",
            ],
            generated_at=datetime.now(timezone.utc).isoformat(),
            is_mock=True,
        )

    async def chat(self, message: str, history: list[dict], context: dict) -> CoachResponse:
        lower = message.lower()

        if "rsi" in lower or "relative strength" in lower:
            content = (
                "**RSI (Relative Strength Index)** measures momentum on a 0–100 scale.\n\n"
                "- **Above 70**: Potentially overbought\n"
                "- **Below 30**: Potentially oversold\n\n"
                "The key mistake: treating RSI as a direct buy/sell signal. "
                "A stock can stay 'overbought' for months in a strong trend.\n\n"
                "Better use: look for **divergence** between price and RSI, "
                "or use RSI as context within a broader setup.\n\n"
                "_[Mock AI Coach response — real model coming soon]_"
            )
        elif "moving average" in lower or "sma" in lower or "ema" in lower:
            content = (
                "**Moving averages** smooth out price noise to reveal the underlying trend.\n\n"
                "- **SMA (Simple)**: equal weight to all periods\n"
                "- **EMA (Exponential)**: more weight to recent prices — reacts faster\n\n"
                "**Golden Cross**: 50-day crosses above 200-day → historically bullish signal\n"
                "**Death Cross**: 50-day crosses below 200-day → historically bearish signal\n\n"
                "Try the Strategy Builder to create a moving average crossover strategy, "
                "then backtest it to see how it would have performed.\n\n"
                "_[Mock AI Coach response]_"
            )
        elif "portfolio" in lower or "risk" in lower or "diversif" in lower:
            positions = context.get("positions", [])
            content = (
                f"Looking at your portfolio with {len(positions)} positions:\n\n"
                "**Key risk factors to consider:**\n"
                "- Sector concentration (how much of one sector?)\n"
                "- Correlation between holdings (do they move together?)\n"
                "- Position sizing (is any single position too large?)\n\n"
                "A good rule: no single position over 20–25% of portfolio, "
                "and keep sector concentration under 40%.\n\n"
                "All values in your portfolio are shown in **₹ (Indian Rupees)**.\n\n"
                "_[Mock AI Coach — XGBoost model handles stock predictions, portfolio analysis coming soon]_"
            )
        elif "sharpe" in lower:
            content = (
                "**Sharpe Ratio** = (Return − Risk-Free Rate) / Standard Deviation\n\n"
                "It measures how much return you earn *per unit of risk*.\n\n"
                "- **< 1.0**: Poor — taking too much risk for the return\n"
                "- **1.0–2.0**: Good — solid risk-adjusted performance\n"
                "- **> 2.0**: Excellent\n\n"
                "Important: Sharpe penalizes *all* volatility equally (up and down). "
                "The **Sortino ratio** only penalizes downside volatility — often more useful for traders.\n\n"
                "Check your backtest results for both metrics.\n\n"
                "_[Mock AI Coach response]_"
            )
        else:
            content = (
                f"You asked: *\"{message}\"*\n\n"
                "As your trading coach, I can help with:\n"
                "- Understanding indicators (RSI, MACD, moving averages)\n"
                "- Portfolio risk analysis\n"
                "- Strategy concepts and backtesting\n"
                "- Trading psychology and risk management\n\n"
                "What specifically would you like to explore?\n\n"
                "_[Mock AI Coach — real conversational AI coming soon]_"
            )

        return CoachResponse(
            content=content,
            context_used=["portfolio", "recent_trades"] if context else [],
            is_mock=True,
        )

    async def explain_backtest(self, backtest_results: dict) -> str:
        ret = backtest_results.get("total_return_percent", 0)
        sharpe = backtest_results.get("sharpe_ratio", 0)
        drawdown = backtest_results.get("max_drawdown", 0)
        trades = backtest_results.get("total_trades", 0)

        return (
            f"[MOCK] Your strategy returned **{ret:.1f}%** over the test period "
            f"with a Sharpe ratio of **{sharpe:.2f}**.\n\n"
            f"The maximum drawdown was **{abs(drawdown):.1f}%** — "
            f"{'which is within acceptable range' if abs(drawdown) < 15 else 'which is relatively high'}.\n\n"
            f"Over {trades} trades, the strategy shows "
            f"{'consistent' if sharpe > 1 else 'inconsistent'} risk-adjusted performance.\n\n"
            "_Real explanations will come from the ML interpretation model._"
        )


# ============================================================
# REAL ML MODEL IMPLEMENTATION — fill in when ML team delivers
# ============================================================
class MLModelAIService(AIService):
    """
    Production AI service. Calls the external ML model API.

    Contract (see docs/ML_INTEGRATION.md):
    - POST {AI_MODEL_API_URL}/predict  → PredictionResult
    - POST {AI_MODEL_API_URL}/portfolio-insight → InsightResult
    - POST {AI_MODEL_API_URL}/chat → CoachResponse
    - POST {AI_MODEL_API_URL}/explain-backtest → string
    """

    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.AI_MODEL_API_URL,
            headers={"Authorization": f"Bearer {settings.AI_MODEL_API_KEY}"},
            timeout=30.0,
        )

    async def get_prediction(self, symbol: str, current_price: float) -> PredictionResult:
        try:
            r = await self.client.post("/predict", json={
                "symbol": symbol,
                "current_price": current_price,
            })
            r.raise_for_status()
            data = r.json()
            return PredictionResult(**data, is_mock=False)
        except Exception:
            # Graceful degradation — return unavailable status
            return PredictionResult(
                symbol=symbol, current_price=current_price,
                predicted_price_short=current_price, predicted_price_medium=current_price,
                direction="neutral", confidence="low", confidence_score=0.0,
                status="unavailable",
                explanation="AI insights are temporarily unavailable.",
                key_factors=[], risk_factors=[],
                generated_at=datetime.now(timezone.utc).isoformat(),
                is_mock=False,
            )

    async def get_portfolio_insight(self, positions: list[dict], cash: float) -> InsightResult:
        try:
            r = await self.client.post("/portfolio-insight", json={
                "positions": positions, "cash": cash,
            })
            r.raise_for_status()
            data = r.json()
            return InsightResult(**data, is_mock=False)
        except Exception:
            return InsightResult(
                insight_type="portfolio_advice",
                title="AI analysis unavailable",
                summary="Portfolio AI analysis is temporarily unavailable.",
                detail=None, confidence="low", confidence_score=0.0,
                status="unavailable", factors=[],
                generated_at=datetime.now(timezone.utc).isoformat(),
                is_mock=False,
            )

    async def chat(self, message: str, history: list[dict], context: dict) -> CoachResponse:
        try:
            r = await self.client.post("/chat", json={
                "message": message, "history": history, "context": context,
            })
            r.raise_for_status()
            data = r.json()
            return CoachResponse(content=data["content"], context_used=data.get("context_used", []), is_mock=False)
        except Exception:
            return CoachResponse(
                content="The AI coach is temporarily unavailable. Please try again shortly.",
                context_used=[],
                is_mock=False,
            )

    async def explain_backtest(self, backtest_results: dict) -> str:
        try:
            r = await self.client.post("/explain-backtest", json=backtest_results)
            r.raise_for_status()
            return r.json()["explanation"]
        except Exception:
            return "Backtest explanation is temporarily unavailable."


# ============================================================
# Factory — returns the correct service based on config
# ============================================================
def get_ai_service() -> AIService:
    if settings.AI_MODE == "live" and settings.AI_MODEL_API_URL:
        return MLModelAIService()
    # Try XGBoost local model first
    try:
        from app.modules.ai.ml_service import XGBoostAIService
        svc = XGBoostAIService()
        return svc
    except Exception:
        pass
    return MockAIService()


# Singleton
ai_service = get_ai_service()
