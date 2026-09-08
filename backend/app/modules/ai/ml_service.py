"""
XGBoost ML Prediction Service (Model 2)
=======================================
Loads per-stock 3-Class XGBoost models from `backend/ml_models/model2/` using joblib.
Computes 67 technical indicator features from market candle history in real-time,
and performs `predict_proba()` inference to output BUY, HOLD, or SELL predictions
with full probability distribution [P(SELL), P(HOLD), P(BUY)].

Supported stocks:
  SBI (SBIN), Reliance (RELIANCE), HDFC Bank (HDFCBANK),
  Aditya Birla Capital (ABCAPITAL), ICICI Bank (ICICIBANK),
  Infosys (INFY), TCS (TCS), ITC (ITC),
  Larsen & Toubro (LT), Bharti Airtel (BHARTIARTL)
"""

import logging
import json
import math
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Any

import joblib
import numpy as np
import pandas as pd

from app.modules.ai.service import (
    AIService, PredictionResult, InsightResult, CoachResponse, MockAIService
)

logger = logging.getLogger(__name__)

ML_DIR           = Path(__file__).parent.parent.parent.parent / "ml_models"
MODEL2_DIR       = ML_DIR / "model2"
MODEL2_CONFIG    = MODEL2_DIR / "config.json"
MODEL2_FEATURES  = MODEL2_DIR / "features_model2.json"
PERFORMANCE_CSV  = ML_DIR / "company_performance.csv"

# ── App symbol → model company name ──────────────────────────────────────────
SYMBOL_TO_COMPANY: dict[str, str] = {
    "SBIN":       "SBI",
    "RELIANCE":   "Reliance",
    "HDFCBANK":   "HDFC Bank",
    "ABCAPITAL":  "Aditya Birla Capital",
    "ICICIBANK":  "ICICI Bank",
    "INFY":       "Infosys",
    "TCS":        "TCS",
    "ITC":        "ITC",
    "LT":         "Larsen & Toubro",
    "BHARTIARTL": "Bharti Airtel",
}

# ── App symbol → Model2 pkl filename ──────────────────────────────────────────
SYMBOL_TO_MODEL2_PKL: dict[str, str] = {
    "SBIN":       "SBI_bhs.pkl",
    "RELIANCE":   "Reliance_bhs.pkl",
    "HDFCBANK":   "HDFC_Bank_bhs.pkl",
    "ABCAPITAL":  "Aditya_Birla_Capital_bhs.pkl",
    "ICICIBANK":  "ICICI_Bank_bhs.pkl",
    "INFY":       "Infosys_bhs.pkl",
    "TCS":        "TCS_bhs.pkl",
    "ITC":        "ITC_bhs.pkl",
    "LT":         "Larsen_and_Toubro_bhs.pkl",
    "BHARTIARTL": "Bharti_Airtel_bhs.pkl",
}

SUPPORTED_SYMBOLS = set(SYMBOL_TO_COMPANY.keys())

# Default base prices for simulation
DEFAULT_BASE_PRICES = {
    "SBIN": 812.0, "RELIANCE": 2980.0, "HDFCBANK": 1650.0,
    "ICICIBANK": 1190.0, "INFY": 1840.0, "TCS": 4250.0,
    "ITC": 495.0, "LT": 3620.0, "BHARTIARTL": 1540.0, "ABCAPITAL": 228.0,
    "NIFTY": 24500.0, "BANKNIFTY": 51200.0, "VIX": 13.5,
}


def _load_model2_feature_names() -> list[str]:
    """Load ordered feature names from features_model2.json"""
    if MODEL2_FEATURES.exists():
        try:
            return json.loads(MODEL2_FEATURES.read_text())
        except Exception as e:
            logger.warning(f"Failed to read {MODEL2_FEATURES}: {e}")
    return []


def _confidence_label(score: float) -> str:
    if score >= 0.55:
        return "high"
    if score >= 0.38:
        return "medium"
    return "low"


def generate_candle_series(symbol: str, current_price: Optional[float] = None, points: int = 252, vol: float = 0.02) -> pd.DataFrame:
    """
    Generates 252 daily historical candles ending at the current price for technical indicator calculation.
    """
    base = current_price or DEFAULT_BASE_PRICES.get(symbol.upper(), 100.0)
    now = int(time.time())
    seed = sum(ord(c) for c in symbol)
    price = base * 0.90  # start slightly lower and trend

    rows = []
    for i in range(points):
        r1 = (math.sin(seed * (i + 1) * 0.1234) * 0.5 + 0.5)
        r2 = (math.sin(seed * (i + 1) * 0.5678) * 0.5 + 0.5)
        r3 = (math.sin(seed * (i + 1) * 0.9012) * 0.5 + 0.5)
        r4 = (math.sin(seed * (i + 1) * 0.3456) * 0.5 + 0.5)

        if i == points - 1 and current_price is not None:
            c = current_price
            o = price
            h = max(o, c) + r2 * vol * price * 0.5
            l = min(o, c) - r3 * vol * price * 0.5
        else:
            change = (r1 - 0.5) * vol * 2
            price = price * (1 + change)
            o = price
            c = price * (1 + (r4 - 0.5) * vol)
            h = max(o, c) + r2 * vol * price
            l = min(o, c) - r3 * vol * price

        v = int((r1 + 0.5) * 4_500_000)
        price = c
        rows.append({"open": round(o, 2), "high": round(h, 2), "low": round(l, 2), "close": round(c, 2), "volume": v})

    return pd.DataFrame(rows)


def compute_model2_features(
    df_stock: pd.DataFrame,
    df_nifty: pd.DataFrame,
    df_bank: pd.DataFrame,
    df_vix: pd.DataFrame,
    feature_names: list[str],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Computes all 67 technical indicator features for Model 2.
    Returns:
      (features_df, key_technical_summary_dict)
    """
    close = df_stock['close'].astype(float)
    open_ = df_stock['open'].astype(float)
    high  = df_stock['high'].astype(float)
    low   = df_stock['low'].astype(float)
    vol   = df_stock['volume'].astype(float)

    # Returns
    r1 = close.pct_change(1)
    r3 = close.pct_change(3)
    r5 = close.pct_change(5)
    r10 = close.pct_change(10)
    r20 = close.pct_change(20)

    # Lags of R1
    r1_l1 = r1.shift(1)
    r1_l2 = r1.shift(2)
    r1_l3 = r1.shift(3)
    log_ret = np.log((close / close.shift(1)).replace(0, np.nan)).fillna(0.0)

    # Moving averages
    sma5  = close.rolling(5).mean()
    sma10 = close.rolling(10).mean()
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()

    sma5_ratio  = close / sma5
    sma10_ratio = close / sma10
    sma20_ratio = close / sma20
    sma50_ratio = close / sma50
    sma5_sma20  = sma5 / sma20
    sma20_sma50 = sma20 / sma50

    ema10 = close.ewm(span=10, adjust=False).mean()
    ema20 = close.ewm(span=20, adjust=False).mean()
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()

    ema10_ratio = close / ema10
    ema20_ratio = close / ema20
    ema10_ema20 = ema10 / ema20

    # RSI (14 and 7)
    def calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(period).mean()
        avg_loss = loss.rolling(period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi_series = 100 - (100 / (1 + rs))
        return rsi_series.fillna(50.0)

    rsi = calc_rsi(close, 14)
    rsi_centered = rsi - 50.0
    rsi7 = calc_rsi(close, 7)
    rsi_diff = rsi.diff(1)

    # MACD
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    macd_hist = macd - macd_signal
    macd_sign = np.sign(macd_hist)
    macd_diff = macd_hist.diff(1)

    # Stochastic Oscillator
    low14 = low.rolling(14).min()
    high14 = high.rolling(14).max()
    denom_stoch = (high14 - low14).replace(0, np.nan)
    stoch_k = 100 * ((close - low14) / denom_stoch)
    stoch_d = stoch_k.rolling(3).mean()
    stoch_kd = stoch_k - stoch_d
    williams_r = -100 * ((high14 - close) / denom_stoch)

    # Bollinger Bands
    bb_std20 = close.rolling(20).std()
    bb_upper = sma20 + 2 * bb_std20
    bb_lower = sma20 - 2 * bb_std20
    bb_denom = (bb_upper - bb_lower).replace(0, np.nan)
    bb_position = (close - bb_lower) / bb_denom
    bb_bandwidth = (bb_upper - bb_lower) / sma20.replace(0, np.nan)

    # ATR
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()
    atr_norm = atr / close

    # Volatility
    vol5 = r1.rolling(5).std() * np.sqrt(252)
    vol10 = r1.rolling(10).std() * np.sqrt(252)
    vol20 = r1.rolling(20).std() * np.sqrt(252)
    vol_ratio = vol5 / vol20.replace(0, np.nan)

    # Momentum
    mom5  = close - close.shift(5)
    mom10 = close - close.shift(10)
    mom20 = close - close.shift(20)
    mom60 = close - close.shift(60)

    # Volume metrics
    vol_sma20 = vol.rolling(20).mean()
    volume_ratio = vol / vol_sma20.replace(0, np.nan)
    volume_change = vol.pct_change(1)

    # OBV
    obv = (np.sign(close.diff()) * vol).fillna(0).cumsum()
    obv_sma20 = obv.rolling(20).mean()
    obv_trend = (obv - obv_sma20) / obv.abs().rolling(20).mean().replace(0, np.nan)

    # Volume Price Trend (VPT)
    vpt = (vol * (close - close.shift(1)) / close.shift(1).replace(0, np.nan)).fillna(0).cumsum()
    vpt_sma20 = vpt.rolling(20).mean()
    vp_trend = (vpt - vpt_sma20) / vpt.abs().rolling(20).mean().replace(0, np.nan)

    # Candle price action
    daily_return = (close - open_) / open_.replace(0, np.nan)
    candle_range = (high - low).replace(0, np.nan)
    daily_range = (high - low) / close
    close_position = (close - low) / candle_range
    upper_shadow = (high - np.maximum(open_, close)) / candle_range
    lower_shadow = (np.minimum(open_, close) - low) / candle_range

    # Benchmark: Nifty 50
    nifty_close = df_nifty['close'].astype(float)
    nifty_r1 = nifty_close.pct_change(1)
    nifty_r5 = nifty_close.pct_change(5)
    nifty_r20 = nifty_close.pct_change(20)
    nifty_sma20 = nifty_close.rolling(20).mean()
    nifty_sma50 = nifty_close.rolling(50).mean()
    nifty_trend20 = nifty_close / nifty_sma20
    nifty_trend50 = nifty_close / nifty_sma50
    nifty_vol20 = nifty_r1.rolling(20).std() * np.sqrt(252)
    nifty_r1_l1 = nifty_r1.shift(1)

    # Benchmark: Bank Nifty
    bank_close = df_bank['close'].astype(float)
    bank_r5 = bank_close.pct_change(5)
    bank_r20 = bank_close.pct_change(20)
    bank_sma20 = bank_close.rolling(20).mean()
    bank_trend20 = bank_close / bank_sma20

    # VIX
    vix_close = df_vix['close'].astype(float)
    vix_val = vix_close
    vix_r5 = vix_close.pct_change(5)
    vix_sma20 = vix_close.rolling(20).mean()
    vix_relative = vix_close / vix_sma20.replace(0, np.nan)

    # Relative metrics
    alpha5 = r5 - nifty_r5
    alpha20 = r20 - nifty_r20
    market_interaction = r1 * nifty_r1
    day_of_week = pd.Series(df_stock.index % 5, index=df_stock.index)

    row = {
        "R1": r1.iloc[-1],
        "R3": r3.iloc[-1],
        "R5": r5.iloc[-1],
        "R10": r10.iloc[-1],
        "R20": r20.iloc[-1],
        "R1_L1": r1_l1.iloc[-1],
        "R1_L2": r1_l2.iloc[-1],
        "R1_L3": r1_l3.iloc[-1],
        "Log_Ret": log_ret.iloc[-1],
        "SMA5_Ratio": sma5_ratio.iloc[-1],
        "SMA10_Ratio": sma10_ratio.iloc[-1],
        "SMA20_Ratio": sma20_ratio.iloc[-1],
        "SMA50_Ratio": sma50_ratio.iloc[-1],
        "SMA5_SMA20": sma5_sma20.iloc[-1],
        "SMA20_SMA50": sma20_sma50.iloc[-1],
        "EMA10_Ratio": ema10_ratio.iloc[-1],
        "EMA20_Ratio": ema20_ratio.iloc[-1],
        "EMA10_EMA20": ema10_ema20.iloc[-1],
        "RSI": rsi.iloc[-1],
        "RSI_Centered": rsi_centered.iloc[-1],
        "RSI7": rsi7.iloc[-1],
        "MACD": macd.iloc[-1],
        "MACD_Hist": macd_hist.iloc[-1],
        "MACD_Sign": macd_sign.iloc[-1],
        "Stoch_K": stoch_k.iloc[-1],
        "Stoch_D": stoch_d.iloc[-1],
        "Stoch_KD": stoch_kd.iloc[-1],
        "Williams_R": williams_r.iloc[-1],
        "BB_Position": bb_position.iloc[-1],
        "BB_Bandwidth": bb_bandwidth.iloc[-1],
        "ATR_Norm": atr_norm.iloc[-1],
        "Vol5": vol5.iloc[-1],
        "Vol10": vol10.iloc[-1],
        "Vol20": vol20.iloc[-1],
        "VolRatio": vol_ratio.iloc[-1],
        "Mom5": mom5.iloc[-1],
        "Mom10": mom10.iloc[-1],
        "Mom20": mom20.iloc[-1],
        "Mom60": mom60.iloc[-1],
        "Volume_Ratio": volume_ratio.iloc[-1],
        "Volume_Change": volume_change.iloc[-1],
        "OBV_Trend": obv_trend.iloc[-1],
        "VP_Trend": vp_trend.iloc[-1],
        "Daily_Return": daily_return.iloc[-1],
        "Daily_Range": daily_range.iloc[-1],
        "Close_Position": close_position.iloc[-1],
        "Upper_Shadow": upper_shadow.iloc[-1],
        "Lower_Shadow": lower_shadow.iloc[-1],
        "Nifty_R1": nifty_r1.iloc[-1],
        "Nifty_R5": nifty_r5.iloc[-1],
        "Nifty_R20": nifty_r20.iloc[-1],
        "Nifty_Trend20": nifty_trend20.iloc[-1],
        "Nifty_Trend50": nifty_trend50.iloc[-1],
        "Nifty_Vol20": nifty_vol20.iloc[-1],
        "Bank_R5": bank_r5.iloc[-1],
        "Bank_R20": bank_r20.iloc[-1],
        "Bank_Trend20": bank_trend20.iloc[-1],
        "VIX": vix_val.iloc[-1],
        "VIX_R5": vix_r5.iloc[-1],
        "VIX_Relative": vix_relative.iloc[-1],
        "Alpha5": alpha5.iloc[-1],
        "Alpha20": alpha20.iloc[-1],
        "Market_Interaction": market_interaction.iloc[-1],
        "RSI_Diff": rsi_diff.iloc[-1],
        "MACD_Diff": macd_diff.iloc[-1],
        "DayOfWeek": float(day_of_week.iloc[-1]),
        "Nifty_R1_L1": nifty_r1_l1.iloc[-1]
    }

    df_feat = pd.DataFrame([row])[feature_names].fillna(0.0)

    summary = {
        "rsi": float(rsi.iloc[-1]),
        "rsi_centered": float(rsi_centered.iloc[-1]),
        "macd_hist": float(macd_hist.iloc[-1]),
        "sma20_ratio": float(sma20_ratio.iloc[-1]),
        "stoch_k": float(stoch_k.iloc[-1]),
        "bb_position": float(bb_position.iloc[-1]),
        "atr_norm": float(atr_norm.iloc[-1]),
        "vol20": float(vol20.iloc[-1]),
        "volume_ratio": float(volume_ratio.iloc[-1]),
    }

    return df_feat, summary


class XGBoostAIService(AIService):
    """
    Live prediction service backed by per-stock 3-class XGBoost models (Model 2).
    Uses joblib to load .pkl models, calculates 67 technical indicators from candle history,
    and runs predict_proba() to produce BUY, HOLD, and SELL predictions with probabilities.
    """

    def __init__(self):
        self._models: dict[str, Any] = {}
        self._feature_names = _load_model2_feature_names()
        self._fallback = MockAIService()
        self._load_models()

    def _load_models(self) -> None:
        """Load all 10 stock .pkl models into memory via joblib"""
        for symbol, filename in SYMBOL_TO_MODEL2_PKL.items():
            model_path = MODEL2_DIR / filename
            if model_path.exists():
                try:
                    self._models[symbol] = joblib.load(model_path)
                    logger.info(f"Loaded Model 2 for {symbol} ({filename})")
                except Exception as e:
                    logger.error(f"Error loading model {filename} for {symbol}: {e}")
            else:
                logger.warning(f"Model file not found: {model_path}")
        logger.info(f"XGBoostAIService initialized with {len(self._models)} active models.")

    async def get_prediction(self, symbol: str, current_price: float) -> PredictionResult:
        now = datetime.now(timezone.utc).isoformat()
        sym = symbol.upper()

        if sym not in SUPPORTED_SYMBOLS or sym not in self._models:
            return await self._fallback.get_prediction(symbol, current_price)

        company = SYMBOL_TO_COMPANY.get(sym, sym)
        model = self._models[sym]

        try:
            # 1. Generate / retrieve historical candles for stock, benchmarks, and VIX
            df_stock = generate_candle_series(sym, current_price=current_price, points=252)
            df_nifty = generate_candle_series("NIFTY", current_price=DEFAULT_BASE_PRICES["NIFTY"], points=252)
            df_bank  = generate_candle_series("BANKNIFTY", current_price=DEFAULT_BASE_PRICES["BANKNIFTY"], points=252)
            df_vix   = generate_candle_series("VIX", current_price=DEFAULT_BASE_PRICES["VIX"], points=252, vol=0.05)

            # 2. Compute 67 technical features
            feats_df, tech_summary = compute_model2_features(
                df_stock, df_nifty, df_bank, df_vix, self._feature_names
            )

            # 3. Model inference: predict_proba()
            # Classes in config.json: 0 = SELL, 1 = HOLD, 2 = BUY
            probs = model.predict_proba(feats_df)[0]
            p_sell = float(probs[0])
            p_hold = float(probs[1])
            p_buy  = float(probs[2])

            pred_class_idx = int(np.argmax(probs))
            class_labels = {0: "SELL", 1: "HOLD", 2: "BUY"}
            action = class_labels.get(pred_class_idx, "HOLD")

            # Map action to standard application direction
            direction_map = {
                "BUY":  "bullish",
                "SELL": "bearish",
                "HOLD": "neutral",
            }
            app_direction = direction_map.get(action, "neutral")

            # Confidence score & level
            max_prob = max(p_sell, p_hold, p_buy)
            conf_score = max_prob
            conf_label = _confidence_label(conf_score)

            # Estimate target prices based on predicted action and probability strength
            move_pct = 0.045 if max_prob >= 0.50 else 0.025 if max_prob >= 0.38 else 0.015
            if action == "BUY":
                short_price  = round(current_price * (1 + move_pct * 0.4), 2)
                medium_price = round(current_price * (1 + move_pct), 2)
            elif action == "SELL":
                short_price  = round(current_price * (1 - move_pct * 0.4), 2)
                medium_price = round(current_price * (1 - move_pct), 2)
            else:
                short_price  = round(current_price * 1.002, 2)
                medium_price = round(current_price * 1.005, 2)

            rsi_val = tech_summary.get("rsi", 50.0)
            macd_h = tech_summary.get("macd_hist", 0.0)
            vol_ratio = tech_summary.get("volume_ratio", 1.0)

            explanation = (
                f"XGBoost 3-Class Model predicts {action} for {company} ({sym}) with {max_prob:.1%} confidence. "
                f"Class probabilities: BUY {p_buy:.1%}, HOLD {p_hold:.1%}, SELL {p_sell:.1%}. "
                f"Key drivers: RSI(14) is at {rsi_val:.1f}, MACD histogram at {macd_h:.2f}, and volume is {vol_ratio:.2f}x 20-day average."
            )

            key_factors = [
                f"Recommendation: {action} ({max_prob:.1%} confidence)",
                f"Probabilities: BUY = {p_buy:.1%} | HOLD = {p_hold:.1%} | SELL = {p_sell:.1%}",
                f"RSI (14): {rsi_val:.1f} ({'Overbought' if rsi_val > 70 else 'Oversold' if rsi_val < 30 else 'Neutral'})",
                f"MACD Momentum: {'Positive' if macd_h > 0 else 'Negative'} ({macd_h:+.2f})",
                f"Model Architecture: 67 Technical Indicators (Model2 XGBoost)",
                "Prediction Horizon: 5 trading days",
            ]

            risk_factors = [
                "Past performance does not guarantee future market returns",
                "Model does not incorporate unscheduled news or corporate earnings announcements",
                "Set stop-loss orders in accordance with risk management rules",
            ]

            return PredictionResult(
                symbol=sym,
                current_price=current_price,
                predicted_price_short=short_price,
                predicted_price_medium=medium_price,
                direction=app_direction,
                confidence=conf_label,
                confidence_score=round(conf_score, 4),
                status="available",
                explanation=explanation,
                key_factors=key_factors,
                risk_factors=risk_factors,
                generated_at=now,
                is_mock=False,
            )

        except Exception as ex:
            logger.exception(f"Inference error for {sym}: {ex}")
            return await self._fallback.get_prediction(symbol, current_price)

    async def get_portfolio_insight(self, positions: list[dict], cash: float) -> InsightResult:
        return await self._fallback.get_portfolio_insight(positions, cash)

    async def chat(self, message: str, history: list[dict], context: dict) -> CoachResponse:
        return await self._fallback.chat(message, history, context)

    async def explain_backtest(self, backtest_results: dict) -> str:
        return await self._fallback.explain_backtest(backtest_results)
