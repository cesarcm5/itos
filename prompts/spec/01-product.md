# 01 · Product Spec — ITOS

## Problem
People with a income who want to start investing don't know:
1. **How much** they can invest each month without putting their finances at risk
2. **Where** to put that money depending on when they'll need it
3. **Whether it's worth it**: what investing regularly would have produced

## Target user
**Ana, 27, salaried professional in Mexico**
- Steady monthly income, knows her monthly expenses
- **Already has an emergency fund of at least 6 months of expenses**
- Has never invested in stocks or ETFs and wants a clear starting point
- Doesn't want to watch prices every day

## Starting assumption: emergency fund first
ITOS is for money **beyond** the emergency fund.
- Onboarding asks: "Do you have savings covering 6 months of expenses?"
  - **Yes** → continue to the investment tools
  - **No** → tip: build the emergency fund first, in fixed income
    (e.g. CETES, high-yield savings, short-term bond funds), with the target
    amount shown (6 × monthly expenses). The user can still explore the app.
- Tip shown on the dashboard: keep the emergency fund in fixed income
  (liquid, low risk), not in stocks.

## Value proposition
ITOS helps first-time investors know how much they can invest each month,
where to put it by time horizon, and what that habit would have produced
with real market data.

## Core user flows
1. **Sign up / log in.** Email + password (JWT).
2. **Financial profile (under 1 min).**
   - Monthly net income
   - Monthly expenses
   - Emergency fund ≥ 6 months? (yes / no)
   - Time horizon: < 3 years / 3–7 years / 7+ years
   - Risk comfort: low / medium / high
3. **"How much to invest" tip.** A suggested monthly amount with the math shown.
4. **"Where to invest" tips.** Asset types and example ETFs/stocks by horizon.
5. **Explore an asset.** Search or pick from the tips: quote, price chart,
   key data.
6. **Simulator: "How much would I have generated?"** X per month, for X time,
   in asset Y.
7. **Price alerts by email.** "Email me when VOO goes above / below $X."
8. **Watchlist.** Save assets to come back to.

## Feature details

### How much to invest (rule-based)
- **Monthly surplus** = income − expenses
- **Suggested monthly investment** = a share of the surplus by risk comfort
  (e.g. low 30%, medium 50%, high 70%) [confirm percentages]
- The rest of the surplus stays flexible (short-term savings, spending)
- If there's no emergency fund: suggested investment = 0, and the full
  surplus goes to the fund until the target is reached
- Every number shows "How we calculated this"

### Where to invest by horizon (rule-based)
| Horizon | Risk | Suggested focus | Example assets |
|---|---|---|---|
| < 3 years | any | Fixed income | Short-term bond ETFs (SHY, BND); note: CETES |
| 3–7 years | low / medium | Balanced | BND + VOO |
| 3–7 years | high | Equity-leaning | VOO + VXUS |
| 7+ years | low / medium | Broad market | VOO, VTI, VXUS |
| 7+ years | high | Broad market + growth | VTI, QQQ |
- Curated, hardcoded list: zero API cost
- Each suggestion has a one-line "Why this?"

### Simulator: "How much would I have generated?"
**Inputs:** asset, monthly amount (MXN), period (1 / 3 / 5 years).
Pre-filled with the suggested monthly amount and the first tip.
**Outputs:**
- Total contributed vs value today, gain/loss in $ and %
- Line chart: portfolio value vs money contributed, month by month
- One-sentence summary: "Investing $200/month in VOO for the last 5 years,
  you would have contributed $12,000 and have $X today."
- **Always visible:** "Past performance does not guarantee future results.
  Not financial advice."

**Calculation rules:**
- Monthly closing prices; one buy at each month's close
- Fractional shares allowed
- Price return only (dividends not included; stated in the UI)

### Price alerts by email
- Condition: price goes **above** or **below** a target set by the user
- Checked every ~15 min during US market hours by an external cron
  calling a protected backend endpoint
- Checks unique symbols, not individual alerts, and reuses the quote cache
- Fires **once** → status `triggered` + email sent; the user can re-activate it
- Max 5 active alerts per user
- Email includes: asset, target, price when triggered, link to the asset
- Stated in the UI: not real-time; data may be delayed

## Features: MVP vs later
| Feature | MVP | If time | Later | Why |
|---|---|---|---|---|
| Auth (JWT) | ✅ | | | Required by the test |
| Financial profile + emergency-fund check | ✅ | | | Base for every tip |
| How much to invest | ✅ | | | Core of the idea |
| Where to invest by horizon | ✅ | | | Core of the idea |
| Search + asset detail | ✅ | | | Real market data |
| Monthly-contribution simulator | ✅ | | | Shows the value of investing regularly |
| Price alerts by email | ✅ | | | Avoids checking prices all day |
| Watchlist | ✅ | | | Reason to come back |
| Worst moment (max drawdown) in simulator | | 🟡 | | Same data; teaches risk |
| Results in MXN | | 🟡 | | Needs USD/MXN history |
| Compare 2–3 assets | | 🟡 | | Same data, extra credits |
| In-app notifications | | 🟡 | | Email covers the need |
| Dividends in simulator | | | ✅ | Extra endpoint and logic |
| AI explanations | | | ✅ | Risk of wrong answers about money |
| Buying / selling | | | ❌ | Not this product |

## Out of scope
- **Buying or selling**: no brokerage connection. ITOS analyzes; it doesn't trade.
- **Personalized financial advice**: tips are educational and rule-based.
- **Non-US assets** (free data plan is US-only).
- **Real-time prices** (free data may be delayed).
- **Financial Data about CETES**
