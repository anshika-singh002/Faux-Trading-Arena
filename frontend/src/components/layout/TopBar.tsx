"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, X, TrendingUp, TrendingDown } from "lucide-react";
import { MOCK_ASSETS, MOCK_QUOTES, MOCK_NOTIFICATIONS, formatCurrency } from "@/lib/mock-data";

// ─── Search Modal ────────────────────────────────────────────

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = query.length > 0
    ? MOCK_ASSETS.filter(
        (a) =>
          a.symbol.toLowerCase().includes(query.toLowerCase()) ||
          a.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : MOCK_ASSETS.slice(0, 6);

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks, ETFs, crypto…"
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", color: "var(--color-text)", fontSize: "1rem", fontFamily: "inherit",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results.length > 0) {
                router.push(`/market/${results[0].symbol}`);
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
              {results.map((asset) => {
                const quote = MOCK_QUOTES[asset.symbol];
                return (
                  <Link
                    key={asset.symbol}
                    href={`/market/${asset.symbol}`}
                    onClick={onClose}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.625rem 1rem", textDecoration: "none",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                      textTransform: "capitalize", flexShrink: 0,
                    }}>
                      {asset.type}
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
          <span><kbd style={{ background: "var(--color-surface-2)", borderRadius: 3, padding: "1px 4px" }}>↵</kbd> select</span>
          <span><kbd style={{ background: "var(--color-surface-2)", borderRadius: 3, padding: "1px 4px" }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Ticker Strip ─────────────────────────────────────────────
// Pulls live prices from MOCK_QUOTES so they always match the app data

function TickerStrip() {
  const symbols = ["SBIN","RELIANCE","HDFCBANK","ICICIBANK","INFY","TCS","ITC","LT","BHARTIARTL","ABCAPITAL"];

  const tickers = symbols
    .map((s) => {
      const q = MOCK_QUOTES[s];
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
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;

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
          <span>Search stocks, ETFs, crypto…</span>
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
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-positive)", display: "inline-block" }} />
          <span style={{ color: "var(--color-text-3)" }}>Market Open</span>
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
                <button onClick={() => setNotifsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)" }}>
                  <X size={14} />
                </button>
              </div>
              {MOCK_NOTIFICATIONS.slice(0, 5).map((n) => (
                <div key={n.id} style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--color-border-dim)",
                  background: n.isRead ? "transparent" : "var(--color-brand-subtle)",
                }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: n.isRead ? 400 : 500, color: "var(--color-text)", marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{n.message}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
