from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.modules.ai.service import ai_service
from app.modules.market_data.live import get_price, STOCK_TICKERS, STOCK_NAMES, AI_SYMBOLS

router = APIRouter()


class PredictionOut(BaseModel):
    symbol: str
    current_price: float
    predicted_price_short: float
    predicted_price_medium: float
    direction: str
    confidence: str
    confidence_score: float
    status: str
    explanation: str
    key_factors: list[str]
    risk_factors: list[str]
    generated_at: str
    is_mock: bool


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    context: dict = {}


class ChatResponse(BaseModel):
    content: str
    context_used: list[str]
    is_mock: bool


@router.get("/predict/{symbol}", response_model=PredictionOut)
async def predict(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    symbol = symbol.upper()
    price = get_price(symbol)
    if not price:
        raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")

    result = await ai_service.get_prediction(symbol=symbol, current_price=price)
    return result.__dict__


@router.get("/portfolio-insight")
async def portfolio_insight(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch portfolio to build context
    from sqlalchemy import select
    from app.models.position import Position

    result = await db.execute(
        select(Position).where(Position.user_id == current_user.id)
    )
    positions = result.scalars().all()
    positions_data = [
        {
            "symbol": p.symbol,
            "quantity": p.quantity,
            "avg_cost": p.avg_cost,
            "market_value": p.quantity * get_price(p.symbol, p.avg_cost),
            "weight": 0,
        }
        for p in positions
    ]
    insight = await ai_service.get_portfolio_insight(
        positions=positions_data,
        cash=current_user.virtual_balance,
    )
    return insight.__dict__


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Stock / portfolio / market questions are answered from live data
    from app.modules.ai.coach import coach_reply

    grounded = await coach_reply(payload.message, current_user, db)
    if grounded is not None:
        content, used = grounded
        return ChatResponse(content=content, context_used=used, is_mock=False)

    # General concept questions fall back to the educational answers
    response = await ai_service.chat(
        message=payload.message,
        history=payload.history,
        context=payload.context,
    )
    # These answers are static lessons, not data-driven: label them as such
    import re as _re
    content = _re.sub(
        r"\n*_\[Mock AI Coach response[^\]]*\]_\s*$",
        "\n\n_General education. For live data, ask about a specific stock, your portfolio, or the market._",
        response.content,
    )
    return ChatResponse(
        content=content,
        context_used=response.context_used,
        is_mock=response.is_mock,
    )


# ── News Analysis ─────────────────────────────────────────────────────────────

import random
from datetime import datetime, timezone, timedelta


class NewsItem(BaseModel):
    id: str
    headline: str
    summary: str
    source: str
    sentiment: str
    sentiment_score: float
    symbols_mentioned: list[str]
    category: str
    published_at: str


class NewsAnalysisOut(BaseModel):
    symbol: str
    company: str
    overall_sentiment: str
    sentiment_score: float
    bullish_signals: int
    bearish_signals: int
    neutral_signals: int
    news_items: list[NewsItem]
    analyst_summary: str
    last_updated: str
    is_live: bool = False


class MarketSentimentOut(BaseModel):
    overall: str
    score: float
    bullish_count: int
    bearish_count: int
    neutral_count: int
    top_movers: list[dict]
    last_updated: str
    is_live: bool = False


def _ago(hours: float) -> str:
    dt = datetime.now(timezone.utc) - timedelta(hours=hours)
    return dt.isoformat()


def _build_news_items(symbol: str, headlines: list) -> list[NewsItem]:
    items = []
    intervals = [0.5, 1.5, 3, 6, 9, 14, 22]
    for i, (headline, sentiment, score, source) in enumerate(headlines):
        items.append(NewsItem(
            id=f"news_{symbol}_{i}",
            headline=headline,
            summary=headline,   # concise enough; extend with real NLP later
            source=source,
            sentiment=sentiment,
            sentiment_score=round(score, 3),
            symbols_mentioned=[symbol],
            category="earnings" if "Q" in headline else "macro" if "RBI" in headline or "GST" in headline else "company",
            published_at=_ago(intervals[i % len(intervals)]),
        ))
    return items


_COMPANY_NAMES = dict(STOCK_NAMES)   # whole universe; market-wide sentiment samples the AI stocks only


def _headline_category(title: str) -> str:
    t = title.lower()
    if any(w in t for w in ("q1", "q2", "q3", "q4", "result", "profit", "earnings", "revenue")):
        return "earnings"
    if any(w in t for w in ("rbi", "gst", "budget", "nifty", "sensex", "inflation", "rate")):
        return "macro"
    return "company"


async def _live_headlines(symbol: str, limit: int = 10) -> list[dict]:
    """Real recent headlines for a stock, each scored for sentiment. [] if unavailable."""
    from app.modules.ai.news_feed import fetch_headlines

    query = _SYMBOL_QUERIES.get(symbol, f"{symbol} share price")
    rows = await fetch_headlines(query, limit)
    for row in rows:
        row["sentiment"], row["score"] = _score_sentiment(row["title"])
    return rows


def _overall(avg: float) -> str:
    return "positive" if avg > 0.15 else "negative" if avg < -0.15 else "neutral"


def _summary_from_headlines(company: str, rows: list[dict], avg: float) -> str:
    pos = sum(1 for r in rows if r["sentiment"] == "positive")
    neg = sum(1 for r in rows if r["sentiment"] == "negative")
    latest = rows[0]
    return (
        f"Based on {len(rows)} recent headlines about {company}: {pos} positive, {neg} negative, "
        f"{len(rows) - pos - neg} neutral. Average sentiment {avg:+.2f} ({_overall(avg)}). "
        f"Latest: \u201c{latest['title']}\u201d ({latest['source']}). "
        "Sentiment is scored automatically from headline wording and is not investment advice."
    )


@router.get("/news-analysis/market/sentiment", response_model=MarketSentimentOut)
async def market_sentiment(
    current_user: User = Depends(get_current_user),
):
    """Aggregate sentiment across all 10 supported stocks."""
    import asyncio as _asyncio

    symbols = sorted(AI_SYMBOLS)   # a fixed, cheap sample: 10 feeds, cached for 10 minutes
    fetched = await _asyncio.gather(*[_live_headlines(sym) for sym in symbols])
    per_symbol = {sym: rows for sym, rows in zip(symbols, fetched) if rows}
    if len(per_symbol) >= 5:  # enough coverage to be meaningful
        avgs = {sym: sum(r["score"] for r in rows) / len(rows) for sym, rows in per_symbol.items()}
        mean = sum(avgs.values()) / len(avgs)
        return MarketSentimentOut(
            overall="bullish" if mean > 0.15 else "bearish" if mean < -0.10 else "neutral",
            score=round(mean, 3),
            bullish_count=sum(1 for a in avgs.values() if _overall(a) == "positive"),
            bearish_count=sum(1 for a in avgs.values() if _overall(a) == "negative"),
            neutral_count=sum(1 for a in avgs.values() if _overall(a) == "neutral"),
            top_movers=sorted(
                [{"symbol": sym, "company": _COMPANY_NAMES[sym], "sentiment": _overall(a), "score": round(a, 3)}
                 for sym, a in avgs.items()],
                key=lambda x: abs(x["score"]), reverse=True,
            )[:5],
            last_updated=datetime.now(timezone.utc).isoformat(),
            is_live=True,
        )

    # Too few stocks returned headlines to say anything meaningful: report that, don't invent a mood
    return MarketSentimentOut(
        overall="neutral", score=0.0, bullish_count=0, bearish_count=0, neutral_count=0,
        top_movers=[], last_updated=datetime.now(timezone.utc).isoformat(), is_live=False,
    )


@router.get("/news-analysis/{symbol}", response_model=NewsAnalysisOut)
async def news_analysis(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """Return sentiment-tagged news for a single supported stock."""
    symbol = symbol.upper()
    rows = await _live_headlines(symbol) if symbol in _COMPANY_NAMES else []
    if rows:
        company = _COMPANY_NAMES[symbol]
        avg = sum(r["score"] for r in rows) / len(rows)
        return NewsAnalysisOut(
            symbol=symbol,
            company=company,
            overall_sentiment=_overall(avg),
            sentiment_score=round(avg, 3),
            bullish_signals=sum(1 for r in rows if r["sentiment"] == "positive"),
            bearish_signals=sum(1 for r in rows if r["sentiment"] == "negative"),
            neutral_signals=sum(1 for r in rows if r["sentiment"] == "neutral"),
            news_items=[
                NewsItem(
                    id=f"live_{symbol}_{i}", headline=r["title"], summary=r["title"],
                    source=r["source"], sentiment=r["sentiment"],
                    sentiment_score=round(r["score"], 3), symbols_mentioned=[symbol],
                    category=_headline_category(r["title"]), published_at=r["published_at"],
                )
                for i, r in enumerate(rows)
            ],
            analyst_summary=_summary_from_headlines(company, rows, avg),
            last_updated=datetime.now(timezone.utc).isoformat(),
            is_live=True,
        )

    if symbol not in _COMPANY_NAMES:
        raise HTTPException(status_code=404, detail=f"No news data for symbol {symbol}")
    return NewsAnalysisOut(
        symbol=symbol, company=_COMPANY_NAMES[symbol], overall_sentiment="neutral",
        sentiment_score=0.0, bullish_signals=0, bearish_signals=0, neutral_signals=0,
        news_items=[],
        analyst_summary="Live headlines for this stock could not be fetched right now. No sentiment is shown rather than an invented one.",
        last_updated=datetime.now(timezone.utc).isoformat(), is_live=False,
    )


# ── Live News Feed ─────────────────────────────────────────────────────────────
# Fetches real articles from GNews API (https://gnews.io).
# Falls back to curated headlines if no API key is set.

import httpx as _httpx
from app.core.config import settings as _settings

# Map app symbol → GNews search query
_SYMBOL_QUERIES: dict[str, str] = {
    "SBIN":       "SBI State Bank India stock",
    "RELIANCE":   "Reliance Industries stock NSE",
    "HDFCBANK":   "HDFC Bank stock NSE",
    "ABCAPITAL":  "Aditya Birla Capital stock",
    "ICICIBANK":  "ICICI Bank stock NSE",
    "INFY":       "Infosys stock NSE",
    "TCS":        "TCS Tata Consultancy stock",
    "ITC":        "ITC Ltd stock NSE",
    "LT":         "Larsen Toubro stock NSE",
    "BHARTIARTL": "Bharti Airtel stock NSE",
}

# Default placeholder image per category (Unsplash, free, no key needed)
_DEFAULT_IMAGES: dict[str, str] = {
    "SBIN":       "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400&q=70",
    "RELIANCE":   "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70",
    "HDFCBANK":   "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400&q=70",
    "ABCAPITAL":  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&q=70",
    "ICICIBANK":  "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=400&q=70",
    "INFY":       "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&q=70",
    "TCS":        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=70",
    "ITC":        "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&q=70",
    "LT":         "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=70",
    "BHARTIARTL": "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=400&q=70",
    "MARKET":     "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70",
}


class LiveArticle(BaseModel):
    id: str
    title: str
    description: str
    content: str
    url: str
    image: str
    source_name: str
    source_url: str
    published_at: str
    symbol: str
    sentiment: str
    sentiment_score: float


class LiveNewsResponse(BaseModel):
    symbol: str
    company: str
    articles: list[LiveArticle]
    total: int
    last_updated: str
    is_live: bool  # True = real headlines, False = none available


class MarketNewsResponse(BaseModel):
    articles: list[LiveArticle]
    total: int
    last_updated: str
    is_live: bool


def _score_sentiment(text: str) -> tuple[str, float]:
    """Simple keyword-based sentiment scoring."""
    text_lower = text.lower()
    pos_words = ["profit", "growth", "rise", "surge", "gain", "beat", "strong",
                 "rally", "upgrade", "record", "win", "launch", "expand", "positive",
                 "bullish", "buy", "outperform", "robust", "improvement", "jump",
                 "soar", "climb", "top gainer", "boost", "order win", "dividend"]
    neg_words = ["loss", "fall", "drop", "decline", "miss", "weak", "cut", "pressure",
                 "risk", "concern", "warning", "debt", "struggle", "bearish", "sell",
                 "underperform", "disappoint", "slowdown", "delay", "slump", "plunge",
                 "tank", "crash", "52-week low", "top loser", "probe", "fraud", "penalty"]
    pos = sum(1 for w in pos_words if w in text_lower)
    neg = sum(1 for w in neg_words if w in text_lower)
    if pos > neg:
        score = min(0.3 + (pos - neg) * 0.1, 0.9)
        return "positive", round(score, 2)
    if neg > pos:
        score = max(-0.3 - (neg - pos) * 0.1, -0.9)
        return "negative", round(score, 2)
    return "neutral", 0.0



async def _fetch_gnews(query: str, max_results: int = 8) -> list[dict]:
    """Fetch articles from GNews API."""
    url = "https://gnews.io/api/v4/search"
    params = {
        "q": query,
        "lang": "en",
        "country": "in",
        "max": max_results,
        "apikey": _settings.GNEWS_API_KEY,
    }
    async with _httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json().get("articles", [])


@router.get("/news/{symbol}", response_model=LiveNewsResponse)
async def live_news_for_symbol(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """Live news articles for a single stock, with images."""
    symbol = symbol.upper()
    company = _COMPANY_NAMES.get(symbol, symbol)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Try GNews if key is configured
    if _settings.GNEWS_API_KEY:
        try:
            query = _SYMBOL_QUERIES.get(symbol, f"{symbol} stock India")
            raw = await _fetch_gnews(query, max_results=10)
            articles = []
            for i, a in enumerate(raw):
                sentiment, score = _score_sentiment(
                    (a.get("title") or "") + " " + (a.get("description") or "")
                )
                articles.append(LiveArticle(
                    id=f"gn_{symbol}_{i}",
                    title=a.get("title", ""),
                    description=a.get("description") or a.get("title", ""),
                    content=a.get("content") or a.get("description") or "",
                    url=a.get("url", "#"),
                    image=a.get("image") or _DEFAULT_IMAGES.get(symbol, _DEFAULT_IMAGES["MARKET"]),
                    source_name=a.get("source", {}).get("name", "Unknown"),
                    source_url=a.get("source", {}).get("url", "#"),
                    published_at=a.get("publishedAt", now_iso),
                    symbol=symbol,
                    sentiment=sentiment,
                    sentiment_score=score,
                ))
            return LiveNewsResponse(
                symbol=symbol, company=company,
                articles=articles, total=len(articles),
                last_updated=now_iso, is_live=True,
            )
        except Exception:
            pass  # fall through to curated

    # Keyless live headlines (Google News RSS)
    rows = await _live_headlines(symbol)
    if rows:
        articles = [
            LiveArticle(
                id=f"rss_{symbol}_{i}", title=r["title"], description=r["title"],
                content=r["title"], url=r["url"],
                image=_DEFAULT_IMAGES.get(symbol, _DEFAULT_IMAGES["MARKET"]),
                source_name=r["source"], source_url=r["source_url"],
                published_at=r["published_at"], symbol=symbol,
                sentiment=r["sentiment"], sentiment_score=r["score"],
            )
            for i, r in enumerate(rows)
        ]
        return LiveNewsResponse(
            symbol=symbol, company=company, articles=articles,
            total=len(articles), last_updated=now_iso, is_live=True,
        )

    # No live headlines: say so, never invent articles
    return LiveNewsResponse(
        symbol=symbol, company=company,
        articles=[], total=0,
        last_updated=now_iso, is_live=False,
    )


@router.get("/news/market/top", response_model=MarketNewsResponse)
async def live_market_news(
    current_user: User = Depends(get_current_user),
):
    """Top market news across all 10 stocks, mixed together."""
    now_iso = datetime.now(timezone.utc).isoformat()

    if _settings.GNEWS_API_KEY:
        try:
            raw = await _fetch_gnews("Indian stock market NSE Nifty", max_results=12)
            articles = []
            for i, a in enumerate(raw):
                sentiment, score = _score_sentiment(
                    (a.get("title") or "") + " " + (a.get("description") or "")
                )
                articles.append(LiveArticle(
                    id=f"gn_mkt_{i}",
                    title=a.get("title", ""),
                    description=a.get("description") or a.get("title", ""),
                    content=a.get("content") or a.get("description") or "",
                    url=a.get("url", "#"),
                    image=a.get("image") or _DEFAULT_IMAGES["MARKET"],
                    source_name=a.get("source", {}).get("name", "Unknown"),
                    source_url=a.get("source", {}).get("url", "#"),
                    published_at=a.get("publishedAt", now_iso),
                    symbol="MARKET",
                    sentiment=sentiment,
                    sentiment_score=score,
                ))
            return MarketNewsResponse(articles=articles, total=len(articles),
                                      last_updated=now_iso, is_live=True)
        except Exception:
            pass

    # Keyless live headlines (Google News RSS)
    from app.modules.ai.news_feed import fetch_headlines

    rows = await fetch_headlines("Indian stock market Nifty Sensex", 12)
    if rows:
        articles = []
        for i, r in enumerate(rows):
            sentiment, score = _score_sentiment(r["title"])
            articles.append(LiveArticle(
                id=f"rss_mkt_{i}", title=r["title"], description=r["title"],
                content=r["title"], url=r["url"], image=_DEFAULT_IMAGES["MARKET"],
                source_name=r["source"], source_url=r["source_url"],
                published_at=r["published_at"], symbol="MARKET",
                sentiment=sentiment, sentiment_score=score,
            ))
        return MarketNewsResponse(articles=articles, total=len(articles),
                                  last_updated=now_iso, is_live=True)

    # No live headlines: say so, never invent articles
    return MarketNewsResponse(articles=[], total=0, last_updated=now_iso, is_live=False)


# ── Model 1 — Binary UP/DOWN prediction endpoint ─────────────────────────────

class Model1PredictionOut(BaseModel):
    symbol: str
    company: str
    current_price: float
    predicted_price: float
    p_up: float
    p_down: float
    direction: str          # "UP" | "DOWN" | "NEUTRAL"
    confidence: float       # abs(p_up - p_down)
    accuracy: str           # e.g. "81.22%"
    balanced_accuracy: str
    roc_auc: float
    is_live: bool
    generated_at: str


class Model1AllOut(BaseModel):
    predictions: list[Model1PredictionOut]
    model_info: dict
    generated_at: str


@router.get("/model1/predict/{symbol}", response_model=Model1PredictionOut)
async def model1_predict_symbol(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """
    Model 1 — Global XGBoost binary classifier.
    Returns UP / DOWN / NEUTRAL direction with probabilities for a single stock.
    """
    from app.modules.ai.ml_service import model1_service
    symbol = symbol.upper()
    if symbol not in AI_SYMBOLS:
        raise HTTPException(status_code=404, detail=f"No AI model for {symbol}: the models cover 10 specific stocks")
    price  = get_price(symbol)
    if not price:
        raise HTTPException(status_code=503, detail=f"Live price for {symbol} is unavailable right now")

    result = model1_service.predict(symbol, price)
    return Model1PredictionOut(
        symbol=result.symbol, company=result.company,
        current_price=result.current_price, predicted_price=result.predicted_price,
        p_up=result.p_up, p_down=result.p_down, direction=result.direction,
        confidence=result.confidence, accuracy=result.accuracy,
        balanced_accuracy=result.balanced_accuracy, roc_auc=result.roc_auc,
        is_live=result.is_live, generated_at=result.generated_at,
    )


@router.get("/model1/predict", response_model=Model1AllOut)
async def model1_predict_all(
    current_user: User = Depends(get_current_user),
):
    """
    Model 1 — Run prediction for all 10 supported Indian stocks at once.
    """
    from app.modules.ai.ml_service import model1_service
    from app.modules.ai.ml_service import MODEL1_DIR
    import json as _json

    results = []

    for sym in sorted(AI_SYMBOLS):
        price = get_price(sym)
        if not price:
            continue  # no live price: skip the stock rather than score a made-up one
        r = model1_service.predict(sym, price)
        results.append(Model1PredictionOut(
            symbol=r.symbol, company=r.company,
            current_price=r.current_price, predicted_price=r.predicted_price,
            p_up=r.p_up, p_down=r.p_down, direction=r.direction,
            confidence=r.confidence, accuracy=r.accuracy,
            balanced_accuracy=r.balanced_accuracy, roc_auc=r.roc_auc,
            is_live=r.is_live, generated_at=r.generated_at,
        ))

    # Sort by confidence descending
    results.sort(key=lambda x: x.confidence, reverse=True)

    cfg_path = MODEL1_DIR / "config.json"
    cfg = _json.loads(cfg_path.read_text()) if cfg_path.exists() else {}

    model_info = {
        "model_type":       cfg.get("model_type", "Global XGBoost"),
        "n_features":       cfg.get("number_of_features", 47),
        "train_period":     f"{cfg.get('training_start','')} to {cfg.get('training_end','')}",
        "test_accuracy":    f"{cfg.get('test_accuracy', 0)*100:.1f}%",
        "test_auc":         round(cfg.get("test_auc", 0), 3),
        "prediction_type":  cfg.get("prediction_type", "5-Day Stock Direction"),
        "classes":          ["DOWN", "UP"],
    }

    return Model1AllOut(
        predictions=results,
        model_info=model_info,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
