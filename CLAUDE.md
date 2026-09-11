# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. Player is the owner/manager of a company; each round = one simulated business year of decisions (pricing/sales, production/operations, HR/staffing, finance/investment), followed by year-end results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — read it before implementing simulation/game logic, and keep it updated as design decisions change.

**Current state: solo mode is playable end-to-end.** `src/types/game.ts` defines the domain model; `src/lib/simulation/` implements year simulation (solo + multiplayer, tested — `npm test`); `src/lib/game/createGame.ts` + `storage.ts` wire that into a playable solo game persisted in `localStorage` (no backend yet); `src/app/` has a landing page, `/solo/new`, and `/solo/play/[id]`. Multiplayer has no UI yet — only the engine supports it. Docs: this file, [README.md](README.md), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md), [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Known rough edges (balancing, not bugs — see constants.ts's inline notes): default decision pre-fills (e.g. "produce at full capacity") often lose money in year 1 because demand at the default price doesn't clear that much volume; cash can go negative with no bankruptcy handling; PRICE_ELASTICITY > 1 currently makes cutting price almost always revenue-positive when capacity isn't the constraint. None of this is tuned yet.

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
