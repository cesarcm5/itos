# CLAUDE.md — ITOS

## Project
Stock data app for first-time investors (RUUT technical test).
Specs live in `prompts/specs/`. Read the relevant spec before implementing anything.

## Stack
- backend/: Express 5, TypeScript, Zod, Drizzle, Supabase Postgres (Railway)
- frontend/: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Recharts, Motion, GSAP (landing only) (Vercel)

## Rules
- Implement only what the prompt asks (e.g. "BE-3"); don't add features outside the spec
- Validate every input with Zod; never trust request data
- Only `services/twelveData.ts` calls Twelve Data; always go through the cache
- Never commit secrets; use env vars and update `.env.example`
- Business logic (recommendations, simulator) as pure functions with unit tests
- TypeScript strict; no `any`
- Error responses follow the format in `02-backend.md`
- For every feature, ref, bug. Create a new branch pulling from develop
- Name the branch following the next structure Feat(type of change):New login method (bit description)

## Commands
- backend: `npm run dev`, `npm test`, `npm run db:migrate`
- frontend: `npm run dev`, `npm run build`

## When unsure
Ask before changing the spec or adding a dependency.

## Project structure

```
itos/
├── CLAUDE.md                     # this file: rules for AI assistants
├── README.md                     # how to run, architecture, decisions, time spent
├── .gitignore
│
├── prompts/                      # required by the test
│   ├── README.md                 # tools, models, how I worked, where the AI got it wrong
│   ├── system/                   # copy of CLAUDE.md and other rules files
│   ├── specs/
│   │   ├── 01-product.md
│   │   ├── 02-backend.md
│   │   └── 03-frontend.md
│   └── sessions/                 # prompts sent, in order (01-setup.md, 02-auth.md, ...)
│
├── backend/                      # Express 5 API → Railway
│   ├── src/
│   │   ├── index.ts              # starts server + scheduler
│   │   ├── app.ts                # express app, middleware, routes (exported for tests)
│   │   ├── config.ts             # env vars validated with Zod
│   │   ├── scheduler.ts          # node-cron for price alerts
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle tables
│   │   │   └── client.ts         # Supabase Postgres connection
│   │   ├── middleware/
│   │   │   ├── auth.ts           # verifies JWT, sets req.user
│   │   │   ├── validate.ts       # Zod validation (body, query, params)
│   │   │   └── error.ts          # maps errors to the error format
│   │   ├── routes/               # one file per resource
│   │   │   ├── auth.ts
│   │   │   ├── profile.ts
│   │   │   ├── recommendations.ts
│   │   │   ├── stocks.ts
│   │   │   ├── simulator.ts
│   │   │   ├── watchlist.ts
│   │   │   ├── alerts.ts
│   │   │   └── internal.ts       # /internal/check-alerts
│   │   ├── services/
│   │   │   ├── twelveData.ts     # ONLY place that calls Twelve Data
│   │   │   ├── marketCache.ts    # cache, stale fallback, request dedupe
│   │   │   ├── rateLimiter.ts    # upstream credit budget (7/min, 750/day)
│   │   │   ├── recommendation.ts # pure functions
│   │   │   ├── simulator.ts      # pure functions
│   │   │   ├── alerts.ts         # checkAlerts()
│   │   │   └── email.ts          # Resend
│   │   ├── schemas/              # Zod schemas for requests
│   │   └── lib/
│   │       ├── errors.ts         # AppError + error codes
│   │       └── assets.ts         # curated assets by horizon/risk
│   ├── drizzle/                  # migrations
│   ├── tests/
│   │   ├── unit/                 # recommendation, simulator, alert conditions
│   │   └── integration/          # Supertest: auth, protected routes, ownership
│   ├── .env.example
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                     # Next.js App Router → Vercel
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                  # landing (only route that uses GSAP)
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx
    │   │   │   └── register/page.tsx
    │   │   ├── (app)/                    # protected routes, shared layout
    │   │   │   ├── layout.tsx            # header + search + LazyMotion provider
    │   │   │   ├── onboarding/page.tsx
    │   │   │   ├── dashboard/page.tsx
    │   │   │   ├── stock/[symbol]/page.tsx
    │   │   │   ├── simulator/page.tsx
    │   │   │   ├── alerts/page.tsx
    │   │   │   └── profile/page.tsx
    │   │   └── api/
    │   │       ├── auth/[action]/route.ts  # login/register/logout → httpOnly cookie
    │   │       └── proxy/[...path]/route.ts # adds Bearer token, forwards to API
    │   ├── components/
    │   │   ├── ui/               # shadcn/ui components
    │   │   ├── landing/          # GSAP sections
    │   │   ├── dashboard/        # RecommendationCard, EmergencyFundBanner, AssetSuggestionList
    │   │   ├── stock/            # QuoteCard, PriceChart, SearchBar
    │   │   ├── simulator/        # SimulatorForm, SimulatorResult
    │   │   ├── alerts/           # AlertForm, AlertList
    │   │   └── shared/           # Disclaimer, StaleBadge, EmptyState, ErrorState
    │   ├── hooks/                # TanStack Query hooks (useQuote, useSimulator, ...)
    │   ├── lib/
    │   │   ├── api.ts            # fetch wrapper for /api/proxy
    │   │   ├── format.ts         # currency/percent formatting (es-MX)
    │   │   └── schemas.ts        # Zod schemas for forms
    │   ├── types/                # API response types
    │   └── proxy.ts              # (Next 16 middleware) redirects to /login without session cookie
    ├── .env.example
    ├── next.config.ts
    ├── package.json
    └── tsconfig.json
```

### Conventions
- Each app is independent: own `package.json`, run commands inside `backend/` or `frontend/`
- Routes stay thin: validate → call a service → respond. Logic lives in `services/`
- New Twelve Data calls go in `twelveData.ts` and through `marketCache`; never call the API from routes
- Pure business logic (`recommendation.ts`, `simulator.ts`) has no DB or HTTP code, so it's easy to test
- Frontend never calls the Railway API directly; always through `/api/proxy`
- GSAP is imported only in `app/page.tsx` and `components/landing/`