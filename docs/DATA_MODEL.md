# EduGame — Data Model

This describes the domain types in [`src/types/game.ts`](../src/types/game.ts) — the shape of game state. It's a companion to [GAME_DESIGN.md](GAME_DESIGN.md) (the *what/why*); this doc is the *how the data fits together*. It does **not** define simulation logic (how decisions turn into results) — see [`src/lib/simulation/simulateYear.ts`](../src/lib/simulation/simulateYear.ts) and [RULES.md](RULES.md) for that.

## Products

The company has **three product lines** (`ProductId`: `shortboard` | `longboard` | `fishboard`). `ProductDefinition` (in [`products.ts`](../src/lib/simulation/products.ts)) holds each one's static config (reference price, unit cost, baseline demand) — not part of game state, since it never changes mid-game.

## Entity overview

```
Game
├── config: GameConfig               (mode, difficulty, length, max players)
├── players: Player[]
│     ├── startingConditions         (company-wide + per-product; can differ per player)
│     ├── companyStates[]            (snapshot per year: 0, 1, 2, ...)
│     │     └── products: Record<ProductId, ProductLineState>
│     ├── decisions[]                (submitted YearDecision per year)
│     │     ├── company: CompanyDecision            (marketing, R&D, financing)
│     │     └── products: Record<ProductId, ProductDecision>
│     ├── results[]                  (simulated YearResult per year)
│     │     └── incomeStatement.byProduct: ProductYearResult[]
│     └── finalScore?                (set when the game completes)
└── market: MarketYearState[]        (shared market snapshot per year, multiplayer only)
```

A **year** is the core unit of progress. For each year `N`:

1. Every player submits a `YearDecision` for year `N` — a `CompanyDecision` (company-wide: marketing, R&D, loans, capex) plus one `ProductDecision` per product line (price, production, capacity/quality/training investment, hiring, wages).
2. Once all players are in, the year is simulated per product (in multiplayer, decisions are first aggregated per product into shared demand/share, since players affect each other on each line independently), then rolled up into one company-wide `YearResult` — full income statement (with a `byProduct` breakdown) + balance sheet + ratios + which random events hit, plus a new `CompanyYearState` (`closingState`).
3. Results and the new company state are appended to the player's `results[]` / `companyStates[]`. `Game.currentYear` advances.

This append-only, indexed-by-year structure is what makes games **resumable**: to resume, load the `Game`, find the latest year with a result, and pick up decision-collection for the next one.

## Why decisions and results are separate from company state

- `CompanyYearState` is a **snapshot** (cash, debt, brand, innovation, morale, and each product's price/capacity/employees/quality/productivity/inventory as of a point in time) — cheap to read, used as "current state" shown to a player before they decide.
- `YearDecision` is the **input** a player controls for one year, split into one company-wide `CompanyDecision` and three `ProductDecision`s.
- `YearResult` is the **output** of simulating a year: full income statement (with a per-product breakdown, `byProduct: ProductYearResult[]`) + balance sheet + ratios + which random events hit. It embeds both the opening and closing `CompanyYearState` so a year's result is self-contained and auditable without recomputing history.

Keeping these three separate (rather than one mutable "company" blob) means past years are immutable history — used by the year-navigable financials page (`/solo/play/[id]/financials`) and the leaderboard to trust final numbers without recomputation.

## Solo vs. multiplayer

The same types cover both, but they live in different places:

- **Solo**: one `Player`, `Game.market` stays empty, `ProductYearResult.marketSharePct` is left `undefined` (share of what market? — there's no competitor). Persisted client-side only, in `localStorage` (`src/lib/game/storage.ts`) — a solo game never leaves the browser that created it.
- **Multiplayer**: 2-8 `Player`s (humans + bots), `Game.market` gets one `MarketYearState` per year capturing an aggregate demand/price summary (using the shortboard line as the representative figure), and each `ProductYearResult.marketSharePct` is populated per player per product per year — demand is split per-product by **category leadership** (cheapest price / highest quality / highest brand / highest innovation each win their whole weighted share — see [`allocateDemandShares`](../src/lib/simulation/simulateYear.ts) and RULES.md), not a smooth proportional blend. Persisted **server-side**, one JSON file per game (`src/lib/server/gameStore.ts`) — the only server-held state in this codebase, since two different browsers need to see the same game.

Two `Player` fields exist only for multiplayer:

- `isBot` / `botPersonality`: bots are regular `Player` entries (added when the host starts the game, via [`src/lib/game/multiplayerEngine.ts`](../src/lib/game/multiplayerEngine.ts)'s `startMultiplayerGame`), decided each year by [`src/lib/game/botAi.ts`](../src/lib/game/botAi.ts) rather than a human submitting through the UI.
- `pendingDecision`: a player's submitted-but-not-yet-resolved decision for the *current* year (shape: `YearDecisionInput`, the same "draft" type solo's decision form already used). Once every player has one set, the engine builds each into a real `YearDecision`, runs `simulateMultiplayerYear`, appends the results to everyone via `applyYearResultToPlayer` (shared with solo — see [`yearResolution.ts`](../src/lib/game/yearResolution.ts)), and clears `pendingDecision` — except bots get a fresh one seeded immediately for the next year, so they're never the reason a year doesn't resolve.

`GameConfig.numBots` is fixed at game creation; human seats = `maxPlayers - numBots`. `GameStatus.setup` is the lobby — humans join via the game's own URL as the invite link, until the host starts it (which is when bots actually get added, not at creation).

## Difficulty levels

`DifficultyLevel` doesn't change the data shape — a `YearDecision` always has the full `CompanyDecision` + all three `ProductDecision`s. What changes is **which fields the UI exposes** (see [`src/lib/game/difficulty.ts`](../src/lib/game/difficulty.ts)): Beginner shows only price/production per product plus company marketing; Standard (and, for now, Advanced) show everything. Fields not shown stay at their form default (usually 0/no-op), so simulation logic never special-cases a tier.

## Random events

`RandomEvent` is deliberately generic (`effects` is a small set of multipliers/deltas, plus an optional `productId`) so new event types can be added without touching the simulation's plumbing. Events are `global` (company-wide, hit every product) or `player`-scoped — and player-scoped events additionally pick **one random product** to target via `effects.productId`, rather than hitting the whole company.

## Leaderboard

`LeaderboardEntry` is a flat, denormalized snapshot (player/company name, date, years, difficulty, net profit, valuation, composite score) written once when a solo game completes (see [`src/lib/game/leaderboard.ts`](../src/lib/game/leaderboard.ts)) — intentionally not a reference back into `Game`, so the leaderboard keeps working even if the underlying game save is later deleted.

## Scoring

`Score` stores the composite's inputs (`cumulativeNetProfit`, `finalValuation`, `marketShareGrowthPct`) alongside the `weights` used, not just the final number — so the breakdown can be shown to the player and the weighting can be tuned later without losing historical games' raw inputs.

## Open questions / not yet modeled

Carried over from GAME_DESIGN.md, plus data-model-specific ones:

- **Regions** (countries/factories/transport/licenses) — fully specified in [REGIONS_DESIGN.md](REGIONS_DESIGN.md), not built; would touch `ProductLineState`, decisions, and demand allocation all at once
- Exact `roiPct` base (equity vs. total assets) and the composite score's actual weight values
- Whether `CompanyYearState`/`YearResult` need per-year `id`s once this is persisted in a real database (this model assumes array-order-by-year is enough for now)
- Multiplayer disconnect/never-comes-back handling — a game just waits forever on a missing `pendingDecision`, no timeout or player-removal path
- Any auth/account fields beyond a bare `userId` string (deferred — see `src/lib/identity.ts`'s docstring for the current tradeoff)
- No schema version tag on `Game` — both persistence layers (`src/lib/game/storage.ts` for solo, `src/lib/server/gameStore.ts` for multiplayer) share a structural compatibility check (`src/lib/game/gameSchema.ts`, checking that `products` exists on the first company state) rather than an explicit version field; that check would need updating (or a real version field added) before the shape changes again
