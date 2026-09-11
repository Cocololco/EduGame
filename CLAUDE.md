# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. Player is the owner/manager of a company; each round = one simulated business year of decisions (pricing/sales, production/operations, HR/staffing, finance/investment), followed by year-end results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — read it before implementing simulation/game logic, and keep it updated as design decisions change.

**Current state: scaffolded, no game logic yet.** The Next.js app is set up (`src/app/` has only the default starter page) but no simulation/game code has been written. Docs: this file, [README.md](README.md), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, ESLint — scaffolded via `create-next-app`, `src/` directory layout, `@/*` import alias
- Package manager: npm (`npm run dev`, `npm run build`, `npm run lint`)
- Backend: none yet — planned later for auth + persistent user progress (accounts, saved progress, leaderboards). Treat this as a future milestone, not current scope.

## Working conventions

- This is not a classroom/educational-audience product — don't add age-appropriate content constraints, teacher/host roles, or tutorial/tooltip content unless asked. It's a straight simulation, closer to a strategy game.
- Subject matter is business management — game mechanics and content should map back to real business concepts (pricing, operations, HR, finance), not just generic point-scoring.
- No backend/persistence exists yet — until one is built, don't invent API calls or storage beyond `localStorage` for prototypes.

## Open questions (ask the user, don't assume)

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)'s "Open questions" section for design-level unknowns (exact industry, scoring formula, etc.). Additionally, not yet decided:

- Choice of backend/auth/DB when that phase starts
- Deployment target
