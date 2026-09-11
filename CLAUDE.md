# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

EduGame is an educational game teaching **business management** concepts to middle/high school students, built as a web app.

**Current state: pre-scaffold.** The repository has no source code yet — only planning docs (this file and [README.md](README.md)). Do not assume any app structure, config files, or dependencies exist until they've actually been created; check before referencing paths like `package.json`, `src/`, etc.

## Intended stack (not yet set up)

- Frontend: JavaScript/TypeScript, React/Next.js style
- Package manager: npm
- Backend: none yet — planned later for auth + persistent user progress (accounts, saved progress, possibly leaderboards). Treat this as a future milestone, not current scope.

When scaffolding is eventually created, update this section to reflect what's actually in place (framework version, folder layout, scripts) rather than the aspirational plan above.

## Working conventions

- Target audience is middle/high schoolers — keep UI copy and content age-appropriate and free of jargon beyond what's being taught.
- Subject matter is business management — game mechanics and content should map back to real business concepts (budgeting, operations, decision-making, basic economics, etc.), not just generic point-scoring.
- No backend/persistence exists yet — until one is built, don't invent API calls or storage beyond `localStorage` for prototypes.

## Open questions (ask the user, don't assume)

- Specific curriculum/learning objectives (which business topics, in what order)
- Game genre/mechanics (simulation, quiz-based, board-game style, etc.)
- Choice of backend/auth/DB when that phase starts
- Deployment target
