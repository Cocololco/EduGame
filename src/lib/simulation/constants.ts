/**
 * Tunable simulation constants.
 *
 * These are placeholder values for an initial playable version — not
 * balanced or playtested yet (see docs/GAME_DESIGN.md's open questions).
 * Nothing else in the simulation should hardcode these numbers; change them
 * here and re-run the tests in src/lib/simulation/*.test.ts to see the effect.
 */

/** Baseline units of demand per player per year, before attractiveness/events. */
export const BASE_DEMAND_UNITS_PER_PLAYER = 1000;

/** Price at which the price-attractiveness factor is neutral (1.0). */
export const REFERENCE_PRICE = 50;

/** How sharply demand reacts to price above/below REFERENCE_PRICE. */
export const PRICE_ELASTICITY = 1.5;

/** Base cost to produce one unit, before cost-affecting events. */
export const BASE_UNIT_COST = 20;

/** Fixed yearly overhead, independent of scale. */
export const FIXED_OVERHEAD = 5000;

/** Fraction of fixedAssets depreciated each year (straight-line). */
export const DEPRECIATION_RATE = 0.1;

/** Annual interest rate charged on outstanding debt. */
export const INTEREST_RATE = 0.08;

/** $ of capacityInvestment needed to add +1 unit of production capacity. */
export const CAPACITY_COST_PER_UNIT = 10;

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
