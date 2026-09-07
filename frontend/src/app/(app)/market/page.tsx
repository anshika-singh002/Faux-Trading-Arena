"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Flame, BarChart2, Eye } from "lucide-react";
import {
  MOCK_ASSETS, MOCK_QUOTES, MOCK_GAINERS, MOCK_LOSERS,
  MOCK_INDICES, MOCK_WATCHLIST,
  formatCurrency, formatVolume,
} from "@/lib/mock-data";

type SectorFilter = "All" | "Financial" | "Technology" | "Energy" | "Industrials" | "Consumer Staples" | "Communication";

const SECTORS: SectorFilter[] = ["All", "Financial", "Technology", "Energy", "Industrials", "Consumer Staples", "Communication"];

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");
  const [activeTab, setActiveTab] = useState<"all" | "gainers" | "losers" | "watchlist">("all");

  const watchlistSymbols = new Set(MOCK_WATCHLIST.map((w) => w.symbol));

  const filtered = MOCK_ASSETS.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    const matchesSector =
      sector === "All" ||
      (a.sector?.toLowerCase().includes(sector.toLowerCase()));
    return matchesSearch && matchesSector;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.375rem" }}>Market</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1.5rem" }}>
        Explore Indian stocks with real market data simulation.
      </p>

      {/* Market indices row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {MOCK_INDICES.slice(0, 6).map((idx) => (
          <div
            key={idx.symbol}
            className="surface"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "0.75rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 2 }}>{idx.name}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
              {idx.value.toLocaleString()}
            </div>
            <div style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: idx.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
              marginTop: 2,
            }}>
              {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* Movers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Gainers */}
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
            <Flame size={15} style={{ color: "var(--color-positive)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Top Gainers</span>
          </div>
          {MOCK_GAINERS.map((m) => (
            <Link
              key={m.symbol}
              href={`/market/${m.symbol}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--color-border-dim)",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "var(--color-surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    color: "var(--color-positive)",
                    flexShrink: 0,
                  }}
                >
                  {m.symbol.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>{m.symbol}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{m.name}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                  {formatCurrency(m.price)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>
                  +{m.changePercent.toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Losers */}
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
            <TrendingDown size={15} style={{ color: "var(--color-negative)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Top Losers</span>
          </div>
          {MOCK_LOSERS.map((m) => (
            <Link
              key={m.symbol}
              href={`/market/${m.symbol}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--color-border-dim)",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "var(--color-surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    color: "var(--color-negative)",
                    flexShrink: 0,
                  }}
                >
                  {m.symbol.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>{m.symbol}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{m.name}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                  {formatCurrency(m.price)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                  {m.changePercent.toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Search & filter */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {/* Header controls */}
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input
              className="input-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name…"
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Sector pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid",
                  borderColor: sector === s ? "var(--color-brand)" : "var(--color-border)",
                  background: sector === s ? "var(--color-brand-muted)" : "transparent",
                  color: sector === s ? "var(--color-brand)" : "var(--color-text-3)",
                  fontSize: "0.75rem",
                  fontWeight: sector === s ? 600 : 400,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Asset</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>24h Change</th>
                <th style={{ textAlign: "right" }}>Volume</th>
                <th style={{ textAlign: "right" }}>Market Cap</th>
                <th style={{ textAlign: "center" }}>52W</th>
                <th style={{ textAlign: "center" }}>Watch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, i) => {
                const q = MOCK_QUOTES[asset.symbol];
                if (!q) return null;
                const isWatched = watchlistSymbols.has(asset.symbol);
                const range52 = q.week52High && q.week52Low
                  ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
                  : 50;

                return (
                  <tr key={asset.symbol}>
                    <td style={{ color: "var(--color-text-3)", fontSize: "0.75rem", width: 32 }}>
                      {i + 1}
                    </td>
                    <td>
                      <Link
                        href={`/market/${asset.symbol}`}
                        style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "var(--color-surface-2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            color: "var(--color-brand)",
                            flexShrink: 0,
                          }}
                        >
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem" }}>{asset.symbol}</div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{asset.name}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                      {formatCurrency(q.price)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{
                        color: q.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                      }}>
                        {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                      </div>
                      <div style={{
                        fontSize: "0.6875rem",
                        color: q.change >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        fontFamily: "var(--font-mono)",
                      }}>
                        {q.change >= 0 ? "+" : ""}{q.change.toFixed(2)}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-text-2)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                      {formatVolume(q.volume)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-text-2)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                      {q.marketCap ? formatCurrency(q.marketCap, true) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {q.week52Low && q.week52High ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div
                            style={{
                              width: 64,
                              height: 4,
                              borderRadius: 2,
                              background: "var(--color-border)",
                              position: "relative",
                              overflow: "visible",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: `${Math.min(95, Math.max(2, range52))}%`,
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--color-brand)",
                              }}
                            />
                            <div
                              style={{
                                width: `${range52}%`,
                                height: "100%",
                                background: "var(--color-brand)",
                                opacity: 0.3,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "0.5625rem", color: "var(--color-text-3)", fontFamily: "var(--font-mono)" }}>
                            {formatCurrency(q.week52Low, true)} – {formatCurrency(q.week52High, true)}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: isWatched ? "var(--color-brand)" : "var(--color-text-3)",
                          padding: 4,
                        }}
                        title={isWatched ? "In watchlist" : "Add to watchlist"}
                        aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Eye size={15} fill={isWatched ? "var(--color-brand)" : "none"} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
