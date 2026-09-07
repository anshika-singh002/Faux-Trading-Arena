"use client";

import { useState } from "react";
import { User, Shield, Bell, Award } from "lucide-react";
import { MOCK_PORTFOLIO, MOCK_LEADERBOARD, formatCurrency, formatPercent } from "@/lib/mock-data";
import { useAuthStore } from "@/lib/auth-store";

export default function ProfilePage() {
  const { user, login } = useAuthStore();
  const me = MOCK_LEADERBOARD.find((e) => e.isCurrentUser)!;

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername]       = useState(user?.username ?? "");
  const [email, setEmail]             = useState(user?.email ?? "");
  const [saved, setSaved]             = useState(false);

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : "FT";

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (user) {
      login({ ...user, displayName, username, email });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Profile</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem" }}>
        {/* Left: Avatar + stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.5rem", textAlign: "center" }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--color-brand-muted)",
                border: "2px solid var(--color-brand)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", fontWeight: 700, color: "var(--color-brand)",
                margin: "0 auto 1rem",
              }}
            >
              {initials}
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: 2 }}>
              {displayName || "—"}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1rem" }}>
              @{username || "—"}
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Rank</div>
                <div style={{ fontWeight: 700, color: "var(--color-brand)" }}>
                  {user?.rank ? `#${user.rank}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Trades</div>
                <div style={{ fontWeight: 700 }}>{me?.totalTrades ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Win Rate</div>
                <div style={{ fontWeight: 700, color: "var(--color-positive)" }}>
                  {me?.winRate ?? 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginBottom: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Performance
            </div>
            {[
              { label: "Portfolio Value", value: formatCurrency(MOCK_PORTFOLIO.totalValue) },
              { label: "Total Return",    value: formatPercent(MOCK_PORTFOLIO.totalReturnPercent), positive: true },
              { label: "Sharpe Ratio",    value: me?.sharpeRatio.toFixed(2) ?? "—" },
              { label: "Win Rate",        value: `${me?.winRate ?? 0}%`, positive: true },
            ].map(({ label, value, positive }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4375rem 0", borderBottom: "1px solid var(--color-border-dim)" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>{label}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600,
                  color: positive ? "var(--color-positive)" : "var(--color-text)",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Achievements */}
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
              <Award size={14} style={{ color: "var(--color-brand)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Achievements
              </span>
            </div>
            {[
              { icon: "🎯", name: "First Profit",  desc: "Realized first gain" },
              { icon: "📊", name: "Strategist",    desc: "Created first strategy" },
              { icon: "🔬", name: "Backtester",    desc: "Ran first backtest" },
              { icon: "🏆", name: "Top 10",        desc: "Reached top 10" },
            ].map((a) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.125rem" }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)" }}>{a.name}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User size={15} style={{ color: "var(--color-text-3)" }} /> Account Settings
            </h3>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  Display Name
                </label>
                <input
                  className="input-base"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  Username
                </label>
                <input
                  className="input-base"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  className="input-base"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ alignSelf: "flex-start" }}
              >
                {saved ? "✓ Saved" : "Save Changes"}
              </button>
            </form>
          </div>

          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell size={15} style={{ color: "var(--color-text-3)" }} /> Notifications
            </h3>
            {[
              { label: "Order fills",       desc: "Get notified when orders are executed",  on: true  },
              { label: "Price alerts",      desc: "Alerts for stocks in your watchlist",    on: true  },
              { label: "AI insights",       desc: "New analysis from the AI engine",        on: false },
              { label: "Portfolio digest",  desc: "Daily portfolio summary",                on: false },
            ].map(({ label, desc, on }, i) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.625rem 0",
                  borderBottom: i < 3 ? "1px solid var(--color-border-dim)" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{desc}</div>
                </div>
                <div
                  role="switch"
                  aria-checked={on}
                  tabIndex={0}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: on ? "var(--color-positive)" : "var(--color-border)",
                    cursor: "pointer", position: "relative",
                    transition: "background var(--transition-fast)", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 2,
                    left: on ? "calc(100% - 18px)" : 2,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "white",
                    transition: "left var(--transition-fast)",
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Shield size={15} style={{ color: "var(--color-text-3)" }} /> Security
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  Current Password
                </label>
                <input className="input-base" type="password" placeholder="••••••••" />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  New Password
                </label>
                <input className="input-base" type="password" placeholder="••••••••" />
              </div>
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
                Update Password
              </button>
            </div>
          </div>

          <div
            className="surface"
            style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem", border: "1px solid var(--color-negative-dim)" }}
          >
            <h3 style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--color-negative)" }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1rem" }}>
              Reset your virtual portfolio to ₹84,00,000. This cannot be undone.
            </p>
            <button
              style={{
                background: "var(--color-negative-dim)",
                border: "1px solid var(--color-negative)",
                borderRadius: "var(--radius-md)",
                padding: "0.375rem 1rem",
                cursor: "pointer",
                color: "var(--color-negative)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Reset Portfolio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
