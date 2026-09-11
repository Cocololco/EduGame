# EduGame — Data Model

This describes the domain types in [`src/types/game.ts`](../src/types/game.ts) — the shape of game state. It's a companion to [GAME_DESIGN.md](GAME_DESIGN.md) (the *what/why*); this doc is the *how the data fits together*. It does **not** define simulation logic (how decisions turn into results) — that's separate, future work.

## Entity overview

```
Game
├── config: GameConfig            (mode, difficulty, length, max players)
├── players: Player[]
│     ├── startingConditions      (can differ per player)
│     ├── companyStates[]         (snapshot per year: 0, 1, 2, ...)
│     ├── decisions[]             (submitted YearDecision per year)
│     ├── results[]               (simulated YearResult per year)
│     └── finalScore?             (set when the game completes)
└── market: MarketYearState[]     (shared market snapshot per year, multiplayer only)
```

A **year** is the core unit of progress. For each year `N`:

1. Every player submits a `YearDecision` for year `N`.
2. Once all players are in (see GAME_DESIGN.md's turn-pacing rule), the year is simulated:
   - In multiplayer, decisions are first aggregated into a `MarketYearState` (shared demand/price/share), since players affect each other.
   - Each player's `YearDecision` + their prior `CompanyYearState` + (in multiplayer) the `MarketYearState` + any `RandomEvent`s produce a new `YearResult`, which includes a new `CompanyYearState` (`closingState`).
3. Results and the new company state are appended to the player's `results[]` / `companyStates[]`. `Game.currentYear` advances.

This append-only, indexed-by-year structure is what makes games **resumable**: to resume, load the `Game`, find the latest year with a result, and pick up decision-collection for the next one.

## Why decisions and results are separate from company state

- `CompanyYearState` is a **snapshot** (cash, debt, capacity, quality, etc. as of a point in time) — cheap to read, used as the "current state" shown to a player before they decide.
- `YearDecision` is the **input** a player controls for one year (pricing, production, HR, finance — the four categories from the design doc).
- `YearResult` is the **output** of simulating a year: full income statement + balance sheet + ratios + market metrics + which random events hit. It embeds both the opening and closing `CompanyYearState` so a year's result is self-contained and auditable without recomputing history.

Keeping these three separate (rather than one mutable "company" blob) means past years are immutable history — useful for showing a timeline/report, and for the persistent leaderboard feature to trust final numbers.

## Solo vs. multiplayer

The same types cover both:

- **Solo**: one `Player`, `Game.market` stays empty, `MarketMetrics.marketSharePct` is left `undefined` (share of what market? — there's no competitor), and results are effectively "you vs. the simulation's demand model."
- **Multiplayer**: 2-4 `Player`s, `Game.market` gets one `MarketYearState` per year capturing aggregate demand/price and each player's share, and `MarketMetrics.marketSharePct` is populated per player per year.

## Difficulty levels

`DifficultyLevel` doesn't change the data shape — a `YearDecision` always has all four categories' fields. It's expected to change **which fields the UI prompts the player to set** (lower tiers pre-fill sensible defaults for fields they don't expose). This keeps simulation logic difficulty-agnostic. The exact field set per tier is still open (see GAME_DESIGN.md).

## Random events

`RandomEvent` is deliberately generic (`effects` is a small set of multipliers/deltas) so new event types can be added without touching the simulation's plumbing — only the logic that interprets `effects`. Events can be `global` (hit the shared market/everyone) or scoped to one `player`.

## Scoring

`Score` stores the composite's inputs (`cumulativeNetProfit`, `finalValuation`, `marketShareGrowthPct`) alongside the `weights` used, not just the final number — so the breakdown can be shown to the player and the weighting can be tuned later without losing historical games' raw inputs.

## Open questions / not yet modeled

Carried over from GAME_DESIGN.md, plus data-model-specific ones:

- Exact `roiPct` base (equity vs. total assets) and the composite score's actual weight values
- Whether `CompanyYearState`/`YearResult` need per-year `id`s once this is persisted in a real database (this model assumes array-order-by-year is enough for now)
- Multiplayer reconnect/partial-submission handling — not represented yet (e.g. no "pending decision draft" type)
- Any auth/account fields beyond a bare `userId` string (deferred until the backend is built)
