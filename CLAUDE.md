# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. The player runs a **surfboard company with three product lines** (shortboard/longboard/fishboard), each with independent price/production/staffing/quality/training decisions, plus company-wide marketing/R&D/financing. Each round = one simulated business year, followed by full financial results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md); the exact simulation math (formulas, worked examples) lives in [docs/RULES.md](docs/RULES.md) — read both before touching simulation/game logic, and keep them updated as design decisions change.

**Current state: solo mode is playable end-to-end**, including a full financial-statements page and a local leaderboard.

- `src/types/game.ts` — domain model (see [docs/DATA_MODEL.md](docs/DATA_MODEL.md))
- `src/lib/simulation/` — the engine (`simulateYear`/`simulateMultiplayerYear`, tested — `npm test`), product catalog (`products.ts`), tunable constants (`constants.ts`)
- `src/lib/game/` — `createGame.ts` (solo game lifecycle), `storage.ts` (localStorage persistence, with a structural schema guard — see below), `leaderboard.ts`, `difficulty.ts` (per-tier field visibility), `decisionOptions.ts` (all the preset-option generators the UI selects use), `exportCsv.ts` (per-year financials → CSV download)
- `src/app/` — landing page, `/solo` (my games / resume / delete), `/solo/new`, `/solo/play/[id]` (decision loop — per-product panels + one company panel, all preset-option `<select>`s labeled with their effect, a live per-product outcome preview, an "Abandon" action), `/solo/play/[id]/financials` (full P&L + balance sheet, year-navigable, with a revenue/profit trend chart and CSV export), `/leaderboard`, `/rules` (also [docs/RULES.md](docs/RULES.md))
- `src/components/game/` — shared UI: `ProductIcon` (inline SVG illustrations), `ProductDecisionPanel`, `CompanyDecisionPanel`, `CompanyStatusPanel`, `YearResultSummaryCard`, `FinalResultsCard` (leaderboard rank + best-year/best-product insights), `ProfitTrendChart`
- Every client-component route (`solo`, `solo/new`, `solo/play/[id]`, `.../financials`, `leaderboard`) is split into a Server Component `page.tsx` (holds `export const metadata` for the tab title) rendering a same-folder `*Client.tsx` (the actual interactive component, `"use client"`). **Don't set `document.title` manually from a client component** — Next's App Router metadata system silently overrides it on navigation; this split is the pattern that actually works. `/rules` doesn't need the split since it's already a Server Component.

Multiplayer has no UI yet — only the engine supports it.

### Mechanics worth knowing before changing constants

- **Production is capped by whichever is lower**: a product's physical `productionCapacity` or its labor capacity (`employees × UNITS_PER_EMPLOYEE × wage-productivity-factor × training-productivity-factor`). This was added deliberately after playtesting showed firing everyone had zero downside — don't remove the labor cap without re-confirming that finding (there are regression tests: `simulateYear.test.ts`).
- **Wages drive productivity** (`computeWageProductivityFactor`), and **training drives a separate productivity stat** that also feeds labor capacity and contributes a little to demand-quality (`computeTrainingProductivityFactor`, `PRODUCTIVITY_TO_QUALITY_WEIGHT`). Productivity decays 15%/year without training — a real, intentional mechanic (a company that stops training quietly loses capacity over time), not a bug.
- **R&D → innovation is company-wide**: boosts every product's effective quality (`INNOVATION_TO_QUALITY_WEIGHT`) *and* makes capacity investment cheaper company-wide (`computeCapacityCostPerUnit`), floored at a 50% discount.
- **This year's investment pays off next year**, not this one (marketing/quality/training/R&D/hiring) — demand this year is computed from *opening* state. Price is the only decision that affects this year's demand immediately.
- Constants in `constants.ts`/`initialState.ts` are calculated (not yet extensively playtested) so a reasonably-played year turns a profit across all three products — worked examples in docs/RULES.md, verified by a scratch script and one full 5-year browser playthrough. **If you change them, update docs/RULES.md and `src/app/rules/page.tsx`'s hardcoded prose/tables too** — both restate this math rather than deriving it live, so they silently go stale otherwise.
- Known remaining rough edges (see `constants.ts`'s inline notes): cash can go negative with no bankruptcy handling; morale is tracked (fires/wage changes/events move it) but has no other gameplay effect yet; `PRICE_ELASTICITY > 1` still makes cutting price revenue-positive in the capacity-uncapped case.
- `src/lib/game/storage.ts` guards against loading a `Game` saved under an earlier, incompatible schema (structural check, not a version field — see DATA_MODEL.md's open questions) and silently prunes anything that fails it. If you change `CompanyYearState`'s shape again, either bump that guard or add a real version field.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, ESLint — scaffolded via `create-next-app`, `src/` directory layout, `@/*` import alias
- Package manager: npm (`npm run dev`, `npm run build`, `npm run lint`, `npm test`)
- Backend: none yet — planned later for auth + persistent user progress (accounts, saved progress, cross-device leaderboard). Treat this as a future milestone, not current scope.
- Deployed at [game.corentinhillion.com](https://game.corentinhillion.com) via Docker on an existing personal VPS — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before changing anything deploy-related; deploys are manual, not automated.

## Working conventions

- This is not a classroom/educational-audience product — don't add age-appropriate content constraints, teacher/host roles, or business-concept tutorial content unless asked. It's a straight simulation, closer to a strategy game. (Explaining the simulation's *own* numbers — what a decision option actually does — is fine and already done throughout the UI; that's different from teaching business concepts.)
- Subject matter is a surfboard company — game mechanics and content should map back to real business concepts (pricing, operations, HR, finance) applied to that business, not just generic point-scoring.
- No backend/persistence exists yet — until one is built, don't invent API calls or storage beyond `localStorage` for prototypes.

## Open questions (ask the user, don't assume)

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)'s "Open questions" section for design-level unknowns (exact scoring weights, event tuning, etc.). Additionally, not yet decided:

- Choice of backend/auth/DB when that phase starts
