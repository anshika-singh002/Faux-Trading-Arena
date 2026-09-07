"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Briefcase, MessageSquare, Trophy } from "lucide-react";

const MOBILE_NAV = [
  { label: "Home",      href: "/dashboard",  icon: LayoutDashboard },
  { label: "Market",    href: "/market",     icon: BarChart2 },
  { label: "Portfolio", href: "/portfolio",  icon: Briefcase },
  { label: "Coach",     href: "/coach",      icon: MessageSquare },
  { label: "Ranks",     href: "/leaderboard",icon: Trophy },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--color-bg-elevated)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {MOBILE_NAV.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "0.625rem 0 0.5rem",
              textDecoration: "none",
              color: isActive ? "var(--color-brand)" : "var(--color-text-3)",
              fontSize: "0.625rem",
              fontWeight: isActive ? 600 : 400,
              transition: "color var(--transition-fast)",
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
