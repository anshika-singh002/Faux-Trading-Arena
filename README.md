# Faux Trading Arena

A virtual stock trading simulator built for learning. You get ₹1 crore in fake money and can trade real Indian stocks — no real cash, no real risk.

## What it does

- **Trade Indian stocks** — buy and sell 10 NSE-listed stocks (SBIN, TCS, Infosys, Reliance, HDFC Bank, ICICI Bank, ITC, L&T, Bharti Airtel, Aditya Birla Capital)
- **Live portfolio tracking** — your cash, positions, P&L, and transaction history update in real time after every trade
- **AI predictions** — XGBoost models trained on 10 years of data give BUY / HOLD / SELL signals with probability scores for each stock
- **Market news** — live financial headlines from GNews with sentiment analysis
- **Strategy builder & backtesting** — build rule-based strategies and test them on historical data
- **Leaderboard** — see how you rank against other traders

## Getting started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
# Copy .env.example to .env and fill in values
uvicorn app.main:app --reload --port 8000
```

The backend uses SQLite by default — no database setup needed.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start trading.

## Tech stack

| Layer | What's used |
|---|---|
| Frontend | Next.js 16, React 19, Zustand, Tailwind |
| Backend | FastAPI, SQLAlchemy (async), SQLite/PostgreSQL |
| AI models | XGBoost classifiers, scikit-learn, pandas |
| News | GNews API (add `GNEWS_API_KEY` in `.env` for live headlines) |

## Environment variables

Copy `backend/.env.example` to `backend/.env`:

```
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite+aiosqlite:///./faux_trading.db
INITIAL_VIRTUAL_BALANCE=10000000.0   # ₹1 crore per user
AI_MODE=mock                          # or "live" for external ML API
GNEWS_API_KEY=                        # optional — adds live news with images
```

## Notes

- All trades use virtual funds only. No real money is ever involved.
- The XGBoost models were trained on historical OHLCV data from 2016–2026. Predictions are for educational purposes and not financial advice.
- Market prices are simulated. This is a learning tool, not a real trading platform.
