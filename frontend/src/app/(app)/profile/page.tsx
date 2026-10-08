"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, Award } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import {
  apiGetPortfolio, apiGetLeaderboard, apiListStrategies, apiUpdateDisplayName, apiResetPortfolio, apiChangePassword,
  type PortfolioSummary, type LeaderboardRow,
} from "@/lib/api";

export default function ProfilePage() {
  const { user, setDisplayName: storeSetDisplayName, updateBalance } = useAuthStore();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const [strategyCount, setStrategyCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    apiGetPortfolio().then(setPortfolio).catch(() => {});
    apiGetLeaderboard().then((rows) => setMe(rows.find((r) => r.is_current_user) ?? null)).catch(() => {});
    apiListStrategies().then((list) => setStrategyCount(list.length)).catch(() => {});
  }, [user]);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [pwBusy, setPwBusy]       = useState(false);
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const username = user?.username ?? "";
  const email = user?.email ?? "";

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : "FT";

  async function handlePassword(ev: React.FormEvent) {
    ev.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    try {
      await apiChangePassword(currentPw, newPw);
      setPwMsg({ ok: true, text: "Password updated." });
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Could not update the password" });
    } finally {
      setPwBusy(false);
    }
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    setSaveError("");
    try {
      await apiUpdateDisplayName(displayName);
      storeSetDisplayName(displayName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes");
    }
  }

  async function handleReset() {
    if (!window.confirm("Reset your virtual portfolio? All positions, orders and trades will be deleted. This cannot be undone.")) return;
    try {
      const r = await apiResetPortfolio();
      updateBalance(r.virtual_balance);
      setPortfolio(await apiGetPortfolio());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not reset the portfolio");
    }
  }

  const achievements = [
    { icon: "\ud83c\udfaf", name: "First Trade",  desc: "Placed your first trade", done: (me?.total_trades ?? 0) > 0 },
    { icon: "\ud83d\udcb0", name: "First Profit", desc: "Realized a gain",         done: (me?.win_rate ?? 0) > 0 },
    { icon: "\ud83d\udcca", name: "Strategist",   desc: "Created a strategy",      done: strategyCount > 0 },
    { icon: "\ud83c\udfc6", name: "Top 10",       desc: "Reached the top 10",      done: !!me && me.rank <= 10 },
  ];

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
                  {me ? `#${me.rank}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Trades</div>
                <div style={{ fontWeight: 700 }}>{me?.total_trades ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>Win Rate</div>
                <div style={{ fontWeight: 700, color: "var(--color-positive)" }}>
                  {me?.win_rate ?? 0}%
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
              { label: "Portfolio Value", value: portfolio ? formatCurrency(portfolio.total_value) : "—" },
              { label: "Total Return",    value: portfolio ? formatPercent(portfolio.total_return_percent) : "—", positive: (portfolio?.total_return_percent ?? 0) > 0 },
              { label: "Realized P&L",    value: portfolio ? formatCurrency(portfolio.realized_pnl) : "—", positive: (portfolio?.realized_pnl ?? 0) > 0 },
              { label: "Win Rate",        value: `${me?.win_rate ?? 0}%`, positive: (me?.win_rate ?? 0) >= 50 },
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
            {achievements.map((a) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", opacity: a.done ? 1 : 0.4 }}>
                <span style={{ fontSize: "1.125rem" }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)" }}>{a.name}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>{a.desc}{a.done ? " \u2713" : ""}</div>
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
                  readOnly
                  disabled
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
                  readOnly
                  disabled
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
              {saveError && <div style={{ fontSize: "0.75rem", color: "var(--color-negative)" }}>{saveError}</div>}
            </form>
          </div>

          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell size={15} style={{ color: "var(--color-text-3)" }} /> Alerts you get
            </h3>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
              <li><strong>Bell icon:</strong> order fills, and limit orders that were cancelled.</li>
              <li><strong>Before a buy:</strong> a warning if the stock&apos;s real price history says it may lose money.</li>
              <li><strong>Portfolio page:</strong> an alert for holdings whose gains may reverse or whose trend is falling.</li>
            </ul>
          </div>

          <div className="surface" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Shield size={15} style={{ color: "var(--color-text-3)" }} /> Security
            </h3>
            <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  Current Password
                </label>
                <input className="input-base" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" required />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-3)", display: "block", marginBottom: 6 }}>
                  New Password (8+ characters)
                </label>
                <input className="input-base" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} required />
              </div>
              <button type="submit" disabled={pwBusy} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
                {pwBusy ? "Updating…" : "Update Password"}
              </button>
              {pwMsg && <div style={{ fontSize: "0.75rem", color: pwMsg.ok ? "var(--color-positive)" : "var(--color-negative)" }}>{pwMsg.text}</div>}
            </form>
          </div>

          <div
            className="surface"
            style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem", border: "1px solid var(--color-negative-dim)" }}
          >
            <h3 style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--color-negative)" }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: "1rem" }}>
              Reset your virtual portfolio to the starting balance. All positions, orders and trades are deleted. This cannot be undone.
            </p>
            <button
              onClick={handleReset}
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
