# ITOS Brand Guidelines v1.0

> Last updated: 2026-11-16 · Status: Draft
> Token source of truth: `frontend/src/app/globals.css`. This document explains the tokens; if the two disagree, the CSS wins and this file gets updated.

## Quick reference

| Element | Value |
|---|---|
| Primary | Ocean Blue `#0B3394` (`ocean-600`) |
| Accent | Violet `#6322E0` (`violet-500`) |
| Base | White `#FFFFFF` |
| Heading font | Space Grotesk 500/600/700 |
| Body font | Geist Sans |
| Numbers font | Geist Mono / `tabular-nums` |
| Voice | Clear, calm, encouraging, honest |
| Theme | Light mode only (per `03-frontend.md`) |

The brand idea is **minimal tech with steady growth**: geometric shapes, lots of white space, and one violet accent that marks progress.

---

## 1. Color

### Brand colors

| Name | Hex | Token | Usage |
|---|---|---|---|
| Ocean Blue | `#0B3394` | `--primary`, `ocean-600` | Primary buttons, links, active nav, logo, chart "value" line |
| Violet | `#6322E0` | `--brand-accent`, `violet-500` | **One accent per view**: highlights, focus rings, chart "contributed" line, the growth element in icons |
| White | `#FFFFFF` | `--background` | Page and card backgrounds |

### Scales (Tailwind utilities: `bg-ocean-600`, `text-violet-500`, …)

| Step | Ocean | Violet | Typical use |
|---|---|---|---|
| 50 | `#EEF3FC` | `#F3EEFE` | Tinted surfaces, secondary / accent buttons |
| 100 | `#D9E4F8` | `#E6DBFD` | Hover on tinted surfaces |
| 200 | `#B3C8F0` | `#CDB8FB` | Borders on tinted surfaces |
| 300 | `#7FA2E3` | `#AC8AF5` | Secondary chart series |
| 400 | `#4774D0` | `#8A5BEE` | Focus ring (`violet-400`) |
| 500 | `#1F4DB8` | **`#6322E0`** | Info / accent |
| 600 | **`#0B3394`** | `#521ABF` | Primary / accent hover |
| 700 | `#0A2A7A` | `#42169B` | Primary hover, text on tints |
| 800 | `#0A2260` | `#331277` | Pressed |
| 900 | `#081A47` | `#250D57` | Dark sections (landing hero, footer) |

> The ocean and violet scales replace Tailwind's default `violet-*` palette in this project.

### Neutrals

| Name | Hex | Token |
|---|---|---|
| Text | `#0B1530` | `--foreground` |
| Muted text | `#5B6478` | `--muted-foreground` |
| Surface | `#F7F9FC` | `--muted`, `--sidebar` |
| Border / input | `#E3E8F0` | `--border`, `--input` |
| Chart neutral | `#94A0B8` | `--chart-5` |

### Market and status colors

| State | Hex | Token / utility | Rule |
|---|---|---|---|
| Gain | `#047857` | `text-gain` | Always shown with a `+` sign |
| Loss | `#D02F3A` | `text-loss` | Always shown with a `−` sign |
| Error / destructive | `#D02F3A` | `--destructive` | Delete alert, form errors |
| Warning / stale | `#B45309` | `bg-warning`, `text-warning` | `StaleBadge`, emergency-fund banner accent |

Color never carries meaning on its own. Gains and losses always show a sign, and the stale state always shows text ("Datos de hace X min").

### Charts

| Series | Token | Color |
|---|---|---|
| Portfolio value / price | `--chart-1` | Ocean `#0B3394` |
| Total contributed | `--chart-2` | Violet `#6322E0` |
| Extra series | `--chart-3`, `--chart-4` | Ocean 300, Violet 300 |
| Gridlines / axis | `--chart-5` / `--border` | Neutral |

### Accessibility (WCAG 2.1, measured against white)

| Pair | Ratio | Level |
|---|---|---|
| Text `#0B1530` | 18.0 : 1 | AAA |
| Ocean `#0B3394` (and white on ocean) | 11.0 : 1 | AAA |
| Violet `#6322E0` (and white on violet) | 7.4 : 1 | AAA |
| Muted `#5B6478` | 5.9 : 1 | AA |
| Loss `#D02F3A` | 5.1 : 1 | AA |
| Warning `#B45309` | 5.0 : 1 | AA |
| Gain `#047857` | 5.5 : 1 | AA |

Don't put text in `ocean-300`/`violet-300` or lighter on white. Those steps are for fills and chart lines only.

---

## 2. Typography

```css
--font-heading: Space Grotesk   /* h1–h4, logotype, big numbers in hero */
--font-sans:    Geist Sans      /* UI and body */
--font-mono:    Geist Mono      /* tickers, code */
```

Loaded with `next/font/google` in `src/app/layout.tsx` (no extra dependency). `h1`–`h4` get `font-heading tracking-tight` automatically.

| Element | Mobile (375 px) | Desktop | Weight | Line height |
|---|---|---|---|---|
| H1 | 32px | 48px | 700 | 1.15 |
| H2 | 24px | 32px | 600 | 1.25 |
| H3 | 20px | 24px | 600 | 1.3 |
| Body | 16px | 16px | 400 | 1.5 |
| Small | 14px | 14px | 400 | 1.5 |
| Caption / disclaimer | 12px | 12px | 400 | 1.4 |
| Key figure (monthly amount, simulator total) | 36px | 48px | 600, heading font | 1.1 |

- Use `tabular-nums` for every price, percentage and amount so the digits don't shift while values animate.
- Format currency with `Intl.NumberFormat('es-MX')`: `$4,000.00 MXN`, `US$215.00`.
- Tickers are uppercase in mono: `VOO`, `AAPL`.

---

## 3. Logo

| Variant | Use |
|---|---|
| Horizontal lockup (mark + "ITOS") | Header, landing, emails |
| Mark only | Favicon, app tile, mobile header |
| Reversed (white on `ocean-600` or `ocean-900`) | Dark sections, app tile |

- **Construction:** geometric "I" + three ascending bars. The growth element is the only violet part.
- **Logotype:** "ITOS" in caps, geometric sans (Space Grotesk 600), wide tracking, ocean blue.
- **Clear space:** at least the height of the "I" stem's arrow on every side.
- **Minimum size:** lockup 96 px wide, mark 16 px.
- **Don't:** recolor outside the palette, add shadows or glow, rotate, stretch, put on photos or busy backgrounds, or use violet for the whole mark.

---

## 4. Icons

Feature icons are generated with Recraft and live in `frontend/public/itos_icons/` (`<name>_itos.svg`).

| Rule | Value |
|---|---|
| Grid | 24 × 24, about 70% fill |
| Style | Flat duotone, rounded caps and corners, 2px-equivalent stroke |
| Colors | Ocean `#0B3394` for the main shape, Violet `#6322E0` for one accent, white for knockouts only |
| Max shapes | 4 |
| Sizes | 20 px (nav), 24 px (cards), 40–48 px (empty states, landing steps) |

- Generated SVGs must be normalized to the exact token hex values. Recraft drifts, so recolor with a find-and-replace on `fill` after export.
- Utility glyphs (close, chevrons, menu, trash, pause, external link) come from **lucide-react** at `stroke-width={2}`, `currentColor`. Don't generate those.
- Icons next to text inherit the text color unless they are brand feature icons.

---

## 5. Components and layout

| Token | Value | Usage |
|---|---|---|
| `--radius` | 10px (`0.625rem`) | Base. `rounded-md` 8px inputs/buttons, `rounded-lg` 10px, `rounded-xl` 14px cards, `rounded-full` pills |
| Spacing | 4px base (Tailwind scale) | 16px mobile gutter, 24px card padding, 48–64px section gaps |
| Elevation | Border first (`--border`), shadow at most `shadow-sm` | Flat, minimal |

| Button | Background | Text | Hover |
|---|---|---|---|
| Primary | `ocean-600` | white | `ocean-700` |
| Secondary | `ocean-50` | `ocean-700` | `ocean-100` |
| Accent (one per screen at most, e.g. "Simular") | `violet-500` | white | `violet-600` |
| Ghost | transparent | `--foreground` | `--muted` |
| Destructive | `--destructive` | white | 90% opacity |

- Focus ring: `violet-400` at 50% opacity (shadcn `outline-ring/50`). Never remove it.
- Touch targets are at least 44 × 44 px.
- Data views have four states: skeleton (`--muted`), empty (feature icon + one line + CTA), error (message + "Reintentar"), and stale (`StaleBadge` in `--warning`).

---

## 6. Motion

Follows `03-frontend.md`: Motion (`LazyMotion` + `m`) in the app, GSAP on the landing only.

| Use | Duration | Easing |
|---|---|---|
| Hover / press | 150 ms | ease-out |
| Cards and lists entering | 250 ms, 40 ms stagger | `[0.22, 1, 0.36, 1]` |
| Key figure count-up | 800 ms | ease-out |
| Chart draw | 600 ms | ease-in-out |

With `prefers-reduced-motion`, skip the count-up and chart draw, show final values, and keep only opacity fades.

---

## 7. Voice and tone

The UI is in Spanish, written for someone investing for the first time.

| We are | We are not |
|---|---|
| **Clear.** Plain words, explain the term. | Jargon-heavy ("rendimiento ajustado por volatilidad") |
| **Calm.** Steady, no urgency. | Hype ("¡Hazte rico!", "¡No te lo pierdas!") |
| **Encouraging.** Small steps count. | Patronizing |
| **Honest.** Past performance isn't a promise. | Overpromising returns |

| Context | Example |
|---|---|
| Recommendation | "Puedes invertir **$4,000.00 MXN al mes** sin tocar tu fondo de emergencia." |
| Emergency fund | "Primero, tu colchón: junta **$54,000.00 MXN** (6 meses de gastos) en renta fija." |
| Simulator summary | "Si hubieras invertido $2,000 al mes en VOO desde 2021, hoy tendrías $X." |
| Error | "No pudimos cargar los precios. Reintentar" |
| Stale data | "Mostrando datos de hace 12 min." |
| Success | "Alerta creada. Te avisamos por correo." |

**Avoid:** "garantizado", "sin riesgo", "hazte rico", "la mejor inversión", emojis in financial figures.
**Always include:** the disclaimer "El rendimiento pasado no garantiza resultados futuros. Esto no es asesoría financiera." on the dashboard, simulator and stock pages.

---

## 8. AI generation (Recraft)

Prepend to every asset prompt:

```
Minimalist flat vector for "ITOS", a fintech app for first-time investors. Geometric construction, generous white space, calm and trustworthy tech aesthetic. Palette: ocean blue #0B3394 (dominant), violet #6322E0 (single accent marking growth), white #FFFFFF background. No 3D, no shadows, no glow, no gradients except a subtle ocean-to-violet on growth elements, no coins, no dollar signs, no bulls or bears, no text unless specified.
```

Set the same three hex values in Recraft's palette picker, and recolor the exported SVG fills to the exact token values.

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-11-16 | Initial guidelines. Palette aligned to the first Recraft icon set (#0B3394 / #6322E0) |
