/**
 * Core domain data model for the EduGame simulation.
 *
 * This describes the *shape* of game state (what a game/player/year looks
 * like), not the simulation logic itself (how decisions turn into results).
 * See docs/GAME_DESIGN.md for the design this is based on, and
 * docs/DATA_MODEL.md for an explanation of how these types fit together.
 *
 * Framework-agnostic on purpose — no Next.js/React/DB imports here, so it
 * can be reused by simulation logic, API routes, and UI alike.
 */

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
  /** 1 for solo, 2-4 for multiplayer. */
  maxPlayers: number;
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

export interface Player {
  id: string;
  /** Ties to the future accounts/auth system. */
  userId: string;
  displayName: string;
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
}

/**
 * Starting conditions can vary between players (randomized or role-based
 * asymmetric starts) rather than everyone beginning identically.
 */
export interface StartingConditions {
  startingCash: number;
  startingDebt: number;
  startingCapacity: number;
  startingEmployees: number;
  startingPrice: number;
  /** Average wage per employee. */
  startingWageLevel: number;
  /** 0-100 index. */
  startingQuality: number;
  /** 0-100 index. */
  startingBrandAwareness: number;
  /** Optional human-readable note, e.g. "asymmetric start: budget challenger". */
  note?: string;
}

// ===== Company state ========================================================

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
  /** Dollar value of unsold finished-goods stock, valued at latest unit cost. */
  inventory: number;
  /** Physical units of unsold finished-goods stock (drives `inventory`'s $ value). */
  inventoryUnits: number;
  /** Total assets minus total liabilities. */
  equity: number;
  employees: number;
  /** Average wage per employee. */
  wageLevel: number;
  /** 0-100 index. */
  morale: number;
  /** Max units produceable per year. */
  productionCapacity: number;
  /** 0-100 index, raised by quality investment. */
  quality: number;
  /** 0-100 index, raised by marketing spend. */
  brandAwareness: number;
  /** Carried price if left unchanged going into the next year. */
  currentPrice: number;
}

// ===== Decisions (submitted by a player for one year) ======================
//
// Four categories, per docs/GAME_DESIGN.md. Difficulty levels affect which
// fields a player is prompted to change in the UI (lower tiers get sensible
// defaults for the rest) — the underlying decision shape stays the same
// regardless of difficulty, so simulation logic doesn't need to special-case
// tiers. Exact per-tier field exposure is still TBD (see docs/GAME_DESIGN.md).

export interface PricingSalesDecision {
  price: number;
  marketingSpend: number;
  /** Reserved for future market-segmentation mechanics. */
  targetSegment?: string;
}

export interface ProductionOperationsDecision {
  productionVolume: number;
  /** Spend to expand productionCapacity. */
  capacityInvestment: number;
  /** Spend to raise the quality index. */
  qualityInvestment: number;
}

export interface HrStaffingDecision {
  hires: number;
  fires: number;
  /** e.g. +5 for a 5% raise. */
  wageAdjustmentPct: number;
  trainingSpend: number;
}

export interface FinanceInvestmentDecision {
  loanAmountRequested: number;
  loanRepayment: number;
  rndSpend: number;
  /** Capex outside of production-capacity expansion (e.g. other assets). */
  capexSpend: number;
}

export interface YearDecision {
  playerId: string;
  /** 1-indexed simulated year this decision is for. */
  year: number;
  pricingSales: PricingSalesDecision;
  productionOperations: ProductionOperationsDecision;
  hrStaffing: HrStaffingDecision;
  financeInvestment: FinanceInvestmentDecision;
  submittedAt: string; // ISO timestamp
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
  /** Multiplies demand, e.g. 0.85 = -15% demand. */
  demandMultiplier?: number;
  unitCostMultiplier?: number;
  priceCapMultiplier?: number;
  moraleDelta?: number;
  extraCash?: number;
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
  /** Exact base (equity vs. total assets) TBD in simulation rules. */
  roiPct: number;
  debtToEquity: number;
}

export interface MarketMetrics {
  unitsSold: number;
  unitsProduced: number;
  unsoldInventory: number;
  /** Meaningful in multiplayer shared market; undefined in solo. */
  marketSharePct?: number;
  /** Relative demand this year; 100 = baseline. */
  demandIndex: number;
}

export interface YearResult {
  playerId: string;
  year: number;
  openingState: CompanyYearState;
  closingState: CompanyYearState;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  ratios: FinancialRatios;
  marketMetrics: MarketMetrics;
  eventsApplied: RandomEvent[];
}

// ===== Shared market (multiplayer only) =====================================

export interface MarketYearState {
  year: number;
  /** Aggregate units the whole market will absorb this year, before split. */
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
