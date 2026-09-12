import type {
  BalanceSheet,
  CompanyYearState,
  CountryId,
  DemandWeightProfile,
  FinancialRatios,
  IncomeStatement,
  MarketYearState,
  ProductDefinition,
  ProductId,
  ProductLineState,
  ProductYearResult,
  RandomEvent,
  RandomEventEffects,
  YearDecision,
  YearResult,
} from "@/types/game";
import { COUNTRY_IDS, PRODUCT_IDS } from "@/types/game";
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
  TRANSPORT_COST_PER_UNIT,
  CAPACITY_COST_PER_UNIT,
  REFERENCE_WAGE,
  UNITS_PER_EMPLOYEE,
  WAGE_PRODUCTIVITY_MAX_FACTOR,
  WAGE_PRODUCTIVITY_MIN_FACTOR,
} from "./constants";
import { effectiveDemandMultiplier, getCountryDefinition } from "./countries";
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

/**
 * Averages a product's demand weights with a country's own customer
 * preferences (see docs/REGIONS_DESIGN.md). Both already sum to 100, so a
 * straight average also sums to 100 — no renormalization needed.
 */
export function blendDemandWeights(product: DemandWeightProfile, country: DemandWeightProfile): DemandWeightProfile {
  return {
    priceWeight: (product.priceWeight + country.priceWeight) / 2,
    qualityWeight: (product.qualityWeight + country.qualityWeight) / 2,
    brandWeight: (product.brandWeight + country.brandWeight) / 2,
    innovationWeight: (product.innovationWeight + country.innovationWeight) / 2,
  };
}

interface SoloCountryDemand {
  /** Summed across every licensed country, before event multipliers. */
  totalDemand: number;
  /** Weighted-average $/unit transport surcharge, from the share of demand coming from countries with no open factory for this product. */
  transportSurchargePerUnit: number;
  /** Demand-weighted average of each country's own (already price-cap-adjusted) price — since proportional rationing preserves each country's demand SHARE, this is also the correct $/unit for revenue even when capacity can't cover every country's demand in full. */
  weightedAveragePrice: number;
}

/**
 * Solo-mode demand: sums this product's demand across every country the
 * company is licensed to sell into. Each country gets its OWN
 * attractiveness computed from its OWN price (`priceForCountry`) — real
 * price discrimination, not one shared price — while quality/brand/
 * innovation stay the product/company's single shared values (a country's
 * demandWeights aren't reweighted into solo's multiplicative formula,
 * only its per-product, year-compounding demand multiplier is — see
 * effectiveDemandMultiplier(); REGIONS_DESIGN.md has why weight-blending is
 * scoped as a multiplayer-only nuance). Expanding into more licensed
 * countries directly grows total addressable demand — the incentive to
 * bother with licenses at all in solo mode.
 */
function computeSoloCountryDemand(
  product: ProductLineState,
  def: ProductDefinition,
  companyState: CompanyYearState,
  priceForCountry: (countryId: CountryId) => number,
  gameYear: number,
): SoloCountryDemand {
  let totalDemand = 0;
  let crossBorderDemand = 0;
  let weightedPriceSum = 0;

  for (const countryId of companyState.licensedCountries) {
    const country = getCountryDefinition(countryId);
    const price = priceForCountry(countryId);
    const attractiveness = computeAttractiveness(
      product,
      companyState.brandAwareness,
      companyState.innovation,
      price,
      def.referencePrice,
    );
    const countryDemand = def.baseDemandUnits * effectiveDemandMultiplier(country, def.id, gameYear) * attractiveness;
    totalDemand += countryDemand;
    weightedPriceSum += countryDemand * price;
    if (!product.factoryCountries.includes(countryId)) crossBorderDemand += countryDemand;
  }

  return {
    totalDemand,
    transportSurchargePerUnit: totalDemand > 0 ? (crossBorderDemand / totalDemand) * TRANSPORT_COST_PER_UNIT : 0,
    weightedAveragePrice: totalDemand > 0 ? weightedPriceSum / totalDemand : priceForCountry("france"),
  };
}

export interface SimulateYearInput {
  decision: YearDecision;
  openingState: CompanyYearState;
  /** All events affecting this player this year (global + player-scoped, any product). */
  events: RandomEvent[];
  /**
   * Per-product units of demand allocated to this player this year, before
   * event demand multipliers are applied. When omitted (solo mode), demand
   * is computed from each licensed country's own baseDemandUnits *
   * attractiveness (see computeSoloCountryDemand). In multiplayer,
   * simulateMultiplayerYear supplies this per product from each player's
   * share of that product's total demand, summed across countries.
   */
  demandUnitsOverride?: Partial<Record<ProductId, number>>;
  /**
   * Multiplayer only — precomputed weighted-average $/unit transport
   * surcharge per product (see simulateMultiplayerYear). Ignored in solo
   * mode, where it's computed internally instead.
   */
  transportSurchargePerUnitOverride?: Partial<Record<ProductId, number>>;
  /**
   * Multiplayer only — precomputed demand-weighted average $/unit price per
   * product (see simulateMultiplayerYear), needed because a player's price
   * can now vary per country (ProductDecision.priceByCountry). Falls back
   * to the product's flat `price` when omitted (solo computes its own
   * weighted average internally instead — see computeSoloCountryDemand).
   */
  revenuePerUnitOverride?: Partial<Record<ProductId, number>>;
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
 *   simplification, not full accrual accounting. License/research costs
 *   follow qualityInvestment's precedent (pure cash outflow, no asset, no
 *   P&L line); factory costs follow capacityInvestment's (added to
 *   fixedAssets, since a factory is a real capital asset).
 * - `roiPct` is net profit over total assets, not over equity.
 * See docs/DATA_MODEL.md, docs/GAME_DESIGN.md and docs/REGIONS_DESIGN.md for open questions.
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

  // --- international expansion: resolve this year's factory/license/research picks first ---
  // (Effective NEXT year, same "this year's investment pays off next year"
  // rule as everything else — this year's production/demand still uses the
  // OPENING licensedCountries/factoryCountries.)
  const newlyOpenedFactoryCountries: CountryId[] = [];
  let totalFactoryCost = 0;
  for (const id of PRODUCT_IDS) {
    const target = decision.products[id].openFactoryIn;
    if (
      target &&
      !openingState.openedFactoryCountries.includes(target) &&
      !newlyOpenedFactoryCountries.includes(target)
    ) {
      newlyOpenedFactoryCountries.push(target);
      totalFactoryCost += getCountryDefinition(target).factoryCost;
    }
  }
  const openedFactoryCountries = [...openingState.openedFactoryCountries, ...newlyOpenedFactoryCountries];

  const licenseTarget = decision.company.licenseCountry;
  const buyingNewLicense = !!licenseTarget && !openingState.licensedCountries.includes(licenseTarget);
  const licenseCost = buyingNewLicense ? getCountryDefinition(licenseTarget).licenseCost : 0;
  const licensedCountries = buyingNewLicense
    ? [...openingState.licensedCountries, licenseTarget]
    : openingState.licensedCountries;

  // Any number of countries at once (not just one) — a bot never buys this
  // (see botAi.ts), so this only ever comes from a human player's UI.
  const requestedResearch = Array.from(new Set(decision.company.researchCountries ?? []));
  const newResearchTargets = requestedResearch.filter((c) => !openingState.researchedCountries.includes(c));
  const researchCost = newResearchTargets.reduce((sum, c) => sum + getCountryDefinition(c).researchCost, 0);
  const researchedCountries =
    newResearchTargets.length > 0 ? [...openingState.researchedCountries, ...newResearchTargets] : openingState.researchedCountries;

  for (const id of PRODUCT_IDS) {
    const def = getProductDefinition(id);
    const product = openingState.products[id];
    const pDecision = decision.products[id];
    const merged = mergeForProduct(events, id);

    const priceCapFactor = Math.min(1, merged.priceCapMultiplier);
    const priceForCountry = (countryId: CountryId) => (pDecision.priceByCountry?.[countryId] ?? pDecision.price) * priceCapFactor;

    const overrideDemand = input.demandUnitsOverride?.[id];
    let potentialDemand: number;
    let transportSurchargePerUnit: number;
    let effectivePrice: number; // demand-weighted $/unit, used for revenue
    if (overrideDemand !== undefined) {
      potentialDemand = overrideDemand * merged.demandMultiplier;
      transportSurchargePerUnit = input.transportSurchargePerUnitOverride?.[id] ?? 0;
      effectivePrice = (input.revenuePerUnitOverride?.[id] ?? pDecision.price) * priceCapFactor;
    } else {
      const soloDemand = computeSoloCountryDemand(product, def, openingState, priceForCountry, decision.year);
      potentialDemand = soloDemand.totalDemand * merged.demandMultiplier;
      transportSurchargePerUnit = soloDemand.transportSurchargePerUnit;
      effectivePrice = soloDemand.weightedAveragePrice;
    }

    // Production is still ONE shared employees/wage/capacity pool per
    // product (see ProductLineState.factoryCountries) — the decision here
    // is only how much of that shared capacity's output to attribute to
    // each currently-open factory, which in turn decides each factory's
    // SHARE of the wage bill's labor-cost multiplier below. If the
    // requested total exceeds what capacity/staff can run, every factory's
    // requested volume is scaled down proportionally (shares — and so the
    // weighted labor multiplier — stay the same either way).
    const requestedVolumeByFactory = product.factoryCountries.map((countryId) => ({
      countryId,
      volume: Math.max(0, pDecision.productionVolumeByFactory[countryId] ?? 0),
    }));
    const totalRequestedVolume = requestedVolumeByFactory.reduce((sum, f) => sum + f.volume, 0);

    const laborCapacity = computeLaborCapacity(product);
    const effectiveCapacity = Math.min(product.productionCapacity, laborCapacity);
    const unitsProduced = clamp(totalRequestedVolume, 0, effectiveCapacity);
    const unitsAvailable = product.inventoryUnits + unitsProduced;
    const unitsSold = Math.max(0, Math.min(potentialDemand, unitsAvailable));
    const unsoldInventoryUnits = Math.round(Math.max(0, unitsAvailable - unitsSold));

    const unitCost = def.baseUnitCost * merged.unitCostMultiplier + transportSurchargePerUnit;
    const cogs = unitsSold * unitCost;
    const revenue = unitsSold * effectivePrice;
    const grossProfit = revenue - cogs;

    const weightedLaborCostMultiplier =
      totalRequestedVolume > 0
        ? requestedVolumeByFactory.reduce(
            (sum, f) => sum + (f.volume / totalRequestedVolume) * getCountryDefinition(f.countryId).laborCostMultiplier,
            0,
          )
        : product.factoryCountries.reduce((sum, c) => sum + getCountryDefinition(c).laborCostMultiplier, 0) /
          Math.max(1, product.factoryCountries.length);
    const wagesExpense = product.employees * product.wageLevel * weightedLaborCostMultiplier;
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
    const openTarget = pDecision.openFactoryIn;
    const factoryCountries =
      openTarget && !product.factoryCountries.includes(openTarget)
        ? [...product.factoryCountries, openTarget]
        : product.factoryCountries;

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
      factoryCountries,
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
    openingState.fixedAssets + totalCapacityInvestment + totalFactoryCost + decision.company.capexSpend - depreciation,
  );

  const cash =
    openingState.cash +
    netProfit +
    depreciation - // non-cash expense, add back
    totalCapacityInvestment -
    totalQualityInvestment -
    totalFactoryCost -
    licenseCost -
    researchCost -
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
    licensedCountries,
    openedFactoryCountries,
    researchedCountries,
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

interface DemandCandidate {
  price: number;
  quality: number;
  brand: number;
  innovation: number;
}

/**
 * Splits a product's demand pool among competing players by category
 * leadership rather than smooth proportional attractiveness: each category
 * (cheapest price / highest quality / highest brand / highest innovation)
 * hands its whole weighted share to whoever's winning it that year — ties
 * split the category's share evenly. A player who wins every category that
 * matters for a product takes the whole pool; one who wins nothing gets 0
 * from this product (their other two product lines may still carry them).
 *
 * This deliberately does NOT redistribute a winner's unclaimed share if
 * they can't produce/sell it all (production/labor-capacity caps that in
 * simulateYear already) — a simplification, not a bug: a capacity-starved
 * market leader just leaves demand on the table rather than handing it to
 * the runner-up.
 */
function allocateDemandShares(candidates: DemandCandidate[], weights: DemandWeightProfile): number[] {
  const EPSILON = 1e-9;
  const shares = candidates.map(() => 0);

  const categories: { key: keyof DemandCandidate; weight: number; lowerIsBetter?: boolean }[] = [
    { key: "price", weight: weights.priceWeight, lowerIsBetter: true },
    { key: "quality", weight: weights.qualityWeight },
    { key: "brand", weight: weights.brandWeight },
    { key: "innovation", weight: weights.innovationWeight },
  ];

  for (const category of categories) {
    if (category.weight <= 0 || candidates.length === 0) continue;
    const values = candidates.map((c) => c[category.key]);
    const best = category.lowerIsBetter ? Math.min(...values) : Math.max(...values);
    const winnerIndices = values.reduce<number[]>(
      (acc, v, i) => (Math.abs(v - best) < EPSILON ? [...acc, i] : acc),
      [],
    );
    const perWinnerSharePct = category.weight / winnerIndices.length;
    for (const i of winnerIndices) shares[i] += perWinnerSharePct;
  }

  return shares.map((sharePct) => sharePct / 100);
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
  /** Overrides a product's baseDemandUnits (still scaled by each country's per-product, year-compounding demand multiplier and eligible-player count) — mainly for tests. */
  totalDemandBaseByProduct?: Partial<Record<ProductId, number>>;
}

export interface SimulateMultiplayerYearOutput {
  market: MarketYearState;
  results: YearResult[];
}

/**
 * Multiplayer version of simulateYear: for each product, for each country,
 * splits that country's demand pool (baseDemandUnits × country's
 * per-product, year-compounding demand multiplier — effectiveDemandMultiplier()
 * — × number of players actually LICENSED there) among only the licensed
 * players by category leadership (see allocateDemandShares),
 * using weights blended from the product's own profile and that country's
 * customer preferences (blendDemandWeights). A player not licensed in a
 * country gets none of its demand and doesn't dilute anyone else's share
 * there. Each player's per-product demand is the SUM across every country
 * they're licensed in, same as solo — see computeSoloCountryDemand.
 */
export function simulateMultiplayerYear(input: SimulateMultiplayerYearInput): SimulateMultiplayerYearOutput {
  const { year, players, globalEvents } = input;
  const globalMerged = mergeAll(globalEvents);

  const demandUnitsOverrideByPlayer: Partial<Record<ProductId, number>>[] = players.map(() => ({}));
  const transportSurchargeByPlayer: Partial<Record<ProductId, number>>[] = players.map(() => ({}));
  const revenuePerUnitByPlayer: Partial<Record<ProductId, number>>[] = players.map(() => ({}));
  const productShareByPlayer: Record<ProductId, number>[] = players.map(() => ({}) as Record<ProductId, number>);
  const playerShares: Record<string, number> = {};
  let weightedPriceSum = 0;
  let totalDemandAllProducts = 0;

  for (const id of PRODUCT_IDS) {
    const def = getProductDefinition(id);
    const productBaseDemand = input.totalDemandBaseByProduct?.[id] ?? def.baseDemandUnits;
    const totalDemandByPlayer = players.map(() => 0);
    const crossBorderDemandByPlayer = players.map(() => 0);
    const weightedPriceSumByPlayer = players.map(() => 0);

    for (const countryId of COUNTRY_IDS) {
      const country = getCountryDefinition(countryId);
      const eligible = players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.openingState.licensedCountries.includes(countryId));
      if (eligible.length === 0) continue;

      const blendedWeights = blendDemandWeights(def.demandWeights, country.demandWeights);
      const candidates: DemandCandidate[] = eligible.map(({ p }) => ({
        // Real price discrimination: a player's price for THIS country, or
        // their flat default if they haven't set one for it.
        price: p.decision.products[id].priceByCountry?.[countryId] ?? p.decision.products[id].price,
        quality: p.openingState.products[id].quality,
        brand: p.openingState.brandAwareness,
        innovation: p.openingState.innovation,
      }));
      const shareFractions = allocateDemandShares(candidates, blendedWeights);
      const countryDemandBase = productBaseDemand * effectiveDemandMultiplier(country, id, year) * eligible.length;

      eligible.forEach(({ p, i }, k) => {
        const units = countryDemandBase * shareFractions[k];
        totalDemandByPlayer[i] += units;
        weightedPriceSumByPlayer[i] += units * candidates[k].price;
        if (!p.openingState.products[id].factoryCountries.includes(countryId)) {
          crossBorderDemandByPlayer[i] += units;
        }
      });
    }

    const totalAcrossPlayers = totalDemandByPlayer.reduce((a, b) => a + b, 0) || 1;

    players.forEach((p, i) => {
      const total = totalDemandByPlayer[i];
      demandUnitsOverrideByPlayer[i][id] = total;
      transportSurchargeByPlayer[i][id] = total > 0 ? (crossBorderDemandByPlayer[i] / total) * TRANSPORT_COST_PER_UNIT : 0;
      revenuePerUnitByPlayer[i][id] = total > 0 ? weightedPriceSumByPlayer[i] / total : p.decision.products[id].price;
      const sharePct = (total / totalAcrossPlayers) * 100;
      productShareByPlayer[i][id] = sharePct;
      if (id === "shortboard") {
        // Use the highest-volume product as the representative figure for
        // the overall company market-share summary shown in MarketYearState.
        playerShares[p.decision.playerId] = sharePct;
        weightedPriceSum += p.decision.products[id].price * (sharePct / 100);
      }
    });

    totalDemandAllProducts += totalAcrossPlayers * globalMerged.demandMultiplier;
  }

  const results = players.map((p, i) => {
    const result = simulateYear({
      decision: p.decision,
      openingState: p.openingState,
      events: [...globalEvents, ...p.playerEvents],
      demandUnitsOverride: demandUnitsOverrideByPlayer[i],
      transportSurchargePerUnitOverride: transportSurchargeByPlayer[i],
      revenuePerUnitOverride: revenuePerUnitByPlayer[i],
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
