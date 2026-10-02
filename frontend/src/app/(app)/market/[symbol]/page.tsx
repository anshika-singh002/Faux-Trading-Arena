"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap,
  AlertTriangle, Info, Plus, Minus, CheckCircle, Loader,
} from "lucide-react";import { PriceChart } from "@/components/charts/PriceChart";
import {
  MOCK_QUOTES, MOCK_AI_INSIGHT_AAPL, XGBOOST_PREDICTIONS,
  formatCurrency, formatPercent, formatVolume, formatNumber,
} from "@/lib/mock-data";
import { apiPlaceOrder, apiGetPortfolio } from "@/lib/api";
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

  // Load live portfolio on mount
  useEffect(() => {
    apiGetPortfolio().then((p) => {
      setLiveCash(p.cash);
      const pos = p.positions.find(px => px.symbol === symbol);
      if (pos) { setLiveQty(pos.quantity); setLiveAvgCost(pos.avg_cost); }
      setPortfolioLoaded(true);
    }).catch(() => setPortfolioLoaded(true));
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Done screen ──
  if (step === "done") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <CheckCircle size={48} style={{ color: "var(--color-positive)", margin: "0 auto 1rem", display: "block" }} />
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", marginBottom: 6 }}>
          {side === "buy" ? "Bought" : "Sold"} {qty} × {symbol}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "0.5rem" }}>
          @ {orderType === "market" ? "market price" : formatCurrency(parseFloat(limitPrice))}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", marginBottom: "1.5rem" }}>
          Cash remaining: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-text)" }}>{formatCurrency(liveCash)}</span>
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

      {/* Review button */}
      <button
        onClick={() => setStep("confirm")}
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
          fontFamily: "inherit",
          letterSpacing: "0.03em",
        }}
      >
        Review {side === "buy" ? "Buy" : "Sell"} →
      </button>
    </div>
  );
}

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export default function AssetDetailPage({ params }: PageProps) {
  const { symbol } = use(params);
  const quote = MOCK_QUOTES[symbol];

  if (!quote) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
        <h2 style={{ marginBottom: "0.5rem" }}>Asset not found</h2>
        <p style={{ color: "var(--color-text-3)" }}>No data for &ldquo;{symbol}&rdquo;</p>
        <Link href="/market" className="btn btn-ghost btn-sm" style={{ marginTop: "1rem", display: "inline-flex" }}>
          ← Back to Market
        </Link>
      </div>
    );
  }

  const isPositive = quote.changePercent >= 0;
  const insight = symbol === "AAPL" ? MOCK_AI_INSIGHT_AAPL : null;
  // XGBoost prediction for Indian stocks
  const xgPred = XGBOOST_PREDICTIONS[symbol] ?? null;

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
              NASDAQ · INR
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
          ) : insight ? (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Zap size={15} style={{ color: "var(--color-brand)" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>AI Market Insight</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.625rem", color: "var(--color-text-3)", background: "var(--color-surface-2)", padding: "2px 6px", borderRadius: 3 }}>
                    MOCK DATA
                  </span>
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: insight.direction === "bullish" ? "var(--color-positive-dim)" : insight.direction === "bearish" ? "var(--color-negative-dim)" : "var(--color-border)",
                    color: insight.direction === "bullish" ? "var(--color-positive)" : insight.direction === "bearish" ? "var(--color-negative)" : "var(--color-text-3)",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}>
                    {insight.direction}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--color-text-2)", marginBottom: "1rem" }}>
                {insight.explanation}
              </p>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: 6 }}>
                  Confidence — {insight.confidence.toUpperCase()}
                </div>
                <ConfidenceBar score={insight.confidenceScore} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: 6 }}>Key Factors</div>
                  {insight.keyFactors.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: "0.8125rem", color: "var(--color-text-2)", marginBottom: 4 }}>
                      <span style={{ color: "var(--color-positive)", flexShrink: 0, marginTop: 1 }}>↑</span>
                      {f}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: 6 }}>Risk Factors</div>
                  {insight.riskFactors.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: "0.8125rem", color: "var(--color-text-2)", marginBottom: 4 }}>
                      <span style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }}>⚠</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "0.875rem", borderTop: "1px solid var(--color-border-dim)" }}>
                {[
                  { label: "1-Day Target", value: formatCurrency(insight.predictedPriceShort) },
                  { label: "1-Week Target", value: formatCurrency(insight.predictedPriceMedium) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-text)" }}>{value}</div>
                  </div>
                ))}
                <div style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Info size={11} />
                  Not investment advice
                </div>
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
                AI insights not available for this asset.
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
