"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, X, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAssets, searchAssets } from "@/lib/assets";
import { useLiveMarket } from "@/lib/live-market";
import { useAuthStore } from "@/lib/auth-store";
import {
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
  type NotificationOut,
} from "@/lib/api";

// ─── Search Modal ────────────────────────────────────────────

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { quotes } = useLiveMarket();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const assets = useAssets();
  const [active, setActive] = useState(0);
  const POPULAR = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN"];
  const results = query.trim()
    ? searchAssets(assets, query)
    : POPULAR.map((s) => assets.find((a) => a.symbol === s)).filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 1000, display: "flex", alignItems: "flex-start",
        justifyContent: "center", paddingTop: "6rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)", width: "min(560px, 92vw)",
          overflow: "hidden", boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border)",
        }}>
          <Search size={18} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Search by name, symbol or sector (e.g. Tata, bank, IT)"
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", color: "var(--color-text)", fontSize: "1rem", fontFamily: "inherit",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && results.length > 0) {
                router.push(`/market/${results[Math.min(active, results.length - 1)].symbol}`);
                onClose();
              }
            }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-3)", fontSize: "0.875rem" }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div>
              {!query && (
                <div style={{ padding: "0.5rem 1rem 0.25rem", fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Popular
                </div>
              )}
              {results.map((asset, idx) => {
                const quote = quotes[asset.symbol];
                return (
                  <Link
                    key={asset.symbol}
                    href={`/market/${asset.symbol}`}
                    onClick={onClose}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.625rem 1rem", textDecoration: "none",
                      transition: "background var(--transition-fast)",
                      background: idx === active ? "var(--color-bg-elevated)" : "transparent",
                    }}
                    onMouseEnter={() => setActive(idx)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand)", flexShrink: 0,
                    }}>
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
                        {asset.symbol}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {asset.name}
                      </div>
                    </div>
                    {quote && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {/* ₹ price using formatCurrency */}
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                          {formatCurrency(quote.price, true)}
                        </div>
                        <div style={{
                          fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                          color: quote.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        }}>
                          {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    )}
                    <span style={{
                      fontSize: "0.6875rem", padding: "2px 6px", borderRadius: 4,
                      background: "var(--color-surface-2)", color: "var(--color-text-3)",
                      flexShrink: 0,
                    }}>
                      {asset.sector}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.5rem 1rem", borderTop: "1px solid var(--color-border)",
          display: "flex", gap: "1rem", fontSize: "0.6875rem", color: "var(--color-text-3)",
        }}>
          <span><kbd style={{ background: "var(--color-surface-2)", borderRadius: 3, padding: "1px 4px" }}>↑↓</kbd> move</span>
          <span><kbd style={{ background: "var(--color-surface-2)", borderRadius: 3, padding: "1px 4px" }}>↵</kbd> open</span>
          <span><kbd style={{ background: "var(--color-surface-2)", borderRadius: 3, padding: "1px 4px" }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Ticker Strip ─────────────────────────────────────────────
// Live prices from the backend (falls back to bundled quotes if the API is unreachable)

function TickerStrip() {
  const { quotes } = useLiveMarket();
  const symbols = ["SBIN","RELIANCE","HDFCBANK","ICICIBANK","INFY","TCS","ITC","LT","BHARTIARTL","ABCAPITAL"];

  const tickers = symbols
    .map((s) => {
      const q = quotes[s];
      if (!q) return null;
      return { symbol: s, price: q.price, change: q.changePercent };
    })
    .filter(Boolean) as { symbol: string; price: number; change: number }[];

  const doubled = [...tickers, ...tickers];

  // Compact ticker price: skip decimals for large numbers
  function tickerPrice(price: number): string {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    if (price >= 1000)   return `₹${(price / 1000).toFixed(1)}K`;
    return `₹${price.toFixed(0)}`;
  }

  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        borderBottom: "1px solid var(--color-border)",
        overflow: "hidden", height: 28,
        display: "flex", alignItems: "center",
      }}
      aria-hidden="true"
    >
      <div className="ticker-track" style={{ gap: "2rem" }}>
        {doubled.map((t, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              fontSize: "0.6875rem", fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--color-text-3)", fontWeight: 600 }}>{t.symbol}</span>
            <span style={{ color: "var(--color-text-2)" }}>{tickerPrice(t.price)}</span>
            <span style={{ color: t.change >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
              {t.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const { marketOpen, status, lastUpdated, closedReason } = useLiveMarket();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = () =>
      apiGetNotifications()
        .then((n) => { if (!cancelled) setNotifications(n); })
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated]);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    apiMarkNotificationRead(id).catch(() => {});
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    apiMarkAllNotificationsRead().catch(() => {});
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <TickerStrip />
      <header style={{
        height: 52, borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-elevated)",
        display: "flex", alignItems: "center",
        padding: "0 1.25rem", gap: "1rem",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            flex: 1, maxWidth: 320,
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", padding: "0.375rem 0.75rem",
            color: "var(--color-text-3)", cursor: "pointer", fontSize: "0.8125rem",
            transition: "border-color var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-text-3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          aria-label="Search stocks"
        >
          <Search size={14} />
          <span>Search Nifty 50 stocks…</span>
          <span style={{
            marginLeft: "auto", background: "var(--color-surface-2)",
            borderRadius: 4, padding: "1px 5px",
            fontSize: "0.625rem", fontFamily: "var(--font-mono)", color: "var(--color-text-3)",
          }}>
            ⌘K
          </span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Market status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", display: "inline-block",
            background: marketOpen === false ? "var(--color-negative)" : marketOpen ? "var(--color-positive)" : "var(--color-text-3)",
          }} />
          <span style={{ color: "var(--color-text-3)" }}>
            {marketOpen === null ? "Market" : marketOpen ? "Market Open" : closedReason === "holiday" ? "Market Closed (holiday)" : "Market Closed"}
          </span>
          <span
            title="Prices come from Yahoo Finance and can be delayed by a few minutes"
            style={{
              marginLeft: 6, padding: "1px 7px", borderRadius: 999, fontSize: "0.6875rem", fontWeight: 600,
              border: "1px solid var(--color-border)",
              color: status === "live" ? "var(--color-positive)" : status === "offline" ? "var(--color-negative)" : "var(--color-text-3)",
            }}
          >
            {status === "loading"
              ? "Connecting…"
              : `${status === "live" ? "Live" : "Offline, last update"} ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST" : "none"}`}
          </span>
        </div>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifsOpen(!notifsOpen)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-2)", padding: "0.375rem",
              borderRadius: "var(--radius-md)", display: "flex",
              alignItems: "center", position: "relative",
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "var(--color-brand)", color: "var(--color-text-inv)",
                fontSize: "0.5rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {unread}
              </span>
            )}
          </button>

          {notifsOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)",
              width: 320, background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              zIndex: 200, overflow: "hidden",
            }}>
              <div style={{
                padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Notifications</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-brand)", fontSize: "0.75rem" }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {notifications.length === 0 && (
                <div style={{ padding: "1.5rem 1rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
                  No notifications yet
                </div>
              )}
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-border-dim)",
                    background: n.is_read ? "transparent" : "var(--color-brand-subtle)",
                    cursor: n.is_read ? "default" : "pointer",
                  }}
                >
                  <div style={{ fontSize: "0.8125rem", fontWeight: n.is_read ? 400 : 500, color: "var(--color-text)", marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{n.message}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
