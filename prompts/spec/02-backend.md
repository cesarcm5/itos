# 02 · Backend Spec — ITOS API

## Context
Express 5 API between the Next.js frontend and Twelve Data. Owns JWT auth,
user data, market-data caching, recommendations, the simulator, and price
alerts by email. The frontend never calls Twelve Data directly.

## Stack & constraints
- **Express 5 + TypeScript + Zod**, Drizzle ORM [confirm]
- **Railway** (API, always on, Serverless disabled) · **Vercel** (frontend) · **Supabase** (Postgres only, no Supabase Auth)
- **Resend** for emails (free: 100/day) · **node-cron** for alerts
- **Twelve Data free plan:** 8 credits/min, 800/day, US only. The API uses
  max **7/min and 750/day** (~250/day reserved for alerts)

## Data model
| Table | Fields | Notes |
|---|---|---|
| users | id, email, password_hash, created_at | email unique, lowercase |
| refresh_tokens | id, user_id, family_id, token_hash, expires_at, revoked_at, created_at | SHA-256 of the opaque token; one family per login |
| profiles | user_id, monthly_income_mxn, monthly_expenses_mxn, has_emergency_fund, horizon, risk | horizon: short/medium/long · risk: low/medium/high |
| watchlist | user_id, symbol, created_at | unique(user_id, symbol) |
| alerts | id, user_id, symbol, condition, target_price, status, triggered_price, triggered_at | condition: above/below · status: active/triggered/cancelled · max 5 active |
| market_cache | key, payload (jsonb), expires_at | survives restarts |
| api_usage | date, credits_used | daily upstream budget |

RLS enabled on all tables with no policies (blocks Supabase's public API);
the API connects with `DATABASE_URL`.

## Auth
- `POST /auth/register`, `POST /auth/login` → `{ token, refreshToken, user }`; `GET /auth/me`
- bcrypt (cost 10); access JWT HS256 `{ sub, email }`, expires in 15 min
- `Authorization: Bearer <token>` (no cookies: Vercel and Railway are different domains)
- Wrong email or password → the same `401`; per IP: `/auth/register` limited to 5 req / hour, `/auth/login` to 6 req / min

**Refresh tokens** (rotating, DB-backed)
- Opaque 32-byte random token (base64url), stored as SHA-256 in `refresh_tokens`, valid 30 days
- Each login/register starts a new family; `POST /auth/refresh { refreshToken }` revokes the token and issues a new one in the same family → `{ token, refreshToken, user }`
- Rotation is atomic (`UPDATE … WHERE revoked_at IS NULL RETURNING` + insert in one transaction)
- Reuse of a rotated token within 30 s (parallel requests) → `{ token, user }` with no new refresh token. Reuse after that → the whole family is revoked, `401`
- Unknown, expired or revoked token → `401 UNAUTHORIZED`
- `POST /auth/logout { refreshToken }` revokes the family → `204` (always)
- Per IP: `/auth/refresh` and `/auth/logout` limited to 30 req / min

## Endpoints
| Method | Path | Auth | Request | Response | Upstream cost |
|---|---|---|---|---|---|
| GET / PUT | /profile | yes | Profile | Profile | 0 |
| GET | /recommendations | yes | — | how much + where + tips | 0 (FX cached) |
| GET | /stocks/search?q= | yes | q: 1–20 chars | Symbol[] (max 10) | 1 |
| GET | /stocks/:symbol/quote | yes | — | Quote + `stale` | 1 |
| GET | /stocks/:symbol/history?range= | yes | 1M, 6M, 1Y, 5Y | `{ date, close }[]` + `stale` | 1 |
| POST | /simulator | yes | symbol, monthlyAmountUsd, years (1/3/5) | contributed, value, gain, series | 0–1 |
| GET / POST / DELETE | /watchlist | yes | symbol | Watchlist | 0 |
| GET / POST / PATCH / DELETE | /alerts | yes | symbol, condition, targetPrice / status | Alert | 0 |
| POST | /internal/check-alerts | `x-cron-secret` | — | checked, triggered, skipped | 1 per symbol |
| GET | /health | no | — | `{ status, db }` | 0 |

## Caching rules
| Data | TTL | Storage |
|---|---|---|
| Quote | 60 s | market_cache |
| Daily history (1M, 6M) | 12 h | market_cache |
| Monthly history (1Y, 5Y) | 24 h | market_cache |
| Search | 7 d | market_cache |
| USD/MXN | 24 h | market_cache |

- Identical in-flight requests share one upstream call
- Budget exhausted or upstream error → stale cache with `stale: true`; no cache → `503 RATE_LIMITED`
- Twelve Data can return HTTP 200 with an error in the body → always check `status`

## Business logic
**Recommendations** (pure functions, unit-tested)
- `surplus = income − expenses`; `emergencyTarget = expenses × 6`
- No emergency fund → `suggestedMonthly = 0`, surplus goes to the fund (tip: fixed income)
- Otherwise `suggestedMonthly = surplus × 30% / 50% / 70%` by risk
- Assets: curated table by (horizon, risk), hardcoded

**Simulator** (pure function, unit-tested)
- Monthly closes; each month `shares += amount / close`
- Returns contributed, value, gain, monthly series; price return only (no dividends)
- Always returns the disclaimer: past performance does not guarantee future results

**Price alerts**
- node-cron every 15 min, Mon–Fri, only during US market hours; disabled with `ALERTS_CRON_ENABLED=false`
- Groups alerts by symbol; checks max 7 symbols/min; reuses quote cache
- Fires once: `UPDATE … WHERE status = 'active' RETURNING` → send email only if a row changed
- `/internal/check-alerts` runs the same check manually (demo)

## Error format
`{ "error": { "code": "RATE_LIMITED", "message": "...", "retryAfter": 30 } }`
Codes: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` / `INVALID_CREDENTIALS` 401 ·
`NOT_FOUND` 404 · `EMAIL_TAKEN` 409 · `ALERT_LIMIT` 422 · `TOO_MANY_REQUESTS` 429 ·
`UPSTREAM_ERROR` 502 · `RATE_LIMITED` 503 · `INTERNAL_ERROR` 500


## Open questions
- Free plan: 5 years of monthly history? USD/MXN available?
- Resend: verified domain needed to email any address?
- Railway trial ends after 30 days: upgrade to Hobby for the interview?
