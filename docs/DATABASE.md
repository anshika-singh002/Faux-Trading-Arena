# Database Schema

PostgreSQL 16. All migrations managed by Alembic.

## Tables

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| username | VARCHAR(50) UNIQUE | |
| display_name | VARCHAR(100) | |
| hashed_password | VARCHAR(255) | bcrypt |
| virtual_balance | FLOAT | Server-managed — never set from client |
| level | INT | Gamification |
| xp | INT | Gamification |
| is_active | BOOL | |
| is_verified | BOOL | |
| is_admin | BOOL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| last_login | TIMESTAMPTZ | |

### `assets`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| symbol | VARCHAR(20) UNIQUE | e.g. "AAPL" |
| name | VARCHAR(200) | |
| asset_type | VARCHAR(20) | stock/etf/crypto/index |
| sector | VARCHAR(100) | |
| exchange | VARCHAR(50) | |
| currency | VARCHAR(10) | |
| is_active | BOOL | |

### `market_prices`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| symbol | VARCHAR(20) INDEX | |
| price | FLOAT | |
| open / high / low | FLOAT | |
| previous_close | FLOAT | |
| volume | FLOAT | |
| timestamp | TIMESTAMPTZ INDEX | |

### `orders`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| symbol | VARCHAR(20) | |
| side | VARCHAR(10) | buy/sell — CHECK constraint |
| order_type | VARCHAR(20) | market/limit/stop — CHECK constraint |
| quantity | FLOAT | CHECK > 0 |
| filled_quantity | FLOAT | |
| price | FLOAT NULL | limit price |
| avg_fill_price | FLOAT NULL | actual fill |
| status | VARCHAR(20) | pending/open/filled/cancelled — CHECK |
| estimated_total / fees | FLOAT | |
| created_at / updated_at / filled_at | TIMESTAMPTZ | |

### `transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| order_id | FK → orders | |
| user_id | FK → users | |
| symbol | VARCHAR(20) | |
| side | VARCHAR(10) | |
| quantity / price / fees / total | FLOAT | |
| realized_pnl | FLOAT NULL | Only on sells |
| created_at | TIMESTAMPTZ | |

### `positions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| symbol | VARCHAR(20) | |
| quantity | FLOAT | |
| avg_cost | FLOAT | Weighted average |
| cost_basis | FLOAT | avg_cost × quantity |
| realized_pnl | FLOAT | Accumulated |
| UNIQUE (user_id, symbol) | | One position per user per asset |

### `strategies`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| name | VARCHAR(200) | |
| symbol | VARCHAR(20) NULL | Single-asset or portfolio |
| rules | JSON | Array of StrategyRule objects |
| is_active / is_public | BOOL | |

### `backtests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| strategy_id | FK → strategies | |
| symbol / start_date / end_date | VARCHAR | |
| starting_capital / fee_percent / slippage_percent | FLOAT | |
| status | VARCHAR(20) | pending/running/completed/failed |
| results | JSON | Full result object |
| completed_at | TIMESTAMPTZ NULL | |

### `ai_insights`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK NULL | NULL = global insight |
| insight_type | VARCHAR(50) | |
| symbol | VARCHAR(20) NULL | |
| confidence / confidence_score | VARCHAR/FLOAT | |
| is_mock | BOOL | Always true until real model integrated |
| generated_at / expires_at | TIMESTAMPTZ | |

### `ai_conversations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| title | VARCHAR(300) | |
| messages | JSON | Array of {role, content, timestamp} |

### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK → users | |
| notification_type | VARCHAR(50) | order_filled/price_alert/etc |
| title / message | VARCHAR/TEXT | |
| is_read | BOOL | |

### `audit_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | FK NULL | |
| action | VARCHAR(100) | e.g. "order.placed" |
| entity_type / entity_id | VARCHAR | |
| details | JSON | |
| ip_address | VARCHAR(45) | |
| created_at | TIMESTAMPTZ | Immutable |

## Key Constraints

- `orders.quantity CHECK > 0` — prevents zero/negative quantity injection
- `orders.side CHECK IN ('buy','sell')` — no invalid side injection
- `positions UNIQUE(user_id, symbol)` — one position per asset per user
- `users.email UNIQUE` — no duplicate accounts
- All `user_id` foreign keys — users can only access their own data
