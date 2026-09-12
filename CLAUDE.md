# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. The player runs a **surfboard company with three product lines** (shortboard/longboard/fishboard), each with independent price/production/staffing/quality/training decisions, plus company-wide marketing/R&D/financing. Each round = one simulated business year, followed by full financial results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md); the exact simulation math (formulas, worked examples) lives in [docs/RULES.md](docs/RULES.md) — read both before touching simulation/game logic, and keep them updated as design decisions change.

**Current state: both solo and multiplayer are playable end-to-end.**

- `src/types/game.ts` — domain model (see [docs/DATA_MODEL.md](docs/DATA_MODEL.md))
- `src/lib/simulation/` — the engine (`simulateYear`/`simulateMultiplayerYear`, tested — `npm test`), product catalog (`products.ts`), tunable constants (`constants.ts`)
- `src/lib/game/` — shared game-lifecycle logic, used by both modes where possible: `createGame.ts` (solo), `multiplayerEngine.ts` (multiplayer — create/join/start/submitPlayerDecision, pure and fully tested), `yearResolution.ts` + `defaultDecision.ts` (the parts both modes share), `botAi.ts` (3 heuristic personalities), `storage.ts` (solo's localStorage persistence), `leaderboard.ts`, `gameSchema.ts` (the structural compatibility guard both persistence layers use), `difficulty.ts` (per-tier field visibility), `decisionOptions.ts` (preset-option generators the UI selects use), `exportCsv.ts`, `multiplayerApi.ts` (client-side fetch wrappers)
- `src/lib/identity.ts` — lightweight per-browser "sign in" (name + generated id in localStorage, no password/session — see its docstring for the tradeoff)
- `src/lib/server/gameStore.ts` — **the only server-held state in this codebase**: one JSON file per multiplayer game (solo games never touch the server). Node-only, only import from route handlers, never from a `"use client"` component.
- `src/app/api/multiplayer/games/...` — Route Handlers backing multiplayer (create, get, join, start, decision, list-mine), Node runtime, thin wrappers around `multiplayerEngine.ts` + `gameStore.ts`
- `src/app/` — landing page, `/login`, `/solo` + `/solo/new` + `/solo/play/[id]` (+ `.../financials`, full P&L/balance sheet, year-navigable, CSV export, trend chart), `/multiplayer` + `/multiplayer/new` + `/multiplayer/[id]` (lobby → decision loop, reuses the same per-product/company panels as solo, polls the server every ~3.5s), `/leaderboard`, `/rules` (also [docs/RULES.md](docs/RULES.md))
- `src/components/game/` — shared UI: `ProductIcon`, `ProductDecisionPanel`, `CompanyDecisionPanel`, `CompanyStatusPanel`, `YearResultSummaryCard` (takes an optional `financialsHref` override/null — multiplayer has no financials page yet), `FinalResultsCard` (solo), `MultiplayerResultsTable` (multiplayer standings), `ProfitTrendChart`
- Every client-component route is split into a Server Component `page.tsx` (holds `export const metadata` for the tab title) rendering a same-folder `*Client.tsx` (the actual interactive component, `"use client"`). **Don't set `document.title` manually from a client component** — Next's App Router metadata system silently overrides it on navigation; this split is the pattern that actually works. `/rules` doesn't need the split since it's already a Server Component.

**Not built yet** (see [docs/REGIONS_DESIGN.md](docs/REGIONS_DESIGN.md) for a full spec, ready to build from): selling into multiple countries, factories, transport cost, licenses, paid market research. This is the next big milestone if picked back up — it's comparable in size to everything multiplayer-related combined, so don't try to bolt it on as a quick addition.

### Mechanics worth knowing before changing constants

- **Production is capped by whichever is lower**: a product's physical `productionCapacity` or its labor capacity (`employees × UNITS_PER_EMPLOYEE × wage-productivity-factor × training-productivity-factor`). This was added deliberately after playtesting showed firing everyone had zero downside — don't remove the labor cap without re-confirming that finding (there are regression tests: `simulateYear.test.ts`).
- **Wages drive productivity** (`computeWageProductivityFactor`), and **training drives a separate productivity stat** that also feeds labor capacity and contributes a little to demand-quality (`computeTrainingProductivityFactor`, `PRODUCTIVITY_TO_QUALITY_WEIGHT`). Productivity decays 15%/year without training — a real, intentional mechanic (a company that stops training quietly loses capacity over time), not a bug.
- **R&D → innovation is company-wide**: boosts every product's effective quality (`INNOVATION_TO_QUALITY_WEIGHT`) *and* makes capacity investment cheaper company-wide (`computeCapacityCostPerUnit`), floored at a 50% discount.
- **This year's investment pays off next year**, not this one (marketing/quality/training/R&D/hiring) — demand this year is computed from *opening* state. Price is the only decision that affects this year's demand immediately.
- Constants in `constants.ts`/`initialState.ts` are calculated (not yet extensively playtested) so a reasonably-played year turns a profit across all three products — worked examples in docs/RULES.md, verified by a scratch script and one full 5-year browser playthrough. **If you change them, update docs/RULES.md and `src/app/rules/page.tsx`'s hardcoded prose/tables too** — both restate this math rather than deriving it live, so they silently go stale otherwise.
- Known remaining rough edges (see `constants.ts`'s inline notes): cash can go negative with no bankruptcy handling; morale is tracked (fires/wage changes/events move it) but has no other gameplay effect yet; `PRICE_ELASTICITY > 1` still makes cutting price revenue-positive in the capacity-uncapped case.
- **Multiplayer demand is winner-take-category, not proportional**: `allocateDemandShares` in `simulateYear.ts` splits each product's demand pool by whoever's outright cheapest/highest-quality/highest-brand/highest-innovation (ties split evenly), weighted per product via `ProductDefinition.demandWeights`. Solo mode is completely separate — it still uses the continuous attractiveness formula and is untouched by any of this.
- `src/lib/game/gameSchema.ts`'s `isCompatibleGame` guards both persistence layers (`storage.ts` for solo, `server/gameStore.ts` for multiplayer) against loading a `Game` saved under an earlier, incompatible schema (structural check, not a version field — see DATA_MODEL.md's open questions) and silently prunes/skips anything that fails it. If you change `CompanyYearState`'s shape again, update that one function (both layers pick it up) or add a real version field.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, ESLint — scaffolded via `create-next-app`, `src/` directory layout, `@/*` import alias
- Package manager: npm (`npm run dev`, `npm run build`, `npm run lint`, `npm test`)
- Backend: a minimal one exists now, purpose-built for multiplayer only — see `src/lib/server/gameStore.ts` above. No database, no real auth; file-based storage and a name-only identity are deliberate, documented tradeoffs for a personal project, not gaps to silently "fix" by adding a DB/auth provider without being asked.
- Deployed at [game.corentinhillion.com](https://game.corentinhillion.com) via Docker on an existing personal VPS — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before changing anything deploy-related; deploys are manual, not automated. **The multiplayer data volume (`-v /home/ubuntu/edugame-data:/app/data`) must be on every `docker run`** — dropping it doesn't error, it just silently starts the app with empty/ephemeral multiplayer data.

## Working conventions

- This is not a classroom/educational-audience product — don't add age-appropriate content constraints, teacher/host roles, or business-concept tutorial content unless asked. It's a straight simulation, closer to a strategy game. (Explaining the simulation's *own* numbers — what a decision option actually does — is fine and already done throughout the UI; that's different from teaching business concepts.)
- Subject matter is a surfboard company — game mechanics and content should map back to real business concepts (pricing, operations, HR, finance) applied to that business, not just generic point-scoring.
- Solo stays `localStorage`-only, on purpose — don't route it through the server API just because one now exists. Only multiplayer needs server state (two different browsers have to see the same game).

## Open questions (ask the user, don't assume)

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)'s "Open questions" section for design-level unknowns (exact scoring weights, event tuning, etc.), and [docs/REGIONS_DESIGN.md](docs/REGIONS_DESIGN.md) for the fully-specified-but-not-built countries/factories/transport/licenses layer. Additionally, not yet decided:

- Real accounts (password/OAuth) if `src/lib/identity.ts`'s name-only approach ever needs to become one
- Database choice if the file-per-game JSON store ever needs to scale past "a personal project with a handful of concurrent games"
- What happens when a multiplayer player disconnects and never comes back (no timeout/removal path exists — the game just waits forever)
