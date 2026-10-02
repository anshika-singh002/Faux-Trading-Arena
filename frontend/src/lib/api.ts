"use client";

// ============================================================
// Faux Trading — API Client
// Thin wrapper around fetch with JWT auth + base URL handling.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Token helpers — read/write from localStorage so they survive page refreshes.
// auth-store.ts also mirrors these into Zustand for reactive UI.

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("faux_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("faux_token", token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("faux_token");
}

// ── Core fetch ──────────────────────────────────────────────

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean; // default true — send JWT
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, auth = true, headers: extraHeaders = {}, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail ?? JSON.stringify(json);
    } catch {
      // response wasn't JSON
    }
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth endpoints ──────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  display_name: string;
  virtual_balance: number;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function apiRegister(payload: {
  email: string;
  username: string;
  display_name: string;
  password: string;
}): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // best-effort
  }
  clearToken();
}

// ── AI endpoints ────────────────────────────────────────────

export interface PredictionResult {
  symbol: string;
  current_price: number;
  predicted_price_short: number;
  predicted_price_medium: number;
  direction: "bullish" | "bearish" | "neutral";
  confidence: "low" | "medium" | "high";
  confidence_score: number;
  status: string;
  explanation: string;
  key_factors: string[];
  risk_factors: string[];
  generated_at: string;
  is_mock: boolean;
}

export async function apiPredict(symbol: string): Promise<PredictionResult> {
  return apiFetch<PredictionResult>(`/ai/predict/${symbol}`);
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number; // -1 to +1
  symbols_mentioned: string[];
  category: string;
}

export interface NewsAnalysisResult {
  symbol: string;
  company: string;
  overall_sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number; // -1 to +1
  bullish_signals: number;
  bearish_signals: number;
  neutral_signals: number;
  news_items: NewsItem[];
  analyst_summary: string;
  last_updated: string;
}

export interface MarketSentimentResult {
  overall: "bullish" | "bearish" | "neutral";
  score: number; // -1 to +1
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  top_movers: Array<{ symbol: string; company: string; sentiment: string; score: number }>;
  last_updated: string;
}

export async function apiNewsAnalysis(symbol: string): Promise<NewsAnalysisResult> {
  return apiFetch<NewsAnalysisResult>(`/ai/news-analysis/${symbol}`);
}

export async function apiMarketSentiment(): Promise<MarketSentimentResult> {
  return apiFetch<MarketSentimentResult>("/ai/news-analysis/market/sentiment");
}

// ── Portfolio endpoints ─────────────────────────────────────

export interface PositionOut {
  symbol: string;
  quantity: number;
  avg_cost: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;
  weight: number;
}

export interface PortfolioSummary {
  total_value: number;
  cash: number;
  invested: number;
  total_return: number;
  total_return_percent: number;
  unrealized_pnl: number;
  realized_pnl: number;
  positions: PositionOut[];
}

export async function apiGetPortfolio(): Promise<PortfolioSummary> {
  return apiFetch<PortfolioSummary>("/portfolio/");
}

// ── Orders endpoints ────────────────────────────────────────

export interface OrderOut {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  filled_quantity: number;
  price: number | null;
  avg_fill_price: number | null;
  status: string;
  estimated_total: number;
  estimated_fees: number;
  created_at: string;
  filled_at: string | null;
}

export interface TransactionOut {
  id: string;
  order_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  realized_pnl: number | null;
  created_at: string;
}

export async function apiGetOrders(status?: string): Promise<OrderOut[]> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<OrderOut[]>(`/orders/${qs}`);
}

export async function apiGetTransactions(): Promise<TransactionOut[]> {
  return apiFetch<TransactionOut[]>("/orders/transactions");
}

// ── Trading endpoint ────────────────────────────────────────

export interface PlaceOrderRequest {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  quantity: number;
  price?: number;
}

export interface PlaceOrderResponse {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  filled_quantity: number;
  price: number | null;
  avg_fill_price: number | null;
  status: string;
  estimated_total: number;
  estimated_fees: number;
}

export async function apiPlaceOrder(payload: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  return apiFetch<PlaceOrderResponse>("/trading/order", {
    method: "POST",
    body: payload,
  });
}
