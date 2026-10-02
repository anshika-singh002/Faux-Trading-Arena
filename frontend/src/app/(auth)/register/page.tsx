"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [username,  setUsername]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const { register } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName || !username || !email || !password) {
      setError("Please fill in all fields."); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores."); return;
    }

    setLoading(true);
    const result = await register({ firstName, username, email, password });
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error ?? "Registration failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, background: "var(--color-brand)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color="var(--color-text-inv)" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              Faux<span style={{ color: "var(--color-brand)" }}>.</span>
            </span>
          </Link>
        </div>

        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>Start trading for free</h1>
          <p style={{ color: "var(--color-text-3)", fontSize: "0.875rem" }}>
            ₹84 lakh in virtual funds, no credit card required
          </p>
        </div>

        {/* Perks */}
        <div style={{
          background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)",
          borderRadius: "var(--radius-lg)", padding: "0.875rem 1.125rem",
          marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.375rem",
        }}>
          {[
            "₹1,00,00,000 virtual starting balance",
            "Full access to all features",
            "XGBoost AI predictions for 10 Indian stocks",
            "Strategy builder & backtesting",
          ].map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-2)" }}>
              <Check size={13} style={{ color: "var(--color-positive)", flexShrink: 0 }} />
              {perk}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                First Name
              </label>
              <input
                className="input-base"
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                disabled={loading}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                className="input-base"
                placeholder="trader99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              className="input-base"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                className="input-base"
                placeholder="8+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ paddingRight: 40 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-3)" }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input type="checkbox" id="terms" required style={{ marginTop: 2, accentColor: "var(--color-brand)", flexShrink: 0 }} />
            <label htmlFor="terms" style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", cursor: "pointer" }}>
              I understand Faux Trading uses virtual funds only. No real money is involved.
            </label>
          </div>

          {error && (
            <div role="alert" style={{
              fontSize: "0.8125rem", color: "var(--color-negative)",
              background: "var(--color-negative-dim)", padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-md)", border: "1px solid var(--color-negative)",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              padding: "0.75rem", background: "var(--color-brand)", color: "var(--color-text-inv)",
              border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.9375rem",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              transition: "all var(--transition-fast)", fontFamily: "inherit",
            }}
          >
            {loading ? "Creating account…" : <>Create account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-3)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-brand)", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
