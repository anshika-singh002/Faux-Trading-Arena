"use client";

import { useEffect, useState } from "react";
import { apiGetAllRisk, type RiskReport } from "@/lib/api";

const REFRESH_MS = 2 * 60 * 1000;

/** Risk reports for every supported stock, refreshed every two minutes. */
export function useAllRisk(): Record<string, RiskReport> {
  const [reports, setReports] = useState<Record<string, RiskReport>>({});

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGetAllRisk()
        .then((list) => {
          if (alive) setReports(Object.fromEntries(list.map((r) => [r.symbol, r])));
        })
        .catch(() => {});
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return reports;
}

export function riskLabel(r: RiskReport | undefined): string {
  if (!r || !r.available) return "—";
  if (r.level === "low") return "Low";
  const what = r.kind === "overheated" ? "Reversal" : "Falling";
  return `${r.level === "high" ? "High" : "Medium"} · ${what}`;
}

export function riskColor(r: RiskReport | undefined): string {
  if (!r || !r.available) return "var(--color-text-3)";
  if (r.level === "high") return "var(--color-negative)";
  if (r.level === "medium") return "var(--color-warning)";
  return "var(--color-positive)";
}
