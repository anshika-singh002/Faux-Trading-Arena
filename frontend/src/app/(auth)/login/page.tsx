"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
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
      {/* Left branding strip — desktop */}
      <div style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "var(--color-bg-elevated)",
        borderRight: "1px solid var(--color-border)",
        padding: "3rem 2rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }} className="hidden lg:flex">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: "var(--color-brand)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color="var(--color-text-inv)" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
            Faux<span style={{ color: "var(--color-brand)" }}>.</span>
          </span>
        </Link>

        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3, marginBottom: "1rem" }}>
            Master markets.<br />
            <span style={{ color: "var(--color-brand)" }}>Zero risk.</span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", lineHeight: 1.7 }}>
            Practice trading with ₹84 lakh in virtual funds. Build strategies, backtest them, get AI insights.
          </p>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
          For educational purposes only.
        </div>
      </div>

      {/* Form */}
      <div style={{ width: "100%", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, background: "var(--color-brand)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color="var(--color-text-inv)" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)" }}>
              Faux<span style={{ color: "var(--color-brand)" }}>.</span>
            </span>
          </Link>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>Welcome back</h1>
          <p style={{ color: "var(--color-text-3)", fontSize: "0.875rem" }}>
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              className="input-base"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-2)" }}>
                Password
              </label>
              <a href="#" style={{ fontSize: "0.8125rem", color: "var(--color-brand)" }}>Forgot?</a>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                className="input-base"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-text-3)",
                }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "var(--color-brand)",
              color: "var(--color-text-inv)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "0.9375rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "0.5rem",
              transition: "all var(--transition-fast)",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{
          margin: "1.5rem 0",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>

        {/* Demo login */}
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "transparent",
            color: "var(--color-text-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontWeight: 500,
            fontSize: "0.875rem",
            textDecoration: "none",
            transition: "all var(--transition-fast)",
          }}
        >
          Continue with demo account
        </Link>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-3)" }}>
          No account?{" "}
          <Link href="/register" style={{ color: "var(--color-brand)", fontWeight: 500 }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
