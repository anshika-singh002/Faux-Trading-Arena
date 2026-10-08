"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass, ShieldCheck, Scale, Flame, Sparkles,
  AlertTriangle, Info, PieChart as PieChartIcon,
  CheckCircle2, Wallet, RefreshCw,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import {
  apiGetAdvisorProfiles,
  apiGetAdvisorRecommendation,
} from "@/lib/api";
import type {
  AdvisorRiskProfileKey,
  AdvisorRiskProfile,
  AdvisorRecommendation,
} from "@/lib/types";

// Palette for Sector Allocation Chart
const SECTOR_COLORS: Record<string, string> = {
  Banking: "#3B82F6",
  IT: "#10B981",
  Energy: "#F59E0B",
  FMCG: "#EC4899",
  Pharma: "#8B5CF6",
  Auto: "#06B6D4",
  Infrastructure: "#F97316",
  Consumer: "#EAB308",
  Utilities: "#6366F1",
  Telecom: "#14B8A6",
  Financials: "#38BDF8",
  Materials: "#A855F7",
  Metals: "#F43F5E",
  Conglomerate: "#64748B",
};

const FALLBACK_COLORS = [
  "#26C281", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899",
  "#06B6D4", "#F97316", "#6366F1", "#14B8A6", "#64748B",
];

const PRESETS = [
  { label: "₹1 Lakh", amount: 100_000 },
  { label: "₹5 Lakh", amount: 500_000 },
  { label: "₹10 Lakh", amount: 1_000_000 },
  { label: "₹25 Lakh", amount: 2_500_000 },
  { label: "₹50 Lakh", amount: 5_000_000 },
  { label: "₹1 Crore", amount: 10_000_000 },
];

const PROFILE_ICONS: Record<AdvisorRiskProfileKey, React.ReactNode> = {
  conservative: <ShieldCheck size={20} style={{ color: "var(--color-positive)" }} />,
  balanced: <Scale size={20} style={{ color: "var(--color-brand)" }} />,
  aggressive: <Flame size={20} style={{ color: "var(--color-negative)" }} />,
};

const PROFILE_COLORS: Record<AdvisorRiskProfileKey, string> = {
  conservative: "var(--color-positive)",
  balanced: "var(--color-brand)",
  aggressive: "var(--color-negative)",
};

const DEFAULT_PROFILES: AdvisorRiskProfile[] = [
  {
    id: "conservative",
    label: "Conservative",
    goal: "Protect capital",
    risk_aversion: 40.0,
    max_weight_pct: 15.0,
    max_sector_pct: 30.0,
    max_stock_vol_pct: 26.0,
    objective: "utility",
  },
  {
    id: "balanced",
    label: "Balanced",
    goal: "Balance risk and return",
    risk_aversion: 0.0,
    max_weight_pct: 15.0,
    max_sector_pct: 35.0,
    max_stock_vol_pct: null,
    objective: "diversification",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    goal: "Maximum return",
    risk_aversion: 2.0,
    max_weight_pct: 25.0,
    max_sector_pct: 45.0,
    max_stock_vol_pct: null,
    objective: "utility",
  },
];

export default function AdvisorPage() {
  const { user } = useAuthStore();
  const availableCash = user?.virtualBalance ?? 10_000_000;

  const [profiles, setProfiles] = useState<AdvisorRiskProfile[]>(DEFAULT_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<AdvisorRiskProfileKey>("balanced");
  const [amountStr, setAmountStr] = useState<string>("1000000");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [recommendation, setRecommendation] = useState<AdvisorRecommendation | null>(null);

  // Fetch available profiles metadata on mount
  useEffect(() => {
    apiGetAdvisorProfiles()
      .then((res) => {
        if (res?.profiles?.length) {
          setProfiles(res.profiles);
        }
      })
      .catch(() => {
        // Keeps default profiles
      });
  }, []);

  const parsedAmount = parseFloat(amountStr) || 0;
  const isAmountValid = parsedAmount >= 10_000;

  async function handleGenerate(profileKey = selectedProfile, amt = parsedAmount) {
    if (amt < 10_000) {
      setErrorMsg("Investment amount must be at least ₹10,000.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await apiGetAdvisorRecommendation({
        amount: amt,
        risk: profileKey,
      });
      setRecommendation(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compute portfolio recommendation.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // Pre-fill amount presets
  function handlePresetClick(amt: number) {
    setAmountStr(amt.toString());
    setErrorMsg("");
  }

  function handleFractionCash(fraction: number) {
    const val = Math.max(10_000, Math.floor(availableCash * fraction));
    setAmountStr(val.toString());
    setErrorMsg("");
  }

  // Sector breakdown data for Recharts
  const sectorData = recommendation?.portfolio?.sector_weights_pct
    ? Object.entries(recommendation.portfolio.sector_weights_pct).map(([name, weight]) => ({
        name,
        value: weight,
      }))
    : [];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              background: "var(--color-brand-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-brand)",
            }}
          >
            <Compass size={18} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Virtual Investment Advisor
          </h1>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-brand-muted)",
              color: "var(--color-brand)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            MPT Optimizer
          </span>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
          Modern Portfolio Theory asset allocation engine across 32 Indian large-cap stocks.
          Divide your virtual cash into optimized, risk-managed weights with exact whole-share calculations.
        </p>
      </div>

      {/* Control Deck */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          {/* Top Bar: Investment Amount & Cash Balance */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
                Investment Amount (₹)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
                <Wallet size={14} style={{ color: "var(--color-brand)" }} />
                <span>Available Cash:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>
                  {formatCurrency(availableCash)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 260px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-3)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  min={10000}
                  step={5000}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="input-base"
                  style={{
                    paddingLeft: "2.25rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    width: "100%",
                  }}
                  placeholder="e.g. 1000000"
                />
              </div>

              {/* Cash percentage quick buttons */}
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <button
                  type="button"
                  onClick={() => handleFractionCash(0.25)}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--color-text-2)",
                    fontFamily: "inherit",
                  }}
                >
                  25% Cash
                </button>
                <button
                  type="button"
                  onClick={() => handleFractionCash(0.50)}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--color-text-2)",
                    fontFamily: "inherit",
                  }}
                >
                  50% Cash
                </button>
                <button
                  type="button"
                  onClick={() => handleFractionCash(1.0)}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--color-brand)",
                    fontFamily: "inherit",
                  }}
                >
                  All Cash
                </button>
              </div>
            </div>

            {/* Presets Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                Presets:
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetClick(p.amount)}
                  style={{
                    background: parsedAmount === p.amount ? "var(--color-brand-muted)" : "transparent",
                    borderColor: parsedAmount === p.amount ? "var(--color-brand)" : "var(--color-border)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderRadius: "var(--radius-full)",
                    padding: "2px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    color: parsedAmount === p.amount ? "var(--color-brand)" : "var(--color-text-3)",
                    fontFamily: "inherit",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Profile Selection Cards */}
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: "0.75rem" }}>
              Select Risk Profile
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {/* Conservative Card */}
              <div
                onClick={() => setSelectedProfile("conservative")}
                style={{
                  background: selectedProfile === "conservative" ? "var(--color-brand-subtle)" : "var(--color-bg-elevated)",
                  border: `2px solid ${selectedProfile === "conservative" ? "var(--color-brand)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <ShieldCheck size={20} style={{ color: "var(--color-positive)" }} />
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>Conservative</span>
                  {selectedProfile === "conservative" && (
                    <CheckCircle2 size={16} style={{ color: "var(--color-brand)", marginLeft: "auto" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-positive)", marginBottom: "0.375rem" }}>
                  Goal: Protect capital
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
                  Minimizes variance and filters exclusively for lower-volatility stocks (annual volatility ≤ 26%).
                </p>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", display: "flex", gap: "0.75rem" }}>
                  <span>Max stock: <strong>15%</strong></span>
                  <span>Max sector: <strong>30%</strong></span>
                </div>
              </div>

              {/* Balanced Card */}
              <div
                onClick={() => setSelectedProfile("balanced")}
                style={{
                  background: selectedProfile === "balanced" ? "var(--color-brand-subtle)" : "var(--color-bg-elevated)",
                  border: `2px solid ${selectedProfile === "balanced" ? "var(--color-brand)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Scale size={20} style={{ color: "var(--color-brand)" }} />
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>Balanced</span>
                  {selectedProfile === "balanced" && (
                    <CheckCircle2 size={16} style={{ color: "var(--color-brand)", marginLeft: "auto" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-brand)", marginBottom: "0.375rem" }}>
                  Goal: Balance risk & return
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
                  Maximizes diversification ratio across uncorrelated holdings. Ignores noisy historical return forecasts.
                </p>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", display: "flex", gap: "0.75rem" }}>
                  <span>Max stock: <strong>15%</strong></span>
                  <span>Max sector: <strong>35%</strong></span>
                </div>
              </div>

              {/* Aggressive Card */}
              <div
                onClick={() => setSelectedProfile("aggressive")}
                style={{
                  background: selectedProfile === "aggressive" ? "var(--color-brand-subtle)" : "var(--color-bg-elevated)",
                  border: `2px solid ${selectedProfile === "aggressive" ? "var(--color-brand)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Flame size={20} style={{ color: "var(--color-negative)" }} />
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>Aggressive</span>
                  {selectedProfile === "aggressive" && (
                    <CheckCircle2 size={16} style={{ color: "var(--color-brand)", marginLeft: "auto" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-negative)", marginBottom: "0.375rem" }}>
                  Goal: Maximum return
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
                  Utility optimization seeking maximum return, tolerating higher volatility with broader allocation limits.
                </p>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", display: "flex", gap: "0.75rem" }}>
                  <span>Max stock: <strong>25%</strong></span>
                  <span>Max sector: <strong>45%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.75rem 1rem",
                background: "var(--color-negative-dim)",
                border: "1px solid var(--color-negative)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-negative)",
                fontSize: "0.875rem",
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={loading || !isAmountValid}
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                borderRadius: "var(--radius-md)",
                background: loading || !isAmountValid ? "var(--color-border)" : "var(--color-brand)",
                color: loading || !isAmountValid ? "var(--color-text-3)" : "var(--color-text-inv)",
                fontSize: "1rem",
                fontWeight: 700,
                border: "none",
                cursor: loading || !isAmountValid ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.625rem",
                transition: "all var(--transition-fast)",
                fontFamily: "inherit",
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Optimizing Portfolio (SLSQP)...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Portfolio Recommendation
                </>
              )}
            </button>
            {!isAmountValid && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-negative)", marginTop: "0.375rem", textAlign: "center" }}>
                Minimum investment amount is ₹10,000.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !recommendation && (
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 1.25rem",
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-brand)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
            Running Modern Portfolio Optimization
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)" }}>
            Computing 5-year covariance matrices, pairwise correlations, and SLSQP quadratic weights...
          </p>
        </div>
      )}

      {/* Results Section */}
      {recommendation && (
        <div style={{ animation: "fade-up 0.4s ease" }}>
          {/* Key KPI Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Expected Return */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Expected Return
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-positive)" }}>
                +{formatPercent(recommendation.portfolio.expected_return_pct)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 4 }}>
                Annualized mean
              </div>
            </div>

            {/* Volatility */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Portfolio Volatility
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                {formatPercent(recommendation.portfolio.volatility_pct)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 4 }}>
                Risk Level: <strong>{recommendation.portfolio.risk_level}</strong>
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Sharpe Ratio
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: recommendation.portfolio.sharpe >= 0.5 ? "var(--color-positive)" : "var(--color-brand)",
                }}
              >
                {recommendation.portfolio.sharpe.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 4 }}>
                vs. 6.5% risk-free rate
              </div>
            </div>

            {/* Effective Holdings */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Effective Holdings
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                {recommendation.portfolio.effective_holdings}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 4 }}>
                {recommendation.allocations.length} stocks selected
              </div>
            </div>

            {/* Diversification Rating */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Diversification
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color:
                    recommendation.portfolio.diversification === "Excellent"
                      ? "var(--color-positive)"
                      : recommendation.portfolio.diversification === "Good"
                      ? "var(--color-brand)"
                      : "var(--color-warning)",
                }}
              >
                {recommendation.portfolio.diversification}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 4 }}>
                Avg corr: {recommendation.portfolio.avg_pairwise_correlation.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Two Columns: Allocations Table (Left) + Sector Breakdown (Right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Stock Allocation Table */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.5rem",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                    Recommended Stock Allocation
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: 2 }}>
                    {recommendation.allocations.length} holdings across {Object.keys(recommendation.portfolio.sector_weights_pct).length} sectors
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                  Uninvested Cash: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>{formatCurrency(recommendation.uninvested_cash)}</span>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Stock</th>
                      <th style={{ textAlign: "left" }}>Sector</th>
                      <th style={{ textAlign: "right" }}>Weight</th>
                      <th style={{ textAlign: "right" }}>Rupees</th>
                      <th style={{ textAlign: "right" }}>Price</th>
                      <th style={{ textAlign: "right" }}>Shares</th>
                      <th style={{ textAlign: "center" }}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendation.allocations.map((a) => (
                      <tr key={a.ticker}>
                        <td style={{ fontWeight: 600 }}>
                          <Link
                            href={`/market/${a.symbol}`}
                            style={{ color: "var(--color-text)", textDecoration: "none", display: "flex", flexDirection: "column" }}
                          >
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-brand)" }}>{a.symbol}</span>
                            <span style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", fontWeight: 400 }}>{a.name}</span>
                          </Link>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--color-surface-2)",
                              color: "var(--color-text-2)",
                            }}
                          >
                            {a.sector}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {a.weight_pct.toFixed(2)}%
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {formatCurrency(a.amount)}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-2)" }}>
                          {formatCurrency(a.last_price)}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-text)" }}>
                          {a.shares.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              background:
                                a.risk_level === "Low"
                                  ? "var(--color-positive-dim)"
                                  : a.risk_level === "Medium"
                                  ? "var(--color-warning-dim)"
                                  : "var(--color-negative-dim)",
                              color:
                                a.risk_level === "Low"
                                  ? "var(--color-positive)"
                                  : a.risk_level === "Medium"
                                  ? "var(--color-warning)"
                                  : "var(--color-negative)",
                            }}
                          >
                            {a.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sector Breakdown Chart */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <PieChartIcon size={18} style={{ color: "var(--color-brand)" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Sector Distribution
                </h3>
              </div>

              {sectorData.length > 0 && (
                <div style={{ height: 200, width: "100%", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {sectorData.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={SECTOR_COLORS[entry.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => {
                          const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
                          return [`${num.toFixed(1)}%`, "Allocation"];
                        }}
                        contentStyle={{
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.75rem",
                          color: "var(--color-text)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sector Weights List */}
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", maxHeight: 220 }}>
                {sectorData.map((sec, idx) => (
                  <div
                    key={sec.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                      padding: "0.25rem 0",
                      borderBottom: "1px solid var(--color-border-dim)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: SECTOR_COLORS[sec.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
                        }}
                      />
                      <span>{sec.name}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {sec.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Correlation Warnings */}
          {recommendation.warnings && recommendation.warnings.length > 0 && (
            <div
              style={{
                background: "var(--color-warning-dim)",
                border: "1px solid var(--color-warning)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--color-warning)" }}>
                <AlertTriangle size={18} />
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>
                  High Pairwise Correlation Warnings
                </h4>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text-2)" }}>
                {recommendation.warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: "0.25rem" }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Provenance & Disclaimer Footer */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--color-text-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Info size={14} style={{ color: "var(--color-brand)" }} />
              <span>
                <strong>Data Provenance:</strong> {recommendation.data.source} · {recommendation.data.trading_days} historical trading days ({recommendation.data.start} to {recommendation.data.end}).
              </span>
            </div>
            <div style={{ paddingLeft: "1.375rem", fontStyle: "italic", color: "var(--color-text-2)" }}>
              {recommendation.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
