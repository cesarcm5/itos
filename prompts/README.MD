# How I worked with AI

## Approach: Spec-Driven Development with AI
1. **Research and specs (Claude, chat).** Before writing any code, I used
   Claude to research and compare options (backend framework, market-data
   limits, hosting free tiers) and to write the specs:
   [`01-product.md`](./specs/01-product.md), [`02-backend.md`](./specs/02-backend.md)
   and [`03-frontend.md`](./specs/03-frontend.md). I made the product
   decisions; Claude helped me structure them and pointed out trade-offs.
2. **Implementation (Claude Code).** Each session referenced the relevant spec
   and built **one feature at a time** (e.g. auth, then profile, then
   recommendations). I reviewed every change before moving on.
   Rules for the AI live in [`system/CLAUDE.md`](./system/CLAUDE.md).

## Tools and models
| Tool | Model | Used for |
|---|---|---|
| **Claude** (chat) | Claude Opus 5.5 | Research, product/backend/frontend specs, README |
| **Claude Code** | Claude Opus 5.5 | Implementation, debugging, branding support |
| **UI UX Pro Max** (Claude Code skill) | — | Design system and all frontend UI decisions |
| **OpenRouter** | Recraft V4.1 Pro Vector | Logo and core icons (native SVG) |

## Branding and design system
1. **Design system first.** With Claude Code and the UI UX Pro Max skill, I
   generated a design system for a fintech product for beginners: color
   palette, typography, style and anti-patterns. Saved as
   <path, e.g. `design-system/MASTER.md`> so every feature follows the same
   visual rules.
2. **Brand guidelines.** From that design system, Claude helped me write the
   brand guidelines (<path>): logo usage, colors, typography and icon style.
3. **Logo and icons.** Claude helped me write the prompts for Recraft V4.1 Pro
   Vector, based on the brand guidelines. I ran them through OpenRouter, which
   gives API access to Recraft. Recraft generates native, editable SVG, so the
   logo and icons scale cleanly and match the palette.
4. **Frontend development.** Every UI feature was built with the skill active,
   so new screens reused the same design system instead of inventing new styles.

**Why UI UX Pro Max:** it isn't a component library (components come from
shadcn/ui). It's a searchable database of design decisions (industry-specific
palettes, font pairings, chart recommendations, UX guidelines and stack
guidelines for Next.js, shadcn/ui and Tailwind) that the AI consults before
writing UI. Its design-system generator gave me a single source of truth, which
kept the app consistent across features built in separate AI sessions.

## Key decisions made during the spec phase
- **Express 5** over Hono/Fastify: the test's preferred stack; Twelve Data's
  rate limit, not the framework, is the bottleneck
- **Railway + Vercel + Supabase**, with alerts scheduled inside the API
  (node-cron) because Railway keeps the server on
- **Motion for the app, GSAP only for the landing**, instead of three animation libraries
- **Polling instead of WebSocket:** Twelve Data's free plan only streams trial symbols


## Folder contents
| Folder | Contents |
|---|---|
| [`system/`](./system) | `CLAUDE.md`: rules and conventions for the AI (imported from the root `CLAUDE.md`) |
| [`specs/`](./specs) | Product, backend and frontend specs, written before implementation |
| [`sessions/`](./sessions) | Prompts I sent, in order: spec chat, implementation sessions, Recraft prompts |

## Issues and fixes
- **Merge conflict between `develop` and `main`:** The first version of claude.md has the rule to create a branch since develop but open it to main, it was an error made it by so when the first branch was merged I didn't realized it was for production so I had to solve this conflict with Claude


