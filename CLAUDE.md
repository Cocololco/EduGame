# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. Player is the owner/manager of a company; each round = one simulated business year of decisions (pricing/sales, production/operations, HR/staffing, finance/investment), followed by year-end results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — read it before implementing simulation/game logic, and keep it updated as design decisions change.

**Current state: solo mode is playable end-to-end.** `src/types/game.ts` defines the domain model; `src/lib/simulation/` implements year simulation (solo + multiplayer, tested — `npm test`); `src/lib/game/createGame.ts` + `storage.ts` wire that into a playable solo game persisted in `localStorage` (no backend yet); `src/app/` has a landing page, `/solo/new`, `/solo/play/[id]` (decision form uses preset option selects, not free-number inputs, each labeled with its effect), and `/rules` (plain-language explanation of the formulas — also [docs/RULES.md](docs/RULES.md)). Multiplayer has no UI yet — only the engine supports it. Docs: this file, [README.md](README.md), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md), [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/RULES.md](docs/RULES.md).

Constants in `constants.ts`/`initialState.ts` are calculated so a reasonably-played year turns a profit (worked examples in docs/RULES.md, sanity-checked by hand — not yet validated by a full multi-year playthrough). If you change them, update docs/RULES.md and src/app/rules/page.tsx's hardcoded prose/tables too — they restate the math rather than deriving it live. Production is capped by BOTH `productionCapacity` and `employees × UNITS_PER_EMPLOYEE` (whichever is lower) — this was added after playtesting showed firing everyone had zero downside; don't remove the labor cap without re-checking that finding. Known remaining rough edges (see constants.ts's inline notes): cash can go negative with no bankruptcy handling; morale and R&D spend are tracked/charged but have no gameplay effect yet; PRICE_ELASTICITY > 1 still makes cutting price revenue-positive in the uncapped case, though capacity now moderates it at normal starting conditions.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, ESLint — scaffolded via `create-next-app`, `src/` directory layout, `@/*` import alias
- Package manager: npm (`npm run dev`, `npm run build`, `npm run lint`)
- Backend: none yet — planned later for auth + persistent user progress (accounts, saved progress, leaderboards). Treat this as a future milestone, not current scope.
- Deployed at [game.corentinhillion.com](https://game.corentinhillion.com) via Docker on an existing personal VPS — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before changing anything deploy-related; deploys are manual, not automated.

## Working conventions

- This is not a classroom/educational-audience product — don't add age-appropriate content constraints, teacher/host roles, or tutorial/tooltip content unless asked. It's a straight simulation, closer to a strategy game.
- Subject matter is business management — game mechanics and content should map back to real business concepts (pricing, operations, HR, finance), not just generic point-scoring.
- No backend/persistence exists yet — until one is built, don't invent API calls or storage beyond `localStorage` for prototypes.

## Open questions (ask the user, don't assume)

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)'s "Open questions" section for design-level unknowns (exact industry, scoring formula, etc.). Additionally, not yet decided:

- Choice of backend/auth/DB when that phase starts
