"use client";

import { useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap,
  AlertTriangle, Info, Plus, Minus, CheckCircle, Loader, Activity,
} from "lucide-react";import { PriceChart } from "@/components/charts/PriceChart";
import {
  formatCurrency, formatPercent, formatVolume,
} from "@/lib/format";
import { apiPlaceOrder, apiGetPortfolio, apiModel1PredictSymbol, apiGetRisk, type Model1Prediction, type RiskReport } from "@/lib/api";
import { useLiveMarket } from "@/lib/live-market";
import { useAssets } from "@/lib/assets";
import { useAuthStore } from "@/lib/auth-store";

function KeyStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.4375rem 0",
      borderBottom: "1px solid var(--color-border-dim)",
    }}>
      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>{label}</span>
      <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "var(--color-positive)" : pct >= 45 ? "var(--color-warning)" : "var(--color-negative)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: "var(--color-border)",
        overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color, minWidth: 32 }}>
        {pct}%
      </span>
    </div>
  );
}

// Trade panel component
function TradePanel({ symbol, currentPrice }: { symbol: string; currentPrice: number }) {
  const { quotes } = useLiveMarket();
  const { user, updateBalance } = useAuthStore();
  const [side, setSide]         = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [qty, setQty]           = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toFixed(2));
  const [step, setStep]         = useState<"form" | "confirm" | "submitting" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState<string>("");
  // Live portfolio — fetched once
  const [liveCash, setLiveCash]     = useState<number>(user?.virtualBalance ?? 0);
  const [liveQty, setLiveQty]       = useState<number>(0);
  const [liveAvgCost, setLiveAvgCost] = useState<number>(0);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  // AI signal for this stock
  const [aiDirection, setAiDirection] = useState<string | null>(null);
  const [aiWarningDismissed, setAiWarningDismissed] = useState(false);
  // Rules-based risk report from the stock's real price history
  const [risk, setRisk] = useState<RiskReport | null>(null);

  // Load live portfolio + AI prediction on mount
  useEffect(() => {
    apiGetPortfolio().then((p) => {
      setLiveCash(p.cash);
      const pos = p.positions.find(px => px.symbol === symbol);
      if (pos) { setLiveQty(pos.quantity); setLiveAvgCost(pos.avg_cost); }
      setPortfolioLoaded(true);
    }).catch(() => setPortfolioLoaded(true));

    // Fetch Model 1 prediction silently
    apiModel1PredictSymbol(symbol).then((r) => {
      setAiDirection(r.direction); // "UP" | "DOWN" | "NEUTRAL"
    }).catch(() => {});

    // Rules-based risk check on the stock's real price history
    apiGetRisk(symbol).then(setRisk).catch(() => setRisk(null));
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show "best time to sell" if user holds this stock AND it's up today
  const stockIsUpToday = (quotes[symbol]?.changePercent ?? 0) > 0;
  const showSellHint = side === "sell" && liveQty > 0 && stockIsUpToday;

  // Warn before any buy that history says may lose money, or when the check could not run
  const showBuyWarning = side === "buy" && (aiDirection === "DOWN" || risk?.level === "high");
  const riskUnverified = risk === null || !risk.available;
  const [showRiskModal, setShowRiskModal] = useState(false);

  const warrants = (r: RiskReport | null) =>
    aiDirection === "DOWN" || !r || !r.available || r.level === "medium" || r.level === "high";

  async function handleReviewClick() {
    if (side !== "buy" || aiWarningDismissed) { setStep("confirm"); return; }
    // Re-check against the latest data right before the user commits
    let latest = risk;
    try { latest = await apiGetRisk(symbol); setRisk(latest); } catch { /* keep the last report */ }
    if (warrants(latest)) setShowRiskModal(true);
    else setStep("confirm");
  }

  const quantity = parseFloat(qty) || 0;
  const price = orderType === "market" ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const total = quantity * price;
  const fee   = total * 0.001;
  const canAfford = side === "buy" ? (total + fee) <= liveCash : true;
  const canSell   = side === "sell" ? liveQty >= quantity : true;
  const canProceed = quantity > 0 && canAfford && canSell;

  async function handleConfirm() {
    setStep("submitting");
    setErrorMsg("");
    try {
      await apiPlaceOrder({
        symbol,
        side,
        order_type: orderType,
        quantity,
        price: orderType === "limit" ? parseFloat(limitPrice) : undefined,
      });
      // Refresh live portfolio data after trade
      const updated = await apiGetPortfolio();
      setLiveCash(updated.cash);
      updateBalance(updated.cash);
      const pos = updated.positions.find(px => px.symbol === symbol);
      setLiveQty(pos?.quantity ?? 0);
      setLiveAvgCost(pos?.avg_cost ?? 0);
      setStep("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Order failed. Please try again.");
      setStep("error");
    }
  }

  // ── Smart feedback logic ─────────────────────────────────────────────────
  type TradeMsg = { icon: React.ReactNode; title: string; body: string; color: string; bg: string };

  function getTradeMessage(): TradeMsg {
    const q = quotes[symbol];
    const isStockUp   = (q?.changePercent ?? 0) > 0;
    const isStockDown = (q?.changePercent ?? 0) < 0;

    if (side === "sell") {
      const sellPrice = parseFloat(qty) * currentPrice;
      const costBasis = parseFloat(qty) * liveAvgCost;
      const profit    = sellPrice - costBasis;
      if (profit > 0) {
        return {
          icon: <TrendingUp size={28} />, color: "var(--color-positive)", bg: "var(--color-positive-dim)",
          title: "Smart sell — profit locked in.",
          body: `You secured +${formatCurrency(profit)} on ${symbol}. Selling at the right time is half the skill.`,
        };
      }
      return {
        icon: <Info size={28} />, color: "var(--color-warning)", bg: "var(--color-warning-dim)",
        title: "Sold at a loss — take note.",
        body: `Review what happened with ${symbol}. Every trade, win or loss, is a data point.`,
      };
    }

    // Buy cases
    if (isStockUp && aiDirection !== "DOWN") {
      return {
        icon: <CheckCircle size={28} />, color: "var(--color-positive)", bg: "var(--color-positive-dim)",
        title: "Well-timed entry.",
        body: `${symbol} is up today and the AI signal is positive. This looks like a good moment to buy.`,
      };
    }
    if (isStockDown && aiDirection === "DOWN") {
      return {
        icon: <AlertTriangle size={28} />, color: "var(--color-warning)", bg: "var(--color-warning-dim)",
        title: "High-risk move — monitor closely.",
        body: `${symbol} is down today and the AI flags it bearish. Have an exit plan ready if it falls further.`,
      };
    }
    if (isStockUp) {
      return {
        icon: <TrendingUp size={28} />, color: "var(--color-positive)", bg: "var(--color-positive-dim)",
        title: "Decent entry.",
        body: `${symbol} is trending up today. Keep an eye on it and set a mental stop-loss level.`,
      };
    }
    return {
      icon: <Activity size={28} />, color: "var(--color-text-2)", bg: "var(--color-surface-2)",
      title: "Order placed.",
      body: `${qty} shares of ${symbol} added to your portfolio. Stay patient and track it regularly.`,
    };
  }

  // ── Done screen ──
  if (step === "done") {
    const msg = getTradeMessage();
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        {/* Icon feedback */}
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: msg.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: msg.color }}>
          {msg.icon}
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: msg.color, marginBottom: 6 }}>
          {msg.title}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.6, marginBottom: "1rem", padding: "0 0.5rem" }}>
          {msg.body}
        </div>
        <div style={{ background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.8125rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "var(--color-text-3)" }}>{side === "buy" ? "Bought" : "Sold"}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{qty} × {symbol}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-3)" }}>Cash remaining</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>{formatCurrency(liveCash)}</span>
          </div>
        </div>
        <button onClick={() => { setStep("form"); setQty("1"); }} className="btn btn-ghost btn-sm" style={{ width: "100%" }}>
          New Order
        </button>
      </div>
    );
  }

  // ── Error screen ──
  if (step === "error") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <AlertTriangle size={40} style={{ color: "var(--color-negative)", margin: "0 auto 1rem", display: "block" }} />
        <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)", marginBottom: 8 }}>Order Failed</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-negative)", marginBottom: "1.5rem", padding: "0.625rem", background: "var(--color-negative-dim)", borderRadius: "var(--radius-md)" }}>
          {errorMsg}
        </div>
        <button onClick={() => setStep("form")} className="btn btn-ghost btn-sm" style={{ width: "100%" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── Confirm screen ──
  if (step === "confirm" || step === "submitting") {
    const submitting = step === "submitting";
    return (
      <div>
        {/* AI warning on confirm — buying a bearish stock */}
        {showBuyWarning && (
          <div style={{
            background: "var(--color-negative-dim)", border: "1px solid var(--color-negative)",
            borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem",
            display: "flex", gap: "0.625rem",
          }}>
            <AlertTriangle size={15} style={{ color: "var(--color-negative)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-negative)", marginBottom: 2 }}>
                AI Model predicts this stock will go DOWN
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                The XGBoost Model 1 has classified <strong>{symbol}</strong> as <strong>BEARISH</strong> for the next 5 trading days. You can still proceed, but consider the risk.
              </div>
            </div>
          </div>
        )}
        {/* Big action heading */}
        <div style={{
          textAlign: "center",
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          background: side === "buy" ? "var(--color-positive-dim)" : "var(--color-negative-dim)",
          marginBottom: "1.25rem",
        }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Confirm order
          </div>
          <div style={{ fontSize: "1.375rem", fontWeight: 800, color: side === "buy" ? "var(--color-positive)" : "var(--color-negative)" }}>
            {side === "buy" ? "BUY" : "SELL"} {qty} {symbol}
          </div>
        </div>
        <div style={{ background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.875rem", marginBottom: "1rem" }}>
          <KeyStatRow label="Quantity" value={qty} />
          <KeyStatRow label="Price" value={orderType === "market" ? "Market" : formatCurrency(parseFloat(limitPrice))} />
          <KeyStatRow label="Est. Total" value={formatCurrency(total)} />
          <KeyStatRow label="Est. Fee (0.1%)" value={formatCurrency(fee)} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.625rem", marginTop: "0.25rem", borderTop: "1px solid var(--color-border-dim)" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{side === "buy" ? "Total Cost" : "You Receive"}</span>
            <span style={{ fontSize: "0.875rem", fontFamily: "var(--font-mono)", fontWeight: 800, color: side === "buy" ? "var(--color-negative)" : "var(--color-positive)" }}>
              {side === "buy" ? formatCurrency(total + fee) : formatCurrency(total - fee)}
            </span>
          </div>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: "1rem", display: "flex", gap: 6 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          Virtual funds only. No real money is involved.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
          <button onClick={() => setStep("form")} disabled={submitting} className="btn btn-ghost">
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)", border: "none",
              background: side === "buy" ? "var(--color-positive)" : "var(--color-negative)",
              color: "#fff", fontWeight: 700, fontSize: "0.9375rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
            }}
          >
            {submitting
              ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Placing…</>
              : `Confirm ${side === "buy" ? "Buy" : "Sell"}`
            }
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div>
      {/* Buy / Sell toggle — large, unmistakable */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: "1.25rem", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
        <button
          onClick={() => setSide("buy")}
          style={{
            padding: "0.75rem",
            border: "none", cursor: "pointer",
            fontSize: "0.9375rem", fontWeight: 700,
            background: side === "buy" ? "var(--color-positive)" : "var(--color-bg-elevated)",
            color: side === "buy" ? "#fff" : "var(--color-text-3)",
            transition: "all var(--transition-fast)",
            letterSpacing: "0.04em",
          }}
        >
          BUY
        </button>
        <button
          onClick={() => setSide("sell")}
          style={{
            padding: "0.75rem",
            border: "none", cursor: "pointer",
            fontSize: "0.9375rem", fontWeight: 700,
            background: side === "sell" ? "var(--color-negative)" : "var(--color-bg-elevated)",
            color: side === "sell" ? "#fff" : "var(--color-text-3)",
            borderLeft: "1px solid var(--color-border)",
            transition: "all var(--transition-fast)",
            letterSpacing: "0.04em",
          }}
        >
          SELL
        </button>
      </div>

      {/* Order type */}
      <div style={{ marginBottom: "0.875rem" }}>
        <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6, fontWeight: 500 }}>Order Type</label>
        <div style={{ display: "flex", gap: 6 }}>
          {(["market", "limit"] as const).map((t) => (
            <button key={t} onClick={() => setOrderType(t)} style={{
              padding: "4px 14px", borderRadius: "var(--radius-md)", border: "1px solid",
              borderColor: orderType === t ? "var(--color-brand)" : "var(--color-border)",
              background: orderType === t ? "var(--color-brand-muted)" : "transparent",
              color: orderType === t ? "var(--color-brand)" : "var(--color-text-3)",
              fontSize: "0.8125rem", cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit",
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: "0.875rem" }}>
        <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6, fontWeight: 500 }}>Shares</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setQty((v) => Math.max(1, (parseFloat(v)||1)-1).toString())} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "var(--color-text-2)" }}>
            <Minus size={12} />
          </button>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="input-base" style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1rem" }} />
          <button onClick={() => setQty((v) => ((parseFloat(v)||0)+1).toString())} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "var(--color-text-2)" }}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Limit price */}
      {orderType === "limit" && (
        <div style={{ marginBottom: "0.875rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6, fontWeight: 500 }}>Limit Price (₹)</label>
          <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="input-base" style={{ fontFamily: "var(--font-mono)" }} />
        </div>
      )}

      {/* Summary box */}
      <div style={{ background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.75rem", marginBottom: "0.875rem", fontSize: "0.8125rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--color-text-3)" }}>{quantity} × {formatCurrency(price)}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--color-text-3)" }}>Fee (0.1%)</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(fee)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border-dim)" }}>
          <span style={{ fontWeight: 500 }}>Cash Available</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: canAfford ? "var(--color-text)" : "var(--color-negative)" }}>
            {portfolioLoaded ? formatCurrency(liveCash) : "…"}
          </span>
        </div>
      </div>

      {/* Current position */}
      {liveQty > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: "0.875rem", padding: "0.625rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Your Position</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-2)" }}>{liveQty} shares @ {formatCurrency(liveAvgCost)}</span>
          </div>
        </div>
      )}

      {/* Inline errors */}
      {!canAfford && side === "buy" && quantity > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-negative)", marginBottom: "0.625rem", display: "flex", gap: 5, alignItems: "center" }}>
          <AlertTriangle size={12} /> Insufficient cash. Need {formatCurrency(total + fee)}.
        </div>
      )}
      {!canSell && side === "sell" && quantity > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-negative)", marginBottom: "0.625rem", display: "flex", gap: 5, alignItems: "center" }}>
          <AlertTriangle size={12} /> You only hold {liveQty} shares.
        </div>
      )}

      {/* Sell hint — stock is up and user holds it */}
      {showSellHint && (
        <div style={{
          background: "var(--color-positive-dim)", border: "1px solid var(--color-positive)",
          borderRadius: "var(--radius-md)", padding: "0.75rem 0.875rem", marginBottom: "0.75rem",
          display: "flex", gap: "0.5rem", alignItems: "flex-start",
        }}>
          <TrendingUp size={15} style={{ color: "var(--color-positive)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--color-positive)" }}>
              Consider selling — stock is up today
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: 2 }}>
              {symbol} is up {(quotes[symbol]?.changePercent ?? 0).toFixed(2)}% today. You hold {liveQty} shares — a good moment to lock in gains.
            </div>
          </div>
        </div>
      )}

      {/* Review button */}
      <button
        onClick={handleReviewClick}
        disabled={!canProceed}
        style={{
          width: "100%", padding: "0.8125rem",
          borderRadius: "var(--radius-md)", border: "none",
          cursor: canProceed ? "pointer" : "not-allowed",
          fontSize: "0.9375rem", fontWeight: 700,
          background: canProceed
            ? side === "buy" ? "var(--color-positive)" : "var(--color-negative)"
            : "var(--color-border)",
          color: canProceed ? "#fff" : "var(--color-text-3)",
          transition: "all var(--transition-fast)",
          fontFamily: "inherit", letterSpacing: "0.03em",
        }}
      >
        Review {side === "buy" ? "Buy" : "Sell"} →
      </button>

      {/* ── Risk Warning Modal — rendered via portal to escape stacking context ── */}
      {showRiskModal && typeof window !== "undefined" && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0, 0, 0, 0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--color-surface)",
            border: `1px solid ${showBuyWarning ? "var(--color-negative)" : "var(--color-warning)"}`,
            borderTop: `4px solid ${showBuyWarning ? "var(--color-negative)" : "var(--color-warning)"}`,
            borderRadius: "var(--radius-xl)",
            padding: "2rem",
            maxWidth: 420, width: "100%",
            boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
          }}>
            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%", margin: "0 auto 1.25rem",
              background: showBuyWarning ? "var(--color-negative-dim)" : "var(--color-warning-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={26} style={{ color: showBuyWarning ? "var(--color-negative)" : "var(--color-warning)" }} />
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: "1.125rem", fontWeight: 700, textAlign: "center", marginBottom: "0.625rem",
              color: showBuyWarning ? "var(--color-negative)" : "var(--color-warning)",
            }}>
              {riskUnverified && aiDirection !== "DOWN"
                ? "Risk could not be checked"
                : risk?.kind === "overheated" && aiDirection !== "DOWN"
                  ? "Gains may reverse. This stock has run up fast"
                  : "You may lose money buying this stock now"}
            </h2>

            {/* Body */}
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-2)", textAlign: "center", lineHeight: 1.6, marginBottom: "1rem" }}>
              {riskUnverified
                ? `Live price history for ${symbol} is not available right now, so its risk could not be assessed.`
                : `Based on ${symbol}'s real price history, here is why this buy may end in a loss:`}
            </p>

            {/* Reasons from the stock's real data */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "grid", gap: "0.5rem" }}>
              {aiDirection === "DOWN" && (
                <li style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5, display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--color-negative)" }}>●</span>
                  The XGBoost model signals DOWN for the next 5 trading days
                </li>
              )}
              {(risk?.reasons ?? []).map((r) => (
                <li key={r.text} style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5, display: "flex", gap: 8 }}>
                  <span style={{ color: r.severity === "high" ? "var(--color-negative)" : "var(--color-warning)" }}>●</span>
                  {r.text}
                </li>
              ))}
            </ul>

            {/* Stats row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.75rem", marginBottom: "1.5rem",
              background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.875rem",
            }}>
              {[
                { label: "Today", v: risk?.stats.day_change_pct as number | undefined, suffix: "%" },
                { label: "20 days", v: risk?.stats.return_20d_pct as number | undefined, suffix: "%" },
                { label: "RSI (14)", v: risk?.stats.rsi14 as number | undefined, suffix: "" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.625rem", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
                    color: s.label === "RSI (14)" || s.v === undefined || s.v === null ? "var(--color-text)" : s.v < 0 ? "var(--color-negative)" : "var(--color-positive)",
                  }}>
                    {s.v === undefined || s.v === null ? "—" : `${s.v > 0 && s.label !== "RSI (14)" ? "+" : ""}${s.v.toFixed(s.label === "RSI (14)" ? 0 : 2)}${s.suffix}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                onClick={() => setShowRiskModal(false)}
                style={{
                  padding: "0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-elevated)",
                  color: "var(--color-text-2)", fontWeight: 600, fontSize: "0.875rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowRiskModal(false); setAiWarningDismissed(true); setStep("confirm"); }}
                style={{
                  padding: "0.75rem", borderRadius: "var(--radius-md)", border: "none",
                  background: showBuyWarning ? "var(--color-negative)" : "var(--color-warning)",
                  color: "#fff", fontWeight: 700, fontSize: "0.875rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Buy anyway
              </button>
            </div>

            <p style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", textAlign: "center", marginTop: "1rem" }}>
              Virtual funds only · No real money involved
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export default function AssetDetailPage({ params }: PageProps) {
  const { symbol } = use(params);
  const { quotes, status } = useLiveMarket();
  const assets = useAssets();
  const aiCovered = assets.find((a) => a.symbol === symbol)?.ai_supported ?? true;
  const quote = quotes[symbol];
  const [signal, setSignal] = useState<{ symbol: string; data: Model1Prediction } | null>(null);
  const model1 = signal?.symbol === symbol ? signal.data : null;

  // Real-time XGBoost signal computed from today's candles
  useEffect(() => {
    apiModel1PredictSymbol(symbol).then((data) => setSignal({ symbol, data })).catch(() => {});
  }, [symbol]);

  if (!quote) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
        <h2 style={{ marginBottom: "0.5rem" }}>
          {status === "loading" ? "Loading live price…" : status === "offline" ? "Live price unavailable" : "Asset not found"}
        </h2>
        <p style={{ color: "var(--color-text-3)" }}>
          {status === "loading"
            ? `Fetching the latest market data for “${symbol}”`
            : status === "offline"
              ? "The market data feed is not responding. No prices are shown rather than made-up ones."
              : `No data for “${symbol}”`}
        </p>
        <Link href="/market" className="btn btn-ghost btn-sm" style={{ marginTop: "1rem", display: "inline-flex" }}>
          ← Back to Market
        </Link>
      </div>
    );
  }

  const isPositive = quote.changePercent >= 0;
  // XGBoost prediction for Indian stocks
  const xgPred = model1
    ? {
        direction: model1.direction,
        accuracy: model1.accuracy,
        rocAuc: model1.roc_auc,
        probabilityUp: model1.p_up,
        probabilityDown: model1.p_down,
      }
    : null; // no stored snapshot: show the loading / unavailable state instead

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      {/* Back nav */}
      <Link
        href="/market"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          color: "var(--color-text-3)",
          textDecoration: "none",
          fontSize: "0.8125rem",
          marginBottom: "1.25rem",
          transition: "color var(--transition-fast)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-3)")}
      >
        <ArrowLeft size={14} /> Market
      </Link>

      {/* Asset header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--color-brand)",
            flexShrink: 0,
          }}
        >
          {symbol.slice(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-mono)" }}>{symbol}</h1>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
              NSE · INR
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
              {formatCurrency(quote.price)}
            </span>
            <span style={{
              fontSize: "1.125rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: isPositive ? "var(--color-positive)" : "var(--color-negative)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {isPositive ? "+" : ""}{formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
            </span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem", alignItems: "start" }}>
        {/* Left: chart + details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Chart */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <PriceChart
              symbol={symbol}
              name={quote.symbol}
              currentPrice={quote.price}
              changePercent={quote.changePercent}
              height={340}
            />
          </div>

          {/* Key stats */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "0.875rem" }}>Key Statistics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
              <div>
                <KeyStatRow label="Open" value={formatCurrency(quote.open)} />
                <KeyStatRow label="High" value={formatCurrency(quote.high)} />
                <KeyStatRow label="Low" value={formatCurrency(quote.low)} />
                <KeyStatRow label="Prev. Close" value={formatCurrency(quote.previousClose)} />
                <KeyStatRow label="Volume" value={formatVolume(quote.volume)} />
              </div>
              <div>
                <KeyStatRow label="Avg. Volume" value={formatVolume(quote.avgVolume)} />
                {quote.marketCap && <KeyStatRow label="Market Cap" value={formatCurrency(quote.marketCap, true)} />}
                {quote.pe && <KeyStatRow label="P/E Ratio" value={quote.pe.toFixed(1)} />}
                {quote.eps && <KeyStatRow label="EPS" value={formatCurrency(quote.eps)} />}
                {quote.week52High && <KeyStatRow label="52W High" value={formatCurrency(quote.week52High)} />}
              </div>
            </div>
          </div>

          {/* AI Insight — XGBoost for Indian stocks, mock for others */}
          {xgPred ? (
            <div style={{
              background: "var(--color-bg-elevated)",
              border: `1px solid ${xgPred.direction === "UP" ? "var(--color-positive-dim)" : xgPred.direction === "DOWN" ? "var(--color-negative-dim)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-lg)", padding: "1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Zap size={15} style={{ color: "var(--color-brand)" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>XGBoost AI Prediction</span>
                </div>
                <span style={{
                  fontSize: "0.625rem", background: "var(--color-positive-dim)", color: "var(--color-positive)",
                  padding: "2px 7px", borderRadius: "var(--radius-full)", fontWeight: 700,
                }}>
                  LIVE MODEL
                </span>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div style={{
                  flex: 1, padding: "0.75rem 1rem",
                  background: xgPred.direction === "UP" ? "var(--color-positive-dim)" : xgPred.direction === "DOWN" ? "var(--color-negative-dim)" : "var(--color-surface)",
                  borderRadius: "var(--radius-md)", textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 4 }}>Direction (5 days)</div>
                  <div style={{
                    fontSize: "1.25rem", fontWeight: 800,
                    color: xgPred.direction === "UP" ? "var(--color-positive)" : xgPred.direction === "DOWN" ? "var(--color-negative)" : "var(--color-text-3)",
                  }}>
                    {xgPred.direction === "UP" ? "↑ BULLISH" : xgPred.direction === "DOWN" ? "↓ BEARISH" : "→ NEUTRAL"}
                  </div>
                </div>
                <div style={{ flex: 1, padding: "0.75rem 1rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 4 }}>Model Accuracy</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-positive)" }}>{xgPred.accuracy}</div>
                </div>
                <div style={{ flex: 1, padding: "0.75rem 1rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 4 }}>ROC-AUC</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-brand)" }}>{xgPred.rocAuc.toFixed(3)}</div>
                </div>
              </div>

              {/* Probability bar */}
              <div style={{ marginBottom: "0.875rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: 6 }}>Probability distribution</div>
                <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex", gap: 1 }}>
                  <div style={{ width: `${Math.round(xgPred.probabilityUp * 100)}%`, background: "var(--color-positive)" }} />
                  <div style={{ flex: 1, background: "var(--color-negative)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-positive)", fontFamily: "var(--font-mono)" }}>↑ {Math.round(xgPred.probabilityUp * 100)}% UP</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-negative)", fontFamily: "var(--font-mono)" }}>↓ {Math.round(xgPred.probabilityDown * 100)}% DOWN</span>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "flex", gap: 6, alignItems: "flex-start", marginTop: "0.75rem" }}>
                <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                Not investment advice. XGBoost model trained on historical technical indicators. For educational use only.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <Zap size={24} style={{ color: "var(--color-text-3)", margin: "0 auto 0.75rem" }} />
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-3)" }}>
                {aiCovered ? "AI signal is loading or unavailable right now." : "No AI signal for this stock: the XGBoost models were trained on 10 specific stocks. Live prices and the risk check still apply."}
              </div>
            </div>
          )}
        </div>

        {/* Right: trade panel */}
        <div style={{ position: "sticky", top: "80px" }}>

          {/* Trade form */}
          <div
            className="surface"
            style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Trade {symbol}</div>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: isPositive ? "var(--color-positive)" : "var(--color-negative)" }}>
                {formatCurrency(quote.price)}
              </span>
            </div>
            <TradePanel symbol={symbol} currentPrice={quote.price} />
          </div>
        </div>
      </div>
    </div>
  );
}
