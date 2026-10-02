"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  TrendingUp, TrendingDown, Minus, Newspaper, RefreshCw,
  AlertCircle, ExternalLink, Clock, Wifi, WifiOff,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  source_name: string;
  source_url: string;
  published_at: string;
  symbol: string;
  sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number;
}

interface LiveNewsResponse {
  symbol: string;
  company: string;
  articles: LiveArticle[];
  total: number;
  last_updated: string;
  is_live: boolean;
}

interface MarketNewsResponse {
  articles: LiveArticle[];
  total: number;
  last_updated: string;
  is_live: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMBOLS = ["SBIN","RELIANCE","HDFCBANK","ABCAPITAL","ICICIBANK","INFY","TCS","ITC","LT","BHARTIARTL"];
const COMPANY: Record<string, string> = {
  SBIN: "State Bank of India", RELIANCE: "Reliance Industries", HDFCBANK: "HDFC Bank",
  ABCAPITAL: "Aditya Birla Capital", ICICIBANK: "ICICI Bank", INFY: "Infosys",
  TCS: "TCS", ITC: "ITC Ltd.", LT: "Larsen & Toubro", BHARTIARTL: "Bharti Airtel",
};
const SECTOR: Record<string, string> = {
  SBIN: "Banking", RELIANCE: "Energy", HDFCBANK: "Banking", ABCAPITAL: "NBFC",
  ICICIBANK: "Banking", INFY: "IT", TCS: "IT", ITC: "FMCG", LT: "Infra", BHARTIARTL: "Telecom",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SentimentPill({ s }: { s: "positive" | "negative" | "neutral" }) {
  const map = {
    positive: { color: "var(--color-positive)", bg: "var(--color-positive-dim)", icon: <TrendingUp size={10} />, label: "Bullish" },
    negative: { color: "var(--color-negative)", bg: "var(--color-negative-dim)", icon: <TrendingDown size={10} />, label: "Bearish" },
    neutral:  { color: "var(--color-text-3)",   bg: "var(--color-border)",       icon: <Minus size={10} />,        label: "Neutral" },
  };
  const c = map[s];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: "var(--radius-full)",
      background: c.bg, color: c.color, fontSize: "0.625rem", fontWeight: 700,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── News card (portal style with image) ─────────────────────────────────────

function ArticleCard({ article, featured = false }: { article: LiveArticle; featured?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const isExternal = article.url && article.url !== "#";

  const inner = (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      display: "flex",
      flexDirection: featured ? "row" : "column",
      transition: "border-color var(--transition-fast)",
      cursor: isExternal ? "pointer" : "default",
      height: "100%",
    }}
    onMouseEnter={e => { if (isExternal) (e.currentTarget as HTMLElement).style.borderColor = "var(--color-brand)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
    >
      {/* Image */}
      <div style={{
        width: featured ? 280 : "100%",
        minWidth: featured ? 280 : "auto",
        height: featured ? "100%" : 180,
        background: "var(--color-bg-elevated)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}>
        {!imgErr && article.image && article.image !== "#" ? (
          <img
            src={article.image}
            alt={article.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          // Fallback gradient placeholder
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-bg-elevated) 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 8,
          }}>
            <Newspaper size={28} style={{ color: "var(--color-text-3)", opacity: 0.4 }} />
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 700 }}>{article.symbol}</span>
          </div>
        )}
        {/* Sentiment overlay badge */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <SentimentPill s={article.sentiment} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0 }}>
        {/* Source + time */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {article.source_name}
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={9} /> {timeAgo(article.published_at)}
          </span>
          {article.symbol !== "MARKET" && (
            <span style={{
              marginLeft: "auto",
              fontSize: "0.625rem", fontWeight: 700,
              padding: "1px 6px", borderRadius: "var(--radius-full)",
              background: "var(--color-surface-2)", color: "var(--color-text-3)",
            }}>
              {article.symbol}
            </span>
          )}
        </div>

        {/* Headline */}
        <h3 style={{
          fontSize: featured ? "1rem" : "0.875rem",
          fontWeight: 600, lineHeight: 1.4,
          color: "var(--color-text)", margin: 0,
          display: "-webkit-box", WebkitLineClamp: featured ? 3 : 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {article.title}
        </h3>

        {/* Description */}
        {article.description && article.description !== article.title && (
          <p style={{
            fontSize: "0.8125rem", color: "var(--color-text-2)", margin: 0,
            lineHeight: 1.55, flex: 1,
            display: "-webkit-box", WebkitLineClamp: featured ? 3 : 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {article.description}
          </p>
        )}

        {/* Read more */}
        {isExternal && (
          <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: "0.75rem", color: "var(--color-brand)", fontWeight: 500,
            }}>
              Read full article <ExternalLink size={11} />
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {inner}
      </a>
    );
  }
  return <div style={{ height: "100%" }}>{inner}</div>;
}

// ─── Stock filter chip ────────────────────────────────────────────────────────

function StockChip({ sym, active, onClick }: { sym: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.3125rem 0.75rem",
        borderRadius: "var(--radius-full)",
        background: active ? "var(--color-brand)" : "var(--color-surface)",
        color: active ? "var(--color-text-inv)" : "var(--color-text-2)",
        border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border)"}`,
        fontSize: "0.75rem", fontWeight: active ? 700 : 400,
        cursor: "pointer", fontFamily: "inherit",
        transition: "all var(--transition-fast)",
        whiteSpace: "nowrap",
      }}
    >
      {sym === "all" ? "All Markets" : sym}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewsAnalysisPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeSymbol, setActiveSymbol]       = useState<string>("all");
  const [articles, setArticles]               = useState<LiveArticle[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [isLive, setIsLive]                   = useState(false);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [error, setError]                     = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const fetchNews = useCallback(async (sym: string) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(false);
    try {
      if (sym === "all") {
        const data = await apiFetch<MarketNewsResponse>("/ai/news/market/top");
        setArticles(data.articles);
        setIsLive(data.is_live);
      } else {
        const data = await apiFetch<LiveNewsResponse>(`/ai/news/${sym}`);
        setArticles(data.articles);
        setIsLive(data.is_live);
      }
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchNews(activeSymbol); }, [fetchNews, activeSymbol]);

  const handleFilter = (sym: string) => {
    setActiveSymbol(sym);
    setSentimentFilter("all");
  };

  const filtered = sentimentFilter === "all"
    ? articles
    : articles.filter(a => a.sentiment === sentimentFilter);

  const bullish = articles.filter(a => a.sentiment === "positive").length;
  const bearish = articles.filter(a => a.sentiment === "negative").length;
  const neutral = articles.filter(a => a.sentiment === "neutral").length;

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>

      {/* ── Masthead ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Newspaper size={18} style={{ color: "var(--color-brand)" }} />
            <h1 style={{ fontSize: "1.375rem", margin: 0, fontWeight: 700 }}>Market News</h1>
            {isLive ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.625rem", fontWeight: 700, color: "var(--color-positive)", background: "var(--color-positive-dim)", padding: "2px 7px", borderRadius: "var(--radius-full)" }}>
                <Wifi size={9} /> LIVE
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.625rem", fontWeight: 700, color: "var(--color-text-3)", background: "var(--color-border)", padding: "2px 7px", borderRadius: "var(--radius-full)" }}>
                <WifiOff size={9} /> CURATED
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", margin: 0 }}>
            {activeSymbol === "all"
              ? "Latest headlines across NSE-listed Indian stocks"
              : `${COMPANY[activeSymbol] ?? activeSymbol} · ${SECTOR[activeSymbol] ?? ""} · NSE`
            }
            {lastUpdated && <span style={{ marginLeft: 8 }}>· Updated {lastUpdated.toLocaleTimeString("en-IN")}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchNews(activeSymbol)}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: "0.375rem",
            padding: "0.4375rem 0.875rem",
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", color: "var(--color-text-2)",
            fontSize: "0.8125rem", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1, fontFamily: "inherit",
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.75rem 1rem", marginBottom: "1.25rem",
          background: "var(--color-warning-dim)", border: "1px solid var(--color-warning)",
          borderRadius: "var(--radius-md)", fontSize: "0.8125rem", color: "var(--color-text-2)",
        }}>
          <AlertCircle size={14} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
          Unable to load news. Make sure the backend is running.
        </div>
      )}

      {/* ── Stock filter chips ── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", overflowX: "auto", paddingBottom: 2 }}>
        <StockChip sym="all" active={activeSymbol === "all"} onClick={() => handleFilter("all")} />
        {SYMBOLS.map(sym => (
          <StockChip key={sym} sym={sym} active={activeSymbol === sym} onClick={() => handleFilter(sym)} />
        ))}
      </div>

      {/* ── Sentiment tabs + counts ── */}
      {!loading && articles.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          marginBottom: "1.25rem", flexWrap: "wrap",
        }}>
          {[
            { key: "all",      label: `All (${articles.length})`,     color: "var(--color-text-2)" },
            { key: "positive", label: `Bullish (${bullish})`,         color: "var(--color-positive)" },
            { key: "negative", label: `Bearish (${bearish})`,         color: "var(--color-negative)" },
            { key: "neutral",  label: `Neutral (${neutral})`,         color: "var(--color-text-3)" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setSentimentFilter(key as typeof sentimentFilter)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.8125rem",
                fontWeight: sentimentFilter === key ? 700 : 400,
                color: sentimentFilter === key ? color : "var(--color-text-3)",
                borderBottom: sentimentFilter === key ? `2px solid ${color}` : "2px solid transparent",
                paddingBottom: "0.25rem",
                transition: "all var(--transition-fast)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && (
        <div>
          {/* Featured skeleton */}
          <div style={{ height: 280, borderRadius: "var(--radius-lg)", background: "var(--color-border)", marginBottom: "1.25rem" }} className="skeleton" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 280, borderRadius: "var(--radius-lg)", background: "var(--color-border)" }} className="skeleton" />
            ))}
          </div>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-3)" }}>
          <Newspaper size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
          <p>No articles found for this filter.</p>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Featured article (full width) */}
          {featured && (
            <div style={{ marginBottom: "1.25rem", height: 280 }}>
              <ArticleCard article={featured} featured />
            </div>
          )}

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}>
            {rest.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </>
      )}

      {/* ── Disclaimer ── */}
      {!loading && (
        <div style={{
          marginTop: "2rem", padding: "0.75rem 1rem",
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)", display: "flex", gap: "0.5rem",
          fontSize: "0.75rem", color: "var(--color-text-3)",
        }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          News and sentiment data are for educational purposes only and do not constitute financial advice.
          {!isLive && " To get live news with images, add a free GNews API key to backend/.env (GNEWS_API_KEY)."}
        </div>
      )}
    </div>
  );
}
