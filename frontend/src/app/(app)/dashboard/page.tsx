"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, ShieldAlert, Shield, TrendingUp as SellIcon } from "lucide-react";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useLiveMarket } from "@/lib/live-market";
import {
  apiGetPortfolio, apiGetTransactions, apiGetPortfolioRisk, apiModel1PredictAll,
  type PortfolioSummary, type TransactionOut, type RiskSummary, type Model1Prediction,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [portfolio, setPortfolio]       = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [risk, setRisk]                 = useState<RiskSummary | null>(null);
  const [predictions, setPredictions]   = useState<Record<string, Model1Prediction>>({});
  const [loading, setLoading]           = useState(true);
  const { indices } = useLiveMarket();

  const [error, setError]           = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    // Refreshed every 30s so portfolio value and P&L follow live prices.
    // Each call is independent: one failing doesn't blank the whole page.
    async function load() {
      const [p, txs, r] = await Promise.allSettled([apiGetPortfolio(), apiGetTransactions(), apiGetPortfolioRisk()]);
      if (cancelled) return;
      if (p.status === "fulfilled") { setPortfolio(p.value); setError(""); }
      else setError(p.reason instanceof Error ? p.reason.message : "Could not reach the server");
      if (txs.status === "fulfilled") setTransactions(txs.value);
      if (r.status === "fulfilled") setRisk(r.value);
      setLoading(false);
    }

    load();
    const id = setInterval(load, 30_000);

    // AI signals are optional: the dashboard works without them
    const loadSignals = () =>
      apiModel1PredictAll()
        .then((r) => { if (!cancelled) setPredictions(Object.fromEntries(r.predictions.map((p) => [p.symbol, p]))); })
        .catch(() => {});
    loadSignals();
    const signalId = setInterval(loadSignals, 5 * 60_000);

    return () => { cancelled = true; clearInterval(id); clearInterval(signalId); };
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
          Here&apos;s your virtual portfolio overview
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-negative)", background: "var(--color-negative-dim)",
          color: "var(--color-negative)", fontSize: "0.8125rem",
        }}>
          Couldn&rsquo;t load your portfolio ({error}). {portfolio ? "Showing the last data we received." : "Is the backend running?"}
        </div>
      )}

      {/* ── 3 stat tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            label: "Portfolio Value",
            value: loading ? null : !portfolio && error ? "—" : formatCurrency(totalValue),
            sub: loading ? null : !portfolio && error ? "unavailable" : `${formatCurrency(cash)} cash available`,
            neutral: true,
          },
          {
            label: "Total Return",
            value: loading ? null : !portfolio ? "—" : `${totalReturn >= 0 ? "+" : ""}${formatCurrency(totalReturn)}`,
            sub: loading ? null : !portfolio ? "unavailable" : `${formatPercent(totalReturnPct)} all time`,
            positive: totalReturn >= 0,
            negative: totalReturn < 0,
          },
          {
            label: "Unrealized P&L",
            value: loading ? null : !portfolio ? "—" : `${unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(unrealizedPnl)}`,
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

          {/* ── Selling Opportunities (XGBoost) ── */}
          {(() => {
            if (loading || positions.length === 0) return null;
            // Held stocks the XGBoost model expects to fall over the next 5 days
            const sellOpps = positions
              .map(pos => {
                const pred = predictions[pos.symbol];
                if (!pred || pred.direction !== "DOWN") return null;
                return {
                  symbol: pos.symbol, quantity: pos.quantity,
                  currentPrice: pos.current_price, unrealisedPct: pos.unrealized_pnl_percent,
                  pDown: pred.p_down, predictedPrice: pred.predicted_price,
                };
              })
              .filter(Boolean) as { symbol: string; quantity: number; currentPrice: number; unrealisedPct: number; pDown: number; predictedPrice: number }[];

            if (sellOpps.length === 0) return null;

            return (
              <div style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-negative)",
                borderLeft: "4px solid var(--color-negative)",
                borderRadius: "var(--radius-xl)", padding: "1.25rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                  <TrendingDown size={17} style={{ color: "var(--color-negative)" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>AI Sell Signals</span>
                  <span style={{
                    marginLeft: "auto", fontSize: "0.6875rem", fontWeight: 700,
                    padding: "2px 8px", borderRadius: "var(--radius-full)",
                    background: "var(--color-negative-dim)", color: "var(--color-negative)",
                  }}>
                    {sellOpps.length} holding{sellOpps.length > 1 ? "s" : ""} flagged
                  </span>
                </div>

                {sellOpps.map(opp => (
                  <div key={opp.symbol} style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.75rem 0", borderBottom: "1px solid var(--color-border-dim)",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                      background: "var(--color-negative-dim)",
                      border: "1px solid var(--color-negative)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.5625rem", fontWeight: 800, color: "var(--color-negative)",
                    }}>
                      {opp.symbol.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{opp.symbol}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                        You hold {opp.quantity} shares · model sees{" "}
                        <span style={{ color: "var(--color-negative)", fontWeight: 600 }}>{(opp.pDown * 100).toFixed(0)}% chance of falling</span>
                        {" "}(5-day target {formatCurrency(opp.predictedPrice)})
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text)" }}>
                        {formatCurrency(opp.currentPrice)}
                      </div>
                      {opp.unrealisedPct !== 0 && (
                        <div style={{ fontSize: "0.6875rem", color: opp.unrealisedPct >= 0 ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                          {opp.unrealisedPct >= 0 ? "+" : ""}{opp.unrealisedPct.toFixed(1)}% overall
                        </div>
                      )}
                    </div>
                    <Link href={`/market/${opp.symbol}`} style={{
                      padding: "0.4375rem 0.875rem", borderRadius: "var(--radius-md)",
                      background: "var(--color-negative)", color: "#fff",
                      fontWeight: 700, fontSize: "0.8125rem", textDecoration: "none",
                      flexShrink: 0,
                    }}>
                      Sell →
                    </Link>
                  </div>
                ))}

                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "0.875rem", marginBottom: 0 }}>
                  Signals come from an XGBoost model trained on historical data. Educational only — not financial advice. Virtual funds only.
                </p>
              </div>
            );
          })()}

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

          {/* ── Risky Stocks Alert ── */}
          {!loading && risk && risk.has_risk && positions.length > 0 && (
            <div style={{
              background: "var(--color-surface)", border: `1px solid ${risk.overall_risk === "high" ? "var(--color-negative)" : "var(--color-warning)"}`,
              borderLeft: `4px solid ${risk.overall_risk === "high" ? "var(--color-negative)" : "var(--color-warning)"}`,
              borderRadius: "var(--radius-xl)", padding: "1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                {risk.overall_risk === "high"
                  ? <ShieldAlert size={17} style={{ color: "var(--color-negative)" }} />
                  : <AlertTriangle size={17} style={{ color: "var(--color-warning)" }} />
                }
                <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Portfolio Risk Alert</span>
                <span style={{
                  marginLeft: "auto", fontSize: "0.6875rem", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "var(--radius-full)",
                  background: risk.overall_risk === "high" ? "var(--color-negative-dim)" : "var(--color-warning-dim)",
                  color: risk.overall_risk === "high" ? "var(--color-negative)" : "var(--color-warning)",
                  textTransform: "uppercase",
                }}>
                  {risk.overall_risk} risk
                </span>
              </div>

              {risk.risky_positions.map((rp) => (
                <div key={rp.symbol} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.625rem 0", borderBottom: "1px solid var(--color-border-dim)" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: rp.risk_level === "high" ? "var(--color-negative-dim)" : "var(--color-warning-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.625rem", fontWeight: 800,
                    color: rp.risk_level === "high" ? "var(--color-negative)" : "var(--color-warning)",
                  }}>
                    {rp.symbol.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>{rp.symbol}</span>
                      <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{rp.weight}% of portfolio</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: rp.risk_level === "high" ? "var(--color-negative)" : "var(--color-warning)", marginTop: 2 }}>
                      {rp.risk_reason}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: rp.unrealized_pnl_percent >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                      {rp.unrealized_pnl_percent >= 0 ? "+" : ""}{rp.unrealized_pnl_percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}

              {risk.warnings.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  {risk.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", color: "var(--color-text-2)", display: "flex", gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={12} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} /> {w}
                    </div>
                  ))}
                </div>
              )}

              <Link href="/portfolio" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none" }}>
                Review portfolio <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {!loading && risk && !risk.has_risk && positions.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-positive-dim)", borderLeft: "4px solid var(--color-positive)", borderRadius: "var(--radius-xl)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Shield size={16} style={{ color: "var(--color-positive)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-positive)" }}>Portfolio looks healthy</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>No high-risk positions or concentration issues detected.</div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Indices</span>
              <Link href="/market" style={{ fontSize: "0.8125rem", color: "var(--color-brand)", textDecoration: "none" }}>Market →</Link>
            </div>
            {indices.map((idx) => (
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
