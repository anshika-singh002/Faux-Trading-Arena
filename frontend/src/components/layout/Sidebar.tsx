"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BarChart2, Briefcase, List,
  ArrowLeftRight, TrendingUp, FlaskConical, Cpu,
  MessageSquare, Trophy, User, BookMarked, Settings, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/mock-data";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV_MAIN: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: <LayoutDashboard size={18} /> },
  { label: "Market",       href: "/market",       icon: <BarChart2 size={18} /> },
  { label: "Portfolio",    href: "/portfolio",    icon: <Briefcase size={18} /> },
  { label: "Orders",       href: "/orders",       icon: <List size={18} /> },
  { label: "Transactions", href: "/transactions", icon: <ArrowLeftRight size={18} /> },
];

const NAV_TRADING: NavItem[] = [
  { label: "Strategies",   href: "/strategies",   icon: <TrendingUp size={18} /> },
  { label: "Backtesting",  href: "/backtesting",  icon: <FlaskConical size={18} /> },
];

const NAV_AI: NavItem[] = [
  { label: "AI Insights",  href: "/insights",     icon: <Cpu size={18} /> },
  { label: "AI Coach",     href: "/coach",        icon: <MessageSquare size={18} /> },
];

const NAV_COMMUNITY: NavItem[] = [
  { label: "Leaderboard",  href: "/leaderboard",  icon: <Trophy size={18} /> },
];

const NAV_USER: NavItem[] = [
  { label: "Profile",      href: "/profile",      icon: <User size={18} /> },
  { label: "Learn",        href: "/learn",        icon: <BookMarked size={18} /> },
];

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      {title && (
        <div
          style={{
            color: "var(--color-text-3)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0 0.75rem",
            marginBottom: "0.375rem",
          }}
        >
          {title}
        </div>
      )}
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.4375rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive
                    ? "var(--color-text)"
                    : "var(--color-text-2)",
                  background: isActive ? "var(--color-surface)" : "transparent",
                  transition: "all var(--transition-fast)",
                  textDecoration: "none",
                  position: "relative",
                }}
                className="sidebar-nav-item"
              >
                <span
                  style={{
                    color: isActive
                      ? "var(--color-brand)"
                      : "var(--color-text-3)",
                    display: "flex",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      background: "var(--color-brand)",
                      color: "var(--color-text-inv)",
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 16,
                      background: "var(--color-brand)",
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();

  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : "FT";

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg-elevated)",
        borderRight: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "1.25rem 1rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--color-brand)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={16} color="var(--color-text-inv)" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Faux<span style={{ color: "var(--color-brand)" }}>.</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "0.75rem 0.5rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <NavSection items={NAV_MAIN} pathname={pathname} />
        <NavSection title="Trading" items={NAV_TRADING} pathname={pathname} />
        <NavSection title="AI" items={NAV_AI} pathname={pathname} />
        <NavSection title="Community" items={NAV_COMMUNITY} pathname={pathname} />
        <NavSection title="Account" items={NAV_USER} pathname={pathname} />
      </nav>

      {/* Virtual Balance */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div style={{
          fontSize: "0.6875rem", color: "var(--color-text-3)",
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
        }}>
          Virtual Cash
        </div>
        <div style={{
          fontSize: "0.9375rem", fontWeight: 700,
          color: "var(--color-brand)", fontFamily: "var(--font-mono)",
        }}>
          {user ? formatCurrency(user.virtualBalance) : "₹0"}
        </div>
      </div>

      {/* User Footer */}
      <div
        style={{
          padding: "0.625rem 0.75rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--color-surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6875rem", fontWeight: 700,
            color: "var(--color-brand)",
            border: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Name + rank */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user?.displayName ?? "Guest"}
          </div>
          {user?.rank && (
            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-3)" }}>
              Rank #{user.rank}
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href="/profile"
          title="Settings"
          aria-label="Settings"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 6,
            color: "var(--color-text-3)",
            transition: "color var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-3)")}
        >
          <Settings size={14} />
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          aria-label="Sign out"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-3)",
            transition: "color var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-negative)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-3)")}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
