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

// ── Model 1 endpoints ───────────────────────────────────────

export interface Model1Prediction {
  symbol: string;
  company: string;
  current_price: number;
  predicted_price: number;
  p_up: number;
  p_down: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  accuracy: string;
  balanced_accuracy: string;
  roc_auc: number;
  is_live: boolean;
  generated_at: string;
}

export interface Model1AllResponse {
  predictions: Model1Prediction[];
  model_info: {
    model_type: string;
    n_features: number;
    train_period: string;
    test_accuracy: string;
    test_auc: number;
    prediction_type: string;
    classes: string[];
  };
  generated_at: string;
}

export async function apiModel1PredictAll(): Promise<Model1AllResponse> {
  return apiFetch<Model1AllResponse>("/ai/model1/predict");
}

export async function apiModel1PredictSymbol(symbol: string): Promise<Model1Prediction> {
  return apiFetch<Model1Prediction>(`/ai/model1/predict/${symbol}`);
}

// ── Advisor endpoints ───────────────────────────────────────

import type { AdvisorRiskProfile, AdvisorRecommendation, AdvisorRecommendRequest } from "./types";

export interface AdvisorProfilesResponse {
  profiles: AdvisorRiskProfile[];
}

export async function apiGetAdvisorProfiles(): Promise<AdvisorProfilesResponse> {
  return apiFetch<AdvisorProfilesResponse>("/advisor/profiles");
}

export async function apiGetAdvisorRecommendation(
  payload: AdvisorRecommendRequest
): Promise<AdvisorRecommendation> {
  return apiFetch<AdvisorRecommendation>("/advisor/recommend", {
    method: "POST",
    body: payload,
  });
}

// ── Portfolio risk endpoint ─────────────────────────────────

export interface RiskyPosition {
  symbol: string;
  risk_level: "high" | "medium" | "low";
  risk_reason: string;
  weight: number;
  unrealized_pnl_percent: number;
  current_price: number;
}

export interface RiskSummary {
  has_risk: boolean;
  overall_risk: "high" | "medium" | "low";
  risky_positions: RiskyPosition[];
  warnings: string[];
  sector_concentration: Record<string, number>;
}

export async function apiGetPortfolioRisk(): Promise<RiskSummary> {
  return apiFetch<RiskSummary>("/portfolio/risk");
}

// ── Notifications endpoint ──────────────────────────────────

export interface NotificationOut {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_symbol: string | null;
  created_at: string;
}

export async function apiGetNotifications(): Promise<NotificationOut[]> {
  return apiFetch<NotificationOut[]>("/notifications/");
}

export async function apiMarkNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await apiFetch("/notifications/read-all", { method: "POST" });
}

// Create advisor notification
export async function apiCreateAdvisorNotification(payload: {
  amount: number;
  risk: string;
}): Promise<{ message: string; notification_id: string }> {
  return apiFetch("/advisor/notify", { method: "POST", body: payload });
}

// ── Live market data endpoints (public, no auth) ────────────

export interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  previous_close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  avg_volume: number | null;
  week52_high: number | null;
  week52_low: number | null;
  market_cap: number | null;
  pe: number | null;
  eps: number | null;
  is_live: boolean;
}

export interface LiveIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  change_percent: number;
}

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export interface OhlcvPoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function apiGetQuotes(): Promise<LiveQuote[]> {
  return apiFetch<LiveQuote[]>("/market/quotes", { auth: false });
}

export async function apiGetIndices(): Promise<LiveIndex[]> {
  return apiFetch<LiveIndex[]>("/market/indices", { auth: false });
}

export async function apiGetMarketStatus(): Promise<{ is_open: boolean; as_of: string; exchange: string; reason: string | null }> {
  return apiFetch("/market/status", { auth: false });
}

export async function apiChangePassword(current_password: string, new_password: string): Promise<void> {
  await apiFetch("/auth/change-password", { method: "POST", body: { current_password, new_password } });
}

export interface AssetInfo {
  symbol: string;
  name: string;
  sector: string;
  /** true only for the 10 stocks the XGBoost models were trained on */
  ai_supported: boolean;
}

export async function apiGetAssets(): Promise<AssetInfo[]> {
  return apiFetch<AssetInfo[]>("/market/assets", { auth: false });
}

export interface RiskReport {
  symbol: string;
  available: boolean;
  level: "low" | "medium" | "high" | "unknown";
  /** "falling" = may keep losing; "overheated" = profit may reverse */
  kind: "falling" | "overheated" | null;
  score: number;
  reasons: { severity: "medium" | "high"; kind: string; text: string }[];
  stats: Record<string, number | boolean | null>;
}

export async function apiGetRisk(symbol: string): Promise<RiskReport> {
  return apiFetch<RiskReport>(`/market/risk/${symbol}`, { auth: false });
}

export async function apiGetAllRisk(): Promise<RiskReport[]> {
  return apiFetch<RiskReport[]>("/market/risk", { auth: false });
}

export async function apiGetOhlcv(symbol: string, range: ChartRange): Promise<OhlcvPoint[]> {
  return apiFetch<OhlcvPoint[]>(`/market/ohlcv/${symbol}?range=${range}`, { auth: false });
}

// ── Demo account ────────────────────────────────────────────

export async function apiDemoLogin(): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/demo", { method: "POST", auth: false });
}

// ── Leaderboard ─────────────────────────────────────────────

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  portfolio_value: number;
  total_return: number;
  total_return_percent: number;
  win_rate: number;
  total_trades: number;
  is_current_user: boolean;
}

export async function apiGetLeaderboard(): Promise<LeaderboardRow[]> {
  return apiFetch<LeaderboardRow[]>("/leaderboard/");
}

// ── Strategies & backtesting ────────────────────────────────

export interface StrategyRow {
  id: string;
  name: string;
  description: string | null;
  symbol: string | null;
  rules: Array<Record<string, unknown>>;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
}

export async function apiListStrategies(): Promise<StrategyRow[]> {
  return apiFetch<StrategyRow[]>("/strategies/");
}

export async function apiCreateStrategy(payload: {
  name: string;
  description?: string;
  symbol?: string;
  rules: Array<Record<string, unknown>>;
}): Promise<StrategyRow> {
  return apiFetch<StrategyRow>("/strategies/", { method: "POST", body: payload });
}

export async function apiDeleteStrategy(id: string): Promise<void> {
  await apiFetch(`/strategies/${id}`, { method: "DELETE" });
}

export interface BacktestApiResult {
  id: string;
  status: string;
  created_at: string;
  results: {
    total_return: number;
    total_return_percent: number;
    benchmark_return: number;
    benchmark_return_percent: number;
    cagr: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    max_drawdown_duration: number;
    volatility: number;
    win_rate: number;
    profit_factor: number;
    total_trades: number;
    avg_trade_return: number;
    portfolio_values: { date: string; value: number; benchmark: number }[];
    trades: { date: string; action: "buy" | "sell"; price: number; quantity: number; value: number; pnl?: number }[];
    data_source: string;
    rules_used: string;
  };
}

export async function apiRunBacktest(payload: {
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  starting_capital: number;
  fee_percent: number;
  slippage_percent: number;
  benchmark_symbol: string;
}): Promise<BacktestApiResult> {
  return apiFetch<BacktestApiResult>("/backtesting/", { method: "POST", body: payload });
}

// ── Profile & portfolio reset ───────────────────────────────

export async function apiUpdateDisplayName(displayName: string): Promise<void> {
  await apiFetch(`/users/me?display_name=${encodeURIComponent(displayName)}`, { method: "PATCH" });
}

export async function apiResetPortfolio(): Promise<{ virtual_balance: number }> {
  return apiFetch<{ virtual_balance: number }>("/portfolio/reset", { method: "POST" });
}

// ── AI coach ────────────────────────────────────────────────

export interface CoachReply {
  content: string;
  context_used: string[];
  is_mock: boolean;
}

export async function apiCoachChat(message: string, history: { role: string; content: string }[]): Promise<CoachReply> {
  return apiFetch<CoachReply>("/ai/chat", { method: "POST", body: { message, history, context: {} } });
}
