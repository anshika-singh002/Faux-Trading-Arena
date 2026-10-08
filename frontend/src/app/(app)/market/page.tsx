"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatVolume } from "@/lib/format";
import { useAssets } from "@/lib/assets";
import { useLiveMarket } from "@/lib/live-market";
import { useWatchlist, toggleWatch } from "@/lib/watchlist";
import { useAllRisk, riskLabel, riskColor } from "@/lib/risk";

type SectorFilter = string;

function formatChange(pct: number | undefined): string {
  if (pct == null) return "—";
  if (pct > 0) return `+${pct.toFixed(2)}%`;
  return `${pct.toFixed(2)}%`;
}

export default function MarketPage() {
  const { quotes, indices, marketOpen } = useLiveMarket();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");

  const assets = useAssets();
  const sectors = ["All", ...Array.from(new Set(assets.map((a) => a.sector))).sort()];
  const risk = useAllRisk();
  const watchlist = useWatchlist();
  const watchlistSymbols = new Set(watchlist);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    const matchesSector = sector === "All" || a.sector === sector;
    return matchesSearch && matchesSector;
  });

  // Quick summary counts
  const gainers = assets.filter(a => (quotes[a.symbol]?.changePercent ?? 0) > 0).length;
  const losers  = assets.filter(a => (quotes[a.symbol]?.changePercent ?? 0) < 0).length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Market</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
          Nifty 50 stocks · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {marketOpen === null ? "" : marketOpen ? "Market open" : "Market closed"} ·{" "}
          <span style={{ color: "var(--color-positive)", fontWeight: 600 }}>{gainers} up</span>
          {" / "}
          <span style={{ color: "var(--color-negative)", fontWeight: 600 }}>{losers} down</span>
        </p>
      </div>

      {/* Index cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {indices.map((idx) => (
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

      {/* Single stock table — all 10 mixed, sorted by absolute change */}
      <div className="surface" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>

        {/* Search + sector filter */}
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input
              className="input-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or company…"
              style={{ paddingLeft: 32 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sectors.map((s) => (
              <button key={s} onClick={() => setSector(s)} style={{
                padding: "4px 12px", borderRadius: "var(--radius-full)", border: "1px solid",
                borderColor: sector === s ? "var(--color-brand)" : "var(--color-border)",
                background: sector === s ? "var(--color-brand-muted)" : "transparent",
                color: sector === s ? "var(--color-brand)" : "var(--color-text-3)",
                fontSize: "0.75rem", fontWeight: sector === s ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              }}>
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
                <th>Stock</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Today</th>
                <th style={{ textAlign: "right" }}>Volume</th>
                <th style={{ textAlign: "right" }}>Market Cap</th>
                <th style={{ textAlign: "center" }}>52W Range</th>
                <th style={{ textAlign: "center" }}>Risk</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, i) => {
                const q = quotes[asset.symbol];
                if (!q) return null;
                const isWatched = watchlistSymbols.has(asset.symbol);
                const isUp = q.changePercent >= 0;
                const range52 = q.week52High && q.week52Low
                  ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
                  : 50;

                return (
                  <tr key={asset.symbol}>
                    <td style={{ color: "var(--color-text-3)", fontSize: "0.75rem", width: 32 }}>{i + 1}</td>
                    <td>
                      <Link href={`/market/${asset.symbol}`} style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
                        {/* Coloured avatar — green border if up, red if down */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: isUp ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                          border: `1px solid ${isUp ? "var(--color-positive)" : "var(--color-negative)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.5625rem", fontWeight: 800,
                          color: isUp ? "var(--color-positive)" : "var(--color-negative)",
                          flexShrink: 0,
                        }}>
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 5 }}>
                            {asset.symbol}
                            {/* Small up/down arrow next to name */}
                            {isUp
                              ? <TrendingUp size={11} style={{ color: "var(--color-positive)" }} />
                              : <TrendingDown size={11} style={{ color: "var(--color-negative)" }} />
                            }
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{asset.name}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-text)" }}>
                      {formatCurrency(q.price)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: isUp ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {formatChange(q.changePercent)}
                      </div>
                      <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: isUp ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {(q.change ?? 0) > 0 ? "+" : ""}{(q.change ?? 0).toFixed(2)}
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
                              position: "absolute", left: `${Math.min(92, Math.max(4, range52))}%`,
                              width: 10, height: 10, borderRadius: "50%",
                              background: "var(--color-brand)", border: "2px solid var(--color-bg-elevated)",
                              transform: "translateX(-50%)", boxShadow: "0 0 0 1px var(--color-brand)",
                            }} />
                          </div>
                          <div style={{ fontSize: "0.5625rem", color: "var(--color-text-3)", fontFamily: "var(--font-mono)" }}>
                            {formatCurrency(q.week52Low, true)} – {formatCurrency(q.week52High, true)}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        title={risk[asset.symbol]?.reasons.map((r) => r.text).join("\n") || "No risk flags from recent price history"}
                        style={{ fontSize: "0.6875rem", fontWeight: 700, color: riskColor(risk[asset.symbol]), whiteSpace: "nowrap" }}
                      >
                        {riskLabel(risk[asset.symbol])}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <button
                          onClick={() => toggleWatch(asset.symbol)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: isWatched ? "var(--color-brand)" : "var(--color-text-3)", padding: 4 }}
                          title="Watchlist" aria-label="Toggle watchlist"
                        >
                          <Eye size={14} fill={isWatched ? "var(--color-brand)" : "none"} />
                        </button>
                        <Link href={`/market/${asset.symbol}`} style={{
                          fontSize: "0.75rem", fontWeight: 600,
                          padding: "3px 10px", borderRadius: "var(--radius-md)",
                          background: isUp ? "var(--color-positive-dim)" : "var(--color-surface-2)",
                          color: isUp ? "var(--color-positive)" : "var(--color-text-2)",
                          border: `1px solid ${isUp ? "var(--color-positive)" : "var(--color-border)"}`,
                          textDecoration: "none",
                        }}>
                          Trade
                        </Link>
                      </div>
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
