# EduGame — International Expansion (Regions/Factories/Transport/Licenses)

**Status: implemented.** This was originally written as a spec before any of it was built (see git history if you want the "not yet built" version); it now describes the shipped system — engine (`src/lib/simulation/countries.ts`, `simulateYear.ts`), decisions/UI (`decisionOptions.ts`, `CompanyDecisionPanel`/`ProductDecisionPanel`/`CompanyStatusPanel`), and bots (`botAi.ts`, licenses only — see that file for why bots skip market research). The one piece still deferred per the build order below: a per-country breakdown on the financials page (it currently only breaks down by product).

This is a concrete spec for selling into multiple countries, each with its own customer preferences, labor costs, and a license requirement — plus factories, transport cost, and paid market research. It was written up in enough detail to build directly from, because it was a genuinely large addition (comparable in size to the multiplayer backend or the demand-model rewrite — each shipped as its own milestone) and rushing it alongside those risked destabilizing two systems that were solid and tested at the time.

## Why this wasn't just bolted on

Every other mechanic in the game so far is scoped at the *company* or *product* level. Regions cut across both: a product's price is presumably still one number (players don't want to set 15 prices — 3 products × 5 countries), but *where that product sells* and *what it costs to make* both become per-country. That means:

- `ProductLineState` (currently one snapshot per product) needs a *per-country* dimension for at least: which countries you're licensed in, and where you manufacture.
- Demand allocation (`simulateMultiplayerYear`'s category system) needs to run *per country per product*, not just per product — a shortboard sold into price-driven France and quality-driven Australia should get different treatment.
- The decision form gains at least two new categories (licenses, factories) and the "which countries can I even see information for" fog-of-war state.
- The financials page needs a per-country breakdown alongside the existing per-product one.

None of that is a one-file change — it's the same shape of work as the multiplayer backend, just in a different layer.

## Country catalog

Five countries, matching the ask. Values below are placeholders in the same spirit as the rest of the game's constants (documented, tunable, not yet playtested):

| Country | Labor cost multiplier | Demand multiplier, year 1 (Short / Long / Fish) | Demand growth/yr | Price weight | Quality weight | Brand weight | Innovation weight |
|---|---|---|---|---|---|---|---|
| France (start) | 1.4× (high — Western European labor cost) | 1.3 / 1.1 / 0.7 (established, mature surf market — Hossegor/Biarritz — skews toward mass-market entry boards) | 0% (mature, saturated) | 35 | 30 | 25 | 10 |
| Morocco | 0.5× (low) | 0.7 / 0.4 / 0.2 (smaller, emerging surf destination — Taghazout etc. — budget/backpacker demand, almost no luxury) | +2%/yr (steadily emerging) | 55 | 15 | 20 | 10 |
| Portugal | 0.7× (low-medium) | 1.3 / 1.2 / 0.9 (genuinely one of the world's top surf destinations right now — Nazaré, Peniche, Ericeira — real, strong demand across the board with a growing competitive/quality-conscious segment) | +2.5%/yr (already strong, still rising fast) | 40 | 25 | 25 | 10 |
| China | 0.35× (very low — the world's manufacturing hub, cheapest place to build) | 0.5 / 0.35 / 0.1 (surfing is a real but small/emerging niche there — e.g. Hainan Island — nowhere near the demand density of an established surf culture, despite the huge general population; what demand exists skews toward cheap entry boards, with essentially no domestic luxury-board culture yet) | +5%/yr (growing fastest off the tiniest base — still small in absolute terms for years) | 65 | 15 | 15 | 5 |
| Australia | 1.05× (medium-high, developed economy, but not as high as France) | 1.4 / 1.5 / 1.6 (one of the largest surf cultures/markets in the world — affluent and status-conscious enough that the niche fishboard line actually does relatively BETTER than the mass-market lines) | +1%/yr (already the largest/most mature, still growing slowly) | 25 | 30 | 30 | 15 |

Grounded in how these places actually relate to surfing and manufacturing, not just the shorthand from the original ask — cheapest-to-build (China) and biggest-demand (Australia) are deliberately different countries, so "build cheap, sell into the big market" requires an actual factory-plus-transport decision rather than one country dominating on every axis.

**Demand size is per-product, not one flat country-wide number** (`CountryDefinition.demandMultiplierByProduct`) — a country's real surf market skews toward mass-market entry boards or the premium/niche line differently (e.g. Morocco/China lean hard toward cheap entry boards with almost no luxury demand; Australia is the one country where the niche fishboard line does relatively better than the mass-market ones). Customer *preferences* (the price/quality/brand/innovation weight columns) stay one profile per country rather than 15 hand-tuned product-country pairs — see "Blending" below for why that's still enough to make preferences feel product-specific in practice.

**Demand size also compounds year over year** (`CountryDefinition.demandGrowthRatePerYear`) — a deliberately *slow, deterministic* trend rather than randomness, so it's plannable: `effectiveDemandMultiplier() = demandMultiplierByProduct[product] × (1 + demandGrowthRatePerYear)^yearsElapsed`, where `yearsElapsed = decision.year - 1` (year 1 gets the raw catalog value unchanged). Mature markets (France, mostly Australia) barely move over a game's lifetime; emerging ones — especially China off its tiny base — become meaningfully bigger the longer the game runs, rewarding an early foothold. This was deliberately *not* built as a random per-year event (the alternative considered): the existing random-events system already injects year-to-year unpredictability elsewhere, so a country's underlying growth trajectory stays a stable thing a player can actually plan around.

`demandWeightProfile` per country follows the exact same shape as `ProductDefinition.demandWeights` (see `src/types/game.ts` / `src/lib/simulation/simulateYear.ts`'s `allocateDemandShares`) — deliberate, so the blending rule below is simple.

## Blending product preference with country preference

A product already has its own `demandWeights` (e.g. fishboard is quality-driven). A country has its own. The simplest coherent combination: **average the two, per category, then renormalize to sum 100.**

```
effectiveWeight[category] = (productWeight[category] + countryWeight[category]) / 2
```

So a luxury fishboard sold into brand-conscious Australia leans hard into brand/quality; the same fishboard sold into price-driven Morocco gets pulled toward price mattering more than it would in isolation — without needing a separate weight table per product-country pair (which would be 3 × 5 = 15 profiles to hand-tune).

## Total demand pool, per product per country

```
countryProductPool = product.baseDemandUnits × country.demandMultiplierByProduct[productId] × numPlayers (multiplayer) or × 1 (solo, unaffected by any of this)
```

Then `allocateDemandShares` (already built) runs once per (product, country) pair using the blended weights above, among whichever players are actually licensed to sell that product into that country (unlicensed players don't compete for — or receive — that pool at all).

## Licenses

A one-time (not annual) company-wide purchase per country: `buyLicense(countryId)`, a flat cost (placeholder: $5,000–$50,000 scaled to that country's market size — France, the free starting country, needs no license; the rest do). Persisted as `CompanyYearState.licensedCountries: CountryId[]`. No license into a country = zero demand allocation there for every product, full stop — not just a penalty.

## Factories

Start with one in France (already implicitly true — all current wage/capacity numbers are unqualified). Opening a factory elsewhere: a capex-like one-time cost + it becomes available as a manufacturing base with *that country's* labor cost multiplier applied to wages for staff "assigned" there. This is the part that most changes `ProductLineState`: employees/wages would need to become per-factory, or (simpler alternative) the game keeps ONE workforce per product line but lets the player pick which factory-country it's based in, with wage costs scaled by that country's multiplier and a transport surcharge applied to sales into every *other* country. That simpler version avoids a full per-factory headcount split and is the one worth prototyping first.

## Transport cost

A flat $/unit surcharge on COGS when a unit is sold into a country other than the one it was manufactured in. Simplest workable version: a single flat rate (e.g. +$5/unit) rather than a full 5×5 distance matrix — the ask mentions "a transport cost to send material from each country to another," and a full matrix is easy to add later once the flat version is proven out, without being a prerequisite for a playable first version.

## Market research (fog of war)

Country weight profiles are hidden in the UI until researched — except the country the game tells you about for free in year 1 (per the ask: "at the start of a game we tell you the marketing information for year 1 for country 1"). A `researchCountry(countryId)` decision (flat cost, e.g. $2,000) reveals that country's weight profile in the UI from then on. Important: **this is a UI-only information gate, not an engine gate** — the simulation always uses the real weights when computing results; researching just tells the player what they already implicitly experience through outcomes, so an un-researched country isn't literally unplayable, just harder to strategize around deliberately.

## Build order (as actually built)

1. ✅ Country catalog + types (`Country`, `CountryId`, `blendDemandWeights()`) — `src/lib/simulation/countries.ts`, tested in `simulateYear.test.ts`.
2. ✅ Licenses (company decision + gate) — zero demand from an unlicensed country, full stop.
3. ✅ Per-country demand allocation — solo sums demand across every licensed country (`computeSoloCountryDemand`); multiplayer runs the category system per (product, country) pair among only the players licensed there (`simulateMultiplayerYear`).
4. ✅ Factories + labor cost + transport surcharge — `ProductLineState.factoryCountry`, `TRANSPORT_COST_PER_UNIT`, one workforce per product wherever its factory currently is (the simpler alternative this doc originally suggested prototyping first, rather than a full per-factory headcount split).
5. ✅ Market research / fog-of-war UI — `CompanyStatusPanel`'s international table hides a country's weights until researched (or it's France).
6. ✅ Decision UI (`ProductDecisionPanel`'s factory-relocation select, `CompanyDecisionPanel`'s license/research selects) and RULES.md updated to match.
7. ⬜ **Still deferred**: a per-country breakdown on the financials page — it only breaks down by product today. Worth doing once it's clear players actually want to see it broken out that way, rather than speculatively.

Bots (`src/lib/game/botAi.ts`) license countries (fixed order: Portugal, Australia, Morocco, China — biggest real markets before cheap manufacturing bases; capped at a fraction of current cash per personality) but never buy research — research is a UI-only reveal for humans, and a bot's code already "knows" the real weights, so spending on it would be pure waste. Bots also never relocate factories, a bigger and riskier commitment left for a human to weigh deliberately.
