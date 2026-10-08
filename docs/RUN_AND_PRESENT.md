# Faux Trading Arena: run guide and supervisor script

## 1. Run it (first time)

Needs: Python 3.12, Node.js 20+, internet (for live prices).

**Backend** (terminal 1)
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
Keep `LIVE_MARKET_DATA=true` and `AI_MODE=live` in `.env`. XGBoost must be below 3 (requirements pin 2.1.4).

**Frontend** (terminal 2)
```
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. API docs: http://localhost:8000/docs.

Next time, only: activate the venv and run uvicorn, then `npm run dev`.

## 2. Use it
1. Register (email, username, password of 8+ characters). You get ₹1 Cr virtual cash.
2. **Market**: 51 NSE stocks with live price, market cap, P/E, 52-week range and a Risk column. Use the search box at the top (name, symbol or sector).
3. Open a stock, choose Buy/Sell, Market or Limit, enter a quantity, press Review. If the stock looks risky you get a warning with reasons. Cancel or Buy anyway.
4. **Portfolio**: holdings, profit/loss, and yellow alerts for holdings that may reverse.
5. **Orders / Transactions**: pending limit orders and history. The bell shows fills.
6. **Insights, News, Strategies, Backtesting, AI Coach, Advisor, Leaderboard**: AI signals (10 trained stocks), news sentiment, rule-based strategies, historical tests, chat coach, ranking.
7. **Profile**: change name or password, reset portfolio.

## 3. Tests run on 2026-10-08 (local)
- Backend: 96 passed.
- TypeScript: no errors. ESLint: 0 errors (26 harmless unused-variable warnings).
- `next build`: succeeded (20 routes).
- Live API check: 51 live quotes with real market caps, risk check on ITC returned HIGH (falling), market buy and sell of TCS filled at the live price, AI answered for TCS and correctly refused WIPRO (not a trained stock), leaderboard OK.

## 4. Known limits (say these before you are asked)
- Prices come from Yahoo Finance, free and delayed a few minutes. Not an official exchange feed.
- AI predictions cover only the 10 stocks the models were trained on. The other 41 have live prices and the risk check only.
- Orders are accepted when the market is closed and fill at the last known price.
- Watchlist is stored per browser.

## 5. Script for the supervisor (about 4 minutes)

**Opening (20 s)**
"This is Faux Trading Arena, a practice trading platform for Indian stocks. Users get ₹1 crore of virtual money and trade real NSE stocks at real prices, with no real money at risk. The goal is to learn investing safely, with AI help."

**Market page (40 s)**
"All data here is live from the market: price, market cap, P/E, 52-week range. We removed all dummy data earlier. If the live feed is down, the app says so instead of showing made-up numbers. There are 51 stocks, the full Nifty 50 plus one extra, and the search box finds a stock by name, symbol or sector."

**Risk alert (60 s), the key feature**
"Watch what happens when I try to buy a stock that is falling." *Open ITC, enter quantity, press Review.* "Before the order, the app warns that it may lose money and shows why, using its own price history: down 4% today, below its 20-day and 50-day averages, close to its yearly low. The same check also flags stocks that are up now but look overheated and may reverse. The user can cancel or choose Buy anyway. The decision stays with them, but it is informed."

**Trading (40 s)**
"Market orders fill at a fresh live price. If a fresh price cannot be fetched, the order is refused rather than filled at a guess. Limit orders wait in the background until the price reaches the target. The portfolio updates, and a bell notification arrives."

**AI and extras (50 s)**
"Two XGBoost models give an up/down prediction and a buy/hold/sell signal. They are trained on 10 stocks, so the app shows AI only for those and says so for the rest. There is also news sentiment, a strategy builder, backtesting on historical data, an AI coach that answers in plain language, an advisor, and a leaderboard."

**Quality (30 s)**
"The backend has 96 automated tests, all passing. The frontend builds cleanly with no type or lint errors. I also tested the live system end to end."

**Limits and next steps (30 s)**
"Prices are free Yahoo data, delayed a few minutes. AI covers 10 stocks. Next steps: train models for all 50 stocks, add an official data feed, apply slippage to orders, and block orders while the market is closed."

**Closing (10 s)**
"It's a safe place to learn trading using real data. Happy to show any part in detail."

### Likely questions
- **Where does the data come from?** Yahoo Finance through the yfinance library. Free, delayed, cached about 60 seconds.
- **How does the risk check work?** Rules on real price history: daily drop, trend vs 20/50-day averages, 20-day change, RSI, distance from the 52-week high/low, and volatility. It adds points and rates Low, Medium or High. It is not AI and is not a guarantee.
- **Is the AI accurate?** It shows a probability, not a certainty. It is trained on 10 stocks only.
- **Is it real money?** No. Everything is virtual.
