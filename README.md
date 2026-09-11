# EduGame

A business-management simulation game — run a surfboard company as owner/manager, competing solo or with friends/family.

> The name comes from a similar business simulation the creator played at university — this is a personal project to build something like it, not a classroom/educational tool.

## Status

🚧 Solo mode is playable at [game.corentinhillion.com](https://game.corentinhillion.com) — run three product lines (shortboard, longboard, luxury fishboard) across a configurable number of years, with a full financial-statements page, a local leaderboard, and difficulty levels. No accounts yet: games/leaderboard live in your browser's local storage only. Multiplayer has no UI yet. Numbers are calculated to make a reasonably-played year profitable, but this hasn't had extensive real playtesting.

## Concept

Run three surfboard product lines with independent price/production/staffing/quality/training decisions, plus company-wide marketing, R&D, and financing. Each round is one business year: submit decisions, the year simulates, and full financials (P&L + balance sheet, navigable across past years) come back.

Two modes:

- **Solo** — play against the market itself over a configurable number of years, then get a final score on the [leaderboard](src/app/leaderboard/page.tsx).
- **Multiplayer (2–4 players)** — play with friends/family sharing one market per product, submit decisions each year, and the round resolves once everyone's in. *(Engine supports this; no UI yet.)*

Full design details live in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md); the exact simulation math is in [docs/RULES.md](docs/RULES.md) (also available in-app at `/rules`).

## Tech Stack

- **Frontend:** [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- **Backend:** Not yet built — planned for the future to support user accounts and persistent progress (auth + database)
- **Package manager:** npm

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Run `npm test` for the simulation-engine test suite.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for how the live deployment works.

## Contributing

Solo/early-stage project. No contribution process defined yet.
