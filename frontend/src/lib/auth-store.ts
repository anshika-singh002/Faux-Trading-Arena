"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  virtualBalance: number;
  rank: number | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateBalance: (balance: number) => void;
}

const DEMO_USER: AuthUser = {
  id: "demo",
  username: "trader",
  displayName: "Trader",
  email: "",
  virtualBalance: 2029133, // ₹20.29 L virtual cash
  rank: 7,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: DEMO_USER,
      isAuthenticated: true,
      login:  (user) => set({ user, isAuthenticated: true }),
      logout: ()     => set({ user: null, isAuthenticated: false }),
      updateBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, virtualBalance: balance } : null,
        })),
    }),
    {
      name: "faux-auth-v2",   // bumped version — clears stale USD localStorage entry
      version: 2,
      migrate: () => ({ user: DEMO_USER, isAuthenticated: true }),
    }
  )
);
