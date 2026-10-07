"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Flame, Eye } from "lucide-react";
import {
  MOCK_ASSETS, MOCK_QUOTES, MOCK_INDICES, MOCK_WATCHLIST,
  formatCurrency, formatVolume,
} from "@/lib/mock-data";

type SectorFilter = "All" | "Financial" | "Technology" | "Energy" | "Industrials" | "Consumer Staples" | "Communication";
const SECTORS: SectorFilter[] = ["All", "Financial", "Technology", "Energy", "Industrials", "Consumer Staples", "Communication"];

// ─── Build gainers/losers dynamically from MOCK_QUOTES ───────────────────────
// Only shows stocks that are actually positive as gainers, actually negative as losers.
// Change display uses proper − sign (not +-).

function formatChange(pct: number): string {
  if (pct > 0) return `+${pct.toFixed(2)}%`;
  return `${pct.toFixed(2)}%`; // toFixed already includes the − for negatives
}

const ALL_MOVERS = MOCK_ASSETS.map((a) => {
  const q = MOCK_QUOTES[a.symbol];
  if (!q) return null;
  return { symbol: a.symbol, name: a.name, price: q.price, changePercent: q.changePercent };
}).filter(Boolean) as { symbol: string; name: string; price: number; changePercent: number }[];

const GAINERS = ALL_MOVERS
  .filter(m => m.changePercent > 0)
  .sort((a, b) => b.changePercent - a.changePercent);

const LOSERS = ALL_MOVERS
  .filter(m => m.changePercent < 0)
  .sort((a, b) => a.changePercent - b.changePercent); // most negative first

// ─── Mover row component ──────────────────────────────────────────────────────

function MoverRow({ symbol, name, price, changePercent, isGainer }: {
  symbol: string; name: string; price: number; changePercent: number; isGainer: boolean;
}) {
  const color = isGainer ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <Link
      href={`/market/${symbol}`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.5rem 0", borderBottom: "1px solid var(--color-border-dim)",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: "var(--color-surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.5625rem", fontWeight: 700, color, flexShrink: 0,
        }}>
          {symbol.slice(0, 2)}
        </div>
        <div>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>{symbol}</div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{name}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
          {formatCurrency(price)}
        </div>
        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color }}>
          {formatChange(changePercent)}
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");

  const watchlistSymbols = new Set(MOCK_WATCHLIST.map((w) => w.symbol));

  const filtered = MOCK_ASSETS.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    const matchesSector = sector === "All" || (a.sector?.toLowerCase().includes(sector.toLowerCase()));
    return matchesSearch && matchesSector;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.375rem" }}>Market</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1.5rem" }}>
        Indian stocks — NSE · Prices as of Oct 7, 2026
      </p>

      {/* Index cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {MOCK_INDICES.map((idx) => (
          <div key={idx.symbol} className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 2 }}>{idx.name}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
              {idx.value.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: 2, color: idx.changePercent >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
              {formatChange(idx.changePercent)}
            </div>
          </div>
        ))}
      </div>

      {/* Gainers / Losers — dynamic, derived from actual quotes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

        {/* Gainers */}
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
            <Flame size={15} style={{ color: "var(--color-positive)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Top Gainers</span>
            <span style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--color-text-3)" }}>
              {GAINERS.length} stock{GAINERS.length !== 1 ? "s" : ""} up today
            </span>
          </div>
          {GAINERS.length === 0 ? (
            <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--color-text-3)", fontSize: "0.8125rem" }}>
              No stocks are up today
            </div>
          ) : (
            GAINERS.map(m => (
              <MoverRow key={m.symbol} {...m} isGainer={true} />
            ))
          )}
        </div>

        {/* Losers */}
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
            <TrendingDown size={15} style={{ color: "var(--color-negative)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Top Losers</span>
            <span style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--color-text-3)" }}>
              {LOSERS.length} stock{LOSERS.length !== 1 ? "s" : ""} down today
            </span>
          </div>
          {LOSERS.length === 0 ? (
            <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--color-text-3)", fontSize: "0.8125rem" }}>
              No stocks are down today
            </div>
          ) : (
            LOSERS.map(m => (
              <MoverRow key={m.symbol} {...m} isGainer={false} />
            ))
          )}
        </div>
      </div>

      {/* Search & filter table */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                style={{
                  padding: "4px 12px", borderRadius: "var(--radius-full)", border: "1px solid",
                  borderColor: sector === s ? "var(--color-brand)" : "var(--color-border)",
                  background: sector === s ? "var(--color-brand-muted)" : "transparent",
                  color: sector === s ? "var(--color-brand)" : "var(--color-text-3)",
                  fontSize: "0.75rem", fontWeight: sector === s ? 600 : 400,
                  cursor: "pointer", transition: "all var(--transition-fast)", whiteSpace: "nowrap",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Asset</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Day Change</th>
                <th style={{ textAlign: "right" }}>Volume</th>
                <th style={{ textAlign: "right" }}>Market Cap</th>
                <th style={{ textAlign: "center" }}>52W Range</th>
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
                const isUp = q.changePercent >= 0;

                return (
                  <tr key={asset.symbol}>
                    <td style={{ color: "var(--color-text-3)", fontSize: "0.75rem", width: 32 }}>{i + 1}</td>
                    <td>
                      <Link href={`/market/${asset.symbol}`} style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand)", flexShrink: 0 }}>
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
                      <div style={{ color: isUp ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 500 }}>
                        {formatChange(q.changePercent)}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: isUp ? "var(--color-positive)" : "var(--color-negative)", fontFamily: "var(--font-mono)" }}>
                        {q.change > 0 ? "+" : ""}{q.change.toFixed(2)}
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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ position: "relative", width: 72, height: 16, display: "flex", alignItems: "center" }}>
                            <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--color-border)" }} />
                            <div style={{ position: "absolute", left: 0, height: 4, borderRadius: 2, width: `${range52}%`, background: "var(--color-brand)", opacity: 0.35 }} />
                            <div style={{
                              position: "absolute",
                              left: `${Math.min(92, Math.max(4, range52))}%`,
                              width: 10, height: 10, borderRadius: "50%",
                              background: "var(--color-brand)",
                              border: "2px solid var(--color-bg-elevated)",
                              transform: "translateX(-50%)",
                              boxShadow: "0 0 0 1px var(--color-brand)",
                            }} />
                          </div>
                          <div style={{ fontSize: "0.5625rem", color: "var(--color-text-3)", fontFamily: "var(--font-mono)" }}>
                            {formatCurrency(q.week52Low, true)} – {formatCurrency(q.week52High, true)}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", color: isWatched ? "var(--color-brand)" : "var(--color-text-3)", padding: 4 }}
                        title={isWatched ? "In watchlist" : "Add to watchlist"}
                        aria-label={isWatched ? "In watchlist" : "Add to watchlist"}
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
