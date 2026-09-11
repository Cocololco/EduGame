# EduGame — Game Design

Design decisions for the business-management simulation, as defined so far. This is a living document — update it as decisions change or get more specific.

**Audience:** personal project for the creator and a small group of friends/family (not a classroom/educational tool) — inspired by a similar business simulation played at university.

## Premise

The player is the owner/manager of a company in **one fixed industry** (manufacturing/retail-style; exact industry TBD). Each round represents **one business year**: the player makes a set of decisions, then the year is simulated and results are revealed.

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

Four categories, all in scope:

- **Pricing & sales** — product price, marketing/sales spend, target market
- **Production & operations** — production volume, capacity, quality, supply chain
- **HR & staffing** — hiring/firing, wages, training, morale
- **Finance & investment** — loans, investments, R&D spend, capex

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

- Game supports **difficulty levels** — e.g. a Beginner tier exposing a reduced decision set, Advanced unlocking the full pricing/production/HR/finance depth.
- No in-game teaching content (no tooltips/explanations) — the game is a **pure simulation**, not a tutorial. Players are assumed to already understand the underlying business concepts.

## Persistence & accounts

- Games must be **saveable and resumable** across sessions (e.g. picking a game back up on another day) — requires backend game-state persistence per player/session.
- **Persistent leaderboards** across games (e.g. all-time rankings among the regular players) — ties into the planned accounts/backend.

## Open questions (still TBD)

- Exact industry/business flavor (what the company actually makes/sells)
- Exact scoring formula / weights for the composite score
- Randomness tuning — how frequent/severe events are, whether difficulty level affects event frequency
- Max player count edge cases, reconnect/disconnect handling in multiplayer
- Visual/UI style (dashboard vs. more game-like presentation)
- Auth provider / database choice for the backend
