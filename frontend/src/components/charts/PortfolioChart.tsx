"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { apiGetPortfolio, apiGetTransactions, type PortfolioSummary, type TransactionOut } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)", padding: "0.5rem 0.875rem", fontSize: "0.8125rem",
    }}>
      <div style={{ color: "var(--color-text-3)", marginBottom: 4, fontSize: "0.75rem" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: "var(--color-text)" }}>
          {p.name === "value" ? "Portfolio" : "Cash"}:{" "}
          <strong style={{ fontFamily: "var(--font-mono)" }}>
            ₹{p.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </strong>
        </div>
      ))}
    </div>
  );
}

// ─── Build chart data from real transactions + current portfolio ──────────────

interface ChartPoint {
  date: string;
  value: number;
}

function buildChartData(
  transactions: TransactionOut[],
  portfolio: PortfolioSummary,
  days: number = 90
): ChartPoint[] {
  const now = Date.now();
  const startCash = portfolio.cash +
    transactions.reduce((acc, tx) => {
      if (tx.side === "buy")  return acc + tx.total + tx.fees;
      if (tx.side === "sell") return acc - (tx.total - tx.fees);
      return acc;
    }, 0);

  // Sort transactions oldest-first
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const data: ChartPoint[] = [];

  for (let i = 0; i < days; i++) {
    const dayTs = now - (days - 1 - i) * 86400000;
    const dayDate = new Date(dayTs);

    // Cash after all transactions up to this day
    let cash = startCash;
    let invested = 0;
    for (const tx of sorted) {
      if (new Date(tx.created_at).getTime() <= dayTs) {
        if (tx.side === "buy")  { cash -= (tx.total + tx.fees); invested += tx.total; }
        if (tx.side === "sell") { cash += (tx.total - tx.fees); invested -= tx.total; }
      }
    }

    // For today use actual portfolio value; for past days use cash + invested as proxy
    const isToday = i === days - 1;
    const value = isToday
      ? portfolio.total_value
      : Math.max(0, cash + invested);

    data.push({
      date: dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      value: parseFloat(value.toFixed(0)),
    });
  }

  return data;
}

// ─── Performance Chart ────────────────────────────────────────────────────────

export function PortfolioPerformanceChart({ height = 200 }: { height?: number }) {
  const { isAuthenticated, user } = useAuthStore();
  const [data, setData]     = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([apiGetPortfolio(), apiGetTransactions()])
      .then(([portfolio, txs]) => {
        if (txs.length === 0) {
          // No trades yet — flat line at starting balance
          const cash = portfolio.cash;
          const flat: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
            const d = new Date(Date.now() - (29 - i) * 86400000);
            return {
              date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
              value: cash,
            };
          });
          setData(flat);
        } else {
          setData(buildChartData(txs, portfolio, 90));
        }
      })
      .catch(() => {
        // Fallback: flat line at user balance
        const cash = user?.virtualBalance ?? 0;
        const flat: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
          const d = new Date(Date.now() - (29 - i) * 86400000);
          return { date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }), value: cash };
        });
        setData(flat);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--color-border)" }} className="skeleton" />
      </div>
    );
  }

  if (data.length === 0) return null;

  const first = data[0].value;
  const last  = data[data.length - 1].value;
  const isUp  = last >= first;
  const lineColor = isUp ? "#26C281" : "#E05252";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border-dim)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd" tickCount={5}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
          tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
          width={46}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="value" name="value"
          stroke={lineColor} strokeWidth={2}
          fill="url(#pfGrad)" dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Allocation Chart (kept simple, uses live portfolio) ─────────────────────

const CHART_COLORS = ["#E8A838","#26C281","#4A9EEA","#E05252","#A855F7","#F59E0B","#10B981"];

export function AllocationChart({ size = 240 }: { size?: number }) {
  // This is rendered only from portfolio page which passes live positions via props
  // Keeping as a no-op placeholder — portfolio page renders its own legend
  return (
    <div style={{
      width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "50%",
      background: "conic-gradient(#E8A838 0% 40%, #26C281 40% 65%, #4A9EEA 65% 80%, #E05252 80% 90%, #A855F7 90% 100%)",
    }}>
      <div style={{
        width: size * 0.56, height: size * 0.56, borderRadius: "50%",
        background: "var(--color-surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <div style={{ fontSize: "0.625rem", color: "var(--color-text-3)" }}>Allocation</div>
      </div>
    </div>
  );
}
