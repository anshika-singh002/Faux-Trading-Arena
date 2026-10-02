"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioChart";
import { MOCK_INDICES, formatCurrency, formatPercent } from "@/lib/mock-data";
import { apiGetPortfolio, apiGetTransactions, type PortfolioSummary, type TransactionOut } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [portfolio, setPortfolio]     = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([apiGetPortfolio(), apiGetTransactions()])
      .then(([p, txs]) => { setPortfolio(p); setTransactions(txs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const cash = portfolio?.cash ?? user?.virtualBalance ?? 0;
  const totalValue = portfolio?.total_value ?? cash;
  const totalReturn = portfolio?.total_return ?? 0;
  const totalReturnPct = portfolio?.total_return_percent ?? 0;
  const unrealizedPnl = portfolio?.unrealized_pnl ?? 0;
  const positions = portfolio?.positions ?? [];

  const Sk = ({ w = 80, h = 16 }: { w?: number | string; h?: number }) => (
    <div style={{ width: w, height: h, borderRadius: 4, background: "var(--color-border)" }} className="skeleton" />
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          {user ? `Hey, ${user.displayName.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
          Here's your virtual portfolio overview
        </p>
      </div>

      {/* ── 3 stat tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            label: "Portfolio Value",
            value: loading ? null : formatCurrency(totalValue),
            sub: loading ? null : `${formatCurrency(cash)} cash available`,
            neutral: true,
          },
          {
            label: "Total Return",
            value: loading ? null : `${totalReturn >= 0 ? "+" : ""}${formatCurrency(totalReturn)}`,
            sub: loading ? null : `${formatPercent(totalReturnPct)} all time`,
            positive: totalReturn >= 0,
            negative: totalReturn < 0,
          },
          {
            label: "Unrealized P&L",
            value: loading ? null : `${unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(unrealizedPnl)}`,
            sub: `${positions.length} open position${positions.length !== 1 ? "s" : ""}`,
            positive: unrealizedPnl >= 0,
            negative: unrealizedPnl < 0,
          },
        ].map(({ label, value, sub, neutral, positive, negative }) => (
          <div key={label} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)", padding: "1.5rem",
          }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 500, marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </div>
            {value === null ? (
              <><Sk w="60%" h={28} /><div style={{ marginTop: 8 }}><Sk w="50%" h={13} /></div></>
            ) : (
              <>
                <div style={{
                  fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                  color: positive ? "var(--color-positive)" : negative ? "var(--color-negative)" : "var(--color-text)",
                  letterSpacing: "-0.02em", lineHeight: 1.2,
                }}>
                  {value}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginTop: "0.375rem" }}>{sub}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>

          {/* Performance chart */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Performance</span>
              <Link href="/portfolio" style={{ fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <PortfolioPerformanceChart height={200} />
          </div>

          {/* Holdings */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Holdings</span>
              <Link href="/portfolio" style={{ fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => <Sk key={i} w="100%" h={44} />)}
              </div>
            ) : positions.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center" }}>
                <p style={{ color: "var(--color-text-3)", marginBottom: "0.75rem" }}>No positions yet</p>
                <Link href="/market" style={{ color: "var(--color-brand)", fontSize: "0.875rem" }}>Browse market →</Link>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: "0.5rem", padding: "0 0.25rem 0.625rem", borderBottom: "1px solid var(--color-border-dim)" }}>
                  {["Stock", "Price", "Value", "P&L"].map((h, i) => (
                    <span key={h} style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
                {positions.map((pos) => (
                  <div key={pos.symbol} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: "0.5rem", padding: "0.75rem 0.25rem", borderBottom: "1px solid var(--color-border-dim)", alignItems: "center" }}>
                    <Link href={`/market/${pos.symbol}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{pos.symbol}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{pos.quantity} shares</div>
                    </Link>
                    <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatCurrency(pos.current_price)}</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>{formatCurrency(pos.market_value)}</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: pos.unrealized_pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {pos.unrealized_pnl >= 0 ? "+" : ""}{formatCurrency(pos.unrealized_pnl)}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: pos.unrealized_pnl_percent >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {formatPercent(pos.unrealized_pnl_percent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent trades */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Recent Trades</span>
              <Link href="/transactions" style={{ fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => <Sk key={i} w="100%" h={40} />)}
              </div>
            ) : transactions.length === 0 ? (
              <p style={{ color: "var(--color-text-3)", fontSize: "0.875rem", margin: 0 }}>No trades yet. Place your first trade.</p>
            ) : (
              transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.625rem 0", borderBottom: "1px solid var(--color-border-dim)" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: tx.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {tx.side === "buy"
                      ? <TrendingUp size={14} style={{ color: "var(--color-positive)" }} />
                      : <TrendingDown size={14} style={{ color: "var(--color-negative)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
                      {tx.side === "buy" ? "Bought" : "Sold"} {tx.symbol}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                      {tx.quantity} shares · {new Date(tx.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)" }}>
                    {formatCurrency(tx.total)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Market indices */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Indices</span>
              <Link href="/market" style={{ fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none" }}>Market →</Link>
            </div>
            {MOCK_INDICES.map((idx) => (
              <div key={idx.symbol} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border-dim)" }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)" }}>{idx.name}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{idx.symbol}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.875rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{idx.value.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: idx.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                    {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { label: "Browse stocks", href: "/market", accent: false },
                { label: "View AI signals", href: "/insights", accent: false },
                { label: "Read market news", href: "/news-analysis", accent: false },
              ].map(({ label, href }) => (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.625rem 0.875rem",
                  background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)",
                  color: "var(--color-text-2)", textDecoration: "none", fontSize: "0.875rem",
                  transition: "color var(--transition-fast)",
                }}>
                  {label}
                  <ArrowRight size={14} style={{ color: "var(--color-text-3)" }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
