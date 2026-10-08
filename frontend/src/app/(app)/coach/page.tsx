"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Zap, RefreshCw, BookOpen, BarChart2,
  TrendingUp, AlertTriangle, Briefcase, MessageSquare
} from "lucide-react";
import { apiCoachChat } from "@/lib/api";
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

const WELCOME = (): CoachMessage => ({
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your trading coach. Ask about a stock (e.g. **How is TCS looking?**), your portfolio (**How is my portfolio?**), the market (**How is the market today?**), or a concept like RSI or the Sharpe ratio.\n\nStock, portfolio and market answers use live prices, your real holdings, and the XGBoost model.",
  timestamp: new Date().toISOString(),
});

export default function CoachPage() {
  const [messages, setMessages] = useState<CoachMessage[]>([WELCOME()]);
  const [sources, setSources] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function sendMessage(text?: string) {
    const msg = text ?? input;
    if (!msg.trim() || isTyping) return;

    const userMsg: CoachMessage = {
      id: `m${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    const history = messages.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    let reply: string;
    try {
      const r = await apiCoachChat(msg, history);
      reply = r.content;
      setSources(r.is_mock ? [] : r.context_used);
    } catch (err) {
      reply = `Sorry, I couldn't reach the server (${err instanceof Error ? err.message : "unknown error"}). Please try again.`;
      setSources([]);
    }
    setIsTyping(false);
    setMessages((prev) => [...prev, {
      id: `m${Date.now() + 1}`,
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
    }]);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", height: "calc(100vh - 130px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Zap size={18} style={{ color: "var(--color-brand)" }} />
          <h1 style={{ fontSize: "1.25rem" }}>AI Trading Coach</h1>
          <span style={{ fontSize: "0.625rem", background: "var(--color-surface-2)", color: "var(--color-text-3)", padding: "2px 6px", borderRadius: 3, marginLeft: 4 }}>
            {sources.length > 0 ? `LIVE: ${sources.join(" · ")}` : "LIVE DATA + EDUCATION"}
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
              onClick={() => setMessages([WELCOME()])}
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
            Answers use live market data and a statistical model. Educational only, not investment advice.
          </div>
        </div>
      </div>
    </div>
  );
}
