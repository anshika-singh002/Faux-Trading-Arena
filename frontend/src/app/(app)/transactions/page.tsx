"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { MOCK_TRANSACTIONS, formatCurrency } from "@/lib/mock-data";

export default function TransactionsPage() {
  const txs = MOCK_TRANSACTIONS;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Transactions</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1.5rem" }}>
        Full history of filled trades
      </p>

      <div className="surface" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Side</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Fees</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "right" }}>P&L</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <Link href={`/market/${tx.symbol}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: tx.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {tx.side === "buy"
                        ? <ArrowDownLeft size={14} style={{ color: "var(--color-positive)" }} />
                        : <ArrowUpRight size={14} style={{ color: "var(--color-negative)" }} />
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem" }}>{tx.symbol}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{tx.assetName.split(" ").slice(0, 2).join(" ")}</div>
                    </div>
                  </Link>
                </td>
                <td>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
                    background: tx.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                    color: tx.side === "buy" ? "var(--color-positive)" : "var(--color-negative)",
                  }}>
                    {tx.side}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{tx.quantity}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>{formatCurrency(tx.price)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-3)" }}>{formatCurrency(tx.fees)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>{formatCurrency(tx.total)}</td>
                <td style={{ textAlign: "right" }}>
                  {tx.pnl !== undefined ? (
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: tx.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                    }}>
                      {tx.pnl >= 0 ? "+" : ""}{formatCurrency(tx.pnl)}
                    </span>
                  ) : <span style={{ color: "var(--color-text-3)" }}>—</span>}
                </td>
                <td style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                  {new Date(tx.createdAt).toLocaleDateString()}
                  <div style={{ fontSize: "0.6875rem" }}>
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
