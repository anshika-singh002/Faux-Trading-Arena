"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Info, Cpu,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useLiveMarket } from "@/lib/live-market";
import {
  apiPredict, apiModel1PredictAll,
  type PredictionResult, type Model1Prediction,
} from "@/lib/api";

// ─── Static model-accuracy metadata (from training) ──────────────────────────
const MODEL2_META: Record<string, { accuracy: string; rocAuc: number; company: string }> = {
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
const SYMBOLS = Object.keys(MODEL2_META);

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Dir2 = "UP" | "DOWN" | "NEUTRAL";
type Dir3 = "UP" | "DOWN" | "NEUTRAL";

function dirFrom(d: string): Dir2 {
  const u = d.toUpperCase();
  if (u === "BULLISH") return "UP";
  if (u === "BEARISH") return "DOWN";
  return "NEUTRAL";
}

function SignalBadge({ dir, large }: { dir: Dir2 | Dir3; large?: boolean }) {
  const map: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    UP:      { color: "var(--color-positive)", bg: "var(--color-positive-dim)", icon: <TrendingUp size={large ? 13 : 11} />,  label: large ? "BULLISH" : "BUY" },
    DOWN:    { color: "var(--color-negative)", bg: "var(--color-negative-dim)", icon: <TrendingDown size={large ? 13 : 11} />, label: large ? "BEARISH" : "SELL" },
    NEUTRAL: { color: "var(--color-text-3)",   bg: "var(--color-border)",       icon: <Minus size={large ? 13 : 11} />,        label: "NEUTRAL" },
    BUY:     { color: "var(--color-positive)", bg: "var(--color-positive-dim)", icon: <TrendingUp size={11} />,  label: "BUY" },
    SELL:    { color: "var(--color-negative)", bg: "var(--color-negative-dim)", icon: <TrendingDown size={11} />, label: "SELL" },
    HOLD:    { color: "var(--color-warning)",  bg: "var(--color-warning-dim)",  icon: <Minus size={11} />,        label: "HOLD" },
  };
  const c = map[dir] ?? map.NEUTRAL;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: large ? "4px 12px" : "3px 10px",
      borderRadius: "var(--radius-full)",
      background: c.bg, color: c.color,
      fontSize: large ? "0.8125rem" : "0.75rem", fontWeight: 700,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

function ProbBar3({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${Math.round(buy*100)}%`,  background: "var(--color-positive)" }} />
        <div style={{ width: `${Math.round(hold*100)}%`, background: "var(--color-warning)" }} />
        <div style={{ width: `${Math.round(sell*100)}%`, background: "var(--color-negative)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "0.625rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>{Math.round(buy*100)}% buy</span>
        <span style={{ fontSize: "0.625rem", color: "var(--color-warning)",  fontFamily: "var(--font-mono)" }}>{Math.round(hold*100)}% hold</span>
        <span style={{ fontSize: "0.625rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>{Math.round(sell*100)}% sell</span>
      </div>
    </div>
  );
}

function ProbBar2({ up, down }: { up: number; down: number }) {
  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${Math.round(up*100)}%`,   background: "var(--color-positive)" }} />
        <div style={{ width: `${Math.round(down*100)}%`, background: "var(--color-negative)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>↑ {Math.round(up*100)}% up</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>↓ {Math.round(down*100)}% down</span>
      </div>
    </div>
  );
}

// ─── Card data types ──────────────────────────────────────────────────────────

interface Card2 {
  symbol: string; company: string; direction: Dir3;
  score: number; priceCurrent: number; priceShort: number;
  accuracy: string; pBuy?: number; pHold?: number; pSell?: number;
  pUp?: number; pDown?: number; isLive: boolean;
}

// ─── Model 2 tab ──────────────────────────────────────────────────────────────

function Model2Tab() {
  const { quotes } = useLiveMarket();
  const [cards, setCards]   = useState<Card2[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [fetched, setFetched] = useState<Date | null>(null);

  async function fetch(initial = false) {
    if (!initial) setLoading(true);
    const results: Card2[] = [];
    let live = 0;
    await Promise.all(SYMBOLS.map(async (sym) => {
      const meta = MODEL2_META[sym];
      const basePrice = quotes[sym]?.price ?? 0;
      try {
        const r: PredictionResult = await apiPredict(sym);
        live++;
        const s = r.confidence_score;
        const dir = dirFrom(r.direction);
        let pBuy = 0, pHold = 0, pSell = 0;
        if (dir === "UP")   { pBuy = s; pSell = (1-s)*0.4; pHold = (1-s)*0.6; }
        else if (dir === "DOWN") { pSell = s; pBuy = (1-s)*0.4; pHold = (1-s)*0.6; }
        else { pHold = 0.5+s*0.3; pBuy = (1-pHold)/2; pSell = (1-pHold)/2; }
        results.push({ symbol: sym, company: meta.company, direction: dir, score: s,
          priceCurrent: r.current_price, priceShort: r.predicted_price_short,
          accuracy: meta.accuracy, pBuy, pHold, pSell, isLive: !r.is_mock });
      } catch {
        return; // model unreachable: show nothing for this stock rather than a stored snapshot
      }
    }));
    results.sort((a, b) => b.score - a.score);
    setCards(results); setLiveCount(live); setFetched(new Date()); setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => fetch(), 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
            Per-stock XGBoost classifiers · 67 features · 3-class BUY / HOLD / SELL · 5-day horizon
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!loading && liveCount > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-positive)", background: "var(--color-positive-dim)", padding: "3px 10px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
              Live · {liveCount}/10
            </span>
          )}
          {fetched && <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{fetched.toLocaleTimeString("en-IN")}</span>}
          <button onClick={() => fetch()} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 5, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Bullish", count: cards.filter(c=>c.direction==="UP").length,      color: "var(--color-positive)" },
            { label: "Bearish", count: cards.filter(c=>c.direction==="DOWN").length,    color: "var(--color-negative)" },
            { label: "Neutral", count: cards.filter(c=>c.direction==="NEUTRAL").length, color: "var(--color-text-3)" },
          ].map(({label,count,color}) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {loading
          ? SYMBOLS.map(sym => (
            <div key={sym} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderTop: "3px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ width:36,height:36,borderRadius:8,background:"var(--color-border)" }} className="skeleton" />
                <div style={{ flex:1 }}>
                  <div style={{ height:14,width:"40%",background:"var(--color-border)",borderRadius:4,marginBottom:6 }} className="skeleton" />
                  <div style={{ height:10,width:"60%",background:"var(--color-border)",borderRadius:4 }} className="skeleton" />
                </div>
              </div>
              <div style={{ height:6,borderRadius:3,background:"var(--color-border)",marginBottom:12 }} className="skeleton" />
            </div>
          ))
          : cards.map((card) => {
            const diffPct = card.priceCurrent > 0 ? ((card.priceShort-card.priceCurrent)/card.priceCurrent)*100 : 0;
            return (
              <div key={card.symbol} style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderTop: `3px solid ${card.direction==="UP"?"var(--color-positive)":card.direction==="DOWN"?"var(--color-negative)":"var(--color-border)"}`,
                borderRadius: "var(--radius-xl)", padding: "1.25rem",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1rem" }}>
                  <div>
                    <Link href={`/market/${card.symbol}`} style={{ fontWeight:700, fontSize:"1rem", color:"var(--color-text)", textDecoration:"none" }}>{card.symbol}</Link>
                    <div style={{ fontSize:"0.75rem", color:"var(--color-text-3)", marginTop:2 }}>{card.company}</div>
                  </div>
                  <SignalBadge dir={card.direction} />
                </div>
                <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem", marginBottom:"1rem" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"1.125rem", fontWeight:700 }}>{formatCurrency(card.priceCurrent)}</span>
                  {card.priceCurrent > 0 && (
                    <span style={{ fontSize:"0.8125rem", fontFamily:"var(--font-mono)", color: diffPct>=0?"var(--color-positive)":"var(--color-negative)" }}>
                      {diffPct>=0?"+":""}{diffPct.toFixed(1)}% est.
                    </span>
                  )}
                </div>
                <div style={{ marginBottom:"0.875rem" }}>
                  {card.pBuy !== undefined
                    ? <ProbBar3 buy={card.pBuy} hold={card.pHold??0} sell={card.pSell??0} />
                    : <ProbBar2 up={card.pUp??0} down={card.pDown??0} />
                  }
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"0.75rem", borderTop:"1px solid var(--color-border-dim)" }}>
                  <div>
                    <div style={{ fontSize:"0.625rem", color:"var(--color-text-3)", marginBottom:2 }}>5-DAY TARGET</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontWeight:600, fontSize:"0.875rem", color: card.direction==="UP"?"var(--color-positive)":card.direction==="DOWN"?"var(--color-negative)":"var(--color-text-2)" }}>
                      {formatCurrency(card.priceShort)}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"0.625rem", color:"var(--color-text-3)", marginBottom:2 }}>ACCURACY</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontWeight:600, fontSize:"0.875rem", color:"var(--color-positive)" }}>{card.accuracy}</div>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── Model 1 tab ──────────────────────────────────────────────────────────────

function Model1Tab() {
  const [preds, setPreds]     = useState<Model1Prediction[]>([]);
  const [info, setInfo]       = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState<Date | null>(null);

  async function fetch(initial = false) {
    if (!initial) setLoading(true);
    try {
      const r = await apiModel1PredictAll();
      setPreds(r.predictions);
      setInfo(r.model_info as Record<string, unknown>);
      setFetched(new Date());
    } catch { /* keep existing */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const id = setTimeout(() => fetch(), 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bullish = preds.filter(p => p.direction === "UP").length;
  const bearish = preds.filter(p => p.direction === "DOWN").length;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
          Single global XGBoost · {(info.n_features as number) || 47} features · Binary UP / DOWN · 5-day horizon
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!loading && preds.length > 0 && preds[0].is_live && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-positive)", background: "var(--color-positive-dim)", padding: "3px 10px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>Live</span>
          )}
          {fetched && <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{fetched.toLocaleTimeString("en-IN")}</span>}
          <button onClick={() => fetch()} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 5, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
        </div>
      </div>

      {/* Model stats strip */}
      {!loading && Object.keys(info).length > 0 && (
        <div style={{ display: "flex", gap: "1px", background: "var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {[
            { label: "Test Accuracy",  value: info.test_accuracy as string },
            { label: "ROC-AUC",        value: String(info.test_auc) },
            { label: "Features",       value: String(info.n_features) },
            { label: "Train Period",   value: info.train_period as string },
            { label: "Bullish",        value: String(bullish), color: "var(--color-positive)" },
            { label: "Bearish",        value: String(bearish), color: "var(--color-negative)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, background: "var(--color-surface)", padding: "0.875rem 1rem", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem", color: color ?? "var(--color-text)" }}>{value}</div>
              <div style={{ fontSize: "0.625rem", color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Company</th>
              <th style={{ textAlign: "right" }}>Current Price</th>
              <th style={{ textAlign: "right" }}>5-day Target</th>
              <th style={{ textAlign: "center" }}>UP Probability</th>
              <th style={{ textAlign: "center" }}>Signal</th>
              <th style={{ textAlign: "right" }}>Accuracy</th>
              <th style={{ textAlign: "right" }}>ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(10).fill(0).map((_, i) => (
                <tr key={i}>
                  {[120,140,80,80,120,80,60,60].map((w,j) => (
                    <td key={j}><div style={{ height:13,width:w,borderRadius:4,background:"var(--color-border)",margin:"0 auto"}} className="skeleton" /></td>
                  ))}
                </tr>
              ))
              : preds.map((p) => (
                <tr key={p.symbol}>
                  <td>
                    <Link href={`/market/${p.symbol}`} style={{ fontWeight:600, color:"var(--color-text)", textDecoration:"none" }}>{p.symbol}</Link>
                  </td>
                  <td style={{ color:"var(--color-text-2)", fontSize:"0.875rem" }}>{p.company}</td>
                  <td style={{ textAlign:"right", fontFamily:"var(--font-mono)", fontSize:"0.875rem" }}>{formatCurrency(p.current_price)}</td>
                  <td style={{ textAlign:"right", fontFamily:"var(--font-mono)", fontSize:"0.875rem", color: p.direction==="UP"?"var(--color-positive)":p.direction==="DOWN"?"var(--color-negative)":"var(--color-text-2)" }}>
                    {formatCurrency(p.predicted_price)}
                  </td>
                  <td style={{ textAlign:"center" }}>
                    {/* Visual bar for UP probability */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                      <div style={{ width:80, height:6, borderRadius:3, background:"var(--color-border)", overflow:"hidden" }}>
                        <div style={{ width:`${Math.round(p.p_up*100)}%`, height:"100%", background: p.p_up>0.55?"var(--color-positive)":p.p_up<0.45?"var(--color-negative)":"var(--color-warning)", borderRadius:3 }} />
                      </div>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", minWidth:36 }}>{Math.round(p.p_up*100)}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign:"center" }}>
                    <SignalBadge dir={p.direction} />
                  </td>
                  <td style={{ textAlign:"right", fontFamily:"var(--font-mono)", color:"var(--color-positive)", fontWeight:600, fontSize:"0.875rem" }}>{p.accuracy}</td>
                  <td style={{ textAlign:"right", fontFamily:"var(--font-mono)", color:"var(--color-text-2)", fontSize:"0.875rem" }}>{p.roc_auc.toFixed(3)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<"model2" | "model1">("model1");

  const tabs = [
    { id: "model1" as const, label: "Model 1", sub: "UP / DOWN · Global · 47 features" },
    { id: "model2" as const, label: "Model 2", sub: "BUY / HOLD / SELL · Per-stock · 67 features" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Cpu size={18} style={{ color: "var(--color-brand)" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>AI Insights</h1>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
          XGBoost models trained on 10 years of NSE data · 10 Indian stocks
        </p>
      </div>

      {/* Model tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "var(--radius-xl)",
              border: `1px solid ${activeTab === tab.id ? "var(--color-brand)" : "var(--color-border)"}`,
              background: activeTab === tab.id ? "var(--color-brand-subtle)" : "var(--color-surface)",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              transition: "all var(--transition-fast)",
              flex: 1,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: activeTab === tab.id ? "var(--color-brand)" : "var(--color-text)", marginBottom: 3 }}>
              {tab.label}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{tab.sub}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "model2" ? <Model2Tab /> : <Model1Tab />}

      {/* Disclaimer */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-3)", padding: "0.875rem 1rem", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        Predictions are for educational purposes only. Not financial advice. Past performance does not guarantee future results.
      </div>
    </div>
  );
}
