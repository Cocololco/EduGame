import type { CompanyYearState, ProductDefinition, ProductLineState } from "@/types/game";
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
import {
  computeCapacityCostPerUnit,
  computeLaborCapacity,
  computeTrainingProductivityFactor,
  computeWageProductivityFactor,
} from "@/lib/simulation/simulateYear";

export type FieldOption = { value: number; label: string };

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

/** Effective capacity right now: min(physical capacity, what current staff can produce). */
export function effectiveCapacity(product: ProductLineState): number {
  return Math.min(product.productionCapacity, computeLaborCapacity(product));
}

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
