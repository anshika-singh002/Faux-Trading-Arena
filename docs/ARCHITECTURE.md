# Architecture

## Overview

Faux Trading is a modular monolith. All domains live in one deployable unit, with clean module boundaries that could be split into services later if needed.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                  Next.js 16 (App Router)                    │
│            TypeScript + Tailwind CSS + Recharts             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend                           │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │ Trading  │ │Portfolio │ │ Backtesting  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Market  │ │   AI     │ │Leaderboard│ │ Strategies  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                             │
│           SQLAlchemy ORM + Alembic migrations               │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
  ┌─────────▼────────┐      ┌──────────▼──────┐
  │   PostgreSQL 16  │      │   Redis 7       │
  │   (primary data) │      │   (cache/queue) │
  └──────────────────┘      └─────────────────┘
```

## Security Model

**The frontend is never trusted.**

- All balance calculations happen on the server
- All position validations happen on the server
- JWT tokens are verified on every request
- Order validation (quantity > 0, sufficient balance, sufficient shares) is enforced server-side
- Users can only access their own data (user_id checked in every query)

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `auth` | Registration, login, JWT issuance |
| `users` | User profile, settings |
| `assets` | Asset catalog, quote snapshots |
| `market_data` | OHLCV simulation (→ real data later) |
| `trading` | Order placement, execution engine |
| `orders` | Order history, cancellation |
| `portfolio` | Position aggregation, P&L calculation |
| `strategies` | Strategy CRUD |
| `backtesting` | Historical simulation engine |
| `ai` | Prediction + coaching (mock/real) |
| `leaderboard` | Risk-adjusted rankings |
| `notifications` | User alerts |

## Data Flow: Trade Execution

```
User clicks "Buy" in UI
        │
        ▼
POST /api/v1/trading/order
        │
  TradingEngine.place_order()
        │
   ┌────┴────────────────────────────────┐
   │   Server-side validation            │
   │   ✓ quantity > 0                    │
   │   ✓ balance >= cost + fee           │
   │   ✓ side ∈ {buy, sell}             │
   │   ✓ position exists (for sells)     │
   └────────────────────┬────────────────┘
                        │ pass
                        ▼
              Create Order record
                        │
                        ▼
          _execute_order() (market orders)
                        │
          ┌─────────────┴────────────────┐
          │  Update User.virtual_balance │
          │  Upsert Position             │
          │  Create Transaction          │
          └──────────────────────────────┘
                        │
                        ▼
            Return filled Order to client
```

## AI Integration Points

```
Asset Detail page ──→ GET /ai/predict/{symbol}
Portfolio page    ──→ GET /ai/portfolio-insight
AI Coach page     ──→ POST /ai/chat
Backtesting page  ──→ POST /ai/explain-backtest (future)
```

All AI calls route through `AIService` (abstract). Currently `MockAIService` is active. Set `AI_MODE=live` in `.env` to activate `MLModelAIService`.

## Frontend State

- No global state library — component-level state with React `useState`
- Server state is fetched fresh on each page load (no SWR/React Query yet — add when connecting to real backend)
- Design tokens via CSS custom properties — no runtime overhead
- All mock data lives in `src/lib/mock-data.ts` — single replacement point for real API calls
