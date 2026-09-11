# EduGame — Game Design

Design decisions for the business-management simulation, as defined so far. This is a living document — update it as decisions change or get more specific.

**Audience:** personal project for the creator and a small group of friends/family (not a classroom/educational tool) — inspired by a similar business simulation played at university.

## Premise

The player is the owner/manager of a **surfboard company** with three product lines — shortboard (mass market), longboard (mid-market), and luxury fishboard (niche) — see [docs/RULES.md](RULES.md) for the exact prices/costs/market sizes. Each round represents **one business year**: the player makes a set of decisions, then the year is simulated and results are revealed.

## Modes

### Solo

- Player vs. **the market itself** — no AI rival companies, just market dynamics (demand, costs, random events).
- Runs for a **configurable number of years**, set at game creation.
- After each year's decisions are locked in, the year simulates and results are shown; game ends after the configured number of years and a final score is calculated.

### Multiplayer

- **2–4 players**, sharing **one market** — players' pricing/output/decisions actually affect each other's demand and results (interactive competition, not parallel/independent runs).
- Round advances only once **everyone has submitted** their decisions for the year (no timer, no host override).
- **No dedicated host role** — all players are equal; whoever creates the game is just another player.
- Starting conditions **can vary** between players (randomized or role-based asymmetric starts), rather than everyone starting identical.
- Game length is configurable at creation, same as solo.

## Decisions per year

Split into **per-product** decisions (one set per product line) and **company-wide** decisions (shared across all three lines):

Per product (shortboard / longboard / fishboard, each independent):
- **Price** and **production volume**
- **Capacity investment** (physical plant) and **quality investment**
- **Training spend** — raises that product's productivity, which drives labor output per employee and contributes a little to quality too
- **Hiring/firing** and **wage adjustment** — wages aren't just a cost: they set a productivity multiplier (underpay and output per employee drops; overpay and it rises, with diminishing returns)

Company-wide (not per-product):
- **Marketing spend** → brand awareness, which boosts every product's demand
- **R&D spend** → innovation, which boosts every product's effective quality *and* makes capacity investment cheaper company-wide
- **Financing**: loans, loan repayment, general capex

This is a meaningful departure from the original flat four-category design (pricing/production/HR/finance) — see [docs/DATA_MODEL.md](DATA_MODEL.md) for the exact type shapes.

## Simulation depth

- **Moderate**: simplified income statement + balance sheet, with key ratios (margin, ROI) — more than just a few headline numbers, short of full accounting realism.
- **Random events** occur each year (economic downturns, demand shocks, supply disruptions, competitor moves) — risk management is part of the skill set, not a pure deterministic puzzle.

## Scoring

Composite, weighted score combining:

- Net profit / cumulative profit
- Company valuation / net worth (assets − liabilities)
- Market share / growth

Exact weighting formula is TBD — needs balancing once the simulation model exists.

## Difficulty / complexity levels

- **Implemented**: Beginner exposes only price + production volume per product, plus company marketing spend; Standard (and, for now, Advanced) expose the full decision set. See [`src/lib/game/difficulty.ts`](../src/lib/game/difficulty.ts).
- Contextual guidance *is* shown in the UI (each decision option's effect is spelled out inline, e.g. "$40 — Somewhat low (demand ×1.40, margin $25/unit)"), plus a dedicated `/rules` reference page — this reads as "explaining the simulation's own numbers so players can strategize," not "explaining business concepts," so it doesn't conflict with the original "no tutorial content" intent below.
- Still true: no in-game *business-concept* teaching (what is gross margin, etc.) — the game is a simulation, not a course. Players are assumed to already understand the underlying business concepts.

## Persistence & accounts

- **Implemented (browser-local)**: games are saveable/resumable via `localStorage` (`src/lib/game/storage.ts`), with a "My games" list (`/solo`) to resume or delete any in-progress or completed game. This satisfies the resumability goal without a backend — real cross-device/cross-browser persistence still needs one (see below).
- **Implemented (browser-local)**: a leaderboard (`/leaderboard`, `src/lib/game/leaderboard.ts`) records every completed solo game's score in this browser, sortable by score/profit/valuation/date. Ties into the planned accounts/backend once one exists (to make it actually shared between players/devices).

## Open questions (still TBD)

- Exact industry/business flavor (what the company actually makes/sells)
- Exact scoring formula / weights for the composite score
- Randomness tuning — how frequent/severe events are, whether difficulty level affects event frequency
- Max player count edge cases, reconnect/disconnect handling in multiplayer
- Visual/UI style (dashboard vs. more game-like presentation)
- Auth provider / database choice for the backend
