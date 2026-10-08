"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/lib/auth-store";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  const router = useRouter();

  // The persisted auth state loads from localStorage after the first render.
  // Don't treat "not loaded yet" as "logged out", or every page refresh would
  // bounce the user to the login screen.
  const hydrated = useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );

  // Re-sync token from localStorage into Zustand once the persisted state is loaded
  useEffect(() => { if (hydrated) hydrate(); }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--color-text-3)", fontSize: "0.875rem",
      }}>
        {hydrated ? "Redirecting…" : "Loading…"}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
