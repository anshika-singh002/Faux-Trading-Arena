# ML Integration Guide

This document describes the contract between the Faux Trading application and the ML team's models. The application is designed so that **no frontend changes are required** when the real models are integrated.

---

## Current State

The application runs with `MockAIService` which returns clearly-flagged synthetic predictions.

```
AI_MODE=mock  (in .env)
```

All mock responses carry `is_mock: true` and display a "MOCK" badge in the UI.

---

## Integration Architecture

```
Faux Trading App
      │
      ▼
  AIService (abstract interface)
      │
      ├── MockAIService       ← Active now
      │     Returns synthetic data, flagged as mock
      │
      └── MLModelAIService    ← Your implementation goes here
            Calls your model API via HTTP
```

**File:** `backend/app/modules/ai/service.py`

Switch modes via `.env`:
```bash
AI_MODE=live
AI_MODEL_API_URL=https://your-model-api.example.com
AI_MODEL_API_KEY=your-api-key
```

---

## Required API Endpoints

Your model API must implement these four endpoints:

---

### 1. `POST /predict`

Price prediction and market outlook for an asset.

**Request:**
```json
{
  "symbol": "AAPL",
  "current_price": 192.53
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "current_price": 192.53,
  "predicted_price_short": 195.80,
  "predicted_price_medium": 198.40,
  "direction": "bullish",
  "confidence": "medium",
  "confidence_score": 0.62,
  "status": "available",
  "explanation": "Plain-language explanation of the prediction.",
  "key_factors": ["Factor 1", "Factor 2"],
  "risk_factors": ["Risk 1", "Risk 2"]
}
```

**`direction`** values: `"bullish"` | `"bearish"` | `"neutral"`  
**`confidence`** values: `"low"` | `"medium"` | `"high"`  
**`status`** values: `"available"` | `"unavailable"` | `"loading"` | `"insufficient_data"`

---

### 2. `POST /portfolio-insight`

Portfolio risk and composition analysis.

**Request:**
```json
{
  "positions": [
    {
      "symbol": "AAPL",
      "quantity": 120,
      "avg_cost": 145.20,
      "market_value": 23103.60,
      "weight": 18.07
    }
  ],
  "cash": 24156.35
}
```

**Response:**
```json
{
  "insight_type": "portfolio_advice",
  "title": "Portfolio Risk Analysis",
  "summary": "Short summary shown on cards.",
  "detail": "Full detailed analysis shown on the insights page.",
  "confidence": "medium",
  "confidence_score": 0.71,
  "status": "available",
  "factors": ["Finding 1", "Finding 2"]
}
```

---

### 3. `POST /chat`

Conversational trading coach.

**Request:**
```json
{
  "message": "What is RSI and how should I use it?",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ],
  "context": {
    "portfolio": {},
    "recent_trades": []
  }
}
```

**Response:**
```json
{
  "content": "Markdown-formatted response from the model.",
  "context_used": ["portfolio", "recent_trades"]
}
```

---

### 4. `POST /explain-backtest`

Plain-language explanation of backtest results.

**Request:**
```json
{
  "total_return_percent": 22.84,
  "sharpe_ratio": 1.34,
  "max_drawdown": -8.42,
  "win_rate": 58.3,
  "total_trades": 24,
  "symbol": "SPY",
  "strategy_name": "Golden Cross"
}
```

**Response:**
```json
{
  "explanation": "Plain-language explanation of what these results mean."
}
```

---

## Error Handling

If your API returns an error or times out, `MLModelAIService` gracefully degrades:

- Predictions return `status: "unavailable"`
- Chat returns `"The AI coach is temporarily unavailable."`
- The UI shows appropriate unavailable states — no crashes

---

## Testing the Integration

```bash
# Set in .env
AI_MODE=live
AI_MODEL_API_URL=http://localhost:9000   # your model server

# Run the app and check:
# GET /api/v1/ai/predict/AAPL
# POST /api/v1/ai/chat
# GET /api/v1/ai/portfolio-insight
```

---

## UI Behaviour

| Model Status | UI Display |
|---|---|
| `available` | Shows prediction + confidence bar |
| `loading` | Shows "Analyzing market data…" skeleton |
| `unavailable` | Shows "AI insights are temporarily unavailable." |
| `insufficient_data` | Shows "Not enough data to generate an insight." |
| `is_mock: true` | Shows orange "MOCK" badge |
| `is_mock: false` | Badge hidden |

No frontend changes needed for any of the above — the UI already handles all states.
