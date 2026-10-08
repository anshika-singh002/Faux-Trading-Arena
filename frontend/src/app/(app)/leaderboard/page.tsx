"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { apiGetLeaderboard } from "@/lib/api";

interface Entry {
  rank: number;
  username: string;
  displayName: string;
  portfolioValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      apiGetLeaderboard()
        .then((rows) => {
          setEntries(rows.map((r) => ({
            rank: r.rank, username: r.username, displayName: r.display_name,
            portfolioValue: r.portfolio_value, totalReturn: r.total_return,
            totalReturnPercent: r.total_return_percent, winRate: r.win_rate,
            totalTrades: r.total_trades, isCurrentUser: r.is_current_user,
          })));
          setError("");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load the leaderboard"))
        .finally(() => setLoading(false));
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Leaderboard</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
          Ranked by total portfolio return, with open positions valued at live market prices.
        </p>
      </div>

      {error && (
        <div style={{ color: "var(--color-negative)", fontSize: "0.8125rem", marginBottom: "1rem" }}>{error}</div>
      )}
      {!loading && !error && entries.length === 0 && (
        <div style={{ color: "var(--color-text-3)", fontSize: "0.875rem", marginBottom: "1rem" }}>No traders yet.</div>
      )}

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
                  Win rate: {entry.winRate}%
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
                  <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: entry.totalReturn >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                    {entry.totalReturn >= 0 ? "+" : ""}{formatCurrency(entry.totalReturn)}
                  </div>
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
