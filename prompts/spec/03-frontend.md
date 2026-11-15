# 03 · Frontend Spec — ITOS Web

## Context
Next.js app on Vercel. Talks only to the Express API on Railway, never to
Twelve Data or Supabase directly. Mobile-first; UI in Spanish [confirm].

## Stack & constraints
- **Next.js (App Router) + TypeScript**, deployed on **Vercel**
- **Tailwind CSS + shadcn/ui** (UI), **Recharts** (charts)
- **Motion** (`motion/react`) for in-app animation · **GSAP** (+ ScrollTrigger) for the landing only
- **TanStack Query** (client data fetching and caching)
- **React Hook Form + Zod** (forms)
- `API_URL` = Railway URL (server-only env var)

## Auth handling
- Login/register go through Next.js route handlers (`/api/auth/*`), which call
  the API and store the JWT in an **httpOnly, Secure, SameSite=Lax cookie**
  on the Vercel domain. Browser JavaScript never reads the token.
- Client requests go to `/api/proxy/*`, which reads the cookie and calls the
  API with `Authorization: Bearer <token>`.
- `middleware.ts` redirects to `/login` when there's no cookie on protected routes.
- Any `401` from the API → clear cookie, redirect to `/login`. Logout = delete cookie.

## Pages / routes
| Route | Purpose | Auth | Data used |
|---|---|---|---|
| `/` | Landing: value prop, 3 steps, CTA | no | — |
| `/login`, `/register` | Auth | no | /auth/* |
| `/onboarding` | Financial profile form | yes | PUT /profile |
| `/dashboard` | How much + where to invest, emergency-fund tip, watchlist | yes | /recommendations, /watchlist |
| `/stock/[symbol]` | Quote, price chart, add to watchlist, create alert, "Simulate" | yes | /quote, /history |
| `/simulator` | Monthly-contribution simulator (`?symbol=` pre-fills) | yes | POST /simulator |
| `/alerts` | List, create, pause, delete alerts | yes | /alerts |
| `/profile` | Edit financial profile | yes | /profile |

After login: no profile → `/onboarding`; otherwise `/dashboard`.

## Key components
| Component | Notes |
|---|---|
| `SearchBar` | Header; 300 ms debounce, min 2 chars, keyboard navigation |
| `RecommendationCard` | Suggested monthly amount + "How we calculated this" |
| `EmergencyFundBanner` | No emergency fund: target amount + fixed-income tip |
| `AssetSuggestionList` | Assets by horizon with "Why this?" |
| `QuoteCard` | Price, change %, "updated X min ago" |
| `PriceChart` | Line chart, range tabs 1M / 6M / 1Y / 5Y |
| `SimulatorForm` + `SimulatorResult` | Value vs contributed chart, animated total, summary sentence |
| `AlertForm` | Above/below + target; shows current price as reference |
| `Disclaimer` | Dashboard, simulator and stock pages |
| `StaleBadge` | When the API returns `stale: true` |

## States for every data view
- **Loading:** skeletons, not spinners
- **Empty:** message + action ("No alerts yet. Create one from any stock page.")
- **Error:** friendly message + retry
- **Stale / rate-limited:** cached data with "Data from X min ago"; no data → "Market data limit reached, try again in a minute"

## Motion & animation
| Where | Library | Animation |
|---|---|---|
| Simulator result | Motion | Final value count-up; chart line draws left to right (~600 ms) |
| Dashboard | Motion | Recommendation cards enter staggered (< 400 ms total) |
| Alerts / watchlist | Motion | List enter/exit with layout animation |
| Page transitions | Motion | Short fade + slide (150–250 ms) |
| Buttons / cards | Motion | Subtle press and hover feedback |
| Landing (`/`) | GSAP + ScrollTrigger | Hero text entrance; scroll-triggered sections for the 3 steps (profile → tips → simulate) |

**Rules**
- Motion via `LazyMotion` + `m` to keep the bundle small
- GSAP imported **only in the landing route**, used through `useGSAP` (automatic cleanup on unmount)
- Native scroll everywhere; no smooth-scroll library
- Respect `prefers-reduced-motion`: `useReducedMotion` (Motion), `gsap.matchMedia()` (GSAP)
- Animations communicate results; nothing loops or blocks interaction

## UI & design
- Mobile-first (375 px) up to desktop; light mode
- Currency: MXN `$4,000.00 MXN`, USD `US$215.00` (`Intl.NumberFormat('es-MX')`)
- Gains/losses with color **and** +/− sign
- Plain-language copy; tooltips for terms like ETF or volatility

## Out of scope
Dark mode, language toggle, PWA/offline, in-app notifications, comparing
assets

## Open questions
- UI language: Spanish only, or English for the reviewers?
- Shared Zod schemas between frontend and backend (monorepo package), or duplicated?
