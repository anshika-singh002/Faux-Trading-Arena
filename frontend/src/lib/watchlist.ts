"use client";

// Per-browser watchlist kept in localStorage. Starts empty and is yours to edit.

import { useSyncExternalStore } from "react";

const KEY = "faux_watchlist";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(saved) ? saved.filter((s): s is string => typeof s === "string") : [];
  } catch {
    cache = []; // storage unavailable or corrupt: start empty
  }
  return cache;
}

export function toggleWatch(symbol: string) {
  const current = read();
  cache = current.includes(symbol) ? current.filter((s) => s !== symbol) : [...current, symbol];
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useWatchlist(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
