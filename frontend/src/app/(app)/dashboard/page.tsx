"use client";

import Link from "next/link";
import {
  TrendingUp, TrendingDown, ArrowRight, Zap,
  Activity, DollarSign, Percent, BarChart3,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PriceChange, ChangeTag } from "@/components/ui/PriceChange";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioChart";
import {
  MOCK_PORTFOLIO, MOCK_INDICES, MOCK_WATCHLIST,
  MOCK_TRANSACTIONS, MOCK_AI_PORTFOLIO_INSIGHT,
  formatCurrency, formatPercent,
} from "@/lib/mock-data";

function SectionHeader({ title, href, label = "View all" }: { title: string; href?: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
      <h2 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{title}</h2>
      {href && (
        <Link
          href={href}
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-brand)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
          }}
        >
          {label} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const p = MOCK_PORTFOLIO;
  const isUp = p.dayPnl >= 0;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Page title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: 4 }}>Portfolio Overview</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", margin: 0 }}>
          Simulated portfolio · Updated just now
        </p>
      </div>

      {/* Top stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Portfolio Value"
          value={
            <span className="tabular">{formatCurrency(p.totalValue)}</span>
          }
          change={
            <PriceChange
              value={p.dayPnl}
              percent={p.dayPnlPercent}
              size="sm"
            />
          }
          changePositive={isUp}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          label="Total Return"
          value={
            <span className="tabular" style={{ color: p.totalReturn >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
              {formatCurrency(p.totalReturn)}
            </span>
          }
          change={`${formatPercent(p.totalReturnPercent)} all time`}
          changePositive={p.totalReturn >= 0}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Unrealized P&L"
          value={
            <span className="tabular" style={{ color: p.unrealizedPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
              {formatCurrency(p.unrealizedPnl)}
            </span>
          }
          change="Open positions"
          icon={<Percent size={18} />}
        />
        <StatCard
          label="Virtual Cash"
          value={<span className="tabular">{formatCurrency(p.cash)}</span>}
          change="Available to invest"
          icon={<Activity size={18} />}
        />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>

          {/* Performance chart */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <SectionHeader title="Performance (90 days)" href="/portfolio" />
            <PortfolioPerformanceChart height={220} />
          </div>

          {/* Holdings table */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <SectionHeader title="Holdings" href="/portfolio" />
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Today</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                    <th style={{ textAlign: "right" }}>P&L</th>
                    <th style={{ textAlign: "right" }}>Alloc.</th>
                  </tr>
                </thead>
                <tbody>
                  {p.positions.map((pos) => (
                    <tr key={pos.symbol}>
                      <td>
                        <Link
                          href={`/market/${pos.symbol}`}
                          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              background: "var(--color-surface-2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              color: "var(--color-brand)",
                              flexShrink: 0,
                            }}
                          >
                            {pos.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem" }}>
                              {pos.symbol}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>
                              {pos.quantity} shares
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                        {formatCurrency(pos.currentPrice)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <ChangeTag percent={pos.dayPnlPercent} />
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>
                        {formatCurrency(pos.marketValue)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8125rem",
                          color: pos.unrealizedPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        }}>
                          {pos.unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(pos.unrealizedPnl)}
                        </div>
                        <div style={{
                          fontSize: "0.6875rem",
                          color: pos.unrealizedPnlPercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        }}>
                          {formatPercent(pos.unrealizedPnlPercent)}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <div
                            style={{
                              width: 40,
                              height: 4,
                              borderRadius: 2,
                              background: "var(--color-border)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pos.weight}%`,
                                height: "100%",
                                background: "var(--color-brand)",
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-text-3)", minWidth: 32, textAlign: "right" }}>
                            {pos.weight.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <SectionHeader title="Recent Activity" href="/transactions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {MOCK_TRANSACTIONS.slice(0, 4).map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid var(--color-border-dim)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: tx.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {tx.side === "buy"
                      ? <TrendingUp size={15} style={{ color: "var(--color-positive)" }} />
                      : <TrendingDown size={15} style={{ color: "var(--color-negative)" }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)" }}>
                      {tx.side === "buy" ? "Bought" : "Sold"} {tx.symbol}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                      {tx.quantity} @ {formatCurrency(tx.price)} · {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--color-text)" }}>
                      {formatCurrency(tx.total)}
                    </div>
                    {tx.pnl !== undefined && (
                      <div style={{ fontSize: "0.75rem", color: tx.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                        {tx.pnl >= 0 ? "+" : ""}{formatCurrency(tx.pnl)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Market snapshot */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <SectionHeader title="Market" href="/market" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {MOCK_INDICES.map((idx) => (
                <div
                  key={idx.symbol}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5625rem 0",
                    borderBottom: "1px solid var(--color-border-dim)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)" }}>
                      {idx.name}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{idx.symbol}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.875rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                      {idx.value.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      color: idx.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                    }}>
                      {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Watchlist */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <SectionHeader title="Watchlist" href="/market" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {MOCK_WATCHLIST.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/market/${item.symbol}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5625rem 0",
                    borderBottom: "1px solid var(--color-border-dim)",
                    textDecoration: "none",
                    transition: "background var(--transition-fast)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "var(--color-surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.5625rem",
                        fontWeight: 700,
                        color: "var(--color-brand)",
                        flexShrink: 0,
                      }}
                    >
                      {item.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>
                        {item.symbol}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                        {item.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                      {formatCurrency(item.price)}
                    </div>
                    <div style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                      color: item.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                    }}>
                      {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* AI insight card */}
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderLeft: "3px solid var(--color-brand)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Zap size={14} style={{ color: "var(--color-brand)" }} />
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                AI Insight
              </span>
              <span style={{ marginLeft: "auto", fontSize: "0.625rem", color: "var(--color-text-3)", background: "var(--color-surface-2)", padding: "1px 5px", borderRadius: 3 }}>
                MOCK
              </span>
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)", marginBottom: 6 }}>
              {MOCK_AI_PORTFOLIO_INSIGHT.title}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", margin: 0, lineHeight: 1.6 }}>
              {MOCK_AI_PORTFOLIO_INSIGHT.summary}
            </p>
            <Link
              href="/insights"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: "0.625rem",
                fontSize: "0.8125rem",
                color: "var(--color-brand)",
                textDecoration: "none",
              }}
            >
              View full analysis <ArrowRight size={12} />
            </Link>
          </div>

          {/* Quick trade */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <BarChart3 size={15} style={{ color: "var(--color-text-3)" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Quick Trade</span>
            </div>
            <Link
              href="/market/SBIN"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.625rem",
                background: "var(--color-positive)",
                borderRadius: "var(--radius-md)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: "0.5rem",
                transition: "opacity var(--transition-fast)",
              }}
            >
              Trade SBIN
            </Link>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", textAlign: "center", margin: 0 }}>
              All trades use virtual funds only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
