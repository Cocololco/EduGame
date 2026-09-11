import type {
  BalanceSheet,
  CompanyYearState,
  FinancialRatios,
  IncomeStatement,
  MarketYearState,
  ProductId,
  ProductLineState,
  ProductYearResult,
  RandomEvent,
  RandomEventEffects,
  YearDecision,
  YearResult,
} from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import {
  BRAND_AWARENESS_DECAY,
  DEPRECIATION_RATE,
  FIXED_OVERHEAD,
  INNOVATION_CAPACITY_COST_REDUCTION_RATE,
  INNOVATION_DECAY,
  INNOVATION_MIN_CAPACITY_COST_MULTIPLIER,
  INNOVATION_TO_QUALITY_WEIGHT,
  INTEREST_RATE,
  MARKETING_COST_PER_BRAND_POINT,
  MORALE_FIRE_PENALTY,
  MORALE_WAGE_RAISE_BONUS_FACTOR,
  PRICE_ELASTICITY,
  PRODUCTIVITY_DECAY,
  PRODUCTIVITY_TO_QUALITY_WEIGHT,
  QUALITY_COST_PER_POINT,
  RND_COST_PER_INNOVATION_POINT,
  TRAINING_COST_PER_PRODUCTIVITY_POINT,
  CAPACITY_COST_PER_UNIT,
  REFERENCE_WAGE,
  UNITS_PER_EMPLOYEE,
  WAGE_PRODUCTIVITY_MAX_FACTOR,
  WAGE_PRODUCTIVITY_MIN_FACTOR,
} from "./constants";
import { getProductDefinition } from "./products";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface MergedEffects {
  demandMultiplier: number;
  unitCostMultiplier: number;
  priceCapMultiplier: number;
  moraleDelta: number;
  extraCash: number;
}

const NEUTRAL_EFFECTS: MergedEffects = {
  demandMultiplier: 1,
  unitCostMultiplier: 1,
  priceCapMultiplier: 1,
  moraleDelta: 0,
  extraCash: 0,
};

function mergeOne(acc: MergedEffects, effects: RandomEventEffects): MergedEffects {
  return {
    demandMultiplier: acc.demandMultiplier * (effects.demandMultiplier ?? 1),
    unitCostMultiplier: acc.unitCostMultiplier * (effects.unitCostMultiplier ?? 1),
    priceCapMultiplier: acc.priceCapMultiplier * (effects.priceCapMultiplier ?? 1),
    moraleDelta: acc.moraleDelta + (effects.moraleDelta ?? 0),
    extraCash: acc.extraCash + (effects.extraCash ?? 0),
  };
}

/** Folds every event's effects into one combined set — used for company-wide fields (extraCash, moraleDelta). */
function mergeAll(events: RandomEvent[]): MergedEffects {
  return events.reduce((acc, e) => mergeOne(acc, e.effects), NEUTRAL_EFFECTS);
}

/** Folds only the events applicable to one product (global events + player events scoped to it). */
function mergeForProduct(events: RandomEvent[], productId: ProductId): MergedEffects {
  return events
    .filter((e) => e.scope === "global" || e.effects.productId === productId)
    .reduce((acc, e) => mergeOne(acc, e.effects), NEUTRAL_EFFECTS);
}

/**
 * A single number summarizing how competitive a product is at attracting
 * demand this year, from its quality/productivity, the company's brand
 * awareness/innovation, and the price it's charging. Not a percentage —
 * only meaningful relative to other attractiveness scores (multiplayer) or
 * as a multiplier on a baseline (solo).
 */
export function computeAttractiveness(
  product: ProductLineState,
  companyBrandAwareness: number,
  companyInnovation: number,
  price: number,
  referencePrice: number,
): number {
  const safePrice = Math.max(1, price);
  const effectiveQuality = clamp(
    product.quality +
      product.productivity * PRODUCTIVITY_TO_QUALITY_WEIGHT +
      companyInnovation * INNOVATION_TO_QUALITY_WEIGHT,
    0,
    100,
  );
  const qualityFactor = 0.5 + 0.5 * (effectiveQuality / 100);
  const brandFactor = 0.5 + 0.5 * (clamp(companyBrandAwareness, 0, 100) / 100);
  const priceFactor = Math.pow(referencePrice / safePrice, PRICE_ELASTICITY);
  return qualityFactor * brandFactor * priceFactor;
}

/** Wage level relative to REFERENCE_WAGE, clamped — how well-paid staff translates into output per employee. */
export function computeWageProductivityFactor(wageLevel: number): number {
  return clamp(wageLevel / REFERENCE_WAGE, WAGE_PRODUCTIVITY_MIN_FACTOR, WAGE_PRODUCTIVITY_MAX_FACTOR);
}

/** Training-driven productivity (0-100) as a 0.5x-1.0x multiplier, same shape as quality/brand factors. */
export function computeTrainingProductivityFactor(productivity: number): number {
  return 0.5 + 0.5 * (clamp(productivity, 0, 100) / 100);
}

/** Units of labor capacity one product line can staff this year. */
export function computeLaborCapacity(product: ProductLineState): number {
  return (
    product.employees *
    UNITS_PER_EMPLOYEE *
    computeWageProductivityFactor(product.wageLevel) *
    computeTrainingProductivityFactor(product.productivity)
  );
}

/** Effective $ cost per unit of capacity investment, discounted by company-wide R&D/innovation. */
export function computeCapacityCostPerUnit(companyInnovation: number): number {
  const multiplier = Math.max(
    INNOVATION_MIN_CAPACITY_COST_MULTIPLIER,
    1 - companyInnovation * INNOVATION_CAPACITY_COST_REDUCTION_RATE,
  );
  return CAPACITY_COST_PER_UNIT * multiplier;
}

export interface SimulateYearInput {
  decision: YearDecision;
  openingState: CompanyYearState;
  /** All events affecting this player this year (global + player-scoped, any product). */
  events: RandomEvent[];
  /**
   * Per-product units of demand allocated to this player this year, before
   * event demand multipliers are applied. When omitted (solo mode), demand
   * is computed from each product's own baseDemandUnits * attractiveness.
   * In multiplayer, simulateMultiplayerYear supplies this per product from
   * each player's share of that product's total shared demand.
   */
  demandUnitsOverride?: Partial<Record<ProductId, number>>;
}

/**
 * Simulates one company-year across all three product lines: turns a
 * YearDecision + prior CompanyYearState (+ any random events, + optionally
 * market-supplied demand shares) into a full YearResult with a company-wide
 * income statement/balance sheet and a per-product breakdown.
 *
 * Simplifications, documented here rather than hidden in the math:
 * - Inventory is valued at the *current* year's unit cost (no FIFO/historical costing).
 * - qualityInvestment/capacityInvestment/trainingSpend are cash outflows;
 *   only trainingSpend is expensed on the income statement (as a proxy for
 *   "this is genuinely a running cost"), while capacity/quality investment
 *   are capitalized-ish (reduce cash, not routed through net profit) — a
 *   simplification, not full accrual accounting.
 * - `roiPct` is net profit over total assets, not over equity.
 * See docs/DATA_MODEL.md and docs/GAME_DESIGN.md for open questions.
 */
export function simulateYear(input: SimulateYearInput): YearResult {
  const { decision, openingState, events } = input;
  const companyMerged = mergeAll(events);

  const byProduct: ProductYearResult[] = [];
  const closingProducts: Record<string, ProductLineState> = {};

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalWagesExpense = 0;
  let totalTrainingExpense = 0;
  let totalCapacityInvestment = 0;
  let totalQualityInvestment = 0;
  let wageAdjustmentSum = 0;
  let firesSum = 0;

  const capacityCostPerUnit = computeCapacityCostPerUnit(openingState.innovation);

  for (const id of PRODUCT_IDS) {
    const def = getProductDefinition(id);
    const product = openingState.products[id];
    const pDecision = decision.products[id];
    const merged = mergeForProduct(events, id);

    const effectivePrice = pDecision.price * Math.min(1, merged.priceCapMultiplier);

    const overrideDemand = input.demandUnitsOverride?.[id];
    const potentialDemand =
      overrideDemand !== undefined
        ? overrideDemand * merged.demandMultiplier
        : def.baseDemandUnits *
          computeAttractiveness(product, openingState.brandAwareness, openingState.innovation, effectivePrice, def.referencePrice) *
          merged.demandMultiplier;

    const laborCapacity = computeLaborCapacity(product);
    const effectiveCapacity = Math.min(product.productionCapacity, laborCapacity);
    const unitsProduced = clamp(pDecision.productionVolume, 0, effectiveCapacity);
    const unitsAvailable = product.inventoryUnits + unitsProduced;
    const unitsSold = Math.max(0, Math.min(potentialDemand, unitsAvailable));
    const unsoldInventoryUnits = Math.round(Math.max(0, unitsAvailable - unitsSold));

    const unitCost = def.baseUnitCost * merged.unitCostMultiplier;
    const cogs = unitsSold * unitCost;
    const revenue = unitsSold * effectivePrice;
    const grossProfit = revenue - cogs;

    const wagesExpense = product.employees * product.wageLevel;
    const trainingExpense = Math.max(0, pDecision.trainingSpend);

    totalRevenue += revenue;
    totalCogs += cogs;
    totalWagesExpense += wagesExpense;
    totalTrainingExpense += trainingExpense;
    totalCapacityInvestment += Math.max(0, pDecision.capacityInvestment);
    totalQualityInvestment += Math.max(0, pDecision.qualityInvestment);
    wageAdjustmentSum += pDecision.wageAdjustmentPct;
    firesSum += pDecision.fires;

    const baseline = def.baseDemandUnits;
    const demandIndex = baseline > 0 ? (potentialDemand / baseline) * 100 : 0;

    byProduct.push({
      productId: id,
      unitsProduced,
      unitsSold,
      unsoldInventory: unsoldInventoryUnits,
      revenue,
      cogs,
      grossProfit,
      wagesExpense,
      trainingExpense,
      demandIndex,
    });

    const employees = Math.max(0, product.employees + pDecision.hires - pDecision.fires);
    const wageLevel = Math.max(0, product.wageLevel * (1 + pDecision.wageAdjustmentPct / 100));
    const quality = clamp(product.quality + pDecision.qualityInvestment / QUALITY_COST_PER_POINT, 0, 100);
    const productivity = clamp(
      product.productivity * PRODUCTIVITY_DECAY + pDecision.trainingSpend / TRAINING_COST_PER_PRODUCTIVITY_POINT,
      0,
      100,
    );
    const productionCapacity = product.productionCapacity + pDecision.capacityInvestment / capacityCostPerUnit;

    closingProducts[id] = {
      productId: id,
      currentPrice: pDecision.price,
      productionCapacity,
      employees,
      wageLevel,
      quality,
      productivity,
      inventoryUnits: unsoldInventoryUnits,
      inventoryValue: unsoldInventoryUnits * unitCost,
    };
  }

  const grossProfit = totalRevenue - totalCogs;
  const marketingExpense = Math.max(0, decision.company.marketingSpend);
  const rndExpense = Math.max(0, decision.company.rndSpend);
  const depreciation = openingState.fixedAssets * DEPRECIATION_RATE;
  const otherOperatingExpense = FIXED_OVERHEAD + depreciation;

  const operatingProfit =
    grossProfit - marketingExpense - totalWagesExpense - totalTrainingExpense - rndExpense - otherOperatingExpense;
  const interestExpense = openingState.debt * INTEREST_RATE;
  const netProfit = operatingProfit - interestExpense;

  const incomeStatement: IncomeStatement = {
    revenue: totalRevenue,
    cogs: totalCogs,
    grossProfit,
    marketingExpense,
    wagesExpense: totalWagesExpense,
    trainingExpense: totalTrainingExpense,
    rndExpense,
    otherOperatingExpense,
    operatingProfit,
    interestExpense,
    netProfit,
    byProduct,
  };

  // --- company-wide closing state ---
  const brandAwareness = clamp(
    openingState.brandAwareness * BRAND_AWARENESS_DECAY + decision.company.marketingSpend / MARKETING_COST_PER_BRAND_POINT,
    0,
    100,
  );
  const innovation = clamp(
    openingState.innovation * INNOVATION_DECAY + decision.company.rndSpend / RND_COST_PER_INNOVATION_POINT,
    0,
    100,
  );
  const morale = clamp(
    openingState.morale -
      firesSum * MORALE_FIRE_PENALTY +
      wageAdjustmentSum * MORALE_WAGE_RAISE_BONUS_FACTOR +
      companyMerged.moraleDelta,
    0,
    100,
  );

  const debt = Math.max(
    0,
    openingState.debt + decision.company.loanAmountRequested - decision.company.loanRepayment,
  );
  const fixedAssets = Math.max(
    0,
    openingState.fixedAssets + totalCapacityInvestment + decision.company.capexSpend - depreciation,
  );

  const cash =
    openingState.cash +
    netProfit +
    depreciation - // non-cash expense, add back
    totalCapacityInvestment -
    totalQualityInvestment -
    decision.company.capexSpend +
    decision.company.loanAmountRequested -
    decision.company.loanRepayment +
    companyMerged.extraCash;

  const totalInventoryValue = Object.values(closingProducts).reduce((sum, p) => sum + p.inventoryValue, 0);
  const totalAssets = cash + totalInventoryValue + fixedAssets;
  const totalLiabilities = debt;
  const equity = totalAssets - totalLiabilities;

  const closingState: CompanyYearState = {
    year: openingState.year + 1,
    cash,
    debt,
    fixedAssets,
    equity,
    brandAwareness,
    innovation,
    morale,
    products: closingProducts as CompanyYearState["products"],
  };

  const balanceSheet: BalanceSheet = {
    cash,
    inventory: totalInventoryValue,
    fixedAssets,
    totalAssets,
    debt,
    totalLiabilities,
    equity,
  };

  const ratios: FinancialRatios = {
    grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    netMarginPct: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    roiPct: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
    debtToEquity: equity !== 0 ? debt / equity : 0,
  };

  return {
    playerId: decision.playerId,
    year: decision.year,
    openingState,
    closingState,
    incomeStatement,
    balanceSheet,
    ratios,
    eventsApplied: events,
  };
}

export interface MultiplayerPlayerInput {
  decision: YearDecision;
  openingState: CompanyYearState;
  /** Events scoped to this player only (not including global events). */
  playerEvents: RandomEvent[];
}

export interface SimulateMultiplayerYearInput {
  year: number;
  players: MultiplayerPlayerInput[];
  /** Events affecting the whole shared market. */
  globalEvents: RandomEvent[];
  /** Per-product baseline demand, defaults to each product's baseDemandUnits * players.length. */
  totalDemandBaseByProduct?: Partial<Record<ProductId, number>>;
}

export interface SimulateMultiplayerYearOutput {
  market: MarketYearState;
  results: YearResult[];
}

/**
 * Multiplayer version of simulateYear: for each product, aggregates all
 * players' decisions into one shared market (demand split by relative
 * attractiveness), then simulates each player's year against their
 * allocated per-product share.
 */
export function simulateMultiplayerYear(input: SimulateMultiplayerYearInput): SimulateMultiplayerYearOutput {
  const { year, players, globalEvents } = input;
  const globalMerged = mergeAll(globalEvents);

  const demandUnitsOverrideByPlayer: Partial<Record<ProductId, number>>[] = players.map(() => ({}));
  const productShareByPlayer: Record<ProductId, number>[] = players.map(() => ({}) as Record<ProductId, number>);
  const playerShares: Record<string, number> = {};
  let weightedPriceSum = 0;
  let totalDemandAllProducts = 0;

  for (const id of PRODUCT_IDS) {
    const def = getProductDefinition(id);
    const attractivenessByPlayer = players.map(({ decision, openingState }) =>
      computeAttractiveness(
        openingState.products[id],
        openingState.brandAwareness,
        openingState.innovation,
        decision.products[id].price,
        def.referencePrice,
      ),
    );
    const totalAttractiveness = attractivenessByPlayer.reduce((a, b) => a + b, 0) || 1;
    const totalDemandBase = input.totalDemandBaseByProduct?.[id] ?? def.baseDemandUnits * players.length;

    players.forEach((p, i) => {
      const shareFraction = attractivenessByPlayer[i] / totalAttractiveness;
      demandUnitsOverrideByPlayer[i][id] = totalDemandBase * shareFraction;
      productShareByPlayer[i][id] = shareFraction * 100;
      if (id === "shortboard") {
        // Use the highest-volume product as the representative figure for
        // the overall company market-share summary shown in MarketYearState.
        playerShares[p.decision.playerId] = shareFraction * 100;
        weightedPriceSum += p.decision.products[id].price * shareFraction;
      }
    });

    totalDemandAllProducts += totalDemandBase * globalMerged.demandMultiplier;
  }

  const results = players.map((p, i) => {
    const result = simulateYear({
      decision: p.decision,
      openingState: p.openingState,
      events: [...globalEvents, ...p.playerEvents],
      demandUnitsOverride: demandUnitsOverrideByPlayer[i],
    });
    for (const productResult of result.incomeStatement.byProduct) {
      productResult.marketSharePct = productShareByPlayer[i][productResult.productId];
    }
    return result;
  });

  const market: MarketYearState = {
    year,
    totalDemand: totalDemandAllProducts,
    avgMarketPrice: weightedPriceSum,
    playerShares,
  };

  return { market, results };
}
