"use client";

// Polls the backend for live prices, indices and market status.
// Nothing is pre-filled: until the first answer arrives the snapshot is empty
// (status "loading"), and a field Yahoo does not supply stays undefined so the UI
// shows "—" instead of an invented number. If a later poll fails, the last real
// values stay on screen and the status flips to "offline" with the time they
// were fetched. One shared poller serves every component using the hook.

import { useSyncExternalStore } from "react";
import { apiGetIndices, apiGetMarketStatus, apiGetQuotes } from "./api";
import type { Quote } from "./types";

export type FeedStatus = "loading" | "live" | "offline";

export interface MarketSnapshot {
  quotes: Record<string, Quote>;
  indices: { name: string; symbol: string; value: number; changePercent: number }[];
  marketOpen: boolean | null; // null until the first response
  closedReason: string | null; // "holiday" | "weekend" | "after hours" when closed
  isLive: boolean;
  status: FeedStatus;
  /** Epoch ms of the last successful quote fetch, or null if there has been none. */
  lastUpdated: number | null;
}

const POLL_MS = 30_000;

let snapshot: MarketSnapshot = {
  quotes: {},
  indices: [],
  marketOpen: null,
  closedReason: null,
  isLive: false,
  status: "loading",
  lastUpdated: null,
};
const listeners = new Set<(s: MarketSnapshot) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function publish(next: MarketSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l(snapshot));
}

async function poll() {
  const [q, i, s] = await Promise.allSettled([apiGetQuotes(), apiGetIndices(), apiGetMarketStatus()]);
  const next: MarketSnapshot = { ...snapshot };

  const gotQuotes = q.status === "fulfilled" && q.value.some((r) => r.is_live);
  if (q.status === "fulfilled" && gotQuotes) {
    const quotes = { ...snapshot.quotes };
    for (const r of q.value) {
      if (!r.is_live || r.price == null) continue;
      // Yahoo sometimes omits the previous close; derive the change from it, else show no change
      const prev = r.previous_close ?? (r.change != null ? r.price - r.change : null);
      const change = r.change ?? (prev ? r.price - prev : 0);
      const changePercent = r.change_percent ?? (prev ? (change / prev) * 100 : 0);
      quotes[r.symbol] = {
        symbol: r.symbol,
        price: r.price,
        change,
        changePercent,
        previousClose: prev ?? r.price,
        open: r.open ?? r.price,
        high: r.high ?? r.price,
        low: r.low ?? r.price,
        volume: r.volume ?? 0,
        avgVolume: r.avg_volume ?? 0,
        marketCap: r.market_cap ?? undefined,
        pe: r.pe ?? undefined,
        eps: r.eps ?? undefined,
        week52High: r.week52_high ?? undefined,
        week52Low: r.week52_low ?? undefined,
        timestamp: new Date().toISOString(),
      };
    }
    next.quotes = quotes;
    next.lastUpdated = Date.now();
  }
  next.isLive = gotQuotes;
  next.status = gotQuotes ? "live" : "offline";

  if (i.status === "fulfilled" && i.value.length > 0) {
    next.indices = i.value.map((x) => ({
      name: x.name, symbol: x.symbol, value: x.value, changePercent: x.change_percent ?? 0,
    }));
  }
  if (s.status === "fulfilled") { next.marketOpen = s.value.is_open; next.closedReason = s.value.reason; }
  publish(next);
}

function subscribe(listener: (s: MarketSnapshot) => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    poll();
    timer = setInterval(poll, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;

export function useLiveMarket(): MarketSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
