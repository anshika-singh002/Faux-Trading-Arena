// ============================================================
// FAUX TRADING — Core Type Definitions
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  virtualBalance: number;
  totalPortfolioValue: number;
  rank?: number;
  level: number;
  xp: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  sector?: string;
  exchange: string;
  currency: string;
  logoUrl?: string;
  description?: string;
}

export type AssetType = "stock" | "etf" | "crypto" | "index" | "commodity";

export interface Quote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  timestamp: string;
}

export interface OHLCV {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type OrderStatus =
  | "pending"
  | "open"
  | "partial"
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired";

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  assetName: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  avgFillPrice?: number;
  status: OrderStatus;
  estimatedTotal: number;
  estimatedFees: number;
  createdAt: string;
  updatedAt: string;
  filledAt?: string;
}

export interface Position {
  symbol: string;
  assetName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  dayPnl: number;
  dayPnlPercent: number;
  weight: number; // Portfolio allocation %
  logoUrl?: string;
}

export interface Portfolio {
  totalValue: number;
  cash: number;
  invested: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayPnl: number;
  dayPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  positions: Position[];
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  symbol: string;
  assetName: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  pnl?: number;
  createdAt: string;
}

// ============================================================
// STRATEGY & BACKTESTING
// ============================================================

export type ConditionIndicator =
  | "price"
  | "sma_20"
  | "sma_50"
  | "sma_200"
  | "ema_12"
  | "ema_26"
  | "rsi_14"
  | "macd"
  | "volume"
  | "bollinger_upper"
  | "bollinger_lower"
  | "atr";

export type ConditionOperator =
  | "crosses_above"
  | "crosses_below"
  | "greater_than"
  | "less_than"
  | "equals";

export type StrategyAction = "buy" | "sell";
export type PositionSizeType = "fixed_amount" | "percent_portfolio" | "percent_cash";

export interface StrategyRule {
  id: string;
  indicator: ConditionIndicator;
  operator: ConditionOperator;
  value: ConditionIndicator | number;
  action: StrategyAction;
  positionSizeType: PositionSizeType;
  positionSizeValue: number;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  symbol?: string; // Single asset or portfolio-wide
  rules: StrategyRule[];
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
}

export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  startDate: string;
  endDate: string;
  startingCapital: number;
  feePercent: number;
  slippagePercent: number;
  benchmarkSymbol: string;
}

export interface BacktestTrade {
  date: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  value: number;
  pnl?: number;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  status: "pending" | "running" | "completed" | "failed";
  
  // Performance metrics
  totalReturn: number;
  totalReturnPercent: number;
  benchmarkReturn: number;
  benchmarkReturnPercent: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // days
  volatility: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturn: number;
  
  // Time series
  portfolioValues: { date: string; value: number; benchmark: number }[];
  trades: BacktestTrade[];
  
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// AI SERVICES
// ============================================================

export type AIInsightType =
  | "market_sentiment"
  | "price_prediction"
  | "risk_analysis"
  | "portfolio_advice"
  | "trade_explanation"
  | "learning_suggestion";

export type AIConfidence = "low" | "medium" | "high";
export type AIModelStatus = "available" | "unavailable" | "loading" | "insufficient_data";

export interface AIInsight {
  id: string;
  type: AIInsightType;
  symbol?: string;
  title: string;
  summary: string;
  detail?: string;
  confidence: AIConfidence;
  confidenceScore: number; // 0-1
  status: AIModelStatus;
  factors?: string[];
  risks?: string[];
  generatedAt: string;
  isMock: boolean; // Always true until real model integrated
}

export interface AIPrediction {
  symbol: string;
  currentPrice: number;
  predictedPriceShort: number;  // 1-day
  predictedPriceMedium: number; // 1-week
  direction: "bullish" | "bearish" | "neutral";
  confidence: AIConfidence;
  confidenceScore: number;
  status: AIModelStatus;
  explanation: string;
  keyFactors: string[];
  riskFactors: string[];
  generatedAt: string;
  isMock: boolean;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: {
    type: "trade" | "portfolio" | "indicator" | "strategy" | "general";
    relatedSymbol?: string;
  };
}

export interface CoachConversation {
  id: string;
  userId: string;
  title: string;
  messages: CoachMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// LEADERBOARD
// ============================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  portfolioValue: number;
  badge?: string;
  isCurrentUser?: boolean;
}

// ============================================================
// WATCHLIST
// ============================================================

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt: string;
}

// ============================================================
// MARKET DATA
// ============================================================

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  logoUrl?: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType =
  | "order_filled"
  | "order_cancelled"
  | "price_alert"
  | "ai_insight"
  | "achievement"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedSymbol?: string;
  relatedOrderId?: string;
}
