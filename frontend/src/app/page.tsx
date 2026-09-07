"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  TrendingUp, BarChart2, Cpu, FlaskConical,
  MessageSquare, Shield, ArrowRight, Check,
  ChevronDown, Zap, BookOpen, Trophy,
} from "lucide-react";

// Animated counter
function Counter({ target, prefix = "", suffix = "", duration = 2000 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setValue(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

// Fake sparkline SVG
function Sparkline({ positive = true }: { positive?: boolean }) {
  const color = positive ? "#26C281" : "#E05252";
  const path = positive
    ? "M0,40 L10,38 L20,42 L30,35 L40,30 L50,32 L60,25 L70,20 L80,18 L90,15 L100,10"
    : "M0,10 L10,12 L20,8 L30,15 L40,20 L50,18 L60,25 L70,30 L80,32 L90,35 L100,40";

  return (
    <svg width="100" height="50" viewBox="0 0 100 50" fill="none">
      <defs>
        <linearGradient id={`sg_${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L100,50 L0,50 Z`}
        fill={`url(#sg_${positive})`}
      />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// Mini asset card for hero illustration
function AssetCard({ symbol, name, price, change, positive }: {
  symbol: string; name: string; price: string; change: string; positive: boolean;
}) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "0.875rem 1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      minWidth: 200,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand)",
        flexShrink: 0,
      }}>
        {symbol.slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{symbol}</div>
        <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{name}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem" }}>{price}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: positive ? "var(--color-positive)" : "var(--color-negative)" }}>
          {change}
        </div>
      </div>
      <Sparkline positive={positive} />
    </div>
  );
}

const FEATURES = [
  {
    icon: <BarChart2 size={20} />,
    title: "Real Market Data",
    desc: "Simulated live prices for 20+ stocks, ETFs, and crypto. Practice with realistic market conditions.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Strategy Builder",
    desc: "Create rule-based strategies using moving averages, RSI, MACD, and more — no coding required.",
  },
  {
    icon: <FlaskConical size={20} />,
    title: "Strategy Backtesting",
    desc: "Test any strategy against historical data. Get Sharpe ratio, drawdown, win rate, and full trade history.",
  },
  {
    icon: <Cpu size={20} />,
    title: "AI Market Insights",
    desc: "AI-powered analysis of stocks and your portfolio. Understand risk before it surprises you.",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "AI Trading Coach",
    desc: "Ask about indicators, portfolio risk, trading concepts. The coach explains without prescribing.",
  },
  {
    icon: <Trophy size={20} />,
    title: "Risk-Aware Leaderboard",
    desc: "Compete on risk-adjusted returns. A disciplined 25% beats a reckless 50% here.",
  },
  {
    icon: <BookOpen size={20} />,
    title: "Structured Learning",
    desc: "Progress through modules on market fundamentals, technical analysis, and risk management.",
  },
  {
    icon: <Shield size={20} />,
    title: "Zero Real Money",
    desc: "Every trade, every loss, every win — virtual only. Learn freely without financial consequence.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up and receive ₹84 lakh in virtual funds, ready to deploy immediately.",
  },
  {
    step: "02",
    title: "Explore the market",
    desc: "Browse stocks, ETFs, and crypto. Read AI insights, check charts, add to your watchlist.",
  },
  {
    step: "03",
    title: "Execute trades",
    desc: "Place market or limit orders. Track your portfolio and P&L in real time.",
  },
  {
    step: "04",
    title: "Build and backtest strategies",
    desc: "Create systematic rules. Test them against historical data before going live.",
  },
  {
    step: "05",
    title: "Learn and improve",
    desc: "Work with the AI coach, progress through modules, and climb the leaderboard.",
  },
];

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh" }}>

      {/* ======================================================
          NAVBAR
      ====================================================== */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(13,15,20,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        padding: "0 1.5rem",
        height: 56,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: "2rem" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div style={{
              width: 28, height: 28,
              background: "var(--color-brand)",
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={16} color="var(--color-text-inv)" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              Faux<span style={{ color: "var(--color-brand)" }}>.</span>
            </span>
          </Link>

          {/* Links — desktop */}
          <div className="hidden md:flex" style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
            {["Features", "How it works", "Leaderboard"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.875rem",
                color: "var(--color-text-3)",
                textDecoration: "none",
                borderRadius: "var(--radius-md)",
                transition: "color var(--transition-fast)",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-3)")}
              >
                {l}
              </a>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.625rem", alignItems: "center" }}>
            <Link href="/login" style={{
              padding: "0.375rem 1rem",
              fontSize: "0.875rem",
              color: "var(--color-text-2)",
              textDecoration: "none",
              borderRadius: "var(--radius-md)",
            }}>
              Sign in
            </Link>
            <Link href="/register" style={{
              padding: "0.4375rem 1.125rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "var(--color-brand)",
              color: "var(--color-text-inv)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              transition: "background var(--transition-fast)",
            }}>
              Start for free
            </Link>
          </div>
        </div>
      </nav>

      {/* ======================================================
          HERO
      ====================================================== */}
      <section style={{
        padding: "6rem 1.5rem 4rem",
        maxWidth: 1200,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4rem",
        alignItems: "center",
      }}>
        {/* Left */}
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--color-brand-muted)",
            border: "1px solid var(--color-brand)",
            borderRadius: "var(--radius-full)",
            padding: "0.25rem 0.875rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-brand)",
            marginBottom: "1.5rem",
          }}>
            <Zap size={12} />
            AI-Powered Trading Simulator
          </div>

          <h1 style={{
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}>
            Master markets.<br />
            <span style={{ color: "var(--color-brand)" }}>Zero risk.</span>
          </h1>

          <p style={{
            fontSize: "1.0625rem",
            color: "var(--color-text-2)",
            lineHeight: 1.7,
            marginBottom: "2rem",
            maxWidth: 460,
          }}>
            Trade stocks, ETFs, and crypto with ₹84,00,000 in virtual funds. Build strategies, test them with real backtesting, and get AI-powered insights — without risking a single rupee.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <Link href="/register" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: "var(--color-brand)",
              color: "var(--color-text-inv)",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "0.9375rem",
              textDecoration: "none",
              transition: "all var(--transition-fast)",
              boxShadow: "var(--shadow-brand)",
            }}>
              Start trading free <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: "transparent",
              color: "var(--color-text-2)",
              borderRadius: "var(--radius-md)",
              fontWeight: 500,
              fontSize: "0.9375rem",
              textDecoration: "none",
              border: "1px solid var(--color-border)",
              transition: "all var(--transition-fast)",
            }}>
              View demo
            </Link>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              { value: "84 L", label: "Virtual funds", prefix: "₹" },
              { value: 20,     label: "Assets to trade", suffix: "+" },
              { value: 0,      label: "Real money needed", prefix: "₹" },
            ].map(({ value, label, prefix, suffix }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.375rem", fontWeight: 800, color: "var(--color-text)" }}>
                  {typeof value === "number"
                    ? <Counter target={value} prefix={prefix} suffix={suffix} />
                    : `${prefix ?? ""}${value}${suffix ?? ""}`
                  }
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product preview */}
        <div style={{ position: "relative" }}>
          {/* Dashboard preview card */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)",
          }}>
            {/* Mini topbar */}
            <div style={{
              background: "var(--color-bg-elevated)",
              borderBottom: "1px solid var(--color-border)",
              padding: "0.625rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E05252" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F0A030" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#26C281" }} />
              <div style={{ flex: 1, height: 16, borderRadius: 4, background: "var(--color-surface-2)", margin: "0 0.5rem" }} />
            </div>

            {/* Fake portfolio header */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginBottom: 4 }}>Portfolio Value</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 800 }}>₹1,07,37,667</div>
                <div style={{ color: "var(--color-positive)", fontSize: "0.875rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>▲ +₹1,07,898 (1.01%)</div>
              </div>
            </div>

            {/* Fake chart */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)" }}>
              <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26C281" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#26C281" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,70 L40,65 L80,68 L120,55 L160,50 L200,52 L240,40 L280,35 L320,30 L360,20 L400,15 L400,80 L0,80 Z"
                  fill="url(#heroChartGrad)"
                />
                <path
                  d="M0,70 L40,65 L80,68 L120,55 L160,50 L200,52 L240,40 L280,35 L320,30 L360,20 L400,15"
                  stroke="#26C281"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            {/* Asset cards */}
            <div style={{ padding: "0.875rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { symbol: "SBIN",     name: "State Bank of India",       price: "₹812",   change: "+0.62%", positive: true  },
                { symbol: "TCS",      name: "Tata Consultancy Services", price: "₹3,487", change: "−0.71%", positive: false },
                { symbol: "RELIANCE", name: "Reliance Industries",       price: "₹2,945", change: "+0.17%", positive: true  },
              ].map((a) => (
                <div key={a.symbol} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.625rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg-elevated)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: "var(--color-surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.5625rem", fontWeight: 700, color: "var(--color-brand)",
                    flexShrink: 0,
                  }}>
                    {a.symbol.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{a.symbol}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600 }}>{a.price}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: a.positive ? "var(--color-positive)" : "var(--color-negative)", width: 56, textAlign: "right" }}>
                    {a.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating AI insight chip */}
          <div style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-brand)",
            borderRadius: "var(--radius-lg)",
            padding: "0.625rem 0.875rem",
            boxShadow: "var(--shadow-brand)",
            maxWidth: 200,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: 4 }}>
              <Zap size={11} style={{ color: "var(--color-brand)" }} />
              <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Insight</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", lineHeight: 1.4 }}>
              Tech concentration at 57%. Consider diversifying into defensive sectors.
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          STAT BAR
      ====================================================== */}
      <div style={{
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-elevated)",
        padding: "1.5rem",
      }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          textAlign: "center",
        }}>
          {[
            { value: "84 L",  label: "Starting Capital", prefix: "₹" },
            { value: "20",    label: "Tradeable Assets", suffix: "+" },
            { value: "0.1",   label: "Simulated Fee", suffix: "%" },
            { value: "0",     label: "Real Money Risk", prefix: "₹" },
          ].map(({ value, label, prefix, suffix }) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 800, color: "var(--color-brand)" }}>
                {prefix ?? ""}{value}{suffix ?? ""}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}
      <section id="how-it-works" style={{ padding: "5rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
            Process
          </div>
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", marginBottom: "0.875rem" }}>How Faux Trading works</h2>
          <p style={{ color: "var(--color-text-2)", maxWidth: 500, margin: "0 auto", fontSize: "1rem" }}>
            A structured path from zero to confident trader.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          position: "relative",
        }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} style={{ position: "relative" }}>
              {/* Connector */}
              {i < HOW_IT_WORKS.length - 1 && (
                <div style={{
                  position: "absolute",
                  top: 20,
                  right: -12,
                  width: 24,
                  height: 1,
                  background: "var(--color-border)",
                  zIndex: 1,
                  display: "none",
                }} className="md:block" />
              )}

              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xl)",
                  background: "var(--color-bg-elevated)",
                  height: "100%",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--color-brand)",
                  marginBottom: "0.75rem",
                  letterSpacing: "0.1em",
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{step.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-2)", margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================
          FEATURES
      ====================================================== */}
      <section id="features" style={{
        padding: "5rem 1.5rem",
        background: "var(--color-bg-elevated)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              Capabilities
            </div>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", marginBottom: "0.875rem" }}>Everything a serious trader needs</h2>
            <p style={{ color: "var(--color-text-2)", maxWidth: 500, margin: "0 auto", fontSize: "1rem" }}>
              Without any of the financial risk.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "1.5rem",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xl)",
                  transition: "border-color var(--transition-base)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-brand)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              >
                <div style={{
                  width: 40, height: 40,
                  background: "var(--color-brand-muted)",
                  border: "1px solid var(--color-brand)",
                  borderRadius: "var(--radius-md)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--color-brand)",
                  marginBottom: "1rem",
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ fontSize: "0.875rem", margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          AI SECTION
      ====================================================== */}
      <section style={{ padding: "5rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              AI Integration
            </div>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", marginBottom: "1rem" }}>
              AI that explains,<br />not prescribes
            </h2>
            <p style={{ color: "var(--color-text-2)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              The AI coach and insights engine doesn't just say "BUY" or "SELL". It explains the reasoning, highlights risk factors, and helps you develop your own judgment.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                "Asset-level market outlook with confidence scores",
                "Portfolio risk analysis and concentration warnings",
                "Backtest result explanations in plain language",
                "Conversational coach for learning and trade review",
                "Clean interfaces ready for real ML models",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: "0.625rem", fontSize: "0.9375rem", color: "var(--color-text-2)" }}>
                  <Check size={16} style={{ color: "var(--color-positive)", flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* AI insight mockup */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "var(--color-bg-elevated)",
              borderBottom: "1px solid var(--color-border)",
              padding: "0.875rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <Zap size={14} style={{ color: "var(--color-brand)" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>AI Trading Coach</span>
              <span style={{ marginLeft: "auto", fontSize: "0.625rem", color: "var(--color-text-3)", background: "var(--color-surface-2)", padding: "2px 6px", borderRadius: 3 }}>MOCK</span>
            </div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {/* User message */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <div style={{
                  background: "var(--color-brand)",
                  color: "var(--color-text-inv)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)",
                  fontSize: "0.875rem",
                  maxWidth: "80%",
                }}>
                  How should I think about my portfolio risk?
                </div>
              </div>

              {/* AI message */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "var(--color-brand-muted)",
                  border: "1px solid var(--color-brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2,
                }}>
                  <Zap size={11} style={{ color: "var(--color-brand)" }} />
                </div>
                <div style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  padding: "0.75rem 0.875rem",
                  borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                  fontSize: "0.8125rem",
                  color: "var(--color-text-2)",
                  lineHeight: 1.6,
                  maxWidth: "90%",
                }}>
                  Your tech concentration (57%) amplifies correlated risk. A sector-wide drawdown could hit harder than individual position sizes suggest.
                  <br /><br />
                  Consider your <strong style={{ color: "var(--color-text)" }}>portfolio beta: 1.28</strong> — it moves 28% more than the market in both directions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          LEADERBOARD PREVIEW
      ====================================================== */}
      <section id="leaderboard" style={{
        padding: "5rem 1.5rem",
        background: "var(--color-bg-elevated)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              Competition
            </div>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", marginBottom: "0.875rem" }}>
              Compete on skill, not luck
            </h2>
            <p style={{ color: "var(--color-text-2)", maxWidth: 480, margin: "0 auto", fontSize: "1rem" }}>
              Rankings are based on risk-adjusted returns. Taking massive risks to rank higher is penalized.
            </p>
          </div>

          {/* Mini leaderboard */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", gap: "1rem" }}>
              {["Rank", "Trader", "Return", "Sharpe", "Win Rate"].map((h, i) => (
                <div key={h} style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--color-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flex: i === 1 ? 2 : 1,
                  textAlign: i > 1 ? "right" : "left",
                }}>
                  {h}
                </div>
              ))}
            </div>
            {[
              { rank: 1, name: "alpha_trader",   ret: "+48.92%", sharpe: "2.14", win: "68.4%", medal: "🏆" },
              { rank: 2, name: "quant_maya",     ret: "+41.23%", sharpe: "1.98", win: "65.2%", medal: "🥈" },
              { rank: 3, name: "risk_aware",     ret: "+38.45%", sharpe: "2.31", win: "71.0%", medal: "🥉" },
              { rank: 7, name: "trader",         ret: "+27.84%", sharpe: "1.71", win: "62.5%", current: true },
            ].map((entry) => (
              <div
                key={entry.rank}
                style={{
                  padding: "0.875rem 1.25rem",
                  borderBottom: "1px solid var(--color-border-dim)",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  background: entry.current ? "var(--color-brand-subtle)" : undefined,
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: entry.rank <= 3 ? ["#E8A838", "#C0C0C0", "#CD7F32"][entry.rank - 1] : "var(--color-text-3)",
                  }}>
                    {entry.medal ?? `#${entry.rank}`}
                  </span>
                </div>
                <div style={{ flex: 2, fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
                  {entry.name}
                  {entry.current && <span style={{ fontSize: "0.625rem", background: "var(--color-brand)", color: "var(--color-text-inv)", padding: "1px 5px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>YOU</span>}
                </div>
                <div style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-positive)" }}>{entry.ret}</div>
                <div style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>{entry.sharpe}</div>
                <div style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-text-2)" }}>{entry.win}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA
      ====================================================== */}
      <section style={{ padding: "6rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Ready to start trading?
          </h2>
          <p style={{ color: "var(--color-text-2)", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Join thousands of learners building their trading skills without financial risk. No credit card required.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.875rem 2rem",
              background: "var(--color-brand)",
              color: "var(--color-text-inv)",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              boxShadow: "var(--shadow-brand)",
              transition: "all var(--transition-fast)",
            }}>
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.875rem 2rem",
              background: "transparent",
              color: "var(--color-text-2)",
              borderRadius: "var(--radius-md)",
              fontWeight: 500,
              fontSize: "1rem",
              textDecoration: "none",
              border: "1px solid var(--color-border)",
            }}>
              Explore demo
            </Link>
          </div>
          <div style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--color-text-3)", display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {["Free forever", "No real money", "No credit card"].map((item) => (
              <span key={item} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} style={{ color: "var(--color-positive)" }} /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <footer style={{
        borderTop: "1px solid var(--color-border)",
        padding: "2rem 1.5rem",
        background: "var(--color-bg-elevated)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 22, height: 22, background: "var(--color-brand)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={12} color="var(--color-text-inv)" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>Faux<span style={{ color: "var(--color-brand)" }}>.</span></span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
              — Virtual trading simulator. No real money involved.
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
            For educational purposes only. Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
