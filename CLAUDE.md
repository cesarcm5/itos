# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ITOS: a stock-data app for first-time investors in Mexico (RUUT technical test). It tells users how much they can invest monthly, where to put it by time horizon, and what regular investing would have produced, using real market data from Twelve Data.

**Current state:** spec-only. `backend/` and `frontend/` don't exist yet. The source of truth lives in `prompts/spec/`:
- `01-product.md`: user flows, business rules, MVP scope, out-of-scope list
- `02-backend.md`: data model, endpoints, caching TTLs, error codes, alert logic
- `03-frontend.md`: routes, auth flow, components, data-view states, animation rules

Read the relevant spec before implementing anything. Work is scoped by prompt IDs (e.g. "BE-3"). Implement only what the prompt asks, and add nothing outside the spec. Ask before changing a spec or adding a dependency.

`prompts/` is a required deliverable of the test. `prompts/system/` holds a copy of this file and other rules files, and `prompts/sessions/` holds the prompts that were sent, in order (`01-setup.md`, ...). Keep the copy in `prompts/system/CLAUDE.md` in sync when this file changes.

## Stack

- `backend/`: Express 5, TypeScript (strict), Zod, Drizzle, Supabase Postgres (Postgres only, no Supabase Auth), Resend, node-cron. Deployed on Railway.
- `frontend/`: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Recharts, TanStack Query, React Hook Form + Zod, Motion, GSAP (landing only). Deployed on Vercel.

Each app is independent, with its own `package.json`. Run commands inside `backend/` or `frontend/`:
- backend: `npm run dev`, `npm test`, `npm run db:migrate`
- frontend: `npm run dev`, `npm run build`

## Architecture

### Request path
Browser → Next.js `/api/proxy/[...path]` (reads the httpOnly JWT cookie, adds `Authorization: Bearer`) → Express API on Railway → `marketCache` → `twelveData.ts` → Twelve Data.

- The frontend never calls the Railway API, Twelve Data or Supabase directly. Everything goes through `/api/proxy`. `API_URL` is a server-only env var.
- Login and register go through `/api/auth/[action]`, which stores the JWT in an httpOnly, Secure, SameSite=Lax cookie. Browser JS never reads the token. Any `401` clears the cookie and redirects to `/login`. `proxy.ts` (Next 16's renamed middleware, Node.js runtime) guards the `(app)` route group. Not to be confused with `/api/proxy/[...path]`, which forwards requests to the API.
- The API itself uses Bearer tokens only, with no cookies, because Vercel and Railway are on different domains.

### Backend layering
- Routes stay thin: Zod-validate (`middleware/validate.ts`) → call a service → respond. All logic lives in `services/`.
- `services/twelveData.ts` is the **only** module that calls Twelve Data, and every call goes through `services/marketCache.ts`. Never call upstream from a route.
- `recommendation.ts` and `simulator.ts` are pure functions with no DB or HTTP code, and each has unit tests.
- Errors are thrown as `AppError` (`lib/errors.ts`) and mapped by `middleware/error.ts` to `{ "error": { "code", "message", "retryAfter?" } }`. The codes and HTTP statuses are listed in `02-backend.md`.
- `app.ts` exports the Express app for Supertest. `index.ts` starts the server and the scheduler.

### Upstream budget (the hardest constraint)
The Twelve Data free plan allows 8 credits/min and 800/day. The API caps itself at **7/min and 750/day** (`rateLimiter.ts`, persisted in `api_usage`), leaving about 250/day for alerts. Each user can also spend at most **100 credits/day** (`user_api_usage`), charged through the request context set by `requireAuth`. Cache hits are free and alerts aren't charged to anyone.
- The cache lives in the `market_cache` table (jsonb, survives restarts). TTLs: quote 60 s, daily history 12 h, monthly history 24 h, search 7 d, USD/MXN 24 h.
- Identical in-flight requests share one upstream call.
- When the budget or the user's quota is exhausted, or upstream errors, serve the stale cache with `stale: true`. With no cache, return `503 RATE_LIMITED`.
- Twelve Data can return HTTP 200 with an error in the body, so always check `status`.

### Price alerts
- node-cron runs every 15 min, Mon–Fri, during US market hours. Set `ALERTS_CRON_ENABLED=false` to disable it.
- `POST /internal/check-alerts` (`x-cron-secret` header) runs the same `checkAlerts()` on demand.
- Alerts are grouped by unique symbol, with at most 7 symbols/min, and reuse the quote cache.
- Each alert fires once: `UPDATE … WHERE status = 'active' RETURNING`, and the email goes out only if a row changed. Users can have at most 5 active alerts (`ALERT_LIMIT` 422).

### Business rules
- `surplus = income − expenses` and `emergencyTarget = expenses × 6`.
- With no emergency fund, `suggestedMonthly = 0`. Otherwise it is surplus × 30% / 50% / 70% for low / medium / high risk.
- Asset suggestions come from a hardcoded table keyed by (horizon, risk) in `lib/assets.ts`, which costs zero API credits.
- Simulator: one buy at each monthly close (`shares += amount / close`), fractional shares, price return only (no dividends). Always return and show the "past performance…not financial advice" disclaimer.

## Rules

- Validate every input with Zod. TypeScript strict, no `any`.
- Use env vars for config (validated in `config.ts`) and update `.env.example` whenever a var is added.
- Frontend: import GSAP only in `app/page.tsx` and `components/landing/`, through `useGSAP`. Use `LazyMotion` + `m` for Motion. Respect `prefers-reduced-motion`. Every data view needs loading (skeletons), empty, error + retry, and stale states. Format currency with `Intl.NumberFormat('es-MX')`.
- Brand: follow `docs/brand-guidelines.md` for all UI, copy and generated assets. Use the tokens in `frontend/src/app/globals.css` (`ocean-*`, `violet-*`, `primary`, `gain`/`loss`/`warning`, `chart-1`…`chart-5`) instead of hardcoded hex values. Feature icons come from `public/itos_icons/`, utility glyphs from lucide-react. When a token changes, update `globals.css` and `docs/brand-guidelines.md` together.
- Git: create a new branch from `develop` for every feature, refactor or bug fix. PRs target `develop`.
