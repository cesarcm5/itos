# ITOS — Setup guide

ITOS helps first-time investors decide how much to invest each month, where
to put it, and what that habit would have produced, using real market data.

| | |
|---|---|
| **Frontend** | https://itos-nu.vercel.app/ |
| **Backend** | itos-production.up.railway.app (`/health`) |
| **Architecture, decisions and time spent** | [`docs/DECISIONS.md`](./docs/DECISIONS.md) |
| **AI prompts and specs** | [`prompts/`](./prompts) |

## Repository structure
```
itos/
├── backend/    # Express 5 API (deployed on Railway)
├── frontend/   # Next.js app (deployed on Vercel)
├── prompts/    # AI rules, specs and session prompts
└── docs/       # Architecture and decisions
```

## 1. Requirements
- **Node.js** <20> or newer, and npm
- **Git**
- Free accounts and API keys for:

| Service | What for | Where to get it |
|---|---|---|
| **Supabase** | Postgres database | supabase.com → New project → Connect → connection string |
| **Twelve Data** | Market data | twelvedata.com → sign up → API key in the dashboard |
| **Resend** | Alert emails | resend.com → API Keys (optional for local development) |

## 2. Clone the repository
```bash
git clone <repo-url>
cd itos
```

## 3. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.xxx:<password>@aws-0-xx.pooler.supabase.com:5432/postgres` | Supabase **pooler** connection string, Session mode |
| `JWT_SECRET` | `<random string, 32+ chars>` | Generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `24h` | |
| `TWELVE_DATA_API_KEY` | `<your key>` | |
| `USER_DAILY_CREDITS` | `30` | Uncached market-data calls per user per day |
| `RESEND_API_KEY` | `<your key>` | Leave empty to skip emails locally |
| `EMAIL_FROM` | `ITOS <alerts@yourdomain.com>` | |
| `CRON_SECRET` | `<random string>` | Protects `/internal/check-alerts` |
| `ALERTS_CRON_ENABLED` | `false` | Keep `false` locally to save API credits |
| `CORS_ORIGIN` | `http://localhost:3000` | |
| `FRONTEND_URL` | `http://localhost:3000` | Used in email links |
| `PORT` | `<4000>` | |

Create the database tables:
```bash
npm run db:migrate
```

Start the API:
```bash
npm run dev
```

Check it's running: open `http://localhost:<4000>/health`. It should return
`{ "status": "ok", "db": "ok" }`.

## 4. Set up the frontend
In a new terminal:
```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill in `frontend/.env.local`:

| Variable | Example | Notes |
|---|---|---|
| `API_URL` | `http://localhost:<4000>` | Backend URL; server-side only |

Start the app:
```bash
npm run dev
```

Open `http://localhost:3000`, create an account, and complete the financial profile.

## 5. Available scripts
**Backend** (`cd backend`)
| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with hot reload |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled API |
| `npm test` | Runs unit and integration tests |
| `npm run db:generate` | Creates a migration from schema changes |
| `npm run db:migrate` | Applies pending migrations |

**Frontend** (`cd frontend`)
| Command | What it does |
|---|---|
| `npm run dev` | Starts Next.js in development mode |
| `npm run build` | Production build |
| `npm start` | Runs the production build |
| `npm run lint` | Lints the code |

## 6. Testing price alerts locally
Alerts are checked automatically every 15 minutes during US market hours when
`ALERTS_CRON_ENABLED=true`. To trigger a check manually:

1. Create an alert from any stock page, with a target close to the current price
2. Run:
   ```bash
   curl -X POST http://localhost:<4000>/internal/check-alerts \
     -H "x-cron-secret: <your CRON_SECRET>"
   ```
3. If the condition is met, the alert changes to "triggered" and an email is sent
   (when `RESEND_API_KEY` is set)

## 7. Deployment
**Database (Supabase)**
1. Create the project and copy the pooler connection string (Session mode)
2. Run `npm run db:migrate` from `backend/` with `DATABASE_URL` pointing to it
3. Confirm RLS is enabled on every table (Table Editor → each table)

**Backend (Railway)**
1. New project → Deploy from GitHub repo → root directory `backend`
2. Build command `npm run build`, start command `npm start`
3. Add the environment variables from step 3, with `ALERTS_CRON_ENABLED=true`
   and the Vercel URL in `CORS_ORIGIN` and `FRONTEND_URL`
4. Settings → health check path `/health`; keep **Serverless disabled** so alerts keep running
5. Generate a public domain

**Frontend (Vercel)**
1. New project → import the repo → root directory `frontend`
2. Add `API_URL` with the Railway public URL
3. Deploy, then add the Vercel URL to `CORS_ORIGIN` and `FRONTEND_URL` in Railway

## 8. Troubleshooting
| Problem | Fix |
|---|---|
| Backend can't connect to the database | Use the **pooler** connection string (Session mode), not the direct one; check the password |
| Browser shows CORS errors | `CORS_ORIGIN` in the backend must match the frontend URL exactly, without a trailing slash |
| "Market data limit reached" | Twelve Data's free plan allows 8 calls/min and 800/day; wait a minute, or check your per-user quota (`USER_DAILY_CREDITS`) |
| Alert emails don't arrive | Check `RESEND_API_KEY`, and whether Resend needs a verified domain to send to that address; check the spam folder |
| Supabase project paused | Free projects pause after 7 days without activity; resume it from the Supabase dashboard |
| Logged out unexpectedly | The session lasts 24 h; log in again |
