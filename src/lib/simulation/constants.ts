/**
 * Tunable simulation constants.
 *
 * Calculated (not yet fully playtested) so a reasonably-played year is
 * profitable across all three product lines — see docs/RULES.md for the
 * worked numbers. Nothing else in the simulation should hardcode these
 * numbers; change them here and re-run the tests in
 * src/lib/simulation/*.test.ts to see the effect (and update docs/RULES.md
 * + src/app/rules/page.tsx, which restate some of this math in prose
 * rather than deriving it live).
 */

/**
 * How sharply demand reacts to price above/below a product's reference
 * price. Shared across all three products for now.
 */
export const PRICE_ELASTICITY = 1.5;

/** Company-wide fixed yearly overhead, independent of scale. */
export const FIXED_OVERHEAD = 20000;

/** Fraction of fixedAssets depreciated each year (straight-line). */
export const DEPRECIATION_RATE = 0.1;

/** Annual interest rate charged on outstanding debt. */
export const INTEREST_RATE = 0.08;

/** Base $ of capacityInvestment needed to add +1 unit of production capacity, before R&D discount. */
export const CAPACITY_COST_PER_UNIT = 10;

/** $ of qualityInvestment needed to add +1 quality point (0-100 scale) for a product. */
export const QUALITY_COST_PER_POINT = 200;

/** $ of marketingSpend needed to add +1 (company-wide) brand awareness point (0-100 scale). */
export const MARKETING_COST_PER_BRAND_POINT = 150;

/** Brand awareness carried into a new year is multiplied by this before new marketing effect is added (so it decays without upkeep). */
export const BRAND_AWARENESS_DECAY = 0.85;

/** Morale points lost per employee fired (any product line). */
export const MORALE_FIRE_PENALTY = 5;

/** Morale points gained per 1% wage raise (negative wageAdjustmentPct hurts morale too). */
export const MORALE_WAGE_RAISE_BONUS_FACTOR = 1;

/** Default starting morale for a new company (StartingConditions doesn't set this per-product). */
export const DEFAULT_STARTING_MORALE = 70;

/** Probability a given event scope rolls an event in a given year. */
export const RANDOM_EVENT_CHANCE = 0.25;

// ===== Labor: units per employee, wages -> productivity ======================

/** Base units of yearly output one employee can staff, before the productivity multiplier. */
export const UNITS_PER_EMPLOYEE = 200;

/** Wage level at which the wage->productivity factor is neutral (1.0). Shared reference across products. */
export const REFERENCE_WAGE = 2500;

/** Clamp range for the wage-driven productivity multiplier (underpaying/overpaying relative to REFERENCE_WAGE). */
export const WAGE_PRODUCTIVITY_MIN_FACTOR = 0.6;
export const WAGE_PRODUCTIVITY_MAX_FACTOR = 1.4;

// ===== Training -> productivity (and a bit of quality) =======================

/** $ of trainingSpend needed to add +1 productivity point (0-100 scale) for a product, next year. */
export const TRAINING_COST_PER_PRODUCTIVITY_POINT = 100;

/** Productivity carried into a new year is multiplied by this before new training effect is added. */
export const PRODUCTIVITY_DECAY = 0.85;

/** How much of a product's productivity (0-100) counts toward its EFFECTIVE quality for demand, in addition to the dedicated quality investment lever. */
export const PRODUCTIVITY_TO_QUALITY_WEIGHT = 0.2;

// ===== R&D -> innovation (quality bonus + cheaper capacity, company-wide) ====

/** $ of rndSpend needed to add +1 (company-wide) innovation point (0-100 scale), next year. */
export const RND_COST_PER_INNOVATION_POINT = 300;

/** Innovation carried into a new year is multiplied by this before new R&D effect is added — decays slower than brand/productivity (knowledge sticks around). */
export const INNOVATION_DECAY = 0.9;

/** How much company-wide innovation (0-100) counts toward EVERY product's effective quality for demand. */
export const INNOVATION_TO_QUALITY_WEIGHT = 0.15;

/** Fractional reduction in CAPACITY_COST_PER_UNIT per innovation point (e.g. 0.005 = -0.5%/point). */
export const INNOVATION_CAPACITY_COST_REDUCTION_RATE = 0.005;

/** Floor on the capacity-cost multiplier from innovation — capacity investment can get at most this much cheaper. */
export const INNOVATION_MIN_CAPACITY_COST_MULTIPLIER = 0.5;

// ===== International expansion (countries/factories/transport/licenses) =====
// See docs/REGIONS_DESIGN.md and src/lib/simulation/countries.ts for the
// country catalog (labor cost, demand, and preference weights per country).

/**
 * Flat $/unit surcharge added to a unit's cost when it's sold into a
 * country other than the one it was manufactured in (ProductLineState.
 * factoryCountry). Deliberately a single flat rate rather than a full
 * country-pair distance matrix — see REGIONS_DESIGN.md's "simplest
 * workable version" reasoning; a real matrix is easy to add later without
 * being a prerequisite for a playable first version.
 */
export const TRANSPORT_COST_PER_UNIT = 5;
