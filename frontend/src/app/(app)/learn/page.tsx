"use client";

import { useState } from "react";
import {
  BookOpen, CheckCircle, Lock, Play, ArrowRight,
  TrendingUp, Shield, BarChart2, Lightbulb, Star,
  Clock, ChevronRight, X,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────

const MODULES = [
  {
    id: "basics",
    icon: <BookOpen size={22} />,
    color: "#26C281",
    title: "Market Basics",
    tagline: "What is a stock? How do markets work?",
    duration: "~20 min",
    lessons: [
      { id: "l1", title: "What is a stock?",           done: true,  duration: "3 min", emoji: "📈" },
      { id: "l2", title: "How stock exchanges work",   done: true,  duration: "3 min", emoji: "🏦" },
      { id: "l3", title: "Reading a price quote",      done: true,  duration: "2 min", emoji: "🔢" },
      { id: "l4", title: "Market vs limit orders",     done: true,  duration: "4 min", emoji: "📋" },
      { id: "l5", title: "What moves stock prices?",   done: false, duration: "4 min", emoji: "🌊" },
      { id: "l6", title: "Market indices explained",   done: false, duration: "4 min", emoji: "📊" },
    ],
  },
  {
    id: "charts",
    icon: <BarChart2 size={22} />,
    color: "#E8A838",
    title: "Reading Charts",
    tagline: "Understand price charts and patterns",
    duration: "~30 min",
    lessons: [
      { id: "l7",  title: "Candlestick charts",        done: true,  duration: "5 min", emoji: "🕯️" },
      { id: "l8",  title: "Support & resistance",      done: false, duration: "5 min", emoji: "📐" },
      { id: "l9",  title: "Moving averages (SMA/EMA)", done: false, duration: "6 min", emoji: "📉" },
      { id: "l10", title: "RSI — momentum indicator",  done: false, duration: "5 min", emoji: "⚡" },
      { id: "l11", title: "Volume — why it matters",   done: false, duration: "5 min", emoji: "📦" },
      { id: "l12", title: "MACD in plain English",     done: false, duration: "4 min", emoji: "🎯" },
    ],
  },
  {
    id: "risk",
    icon: <Shield size={22} />,
    color: "#4A9EEA",
    title: "Risk Management",
    tagline: "Protect your capital first, always",
    duration: "~25 min",
    lessons: [
      { id: "l13", title: "Why risk management matters",  done: false, duration: "4 min", emoji: "🛡️" },
      { id: "l14", title: "Position sizing basics",       done: false, duration: "5 min", emoji: "⚖️" },
      { id: "l15", title: "Setting stop losses",          done: false, duration: "4 min", emoji: "🚦" },
      { id: "l16", title: "Risk/reward ratio",            done: false, duration: "5 min", emoji: "🎲" },
      { id: "l17", title: "Diversification — how & why", done: false, duration: "4 min", emoji: "🌍" },
      { id: "l18", title: "Avoiding emotional trading",  done: false, duration: "3 min", emoji: "🧠" },
    ],
  },
  {
    id: "strategy",
    icon: <TrendingUp size={22} />,
    color: "#A855F7",
    title: "Strategies",
    tagline: "Build a system, not just vibes",
    duration: "~35 min",
    locked: true,
    lessons: [
      { id: "l19", title: "What makes a good strategy?",  done: false, duration: "4 min", emoji: "🗺️" },
      { id: "l20", title: "Trend following explained",    done: false, duration: "5 min", emoji: "🏄" },
      { id: "l21", title: "Mean reversion trading",       done: false, duration: "5 min", emoji: "🔄" },
      { id: "l22", title: "Backtesting — test before use",done: false, duration: "6 min", emoji: "🔬" },
      { id: "l23", title: "Overfitting — a real danger",  done: false, duration: "5 min", emoji: "⚠️" },
      { id: "l24", title: "Paper trading practice",       done: false, duration: "5 min", emoji: "📝" },
    ],
  },
  {
    id: "portfolio",
    icon: <Lightbulb size={22} />,
    color: "#F59E0B",
    title: "Portfolio Building",
    tagline: "Think like an investor, not a gambler",
    duration: "~20 min",
    locked: true,
    lessons: [
      { id: "l25", title: "Asset allocation basics",    done: false, duration: "4 min", emoji: "🧩" },
      { id: "l26", title: "Sharpe ratio — explained",   done: false, duration: "4 min", emoji: "📐" },
      { id: "l27", title: "Rebalancing your portfolio", done: false, duration: "4 min", emoji: "⚖️" },
      { id: "l28", title: "Long-term vs short-term",    done: false, duration: "4 min", emoji: "🕰️" },
      { id: "l29", title: "Tracking performance",       done: false, duration: "4 min", emoji: "📊" },
    ],
  },
];

// ─── Lesson modal content ────────────────────────────────────

const LESSON_CONTENT: Record<string, { title: string; body: string[] }> = {
  l1: {
    title: "What is a stock?",
    body: [
      "A stock is a small piece of ownership in a company. When you buy 1 share of Apple, you own a tiny slice of Apple Inc.",
      "Companies sell shares to raise money for growth. In return, you get to benefit if the company grows in value.",
      "If you own shares in a company that doubles in value, your shares are worth double too. That's the upside.",
      "The downside? If the company performs badly, the share price drops and your investment loses value.",
      "💡 In Faux Trading, you can buy shares of 20 real companies using virtual rupees — zero real money at risk.",
    ],
  },
  l4: {
    title: "Market vs Limit Orders",
    body: [
      "A Market Order buys or sells immediately at whatever the current price is. Fast, but you don't control the exact price.",
      "A Limit Order lets you set your price. If you want to buy SBIN at ₹780, the order only executes if the price reaches ₹780.",
      "Market orders are great when you want to buy right now. Limit orders are better when you have a target price in mind.",
      "🚨 Important: In fast-moving markets, market orders can fill at a slightly different price than expected. This is called slippage.",
      "💡 Try both in Faux Trading — place a market order and a limit order on any stock to see how they behave differently.",
    ],
  },
  l7: {
    title: "Candlestick Charts",
    body: [
      "Each 'candle' on a candlestick chart shows price movement over a period of time — it could be 1 minute, 1 day, or 1 week.",
      "A green candle means the price went UP during that period. The bottom is where it opened, the top is where it closed.",
      "A red candle means the price went DOWN. The top is where it opened, the bottom is where it closed.",
      "The thin lines above and below (called wicks or shadows) show the highest and lowest prices reached during that period.",
      "💡 Open the chart on any stock in Faux Trading and switch to 'Candle' view to practice reading them in real time.",
    ],
  },
};

// ─── Components ─────────────────────────────────────────────

function LessonModal({
  lesson,
  moduleColor,
  onClose,
  onComplete,
}: {
  lesson: typeof MODULES[0]["lessons"][0];
  moduleColor: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const content = LESSON_CONTENT[lesson.id];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          width: "min(600px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ fontSize: "1.5rem" }}>{lesson.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{lesson.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={11} /> {lesson.duration} read
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)", padding: 4 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {content ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {content.body.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: "0.9375rem",
                    color: para.startsWith("💡") || para.startsWith("🚨")
                      ? "var(--color-text)"
                      : "var(--color-text-2)",
                    lineHeight: 1.75,
                    margin: 0,
                    background: para.startsWith("💡") ? "var(--color-brand-subtle)" :
                                para.startsWith("🚨") ? "var(--color-warning-dim)" : "transparent",
                    padding: para.startsWith("💡") || para.startsWith("🚨") ? "0.75rem 1rem" : "0",
                    borderRadius: para.startsWith("💡") || para.startsWith("🚨") ? "var(--radius-md)" : "0",
                    borderLeft: para.startsWith("💡") ? `3px solid var(--color-brand)` :
                                para.startsWith("🚨") ? `3px solid var(--color-warning)` : "none",
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚧</div>
              <p style={{ color: "var(--color-text-3)", fontSize: "0.9375rem" }}>
                This lesson is coming soon. Check back later!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            Close
          </button>
          {!lesson.done && content && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="btn btn-primary btn-sm"
              style={{ gap: "0.375rem" }}
            >
              <CheckCircle size={14} /> Mark as done
            </button>
          )}
          {lesson.done && (
            <span style={{ fontSize: "0.8125rem", color: "var(--color-positive)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle size={14} /> Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────

export default function LearnPage() {
  const [modules, setModules] = useState(MODULES);
  const [openLesson, setOpenLesson] = useState<{
    lesson: typeof MODULES[0]["lessons"][0];
    moduleId: string;
    color: string;
  } | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const doneLessons  = modules.reduce((a, m) => a + m.lessons.filter(l => l.done).length, 0);
  const pct = Math.round((doneLessons / totalLessons) * 100);

  function markDone(moduleId: string, lessonId: string) {
    setModules(prev => prev.map(m =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, done: true } : l) }
        : m
    ));
  }

  // Find next undone lesson for "Continue" button
  const nextLesson = (() => {
    for (const m of modules) {
      if (m.locked) continue;
      for (const l of m.lessons) {
        if (!l.done) return { lesson: l, module: m };
      }
    }
    return null;
  })();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.375rem", marginBottom: "0.25rem" }}>Learn to Trade</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)" }}>
          Short lessons, plain language. No jargon, no fluff.
        </p>
      </div>

      {/* Progress card */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Circular progress */}
        <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
          <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={32} cy={32} r={26} fill="none" stroke="var(--color-border)" strokeWidth={5} />
            <circle
              cx={32} cy={32} r={26}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth={5}
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-brand)",
          }}>
            {pct}%
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
            {doneLessons} of {totalLessons} lessons done
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--color-border)", overflow: "hidden", marginBottom: "0.5rem" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: "var(--color-brand)", borderRadius: 3,
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
            {pct === 100
              ? "🎉 All done! You're ready to trade with confidence."
              : nextLesson
              ? `Up next: ${nextLesson.lesson.title}`
              : "Keep going!"}
          </div>
        </div>

        {nextLesson && (
          <button
            onClick={() => setOpenLesson({
              lesson: nextLesson.lesson,
              moduleId: nextLesson.module.id,
              color: nextLesson.module.color,
            })}
            className="btn btn-primary"
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Play size={14} /> Continue
          </button>
        )}
      </div>

      {/* Module cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {modules.map((mod) => {
          const done = mod.lessons.filter(l => l.done).length;
          const total = mod.lessons.length;
          const modPct = Math.round((done / total) * 100);
          const isOpen = activeModule === mod.id;
          const isComplete = done === total;

          return (
            <div
              key={mod.id}
              style={{
                background: "var(--color-surface)",
                border: `1px solid ${isComplete ? mod.color + "60" : "var(--color-border)"}`,
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                opacity: mod.locked ? 0.55 : 1,
              }}
            >
              {/* Module header — click to expand */}
              <button
                onClick={() => !mod.locked && setActiveModule(isOpen ? null : mod.id)}
                disabled={mod.locked}
                style={{
                  width: "100%", background: "none", border: "none",
                  cursor: mod.locked ? "not-allowed" : "pointer",
                  padding: "1.125rem 1.25rem",
                  display: "flex", alignItems: "center", gap: "1rem",
                  textAlign: "left",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius-lg)",
                  background: mod.color + "18",
                  border: `1px solid ${mod.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: mod.color, flexShrink: 0,
                }}>
                  {mod.locked ? <Lock size={20} style={{ color: "var(--color-text-3)" }} /> : mod.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)" }}>
                      {mod.title}
                    </span>
                    {mod.locked && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.625rem" }}>LOCKED</span>
                    )}
                    {isComplete && (
                      <span className="badge badge-positive" style={{ fontSize: "0.625rem" }}>DONE</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
                    {mod.tagline}
                  </div>
                </div>

                {/* Progress + meta */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: mod.color, marginBottom: 4 }}>
                    {done}/{total}
                  </div>
                  <div style={{
                    width: 80, height: 4, borderRadius: 2,
                    background: "var(--color-border)", overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${modPct}%`, height: "100%",
                      background: mod.color, borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)", marginTop: 4 }}>
                    <Clock size={10} style={{ display: "inline", marginRight: 2 }} />
                    {mod.duration}
                  </div>
                </div>

                {!mod.locked && (
                  <ChevronRight
                    size={16}
                    style={{
                      color: "var(--color-text-3)", flexShrink: 0,
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                )}
              </button>

              {/* Lesson list — expandable */}
              {isOpen && !mod.locked && (
                <div style={{ borderTop: "1px solid var(--color-border-dim)" }}>
                  {mod.lessons.map((lesson, i) => (
                    <button
                      key={lesson.id}
                      onClick={() => setOpenLesson({ lesson, moduleId: mod.id, color: mod.color })}
                      style={{
                        width: "100%", background: "none", border: "none",
                        cursor: "pointer", textAlign: "left",
                        padding: "0.75rem 1.25rem",
                        display: "flex", alignItems: "center", gap: "0.875rem",
                        borderBottom: i < mod.lessons.length - 1 ? "1px solid var(--color-border-dim)" : "none",
                        transition: "background var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {/* Status icon */}
                      <div style={{
                        width: 32, height: 32,
                        borderRadius: "50%",
                        background: lesson.done ? mod.color + "18" : "var(--color-bg-elevated)",
                        border: `1.5px solid ${lesson.done ? mod.color : "var(--color-border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: "0.875rem",
                      }}>
                        {lesson.done
                          ? <CheckCircle size={15} style={{ color: mod.color }} />
                          : <span>{lesson.emoji}</span>
                        }
                      </div>

                      {/* Title */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: "0.875rem",
                          fontWeight: lesson.done ? 400 : 500,
                          color: lesson.done ? "var(--color-text-3)" : "var(--color-text)",
                          textDecoration: lesson.done ? "line-through" : "none",
                        }}>
                          {lesson.title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} /> {lesson.duration}
                        </div>
                      </div>

                      <ArrowRight size={14} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips section */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "1.25rem 1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Star size={15} style={{ color: "var(--color-brand)" }} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Quick Tips</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.875rem" }}>
            {[
              { emoji: "📊", tip: "Practice on the Market page while you learn — hands-on beats theory." },
              { emoji: "🧪", tip: "Use Backtesting to test strategies risk-free before going live." },
              { emoji: "🤖", tip: "Ask the AI Coach to explain any concept in plain language." },
              { emoji: "🎯", tip: "Focus on 1–2% risk per trade. Consistent small wins beat big gambles." },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "0.875rem",
                  display: "flex", gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{t.emoji}</span>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", margin: 0, lineHeight: 1.6 }}>
                  {t.tip}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson modal */}
      {openLesson && (
        <LessonModal
          lesson={openLesson.lesson}
          moduleColor={openLesson.color}
          onClose={() => setOpenLesson(null)}
          onComplete={() => markDone(openLesson.moduleId, openLesson.lesson.id)}
        />
      )}
    </div>
  );
}
