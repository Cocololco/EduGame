# EduGame

A business-management simulation game — play as the owner/manager of a company, competing solo or with friends/family.

> The name comes from a similar business simulation the creator played at university — this is a personal project to build something like it, not a classroom/educational tool.

## Status

🚧 Early development — **solo mode is playable** at [game.corentinhillion.com](https://game.corentinhillion.com) (once redeployed with the latest build). No accounts yet: games are saved in your browser's local storage only. Multiplayer has no UI yet. Numbers aren't balanced — it's a functional first pass, not tuned gameplay.

## Concept

EduGame is a business-management simulation. The player runs a company as owner/manager: each round represents one business year — you make decisions (pricing, production, HR, finance), the year simulates, and results (and a score) come back.

Two modes:

- **Solo** — play against the market itself over a configurable number of years, then get a final score.
- **Multiplayer (2–4 players)** — play with friends/family sharing one market, submit decisions each year, and the round resolves once everyone's in.

Full design details live in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

## Tech Stack

- **Frontend:** [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- **Backend:** Not yet built — planned for the future to support user accounts and persistent progress (auth + database)
- **Package manager:** npm

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for how the live deployment works.

## Contributing

Solo/early-stage project. No contribution process defined yet.
