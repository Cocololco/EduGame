/**
 * Core domain data model for the EduGame simulation.
 *
 * The player runs a surfboard company with three product lines
 * (shortboard/longboard/fishboard), each with its own price, production,
 * staffing, quality and training decisions. Brand awareness, R&D
 * ("innovation"), financing and general capex are company-wide, shared
 * across all three lines. See docs/GAME_DESIGN.md for the design this is
 * based on, and docs/DATA_MODEL.md for an explanation of how these types
 * fit together.
 *
 * Framework-agnostic on purpose — no Next.js/React/DB imports here, so it
 * can be reused by simulation logic, API routes, and UI alike.
 */

// ===== Products ==============================================================

export type ProductId = "shortboard" | "longboard" | "fishboard";

export const PRODUCT_IDS: ProductId[] = ["shortboard", "longboard", "fishboard"];

/**
 * How much each competitive lever matters for winning a product's
 * multiplayer demand pool — see DemandWeightProfile below. Each product has
 * its own profile (e.g. shortboard buyers care mostly about price; luxury
 * fishboard buyers care mostly about quality).
 */
export interface DemandWeightProfile {
  /** Share of the pool (0-100) awarded to whoever has the CHEAPEST price. */
  priceWeight: number;
  /** Share of the pool (0-100) awarded to whoever has the HIGHEST quality. */
  qualityWeight: number;
  /** Share of the pool (0-100) awarded to whoever has the HIGHEST brand awareness. */
  brandWeight: number;
  /** Share of the pool (0-100) awarded to whoever has the HIGHEST innovation. */
  innovationWeight: number;
}

/** Static, unchanging config for a product line — not part of game state. */
export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  /** Price at which the price-attractiveness factor is neutral (1.0) for this product. Used in solo mode. */
  referencePrice: number;
  /** Cost to produce one unit of this product, before cost-affecting events. */
  baseUnitCost: number;
  /** Baseline yearly demand ceiling for this product, before attractiveness/events (solo) or per-player pool sizing (multiplayer). */
  baseDemandUnits: number;
  /** Multiplayer only — see DemandWeightProfile. Weights sum to 100. */
  demandWeights: DemandWeightProfile;
}

// ===== Countries ==============================================================

export type CountryId = "france" | "morocco" | "portugal" | "china" | "australia";

export const COUNTRY_IDS: CountryId[] = ["france", "morocco", "portugal", "china", "australia"];

/** Static, unchanging config for a country — not part of game state. See docs/REGIONS_DESIGN.md. */
export interface CountryDefinition {
  id: CountryId;
  name: string;
  description: string;
  /** Multiplies wages for a product manufactured there (see ProductLineState.factoryCountries). */
  laborCostMultiplier: number;
  /**
   * Multiplies each product's baseDemandUnits for sales into this country —
   * per product, not one flat country-wide number: a country's surf market
   * can skew heavily toward mass-market boards or toward the premium/niche
   * line (e.g. Australia's genuine enthusiast culture supports luxury boards
   * far better than China's nascent one does). See docs/REGIONS_DESIGN.md.
   */
  demandMultiplierByProduct: Record<ProductId, number>;
  /**
   * Slow, deterministic year-over-year compounding growth (or 0 for a
   * mature/saturated market) applied to every one of this country's
   * demandMultiplierByProduct values — e.g. China's tiny-but-emerging surf
   * culture grows a few percent a year while France's stays flat. See
   * `effectiveDemandMultiplier()` in countries.ts.
   */
  demandGrowthRatePerYear: number;
  /** This country's own customer preferences — blended with a product's own weights, see blendDemandWeights(). */
  demandWeights: DemandWeightProfile;
  /** One-time cost to license selling into this country. 0 for the free starting country (France). */
  licenseCost: number;
  /** One-time cost to open a factory there. 0 for the free starting factory (France). */
  factoryCost: number;
  /** Cost to reveal this country's demandWeights in the UI (the engine always uses the real numbers regardless — see REGIONS_DESIGN.md). */
  researchCost: number;
}

// ===== Game & players =====================================================

export type GameMode = "solo" | "multiplayer";

export type GameStatus = "setup" | "in_progress" | "completed";

export type DifficultyLevel = "beginner" | "standard" | "advanced";

export interface GameConfig {
  id: string;
  mode: GameMode;
  difficulty: DifficultyLevel;
  /** Total number of simulated years; configurable at game creation. */
  totalYears: number;
  /** Random events are always on for now, but kept togglable per design doc. */
  randomEventsEnabled: boolean;
  /** 1 for solo, 2-4 for multiplayer. Total seats, human + bot. */
  maxPlayers: number;
  /**
   * Multiplayer only: how many of maxPlayers are reserved for bots, fixed
   * at creation. Human seats = maxPlayers - numBots; bots are added when
   * the host starts the game, regardless of how many humans joined by then.
   */
  numBots: number;
  createdAt: string; // ISO timestamp
  createdByUserId: string;
}

export interface Game {
  config: GameConfig;
  status: GameStatus;
  /** 0 = not started yet; N = year N is either in progress or just resolved. */
  currentYear: number;
  players: Player[];
  /**
   * One entry per resolved year, shared across all players. Only meaningful
   * in multiplayer (shared-market mode); left empty in solo games.
   */
  market: MarketYearState[];
  updatedAt: string; // ISO timestamp, bumped on every mutation (supports resume)
}

/** Simple heuristic bot decision styles — see src/lib/game/botAi.ts. */
export type BotPersonality = "aggressive" | "premium" | "balanced";

export interface Player {
  id: string;
  /** Ties to the future accounts/auth system — currently a localStorage-generated id, not real auth (see docs/GAME_DESIGN.md). */
  userId: string;
  displayName: string;
  /** Optional company/brand name, separate from the player's own name. */
  companyName?: string;
  /** Seat/turn order; also used for tie-breaking in scoring. */
  joinOrder: number;
  startingConditions: StartingConditions;
  /** Index 0 = the starting state (year 0), then one entry per resolved year. */
  companyStates: CompanyYearState[];
  /** Decisions submitted so far, one per resolved (or pending) year, in order. */
  decisions: YearDecision[];
  /** Simulation results so far, one per resolved year, in order. */
  results: YearResult[];
  /** Set once the game completes. */
  finalScore?: Score;
  /** Multiplayer only. */
  isBot?: boolean;
  botPersonality?: BotPersonality;
  /**
   * Multiplayer only: this player's decision for the CURRENT (not yet
   * resolved) year, submitted but waiting on other players. Cleared once
   * the year resolves and gets appended to `decisions`/`results` for
   * everyone at once.
   */
  pendingDecision?: YearDecisionInput;
}

/**
 * Starting conditions can vary between players (randomized or role-based
 * asymmetric starts) rather than everyone beginning identically.
 */
export interface StartingConditions {
  startingCash: number;
  startingDebt: number;
  /** 0-100 index. */
  startingBrandAwareness: number;
  /** 0-100 index (R&D-driven). */
  startingInnovation: number;
  /** 0-100 index. */
  startingMorale: number;
  products: Record<ProductId, ProductStartingConditions>;
  /** Optional human-readable note, e.g. "asymmetric start: budget challenger". */
  note?: string;
}

export interface ProductStartingConditions {
  startingCapacity: number;
  startingEmployees: number;
  startingWageLevel: number;
  /** 0-100 index. */
  startingQuality: number;
  /** 0-100 index — workforce skill/productivity, raised by training. */
  startingProductivity: number;
  startingPrice: number;
}

// ===== Company state ========================================================

/** Snapshot of one product line at a point in time. */
export interface ProductLineState {
  productId: ProductId;
  /** Carried price if left unchanged going into the next year. */
  currentPrice: number;
  /** Max units producible per year (the physical plant). */
  productionCapacity: number;
  employees: number;
  /** Average wage per employee for this product line. */
  wageLevel: number;
  /** 0-100 index, raised by quality investment. */
  quality: number;
  /** 0-100 index, raised by training spend; drives labor productivity and a bit of quality. */
  productivity: number;
  /** Physical units of unsold finished-goods stock, carried forward. */
  inventoryUnits: number;
  /** Dollar value of that stock, valued at latest unit cost. */
  inventoryValue: number;
  /**
   * Every country this product line currently manufactures in — each must
   * be one of the company's `openedFactoryCountries`. A product can run
   * factories in more than one country at once (see ProductDecision.
   * openFactoryIn); its shared employees/wageLevel/productionCapacity pool
   * is what production is split across, not a separate headcount per
   * factory — see docs/REGIONS_DESIGN.md for that simplification. Any
   * country a factory is NOT open in incurs a transport surcharge on sales
   * there; wages are charged at each factory's own labor-cost multiplier,
   * weighted by how much of this year's production came from it. Starts
   * as `["france"]`.
   */
  factoryCountries: CountryId[];
}

/**
 * Snapshot of a player's company at a point in time (end of a given year,
 * or year 0 for the initial state before any decisions are made).
 */
export interface CompanyYearState {
  year: number;
  cash: number;
  debt: number;
  /** Capex-derived asset value, net of depreciation. */
  fixedAssets: number;
  /** Total assets minus total liabilities. */
  equity: number;
  /** 0-100 index, company-wide, raised by marketing spend. */
  brandAwareness: number;
  /** 0-100 index, company-wide, raised by R&D spend. */
  innovation: number;
  /** 0-100 index, company-wide. */
  morale: number;
  products: Record<ProductId, ProductLineState>;
  /** Countries you're allowed to sell into at all — no license, zero demand there, full stop. Starts ["france"] (free). */
  licensedCountries: CountryId[];
  /** Countries with an open factory (paid once via a product's openFactoryIn, waived for any later product opening one in a country already on this list) — every entry of a product's factoryCountries must be one of these. Starts ["france"] (free). */
  openedFactoryCountries: CountryId[];
  /** Countries whose demandWeights are revealed in the UI (engine always uses the real numbers regardless of this). Starts ["france"] (told to you for free at game start). */
  researchedCountries: CountryId[];
}

// ===== Decisions (submitted by a player for one year) ======================
//
// Per-product decisions (price, production, capacity, quality, training,
// hiring) plus one company-wide decision (brand marketing, R&D, financing,
// general capex). Difficulty levels affect which fields a player is
// prompted to change in the UI (lower tiers get sensible defaults for the
// rest) — the underlying decision shape stays the same regardless of
// difficulty, so simulation logic doesn't need to special-case tiers.

export interface ProductDecision {
  productId: ProductId;
  /** Default/fallback price — used for any licensed country without its own entry in priceByCountry, and always for a not-yet-licensed country's demand math. */
  price: number;
  /**
   * Real price discrimination: an independent price per licensed country,
   * overriding `price` for that country only. A country with no entry here
   * just uses `price`. Affects that country's own demand (via the same
   * price-elasticity formula, using that country's price) and its share of
   * revenue — see docs/RULES.md.
   */
  priceByCountry?: Partial<Record<CountryId, number>>;
  /**
   * How many units to produce at EACH of this product's current
   * factoryCountries (a country with no entry here produces 0). The total
   * across all factories is still capped by the shared labor/physical
   * capacity, same as a single-factory product — see docs/RULES.md.
   */
  productionVolumeByFactory: Partial<Record<CountryId, number>>;
  /** Spend to expand this product's production capacity, next year. */
  capacityInvestment: number;
  /** Spend to raise this product's quality index, next year. */
  qualityInvestment: number;
  /** Spend to raise this product's productivity index, next year (also feeds quality a little). */
  trainingSpend: number;
  hires: number;
  fires: number;
  /** e.g. +5 for a 5% raise. */
  wageAdjustmentPct: number;
  /**
   * Open an ADDITIONAL manufacturing base for this product in this
   * country, effective next year (on top of, not instead of, any factories
   * it already runs — see ProductLineState.factoryCountries). If that
   * country isn't already in `openedFactoryCountries`, this pays its
   * one-time factoryCost; opening where the company already has a factory
   * (for this or another product) is free. Omit for "don't open a new one
   * this year".
   */
  openFactoryIn?: CountryId;
}

export interface CompanyDecision {
  /** Company-wide marketing spend, raises brandAwareness (shared across all products). */
  marketingSpend: number;
  /** Company-wide R&D spend, raises innovation (quality bonus + cheaper capacity, across all products). */
  rndSpend: number;
  loanAmountRequested: number;
  loanRepayment: number;
  /** General capex, not tied to one product. */
  capexSpend: number;
  /** Buy a license for this country, effective next year (one-time cost, omit/undefined for none this year). */
  licenseCountry?: CountryId;
  /** Pay to reveal these countries' demandWeights in the UI, effective next year — any number at once, cost is per country (omit/empty for none this year). */
  researchCountries?: CountryId[];
}

export interface YearDecision {
  playerId: string;
  /** 1-indexed simulated year this decision is for. */
  year: number;
  company: CompanyDecision;
  products: Record<ProductId, ProductDecision>;
  submittedAt: string; // ISO timestamp
}

/**
 * The shape a player actually fills in — everything about YearDecision
 * except what's derived when the year resolves (playerId/year/submittedAt).
 * Used both for solo (src/lib/game/createGame.ts re-exports these) and for
 * a multiplayer player's submitted-but-unresolved decision
 * (Player.pendingDecision below).
 */
export type ProductDecisionInput = Omit<ProductDecision, "productId">;

export interface YearDecisionInput {
  company: CompanyDecision;
  products: Record<ProductId, ProductDecisionInput>;
}

// ===== Random events =========================================================

export type RandomEventScope = "global" | "player";

export type RandomEventType =
  | "economic_downturn"
  | "demand_shock_positive"
  | "demand_shock_negative"
  | "supply_disruption"
  | "competitor_price_war"
  | "cost_inflation"
  | "regulatory_change";

export interface RandomEventEffects {
  /** Multiplies demand, e.g. 0.85 = -15% demand. Applies to all products unless productId is set. */
  demandMultiplier?: number;
  unitCostMultiplier?: number;
  priceCapMultiplier?: number;
  moraleDelta?: number;
  extraCash?: number;
  /** When set, the above only apply to this one product; otherwise company-wide (all products). */
  productId?: ProductId;
}

export interface RandomEvent {
  id: string;
  year: number;
  type: RandomEventType;
  scope: RandomEventScope;
  /** Set when scope === "player". */
  affectedPlayerId?: string;
  description: string;
  effects: RandomEventEffects;
}

// ===== Simulated year result ================================================

/** Per-product revenue/cost breakdown for one year. */
export interface ProductYearResult {
  productId: ProductId;
  unitsProduced: number;
  unitsSold: number;
  unsoldInventory: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  wagesExpense: number;
  trainingExpense: number;
  /** Relative demand this product saw this year; 100 = baseline. */
  demandIndex: number;
  marketSharePct?: number;
}

export interface IncomeStatement {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marketingExpense: number;
  wagesExpense: number;
  trainingExpense: number;
  rndExpense: number;
  otherOperatingExpense: number;
  operatingProfit: number;
  interestExpense: number;
  netProfit: number;
  byProduct: ProductYearResult[];
}

export interface BalanceSheet {
  cash: number;
  inventory: number;
  fixedAssets: number;
  totalAssets: number;
  debt: number;
  totalLiabilities: number;
  equity: number;
}

export interface FinancialRatios {
  grossMarginPct: number;
  netMarginPct: number;
  /** Net profit over total assets. */
  roiPct: number;
  debtToEquity: number;
}

export interface YearResult {
  playerId: string;
  year: number;
  openingState: CompanyYearState;
  closingState: CompanyYearState;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  ratios: FinancialRatios;
  eventsApplied: RandomEvent[];
}

// ===== Shared market (multiplayer only) =====================================

export interface MarketYearState {
  year: number;
  /** Aggregate units the whole market will absorb this year, before split (informational). */
  totalDemand: number;
  avgMarketPrice: number;
  /** playerId -> market share percentage; entries sum to ~100. */
  playerShares: Record<string, number>;
}

// ===== Scoring ===============================================================

export interface ScoreWeights {
  netProfitWeight: number;
  valuationWeight: number;
  marketShareGrowthWeight: number;
}

export interface Score {
  playerId: string;
  cumulativeNetProfit: number;
  /** Final equity / net worth. */
  finalValuation: number;
  /** Multiplayer only. */
  marketShareGrowthPct?: number;
  weights: ScoreWeights;
  compositeScore: number;
  /** Position among players in this game, once ranked. */
  rank?: number;
}

// ===== Leaderboard ===========================================================

/** One completed-game entry, stored locally (see src/lib/game/leaderboard.ts). */
export interface LeaderboardEntry {
  id: string;
  gameId: string;
  playerName: string;
  companyName?: string;
  completedAt: string; // ISO timestamp
  totalYears: number;
  difficulty: DifficultyLevel;
  cumulativeNetProfit: number;
  finalValuation: number;
  compositeScore: number;
}
