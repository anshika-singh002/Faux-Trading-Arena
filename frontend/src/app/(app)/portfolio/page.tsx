"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp } from "lucide-react";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioChart";
import { formatCurrency, formatPercent } from "@/lib/mock-data";
import { apiGetPortfolio, type PortfolioSummary } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function PortfolioPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading]     = useState(true);

  async function load() {
    if (!isAuthenticated) return;
    setLoading(true);
    try { setPortfolio(await apiGetPortfolio()); }
    catch { /* show empty state */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const cash        = portfolio?.cash ?? user?.virtualBalance ?? 0;
  const totalValue  = portfolio?.total_value ?? cash;
  const totalReturn = portfolio?.total_return ?? 0;
  const totalReturnPct = portfolio?.total_return_percent ?? 0;
  const unrealized  = portfolio?.unrealized_pnl ?? 0;
  const realized    = portfolio?.realized_pnl ?? 0;
  const invested    = portfolio?.invested ?? 0;
  const positions   = portfolio?.positions ?? [];

  const Sk = ({ w = 80, h = 16 }: { w?: number | string; h?: number }) => (
    <div style={{ width: w, height: h, borderRadius: 4, background: "var(--color-border)" }} className="skeleton" />
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Portfolio</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
            Virtual portfolio · All values in ₹
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.4375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Summary strip — single row of 4 numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: "1.75rem" }}>
        {[
          { label: "Total Value",   value: totalValue,      color: "var(--color-text)",     neutral: true },
          { label: "Total Return",  value: totalReturn,     color: totalReturn >= 0 ? "var(--color-positive)" : "var(--color-negative)", sign: true },
          { label: "Unrealized",    value: unrealized,      color: unrealized >= 0 ? "var(--color-positive)" : "var(--color-negative)", sign: true },
          { label: "Cash",          value: cash,            color: "var(--color-text)",     neutral: true },
        ].map(({ label, value, color, sign }) => (
          <div key={label} style={{ background: "var(--color-surface)", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>{label}</div>
            {loading
              ? <Sk w="70%" h={24} />
              : <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color, letterSpacing: "-0.02em" }}>
                  {sign && value > 0 ? "+" : ""}{formatCurrency(value)}
                </div>
            }
            {!loading && label === "Total Return" && (
              <div style={{ fontSize: "0.75rem", color, marginTop: 2 }}>{formatPercent(totalReturnPct)}</div>
            )}
          </div>
        ))}
      </div>

      {/* Performance chart */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1.25rem" }}>Performance (90 days)</div>
        <PortfolioPerformanceChart height={220} />
      </div>

      {/* Holdings */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
        <div style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1.25rem" }}>
          Holdings
          {!loading && positions.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: "0.8125rem", color: "var(--color-text-3)", fontWeight: 400 }}>{positions.length} positions</span>
          )}
        </div>

        {!loading && positions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
            <TrendingUp size={36} style={{ color: "var(--color-text-3)", opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
            <p style={{ color: "var(--color-text-3)", marginBottom: "1rem" }}>No positions yet</p>
            <Link href="/market" className="btn btn-primary btn-sm">Browse Market</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 100px 110px 110px 80px 80px", gap: "0.5rem", padding: "0 0.25rem 0.75rem", borderBottom: "1px solid var(--color-border-dim)" }}>
              {["Stock","Qty","Avg Cost","Current","Value","P&L","Alloc."].map((h, i) => (
                <span key={h} style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
              ))}
            </div>

            {loading
              ? Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 100px 110px 110px 80px 80px", gap: "0.5rem", padding: "1rem 0.25rem", borderBottom: "1px solid var(--color-border-dim)", alignItems: "center" }}>
                  {[1,2,3,4,5,6,7].map(j => <Sk key={j} w="70%" h={14} />)}
                </div>
              ))
              : positions.map((pos) => (
              <div key={pos.symbol} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 100px 110px 110px 80px 80px", gap: "0.5rem", padding: "0.875rem 0.25rem", borderBottom: "1px solid var(--color-border-dim)", alignItems: "center" }}>
                <Link href={`/market/${pos.symbol}`} style={{ textDecoration: "none" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{pos.symbol}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>NSE</div>
                </Link>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{pos.quantity}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>{formatCurrency(pos.avg_cost)}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600 }}>{formatCurrency(pos.current_price)}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatCurrency(pos.market_value)}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: pos.unrealized_pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                    {pos.unrealized_pnl >= 0 ? "+" : ""}{formatCurrency(pos.unrealized_pnl)}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: pos.unrealized_pnl_percent >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                    {formatPercent(pos.unrealized_pnl_percent)}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
                  {pos.weight.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {!loading && (
        <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-text-3)", textAlign: "center" }}>
          Realized P&L: {formatCurrency(realized)} · Invested: {formatCurrency(invested)}
        </p>
      )}
    </div>
  );
}
