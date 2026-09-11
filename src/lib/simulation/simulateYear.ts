import type {
  BalanceSheet,
  CompanyYearState,
  FinancialRatios,
  IncomeStatement,
  MarketMetrics,
  MarketYearState,
  RandomEvent,
  RandomEventEffects,
  YearDecision,
  YearResult,
} from "@/types/game";
import {
  BASE_DEMAND_UNITS_PER_PLAYER,
  BASE_UNIT_COST,
  BRAND_AWARENESS_DECAY,
  CAPACITY_COST_PER_UNIT,
  DEPRECIATION_RATE,
  FIXED_OVERHEAD,
  INTEREST_RATE,
  MARKETING_COST_PER_BRAND_POINT,
  MORALE_FIRE_PENALTY,
  MORALE_TRAINING_FACTOR,
  MORALE_WAGE_RAISE_BONUS_FACTOR,
  PRICE_ELASTICITY,
  QUALITY_COST_PER_POINT,
  REFERENCE_PRICE,
} from "./constants";

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

/** Folds a list of events' effects into one combined set (multipliers multiply, deltas add). */
function mergeEffects(events: RandomEvent[]): MergedEffects {
  return events.reduce<MergedEffects>(
    (acc, e) => mergeOne(acc, e.effects),
    { demandMultiplier: 1, unitCostMultiplier: 1, priceCapMultiplier: 1, moraleDelta: 0, extraCash: 0 },
  );
}

function mergeOne(acc: MergedEffects, effects: RandomEventEffects): MergedEffects {
  return {
    demandMultiplier: acc.demandMultiplier * (effects.demandMultiplier ?? 1),
    unitCostMultiplier: acc.unitCostMultiplier * (effects.unitCostMultiplier ?? 1),
    priceCapMultiplier: acc.priceCapMultiplier * (effects.priceCapMultiplier ?? 1),
    moraleDelta: acc.moraleDelta + (effects.moraleDelta ?? 0),
    extraCash: acc.extraCash + (effects.extraCash ?? 0),
  };
}

/**
 * A single number summarizing how competitive a company is at attracting
 * demand this year, from its quality/brand state and the price it's
 * charging. Used directly to scale demand in solo mode, and to split
 * shared demand by relative share in multiplayer (see simulateMultiplayerYear).
 *
 * Not a percentage — only meaningful relative to other attractiveness scores
 * (multiplayer) or as a multiplier on a baseline (solo).
 */
export function computeAttractiveness(state: CompanyYearState, price: number): number {
  const safePrice = Math.max(1, price);
  const qualityFactor = 0.5 + 0.5 * (clamp(state.quality, 0, 100) / 100);
  const brandFactor = 0.5 + 0.5 * (clamp(state.brandAwareness, 0, 100) / 100);
  const priceFactor = Math.pow(REFERENCE_PRICE / safePrice, PRICE_ELASTICITY);
  return qualityFactor * brandFactor * priceFactor;
}

export interface SimulateYearInput {
  decision: YearDecision;
  openingState: CompanyYearState;
  /** All events affecting this player this year (global + player-scoped). */
  events: RandomEvent[];
  /**
   * Units of demand allocated to this player this year, before event
   * demand multipliers are applied. When omitted (solo mode), demand is
   * computed from `baseDemandUnits * attractiveness`. In multiplayer, the
   * market-aggregation step (simulateMultiplayerYear) supplies this from
   * each player's share of total shared demand.
   */
  demandUnitsOverride?: number;
  /** Solo-mode baseline; ignored when demandUnitsOverride is set. Defaults to BASE_DEMAND_UNITS_PER_PLAYER. */
  baseDemandUnits?: number;
}

/**
 * Simulates one company-year: turns a YearDecision + prior CompanyYearState
 * (+ any random events, + optionally a market-supplied demand share) into a
 * full YearResult.
 *
 * Simplifications, documented here rather than hidden in the math:
 * - Inventory is valued at the *current* year's unit cost (no FIFO/historical
 *   costing), so a cost-inflation event revalues carried-over stock too.
 * - Cash flow adds back depreciation and subtracts capex directly, which is
 *   standard, but otherwise assumes income-statement profit is realized as
 *   cash in the same year (no receivables/payables timing).
 * - `roiPct` is net profit over total assets — not net profit over equity.
 * See docs/DATA_MODEL.md and docs/GAME_DESIGN.md for open questions.
 */
export function simulateYear(input: SimulateYearInput): YearResult {
  const { decision, openingState, events } = input;
  const merged = mergeEffects(events);

  // A price-cap event (e.g. a rival's price war) can force an effective
  // selling price below what the player set.
  const effectivePrice = decision.pricingSales.price * Math.min(1, merged.priceCapMultiplier);

  const potentialDemand =
    input.demandUnitsOverride !== undefined
      ? input.demandUnitsOverride * merged.demandMultiplier
      : (input.baseDemandUnits ?? BASE_DEMAND_UNITS_PER_PLAYER) *
        computeAttractiveness(openingState, effectivePrice) *
        merged.demandMultiplier;

  const unitsProduced = clamp(decision.productionOperations.productionVolume, 0, openingState.productionCapacity);
  const unitsAvailable = openingState.inventoryUnits + unitsProduced;
  const unitsSold = Math.max(0, Math.min(potentialDemand, unitsAvailable));
  const unsoldInventoryUnits = Math.max(0, unitsAvailable - unitsSold);

  const unitCost = BASE_UNIT_COST * merged.unitCostMultiplier;
  const cogs = unitsSold * unitCost;
  const revenue = unitsSold * effectivePrice;
  const grossProfit = revenue - cogs;

  const marketingExpense = Math.max(0, decision.pricingSales.marketingSpend);
  const wagesExpense = openingState.employees * openingState.wageLevel;
  const trainingExpense = Math.max(0, decision.hrStaffing.trainingSpend);
  const rndExpense = Math.max(0, decision.financeInvestment.rndSpend);
  const depreciation = openingState.fixedAssets * DEPRECIATION_RATE;
  const otherOperatingExpense = FIXED_OVERHEAD + depreciation;

  const operatingProfit =
    grossProfit - marketingExpense - wagesExpense - trainingExpense - rndExpense - otherOperatingExpense;

  const interestExpense = openingState.debt * INTEREST_RATE;
  const netProfit = operatingProfit - interestExpense;

  const incomeStatement: IncomeStatement = {
    revenue,
    cogs,
    grossProfit,
    marketingExpense,
    wagesExpense,
    trainingExpense,
    rndExpense,
    otherOperatingExpense,
    operatingProfit,
    interestExpense,
    netProfit,
  };

  // --- closing company state ---
  const employees = Math.max(0, openingState.employees + decision.hrStaffing.hires - decision.hrStaffing.fires);
  const wageLevel = Math.max(0, openingState.wageLevel * (1 + decision.hrStaffing.wageAdjustmentPct / 100));

  const morale = clamp(
    openingState.morale +
      decision.hrStaffing.trainingSpend * MORALE_TRAINING_FACTOR -
      decision.hrStaffing.fires * MORALE_FIRE_PENALTY +
      decision.hrStaffing.wageAdjustmentPct * MORALE_WAGE_RAISE_BONUS_FACTOR +
      merged.moraleDelta,
    0,
    100,
  );

  const productionCapacity =
    openingState.productionCapacity + decision.productionOperations.capacityInvestment / CAPACITY_COST_PER_UNIT;

  const quality = clamp(
    openingState.quality + decision.productionOperations.qualityInvestment / QUALITY_COST_PER_POINT,
    0,
    100,
  );

  const brandAwareness = clamp(
    openingState.brandAwareness * BRAND_AWARENESS_DECAY +
      decision.pricingSales.marketingSpend / MARKETING_COST_PER_BRAND_POINT,
    0,
    100,
  );

  const debt = Math.max(
    0,
    openingState.debt + decision.financeInvestment.loanAmountRequested - decision.financeInvestment.loanRepayment,
  );

  const fixedAssets = Math.max(
    0,
    openingState.fixedAssets +
      decision.productionOperations.capacityInvestment +
      decision.productionOperations.qualityInvestment +
      decision.financeInvestment.capexSpend -
      depreciation,
  );

  const inventoryValue = unsoldInventoryUnits * unitCost;

  const cash =
    openingState.cash +
    netProfit +
    depreciation - // non-cash expense, add back
    decision.productionOperations.capacityInvestment -
    decision.productionOperations.qualityInvestment -
    decision.financeInvestment.capexSpend +
    decision.financeInvestment.loanAmountRequested -
    decision.financeInvestment.loanRepayment +
    merged.extraCash;

  const totalAssets = cash + inventoryValue + fixedAssets;
  const totalLiabilities = debt;
  const equity = totalAssets - totalLiabilities;

  const closingState: CompanyYearState = {
    year: openingState.year + 1,
    cash,
    debt,
    fixedAssets,
    inventory: inventoryValue,
    inventoryUnits: unsoldInventoryUnits,
    equity,
    employees,
    wageLevel,
    morale,
    productionCapacity,
    quality,
    brandAwareness,
    currentPrice: decision.pricingSales.price,
  };

  const balanceSheet: BalanceSheet = {
    cash,
    inventory: inventoryValue,
    fixedAssets,
    totalAssets,
    debt,
    totalLiabilities,
    equity,
  };

  const ratios: FinancialRatios = {
    grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    netMarginPct: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    roiPct: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
    debtToEquity: equity !== 0 ? debt / equity : 0,
  };

  const baseline = input.baseDemandUnits ?? BASE_DEMAND_UNITS_PER_PLAYER;
  const marketMetrics: MarketMetrics = {
    unitsSold,
    unitsProduced,
    unsoldInventory: unsoldInventoryUnits,
    demandIndex: baseline > 0 ? (potentialDemand / baseline) * 100 : 0,
  };

  return {
    playerId: decision.playerId,
    year: decision.year,
    openingState,
    closingState,
    incomeStatement,
    balanceSheet,
    ratios,
    marketMetrics,
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
  /** Defaults to BASE_DEMAND_UNITS_PER_PLAYER * players.length. */
  totalDemandBase?: number;
}

export interface SimulateMultiplayerYearOutput {
  market: MarketYearState;
  results: YearResult[];
}

/**
 * Multiplayer version of simulateYear: aggregates all players' decisions
 * into one shared market (total demand split by relative attractiveness),
 * then simulates each player's year against their allocated share.
 */
export function simulateMultiplayerYear(input: SimulateMultiplayerYearInput): SimulateMultiplayerYearOutput {
  const { year, players, globalEvents } = input;
  const globalMerged = mergeEffects(globalEvents);

  const attractivenessByPlayer = players.map(({ decision, openingState }) =>
    computeAttractiveness(openingState, decision.pricingSales.price),
  );
  const totalAttractiveness = attractivenessByPlayer.reduce((a, b) => a + b, 0) || 1;

  const totalDemandBase = input.totalDemandBase ?? BASE_DEMAND_UNITS_PER_PLAYER * players.length;

  const playerShares: Record<string, number> = {};
  let weightedPriceSum = 0;

  const results = players.map((p, i) => {
    const shareFraction = attractivenessByPlayer[i] / totalAttractiveness;
    // Raw (pre-global-event) demand allocation — global events are applied
    // once, inside simulateYear, via the merged event list below.
    const demandUnitsOverride = totalDemandBase * shareFraction;
    playerShares[p.decision.playerId] = shareFraction * 100;
    weightedPriceSum += p.decision.pricingSales.price * shareFraction;

    const result = simulateYear({
      decision: p.decision,
      openingState: p.openingState,
      events: [...globalEvents, ...p.playerEvents],
      demandUnitsOverride,
    });
    result.marketMetrics.marketSharePct = shareFraction * 100;
    return result;
  });

  const market: MarketYearState = {
    year,
    // Informational estimate of realized total demand (global events only —
    // player-scoped events aren't reflected in this aggregate figure).
    totalDemand: totalDemandBase * globalMerged.demandMultiplier,
    avgMarketPrice: weightedPriceSum,
    playerShares,
  };

  return { market, results };
}
