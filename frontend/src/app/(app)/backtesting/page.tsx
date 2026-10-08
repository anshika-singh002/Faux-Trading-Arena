"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { FlaskConical, Play, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAssets } from "@/lib/assets";
import { apiListStrategies, apiRunBacktest, type StrategyRow, type BacktestApiResult } from "@/lib/api";
import type { BacktestResult } from "@/lib/types";

function MetricCard({
  label,
  value,
  positive,
  sub,
}: { label: string; value: string; positive?: boolean; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "0.875rem 1rem",
      }}
    >
      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "1.125rem",
        fontWeight: 700,
        color: positive === undefined
          ? "var(--color-text)"
          : positive ? "var(--color-positive)" : "var(--color-negative)",
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BacktestReport({ result }: { result: BacktestResult }) {
  const portfolioData = result.portfolioValues.slice(0, 252);
  // Sample to every ~3 days for perf
  const chartData = portfolioData.filter((_, i) => i % 3 === 0 || i === portfolioData.length - 1);

  const isUp = result.totalReturnPercent >= 0;
  const beatsBenchmark = result.totalReturnPercent > result.benchmarkReturnPercent;

  return (
    <div style={{ animation: "fade-up 0.3s ease" }}>
      {/* Headline metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <MetricCard
          label="Total Return"
          value={formatPercent(result.totalReturnPercent)}
          positive={result.totalReturnPercent >= 0}
          sub={formatCurrency(result.totalReturn, true)}
        />
        <MetricCard
          label="Benchmark"
          value={formatPercent(result.benchmarkReturnPercent)}
          positive={result.benchmarkReturnPercent >= 0}
          sub="vs benchmark"
        />
        <MetricCard label="CAGR" value={formatPercent(result.cagr)} positive={result.cagr >= 0} />
        <MetricCard label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} positive={result.sharpeRatio > 1} />
        <MetricCard label="Sortino" value={result.sortinoRatio.toFixed(2)} positive={result.sortinoRatio > 1} />
        <MetricCard label="Max Drawdown" value={formatPercent(result.maxDrawdown)} positive={false} sub={`${result.maxDrawdownDuration} days`} />
        <MetricCard label="Win Rate" value={`${result.winRate}%`} positive={result.winRate >= 50} />
        <MetricCard label="Total Trades" value={result.totalTrades.toString()} />
        <MetricCard label="Profit Factor" value={result.profitFactor.toFixed(2)} positive={result.profitFactor > 1} />
        <MetricCard label="Avg Trade" value={formatPercent(result.avgTradeReturn)} positive={result.avgTradeReturn >= 0} />
        <MetricCard label="Volatility" value={`${result.volatility.toFixed(1)}%`} />
        <MetricCard
          label="vs Benchmark"
          value={formatPercent(result.totalReturnPercent - result.benchmarkReturnPercent)}
          positive={beatsBenchmark}
          sub={beatsBenchmark ? "Outperformed" : "Underperformed"}
        />
      </div>

      {/* Performance chart */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontSize: "0.875rem" }}>Portfolio Value</h3>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 2, background: isUp ? "#26C281" : "#E05252", display: "inline-block", borderRadius: 2 }} />
              Strategy
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 2, background: "var(--color-text-3)", display: "inline-block", borderRadius: 2 }} />
              Benchmark
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
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
              tickCount={6}
            />
            <YAxis
              tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              width={48}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.8125rem",
                color: "var(--color-text)",
              }}
              formatter={(v: unknown, name: unknown) => [
                `₹${(v as number).toLocaleString("en-IN")}`,
                name === "value" ? "Strategy" : "Benchmark",
              ]}
            />
            <Area
              type="monotone"
              dataKey="benchmark"
              stroke="var(--color-text-3)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="transparent"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isUp ? "#26C281" : "#E05252"}
              strokeWidth={2}
              fill="url(#btGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trade list */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.875rem", marginBottom: "0.875rem" }}>Trade History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Value</th>
              <th style={{ textAlign: "right" }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {result.trades.map((trade, i) => (
              <tr key={i}>
                <td style={{ fontSize: "0.8125rem" }}>{trade.date}</td>
                <td>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
                    background: trade.action === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
                    color: trade.action === "buy" ? "var(--color-positive)" : "var(--color-negative)",
                  }}>
                    {trade.action}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatCurrency(trade.price)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{trade.quantity}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatCurrency(trade.value)}</td>
                <td style={{ textAlign: "right" }}>
                  {trade.pnl !== undefined ? (
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: trade.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                    }}>
                      {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                    </span>
                  ) : <span style={{ color: "var(--color-text-3)" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toReport(
  api: BacktestApiResult,
  config: { strategyId: string; symbol: string; startDate: string; endDate: string; startingCapital: number; feePercent: number; slippagePercent: number; benchmarkSymbol: string },
): BacktestResult {
  const r = api.results;
  return {
    id: api.id,
    config,
    status: "completed",
    totalReturn: r.total_return,
    totalReturnPercent: r.total_return_percent,
    benchmarkReturn: r.benchmark_return,
    benchmarkReturnPercent: r.benchmark_return_percent,
    cagr: r.cagr,
    sharpeRatio: r.sharpe_ratio,
    sortinoRatio: r.sortino_ratio,
    maxDrawdown: r.max_drawdown,
    maxDrawdownDuration: r.max_drawdown_duration,
    volatility: r.volatility,
    winRate: r.win_rate,
    profitFactor: r.profit_factor,
    totalTrades: r.total_trades,
    avgTradeReturn: r.avg_trade_return,
    portfolioValues: r.portfolio_values,
    trades: r.trades,
    createdAt: api.created_at,
  };
}

export default function BacktestingPage() {
  const today = new Date();
  const yearAgo = new Date(today.getTime() - 365 * 86400000);
  const assets = useAssets();
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [config, setConfig] = useState({
    strategyId: "",
    symbol: "SBIN",
    startDate: isoDate(yearAgo),
    endDate: isoDate(today),
    startingCapital: 1000000,
    feePercent: 0.1,
    slippagePercent: 0.05,
    benchmarkSymbol: "NIFTY",
  });
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiListStrategies()
      .then((list) => {
        setStrategies(list);
        if (list.length > 0) {
          setConfig((c) => ({ ...c, strategyId: c.strategyId || list[0].id, symbol: list[0].symbol ?? c.symbol }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load strategies"));
  }, []);

  async function runBacktest() {
    if (!config.strategyId) { setError("Create a strategy first, then come back to backtest it."); return; }
    setError("");
    setStatus("running");
    setResult(null);
    try {
      const api = await apiRunBacktest({
        strategy_id: config.strategyId,
        symbol: config.symbol,
        start_date: config.startDate,
        end_date: config.endDate,
        starting_capital: config.startingCapital,
        fee_percent: config.feePercent,
        slippage_percent: config.slippagePercent,
        benchmark_symbol: config.benchmarkSymbol,
      });
      setResult(toReport(api, config));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
      setStatus("idle");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.375rem" }}>Backtesting</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1.5rem" }}>
        Test your strategies against real historical NSE prices (Yahoo Finance). Signals are evaluated at the close and executed at the open of the following day.
      </p>

      {/* Config form */}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem" }}>Configuration</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Strategy</label>
            <select
              className="input-base"
              value={config.strategyId}
              onChange={(e) => setConfig({ ...config, strategyId: e.target.value })}
              style={{ fontFamily: "inherit" }}
            >
              {strategies.length === 0 && <option value="">No strategies yet</option>}
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Symbol</label>
            <select
              className="input-base"
              value={config.symbol}
              onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
              style={{ fontFamily: "inherit" }}
            >
              {assets.map((a) => <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Start Date</label>
            <input
              type="date"
              className="input-base"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>End Date</label>
            <input
              type="date"
              className="input-base"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Starting Capital (₹)</label>
            <input
              type="number"
              className="input-base"
              value={config.startingCapital}
              onChange={(e) => setConfig({ ...config, startingCapital: parseFloat(e.target.value) })}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Fees (%)</label>
            <input
              type="number"
              step="0.01"
              className="input-base"
              value={config.feePercent}
              onChange={(e) => setConfig({ ...config, feePercent: parseFloat(e.target.value) })}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Slippage (%)</label>
            <input
              type="number"
              step="0.01"
              className="input-base"
              value={config.slippagePercent}
              onChange={(e) => setConfig({ ...config, slippagePercent: parseFloat(e.target.value) })}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Benchmark</label>
            <select
              className="input-base"
              value={config.benchmarkSymbol}
              onChange={(e) => setConfig({ ...config, benchmarkSymbol: e.target.value })}
              style={{ fontFamily: "inherit" }}
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">NIFTY Bank</option>
              <option value="SENSEX">SENSEX</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={runBacktest}
            disabled={status === "running"}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {status === "running" ? (
              <>
                <span className="animate-pulse-subtle">⚙</span> Running…
              </>
            ) : (
              <>
                <Play size={14} /> Run Backtest
              </>
            )}
          </button>
          {status === "running" && (
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
              Fetching prices and simulating trades…
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {status === "running" && (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-3)" }}>
          <FlaskConical size={32} style={{ margin: "0 auto 1rem", color: "var(--color-brand)" }} className="animate-pulse-subtle" />
          <div style={{ fontSize: "1rem", fontWeight: 500, marginBottom: 8 }}>Running backtest…</div>
          <div style={{ fontSize: "0.875rem" }}>Replaying real market history</div>
        </div>
      )}

      {error && (
        <div style={{ color: "var(--color-negative)", fontSize: "0.8125rem", marginBottom: "1rem" }}>{error}</div>
      )}

      {status === "done" && result && <BacktestReport result={result} />}

      {status === "idle" && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-xl)",
            color: "var(--color-text-3)",
          }}
        >
          <FlaskConical size={32} style={{ margin: "0 auto 1rem" }} />
          <div style={{ fontSize: "0.9375rem", marginBottom: 8 }}>Configure and run your backtest</div>
          <div style={{ fontSize: "0.8125rem" }}>Results will appear here</div>
        </div>
      )}
    </div>
  );
}
