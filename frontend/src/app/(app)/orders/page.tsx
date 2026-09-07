"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { MOCK_ORDERS, formatCurrency } from "@/lib/mock-data";
import type { OrderStatus } from "@/lib/types";

const STATUS_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Filled", value: "filled" },
  { label: "Cancelled", value: "cancelled" },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const orders = MOCK_ORDERS.filter((o) =>
    statusFilter === "all" || o.status === statusFilter
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Orders</h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
            View and manage your virtual orders
          </p>
        </div>
        <Link href="/market" className="btn btn-primary btn-sm">
          + New Order
        </Link>
      </div>

      {/* Status tabs */}
      <div className="tab-nav" style={{ marginBottom: "1.25rem" }}>
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`tab-item ${statusFilter === value ? "active" : ""}`}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            {label}
            {value !== "all" && (
              <span style={{
                marginLeft: 6,
                fontSize: "0.6875rem",
                background: "var(--color-surface-2)",
                color: "var(--color-text-3)",
                padding: "1px 5px",
                borderRadius: "var(--radius-full)",
              }}>
                {MOCK_ORDERS.filter(o => o.status === value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {orders.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <List size={32} style={{ color: "var(--color-text-3)", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--color-text-3)" }}>No orders found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Filled @ </th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      href={`/market/${order.symbol}`}
                      style={{ fontWeight: 600, color: "var(--color-text)", textDecoration: "none" }}
                    >
                      {order.symbol}
                    </Link>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{order.assetName.split(" ").slice(0, 2).join(" ")}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: order.side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                      color: order.side === "buy" ? "var(--color-positive)" : "var(--color-negative)",
                      textTransform: "uppercase",
                    }}>
                      {order.side}
                    </span>
                  </td>
                  <td style={{ color: "var(--color-text-2)", textTransform: "capitalize", fontSize: "0.8125rem" }}>
                    {order.type}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                    {order.quantity}
                    {order.filledQuantity < order.quantity && order.filledQuantity > 0 && (
                      <span style={{ color: "var(--color-text-3)", fontSize: "0.6875rem" }}>
                        {" "}({order.filledQuantity} filled)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>
                    {order.price ? formatCurrency(order.price) : "MKT"}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
                    {order.avgFillPrice ? formatCurrency(order.avgFillPrice) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 500 }}>
                    {formatCurrency(order.estimatedTotal)}
                  </td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                    <div style={{ fontSize: "0.6875rem" }}>
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {order.status === "open" ? (
                      <button
                        style={{
                          background: "none",
                          border: "1px solid var(--color-border)",
                          borderRadius: 4,
                          padding: "3px 8px",
                          cursor: "pointer",
                          color: "var(--color-negative)",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        aria-label="Cancel order"
                      >
                        <X size={11} /> Cancel
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-text-3)", fontSize: "0.75rem" }}>—</span>
                    )}
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
