"use client";

import { useState } from "react";
import {
  Plus, TrendingUp, TrendingDown, ChevronDown,
  Play, Pause, Edit2, FlaskConical
} from "lucide-react";
import Link from "next/link";
import { MOCK_STRATEGIES, formatPercent, formatCurrency } from "@/lib/mock-data";
import type { ConditionIndicator, ConditionOperator, StrategyAction, PositionSizeType, StrategyRule } from "@/lib/types";

const INDICATORS: { value: ConditionIndicator; label: string }[] = [
  { value: "price",           label: "Price" },
  { value: "sma_20",          label: "20-Day SMA" },
  { value: "sma_50",          label: "50-Day SMA" },
  { value: "sma_200",         label: "200-Day SMA" },
  { value: "ema_12",          label: "12-Day EMA" },
  { value: "ema_26",          label: "26-Day EMA" },
  { value: "rsi_14",          label: "RSI (14)" },
  { value: "macd",            label: "MACD" },
  { value: "volume",          label: "Volume" },
  { value: "bollinger_upper", label: "Bollinger Upper" },
  { value: "bollinger_lower", label: "Bollinger Lower" },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "crosses_above", label: "crosses above" },
  { value: "crosses_below", label: "crosses below" },
  { value: "greater_than",  label: "is greater than" },
  { value: "less_than",     label: "is less than" },
  { value: "equals",        label: "equals" },
];

const POS_SIZE_TYPES: { value: PositionSizeType; label: string }[] = [
  { value: "percent_portfolio", label: "% of portfolio" },
  { value: "percent_cash",      label: "% of cash" },
  { value: "fixed_amount",      label: "fixed amount ($)" },
];

function RuleBuilder({
  rule,
  index,
  onChange,
  onRemove,
}: {
  rule: StrategyRule;
  index: number;
  onChange: (r: StrategyRule) => void;
  onRemove: () => void;
}) {
  const selectStyle: React.CSSProperties = {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text)",
    fontSize: "0.875rem",
    padding: "0.375rem 0.625rem",
    cursor: "pointer",
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.25rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Rule {index + 1}
        </span>
        <button
          onClick={onRemove}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-negative)", fontSize: "0.75rem" }}
        >
          Remove
        </button>
      </div>

      {/* WHEN block */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--color-text-3)", fontWeight: 500, minWidth: 40 }}>WHEN</span>
        <select
          value={rule.indicator}
          onChange={(e) => onChange({ ...rule, indicator: e.target.value as ConditionIndicator })}
          style={selectStyle}
        >
          {INDICATORS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        <select
          value={rule.operator}
          onChange={(e) => onChange({ ...rule, operator: e.target.value as ConditionOperator })}
          style={selectStyle}
        >
          {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {typeof rule.value === "string" ? (
          <select
            value={rule.value}
            onChange={(e) => onChange({ ...rule, value: e.target.value as ConditionIndicator })}
            style={selectStyle}
          >
            {INDICATORS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        ) : (
          <input
            type="number"
            value={rule.value}
            onChange={(e) => onChange({ ...rule, value: parseFloat(e.target.value) })}
            style={{ ...selectStyle, width: 80, textAlign: "center" }}
          />
        )}
        <button
          onClick={() => onChange({ ...rule, value: typeof rule.value === "string" ? 50 : "sma_50" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-brand)", fontSize: "0.75rem" }}
        >
          toggle type
        </button>
      </div>

      {/* THEN block */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--color-text-3)", fontWeight: 500, minWidth: 40 }}>THEN</span>
        <select
          value={rule.action}
          onChange={(e) => onChange({ ...rule, action: e.target.value as StrategyAction })}
          style={{
            ...selectStyle,
            color: rule.action === "buy" ? "var(--color-positive)" : "var(--color-negative)",
            fontWeight: 700,
          }}
        >
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
        </select>
        <span style={{ color: "var(--color-text-3)", fontSize: "0.875rem" }}>with</span>
        <input
          type="number"
          min={1}
          max={100}
          value={rule.positionSizeValue}
          onChange={(e) => onChange({ ...rule, positionSizeValue: parseFloat(e.target.value) })}
          style={{ ...selectStyle, width: 70, textAlign: "center" }}
        />
        <select
          value={rule.positionSizeType}
          onChange={(e) => onChange({ ...rule, positionSizeType: e.target.value as PositionSizeType })}
          style={selectStyle}
        >
          {POS_SIZE_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: typeof MOCK_STRATEGIES[0] }) {
  const perf = strategy.performance;
  return (
    <div
      className="surface"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        border: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
            <h3 style={{ fontSize: "0.9375rem" }}>{strategy.name}</h3>
            {strategy.isActive && (
              <span style={{ fontSize: "0.6875rem", color: "var(--color-positive)", background: "var(--color-positive-dim)", padding: "1px 6px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                ACTIVE
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", margin: 0 }}>{strategy.description}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "4px 10px", cursor: "pointer", color: "var(--color-text-2)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem" }}>
            <Edit2 size={12} /> Edit
          </button>
          <Link href="/backtesting" style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "4px 10px", cursor: "pointer", color: "var(--color-text-2)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", textDecoration: "none" }}>
            <FlaskConical size={12} /> Backtest
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
        {strategy.symbol && (
          <span style={{ fontSize: "0.75rem", background: "var(--color-surface-2)", color: "var(--color-text-2)", padding: "2px 8px", borderRadius: 4 }}>
            {strategy.symbol}
          </span>
        )}
        <span style={{ fontSize: "0.75rem", background: "var(--color-surface-2)", color: "var(--color-text-2)", padding: "2px 8px", borderRadius: 4 }}>
          {strategy.rules.length} rule{strategy.rules.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rules preview */}
      {strategy.rules.map((rule, i) => (
        <div
          key={rule.id}
          style={{
            background: "var(--color-bg-elevated)",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 0.75rem",
            fontSize: "0.8125rem",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--color-text-3)" }}>WHEN</span>
          <span style={{ color: "var(--color-text)" }}>{rule.indicator.replace(/_/g, " ").toUpperCase()}</span>
          <span style={{ color: "var(--color-text-3)" }}>{rule.operator.replace(/_/g, " ")}</span>
          <span style={{ color: "var(--color-text)" }}>
            {typeof rule.value === "string" ? rule.value.replace(/_/g, " ").toUpperCase() : rule.value}
          </span>
          <span style={{ color: "var(--color-text-3)" }}>→</span>
          <span style={{
            fontWeight: 700,
            color: rule.action === "buy" ? "var(--color-positive)" : "var(--color-negative)",
          }}>
            {rule.action.toUpperCase()}
          </span>
          <span style={{ color: "var(--color-text-3)" }}>
            {rule.positionSizeValue}{rule.positionSizeType === "fixed_amount" ? "₹" : "%"}
          </span>
        </div>
      ))}

      {/* Performance */}
      {perf && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            marginTop: "0.875rem",
            paddingTop: "0.875rem",
            borderTop: "1px solid var(--color-border-dim)",
          }}
        >
          {[
            { label: "Return", value: formatPercent(perf.totalReturnPercent), positive: perf.totalReturnPercent >= 0 },
            { label: "Sharpe", value: perf.sharpeRatio.toFixed(2), positive: perf.sharpeRatio > 1 },
            { label: "Max DD", value: formatPercent(perf.maxDrawdown), positive: false },
            { label: "Win Rate", value: `${perf.winRate}%`, positive: perf.winRate >= 50 },
          ].map(({ label, value, positive }) => (
            <div key={label}>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: positive ? "var(--color-positive)" : "var(--color-negative)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StrategiesPage() {
  const [view, setView] = useState<"list" | "builder">("list");
  const [newRules, setNewRules] = useState<StrategyRule[]>([
    {
      id: "new_r1",
      indicator: "sma_50",
      operator: "crosses_above",
      value: "sma_200",
      action: "buy",
      positionSizeType: "percent_portfolio",
      positionSizeValue: 100,
    },
  ]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Strategies</h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
            Build rule-based trading strategies and test them against historical data
          </p>
        </div>
        <button
          onClick={() => setView(view === "list" ? "builder" : "list")}
          className="btn btn-primary btn-sm"
        >
          <Plus size={14} /> {view === "list" ? "New Strategy" : "← Back to Strategies"}
        </button>
      </div>

      {view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {MOCK_STRATEGIES.map((s) => (
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </div>
      ) : (
        <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "1.25rem" }}>Strategy Builder</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Strategy Name</label>
              <input className="input-base" placeholder="e.g. My MA Crossover" />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Asset Symbol</label>
              <input className="input-base" placeholder="e.g. SBIN, TCS, INFY" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>Description</label>
            <textarea
              className="input-base"
              placeholder="Describe your strategy logic..."
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
              <h3 style={{ fontSize: "0.875rem" }}>Rules</h3>
              <button
                onClick={() => setNewRules(prev => [
                  ...prev,
                  {
                    id: `r_${Date.now()}`,
                    indicator: "rsi_14",
                    operator: "less_than",
                    value: 30,
                    action: "buy",
                    positionSizeType: "percent_cash",
                    positionSizeValue: 25,
                  }
                ])}
                style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "4px 12px", cursor: "pointer", color: "var(--color-text-2)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Plus size={12} /> Add Rule
              </button>
            </div>

            {newRules.map((rule, i) => (
              <RuleBuilder
                key={rule.id}
                rule={rule}
                index={i}
                onChange={(r) => setNewRules(prev => prev.map((rr) => rr.id === rule.id ? r : rr))}
                onRemove={() => setNewRules(prev => prev.filter(rr => rr.id !== rule.id))}
              />
            ))}

            {newRules.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-3)", fontSize: "0.875rem", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                No rules yet. Add a rule to get started.
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button onClick={() => setView("list")} className="btn btn-ghost">Cancel</button>
            <Link href="/backtesting" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FlaskConical size={13} /> Backtest
            </Link>
            <button className="btn btn-primary">Save Strategy</button>
          </div>
        </div>
      )}
    </div>
  );
}
