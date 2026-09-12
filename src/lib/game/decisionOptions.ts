import type { CompanyYearState, CountryId, ProductDefinition, ProductLineState } from "@/types/game";
import { COUNTRY_IDS, PRODUCT_IDS } from "@/types/game";
import {
  CAPACITY_COST_PER_UNIT,
  INTEREST_RATE,
  MARKETING_COST_PER_BRAND_POINT,
  MORALE_WAGE_RAISE_BONUS_FACTOR,
  PRICE_ELASTICITY,
  QUALITY_COST_PER_POINT,
  RND_COST_PER_INNOVATION_POINT,
  TRAINING_COST_PER_PRODUCTIVITY_POINT,
  UNITS_PER_EMPLOYEE,
} from "@/lib/simulation/constants";
import { effectiveDemandMultiplier, getCountryDefinition } from "@/lib/simulation/countries";
import {
  computeCapacityCostPerUnit,
  computeLaborCapacity,
  computeTrainingProductivityFactor,
  computeWageProductivityFactor,
} from "@/lib/simulation/simulateYear";

export type FieldOption = { value: number; label: string };

/** Like FieldOption but for the country-picker selects (license/research/factory), whose value is a CountryId — "" means "no purchase this year". */
export type CountryFieldOption = { value: CountryId | ""; label: string };

/** Picks whichever option's value is numerically closest to `target`. */
export function nearestOption(options: FieldOption[], target: number): number {
  return options.reduce(
    (best, opt) => (Math.abs(opt.value - target) < Math.abs(best - target) ? opt.value : best),
    options[0].value,
  );
}

// ===== Product-specific (price, production, capacity, quality, training, hires, fires) =====

const PRICE_TIERS: { multiplier: number; tier: string }[] = [
  { multiplier: 0.4, tier: "Very low" },
  { multiplier: 0.6, tier: "Low" },
  { multiplier: 0.8, tier: "Somewhat low" },
  { multiplier: 0.9, tier: "Slightly low" },
  { multiplier: 1.0, tier: "Neutral" },
  { multiplier: 1.1, tier: "Slightly high" },
  { multiplier: 1.2, tier: "Somewhat high" },
  { multiplier: 1.4, tier: "High" },
  { multiplier: 1.7, tier: "Very high" },
  { multiplier: 2.0, tier: "Extreme" },
];

export function priceOptions(def: ProductDefinition): FieldOption[] {
  return PRICE_TIERS.map(({ multiplier, tier }) => {
    const price = Math.round(def.referencePrice * multiplier);
    const demandMult = Math.pow(1 / multiplier, PRICE_ELASTICITY);
    const margin = price - def.baseUnitCost;
    return {
      value: price,
      label: `$${price} — ${tier} (demand ×${demandMult.toFixed(2)}, margin $${margin}/unit)`,
    };
  });
}

/**
 * Per-COUNTRY price override tiers for one product — same tiers as
 * priceOptions(), plus a leading sentinel (value 0, never a real price
 * tier) meaning "no override, fall back to the default price". Used one
 * dropdown per licensed country (real price discrimination) alongside the
 * single default `price` field — see ProductDecision.priceByCountry.
 */
export function priceByCountryOptions(def: ProductDefinition, defaultPrice: number): FieldOption[] {
  return [{ value: 0, label: `Use default price ($${defaultPrice})` }, ...priceOptions(def)];
}

/** Effective capacity right now: min(physical capacity, what current staff can produce). */
export function effectiveCapacity(product: ProductLineState): number {
  return Math.min(product.productionCapacity, computeLaborCapacity(product));
}

/**
 * Tiers for ONE factory's production-volume decision, as a % of the
 * product's TOTAL shared effective capacity (see ProductLineState —
 * capacity/staffing is one pool across all of a product's factories, not
 * split per factory). When a product has only one factory (the common
 * case), this is exactly the whole decision, same as before multi-factory
 * existed; with more than one open, the UI shows one of these per factory
 * and the engine caps their COMBINED total to capacity.
 */
export function productionOptions(product: ProductLineState): FieldOption[] {
  const capacity = Math.round(effectiveCapacity(product));
  const staffLimited = computeLaborCapacity(product) < product.productionCapacity;
  const fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1];
  return fractions.map((f) => {
    const units = Math.round(capacity * f);
    const pctLabel = staffLimited ? "% of what your staff can run" : "% of capacity";
    return { value: units, label: `${units} units (${Math.round(f * 100)}${pctLabel})` };
  });
}

const CAPACITY_INVESTMENT_TIERS = [0, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 25000];
export function capacityInvestmentOptions(companyInnovation: number): FieldOption[] {
  const costPerUnit = computeCapacityCostPerUnit(companyInnovation);
  const discounted = costPerUnit < CAPACITY_COST_PER_UNIT;
  return CAPACITY_INVESTMENT_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+${Math.round(v / costPerUnit)} units next yr${discounted ? ", R&D discount applied" : ""})`,
  }));
}

const QUALITY_INVESTMENT_TIERS = [0, 200, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000];
export function qualityInvestmentOptions(): FieldOption[] {
  return QUALITY_INVESTMENT_TIERS.map((v) => ({
    value: v,
    label:
      v === 0 ? "$0 — None" : `$${v.toLocaleString()} (+${(v / QUALITY_COST_PER_POINT).toFixed(1)} quality pts next yr)`,
  }));
}

const TRAINING_TIERS = [0, 100, 250, 500, 1000, 1500, 2500, 5000, 7500, 10000];
export function trainingOptions(): FieldOption[] {
  return TRAINING_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+${(v / TRAINING_COST_PER_PRODUCTIVITY_POINT).toFixed(1)} productivity pts next yr — also a little quality)`,
  }));
}

const HIRE_TIERS = [0, 1, 2, 3, 4, 5, 7, 10, 15, 20];
export function hireOptions(product: ProductLineState): FieldOption[] {
  const perEmployeeUnits = Math.round(
    UNITS_PER_EMPLOYEE * computeWageProductivityFactor(product.wageLevel) * computeTrainingProductivityFactor(product.productivity),
  );
  return HIRE_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "0 — None"
        : `${v} (+$${Math.round(v * product.wageLevel).toLocaleString()}/yr wages, +~${v * perEmployeeUnits} units you can staff)`,
  }));
}

const FIRE_TIERS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 15];
export function fireOptions(product: ProductLineState): FieldOption[] {
  const perEmployeeUnits = Math.round(
    UNITS_PER_EMPLOYEE * computeWageProductivityFactor(product.wageLevel) * computeTrainingProductivityFactor(product.productivity),
  );
  return FIRE_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "0 — None"
        : `${v} (-5 morale, -$${Math.round(v * product.wageLevel).toLocaleString()}/yr wages, -~${v * perEmployeeUnits} units you can staff)`,
  }));
}

const WAGE_ADJUSTMENT_TIERS = [-20, -10, -5, -2, 0, 2, 5, 10, 15, 25];
export function wageAdjustmentOptions(product: ProductLineState): FieldOption[] {
  return WAGE_ADJUSTMENT_TIERS.map((v) => {
    const newWage = Math.round(product.wageLevel * (1 + v / 100));
    const newFactor = computeWageProductivityFactor(newWage);
    return {
      value: v,
      label:
        v === 0
          ? "0% — No change"
          : `${v > 0 ? "+" : ""}${v}% → $${newWage.toLocaleString()}/yr (${v * MORALE_WAGE_RAISE_BONUS_FACTOR > 0 ? "+" : ""}${v} morale, productivity factor ${newFactor.toFixed(2)}×)`,
    };
  });
}

// ===== Company-level (marketing, R&D, loans, capex) =====

const MARKETING_TIERS = [0, 250, 500, 1000, 2000, 3500, 5000, 7500, 12000, 20000];
export function marketingOptions(): FieldOption[] {
  return MARKETING_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+${(v / MARKETING_COST_PER_BRAND_POINT).toFixed(1)} brand pts next yr, company-wide)`,
  }));
}

const RND_TIERS = [0, 500, 1000, 2000, 4000, 6000, 10000, 15000, 25000, 40000];
export function rndOptions(): FieldOption[] {
  return RND_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+${(v / RND_COST_PER_INNOVATION_POINT).toFixed(1)} innovation pts next yr — quality bonus + cheaper capacity, all products)`,
  }));
}

const LOAN_TIERS = [0, 2500, 5000, 10000, 20000, 30000, 50000, 75000, 100000, 200000];
export function loanOptions(): FieldOption[] {
  return LOAN_TIERS.map((v) => ({
    value: v,
    label:
      v === 0
        ? "$0 — None"
        : `$${v.toLocaleString()} (+$${Math.round(v * INTEREST_RATE).toLocaleString()}/yr interest, starting next yr)`,
  }));
}

export function loanRepaymentOptions(state: CompanyYearState): FieldOption[] {
  const debt = Math.round(state.debt);
  if (debt <= 0) return [{ value: 0, label: "$0 — No debt to repay" }];
  const fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
  return fractions.map((f) => {
    const amt = Math.round(debt * f);
    return { value: amt, label: f === 0 ? "$0 — None" : `$${amt.toLocaleString()} (${Math.round(f * 100)}% of debt)` };
  });
}

const CAPEX_TIERS = [0, 1000, 2500, 5000, 10000, 15000, 25000, 40000, 60000, 100000];
export function capexOptions(): FieldOption[] {
  return CAPEX_TIERS.map((v) => ({
    value: v,
    label: v === 0 ? "$0 — None" : `$${v.toLocaleString()} (adds to fixed assets, 10%/yr depreciation)`,
  }));
}

// ===== International expansion (licenses, market research, factories) =====
// See docs/REGIONS_DESIGN.md. All three are one-time purchases (not annual
// spend like marketing/R&D) that take effect next year — this year's demand
// still runs on the opening licensedCountries/factoryCountries.

/** Countries the company can still license this year (already-licensed ones aren't offered again). */
export function licenseCountryOptions(state: CompanyYearState): CountryFieldOption[] {
  const options: CountryFieldOption[] = [{ value: "", label: "None — no new license this year" }];
  const effectiveYear = state.year + 1; // the year this license would actually take effect
  for (const id of COUNTRY_IDS) {
    if (state.licensedCountries.includes(id)) continue;
    const def = getCountryDefinition(id);
    // A license opens ALL three products there at once, and demand size
    // varies per product (see countries.ts) — show the range rather than
    // one misleading flat number. Reflects that country's growth up to the
    // year the license actually opens (see effectiveDemandMultiplier).
    const multipliers = PRODUCT_IDS.map((p) => effectiveDemandMultiplier(def, p, effectiveYear));
    const min = Math.min(...multipliers).toFixed(1);
    const max = Math.max(...multipliers).toFixed(1);
    options.push({
      value: id,
      label: `${def.name} — $${def.licenseCost.toLocaleString()} (opens selling there next yr, demand ×${min}–${max} depending on product)`,
    });
  }
  if (options.length === 1) return [{ value: "", label: "Already licensed in every country" }];
  return options;
}

export interface ResearchOption {
  countryId: CountryId;
  label: string;
}

/**
 * Countries whose customer-preference weights aren't yet revealed in the
 * UI (France is free from the start — see initialState.ts). Any number can
 * be bought in the same year (CompanyDecision.researchCountries), so this
 * returns one entry per available country for a checkbox list, not a
 * single-choice dropdown — there's no "none" sentinel to render since
 * leaving every box unchecked already means "no research this year".
 */
export function researchCountryOptions(state: CompanyYearState): ResearchOption[] {
  const options: ResearchOption[] = [];
  for (const id of COUNTRY_IDS) {
    if (state.researchedCountries.includes(id)) continue;
    const def = getCountryDefinition(id);
    options.push({
      countryId: id,
      label: `${def.name} — $${def.researchCost.toLocaleString()} (reveals its price/quality/brand/innovation preferences next yr)`,
    });
  }
  return options;
}

/**
 * Countries where a product could open an ADDITIONAL factory (on top of
 * the ones it already runs — see ProductLineState.factoryCountries), with
 * each one's labor-cost multiplier shown; opening in a country the company
 * has never manufactured ANYTHING in before costs that country's
 * factoryCost, reusing one already open (for this or another product) is
 * free.
 */
export function factoryOpenOptions(product: ProductLineState, openedFactoryCountries: CountryId[]): CountryFieldOption[] {
  const options: CountryFieldOption[] = [{ value: "", label: "None — don't open a new factory this year" }];
  for (const id of COUNTRY_IDS) {
    if (product.factoryCountries.includes(id)) continue;
    const def = getCountryDefinition(id);
    const alreadyOpen = openedFactoryCountries.includes(id);
    options.push({
      value: id,
      label: `${def.name} — ${alreadyOpen ? "factory already open elsewhere (free to use)" : `$${def.factoryCost.toLocaleString()} to open`} (labor ×${def.laborCostMultiplier}, next yr)`,
    });
  }
  if (options.length === 1) return [{ value: "", label: "Already manufacturing in every country" }];
  return options;
}
