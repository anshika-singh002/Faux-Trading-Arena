"use client";

import { Shield } from "lucide-react";
import { MOCK_LEADERBOARD, formatCurrency, formatPercent } from "@/lib/mock-data";
import { useAuthStore } from "@/lib/auth-store";

export default function LeaderboardPage() {
  const top3 = MOCK_LEADERBOARD.slice(0, 3);
  const rest = MOCK_LEADERBOARD.slice(3);
  const { user } = useAuthStore();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Leaderboard</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
          Ranked by risk-adjusted performance. Raw returns alone don't determine placement.
        </p>
      </div>

      {/* Scoring note */}
      <div
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "0.875rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <Shield size={15} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-2)" }}>
          <strong style={{ color: "var(--color-text)" }}>Risk-Aware Scoring:</strong>{" "}
          Rankings weigh Sharpe ratio, win rate, and total return equally — not just raw P&L.
          Making 50% with excessive risk scores lower than 30% with disciplined risk management.
        </div>
      </div>

      {/* Top 3 podium */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[top3[1], top3[0], top3[2]].map((entry, podiumPos) => {
          if (!entry) return null;
          const heights = ["140px", "170px", "120px"];
          const medals = ["🥈", "🏆", "🥉"];
          const borderColors = ["#C0C0C0", "#E8A838", "#CD7F32"];
          const order = [2, 1, 3];

          return (
            <div
              key={entry.rank}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {/* Card */}
              <div
                style={{
                  width: "100%",
                  height: heights[podiumPos],
                  background: entry.isCurrentUser ? "var(--color-brand-subtle)" : "var(--color-surface)",
                  border: `1px solid ${entry.isCurrentUser ? "var(--color-brand)" : borderColors[podiumPos]}`,
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{medals[podiumPos]}</div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--color-surface-2)",
                    border: `2px solid ${borderColors[podiumPos]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: entry.isCurrentUser ? "var(--color-brand)" : "var(--color-text)",
                    marginBottom: 8,
                  }}
                >
                  {entry.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text)", marginBottom: 2 }}>
                  {entry.isCurrentUser ? (user?.username ?? entry.username) : entry.displayName}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: "var(--color-positive)" }}>
                  {formatPercent(entry.totalReturnPercent)}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>
                  Sharpe: {entry.sharpeRatio.toFixed(2)}
                </div>
              </div>

              {/* Podium base */}
              <div
                style={{
                  width: "100%",
                  height: 32,
                  background: borderColors[podiumPos],
                  opacity: 0.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "1rem", fontWeight: 900, opacity: 5, color: "white" }}>#{order[podiumPos]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of table */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trader</th>
              <th style={{ textAlign: "right" }}>Portfolio Value</th>
              <th style={{ textAlign: "right" }}>Total Return</th>
              <th style={{ textAlign: "right" }}>Sharpe</th>
              <th style={{ textAlign: "right" }}>Win Rate</th>
              <th style={{ textAlign: "right" }}>Trades</th>
            </tr>
          </thead>
          <tbody>
            {[...top3, ...rest].map((entry) => (
              <tr
                key={entry.rank}
                style={{
                  background: entry.isCurrentUser ? "var(--color-brand-subtle)" : undefined,
                }}
              >
                <td style={{ fontWeight: 700, width: 40 }}>
                  <span style={{
                    color: entry.rank <= 3
                      ? ["#E8A838", "#C0C0C0", "#CD7F32"][entry.rank - 1]
                      : "var(--color-text-3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                  }}>
                    #{entry.rank}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: entry.isCurrentUser ? "var(--color-brand-muted)" : "var(--color-surface-2)",
                        border: `1px solid ${entry.isCurrentUser ? "var(--color-brand)" : "var(--color-border)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: entry.isCurrentUser ? "var(--color-brand)" : "var(--color-text-2)",
                        flexShrink: 0,
                      }}
                    >
                      {entry.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 4 }}>
                        {entry.isCurrentUser ? (user?.username ?? entry.username) : entry.displayName}
                        {entry.isCurrentUser && (
                          <span style={{ fontSize: "0.625rem", background: "var(--color-brand)", color: "var(--color-text-inv)", padding: "1px 5px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>
                            YOU
                          </span>
                        )}
                        {entry.badge && <span>{entry.badge}</span>}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>@{entry.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600 }}>
                  {formatCurrency(entry.portfolioValue)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-positive)" }}>
                    {formatPercent(entry.totalReturnPercent)}
                  </div>
                  <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--color-positive)" }}>
                    +{formatCurrency(entry.totalReturn)}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: entry.sharpeRatio >= 2 ? "var(--color-positive)" : entry.sharpeRatio >= 1 ? "var(--color-text)" : "var(--color-warning)",
                  }}>
                    {entry.sharpeRatio.toFixed(2)}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: entry.winRate >= 60 ? "var(--color-positive)" : "var(--color-text-2)" }}>
                  {entry.winRate}%
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>
                  {entry.totalTrades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
