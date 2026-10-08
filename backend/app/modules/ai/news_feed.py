"""
Live headlines from Google News' public RSS search feed (no API key needed).

Results are cached for a few minutes so the news pages don't hammer the feed.
Callers get an empty list on any failure and fall back to curated content.
"""
import logging
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

logger = logging.getLogger(__name__)

FEED_URL = "https://news.google.com/rss/search"
CACHE_SECONDS = 600
_cache: dict[str, tuple[float, list[dict]]] = {}


def _parse(xml_text: str, limit: int) -> list[dict]:
    items = []
    for node in ET.fromstring(xml_text).findall("./channel/item")[:limit]:
        title = (node.findtext("title") or "").strip()
        source_node = node.find("source")
        source = (source_node.text or "").strip() if source_node is not None else ""
        # Google appends " - Publisher" to titles
        if source and title.endswith(f" - {source}"):
            title = title[: -len(source) - 3].rstrip()
        try:
            published = parsedate_to_datetime(node.findtext("pubDate") or "").astimezone(timezone.utc)
        except (TypeError, ValueError):
            published = datetime.now(timezone.utc)
        items.append({
            "title": title,
            "source": source or "Google News",
            "source_url": source_node.get("url", "#") if source_node is not None else "#",
            "url": (node.findtext("link") or "#").strip(),
            "published_at": published.isoformat(),
        })
    return items


async def fetch_headlines(query: str, limit: int = 10) -> list[dict]:
    """Newest headlines for a search query, or [] if the feed is unreachable."""
    cached = _cache.get(query)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1][:limit]
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            r = await client.get(
                FEED_URL,
                params={"q": f"{query} when:14d", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
                headers={"User-Agent": "Mozilla/5.0 (FauxTrading news reader)"},
            )
            r.raise_for_status()
        items = _parse(r.text, 30)
    except Exception as exc:
        logger.warning("News feed unavailable for %r: %s", query, exc)
        return cached[1][:limit] if cached else []
    _cache[query] = (time.time(), items)
    return items[:limit]
