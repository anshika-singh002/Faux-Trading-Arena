"use client";

// The tradable stock list (Nifty 50 + ABCAPITAL) from the backend, loaded once and shared.

import { useSyncExternalStore } from "react";
import { apiGetAssets, type AssetInfo } from "./api";

const EMPTY: AssetInfo[] = [];
let assets: AssetInfo[] = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function load(attempt = 0) {
  apiGetAssets()
    .then((rows) => {
      assets = rows;
      listeners.forEach((l) => l());
    })
    .catch(() => {
      if (attempt < 5) setTimeout(() => load(attempt + 1), 3000 * (attempt + 1));
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) { started = true; load(); }
  return () => { listeners.delete(listener); };
}

export function useAssets(): AssetInfo[] {
  return useSyncExternalStore(subscribe, () => assets, () => EMPTY);
}

/** Matches by symbol or company name; symbol-prefix hits rank first. */
export function searchAssets(list: AssetInfo[], query: string, limit = 8): AssetInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (a: AssetInfo) => {
    const sym = a.symbol.toLowerCase(), name = a.name.toLowerCase();
    if (sym === q) return 0;
    if (sym.startsWith(q)) return 1;
    if (name.startsWith(q)) return 2;
    if (name.split(/\s+/).some((w) => w.startsWith(q))) return 3;
    if (sym.includes(q) || name.includes(q)) return 4;
    if (a.sector.toLowerCase().includes(q)) return 5;
    return 99;
  };
  return list
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s < 99)
    .sort((x, y) => x.s - y.s || x.a.symbol.localeCompare(y.a.symbol))
    .slice(0, limit)
    .map((x) => x.a);
}
