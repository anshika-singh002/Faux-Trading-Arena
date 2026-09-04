# Faux Trading — AI-Powered Virtual Trading Simulator

A production-quality trading simulator where users trade with $100,000 in virtual funds, build strategies, backtest them, and get AI-powered market insights — with zero real money at risk.

---

## Quick Start

### Prerequisites
- Node.js 22+
- Python 3.12+
- Docker + Docker Compose (for full stack)

### Frontend only (mock data, no backend needed)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Full stack with Docker

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Start everything
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Backend development (manual)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
cp .env.example .env         # Edit with your DB details

uvicorn app.main:app --reload
# → http://localhost:8000
```

---

## Project Structure

```
Faux Trading/
├── frontend/              # Next.js 16 + TypeScript + Tailwind CSS
│   └── src/
│       ├── app/           # App Router pages
│       │   ├── (app)/     # Authenticated app shell
│       │   ├── (auth)/    # Login / Register
│       │   └── page.tsx   # Landing page
│       ├── components/    # Shared UI components
│       │   ├── charts/    # PriceChart, PortfolioChart
│       │   ├── layout/    # Sidebar, TopBar, AppShell
│       │   └── ui/        # Buttons, Badges, Cards, etc.
│       └── lib/
│           ├── types.ts       # All TypeScript types
│           └── mock-data.ts   # Mock data + helpers
│
├── backend/               # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── core/          # Config, DB, Security
│   │   ├── models/        # SQLAlchemy ORM models
│   │   └── modules/       # Domain modules (auth, trading, AI…)
│   └── tests/             # Pytest test suite
│
├── docs/                  # Architecture, API, ML integration docs
├── docker-compose.yml
└── .gitignore
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Portfolio overview |
| `/market` | Asset explorer |
| `/market/[symbol]` | Asset detail + trading |
| `/portfolio` | Full portfolio view |
| `/orders` | Order management |
| `/transactions` | Trade history |
| `/strategies` | Strategy builder |
| `/backtesting` | Backtesting engine |
| `/insights` | AI market insights |
| `/coach` | AI trading coach |
| `/leaderboard` | Risk-adjusted rankings |
| `/learn` | Learning modules |
| `/profile` | User settings |

---

## Design System

Custom design tokens defined in `globals.css`. Key colors:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#E8A838` | Amber gold — primary brand |
| `--color-bg` | `#0D0F14` | Deep near-black background |
| `--color-surface` | `#1A1D27` | Cards and panels |
| `--color-positive` | `#26C281` | Gains, bullish |
| `--color-negative` | `#E05252` | Losses, bearish |
| `--color-warning` | `#F0A030` | Risk alerts |
| `--color-text` | `#F0F2F8` | Primary text |

---

## Running Tests

```bash
# Backend tests
cd backend
pip install -r requirements.txt
pytest tests/ -v

# Frontend type check
cd frontend
npx tsc --noEmit

# Frontend build check
npm run build
```

---

## Key Decisions

- **Modular monolith** over microservices — scales cleanly, simpler to operate
- **Server-side validation** for all trades — frontend is never trusted for balance/position data
- **Mock AI service** with clean interface — ML team can plug in real models without frontend changes
- **Tailwind v4** with CSS custom properties for the design token system
- **Lightweight Charts v5** for the financial price chart
- **No vibe-coded components** — every component was intentionally designed

See `docs/ARCHITECTURE.md` for full system design.
