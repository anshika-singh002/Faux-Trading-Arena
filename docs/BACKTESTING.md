# Backtesting Engine

## Overview

The backtesting module simulates strategy performance against historical (simulated) price data. When real historical data is available, replace the price generation in `market_data/router.py` and `backtesting/router.py`.

---

## How It Works

1. User configures a backtest (asset, date range, capital, fees)
2. `POST /backtesting/` triggers `_run_backtest_sync()`
3. Engine generates synthetic OHLCV data using the same deterministic algorithm as the chart
4. Runs a moving average crossover simulation (representative of rule-based strategies)
5. Calculates performance metrics
6. Stores results as JSON in the `backtests` table
7. Returns full results to the client

---

## Metrics Calculated

| Metric | Description |
|--------|-------------|
| Total Return | Absolute profit/loss in dollars |
| Total Return % | Percentage gain/loss |
| CAGR | Compound Annual Growth Rate |
| Sharpe Ratio | Risk-adjusted return (annualized) |
| Sortino Ratio | Downside-only volatility penalty |
| Max Drawdown | Worst peak-to-trough decline |
| Max Drawdown Duration | Days in drawdown |
| Win Rate | % of trades that were profitable |
| Profit Factor | Gross profit / Gross loss |
| Total Trades | Number of completed round trips |
| Avg Trade Return | Mean return per trade |
| Volatility | Annualized standard deviation of daily returns |

---

## Replacing with Real Historical Data

The price generation is isolated in two places:

1. `backend/app/modules/market_data/router.py` → `generate_ohlcv()`
2. `backend/app/modules/backtesting/router.py` → `_run_backtest_sync()`

Replace with calls to your historical data provider (e.g., Yahoo Finance, Alpha Vantage, Polygon.io).

---

## Benchmark Comparison

The frontend displays strategy performance vs. a configurable benchmark (default: SPY). The benchmark line uses the same OHLCV data for the benchmark symbol, making the comparison fair.

---

## Limitations (Current)

- Uses simulated price data — not real historical prices
- The backtesting engine implements a fixed SMA crossover logic regardless of strategy rules
- Real rule execution (RSI < 30 → buy, etc.) is the next implementation step
- No slippage model beyond a flat percentage
- No overnight gap simulation
