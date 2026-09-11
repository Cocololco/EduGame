/**
 * Tunable simulation constants.
 *
 * These are placeholder values for an initial playable version — not
 * playtested against real play yet (see docs/GAME_DESIGN.md's open
 * questions), but they ARE calculated to make a reasonably-played year
 * profitable at DEFAULT_STARTING_CONDITIONS (see initialState.ts):
 * selling ~840-1200 units at a $50-ish price nets roughly $10k-12k profit
 * before marketing, once wages/overhead/COGS are covered. Overproducing or
 * underpricing can still lose money — see docs/RULES.md for the worked
 * numbers. Nothing else in the simulation should hardcode these numbers;
 * change them here and re-run the tests in src/lib/simulation/*.test.ts to
 * see the effect (and update docs/RULES.md + src/app/rules/page.tsx, which
 * restate some of this math in prose rather than deriving it).
 */

/** Baseline units of demand per player per year, before attractiveness/events. */
export const BASE_DEMAND_UNITS_PER_PLAYER = 1800;

/** Price at which the price-attractiveness factor is neutral (1.0). */
export const REFERENCE_PRICE = 50;

/**
 * How sharply demand reacts to price above/below REFERENCE_PRICE.
 * NOTE: at values > 1 (elastic demand), revenue = price * demand is
 * monotonically decreasing in price with capacity unconstrained — i.e. the
 * model currently rewards racing price toward zero. Real balancing will
 * need a cost floor / capacity constraint to matter more, or a lower
 * elasticity, or a non-constant-elasticity demand curve. Flagging rather
 * than "fixing" since the whole model is an unbalanced placeholder still.
 */
export const PRICE_ELASTICITY = 1.5;

/** Base cost to produce one unit, before cost-affecting events. */
export const BASE_UNIT_COST = 15;

/** Fixed yearly overhead, independent of scale. */
export const FIXED_OVERHEAD = 2500;

/** Fraction of fixedAssets depreciated each year (straight-line). */
export const DEPRECIATION_RATE = 0.1;

/** Annual interest rate charged on outstanding debt. */
export const INTEREST_RATE = 0.08;

/** $ of capacityInvestment needed to add +1 unit of production capacity. */
export const CAPACITY_COST_PER_UNIT = 10;

/**
 * Units of yearly output one employee can staff. Production is capped by
 * BOTH productionCapacity (the physical plant, from capacityInvestment)
 * AND employees * UNITS_PER_EMPLOYEE (the labor to run it) — whichever is
 * lower. At DEFAULT_STARTING_CONDITIONS (6 employees) that's 1,200, which
 * deliberately matches the default productionCapacity so neither is the
 * sole bottleneck out of the gate. Without this, firing your whole
 * workforce had zero effect on what you could produce — just removed a
 * cost, no downside.
 */
export const UNITS_PER_EMPLOYEE = 200;

/** $ of qualityInvestment needed to add +1 quality point (0-100 scale). */
export const QUALITY_COST_PER_POINT = 200;

/** $ of marketingSpend needed to add +1 brand awareness point (0-100 scale). */
export const MARKETING_COST_PER_BRAND_POINT = 150;

/** Brand awareness carried into a new year is multiplied by this before new marketing effect is added (so it decays without upkeep). */
export const BRAND_AWARENESS_DECAY = 0.85;

/** Morale points gained per $ of trainingSpend. */
export const MORALE_TRAINING_FACTOR = 0.02;

/** Morale points lost per employee fired. */
export const MORALE_FIRE_PENALTY = 5;

/** Morale points gained per 1% wage raise (negative wageAdjustmentPct hurts morale too). */
export const MORALE_WAGE_RAISE_BONUS_FACTOR = 1;

/** Default starting morale for a new company (StartingConditions doesn't set this). */
export const DEFAULT_STARTING_MORALE = 70;

/** Probability a given event scope rolls an event in a given year. */
export const RANDOM_EVENT_CHANCE = 0.25;
