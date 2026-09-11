# EduGame — How the Simulation Works

A plain-language reference for the numbers behind the game, so you can actually reason about decisions instead of guessing. Matches the current constants in [`src/lib/simulation/constants.ts`](../src/lib/simulation/constants.ts) and [`initialState.ts`](../src/lib/simulation/initialState.ts) — if those change, this doc is stale until updated. **Balanced by calculation, not yet by real play** — the worked examples below check out mathematically (and are covered by `npm test`), but nobody's put a full multi-year game through its paces yet. If it still feels off after playing, that's useful signal — say so.

**The single most important rule: this year's marketing/quality spend pays off *next* year, not this one.** Demand for the year you're deciding is calculated from your quality and brand awareness as they stood at the *start* of the year (i.e. last year's closing numbers) — not from the investment you're about to make. So if you plow $5,000 into marketing this year, don't expect it to move this year's sales; it raises brand awareness for next year's demand calculation instead. Price is the exception — the price you set this year affects this year's demand immediately.

## Starting position (solo, default)

$50,000 cash, $0 debt, 6 employees at $2,500/year each, production capacity 1,200 units/year, price $50, quality 50/100, brand awareness 30/100, morale 70/100.

These numbers are sized against the cost/demand constants below so that a **reasonably-played year is profitable** — see the worked examples in each section. It's not free money: underpricing badly or overspending can still lose money, but you shouldn't need a perfect plan just to break even.

## Pricing & demand

Your unit cost to produce one item is **$15** (before any cost-inflation/supply-disruption event). The reference price is **$50** — that's "neutral": pricing exactly there doesn't boost or hurt demand.

Demand reacts sharply to price (elasticity 1.5), roughly:

| Price | Demand multiplier vs. $50 | Read as |
|---|---|---|
| $25 | ×2.83 | very low, floods demand |
| $30 | ×2.15 | low |
| $40 | ×1.40 | somewhat low |
| $50 | ×1.00 | neutral (reference) |
| $60 | ×0.76 | somewhat high |
| $70 | ×0.60 | high |
| $100 | ×0.35 | very high |

That multiplier applies to a **baseline demand of 1,800 units**, which is then also scaled by your quality and brand awareness (see below). So "how many units could I sell at this price" = `1800 × price multiplier × quality factor × brand factor`, capped by however much you actually produce (plus any carried-over unsold inventory) and by your production capacity.

**Worked example** — default starting state, producing flat-out at full capacity (1,200 units), no other decisions:

| Price | Units sold | Revenue | Net profit |
|---|---|---|---|
| $30 | 1,200 (capacity-capped) | $36,000 | **−$500** |
| $40 | 1,200 (capacity-capped) | $48,000 | **$11,500** |
| $50 | 878 (demand-capped) | $43,875 | **$12,213** |
| $60 | 668 (demand-capped) | $40,052 | **$11,539** |
| $70 | 530 (demand-capped) | $37,081 | **$10,635** |

So $40-$70 all land you roughly $10k-12k profit even with zero strategy beyond "produce as much as you can" — the game is meant to reward *good* decisions with more than that, not merely reward avoiding an accidental loss. $30 is the outlier: capacity caps how many units the lower margin can be spread across, so undercutting that hard doesn't pay off here. Elasticity is still above 1 in the underlying formula (uncapped, cutting price is revenue-positive), but capacity now keeps that from dominating at reasonable capacity levels.

## Quality & brand awareness (both 0–100)

Each contributes a factor to demand: `0.5 + 0.5 × (value / 100)`. So going from 0 → 100 only doubles that factor (0.5× at the floor, 1.0× at the ceiling) — meaningful, but not explosive on its own. At the default starting quality (50) and brand (30): quality factor 0.75, brand factor 0.65. Combined with price-at-$50 (×1.00), that's why a fresh game sells about **878 units** at $50 in year 1 (1800 × 0.75 × 0.65 × 1.00 ≈ 878) — under the 1,200 capacity, so at that price demand (not capacity) is what limits you; at lower prices (see the table above) capacity becomes the limit instead.

- **Quality investment**: $200 → +1 quality point (next year), capped at 100.
- **Marketing spend → brand awareness**: $150 → +1 brand point (next year), capped at 100. But brand awareness also **decays 15%/year** if you don't reinvest (`newBrand = oldBrand × 0.85 + spend/150`). To merely *hold* a brand score of B, you need to spend enough to offset that year's decay (`0.15 × B × 150` ≈ `22.5 × B` dollars/year) — e.g. holding brand at 30 costs roughly $675/year just to stand still; growing it costs more.
- Rough calibration for marketing spend: $100 (≈ +0.7 points before decay) barely moves anything; $1,000 (≈ +6.7 points before decay) is a meaningful early investment; $10,000 (≈ +67 points) is a huge single-year swing relative to a $50,000 starting cash pile — usually overkill unless you're deliberately going all-in on brand.

## Production & capacity

You can't produce more than **whichever of these two is lower**:

- your **production capacity** (starts at 1,200 units/year — grown by capacity investment, $10 → +1 unit next year)
- what your **current staff can run**: `employees × 200 units`. At the default 6 employees that's also 1,200 — deliberately matching capacity, so neither is the sole bottleneck out of the gate.

**This means employees aren't optional overhead — they're what lets you actually use your capacity.** Firing your whole workforce doesn't just save on wages, it caps you at producing (and selling) zero, full stop. Hiring/firing changes take effect on *next* year's production, same timing rule as marketing/quality investment — this year's headcount change doesn't unlock more output this year.

Unsold production doesn't disappear — it carries over as inventory (valued at that year's unit cost) and adds to what's available to sell next year, on top of whatever you produce then.

## HR & wages

- Wages expense = `employees × wage level`. At the default (6 employees × $2,500) that's **$15,000/year** — sized to leave room for profit against the revenue numbers above, but it still scales with headcount: hiring a lot without the revenue to back it will eat into that margin. Conversely, understaffing below `productionCapacity / 200` caps what you can produce and sell, regardless of how much capacity or demand you have — see "Production & capacity" above.
- **Firing** costs 5 morale points per employee, immediately.
- **Wage adjustment %**: a raise (+5%) costs more in wages going forward and adds morale (+1 point per 1%); a cut does the reverse.
- **Training spend**: $50 → +1 morale point.
- ⚠️ **Morale is currently tracked but has no effect on anything else** (production, quality, demand, cost) — it's a placeholder for a future mechanic. Don't sweat it strategically yet; it's cosmetic for now.

## Finance

- **Loans**: requesting $X adds $X cash and $X debt immediately. Interest (8%/year) is charged on your debt balance as it stood at the *start* of the year — so a loan taken out this year doesn't cost interest until next year.
- **Loan repayment**: reduces debt (and cash) by that amount now.
- ⚠️ **R&D spend is currently a pure cost with no modeled effect** — it reduces profit but doesn't raise quality or anything else (quality only comes from `qualityInvestment` under Production). Likely a gap worth fixing later — flagging here rather than quietly leaving it a mystery.
- **Other capex**: adds to fixed assets (which then depreciate 10%/year as an expense) — no other effect currently.

## Overhead, depreciation, cash

- Fixed overhead: **$2,500/year**, regardless of scale.
- Depreciation: **10%/year** of your fixed-assets book value (an expense, and it also reduces that asset's value).
- ⚠️ **Cash can go negative with no bankruptcy/insolvency consequence yet** — a large negative cash balance just means you're doing badly, nothing stops the game.

## Random events

Each year, there's a **25% chance** of a market-wide ("global") event and a separate, independent **25% chance** of an event that hits only you ("player"-scoped) — so most years nothing happens, but there's roughly a 44% chance at least one event fires in any given year.

| Event | Scope | Effect |
|---|---|---|
| Economic downturn | global | demand ×0.8 |
| Positive demand shock | global | demand ×1.2 |
| Negative demand shock | global | demand ×0.85 |
| Cost inflation | global | unit cost ×1.1 |
| Regulatory change | global | unit cost ×1.05, −$2,000 cash |
| Supply disruption | player | unit cost ×1.15 |
| Competitor price war | player | your effective price capped at ×0.95 of what you set |

## Scoring (solo)

`compositeScore = cumulativeNetProfit × 0.001 + finalValuation × 0.001` (the market-share-growth term only applies in multiplayer). In other words: every $1,000 of total profit across the game is worth 1 point, and every $1,000 of final equity (assets minus debt) is worth 1 point. Weights are placeholders, not balanced (see [docs/GAME_DESIGN.md](GAME_DESIGN.md)).
