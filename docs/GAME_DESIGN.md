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

**Implemented** — `/multiplayer/new`, `/multiplayer` (my games), `/multiplayer/[id]` (lobby + play + results); engine in [`src/lib/game/multiplayerEngine.ts`](../src/lib/game/multiplayerEngine.ts); see [docs/RULES.md](RULES.md)'s Multiplayer section for the exact demand math.

- **2–8 players (humans + bots)**, sharing **one market per product** — decisions actually affect each other's demand and results, via a category-leadership demand split (cheapest price / highest quality / highest brand / highest innovation each win their whole weighted share — see RULES.md), not smooth proportional attractiveness.
- Round advances once **every human has submitted** their decision for the year — bots' decisions are pre-seeded the moment it's their turn, so they never hold anything up. No timer.
- **No dedicated host role** in the sense of special ongoing powers — all players are equal once in — but whoever creates the game does configure it upfront (years, difficulty, total players, bot count), and any joined player can hit "Start" to close the lobby early.
- A game's own URL (`/multiplayer/<id>`) doubles as its invite link — human seats fill on a first-come basis up to the configured count; bots fill any remaining reserved seats the moment the game starts.
- **Bots**: 3 fixed heuristic personalities (aggressive/premium/balanced — see RULES.md), not adaptive to rivals. Good enough to fill a table, not real opponents.
- Starting conditions are currently identical for every player — the idea of asymmetric starts (randomized or role-based) is still just an idea, not built.
- Game length is configurable at creation, same as solo.
- **Sign-in**: a display name only, stored per-browser (`src/lib/identity.ts`) — no password, no server session. The server trusts whatever `userId` a request sends. A deliberate, documented tradeoff: appropriate for a personal game with no sensitive data, not something to build a public product on. Real accounts are still future work (see "Open questions").
- **Persistence**: multiplayer game state lives server-side as one JSON file per game (`src/lib/server/gameStore.ts`) — the first real backend state this repo has, since two different browsers need to share it (solo games are unaffected, still localStorage-only). On the deployed VPS this is a mounted Docker volume so it survives redeploys — see [docs/DEPLOYMENT.md](DEPLOYMENT.md).

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

**International expansion (implemented)** — per-product and company-wide decisions, gated to the **Advanced** difficulty tier (see "Difficulty / complexity levels" below): per-product **price per country** (override the default price independently for each licensed country — real price discrimination), per-product **open a factory** (adds an additional manufacturing base in one of the 5 countries, on top of any this product already runs — free to reuse a country the company's already opened elsewhere, otherwise a one-time cost; all of a product's factories still share one employees/wages/capacity pool, with the wage bill weighted by each factory's share of the year's production), company-wide **license purchase** (the only way to get any demand from a country — no license, zero demand there; one per year) and company-wide **market research purchase** (reveals a country's customer-preference weights in the UI; purely informational, the simulation always uses the real numbers — any number of countries in the same year). Full mechanics in [docs/RULES.md](RULES.md); country catalog and reasoning in [docs/REGIONS_DESIGN.md](REGIONS_DESIGN.md).

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

- **Implemented**: Beginner exposes only price + production volume per product, plus company marketing spend; Standard expose the full decision set except international expansion; Advanced additionally exposes factory relocation/licenses/market research. See [`src/lib/game/difficulty.ts`](../src/lib/game/difficulty.ts).
- Contextual guidance *is* shown in the UI (each decision option's effect is spelled out inline, e.g. "$40 — Somewhat low (demand ×1.40, margin $25/unit)"), plus a dedicated `/rules` reference page — this reads as "explaining the simulation's own numbers so players can strategize," not "explaining business concepts," so it doesn't conflict with the original "no tutorial content" intent below.
- Still true: no in-game *business-concept* teaching (what is gross margin, etc.) — the game is a simulation, not a course. Players are assumed to already understand the underlying business concepts.

## Persistence & accounts

- **Implemented (browser-local)**: games are saveable/resumable via `localStorage` (`src/lib/game/storage.ts`), with a "My games" list (`/solo`) to resume or delete any in-progress or completed game. This satisfies the resumability goal without a backend — real cross-device/cross-browser persistence still needs one (see below).
- **Implemented (browser-local)**: a leaderboard (`/leaderboard`, `src/lib/game/leaderboard.ts`) records every completed solo game's score in this browser, sortable by score/profit/valuation/date. Ties into the planned accounts/backend once one exists (to make it actually shared between players/devices).

## Open questions (still TBD)

- Exact scoring formula / weights for the composite score
- Randomness tuning — how frequent/severe events are, whether difficulty level affects event frequency
- What happens if a player disconnects/never comes back mid-multiplayer-game — right now the game just waits on them forever; no timeout, no way to remove/replace a stalled player
- Real accounts (password/OAuth) if this ever needs to be more than "trust the userId a request sends" — see `src/lib/identity.ts`'s docstring for the current tradeoff
- Database choice if the file-per-game JSON store (`src/lib/server/gameStore.ts`) ever needs to scale past "a personal project with a handful of concurrent games"
