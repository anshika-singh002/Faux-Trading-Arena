"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiLogin, apiRegister, apiLogout, apiDemoLogin, setToken, clearToken, getToken } from "./api";

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
  token: string | null;
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    firstName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => Promise<{ success: boolean; error?: string }>;
  setDisplayName: (displayName: string) => void;
  logout: () => Promise<void>;
  updateBalance: (balance: number) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      // Called on app boot to re-sync token from localStorage into state
      hydrate: () => {
        const token = getToken();
        const { user } = get();
        if (token && user) {
          set({ isAuthenticated: true, token });
        } else if (!token) {
          set({ user: null, isAuthenticated: false, token: null });
        }
      },

      login: async (email, password) => {
        try {
          const res = await apiLogin(email, password);
          const user: AuthUser = {
            id: res.user_id,
            username: res.username,
            displayName: res.display_name,
            email,
            virtualBalance: res.virtual_balance,
            rank: null,
          };
          setToken(res.access_token);
          set({ user, isAuthenticated: true, token: res.access_token });
          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Login failed";
          return { success: false, error: msg };
        }
      },

      register: async ({ firstName, username, email, password }) => {
        try {
          const res = await apiRegister({
            email,
            username,
            display_name: firstName,
            password,
          });
          const user: AuthUser = {
            id: res.user_id,
            username: res.username,
            displayName: res.display_name,
            email,
            virtualBalance: res.virtual_balance,
            rank: null,
          };
          setToken(res.access_token);
          set({ user, isAuthenticated: true, token: res.access_token });
          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Registration failed";
          return { success: false, error: msg };
        }
      },

      // The demo account is a real server-side account, so every feature works with it
      loginAsDemo: async () => {
        try {
          const res = await apiDemoLogin();
          const user: AuthUser = {
            id: res.user_id,
            username: res.username,
            displayName: res.display_name,
            email: "demo@fauxtrading.app",
            virtualBalance: res.virtual_balance,
            rank: null,
          };
          setToken(res.access_token);
          set({ user, isAuthenticated: true, token: res.access_token });
          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Could not start the demo account";
          return { success: false, error: msg };
        }
      },

      setDisplayName: (displayName) =>
        set((state) => ({ user: state.user ? { ...state.user, displayName } : null })),

      logout: async () => {
        await apiLogout();
        clearToken();
        set({ user: null, isAuthenticated: false, token: null });
      },

      updateBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, virtualBalance: balance } : null,
        })),
    }),
    {
      name: "faux-auth-v5", // bumped — clears all old stale localStorage entries
      version: 5,
      // Only persist user + auth flag; token is in localStorage under "faux_token"
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);
