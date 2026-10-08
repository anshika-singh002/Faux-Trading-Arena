"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Package } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import { apiGetOrders, type OrderOut } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { OrderStatus } from "@/lib/types";

const TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All",       value: "all" },
  { label: "Open",      value: "open" },
  { label: "Filled",    value: "filled" },
  { label: "Cancelled", value: "cancelled" },
];

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders]     = useState<OrderOut[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"all" | OrderStatus>("all");

  async function load(initial = false) {
    if (!isAuthenticated) return;
    if (!initial) setLoading(true);
    try { setOrders(await apiGetOrders()); }
    catch { setOrders([]); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const id = setTimeout(() => load(), 0);
    return () => clearTimeout(id);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = tab === "all" ? orders : orders.filter(o => o.status === tab);
  const count = (s: OrderStatus) => orders.filter(o => o.status === s).length;

  const Sk = () => (
    <tr>
      {[140, 48, 56, 64, 80, 80, 80, 70, 80].map((w, i) => (
        <td key={i} style={{ textAlign: i > 2 ? "right" : "left" }}>
          <div style={{ height: 14, width: w, borderRadius: 4, background: "var(--color-border)", marginLeft: i > 2 ? "auto" : 0 }} className="skeleton" />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Orders</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>Your virtual order history</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => load()} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.4375rem 0.75rem", cursor: "pointer", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <Link href="/market" style={{ background: "var(--color-brand)", color: "var(--color-text-inv)", padding: "0.4375rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
            + New Order
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "0.5rem 1rem", fontSize: "0.875rem",
              color: tab === value ? "var(--color-text)" : "var(--color-text-3)",
              fontWeight: tab === value ? 600 : 400,
              borderBottom: `2px solid ${tab === value ? "var(--color-brand)" : "transparent"}`,
              marginBottom: -1,
              transition: "all var(--transition-fast)",
            }}
          >
            {label}
            {value !== "all" && !loading && count(value) > 0 && (
              <span style={{ marginLeft: 6, fontSize: "0.6875rem", background: "var(--color-surface-2)", color: "var(--color-text-3)", padding: "1px 5px", borderRadius: 10 }}>
                {count(value)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {!loading && filtered.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <Package size={36} style={{ color: "var(--color-text-3)", opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
            <p style={{ color: "var(--color-text-3)", marginBottom: "1rem" }}>
              {tab === "all" ? "No orders yet" : `No ${tab} orders`}
            </p>
            <Link href="/market" style={{ color: "var(--color-brand)", fontSize: "0.875rem" }}>Browse market →</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Side</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Limit</th>
                <th style={{ textAlign: "right" }}>Fill Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(5).fill(0).map((_, i) => <Sk key={i} />)
                : filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/market/${o.symbol}`} style={{ fontWeight: 600, color: "var(--color-text)", textDecoration: "none", fontSize: "0.9rem" }}>
                      {o.symbol}
                    </Link>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
                      background: o.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                      color: o.side === "buy" ? "var(--color-positive)" : "var(--color-negative)",
                    }}>
                      {o.side}
                    </span>
                  </td>
                  <td style={{ color: "var(--color-text-2)", fontSize: "0.8125rem", textTransform: "capitalize" }}>{o.order_type}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{o.quantity}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>
                    {o.price ? formatCurrency(o.price) : <span style={{ color: "var(--color-text-3)" }}>MKT</span>}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                    {o.avg_fill_price ? formatCurrency(o.avg_fill_price) : <span style={{ color: "var(--color-text-3)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>
                    {formatCurrency(o.estimated_total)}
                  </td>
                  <td><OrderStatusBadge status={o.status as OrderStatus} /></td>
                  <td style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                    {new Date(o.created_at).toLocaleDateString("en-IN")}
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
