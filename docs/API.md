# API Reference

Base URL: `http://localhost:8000/api/v1`  
Interactive docs: `http://localhost:8000/docs`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account → returns JWT |
| POST | `/auth/login` | Sign in → returns JWT |
| POST | `/auth/logout` | Invalidate session |

### Register
```json
POST /auth/register
{
  "email": "you@example.com",
  "username": "alpha_trader",
  "display_name": "Alex Chen",
  "password": "SecurePassword123!"
}
```

### Login
```json
POST /auth/login
{
  "email": "you@example.com",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user_id": "uuid",
  "username": "alpha_trader",
  "virtual_balance": 100000.0
}
```

---

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile |

---

## Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assets/` | List all assets (supports `?q=AAPL&asset_type=stock`) |
| GET | `/assets/{symbol}` | Get asset details |
| GET | `/assets/{symbol}/quote` | Get latest quote |

---

## Market Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/ohlcv/{symbol}?range=1M` | Get OHLCV candles |
| GET | `/market/indices` | Market indices snapshot |
| GET | `/market/movers/gainers` | Top gainers |
| GET | `/market/movers/losers` | Top losers |

**Range values:** `1D` `1W` `1M` `3M` `6M` `1Y` `5Y`

---

## Trading

| Method | Path | Description |
|--------|------|-------------|
| POST | `/trading/order` | Place a new order |
| DELETE | `/trading/order/{id}` | Cancel open order |

### Place Order
```json
POST /trading/order
{
  "symbol": "AAPL",
  "side": "buy",
  "order_type": "market",
  "quantity": 10,
  "price": null
}
```

For limit orders:
```json
{
  "symbol": "AAPL",
  "side": "buy",
  "order_type": "limit",
  "quantity": 10,
  "price": 185.00
}
```

**Server-side validations:**
- `quantity > 0`
- `balance >= cost + fee` (buy)
- `held_shares >= quantity` (sell)
- `price` required for limit orders

---

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders/` | List orders (`?status=filled`) |
| GET | `/orders/transactions` | List filled transactions |

---

## Portfolio

| Method | Path | Description |
|--------|------|-------------|
| GET | `/portfolio/` | Full portfolio summary with positions and P&L |

---

## Strategies

| Method | Path | Description |
|--------|------|-------------|
| GET | `/strategies/` | List user strategies |
| POST | `/strategies/` | Create strategy |
| DELETE | `/strategies/{id}` | Delete strategy |

---

## Backtesting

| Method | Path | Description |
|--------|------|-------------|
| POST | `/backtesting/` | Run a backtest |
| GET | `/backtesting/{id}` | Get backtest result |

### Run Backtest
```json
POST /backtesting/
{
  "strategy_id": "uuid",
  "symbol": "SPY",
  "start_date": "2025-01-01",
  "end_date": "2026-01-01",
  "starting_capital": 100000,
  "fee_percent": 0.1,
  "slippage_percent": 0.05,
  "benchmark_symbol": "SPY"
}
```

---

## AI

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai/predict/{symbol}` | Price prediction + market outlook |
| GET | `/ai/portfolio-insight` | Portfolio risk analysis |
| POST | `/ai/chat` | Trading coach conversation |

### Chat
```json
POST /ai/chat
{
  "message": "What is RSI?",
  "history": [],
  "context": {}
}
```

---

## Leaderboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leaderboard/` | Risk-adjusted rankings |

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications/` | List notifications |
| POST | `/notifications/{id}/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |

---

## Error Responses

All errors follow:
```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation failed) |
| 401 | Unauthenticated (missing/invalid token) |
| 403 | Forbidden (suspended account) |
| 404 | Resource not found |
| 422 | Request body validation error |
| 500 | Internal server error |
