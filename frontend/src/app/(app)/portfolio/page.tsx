"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PortfolioPerformanceChart, AllocationChart } from "@/components/charts/PortfolioChart";
import { MOCK_PORTFOLIO, formatCurrency, formatPercent } from "@/lib/mock-data";

export default function PortfolioPage() {
  const p = MOCK_PORTFOLIO;
  const isUp = p.dayPnl >= 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.375rem" }}>Portfolio</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1.5rem" }}>
        Virtual portfolio · All values in INR (₹)
      </p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard
          label="Total Value"
          value={<span className="tabular">{formatCurrency(p.totalValue)}</span>}
          change={`Today: ${isUp ? "+" : ""}${formatCurrency(p.dayPnl)} (${formatPercent(p.dayPnlPercent)})`}
          changePositive={isUp}
        />
        <StatCard
          label="Total Return"
          value={
            <span className="tabular" style={{ color: p.totalReturn >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
              {p.totalReturn >= 0 ? "+" : ""}{formatCurrency(p.totalReturn)}
            </span>
          }
          change={formatPercent(p.totalReturnPercent)}
          changePositive={p.totalReturn >= 0}
        />
        <StatCard
          label="Unrealized P&L"
          value={<span className="tabular" style={{ color: "var(--color-positive)" }}>{formatCurrency(p.unrealizedPnl)}</span>}
        />
        <StatCard
          label="Realized P&L"
          value={<span className="tabular" style={{ color: "var(--color-positive)" }}>{formatCurrency(p.realizedPnl)}</span>}
        />
        <StatCard
          label="Cash"
          value={<span className="tabular">{formatCurrency(p.cash)}</span>}
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Invested"
          value={<span className="tabular">{formatCurrency(p.invested)}</span>}
        />
      </div>

      {/* Chart + allocation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
          <h3 style={{ fontSize: "0.875rem", marginBottom: "0.875rem" }}>Performance (90 days)</h3>
          <PortfolioPerformanceChart height={240} />
        </div>

        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.875rem", marginBottom: "0.875rem", alignSelf: "flex-start" }}>Allocation</h3>
          <AllocationChart size={240} />
          <div style={{ marginTop: "0.75rem", width: "100%" }}>
            {[...p.positions.slice(0, 4), { symbol: "Cash", weight: (p.cash / p.totalValue) * 100 }].map((pos, i) => {
              const colors = ["#E8A838", "#26C281", "#4A9EEA", "#E05252", "#A855F7"];
              return (
                <div key={pos.symbol} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", flex: 1 }}>{pos.symbol}</span>
                  <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-text-2)" }}>
                    {pos.weight.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Holdings</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Avg Cost</th>
                <th style={{ textAlign: "right" }}>Current</th>
                <th style={{ textAlign: "right" }}>Market Value</th>
                <th style={{ textAlign: "right" }}>Day P&L</th>
                <th style={{ textAlign: "right" }}>Total P&L</th>
                <th style={{ textAlign: "right" }}>Alloc.</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {p.positions.map((pos) => (
                <tr key={pos.symbol}>
                  <td>
                    <Link href={`/market/${pos.symbol}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand)", flexShrink: 0 }}>
                        {pos.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem" }}>{pos.symbol}</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{pos.assetName.split(" ").slice(0, 2).join(" ")}</div>
                      </div>
                    </Link>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{pos.quantity}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>{formatCurrency(pos.avgCost)}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600 }}>{formatCurrency(pos.currentPrice)}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>{formatCurrency(pos.marketValue)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: pos.dayPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                      {pos.dayPnl >= 0 ? "+" : ""}{formatCurrency(pos.dayPnl)}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: pos.dayPnlPercent >= 0 ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                      {formatPercent(pos.dayPnlPercent)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: pos.unrealizedPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                      {pos.unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(pos.unrealizedPnl)}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: pos.unrealizedPnlPercent >= 0 ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                      {formatPercent(pos.unrealizedPnlPercent)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
                        <div style={{ width: `${pos.weight}%`, height: "100%", background: "var(--color-brand)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-text-3)", minWidth: 36, textAlign: "right" }}>
                        {pos.weight.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link href={`/market/${pos.symbol}`} className="btn btn-ghost btn-sm">
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
