# Security Model

## Principles

1. **The frontend is never trusted.** All financial calculations happen server-side.
2. **Defense in depth.** Multiple layers of validation for every trade.
3. **Least privilege.** Users can only read/write their own data.
4. **Audit everything.** All sensitive operations are logged.

---

## Authentication

- JWT (HS256) with configurable expiry (default: 7 days)
- Passwords hashed with bcrypt (cost factor 12)
- Tokens verified on every protected request via `get_current_user` dependency
- Suspended accounts (`is_active=False`) receive 403 immediately

**Future enhancements:**
- Redis-based token blacklist for immediate revocation on logout
- Refresh token rotation
- Email verification flow

---

## Trade Security

Every order goes through `TradingEngine.place_order()` which enforces:

```python
# All of these run server-side — client cannot bypass
assert quantity > 0
assert balance >= cost + fee      # for buys
assert held_shares >= quantity    # for sells
assert side in ("buy", "sell")
assert order_type in ("market", "limit", "stop", "stop_limit")
```

The virtual `balance` and `positions` are **only modified server-side** — never by client input.

---

## Authorization

Every data-access query includes a `user_id` filter:

```python
select(Order).where(
    Order.id == order_id,
    Order.user_id == current_user.id  # ← always enforced
)
```

Users cannot access other users' portfolios, orders, or strategies.

---

## Database Constraints

Constraints are defined at the DB level (not just application level):

```sql
CHECK (quantity > 0)
CHECK (side IN ('buy', 'sell'))
CHECK (status IN ('pending', 'open', 'filled', 'cancelled', 'rejected', 'expired'))
UNIQUE (user_id, symbol)  -- positions table
```

---

## API Security

- CORS restricted to known origins (configured via `CORS_ORIGINS`)
- Request body validated via Pydantic before any business logic runs
- Parameterized queries via SQLAlchemy ORM (no raw SQL string interpolation)
- No sensitive values in response bodies (passwords, tokens never echoed)

---

## Known Simulation Limitations

Since this is a **virtual trading simulator**:

- Market prices are simulated — no real financial exposure
- There is no payment processing
- No real PII requirements (educational use)

These limitations would need to be addressed before handling real money.

---

## What's NOT Implemented (Future)

- Rate limiting (add via slowapi)
- IP-based blocking
- 2FA / MFA
- Refresh token rotation
- Email verification
- Admin audit dashboard
