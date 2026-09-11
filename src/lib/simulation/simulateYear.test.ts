import { describe, expect, it } from "vitest";
import type { CompanyYearState, RandomEvent, YearDecision } from "@/types/game";
import { BASE_UNIT_COST, REFERENCE_PRICE, UNITS_PER_EMPLOYEE } from "./constants";
import { DEFAULT_STARTING_CONDITIONS, createInitialCompanyState } from "./initialState";
import { computeAttractiveness, simulateMultiplayerYear, simulateYear } from "./simulateYear";

function baseState(overrides: Partial<CompanyYearState> = {}): CompanyYearState {
  return { ...createInitialCompanyState(DEFAULT_STARTING_CONDITIONS), ...overrides };
}

function baseDecision(playerId: string, overrides: Partial<YearDecision> = {}): YearDecision {
  return {
    playerId,
    year: 1,
    pricingSales: { price: REFERENCE_PRICE, marketingSpend: 0 },
    productionOperations: { productionVolume: 1000, capacityInvestment: 0, qualityInvestment: 0 },
    hrStaffing: { hires: 0, fires: 0, wageAdjustmentPct: 0, trainingSpend: 0 },
    financeInvestment: { loanAmountRequested: 0, loanRepayment: 0, rndSpend: 0, capexSpend: 0 },
    submittedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("simulateYear", () => {
  it("produces a self-consistent result for a plain year", () => {
    const state = baseState();
    const result = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });

    expect(result.marketMetrics.unitsSold).toBeGreaterThan(0);
    expect(result.marketMetrics.unitsSold).toBeLessThanOrEqual(result.marketMetrics.unitsProduced);
    expect(result.incomeStatement.revenue).toBeCloseTo(result.marketMetrics.unitsSold * REFERENCE_PRICE, 6);
    // Balance sheet must balance by construction.
    expect(result.balanceSheet.totalAssets - result.balanceSheet.totalLiabilities).toBeCloseTo(
      result.balanceSheet.equity,
      6,
    );
    expect(result.closingState.year).toBe(state.year + 1);
  });

  it("sells fewer units when priced above the reference price than when priced at it, all else equal", () => {
    const state = baseState();
    const cheap = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    const expensive = simulateYear({
      decision: baseDecision("p1", { pricingSales: { price: REFERENCE_PRICE * 2, marketingSpend: 0 } }),
      openingState: state,
      events: [],
    });

    expect(expensive.marketMetrics.demandIndex).toBeLessThan(cheap.marketMetrics.demandIndex);
  });

  it("caps production (and therefore units sold) at production capacity", () => {
    const state = baseState({ productionCapacity: 100 });
    const result = simulateYear({
      decision: baseDecision("p1", {
        productionOperations: { productionVolume: 999999, capacityInvestment: 0, qualityInvestment: 0 },
      }),
      openingState: state,
      events: [],
    });

    expect(result.marketMetrics.unitsProduced).toBe(100);
  });

  it("also caps production at what current staff can run, even with plenty of physical capacity", () => {
    const state = baseState({ productionCapacity: 100000, employees: 3 });
    const result = simulateYear({
      decision: baseDecision("p1", {
        productionOperations: { productionVolume: 999999, capacityInvestment: 0, qualityInvestment: 0 },
      }),
      openingState: state,
      events: [],
    });

    expect(result.marketMetrics.unitsProduced).toBe(3 * UNITS_PER_EMPLOYEE);
  });

  it("firing your entire workforce means you can produce (and sell) nothing this year", () => {
    const state = baseState({ productionCapacity: 100000, employees: 0 });
    const result = simulateYear({
      decision: baseDecision("p1", {
        productionOperations: { productionVolume: 999999, capacityInvestment: 0, qualityInvestment: 0 },
      }),
      openingState: state,
      events: [],
    });

    expect(result.marketMetrics.unitsProduced).toBe(0);
    expect(result.marketMetrics.unitsSold).toBe(0);
    expect(result.incomeStatement.revenue).toBe(0);
  });

  it("carries unsold inventory into next year's available stock", () => {
    // Tiny demand (very high price) so most production goes unsold.
    const state = baseState({ productionCapacity: 5000 });
    const result = simulateYear({
      decision: baseDecision("p1", {
        pricingSales: { price: REFERENCE_PRICE * 20, marketingSpend: 0 },
        productionOperations: { productionVolume: 1000, capacityInvestment: 0, qualityInvestment: 0 },
      }),
      openingState: state,
      events: [],
    });

    expect(result.closingState.inventoryUnits).toBeGreaterThan(0);
    expect(result.closingState.inventory).toBeCloseTo(result.closingState.inventoryUnits * BASE_UNIT_COST, 6);
  });

  it("a positive global demand-shock event increases units sold (production/capacity unconstrained)", () => {
    const state = baseState({ productionCapacity: 100000 });
    const decision = baseDecision("p1", {
      productionOperations: { productionVolume: 100000, capacityInvestment: 0, qualityInvestment: 0 },
    });
    const noEvent = simulateYear({ decision, openingState: state, events: [] });
    const boostEvent: RandomEvent = {
      id: "evt_test",
      year: 1,
      type: "demand_shock_positive",
      scope: "global",
      description: "test",
      effects: { demandMultiplier: 1.5 },
    };
    const withEvent = simulateYear({ decision, openingState: state, events: [boostEvent] });

    expect(withEvent.marketMetrics.unitsSold).toBeGreaterThan(noEvent.marketMetrics.unitsSold);
  });

  it("a price-cap event reduces revenue but does not change the closing sticker price", () => {
    const state = baseState({ productionCapacity: 100000 });
    const decision = baseDecision("p1", {
      pricingSales: { price: 100, marketingSpend: 0 },
      productionOperations: { productionVolume: 100000, capacityInvestment: 0, qualityInvestment: 0 },
    });
    const capEvent: RandomEvent = {
      id: "evt_cap",
      year: 1,
      type: "competitor_price_war",
      scope: "player",
      affectedPlayerId: "p1",
      description: "test",
      effects: { priceCapMultiplier: 0.5 },
    };
    const uncapped = simulateYear({ decision, openingState: state, events: [] });
    const capped = simulateYear({ decision, openingState: state, events: [capEvent] });

    // With elastic demand (PRICE_ELASTICITY > 1) a forced price cut actually
    // raises revenue here (more units sold than the price drop "costs"), but
    // it still compresses margin since unit cost is unaffected.
    expect(capped.ratios.grossMarginPct).toBeLessThan(uncapped.ratios.grossMarginPct);
    // The player's set price still carries forward as the sticker price.
    expect(capped.closingState.currentPrice).toBe(100);
  });

  it("a loan increases both cash and debt by the same amount, all else equal", () => {
    const state = baseState();
    const withoutLoan = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    const withLoan = simulateYear({
      decision: baseDecision("p1", {
        financeInvestment: { loanAmountRequested: 10000, loanRepayment: 0, rndSpend: 0, capexSpend: 0 },
      }),
      openingState: state,
      events: [],
    });

    expect(withLoan.closingState.debt - withoutLoan.closingState.debt).toBeCloseTo(10000, 6);
    expect(withLoan.closingState.cash - withoutLoan.closingState.cash).toBeCloseTo(10000, 6);
  });

  it("firing employees reduces morale and headcount", () => {
    const state = baseState({ employees: 10, morale: 70 });
    const result = simulateYear({
      decision: baseDecision("p1", { hrStaffing: { hires: 0, fires: 3, wageAdjustmentPct: 0, trainingSpend: 0 } }),
      openingState: state,
      events: [],
    });

    expect(result.closingState.employees).toBe(7);
    expect(result.closingState.morale).toBeLessThan(70);
  });
});

describe("computeAttractiveness", () => {
  it("increases with quality and brand awareness, decreases with price", () => {
    const low = computeAttractiveness(baseState({ quality: 10, brandAwareness: 10 }), REFERENCE_PRICE);
    const high = computeAttractiveness(baseState({ quality: 90, brandAwareness: 90 }), REFERENCE_PRICE);
    expect(high).toBeGreaterThan(low);

    const cheap = computeAttractiveness(baseState(), REFERENCE_PRICE / 2);
    const expensive = computeAttractiveness(baseState(), REFERENCE_PRICE * 2);
    expect(cheap).toBeGreaterThan(expensive);
  });
});

describe("simulateMultiplayerYear", () => {
  it("splits shares that sum to ~100 and gives identical players equal shares", () => {
    const state = baseState({ productionCapacity: 100000 });
    const decision1 = baseDecision("p1", {
      productionOperations: { productionVolume: 100000, capacityInvestment: 0, qualityInvestment: 0 },
    });
    const decision2 = baseDecision("p2", {
      productionOperations: { productionVolume: 100000, capacityInvestment: 0, qualityInvestment: 0 },
    });

    const { market, results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision1, openingState: state, playerEvents: [] },
        { decision: decision2, openingState: state, playerEvents: [] },
      ],
      globalEvents: [],
    });

    const totalShare = Object.values(market.playerShares).reduce((a, b) => a + b, 0);
    expect(totalShare).toBeCloseTo(100, 6);
    expect(market.playerShares["p1"]).toBeCloseTo(50, 6);
    expect(market.playerShares["p2"]).toBeCloseTo(50, 6);
    expect(results[0].marketMetrics.unitsSold).toBeCloseTo(results[1].marketMetrics.unitsSold, 6);
  });

  it("gives a cheaper/higher-quality player a larger share than a rival", () => {
    const weakState = baseState({ quality: 30, brandAwareness: 20, productionCapacity: 100000 });
    const strongState = baseState({ quality: 90, brandAwareness: 90, productionCapacity: 100000 });
    const decision = (id: string) =>
      baseDecision(id, {
        productionOperations: { productionVolume: 100000, capacityInvestment: 0, qualityInvestment: 0 },
      });

    const { market } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision("weak"), openingState: weakState, playerEvents: [] },
        { decision: decision("strong"), openingState: strongState, playerEvents: [] },
      ],
      globalEvents: [],
    });

    expect(market.playerShares["strong"]).toBeGreaterThan(market.playerShares["weak"]);
  });
});
