"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { MOCK_PORTFOLIO } from "@/lib/mock-data";

// Generate performance time series
function generatePerformanceData() {
  const data = [];
  const now = Date.now();
  const days = 90;
  let value = 8400000;   // ₹84 lakh

  for (let i = 0; i < days; i++) {
    const t = new Date(now - (days - i) * 86400000);
    const change = (Math.sin(i * 0.15 + 0.8) * 0.012) + 0.001;
    value *= 1 + change;
    data.push({
      date: t.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: parseFloat(value.toFixed(2)),
      invested: 8708534,   // ₹87 lakh invested (from MOCK_PORTFOLIO)
    });
  }
  return data;
}

const CHART_COLORS = [
  "#E8A838", "#26C281", "#4A9EEA", "#E05252",
  "#A855F7", "#F59E0B", "#10B981", "#3B82F6",
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0.875rem",
        fontSize: "0.8125rem",
      }}
    >
      <div style={{ color: "var(--color-text-3)", marginBottom: 4, fontSize: "0.75rem" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.name === "value" ? "var(--color-text)" : "var(--color-text-2)" }}>
          {p.name === "value" ? "Portfolio" : "Invested"}:{" "}
          <strong style={{ fontFamily: "var(--font-mono)" }}>₹{p.value.toLocaleString("en-IN")}</strong>
        </div>
      ))}
    </div>
  );
}

export function PortfolioPerformanceChart({ height = 200 }: { height?: number }) {
  const data = generatePerformanceData();
  const latest = data[data.length - 1];
  const isUp = latest.value >= data[0].value;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#26C281" : "#E05252"} stopOpacity={0.15} />
            <stop offset="100%" stopColor={isUp ? "#26C281" : "#E05252"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border-dim)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickCount={5}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="invested"
          stroke="var(--color-border)"
          strokeWidth={1}
          fill="transparent"
          strokeDasharray="4 2"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={isUp ? "#26C281" : "#E05252"}
          strokeWidth={2}
          fill="url(#portfolioGrad)"
          dot={false}
          activeDot={{ r: 4, fill: isUp ? "#26C281" : "#E05252" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface AllocationChartProps {
  size?: number;
}

export function AllocationChart({ size = 240 }: AllocationChartProps) {
  const positions = MOCK_PORTFOLIO.positions;

  const data = [
    ...positions.map((p) => ({
      name: p.symbol,
      value: parseFloat(p.weight.toFixed(1)),
    })),
    {
      name: "Cash",
      value: parseFloat(
        ((MOCK_PORTFOLIO.cash / MOCK_PORTFOLIO.totalValue) * 100).toFixed(1)
      ),
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, value } = props as {
      cx: number; cy: number; midAngle: number;
      innerRadius: number; outerRadius: number;
      name: string; value: number;
    };
    if (value < 5) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
        {name}
      </text>
    );
  };

  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        cx={size / 2}
        cy={size / 2}
        innerRadius={size * 0.28}
        outerRadius={size * 0.45}
        paddingAngle={2}
        dataKey="value"
        labelLine={false}
        label={renderCustomLabel}
      >
        {data.map((_, index) => (
          <Cell
            key={index}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            stroke="var(--color-bg)"
            strokeWidth={2}
          />
        ))}
      </Pie>
      <Tooltip
        formatter={(v: unknown) => [`₹${(v as number).toLocaleString("en-IN")}`, ""]}
        contentStyle={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.8125rem",
          color: "var(--color-text)",
        }}
      />
    </PieChart>
  );
}
