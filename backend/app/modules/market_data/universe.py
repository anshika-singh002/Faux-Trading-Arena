"""The tradable stock universe: the Nifty 50 plus Aditya Birla Capital.

Tickers were checked against Yahoo Finance. Nifty membership changes over time, so
this is a snapshot; edit UNIVERSE to add or drop a stock and everything else
(quotes, risk, search, trading, backtests) follows.

AI_SYMBOLS are the only stocks the XGBoost models were trained on. Every other
stock gets live prices, risk alerts, trading and backtesting, but no AI signal.
"""

from __future__ import annotations

# symbol -> (display name, sector, Yahoo Finance ticker)
UNIVERSE: dict[str, tuple[str, str, str]] = {
    # Financial
    "HDFCBANK":   ("HDFC Bank",                   "Financial", "HDFCBANK.NS"),
    "ICICIBANK":  ("ICICI Bank",                  "Financial", "ICICIBANK.NS"),
    "SBIN":       ("State Bank of India",         "Financial", "SBIN.NS"),
    "KOTAKBANK":  ("Kotak Mahindra Bank",         "Financial", "KOTAKBANK.NS"),
    "AXISBANK":   ("Axis Bank",                   "Financial", "AXISBANK.NS"),
    "INDUSINDBK": ("IndusInd Bank",               "Financial", "INDUSINDBK.NS"),
    "BAJFINANCE": ("Bajaj Finance",               "Financial", "BAJFINANCE.NS"),
    "BAJAJFINSV": ("Bajaj Finserv",               "Financial", "BAJAJFINSV.NS"),
    "SHRIRAMFIN": ("Shriram Finance",             "Financial", "SHRIRAMFIN.NS"),
    "JIOFIN":     ("Jio Financial Services",      "Financial", "JIOFIN.NS"),
    "HDFCLIFE":   ("HDFC Life Insurance",         "Financial", "HDFCLIFE.NS"),
    "SBILIFE":    ("SBI Life Insurance",          "Financial", "SBILIFE.NS"),
    "ABCAPITAL":  ("Aditya Birla Capital",        "Financial", "ABCAPITAL.NS"),
    # Technology
    "TCS":        ("Tata Consultancy Services",   "Technology", "TCS.NS"),
    "INFY":       ("Infosys Ltd.",                "Technology", "INFY.NS"),
    "HCLTECH":    ("HCL Technologies",            "Technology", "HCLTECH.NS"),
    "WIPRO":      ("Wipro",                       "Technology", "WIPRO.NS"),
    "TECHM":      ("Tech Mahindra",               "Technology", "TECHM.NS"),
    # Energy
    "RELIANCE":   ("Reliance Industries",         "Energy", "RELIANCE.NS"),
    "ONGC":       ("Oil & Natural Gas Corp",      "Energy", "ONGC.NS"),
    "COALINDIA":  ("Coal India",                  "Energy", "COALINDIA.NS"),
    # Utilities
    "NTPC":       ("NTPC",                        "Utilities", "NTPC.NS"),
    "POWERGRID":  ("Power Grid Corp",             "Utilities", "POWERGRID.NS"),
    # Industrials
    "LT":         ("Larsen & Toubro",             "Industrials", "LT.NS"),
    "ADANIENT":   ("Adani Enterprises",           "Industrials", "ADANIENT.NS"),
    "ADANIPORTS": ("Adani Ports & SEZ",           "Industrials", "ADANIPORTS.NS"),
    "BEL":        ("Bharat Electronics",          "Industrials", "BEL.NS"),
    # Consumer Staples
    "ITC":        ("ITC Ltd.",                    "Consumer Staples", "ITC.NS"),
    "HINDUNILVR": ("Hindustan Unilever",          "Consumer Staples", "HINDUNILVR.NS"),
    "NESTLEIND":  ("Nestle India",                "Consumer Staples", "NESTLEIND.NS"),
    "TATACONSUM": ("Tata Consumer Products",      "Consumer Staples", "TATACONSUM.NS"),
    # Consumer Discretionary
    "TITAN":      ("Titan Company",               "Consumer Discretionary", "TITAN.NS"),
    "TRENT":      ("Trent",                       "Consumer Discretionary", "TRENT.NS"),
    "ASIANPAINT": ("Asian Paints",                "Consumer Discretionary", "ASIANPAINT.NS"),
    "ETERNAL":    ("Eternal (Zomato)",            "Consumer Discretionary", "ETERNAL.NS"),
    # Automobile
    "MARUTI":     ("Maruti Suzuki",               "Automobile", "MARUTI.NS"),
    "MM":         ("Mahindra & Mahindra",         "Automobile", "M&M.NS"),
    "TMPV":       ("Tata Motors Passenger Vehicles", "Automobile", "TMPV.NS"),
    "BAJAJ-AUTO": ("Bajaj Auto",                  "Automobile", "BAJAJ-AUTO.NS"),
    "EICHERMOT":  ("Eicher Motors",               "Automobile", "EICHERMOT.NS"),
    "HEROMOTOCO": ("Hero MotoCorp",               "Automobile", "HEROMOTOCO.NS"),
    # Healthcare
    "SUNPHARMA":  ("Sun Pharmaceutical",          "Healthcare", "SUNPHARMA.NS"),
    "CIPLA":      ("Cipla",                       "Healthcare", "CIPLA.NS"),
    "DRREDDY":    ("Dr. Reddy's Laboratories",    "Healthcare", "DRREDDY.NS"),
    "APOLLOHOSP": ("Apollo Hospitals",            "Healthcare", "APOLLOHOSP.NS"),
    # Materials
    "TATASTEEL":  ("Tata Steel",                  "Materials", "TATASTEEL.NS"),
    "JSWSTEEL":   ("JSW Steel",                   "Materials", "JSWSTEEL.NS"),
    "HINDALCO":   ("Hindalco Industries",         "Materials", "HINDALCO.NS"),
    "ULTRACEMCO": ("UltraTech Cement",            "Materials", "ULTRACEMCO.NS"),
    "GRASIM":     ("Grasim Industries",           "Materials", "GRASIM.NS"),
    # Communication
    "BHARTIARTL": ("Bharti Airtel",               "Communication", "BHARTIARTL.NS"),
}

# The only stocks the XGBoost models were trained on
AI_SYMBOLS: frozenset[str] = frozenset({
    "SBIN", "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS",
    "ITC", "LT", "BHARTIARTL", "ABCAPITAL",
})

STOCK_TICKERS: dict[str, str] = {s: t for s, (_, _, t) in UNIVERSE.items()}
STOCK_NAMES: dict[str, str] = {s: n for s, (n, _, _) in UNIVERSE.items()}
STOCK_SECTORS: dict[str, str] = {s: sec for s, (_, sec, _) in UNIVERSE.items()}

assert AI_SYMBOLS <= set(UNIVERSE), "every AI stock must be in the universe"
