"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Info } from "lucide-react";
import { XGBOOST_PREDICTIONS, MOCK_QUOTES, formatCurrency } from "@/lib/mock-data";
import { apiPredict, type PredictionResult } from "@/lib/api";

const MODEL_META: Record<string, { accuracy: string; rocAuc: number; company: string }> = {
  SBIN:       { company: "State Bank of India",       accuracy: "81.2%", rocAuc: 0.887 },
  RELIANCE:   { company: "Reliance Industries",       accuracy: "82.5%", rocAuc: 0.890 },
  HDFCBANK:   { company: "HDFC Bank",                 accuracy: "80.8%", rocAuc: 0.879 },
  ABCAPITAL:  { company: "Aditya Birla Capital",      accuracy: "78.3%", rocAuc: 0.884 },
  ICICIBANK:  { company: "ICICI Bank",                accuracy: "80.0%", rocAuc: 0.874 },
  INFY:       { company: "Infosys",                   accuracy: "81.6%", rocAuc: 0.892 },
  TCS:        { company: "TCS",                       accuracy: "82.0%", rocAuc: 0.914 },
  ITC:        { company: "ITC",                       accuracy: "80.2%", rocAuc: 0.882 },
  LT:         { company: "Larsen & Toubro",           accuracy: "81.8%", rocAuc: 0.903 },
  BHARTIARTL: { company: "Bharti Airtel",             accuracy: "84.3%", rocAuc: 0.893 },
};
const SYMBOLS = Object.keys(MODEL_META);

type Dir = "UP" | "DOWN" | "NEUTRAL";

function dirFrom(d: string): Dir {
  const u = d.toUpperCase();
  if (u === "BULLISH") return "UP";
  if (u === "BEARISH") return "DOWN";
  return "NEUTRAL";
}

interface Card {
  symbol: string; company: string; direction: Dir;
  score: number; priceCurrent: number; priceShort: number;
  accuracy: string; pBuy?: number; pHold?: number; pSell?: number;
  pUp?: number; pDown?: number; isLive: boolean;
}

function Signal({ dir }: { dir: Dir }) {
  const map: Record<Dir, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    UP:      { color: "var(--color-positive)", bg: "var(--color-positive-dim)", icon: <TrendingUp size={11} />,  label: "BUY" },
    DOWN:    { color: "var(--color-negative)", bg: "var(--color-negative-dim)", icon: <TrendingDown size={11} />, label: "SELL" },
    NEUTRAL: { color: "var(--color-text-3)",   bg: "var(--color-border)",       icon: <Minus size={11} />,        label: "HOLD" },
  };
  const c = map[dir];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-full)", background: c.bg, color: c.color, fontSize: "0.75rem", fontWeight: 700 }}>
      {c.icon} {c.label}
    </span>
  );
}

function ProbBar({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${Math.round(buy*100)}%`, background: "var(--color-positive)" }} />
        <div style={{ width: `${Math.round(hold*100)}%`, background: "var(--color-warning)" }} />
        <div style={{ width: `${Math.round(sell*100)}%`, background: "var(--color-negative)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "0.625rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>{Math.round(buy*100)}% buy</span>
        <span style={{ fontSize: "0.625rem", color: "var(--color-warning)", fontFamily: "var(--font-mono)" }}>{Math.round(hold*100)}% hold</span>
        <span style={{ fontSize: "0.625rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>{Math.round(sell*100)}% sell</span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [cards, setCards]   = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function fetch() {
    setLoading(true);
    const results: Card[] = [];
    let live = 0;

    await Promise.all(SYMBOLS.map(async (sym) => {
      const meta = MODEL_META[sym];
      const basePrice = MOCK_QUOTES[sym]?.price ?? 0;
      try {
        const r: PredictionResult = await apiPredict(sym);
        live++;
        const s = r.confidence_score;
        const dir = dirFrom(r.direction);
        let pBuy = 0, pHold = 0, pSell = 0;
        if (dir === "UP")   { pBuy = s; pSell = (1-s)*0.4; pHold = (1-s)*0.6; }
        else if (dir === "DOWN") { pSell = s; pBuy = (1-s)*0.4; pHold = (1-s)*0.6; }
        else { pHold = 0.5+s*0.3; pBuy = (1-pHold)/2; pSell = (1-pHold)/2; }
        results.push({ symbol: sym, company: meta.company, direction: dir, score: s, priceCurrent: r.current_price, priceShort: r.predicted_price_short, accuracy: meta.accuracy, pBuy, pHold, pSell, isLive: !r.is_mock });
      } catch {
        const stat = XGBOOST_PREDICTIONS[sym];
        if (!stat) return;
        const dir = stat.direction;
        results.push({ symbol: sym, company: meta.company, direction: dir, score: stat.confidence, priceCurrent: basePrice, priceShort: dir === "UP" ? basePrice*1.025 : dir === "DOWN" ? basePrice*0.975 : basePrice, accuracy: meta.accuracy, pUp: stat.probabilityUp, pDown: stat.probabilityDown, isLive: false });
      }
    }));

    results.sort((a, b) => b.score - a.score);
    setCards(results);
    setLiveCount(live);
    setLastFetched(new Date());
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bullish = cards.filter(c => c.direction === "UP").length;
  const bearish = cards.filter(c => c.direction === "DOWN").length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>AI Insights</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
            XGBoost predictions · 5-day horizon · 10 Indian stocks
            {lastFetched && <span style={{ marginLeft: 8 }}>· {lastFetched.toLocaleTimeString("en-IN")}</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!loading && liveCount > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-positive)", background: "var(--color-positive-dim)", padding: "3px 10px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
              Live · {liveCount}/10
            </span>
          )}
          <button onClick={fetch} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.4375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      {!loading && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Bullish", count: bullish, color: "var(--color-positive)" },
            { label: "Bearish", count: bearish, color: "var(--color-negative)" },
            { label: "Neutral", count: 10 - bullish - bearish, color: "var(--color-text-3)" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {loading
          ? SYMBOLS.map(sym => (
            <div key={sym} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-border)" }} className="skeleton" />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: "40%", background: "var(--color-border)", borderRadius: 4, marginBottom: 6 }} className="skeleton" />
                  <div style={{ height: 10, width: "60%", background: "var(--color-border)", borderRadius: 4 }} className="skeleton" />
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--color-border)", marginBottom: 12 }} className="skeleton" />
              <div style={{ height: 10, width: "70%", borderRadius: 4, background: "var(--color-border)" }} className="skeleton" />
            </div>
          ))
          : cards.map((card) => {
            const diffPct = card.priceCurrent > 0 ? ((card.priceShort - card.priceCurrent) / card.priceCurrent) * 100 : 0;
            return (
              <div key={card.symbol} style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderTop: `3px solid ${card.direction === "UP" ? "var(--color-positive)" : card.direction === "DOWN" ? "var(--color-negative)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}>
                {/* Stock + signal */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <Link href={`/market/${card.symbol}`} style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", textDecoration: "none" }}>
                      {card.symbol}
                    </Link>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>{card.company}</div>
                  </div>
                  <Signal dir={card.direction} />
                </div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 700 }}>{formatCurrency(card.priceCurrent)}</span>
                  {card.priceCurrent > 0 && (
                    <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: diffPct >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                      {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}% est.
                    </span>
                  )}
                </div>

                {/* Probability bar */}
                <div style={{ marginBottom: "0.875rem" }}>
                  {card.pBuy !== undefined
                    ? <ProbBar buy={card.pBuy} hold={card.pHold ?? 0} sell={card.pSell ?? 0} />
                    : (
                      <div>
                        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
                          <div style={{ width: `${Math.round((card.pUp ?? 0)*100)}%`, background: "var(--color-positive)" }} />
                          <div style={{ width: `${Math.round((card.pDown ?? 0)*100)}%`, background: "var(--color-negative)" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: "0.625rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>{Math.round((card.pUp??0)*100)}% up</span>
                          <span style={{ fontSize: "0.625rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>{Math.round((card.pDown??0)*100)}% down</span>
                        </div>
                      </div>
                    )
                  }
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border-dim)" }}>
                  <div>
                    <div style={{ fontSize: "0.625rem", color: "var(--color-text-3)", marginBottom: 2 }}>5-DAY TARGET</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: card.direction === "UP" ? "var(--color-positive)" : card.direction === "DOWN" ? "var(--color-negative)" : "var(--color-text-2)" }}>
                      {formatCurrency(card.priceShort)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.625rem", color: "var(--color-text-3)", marginBottom: 2 }}>MODEL ACC.</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: "var(--color-positive)" }}>{card.accuracy}</div>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-3)", padding: "0.875rem 1rem", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        Predictions are for educational purposes only. Not financial advice. Past performance does not guarantee future results.
      </div>
    </div>
  );
}
