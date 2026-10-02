from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.modules.ai.service import ai_service
from app.modules.market_data.router import MOCK_BASE_PRICES

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
    price = MOCK_BASE_PRICES.get(symbol)
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
            "market_value": p.quantity * MOCK_BASE_PRICES.get(p.symbol, p.avg_cost),
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
):
    response = await ai_service.chat(
        message=payload.message,
        history=payload.history,
        context=payload.context,
    )
    return ChatResponse(
        content=response.content,
        context_used=response.context_used,
        is_mock=response.is_mock,
    )


# ── News Analysis ─────────────────────────────────────────────────────────────

import random
from datetime import datetime, timezone, timedelta


# Static sentiment-seeded news data for the 10 supported Indian stocks.
# Scores are deterministic per-symbol so the page is consistent between reloads.
_NEWS_CORPUS: dict[str, dict] = {
    "SBIN": {
        "company": "State Bank of India",
        "overall_sentiment": "positive",
        "sentiment_score": 0.42,
        "analyst_summary": (
            "SBI continues to show strong asset-quality improvement with NPA ratios at multi-year lows. "
            "Analysts are broadly bullish on the stock ahead of Q2 results, citing robust retail loan growth "
            "and digital banking adoption. Government stake and PSU tailwinds remain key positives."
        ),
        "headlines": [
            ("SBI Q2 net profit expected to rise 18% YoY on lower provisions", "positive", 0.72, "Economic Times"),
            ("RBI keeps repo rate unchanged; banking stocks rally", "positive", 0.58, "Mint"),
            ("SBI launches new digital SME lending platform", "positive", 0.49, "Business Standard"),
            ("PSU bank valuations still attractive vs private peers: Analysts", "positive", 0.41, "NDTV Profit"),
            ("Gross NPA ratio improves to 2.21%; best in decade for SBI", "positive", 0.65, "Reuters"),
            ("Rising deposit costs could squeeze margins in H2 FY27", "negative", -0.38, "Bloomberg Quint"),
            ("SBI credit card business faces competition from fintechs", "negative", -0.29, "The Hindu BL"),
        ],
    },
    "RELIANCE": {
        "company": "Reliance Industries",
        "overall_sentiment": "neutral",
        "sentiment_score": 0.08,
        "analyst_summary": (
            "Reliance Industries remains a mixed picture heading into Q2. Jio's subscriber growth and ARPU "
            "expansion are positives, but the O2C (oil-to-chemicals) segment faces margin pressure from "
            "softening refining spreads. The Retail segment's GTV growth is strong but high capex concerns persist."
        ),
        "headlines": [
            ("Jio adds 8.3 million subscribers in September; ARPU rises to ₹195", "positive", 0.61, "Mint"),
            ("Reliance Retail crosses ₹3 lakh crore GTV milestone", "positive", 0.55, "Economic Times"),
            ("RIL's new energy business targets 100 GW by 2030", "positive", 0.43, "Business Standard"),
            ("Refining margins at 18-month low; GRM under pressure for RIL", "negative", -0.52, "Bloomberg"),
            ("RIL's debt rises to ₹3.35 lakh crore in Q1; capex cycle peaks", "negative", -0.44, "NDTV Profit"),
            ("Reliance Jio IPO timeline remains uncertain: Analysts", "neutral", -0.12, "Reuters"),
            ("RIL board approves ₹35,000 crore buyback programme", "positive", 0.48, "Livemint"),
        ],
    },
    "HDFCBANK": {
        "company": "HDFC Bank",
        "overall_sentiment": "positive",
        "sentiment_score": 0.35,
        "analyst_summary": (
            "HDFC Bank's post-merger integration with HDFC Ltd is progressing well. Loan-to-deposit ratios "
            "are normalising and the bank's margin trajectory is stabilising. Analysts broadly maintain 'Buy' "
            "ratings with a 12-month target price range of ₹1,900–₹2,050."
        ),
        "headlines": [
            ("HDFC Bank LDR improves to 87%; merger synergies on track", "positive", 0.64, "Economic Times"),
            ("Strong retail loan growth offsets NIM compression at HDFC Bank", "positive", 0.51, "Mint"),
            ("HDFC Bank named best private bank in India by Global Finance", "positive", 0.38, "Business Standard"),
            ("NIM at 3.46%; analysts expect gradual recovery in H2", "neutral", 0.12, "NDTV Profit"),
            ("HDFC Bank increases fixed deposit rates by 25 bps", "positive", 0.33, "Economic Times"),
            ("Slippages tick up in unsecured loan portfolio", "negative", -0.41, "Bloomberg Quint"),
        ],
    },
    "ABCAPITAL": {
        "company": "Aditya Birla Capital",
        "overall_sentiment": "positive",
        "sentiment_score": 0.51,
        "analyst_summary": (
            "Aditya Birla Capital is one of the top picks in the NBFC space. The company's diversified "
            "financial services model — spanning NBFC lending, insurance, and AMC — gives it multiple "
            "growth levers. Strong Q2 guidance and rising AUM momentum are key bullish catalysts."
        ),
        "headlines": [
            ("Aditya Birla Capital AUM crosses ₹1 lakh crore mark", "positive", 0.78, "Mint"),
            ("ABCL insurance business reports 31% premium growth in H1", "positive", 0.66, "Economic Times"),
            ("NBFC sector tailwinds to benefit Aditya Birla Finance: Analysts", "positive", 0.59, "Business Standard"),
            ("RBI tightens NBFC lending norms; sector watches impact", "negative", -0.35, "Reuters"),
            ("Aditya Birla Capital announces ₹2,000 crore rights issue", "neutral", 0.14, "NDTV Profit"),
            ("Digital lending platform Udyog Plus sees 2x user growth", "positive", 0.61, "Livemint"),
        ],
    },
    "ICICIBANK": {
        "company": "ICICI Bank",
        "overall_sentiment": "positive",
        "sentiment_score": 0.46,
        "analyst_summary": (
            "ICICI Bank remains a favourite among FII investors and top private banks. Its technology-first "
            "approach, low credit costs, and robust ROE profile make it a quality compounder. "
            "Q2 numbers are expected to be strong with continued momentum in retail and SME segments."
        ),
        "headlines": [
            ("ICICI Bank ROE touches 18.4%; among highest in sector", "positive", 0.71, "Economic Times"),
            ("iMobile app surpasses 30 million active users", "positive", 0.57, "Mint"),
            ("ICICI Bank raises ₹5,000 crore via infrastructure bonds at 7.18%", "positive", 0.39, "Business Standard"),
            ("Credit costs stable at 0.42% despite rising unsecured delinquencies", "neutral", 0.18, "Bloomberg Quint"),
            ("ICICI Lombard claims ratio rises in motor segment", "negative", -0.32, "NDTV Profit"),
            ("ICICI Bank named among top 10 global innovative banks by Forbes", "positive", 0.54, "Reuters"),
        ],
    },
    "INFY": {
        "company": "Infosys Ltd.",
        "overall_sentiment": "negative",
        "sentiment_score": -0.28,
        "analyst_summary": (
            "Infosys faces near-term headwinds as discretionary IT spending softens in key markets like BFSI "
            "and retail verticals in the US and Europe. The company narrowed its FY27 revenue guidance, "
            "disappointing some analysts. Long-term AI-driven deal pipeline remains a bright spot."
        ),
        "headlines": [
            ("Infosys narrows FY27 revenue guidance to 4.5–5%; misses street estimates", "negative", -0.61, "Economic Times"),
            ("Furloughs and project delays weigh on Infosys Q2 performance", "negative", -0.53, "Mint"),
            ("Infosys wins $1.5 billion AI transformation deal from US retailer", "positive", 0.68, "Business Standard"),
            ("BFSI vertical revenue down 3.2% QoQ; recovery uncertain", "negative", -0.47, "Bloomberg"),
            ("Infosys headcount falls by 4,200 in first half of FY27", "negative", -0.42, "Reuters"),
            ("CEO Salil Parekh signals stronger H2 on GenAI deal closures", "positive", 0.38, "Livemint"),
        ],
    },
    "TCS": {
        "company": "Tata Consultancy Services",
        "overall_sentiment": "negative",
        "sentiment_score": -0.21,
        "analyst_summary": (
            "TCS growth momentum has slowed with attrition normalising but revenue trajectory softening. "
            "The BFSI and telecom verticals remain under pressure. The stock's premium valuation leaves "
            "little room for disappointments, and near-term catalysts are limited."
        ),
        "headlines": [
            ("TCS Q2 revenue misses estimates; BFSI vertical grows just 1.8% YoY", "negative", -0.58, "Economic Times"),
            ("TCS adds 6,000 employees in Q2; headcount decline reverses", "positive", 0.44, "Mint"),
            ("GenAI pipeline at TCS crosses $2 billion; large deals a positive", "positive", 0.62, "Business Standard"),
            ("Europe revenues contract 2.1% for TCS amid macro uncertainty", "negative", -0.51, "Bloomberg Quint"),
            ("TCS dividend yield of 1.8% attractive for long-term investors", "neutral", 0.15, "NDTV Profit"),
            ("TCS valuation premium narrows vs Infosys; still expensive: Analysts", "negative", -0.33, "Reuters"),
        ],
    },
    "ITC": {
        "company": "ITC Ltd.",
        "overall_sentiment": "neutral",
        "sentiment_score": -0.09,
        "analyst_summary": (
            "ITC continues its transformation story with Hotels demerger and FMCG business ramping up. "
            "However, cigarette volume growth has plateaued and ITC Hotels' listing dilutes the conglomerate "
            "discount thesis. The stock has underperformed peers over the past 12 months."
        ),
        "headlines": [
            ("ITC Hotels demerger approved by NCLT; listing expected by Dec 2026", "positive", 0.52, "Economic Times"),
            ("ITC FMCG segment crosses ₹20,000 crore annualised revenue", "positive", 0.47, "Mint"),
            ("Cigarette volumes flat for ITC in Q2; rural demand sluggish", "negative", -0.41, "Business Standard"),
            ("ITC agribusiness benefits from kharif season; exports rise 18%", "positive", 0.38, "Economic Times"),
            ("GST council mulls raising cigarette cess; regulatory risk for ITC", "negative", -0.55, "Bloomberg Quint"),
            ("ITC Hotels IPO priced at ₹170; analysts mixed on valuation", "neutral", -0.08, "NDTV Profit"),
        ],
    },
    "LT": {
        "company": "Larsen & Toubro",
        "overall_sentiment": "positive",
        "sentiment_score": 0.58,
        "analyst_summary": (
            "L&T is a clear beneficiary of India's infrastructure spending supercycle. Order inflows remain "
            "strong across metros, roads, defence, and green energy. The technology segment (LTIMindtree + "
            "L&T Tech) adds a high-margin layer. FY27–28 earnings visibility is strong."
        ),
        "headlines": [
            ("L&T wins ₹18,000 crore NHAI road projects in Maharashtra & UP", "positive", 0.79, "Economic Times"),
            ("L&T Defence secures ₹12,000 crore submarine contract from MoD", "positive", 0.74, "Business Standard"),
            ("LTIMindtree deal wins accelerate; margin guidance raised to 15–16%", "positive", 0.63, "Mint"),
            ("L&T order book at all-time high of ₹5.6 lakh crore", "positive", 0.71, "NDTV Profit"),
            ("Rising steel and cement costs squeeze margins at L&T's EPC unit", "negative", -0.34, "Bloomberg Quint"),
            ("L&T's Saudi Arabia project faces 6-month delay due to sand storms", "negative", -0.29, "Reuters"),
            ("L&T Technology wins 5G RAN contract from European telecom major", "positive", 0.55, "Livemint"),
        ],
    },
    "BHARTIARTL": {
        "company": "Bharti Airtel",
        "overall_sentiment": "positive",
        "sentiment_score": 0.53,
        "analyst_summary": (
            "Bharti Airtel is seeing strong ARPU expansion post-tariff hike and its Africa operations "
            "continue to deliver. The company's 5G rollout is progressing ahead of schedule and enterprise "
            "business (B2B) is scaling rapidly. Most analysts have a Buy rating with targets above ₹2,000."
        ),
        "headlines": [
            ("Airtel ARPU rises to ₹233 after July tariff hike; beats estimates", "positive", 0.77, "Economic Times"),
            ("Airtel Africa subscriber base crosses 150 million; ARPU up 8%", "positive", 0.65, "Mint"),
            ("Airtel 5G reaches 650 cities; overtakes Jio in premium subscribers", "positive", 0.69, "Business Standard"),
            ("Airtel Business wins ₹2,500 crore SD-WAN contract from BPCL", "positive", 0.58, "NDTV Profit"),
            ("Jio-Airtel spectrum war intensifies in 26 GHz mmWave band", "negative", -0.31, "Bloomberg Quint"),
            ("Airtel DTH market share declines as OTT streaming accelerates", "negative", -0.28, "Reuters"),
        ],
    },
}


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


class MarketSentimentOut(BaseModel):
    overall: str
    score: float
    bullish_count: int
    bearish_count: int
    neutral_count: int
    top_movers: list[dict]
    last_updated: str


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


@router.get("/news-analysis/market/sentiment", response_model=MarketSentimentOut)
async def market_sentiment(
    current_user: User = Depends(get_current_user),
):
    """Aggregate sentiment across all 10 supported stocks."""
    scores = [d["sentiment_score"] for d in _NEWS_CORPUS.values()]
    avg = sum(scores) / len(scores)

    bullish = sum(1 for d in _NEWS_CORPUS.values() if d["overall_sentiment"] == "positive")
    bearish = sum(1 for d in _NEWS_CORPUS.values() if d["overall_sentiment"] == "negative")
    neutral = sum(1 for d in _NEWS_CORPUS.values() if d["overall_sentiment"] == "neutral")

    overall = "bullish" if avg > 0.15 else "bearish" if avg < -0.10 else "neutral"

    top_movers = sorted(
        [
            {"symbol": sym, "company": d["company"], "sentiment": d["overall_sentiment"], "score": d["sentiment_score"]}
            for sym, d in _NEWS_CORPUS.items()
        ],
        key=lambda x: abs(x["score"]),
        reverse=True,
    )[:5]

    return MarketSentimentOut(
        overall=overall,
        score=round(avg, 3),
        bullish_count=bullish,
        bearish_count=bearish,
        neutral_count=neutral,
        top_movers=top_movers,
        last_updated=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/news-analysis/{symbol}", response_model=NewsAnalysisOut)
async def news_analysis(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """Return sentiment-tagged news for a single supported stock."""
    symbol = symbol.upper()
    data = _NEWS_CORPUS.get(symbol)
    if not data:
        raise HTTPException(status_code=404, detail=f"No news data for symbol {symbol}")

    headlines = data["headlines"]
    news_items = _build_news_items(symbol, headlines)
    bullish = sum(1 for _, s, _, _ in headlines if s == "positive")
    bearish = sum(1 for _, s, _, _ in headlines if s == "negative")
    neutral = sum(1 for _, s, _, _ in headlines if s == "neutral")

    return NewsAnalysisOut(
        symbol=symbol,
        company=data["company"],
        overall_sentiment=data["overall_sentiment"],
        sentiment_score=round(data["sentiment_score"], 3),
        bullish_signals=bullish,
        bearish_signals=bearish,
        neutral_signals=neutral,
        news_items=news_items,
        analyst_summary=data["analyst_summary"],
        last_updated=datetime.now(timezone.utc).isoformat(),
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
    is_live: bool  # True = from GNews, False = curated fallback


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
                 "bullish", "buy", "outperform", "robust", "improvement"]
    neg_words = ["loss", "fall", "drop", "decline", "miss", "weak", "cut", "pressure",
                 "risk", "concern", "warning", "debt", "struggle", "bearish", "sell",
                 "underperform", "disappoint", "slowdown", "delay"]
    pos = sum(1 for w in pos_words if w in text_lower)
    neg = sum(1 for w in neg_words if w in text_lower)
    if pos > neg:
        score = min(0.3 + (pos - neg) * 0.1, 0.9)
        return "positive", round(score, 2)
    if neg > pos:
        score = max(-0.3 - (neg - pos) * 0.1, -0.9)
        return "negative", round(score, 2)
    return "neutral", 0.0


def _corpus_to_live_articles(symbol: str) -> list[LiveArticle]:
    """Convert curated _NEWS_CORPUS headlines to LiveArticle format."""
    data = _NEWS_CORPUS.get(symbol)
    if not data:
        return []
    default_img = _DEFAULT_IMAGES.get(symbol, _DEFAULT_IMAGES["MARKET"])
    intervals = [0.5, 1.5, 3, 5, 8, 12, 18, 24]
    articles = []
    for i, (headline, sentiment, score, source) in enumerate(data["headlines"]):
        pub = datetime.now(timezone.utc) - timedelta(hours=intervals[i % len(intervals)])
        articles.append(LiveArticle(
            id=f"cur_{symbol}_{i}",
            title=headline,
            description=headline,
            content=data["analyst_summary"],
            url="#",
            image=default_img,
            source_name=source,
            source_url="#",
            published_at=pub.isoformat(),
            symbol=symbol,
            sentiment=sentiment,
            sentiment_score=round(score, 2),
        ))
    return articles


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
    company = _NEWS_CORPUS.get(symbol, {}).get("company", symbol)
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

    # Curated fallback
    articles = _corpus_to_live_articles(symbol)
    return LiveNewsResponse(
        symbol=symbol, company=company,
        articles=articles, total=len(articles),
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

    # Curated fallback: pick 1-2 articles from each stock
    all_articles: list[LiveArticle] = []
    for sym in list(_NEWS_CORPUS.keys())[:8]:
        arts = _corpus_to_live_articles(sym)
        all_articles.extend(arts[:2])

    # Sort by published_at desc
    all_articles.sort(key=lambda a: a.published_at, reverse=True)
    return MarketNewsResponse(
        articles=all_articles[:20], total=len(all_articles[:20]),
        last_updated=now_iso, is_live=False,
    )


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
    price  = MOCK_BASE_PRICES.get(symbol)
    if not price:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

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

    symbols = list(MOCK_BASE_PRICES.keys())
    supported = {"SBIN","RELIANCE","HDFCBANK","ABCAPITAL","ICICIBANK","INFY","TCS","ITC","LT","BHARTIARTL"}
    results = []

    for sym in supported:
        price = MOCK_BASE_PRICES.get(sym, 0)
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
