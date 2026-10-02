"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { apiGetTransactions, type TransactionOut } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function TransactionsPage() {
  const { isAuthenticated } = useAuthStore();
  const [txs, setTxs]       = useState<TransactionOut[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!isAuthenticated) return;
    setLoading(true);
    try { setTxs(await apiGetTransactions()); }
    catch { setTxs([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const Sk = () => (
    <tr>
      {[140, 48, 60, 80, 60, 90, 70, 90].map((w, i) => (
        <td key={i} style={{ textAlign: i > 1 ? "right" : "left" }}>
          <div style={{ height: 14, width: w, borderRadius: 4, background: "var(--color-border)", marginLeft: i > 1 ? "auto" : 0 }} className="skeleton" />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Transactions</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>Filled trade history</p>
        </div>
        <button onClick={load} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.4375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {!loading && txs.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <ArrowDownLeft size={36} style={{ color: "var(--color-text-3)", opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
            <p style={{ color: "var(--color-text-3)", marginBottom: "1rem" }}>No transactions yet</p>
            <Link href="/market" style={{ color: "var(--color-brand)", fontSize: "0.875rem" }}>Place your first trade →</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Stock</th>
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
              {loading
                ? Array(5).fill(0).map((_, i) => <Sk key={i} />)
                : txs.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <Link href={`/market/${tx.symbol}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: tx.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {tx.side === "buy"
                          ? <ArrowDownLeft size={13} style={{ color: "var(--color-positive)" }} />
                          : <ArrowUpRight size={13} style={{ color: "var(--color-negative)" }} />}
                      </div>
                      <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9rem" }}>{tx.symbol}</span>
                    </Link>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
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
                    {tx.realized_pnl != null ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: tx.realized_pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {tx.realized_pnl >= 0 ? "+" : ""}{formatCurrency(tx.realized_pnl)}
                      </span>
                    ) : <span style={{ color: "var(--color-text-3)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                    {new Date(tx.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
