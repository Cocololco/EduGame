# EduGame

A business-management simulation game — run a surfboard company as owner/manager, competing solo or with friends/family.

> The name comes from a similar business simulation the creator played at university — this is a personal project to build something like it, not a classroom/educational tool.

## Status

🚧 Both solo and multiplayer are playable at [game.corentinhillion.com](https://game.corentinhillion.com) — run three product lines (shortboard, longboard, luxury fishboard) across a configurable number of years, with a full financial-statements page (solo), a local leaderboard, difficulty levels, and now real multiplayer: sign in with just a name, create a game, send the link, play with bots filling any open seats. Numbers are calculated to make a reasonably-played year profitable, verified by a full playthrough of each mode, but this hasn't had extensive real playtesting yet. Selling into multiple countries (factories/transport/licenses/market research) is designed but not built — see [docs/REGIONS_DESIGN.md](docs/REGIONS_DESIGN.md).

## Concept

Run three surfboard product lines with independent price/production/staffing/quality/training decisions, plus company-wide marketing, R&D, and financing. Each round is one business year: submit decisions, the year simulates, and results come back — solo gets a full P&L + balance sheet navigable across past years; multiplayer gets a standings table once everyone's played the same year.

Two modes:

- **Solo** — play against the market itself over a configurable number of years, saved in your browser only, then get a final score on the [leaderboard](src/app/leaderboard/page.tsx).
- **Multiplayer (2–8 players + bots)** — sign in with a name (no password), create a game, share its link. Each product's demand is split by category leadership each year (cheapest price / best quality / best brand / best innovation each win their whole share, not a smooth blend) — see [docs/RULES.md](docs/RULES.md). Any open bot seats get filled with simple heuristic opponents.

Full design details live in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md); the exact simulation math is in [docs/RULES.md](docs/RULES.md) (also available in-app at `/rules`).

## Tech Stack

- **Frontend:** [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- **Backend:** minimal, multiplayer-only — file-based server-side game storage (`src/lib/server/gameStore.ts`) and a name-only per-browser identity (`src/lib/identity.ts`, no password/real accounts — see its docstring). Solo games never touch the server.
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
