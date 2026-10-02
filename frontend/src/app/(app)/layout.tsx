"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/lib/auth-store";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  const router = useRouter();

  // Re-sync token from localStorage into Zustand on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--color-text-3)", fontSize: "0.875rem",
      }}>
        Redirecting…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
