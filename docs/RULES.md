# EduGame — How the Simulation Works

A plain-language reference for the numbers behind the game, so you can reason about decisions instead of guessing. Matches the current constants in [`src/lib/simulation/constants.ts`](../src/lib/simulation/constants.ts), the product catalog in [`products.ts`](../src/lib/simulation/products.ts), and starting conditions in [`initialState.ts`](../src/lib/simulation/initialState.ts) — if those change, this doc is stale until updated. **Balanced by calculation and one full 5-year playtest, not yet extensively played** — say so if something feels off.

**The single most important rule: this year's investment (marketing, quality, training, R&D, hiring) pays off *next* year, not this one.** Demand for the year you're deciding uses quality/brand/productivity/innovation as they stood at the *start* of the year (last year's closing numbers), not the spend you're about to make. Price is the exception — it affects this year's demand immediately.

## The company

You run a surfboard company with **three product lines**, each with its own price, production, staffing, quality and training decisions:

| Product | Reference price | Unit cost | Market size (baseline demand) |
|---|---|---|---|
| Shortboard | $50 | $15 | 1,800 units/yr — mass market |
| Longboard | $110 | $30 | 900 units/yr — mid-market |
| Luxury Fishboard | $350 | $150 | 300 units/yr — niche |

**Marketing (brand awareness), R&D (innovation), and financing (loans/capex) are company-wide** — one shared lever affecting all three product lines, not per-product.

## Starting position (solo, default)

$80,000 cash, $0 debt, brand 30/100, innovation 0/100, morale 70/100. Each product starts at its reference price, quality 50/100, productivity 50/100, with headcount/capacity roughly matched to what it can sell at those defaults:

| Product | Employees | Wage/employee | Capacity |
|---|---|---|---|
| Shortboard | 6 | $2,500/yr | 900 units |
| Longboard | 3 | $2,500/yr | 450 units |
| Fishboard | 1 | $2,500/yr | 150 units |

## Pricing & demand

Price reacts sharply against a product's own reference price (elasticity 1.5):

| Price vs. reference | Demand multiplier | Read as |
|---|---|---|
| 0.4× | ×3.95 | very low, floods demand |
| 0.6× | ×2.15 | low |
| 0.8× | ×1.40 | somewhat low |
| 1.0× (reference) | ×1.00 | neutral |
| 1.2× | ×0.76 | somewhat high |
| 1.4× | ×0.60 | high |
| 2.0× | ×0.35 | extreme |

That multiplier applies to the product's own baseline demand (table above), further scaled by its **effective quality** and the company's **brand awareness** (below), then capped by whichever is lower of its production capacity and what its current staff can run.

**Worked example** — default state, all three lines producing flat-out at capacity, no other spend:

| Product | Units sold | Revenue | Gross profit |
|---|---|---|---|
| Shortboard | 900 (capacity-capped) | $45,000 | $31,500 |
| Longboard | 450 (capacity-capped) | $49,500 | $36,000 |
| Fishboard | 150 (capacity-capped) | $52,500 | $30,000 |
| **Total** | | **$147,000** | **$97,500** |

After $1,000 marketing, $25,000 total wages, and $20,000 fixed overhead: **net profit $51,500** (35% margin). That's the baseline "did nothing clever" outcome — good decisions should beat it.

**Known balance note:** elasticity above 1 means cutting price is revenue-positive when capacity isn't the constraint. Capacity moderates this at normal levels, but a maxed-out capacity + very low price combo can still look artificially strong.

## Quality, productivity, brand, innovation — the four things that raise demand

Each product's **effective quality** for demand = `quality + productivity × 0.2 + innovation × 0.15` (clamped 0-100). That combines:

- **Quality** (0-100, per product): raised by quality investment, $200 → +1 point next year.
- **Productivity** (0-100, per product): raised by training spend, $100 → +1 point next year — see "Wages & training" below, it also drives labor capacity. **Decays 15%/year if you stop training** (`new = old × 0.85 + spend/100`) — a fresh company's productivity drifts from 50 toward 0 over a few untrained years, quietly shrinking how many people you can effectively staff.
- **Brand awareness** (0-100, company-wide): raised by marketing spend, $150 → +1 point next year, also decays 15%/year unspent.
- **Innovation** (0-100, company-wide, from R&D): raised by R&D spend, $300 → +1 point next year, decays slower (10%/year) — R&D knowledge sticks around longer than a marketing campaign's buzz.

Quality/brand each contribute a demand factor of `0.5 + 0.5 × (value/100)` — 0.5× at the floor, 1.0× at the ceiling.

## Wages & training (productivity)

- **Wages** don't just cost money — they set how productive your staff is. `wage productivity factor = clamp(wageLevel / 2500, 0.6, 1.4)` — pay well below $2,500/employee and output per head drops toward 60%; pay well above and it rises toward 140% (diminishing beyond that).
- **Training** raises the same product's productivity index (above), which also feeds a `0.5 + 0.5 × (productivity/100)` multiplier on labor output.
- **Labor capacity** for a product = `employees × 200 × wage-productivity-factor × training-productivity-factor`. Production is capped by **whichever is lower**: this labor capacity, or the product's physical production capacity (grown by capacity investment). At default wage/productivity (both neutral, factor 1.0 and 0.75 respectively... actually see the exact numbers in code) headcount is sized so labor and physical capacity roughly match — neither is the sole bottleneck at the start.
- **Firing an entire product line's staff means it produces and sells nothing** next year, regardless of physical capacity — confirmed by a dedicated regression test.
- Firing costs 5 morale points/employee (company-wide morale stat); a wage raise/cut nudges morale by its percentage.
- ⚠️ **Morale itself has no other gameplay effect yet** — it's tracked and moved by fires/wage changes/events, but doesn't feed back into production, quality, or demand. A placeholder for a future mechanic.

## R&D (innovation)

Company-wide, two effects:

1. Adds to **every product's** effective quality (weight 0.15 per innovation point — see the formula above).
2. **Reduces the cost of capacity investment company-wide**: `effective $/unit = 10 × max(0.5, 1 − innovation × 0.005)` — at innovation 100, capacity investment costs half as much per unit added.

## Capacity investment

$10/unit of physical capacity next year (before R&D discount) — per product. Not your bottleneck if labor capacity is lower; check the company-status table's "Staffed / Capacity" column, which flags in amber when staffing (not the plant) is the real ceiling.

## Finance

- **Loans**: +$X cash and +$X debt immediately; interest (8%/year) is charged on your debt as it stood at the *start* of the year, so a new loan doesn't cost interest until next year.
- **Loan repayment**: reduces debt (and cash) now.
- **Other capex**: adds to fixed assets, depreciating 10%/year — no other effect.

## Overhead, depreciation, cash

- Fixed overhead: **$20,000/year**, company-wide, regardless of scale (bigger than the old single-product game's $2,500 — there's three product lines' worth of business now).
- Depreciation: 10%/year of fixed-assets book value.
- ⚠️ Cash can go negative with no bankruptcy consequence yet.

## Random events

Each year: an independent 25% chance of a market-wide ("global") event and a 25% chance of an event that hits **one randomly-chosen product line** only (not the whole company). Roughly a 44% chance something fires in a given year.

| Event | Scope | Effect |
|---|---|---|
| Economic downturn | company-wide | demand ×0.8, all products |
| Positive demand shock | company-wide | demand ×1.2, all products |
| Negative demand shock | company-wide | demand ×0.85, all products |
| Cost inflation | company-wide | unit cost ×1.1, all products |
| Regulatory change | company-wide | unit cost ×1.05, −$2,000 cash |
| Demand surge | one product | demand ×1.4 |
| Supply disruption | one product | unit cost ×1.15 |
| Competitor price war | one product | effective price capped at ×0.95 of what you set |

## Difficulty levels

- **Beginner**: only price and production volume are exposed per product, plus marketing company-wide. Everything else (capacity/quality/training investment, hiring, wage changes, R&D, loans, capex) stays at its default (usually 0/no-op).
- **Standard**: the full decision set above.
- **Advanced**: same as Standard for now.

The underlying decision shape never changes by difficulty — only what the UI prompts you to touch (see [docs/DATA_MODEL.md](DATA_MODEL.md)).

## Scoring

`compositeScore = cumulativeNetProfit × 0.001 + finalValuation × 0.001` (the market-share-growth term only applies in multiplayer). Every $1,000 of total profit across the game is worth 1 point, same for final equity. Placeholder weights, not balanced (see [docs/GAME_DESIGN.md](GAME_DESIGN.md)). Completed solo games are recorded to the local [leaderboard](../src/app/leaderboard/page.tsx).
