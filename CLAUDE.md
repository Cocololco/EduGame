# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is a business-management simulation game, built as a web app, for personal use (creator + a small group of friends/family) rather than a classroom tool — the name comes from a similar simulation the creator played at university. Player is the owner/manager of a company; each round = one simulated business year of decisions (pricing/sales, production/operations, HR/staffing, finance/investment), followed by year-end results and a score.

Full game design (modes, decisions, scoring, persistence, open questions) lives in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — read it before implementing simulation/game logic, and keep it updated as design decisions change.

**Current state: pre-scaffold.** The repository has no source code yet — only planning docs (this file, [README.md](README.md), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)). Do not assume any app structure, config files, or dependencies exist until they've actually been created; check before referencing paths like `package.json`, `src/`, etc.

## Intended stack (not yet set up)

- Frontend: JavaScript/TypeScript, React/Next.js style
- Package manager: npm
- Backend: none yet — planned later for auth + persistent user progress (accounts, saved progress, possibly leaderboards). Treat this as a future milestone, not current scope.

When scaffolding is eventually created, update this section to reflect what's actually in place (framework version, folder layout, scripts) rather than the aspirational plan above.

## Working conventions

- This is not a classroom/educational-audience product — don't add age-appropriate content constraints, teacher/host roles, or tutorial/tooltip content unless asked. It's a straight simulation, closer to a strategy game.
- Subject matter is business management — game mechanics and content should map back to real business concepts (pricing, operations, HR, finance), not just generic point-scoring.
- No backend/persistence exists yet — until one is built, don't invent API calls or storage beyond `localStorage` for prototypes.

## Open questions (ask the user, don't assume)

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)'s "Open questions" section for design-level unknowns (exact industry, scoring formula, etc.). Additionally, not yet decided:

- Choice of backend/auth/DB when that phase starts
- Deployment target
