// ============================================================
// FAUX TRADING — Mock Data
// All data is synthetic. Replace with API calls when backend is ready.
// ============================================================

import type {
  Asset, Quote, OHLCV, Position, Portfolio, Order, Transaction,
  MarketIndex, MarketMover, LeaderboardEntry, WatchlistItem,
  AIInsight, AIPrediction, CoachMessage, Strategy, BacktestResult,
  Notification,
} from "./types";

// ============================================================
// ASSETS — 10 Indian stocks supported by the XGBoost model
// ============================================================
export const MOCK_ASSETS: Asset[] = [
  { id: "1",  symbol: "SBIN",       name: "State Bank of India",       type: "stock", sector: "Financial",        exchange: "NSE", currency: "INR" },
  { id: "2",  symbol: "RELIANCE",   name: "Reliance Industries",       type: "stock", sector: "Energy",           exchange: "NSE", currency: "INR" },
  { id: "3",  symbol: "HDFCBANK",   name: "HDFC Bank",                 type: "stock", sector: "Financial",        exchange: "NSE", currency: "INR" },
  { id: "4",  symbol: "ABCAPITAL",  name: "Aditya Birla Capital",      type: "stock", sector: "Financial",        exchange: "NSE", currency: "INR" },
  { id: "5",  symbol: "ICICIBANK",  name: "ICICI Bank",                type: "stock", sector: "Financial",        exchange: "NSE", currency: "INR" },
  { id: "6",  symbol: "INFY",       name: "Infosys Ltd.",              type: "stock", sector: "Technology",       exchange: "NSE", currency: "INR" },
  { id: "7",  symbol: "TCS",        name: "Tata Consultancy Services", type: "stock", sector: "Technology",       exchange: "NSE", currency: "INR" },
  { id: "8",  symbol: "ITC",        name: "ITC Ltd.",                  type: "stock", sector: "Consumer Staples", exchange: "NSE", currency: "INR" },
  { id: "9",  symbol: "LT",         name: "Larsen & Toubro",           type: "stock", sector: "Industrials",      exchange: "NSE", currency: "INR" },
  { id: "10", symbol: "BHARTIARTL", name: "Bharti Airtel",             type: "stock", sector: "Communication",    exchange: "NSE", currency: "INR" },
];

// ============================================================
// QUOTES — prices in INR
// ============================================================
export const MOCK_QUOTES: Record<string, Quote> = {
  // ── Indian Stocks (NSE, prices in INR) ─────────────────────
  SBIN:       { symbol: "SBIN",       price: 812,    open: 808,   high: 819,   low: 805,   previousClose: 807,   change: 5,     changePercent: 0.62,  volume: 42000000,  avgVolume: 45000000,  marketCap: 7248000000000,  pe: 9.2,  eps: 88,   week52High: 912, week52Low: 601, timestamp: new Date().toISOString() },
  RELIANCE:   { symbol: "RELIANCE",   price: 2945,   open: 2930,  high: 2962,  low: 2921,  previousClose: 2940,  change: 5,     changePercent: 0.17,  volume: 8200000,   avgVolume: 9000000,   marketCap: 19920000000000, pe: 24.1, eps: 122,  week52High: 3218, week52Low: 2220, timestamp: new Date().toISOString() },
  HDFCBANK:   { symbol: "HDFCBANK",   price: 1742,   open: 1735,  high: 1758,  low: 1730,  previousClose: 1748,  change: -6,    changePercent: -0.34, volume: 14800000,  avgVolume: 16000000,  marketCap: 13240000000000, pe: 18.3, eps: 95,   week52High: 1880, week52Low: 1363, timestamp: new Date().toISOString() },
  ABCAPITAL:  { symbol: "ABCAPITAL",  price: 189,    open: 187,   high: 192,   low: 186,   previousClose: 188,   change: 1,     changePercent: 0.53,  volume: 5400000,   avgVolume: 6000000,   marketCap: 490000000000,   pe: 14.8, eps: 12.8, week52High: 248, week52Low: 156, timestamp: new Date().toISOString() },
  ICICIBANK:  { symbol: "ICICIBANK",  price: 1284,   open: 1295,  high: 1298,  low: 1278,  previousClose: 1291,  change: -7,    changePercent: -0.54, volume: 18600000,  avgVolume: 20000000,  marketCap: 9030000000000,  pe: 17.2, eps: 74.6, week52High: 1370, week52Low: 945, timestamp: new Date().toISOString() },
  INFY:       { symbol: "INFY",       price: 1612,   open: 1598,  high: 1624,  low: 1594,  previousClose: 1605,  change: 7,     changePercent: 0.44,  volume: 11200000,  avgVolume: 12500000,  marketCap: 6720000000000,  pe: 22.6, eps: 71.3, week52High: 1975, week52Low: 1351, timestamp: new Date().toISOString() },
  TCS:        { symbol: "TCS",        price: 3487,   open: 3510,  high: 3521,  low: 3479,  previousClose: 3512,  change: -25,   changePercent: -0.71, volume: 2800000,   avgVolume: 3200000,   marketCap: 12680000000000, pe: 28.4, eps: 122.8, week52High: 4592, week52Low: 3057, timestamp: new Date().toISOString() },
  ITC:        { symbol: "ITC",        price: 428,    open: 432,   high: 434,   low: 426,   previousClose: 431,   change: -3,    changePercent: -0.70, volume: 22000000,  avgVolume: 24000000,  marketCap: 5352000000000,  pe: 26.1, eps: 16.4, week52High: 528, week52Low: 401, timestamp: new Date().toISOString() },
  LT:         { symbol: "LT",         price: 3621,   open: 3605,  high: 3648,  low: 3598,  previousClose: 3609,  change: 12,    changePercent: 0.33,  volume: 2100000,   avgVolume: 2400000,   marketCap: 4980000000000,  pe: 31.5, eps: 115,  week52High: 3963, week52Low: 2816, timestamp: new Date().toISOString() },
  BHARTIARTL: { symbol: "BHARTIARTL", price: 1876,   open: 1862,  high: 1884,  low: 1858,  previousClose: 1868,  change: 8,     changePercent: 0.43,  volume: 5600000,   avgVolume: 6200000,   marketCap: 11208000000000, pe: 58.2, eps: 32.2, week52High: 1908, week52Low: 1207, timestamp: new Date().toISOString() },
};

// ============================================================
// GENERATE MOCK OHLCV DATA
// ============================================================
export function generateOHLCV(
  symbol: string,
  range: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y"
): OHLCV[] {
  const quote = MOCK_QUOTES[symbol];
  if (!quote) return [];  const basePrice = quote.price;
  const now = Date.now();

  const config: Record<string, { points: number; intervalMs: number; volatility: number }> = {
    "1D": { points: 390, intervalMs: 60 * 1000,       volatility: 0.0015 },
    "1W": { points: 5 * 78, intervalMs: 5 * 60 * 1000, volatility: 0.002 },
    "1M": { points: 22,  intervalMs: 24 * 60 * 60 * 1000, volatility: 0.018 },
    "3M": { points: 65,  intervalMs: 24 * 60 * 60 * 1000, volatility: 0.022 },
    "6M": { points: 130, intervalMs: 24 * 60 * 60 * 1000, volatility: 0.025 },
    "1Y": { points: 252, intervalMs: 24 * 60 * 60 * 1000, volatility: 0.028 },
    "5Y": { points: 260, intervalMs: 7 * 24 * 60 * 60 * 1000, volatility: 0.035 },
  };

  const { points, intervalMs, volatility } = config[range];
  const data: OHLCV[] = [];

  // Use seeded-ish pseudo-random for consistency
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(1);
  let price = basePrice * (1 + (quote.changePercent / 100) * -1);

  for (let i = 0; i < points; i++) {
    const t = now - (points - i) * intervalMs;
    const r1 = Math.sin(seed * i * 0.1234) * 0.5 + 0.5;
    const r2 = Math.sin(seed * i * 0.5678) * 0.5 + 0.5;
    const r3 = Math.sin(seed * i * 0.9012) * 0.5 + 0.5;
    const r4 = Math.sin(seed * i * 0.3456) * 0.5 + 0.5;

    const change = (r1 - 0.5) * volatility * 2;
    price = price * (1 + change);

    const o = price;
    const highAdd = r2 * volatility * price;
    const lowSub = r3 * volatility * price;
    const c = price * (1 + (r4 - 0.5) * volatility);

    data.push({
      time: Math.floor(t / 1000),
      open: parseFloat(o.toFixed(2)),
      high: parseFloat((Math.max(o, c) + highAdd).toFixed(2)),
      low: parseFloat((Math.min(o, c) - lowSub).toFixed(2)),
      close: parseFloat(c.toFixed(2)),
      volume: Math.floor((r1 + 0.5) * (quote.avgVolume / points) * 2),
    });

    price = c;
  }

  return data;
}

// ============================================================
// PORTFOLIO — values in INR
// ============================================================
export const MOCK_PORTFOLIO: Portfolio = {
  totalValue: 10850000,
  cash: 1240000,
  invested: 9610000,
  totalReturn: 2450000,
  totalReturnPercent: 29.17,
  dayPnl: 94200,
  dayPnlPercent: 0.88,
  realizedPnl: 312000,
  unrealizedPnl: 2138000,
  lastUpdated: new Date().toISOString(),
  positions: [
    {
      symbol: "SBIN", assetName: "State Bank of India", quantity: 800, avgCost: 680,
      currentPrice: 812, marketValue: 649600, costBasis: 544000,
      unrealizedPnl: 105600, unrealizedPnlPercent: 19.41,
      dayPnl: 4000, dayPnlPercent: 0.62, weight: 5.99,
    },
    {
      symbol: "RELIANCE", assetName: "Reliance Industries", quantity: 200, avgCost: 2480,
      currentPrice: 2945, marketValue: 589000, costBasis: 496000,
      unrealizedPnl: 93000, unrealizedPnlPercent: 18.75,
      dayPnl: 1000, dayPnlPercent: 0.17, weight: 5.43,
    },
    {
      symbol: "HDFCBANK", assetName: "HDFC Bank", quantity: 350, avgCost: 1520,
      currentPrice: 1742, marketValue: 609700, costBasis: 532000,
      unrealizedPnl: 77700, unrealizedPnlPercent: 14.60,
      dayPnl: -2100, dayPnlPercent: -0.34, weight: 5.62,
    },
    {
      symbol: "ICICIBANK", assetName: "ICICI Bank", quantity: 500, avgCost: 1100,
      currentPrice: 1284, marketValue: 642000, costBasis: 550000,
      unrealizedPnl: 92000, unrealizedPnlPercent: 16.73,
      dayPnl: -3500, dayPnlPercent: -0.54, weight: 5.92,
    },
    {
      symbol: "INFY", assetName: "Infosys Ltd.", quantity: 400, avgCost: 1380,
      currentPrice: 1612, marketValue: 644800, costBasis: 552000,
      unrealizedPnl: 92800, unrealizedPnlPercent: 16.81,
      dayPnl: 2800, dayPnlPercent: 0.44, weight: 5.94,
    },
    {
      symbol: "TCS", assetName: "Tata Consultancy Services", quantity: 180, avgCost: 2980,
      currentPrice: 3487, marketValue: 627660, costBasis: 536400,
      unrealizedPnl: 91260, unrealizedPnlPercent: 17.01,
      dayPnl: -4500, dayPnlPercent: -0.71, weight: 5.79,
    },
    {
      symbol: "ITC", assetName: "ITC Ltd.", quantity: 2000, avgCost: 365,
      currentPrice: 428, marketValue: 856000, costBasis: 730000,
      unrealizedPnl: 126000, unrealizedPnlPercent: 17.26,
      dayPnl: -6000, dayPnlPercent: -0.70, weight: 7.89,
    },
    {
      symbol: "LT", assetName: "Larsen & Toubro", quantity: 150, avgCost: 3100,
      currentPrice: 3621, marketValue: 543150, costBasis: 465000,
      unrealizedPnl: 78150, unrealizedPnlPercent: 16.80,
      dayPnl: 1800, dayPnlPercent: 0.33, weight: 5.00,
    },
    {
      symbol: "BHARTIARTL", assetName: "Bharti Airtel", quantity: 300, avgCost: 1580,
      currentPrice: 1876, marketValue: 562800, costBasis: 474000,
      unrealizedPnl: 88800, unrealizedPnlPercent: 18.73,
      dayPnl: 2400, dayPnlPercent: 0.43, weight: 5.19,
    },
    {
      symbol: "ABCAPITAL", assetName: "Aditya Birla Capital", quantity: 3000, avgCost: 155,
      currentPrice: 189, marketValue: 567000, costBasis: 465000,
      unrealizedPnl: 102000, unrealizedPnlPercent: 21.94,
      dayPnl: 3000, dayPnlPercent: 0.53, weight: 5.23,
    },
  ],
};

// ============================================================
// ORDERS — prices in INR
// ============================================================
export const MOCK_ORDERS: Order[] = [
  {
    id: "ord_001", userId: "usr_1", symbol: "SBIN", assetName: "State Bank of India",
    side: "buy", type: "limit", quantity: 100, filledQuantity: 100,
    price: 795, avgFillPrice: 793, status: "filled",
    estimatedTotal: 79500, estimatedFees: 79,
    createdAt: "2026-09-03T09:31:00Z", updatedAt: "2026-09-03T09:31:45Z", filledAt: "2026-09-03T09:31:45Z",
  },
  {
    id: "ord_002", userId: "usr_1", symbol: "INFY", assetName: "Infosys Ltd.",
    side: "buy", type: "market", quantity: 50, filledQuantity: 50,
    avgFillPrice: 1598, status: "filled",
    estimatedTotal: 79900, estimatedFees: 80,
    createdAt: "2026-09-02T14:15:00Z", updatedAt: "2026-09-02T14:15:12Z", filledAt: "2026-09-02T14:15:12Z",
  },
  {
    id: "ord_003", userId: "usr_1", symbol: "TCS", assetName: "Tata Consultancy Services",
    side: "sell", type: "limit", quantity: 20, filledQuantity: 0,
    price: 3600, status: "open",
    estimatedTotal: 72000, estimatedFees: 72,
    createdAt: "2026-09-03T10:00:00Z", updatedAt: "2026-09-03T10:00:00Z",
  },
  {
    id: "ord_004", userId: "usr_1", symbol: "RELIANCE", assetName: "Reliance Industries",
    side: "buy", type: "market", quantity: 30, filledQuantity: 30,
    avgFillPrice: 2918, status: "filled",
    estimatedTotal: 87540, estimatedFees: 88,
    createdAt: "2026-08-28T11:30:00Z", updatedAt: "2026-08-28T11:30:08Z", filledAt: "2026-08-28T11:30:08Z",
  },
  {
    id: "ord_005", userId: "usr_1", symbol: "HDFCBANK", assetName: "HDFC Bank",
    side: "buy", type: "limit", quantity: 50, filledQuantity: 0,
    price: 1700, status: "cancelled",
    estimatedTotal: 85000, estimatedFees: 85,
    createdAt: "2026-08-25T09:45:00Z", updatedAt: "2026-08-25T16:00:00Z",
  },
];

// ============================================================
// TRANSACTIONS — prices in INR
// ============================================================
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_001", orderId: "ord_001", symbol: "SBIN", assetName: "State Bank of India",
    side: "buy", quantity: 100, price: 793, fees: 79, total: 79379,
    createdAt: "2026-09-03T09:31:45Z",
  },
  {
    id: "tx_002", orderId: "ord_002", symbol: "INFY", assetName: "Infosys Ltd.",
    side: "buy", quantity: 50, price: 1598, fees: 80, total: 79980,
    createdAt: "2026-09-02T14:15:12Z",
  },
  {
    id: "tx_003", orderId: "ord_004", symbol: "RELIANCE", assetName: "Reliance Industries",
    side: "buy", quantity: 30, price: 2918, fees: 88, total: 87628,
    createdAt: "2026-08-28T11:30:08Z",
  },
  {
    id: "tx_004", orderId: "ord_006", symbol: "LT", assetName: "Larsen & Toubro",
    side: "sell", quantity: 25, price: 3580, fees: 90, total: 89410, pnl: 12000,
    createdAt: "2026-08-20T13:45:00Z",
  },
  {
    id: "tx_005", orderId: "ord_007", symbol: "ITC", assetName: "ITC Ltd.",
    side: "sell", quantity: 500, price: 438, fees: 220, total: 218780, pnl: 18500,
    createdAt: "2026-08-15T10:22:00Z",
  },
];

// ============================================================
// MARKET INDICES
// ============================================================
export const MOCK_INDICES: MarketIndex[] = [
  { name: "NIFTY 50",    symbol: "NIFTY",     value: 24832.45, change: 128.30,  changePercent: 0.52  },
  { name: "SENSEX",      symbol: "SENSEX",    value: 81847.20, change: 421.10,  changePercent: 0.52  },
  { name: "NIFTY Bank",  symbol: "BANKNIFTY", value: 53240.80, change: -182.40, changePercent: -0.34 },
  { name: "NIFTY IT",    symbol: "NIFTYIT",   value: 38142.60, change: -240.50, changePercent: -0.63 },
  { name: "India VIX",   symbol: "INDIAVIX",  value: 13.42,    change: -0.38,   changePercent: -2.75 },
  { name: "USD/INR",     symbol: "USDINR",    value: 84.12,    change: 0.08,    changePercent: 0.10  },
];

// ============================================================
// MARKET MOVERS
// ============================================================
export const MOCK_GAINERS: MarketMover[] = [
  { symbol: "SBIN",       name: "State Bank of India",       price: 812,  change: 5,  changePercent: 0.62, volume: 42000000 },
  { symbol: "ABCAPITAL",  name: "Aditya Birla Capital",      price: 189,  change: 1,  changePercent: 0.53, volume: 5400000  },
  { symbol: "LT",         name: "Larsen & Toubro",           price: 3621, change: 12, changePercent: 0.33, volume: 2100000  },
  { symbol: "BHARTIARTL", name: "Bharti Airtel",             price: 1876, change: 8,  changePercent: 0.43, volume: 5600000  },
  { symbol: "INFY",       name: "Infosys Ltd.",              price: 1612, change: 7,  changePercent: 0.44, volume: 11200000 },
];

export const MOCK_LOSERS: MarketMover[] = [
  { symbol: "TCS",      name: "Tata Consultancy Services", price: 3487, change: -25, changePercent: -0.71, volume: 2800000  },
  { symbol: "ITC",      name: "ITC Ltd.",                  price: 428,  change: -3,  changePercent: -0.70, volume: 22000000 },
  { symbol: "ICICIBANK",name: "ICICI Bank",                price: 1284, change: -7,  changePercent: -0.54, volume: 18600000 },
  { symbol: "HDFCBANK", name: "HDFC Bank",                 price: 1742, change: -6,  changePercent: -0.34, volume: 14800000 },
  { symbol: "RELIANCE", name: "Reliance Industries",       price: 2945, change: 5,   changePercent: 0.17,  volume: 8200000  },
];

// ============================================================
// WATCHLIST
// ============================================================
export const MOCK_WATCHLIST: WatchlistItem[] = [
  { symbol: "SBIN",       name: "State Bank of India",       price: 812,  change: 5,   changePercent: 0.62,  addedAt: "2026-08-01T00:00:00Z" },
  { symbol: "TCS",        name: "Tata Consultancy Services", price: 3487, change: -25, changePercent: -0.71, addedAt: "2026-08-05T00:00:00Z" },
  { symbol: "RELIANCE",   name: "Reliance Industries",       price: 2945, change: 5,   changePercent: 0.17,  addedAt: "2026-08-10T00:00:00Z" },
  { symbol: "INFY",       name: "Infosys Ltd.",              price: 1612, change: 7,   changePercent: 0.44,  addedAt: "2026-08-12T00:00:00Z" },
  { symbol: "HDFCBANK",   name: "HDFC Bank",                 price: 1742, change: -6,  changePercent: -0.34, addedAt: "2026-08-15T00:00:00Z" },
  { symbol: "LT",         name: "Larsen & Toubro",           price: 3621, change: 12,  changePercent: 0.33,  addedAt: "2026-08-18T00:00:00Z" },
];

// ============================================================
// LEADERBOARD
// ============================================================
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,  userId: "u01", username: "alpha_trader",   displayName: "alpha_trader",    totalReturn: 4107000, totalReturnPercent: 48.92, sharpeRatio: 2.14, winRate: 68.4, totalTrades: 142, portfolioValue: 12507000, badge: "🏆" },
  { rank: 2,  userId: "u02", username: "quant_maya",     displayName: "quant_maya",      totalReturn: 3463000, totalReturnPercent: 41.23, sharpeRatio: 1.98, winRate: 65.2, totalTrades: 98,  portfolioValue: 11863000, badge: "🥈" },
  { rank: 3,  userId: "u03", username: "risk_aware",     displayName: "risk_aware",      totalReturn: 3230000, totalReturnPercent: 38.45, sharpeRatio: 2.31, winRate: 71.0, totalTrades: 76,  portfolioValue: 11630000, badge: "🥉" },
  { rank: 4,  userId: "u04", username: "steady_gains",   displayName: "steady_gains",    totalReturn: 2703000, totalReturnPercent: 32.18, sharpeRatio: 1.76, winRate: 63.8, totalTrades: 112, portfolioValue: 11103000 },
  { rank: 5,  userId: "u05", username: "momentum_flux",  displayName: "momentum_flux",   totalReturn: 2507000, totalReturnPercent: 29.84, sharpeRatio: 1.62, winRate: 60.5, totalTrades: 167, portfolioValue: 10907000 },
  { rank: 6,  userId: "u06", username: "value_hunter",   displayName: "value_hunter",    totalReturn: 2388000, totalReturnPercent: 28.43, sharpeRatio: 1.84, winRate: 66.2, totalTrades: 64,  portfolioValue: 10788000 },
  { rank: 7,  userId: "usr_1",username: "trader",        displayName: "You",             totalReturn: 2338000, totalReturnPercent: 27.84, sharpeRatio: 1.71, winRate: 62.5, totalTrades: 89,  portfolioValue: 10738000, isCurrentUser: true },
  { rank: 8,  userId: "u08", username: "tech_bull",      displayName: "tech_bull",       totalReturn: 2118000, totalReturnPercent: 25.21, sharpeRatio: 1.45, winRate: 58.3, totalTrades: 203, portfolioValue: 10518000 },
  { rank: 9,  userId: "u09", username: "index_investor", displayName: "index_investor",  totalReturn: 1923000, totalReturnPercent: 22.89, sharpeRatio: 1.88, winRate: 70.1, totalTrades: 28,  portfolioValue: 10323000 },
  { rank: 10, userId: "u10", username: "patient_trader", displayName: "patient_trader",  totalReturn: 1811000, totalReturnPercent: 21.56, sharpeRatio: 1.92, winRate: 67.8, totalTrades: 41,  portfolioValue: 10211000 },
];

// ============================================================
// AI PREDICTIONS — from XGBoost model (real, not mock)
// Source: final_predictions.csv by your ML team
// ============================================================
export const XGBOOST_PREDICTIONS: Record<string, {
  company: string;
  symbol: string;
  probabilityUp: number;
  probabilityDown: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  accuracy: string;
  rocAuc: number;
  horizon: string;
}> = {
  SBIN:       { company: "SBI",                  symbol: "SBIN",       probabilityUp: 0.7113, probabilityDown: 0.2887, direction: "UP",      confidence: 0.4225, accuracy: "81.22%", rocAuc: 0.887, horizon: "5 trading days" },
  RELIANCE:   { company: "Reliance",             symbol: "RELIANCE",   probabilityUp: 0.5035, probabilityDown: 0.4965, direction: "NEUTRAL", confidence: 0.0070, accuracy: "82.45%", rocAuc: 0.890, horizon: "5 trading days" },
  HDFCBANK:   { company: "HDFC Bank",            symbol: "HDFCBANK",   probabilityUp: 0.4598, probabilityDown: 0.5402, direction: "NEUTRAL", confidence: 0.0805, accuracy: "80.82%", rocAuc: 0.879, horizon: "5 trading days" },
  ABCAPITAL:  { company: "Aditya Birla Capital", symbol: "ABCAPITAL",  probabilityUp: 0.6502, probabilityDown: 0.3498, direction: "UP",      confidence: 0.3004, accuracy: "78.32%", rocAuc: 0.884, horizon: "5 trading days" },
  ICICIBANK:  { company: "ICICI Bank",           symbol: "ICICIBANK",  probabilityUp: 0.2539, probabilityDown: 0.7461, direction: "DOWN",    confidence: 0.4922, accuracy: "80.00%", rocAuc: 0.874, horizon: "5 trading days" },
  INFY:       { company: "Infosys",              symbol: "INFY",       probabilityUp: 0.1665, probabilityDown: 0.8335, direction: "DOWN",    confidence: 0.6671, accuracy: "81.63%", rocAuc: 0.892, horizon: "5 trading days" },
  TCS:        { company: "TCS",                  symbol: "TCS",        probabilityUp: 0.1529, probabilityDown: 0.8471, direction: "DOWN",    confidence: 0.6942, accuracy: "82.04%", rocAuc: 0.914, horizon: "5 trading days" },
  ITC:        { company: "ITC",                  symbol: "ITC",        probabilityUp: 0.3670, probabilityDown: 0.6330, direction: "DOWN",    confidence: 0.2660, accuracy: "80.24%", rocAuc: 0.882, horizon: "5 trading days" },
  LT:         { company: "Larsen & Toubro",      symbol: "LT",         probabilityUp: 0.6669, probabilityDown: 0.3331, direction: "UP",      confidence: 0.3338, accuracy: "81.84%", rocAuc: 0.903, horizon: "5 trading days" },
  BHARTIARTL: { company: "Bharti Airtel",        symbol: "BHARTIARTL", probabilityUp: 0.4321, probabilityDown: 0.5679, direction: "DOWN",    confidence: 0.1358, accuracy: "84.29%", rocAuc: 0.893, horizon: "5 trading days" },
};
export const MOCK_AI_INSIGHT_AAPL: AIPrediction = {
  symbol: "SBIN",
  currentPrice: 812,
  predictedPriceShort: 828,
  predictedPriceMedium: 845,
  direction: "bullish",
  confidence: "medium",
  confidenceScore: 0.4225,
  status: "available",
  explanation:
    "XGBoost model predicts UP for SBI over the next 5 trading days. Probability UP: 71.1% | Probability DOWN: 28.9%. Model accuracy: 81.22% (ROC-AUC: 0.887).",
  keyFactors: [
    "P(UP) = 71.1%  |  P(DOWN) = 28.9%",
    "Model accuracy: 81.22%",
    "ROC-AUC: 0.887",
    "Global XGBoost — technical + market indicators",
  ],
  riskFactors: [
    "Past performance does not guarantee future results",
    "Model does not account for news or earnings events",
    "Use alongside other analysis",
  ],
  generatedAt: new Date().toISOString(),
  isMock: false,
};

export const MOCK_AI_PORTFOLIO_INSIGHT: AIInsight = {
  id: "ins_001",
  type: "portfolio_advice",
  title: "Portfolio Concentration Risk",
  summary: "Your portfolio has 47% concentration in the financial sector. Consider diversifying into other sectors to reduce correlated drawdown risk.",
  detail: "Financial sector holdings (SBIN, HDFCBANK, ICICIBANK, ABCAPITAL) represent a significant concentration. While individual selections show strong momentum, correlated drawdowns during a banking sector risk-off event could amplify losses beyond what individual position sizes suggest.",
  confidence: "medium",
  confidenceScore: 0.71,
  status: "available",
  factors: ["Financial sector correlation: 0.78", "Portfolio beta: 1.12", "Max expected drawdown: -14%"],
  risks: ["RBI policy sensitivity", "NPA cycle risk"],
  generatedAt: new Date().toISOString(),
  isMock: true,
};

// ============================================================
// MOCK COACH MESSAGES
// ============================================================
export const MOCK_COACH_CONVERSATION: CoachMessage[] = [
  {
    id: "m1", role: "assistant",
    content: "Hi! I'm your AI trading coach. I can help you understand trading concepts, analyze your portfolio, explain technical indicators, or discuss any trade you've made. What would you like to explore today?",
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
];

// ============================================================
// STRATEGIES
// ============================================================
// STRATEGIES
// ============================================================
export const MOCK_STRATEGIES: Strategy[] = [
  {
    id: "str_001",
    userId: "usr_1",
    name: "Golden Cross",
    description: "Classic moving average crossover strategy. Goes long when 50-day MA crosses above 200-day MA.",
    symbol: "SBIN",
    rules: [
      {
        id: "r1", indicator: "sma_50", operator: "crosses_above", value: "sma_200",
        action: "buy", positionSizeType: "percent_portfolio", positionSizeValue: 100,
      },
      {
        id: "r2", indicator: "sma_50", operator: "crosses_below", value: "sma_200",
        action: "sell", positionSizeType: "percent_portfolio", positionSizeValue: 100,
      },
    ],
    isActive: false,
    isPublic: true,
    createdAt: "2026-07-15T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    performance: { totalReturn: 1078000, totalReturnPercent: 12.84, sharpeRatio: 0.94, maxDrawdown: -8.2, winRate: 52, totalTrades: 12 },
  },
  {
    id: "str_002",
    userId: "usr_1",
    name: "RSI Bounce",
    description: "Mean reversion using RSI. Buy oversold conditions, sell overbought.",
    symbol: "TCS",
    rules: [
      {
        id: "r3", indicator: "rsi_14", operator: "less_than", value: 30,
        action: "buy", positionSizeType: "percent_cash", positionSizeValue: 25,
      },
      {
        id: "r4", indicator: "rsi_14", operator: "greater_than", value: 70,
        action: "sell", positionSizeType: "percent_portfolio", positionSizeValue: 100,
      },
    ],
    isActive: true,
    isPublic: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
    performance: { totalReturn: 539280, totalReturnPercent: 6.42, sharpeRatio: 1.28, maxDrawdown: -4.8, winRate: 64, totalTrades: 28 },
  },
];

// ============================================================
// MOCK BACKTEST RESULT
// ============================================================
function generateBacktestTimeSeries(): { date: string; value: number; benchmark: number }[] {
  const series = [];
  let value     = 8400000;   // ₹84 lakh starting capital
  let benchmark = 8400000;
  const now = Date.now();
  const days = 252;

  for (let i = 0; i < days; i++) {
    const t = new Date(now - (days - i) * 86400000);
    const dayReturn = (Math.sin(i * 0.15 + 1.2) * 0.008) + 0.0003;
    const benchReturn = (Math.sin(i * 0.12) * 0.005) + 0.0002;
    value *= (1 + dayReturn);
    benchmark *= (1 + benchReturn);
    series.push({
      date: t.toISOString().split("T")[0],
      value: parseFloat(value.toFixed(2)),
      benchmark: parseFloat(benchmark.toFixed(2)),
    });
  }
  return series;
}

export const MOCK_BACKTEST_RESULT: BacktestResult = {
  id: "bt_001",
  config: {
    strategyId: "str_001",
    symbol: "SBIN",
    startDate: "2025-09-03",
    endDate: "2026-09-03",
    startingCapital: 8400000,
    feePercent: 0.1,
    slippagePercent: 0.05,
    benchmarkSymbol: "NIFTY50",
  },
  status: "completed",
  totalReturn: 1918602,
  totalReturnPercent: 22.84,
  benchmarkReturn: 1528825,
  benchmarkReturnPercent: 18.20,
  cagr: 22.84,
  sharpeRatio: 1.34,
  sortinoRatio: 1.82,
  maxDrawdown: -8.42,
  maxDrawdownDuration: 34,
  volatility: 15.8,
  winRate: 58.3,
  profitFactor: 1.72,
  totalTrades: 24,
  avgTradeReturn: 1.14,
  portfolioValues: generateBacktestTimeSeries(),
  trades: [
    { date: "2025-10-15", action: "buy",  price: 37557,  quantity: 229, value: 8600553 },
    { date: "2026-01-08", action: "sell", price: 40337,  quantity: 229, value: 9237173, pnl: 636620 },
    { date: "2026-02-20", action: "buy",  price: 39758,  quantity: 234, value: 9303372 },
    { date: "2026-04-12", action: "sell", price: 41395,  quantity: 234, value: 9686430, pnl: 383058 },
    { date: "2026-05-30", action: "buy",  price: 42470,  quantity: 228, value: 9683160 },
    { date: "2026-08-14", action: "sell", price: 44085,  quantity: 228, value: 10051380, pnl: 368220 },
  ],
  createdAt: "2026-09-03T08:00:00Z",
  completedAt: "2026-09-03T08:00:02Z",
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "order_filled",  title: "Order Filled",        message: "SBIN BUY 100 @ ₹793 — Filled",                         isRead: false, createdAt: "2026-09-03T09:31:45Z", relatedSymbol: "SBIN", relatedOrderId: "ord_001" },
  { id: "n2", type: "ai_insight",    title: "New AI Insight",      message: "XGBoost prediction: TCS bearish signal (84.71% DOWN)", isRead: false, createdAt: "2026-09-03T08:00:00Z" },
  { id: "n3", type: "price_alert",   title: "Price Alert",         message: "SBIN crossed ₹810 — target reached",                   isRead: true,  createdAt: "2026-09-03T09:15:00Z", relatedSymbol: "SBIN" },
  { id: "n4", type: "achievement",   title: "Achievement Unlocked", message: "First Profit: Realized your first gain 🎯",            isRead: true,  createdAt: "2026-08-20T13:45:00Z" },
  { id: "n5", type: "order_filled",  title: "Order Filled",        message: "INFY BUY 50 @ ₹1,598 — Filled",                       isRead: true,  createdAt: "2026-09-02T14:15:12Z", relatedSymbol: "INFY", relatedOrderId: "ord_002" },
];

// ============================================================
// HELPERS
// ============================================================
export function getAssetBySymbol(symbol: string): Asset | undefined {
  return MOCK_ASSETS.find(a => a.symbol === symbol);
}

export function getQuote(symbol: string): Quote | undefined {
  return MOCK_QUOTES[symbol];
}

// ============================================================
// CURRENCY — Indian Rupees (INR)
// Conversion rate: 1 USD = 84 INR (approximate)
// ============================================================
export const USD_TO_INR = 84;

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_00_00_000) {  // 1 crore+
    return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (compact && Math.abs(value) >= 1_00_000) {      // 1 lakh+
    return `₹${(value / 1_00_000).toFixed(2)} L`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `₹${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: value < 10 ? 2 : 2,
    maximumFractionDigits: value < 10 ? 2 : 2,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
