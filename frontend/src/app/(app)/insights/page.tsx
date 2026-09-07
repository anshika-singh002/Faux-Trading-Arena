"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Info, Cpu, BarChart2 } from "lucide-react";
import { XGBOOST_PREDICTIONS, MOCK_QUOTES, formatCurrency, formatPercent } from "@/lib/mock-data";

// ─── Helpers ─────────────────────────────────────────────────

function ProbBar({ up, down }: { up: number; down: number }) {
  const upPct   = Math.round(up * 100);
  const downPct = Math.round(down * 100);
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${upPct}%`, background: "var(--color-positive)", borderRadius: "4px 0 0 4px" }} />
        <div style={{ width: `${downPct}%`, background: "var(--color-negative)", borderRadius: "0 4px 4px 0" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>↑ {upPct}%</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>↓ {downPct}%</span>
      </div>
    </div>
  );
}

function DirectionBadge({ direction }: { direction: "UP" | "DOWN" | "NEUTRAL" }) {
  const cfg = {
    UP:      { color: "var(--color-positive)", bg: "var(--color-positive-dim)", icon: <TrendingUp size={12} />,  label: "Bullish" },
    DOWN:    { color: "var(--color-negative)", bg: "var(--color-negative-dim)", icon: <TrendingDown size={12} />, label: "Bearish" },
    NEUTRAL: { color: "var(--color-text-3)",   bg: "var(--color-border)",       icon: <Minus size={12} />,        label: "Neutral" },
  }[direction];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: "var(--radius-full)",
      background: cfg.bg, color: cfg.color,
      fontSize: "0.75rem", fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ConfidenceDot({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 55 ? "var(--color-positive)" : pct >= 30 ? "var(--color-warning)" : "var(--color-text-3)";
  const label = pct >= 55 ? "High" : pct >= 30 ? "Medium" : "Low";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct * 1.43, 100)}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: "0.6875rem", color, fontWeight: 600, minWidth: 40 }}>{label} ({pct}%)</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function InsightsPage() {
  const predictions = Object.values(XGBOOST_PREDICTIONS);
  const upCount      = predictions.filter(p => p.direction === "UP").length;
  const downCount    = predictions.filter(p => p.direction === "DOWN").length;
  const neutralCount = predictions.filter(p => p.direction === "NEUTRAL").length;

  // Sort: highest confidence first
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
          <Cpu size={18} style={{ color: "var(--color-brand)" }} />
          <h1 style={{ fontSize: "1.25rem" }}>AI Market Insights</h1>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", margin: 0 }}>
          Powered by XGBoost — global model trained on technical & market indicators.
          Predicts direction over the next <strong style={{ color: "var(--color-text-2)" }}>5 trading days</strong>.
        </p>
      </div>

      {/* Model info banner */}
      <div style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-brand)",
        borderRadius: "var(--radius-lg)",
        padding: "0.875rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={15} style={{ color: "var(--color-brand)" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
            XGBoost Global Model
          </span>
          <span style={{
            fontSize: "0.625rem", background: "var(--color-positive-dim)", color: "var(--color-positive)",
            padding: "2px 7px", borderRadius: "var(--radius-full)", fontWeight: 700,
          }}>
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          {[
            { label: "Stocks covered", value: "10" },
            { label: "Avg accuracy",   value: "81.3%" },
            { label: "Avg ROC-AUC",    value: "0.890" },
            { label: "Horizon",        value: "5 days" },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text)" }}>{value}</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Bullish signals",  count: upCount,      color: "var(--color-positive)", icon: <TrendingUp size={18} /> },
          { label: "Bearish signals",  count: downCount,    color: "var(--color-negative)", icon: <TrendingDown size={18} /> },
          { label: "Neutral signals",  count: neutralCount, color: "var(--color-text-3)",   icon: <Minus size={18} /> },
        ].map(({ label, count, color, icon }) => (
          <div key={label} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)", padding: "0.875rem 1rem",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <div style={{ color }}>{icon}</div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Prediction cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
        {sorted.map((pred) => {
          const quote = MOCK_QUOTES[pred.symbol];
          const moveEst = pred.direction === "UP"
            ? quote ? formatCurrency(quote.price * 1.025, true) : "—"
            : pred.direction === "DOWN"
            ? quote ? formatCurrency(quote.price * 0.975, true) : "—"
            : quote ? formatCurrency(quote.price, true) : "—";

          return (
            <div
              key={pred.symbol}
              style={{
                background: "var(--color-surface)",
                border: `1px solid ${
                  pred.direction === "UP" ? "var(--color-positive-dim)" :
                  pred.direction === "DOWN" ? "var(--color-negative-dim)" :
                  "var(--color-border)"
                }`,
                borderTop: `3px solid ${
                  pred.direction === "UP" ? "var(--color-positive)" :
                  pred.direction === "DOWN" ? "var(--color-negative)" :
                  "var(--color-border)"
                }`,
                borderRadius: "var(--radius-lg)",
                padding: "1.125rem",
              }}
            >
              {/* Stock header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.625rem", fontWeight: 800, color: "var(--color-brand)",
                  }}>
                    {pred.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <Link
                      href={`/market/${pred.symbol}`}
                      style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text)", textDecoration: "none" }}
                    >
                      {pred.symbol}
                    </Link>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{pred.company} · NSE</div>
                  </div>
                </div>
                <DirectionBadge direction={pred.direction} />
              </div>

              {/* Current price */}
              {quote && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.875rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 700 }}>
                    {formatCurrency(quote.price)}
                  </span>
                  <span style={{
                    fontSize: "0.8125rem", fontFamily: "var(--font-mono)",
                    color: quote.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                  }}>
                    {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Probability bar */}
              <div style={{ marginBottom: "0.875rem" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 6 }}>
                  UP / DOWN probability
                </div>
                <ProbBar up={pred.probabilityUp} down={pred.probabilityDown} />
              </div>

              {/* Confidence */}
              <div style={{ marginBottom: "0.875rem" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 6 }}>
                  Model confidence
                </div>
                <ConfidenceDot score={pred.confidence} />
              </div>

              {/* 5-day estimate */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                paddingTop: "0.75rem", borderTop: "1px solid var(--color-border-dim)",
              }}>
                <div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>5-day estimate</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem",
                    color: pred.direction === "UP" ? "var(--color-positive)" :
                           pred.direction === "DOWN" ? "var(--color-negative)" : "var(--color-text-2)",
                  }}>
                    {moveEst}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Model accuracy</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: "var(--color-positive)" }}>
                    {pred.accuracy}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model accuracy table */}
      <div style={{
        marginTop: "1.5rem", background: "var(--color-surface)",
        border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart2 size={15} style={{ color: "var(--color-text-3)" }} />
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Model Performance by Stock</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Symbol</th>
              <th style={{ textAlign: "right" }}>Accuracy</th>
              <th style={{ textAlign: "right" }}>Balanced Acc.</th>
              <th style={{ textAlign: "right" }}>ROC-AUC</th>
              <th style={{ textAlign: "center" }}>Prediction</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(XGBOOST_PREDICTIONS)
              .sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))
              .map((pred) => (
              <tr key={pred.symbol}>
                <td style={{ fontWeight: 500, color: "var(--color-text)" }}>{pred.company}</td>
                <td>
                  <Link href={`/market/${pred.symbol}`} style={{ color: "var(--color-brand)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                    {pred.symbol}
                  </Link>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-positive)", fontWeight: 600 }}>
                  {pred.accuracy}
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-2)" }}>
                  —
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-2)" }}>
                  {pred.rocAuc.toFixed(3)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <DirectionBadge direction={pred.direction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: "1rem", padding: "0.875rem 1.25rem",
        background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)", display: "flex", gap: "0.625rem",
        fontSize: "0.8125rem", color: "var(--color-text-3)",
      }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          These predictions are generated by an XGBoost model trained on historical stock data and technical indicators.
          They are for <strong style={{ color: "var(--color-text-2)" }}>educational purposes only</strong> and do not constitute financial advice.
          Past model performance does not guarantee future accuracy.
          Faux Trading uses <strong style={{ color: "var(--color-text-2)" }}>virtual funds only</strong> — no real money is at risk.
        </span>
      </div>
    </div>
  );
}
