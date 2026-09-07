"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Zap, RefreshCw, BookOpen, BarChart2,
  TrendingUp, AlertTriangle, Briefcase, MessageSquare
} from "lucide-react";
import { MOCK_COACH_CONVERSATION } from "@/lib/mock-data";
import type { CoachMessage } from "@/lib/types";

// Suggested prompts
const SUGGESTIONS = [
  { icon: <BarChart2 size={14} />, text: "Explain RSI and how to use it" },
  { icon: <TrendingUp size={14} />, text: "What is a moving average crossover?" },
  { icon: <AlertTriangle size={14} />, text: "How should I think about position sizing?" },
  { icon: <Briefcase size={14} />, text: "Analyze my portfolio risk" },
  { icon: <BookOpen size={14} />, text: "Explain the Sharpe ratio" },
  { icon: <BarChart2 size={14} />, text: "What is the difference between ROI and CAGR?" },
];

// Mock AI coach responses
const MOCK_RESPONSES: Record<string, string> = {
  default: `Great question! Let me break this down for you.

As a trading simulator, we focus on helping you understand concepts through practice rather than prescribing what to buy or sell.

The key principle here is that **risk management** comes before any strategy. Even the best setups can lose money if position sizing is wrong.

A few things to consider:
- Never risk more than 1-2% of your portfolio on a single trade
- Understand the difference between volatility and risk
- Track your trades systematically so you can identify patterns

What aspect would you like to explore further?`,

  rsi: `**RSI (Relative Strength Index)** is a momentum oscillator that measures the speed and change of price movements.

**How it works:**
RSI moves between 0 and 100. Traditionally:
- **Above 70** → Potentially overbought (not necessarily a sell signal)
- **Below 30** → Potentially oversold (not necessarily a buy signal)

**The key misconception:** Most beginners treat RSI like an on/off switch. A stock can stay "overbought" for months in a strong uptrend.

**Better uses for RSI:**
1. **Divergence** — Price makes new high, RSI doesn't → potential weakness
2. **Context** — In uptrends, 40-50 can act as support
3. **Confirmation** — Use with price structure, not alone

Try this: Look at SBIN or TCS on the market page. Switch to the candlestick view and observe how RSI aligns with actual price behavior.`,

  portfolio: `Looking at your current portfolio, a few observations:

**Concentration**
Your financial sector exposure (SBIN, HDFCBANK, ICICIBANK, ABCAPITAL) represents ~23% of the portfolio. Your tech holdings (TCS, INFY) add another ~12%.

**What this means in practice:**
- A sector-wide sell-off in Indian banking could amplify losses across correlated positions
- Diversifying into ITC (Consumer) and LT (Industrials) helps reduce this

**Risk-adjusted perspective:**
Your unrealized P&L is strong (+₹21,38,000). The key question: do you have a clear exit plan for each position?

**Suggestions to explore:**
- Review your largest position (ITC at 7.89% weight) — is conviction still high?
- Use the Backtesting tool to stress-test different allocations
- Check the XGBoost predictions on the AI Insights page for current signals

Remember: **protecting gains is just as important as making them.**

_This analysis uses mock data. In the real product, this would be powered by XGBoost portfolio risk analysis._`,

  sharpe: `**The Sharpe Ratio** measures risk-adjusted return — how much return you're getting per unit of risk.

**Formula:**
\`Sharpe = (Portfolio Return - Risk-Free Rate) / Standard Deviation\`

**What the numbers mean:**
- **Below 1.0** → Not great — you're taking more risk than the return justifies
- **1.0 - 2.0** → Good — solid risk-adjusted performance  
- **Above 2.0** → Excellent — very efficient use of risk

**Why it matters for you:**
Looking at the leaderboard, notice how the top players aren't necessarily the ones with the highest raw returns — they have the best **risk-adjusted** returns.

Someone with 35% return and Sharpe of 2.3 is a better trader than someone with 50% return and Sharpe of 0.8.

**Limitation of Sharpe:**
It treats upside and downside volatility equally. The Sortino ratio (which you'll see in backtests) fixes this by only penalizing **downside** volatility.

Try running a backtest on any strategy — you'll see both metrics in the results.`,
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rsi") || lower.includes("relative strength")) return MOCK_RESPONSES.rsi;
  if (lower.includes("portfolio") || lower.includes("risk") || lower.includes("allocation")) return MOCK_RESPONSES.portfolio;
  if (lower.includes("sharpe") || lower.includes("ratio")) return MOCK_RESPONSES.sharpe;
  return MOCK_RESPONSES.default;
}

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";

  // Simple markdown-like formatting
  const formatContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <strong key={i} style={{ color: "var(--color-text)" }}>{line.slice(2, -2)}</strong>;
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
            <span style={{ color: "var(--color-brand)", flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong style='color:var(--color-text)'>$1</strong>").replace(/`(.+?)`/g, "<code style='font-family:monospace;background:var(--color-surface-2);padding:1px 4px;border-radius:3px;font-size:0.85em'>$1</code>") }} />
          </div>
        );
      }
      if (line === "") return <div key={i} style={{ height: 6 }} />;

      // Bold inline
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <div key={i} style={{ marginBottom: 2 }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: "var(--color-text)" }}>{part}</strong>
              : <span key={j} dangerouslySetInnerHTML={{ __html: part.replace(/`(.+?)`/g, "<code style='font-family:monospace;background:var(--color-surface-2);padding:1px 4px;border-radius:3px;font-size:0.85em'>$1</code>").replace(/_(.+?)_/g, "<em>$1</em>") }} />
          )}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "0.625rem",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "1rem",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--color-brand-muted)",
            border: "1px solid var(--color-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Zap size={13} style={{ color: "var(--color-brand)" }} />
        </div>
      )}

      <div
        style={{
          maxWidth: "75%",
          padding: "0.75rem 1rem",
          borderRadius: isUser ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)" : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
          background: isUser ? "var(--color-brand)" : "var(--color-surface)",
          border: isUser ? "none" : "1px solid var(--color-border)",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: isUser ? "var(--color-text-inv)" : "var(--color-text-2)",
        }}
      >
        {isUser ? (
          <div style={{ color: "var(--color-text-inv)" }}>{message.content}</div>
        ) : (
          <div>{formatContent(message.content)}</div>
        )}
        <div style={{
          fontSize: "0.625rem",
          marginTop: 6,
          color: isUser ? "rgba(13,15,20,0.5)" : "var(--color-text-3)",
        }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

export default function CoachPage() {
  const [messages, setMessages] = useState<CoachMessage[]>(MOCK_COACH_CONVERSATION);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendMessage(text?: string) {
    const msg = text ?? input;
    if (!msg.trim()) return;

    const userMsg: CoachMessage = {
      id: `m${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getMockResponse(msg);
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: `m${Date.now() + 1}`,
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      }]);
    }, 1200 + Math.random() * 800);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", height: "calc(100vh - 130px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Zap size={18} style={{ color: "var(--color-brand)" }} />
          <h1 style={{ fontSize: "1.25rem" }}>AI Trading Coach</h1>
          <span style={{ fontSize: "0.625rem", background: "var(--color-surface-2)", color: "var(--color-text-3)", padding: "2px 6px", borderRadius: 3, marginLeft: 4 }}>
            MOCK
          </span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", margin: 0 }}>
          Ask about trading concepts, your portfolio, strategies, or technical indicators.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Messages */}
          <div
            className="surface"
            style={{
              flex: 1,
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem",
              overflowY: "auto",
              marginBottom: "0.75rem",
            }}
          >
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}

            {isTyping && (
              <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-brand-muted)", border: "1px solid var(--color-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Zap size={13} style={{ color: "var(--color-brand)" }} />
                </div>
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--color-text-3)",
                        display: "inline-block",
                        animation: `pulse-subtle 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask about indicators, strategies, your portfolio…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--color-text)",
                fontSize: "0.9375rem",
                fontFamily: "inherit",
              }}
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              style={{
                background: input.trim() && !isTyping ? "var(--color-brand)" : "var(--color-border)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 0.875rem",
                cursor: input.trim() && !isTyping ? "pointer" : "default",
                color: input.trim() && !isTyping ? "var(--color-text-inv)" : "var(--color-text-3)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: "0.875rem",
                transition: "all var(--transition-fast)",
              }}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Sidebar — suggestions */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
              Quick Questions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  disabled={isTyping}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.625rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    color: "var(--color-text-2)",
                    transition: "all var(--transition-fast)",
                    width: "100%",
                    opacity: isTyping ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => !isTyping && (e.currentTarget.style.borderColor = "var(--color-brand)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                >
                  <span style={{ color: "var(--color-brand)", flexShrink: 0 }}>{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>

          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
              Context
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", lineHeight: 1.6 }}>
              The coach has context about your portfolio, recent trades, and any selected strategy.
            </div>
            <button
              onClick={() => setMessages(MOCK_COACH_CONVERSATION)}
              style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "0.625rem", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)", fontSize: "0.75rem" }}
            >
              <RefreshCw size={11} /> Reset conversation
            </button>
          </div>

          <div
            style={{
              padding: "0.75rem",
              background: "var(--color-warning-dim)",
              border: "1px solid var(--color-warning)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.6875rem",
              color: "var(--color-warning)",
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={11} style={{ marginBottom: 2, display: "inline", marginRight: 4 }} />
            Mock AI responses for development. Not investment advice.
          </div>
        </div>
      </div>
    </div>
  );
}
