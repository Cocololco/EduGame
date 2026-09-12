# EduGame — International Expansion (Regions/Factories/Transport/Licenses) — Design, Not Yet Built

This is a concrete spec for the requested next layer: selling into multiple countries, each with its own customer preferences, labor costs, and a license requirement — plus factories, transport cost, and paid market research. **None of this is implemented yet.** It's written up in enough detail to build directly from, because it's a genuinely large addition (comparable in size to the multiplayer backend or the demand-model rewrite — each shipped as its own milestone) and rushing it alongside those risked destabilizing two systems that are now solid and tested. This doc is the honest alternative to a half-working version.

## Why this wasn't just bolted on

Every other mechanic in the game so far is scoped at the *company* or *product* level. Regions cut across both: a product's price is presumably still one number (players don't want to set 15 prices — 3 products × 5 countries), but *where that product sells* and *what it costs to make* both become per-country. That means:

- `ProductLineState` (currently one snapshot per product) needs a *per-country* dimension for at least: which countries you're licensed in, and where you manufacture.
- Demand allocation (`simulateMultiplayerYear`'s category system) needs to run *per country per product*, not just per product — a shortboard sold into price-driven France and quality-driven Australia should get different treatment.
- The decision form gains at least two new categories (licenses, factories) and the "which countries can I even see information for" fog-of-war state.
- The financials page needs a per-country breakdown alongside the existing per-product one.

None of that is a one-file change — it's the same shape of work as the multiplayer backend, just in a different layer.

## Country catalog

Five countries, matching the ask. Values below are placeholders in the same spirit as the rest of the game's constants (documented, tunable, not yet playtested):

| Country | Labor cost multiplier | Demand multiplier | Price weight | Quality weight | Brand weight | Innovation weight |
|---|---|---|---|---|---|---|
| France (start) | 1.4× (high — Western European labor cost) | 1.1× (established, mature surf market — Hossegor/Biarritz) | 35 | 30 | 25 | 10 |
| Morocco | 0.5× (low) | 0.5× (smaller, emerging surf destination — Taghazout etc.) | 55 | 15 | 20 | 10 |
| Portugal | 0.7× (low-medium) | 1.2× (genuinely one of the world's top surf destinations right now — Nazaré, Peniche, Ericeira — real, strong demand) | 40 | 25 | 25 | 10 |
| China | 0.35× (very low — the world's manufacturing hub, cheapest place to build) | 0.4× (surfing is a real but small/emerging niche there — e.g. Hainan Island — nowhere near the demand density of an established surf culture, despite the huge general population; low but not "almost zero" — worth entering cheaply, not worth over-relying on) | 65 | 15 | 15 | 5 |
| Australia | 1.05× (medium-high, developed economy, but not as high as France) | 1.5× (one of the largest surf cultures/markets in the world) | 25 | 30 | 30 | 15 |

Grounded in how these places actually relate to surfing and manufacturing, not just the shorthand from the original ask — cheapest-to-build (China) and biggest-demand (Australia) are deliberately different countries, so "build cheap, sell into the big market" requires an actual factory-plus-transport decision rather than one country dominating on every axis.

`demandWeightProfile` per country follows the exact same shape as `ProductDefinition.demandWeights` (see `src/types/game.ts` / `src/lib/simulation/simulateYear.ts`'s `allocateDemandShares`) — deliberate, so the blending rule below is simple.

## Blending product preference with country preference

A product already has its own `demandWeights` (e.g. fishboard is quality-driven). A country has its own. The simplest coherent combination: **average the two, per category, then renormalize to sum 100.**

```
effectiveWeight[category] = (productWeight[category] + countryWeight[category]) / 2
```

So a luxury fishboard sold into brand-conscious Australia leans hard into brand/quality; the same fishboard sold into price-driven Morocco gets pulled toward price mattering more than it would in isolation — without needing a separate weight table per product-country pair (which would be 3 × 5 = 15 profiles to hand-tune).

## Total demand pool, per product per country

```
countryProductPool = product.baseDemandUnits × country.demandMultiplier × numPlayers (multiplayer) or × 1 (solo, unaffected by any of this)
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

## Suggested build order, if/when this gets picked up

1. Country catalog + types (`Country`, `CountryId`, blending helper) — no gameplay effect yet, just data + a pure `blendWeights()` function with tests, mirroring how `allocateDemandShares` was built and tested first.
2. Licenses (company decision + gate) — smallest, most self-contained piece; makes "which countries can I even sell into" a real decision before touching demand math.
3. Per-country demand allocation (multiplayer only, same as the existing category system) — the biggest engine change; solo mode can plausibly skip per-country demand entirely and just use a single blended "home market" figure, deferring full solo complexity.
4. Factories + labor cost + transport surcharge — the biggest state-shape change; do this only after 1–3 are solid, since it's the part most likely to need revisiting once real numbers are tried.
5. Market research / fog-of-war UI — purely additive once the weights exist to hide.
6. Update the decision UI, financials page (per-country breakdown), and RULES.md to match at each step — same discipline as everything else in this codebase (constants and their prose docs kept in lockstep).

Each step above is roughly its own session-sized chunk, similar to how the demand-model rewrite and the multiplayer backend were each handled as their own milestone today.
