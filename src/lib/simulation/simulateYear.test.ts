import { describe, expect, it } from "vitest";
import type { CompanyDecision, CompanyYearState, ProductDecision, ProductId, RandomEvent, YearDecision } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { CAPACITY_COST_PER_UNIT } from "./constants";
import { DEFAULT_STARTING_CONDITIONS, createInitialCompanyState } from "./initialState";
import { PRODUCT_DEFINITIONS } from "./products";
import {
  computeAttractiveness,
  computeCapacityCostPerUnit,
  computeLaborCapacity,
  simulateMultiplayerYear,
  simulateYear,
} from "./simulateYear";

function baseState(overrides: Partial<CompanyYearState> = {}): CompanyYearState {
  return { ...createInitialCompanyState(DEFAULT_STARTING_CONDITIONS), ...overrides };
}

function noOpProductDecision(id: ProductId, overrides: Partial<ProductDecision> = {}): ProductDecision {
  const state = DEFAULT_STARTING_CONDITIONS.products[id];
  return {
    productId: id,
    price: state.startingPrice,
    productionVolume: state.startingCapacity,
    capacityInvestment: 0,
    qualityInvestment: 0,
    trainingSpend: 0,
    hires: 0,
    fires: 0,
    wageAdjustmentPct: 0,
    ...overrides,
  };
}

function noOpCompanyDecision(overrides: Partial<CompanyDecision> = {}): CompanyDecision {
  return { marketingSpend: 0, rndSpend: 0, loanAmountRequested: 0, loanRepayment: 0, capexSpend: 0, ...overrides };
}

function baseDecision(
  playerId: string,
  overrides: { company?: Partial<CompanyDecision>; products?: Partial<Record<ProductId, Partial<ProductDecision>>> } = {},
): YearDecision {
  const products = {} as Record<ProductId, ProductDecision>;
  for (const id of PRODUCT_IDS) {
    products[id] = noOpProductDecision(id, overrides.products?.[id]);
  }
  return {
    playerId,
    year: 1,
    company: noOpCompanyDecision(overrides.company),
    products,
    submittedAt: new Date(0).toISOString(),
  };
}

describe("simulateYear", () => {
  it("produces a self-consistent result across all three products", () => {
    const state = baseState();
    const result = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });

    expect(result.incomeStatement.byProduct).toHaveLength(3);
    for (const p of result.incomeStatement.byProduct) {
      expect(p.unitsSold).toBeGreaterThan(0);
      expect(p.unitsSold).toBeLessThanOrEqual(p.unitsProduced);
    }
    expect(result.incomeStatement.revenue).toBeCloseTo(
      result.incomeStatement.byProduct.reduce((s, p) => s + p.revenue, 0),
      6,
    );
    // Balance sheet must balance by construction.
    expect(result.balanceSheet.totalAssets - result.balanceSheet.totalLiabilities).toBeCloseTo(
      result.balanceSheet.equity,
      6,
    );
    expect(result.closingState.year).toBe(state.year + 1);
  });

  it("sells fewer units of a product priced above its reference price than at it", () => {
    const state = baseState();
    const cheap = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    const expensive = simulateYear({
      decision: baseDecision("p1", { products: { shortboard: { price: PRODUCT_DEFINITIONS.shortboard.referencePrice * 2 } } }),
      openingState: state,
      events: [],
    });

    const share = (r: typeof cheap) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    expect(share(expensive).demandIndex).toBeLessThan(share(cheap).demandIndex);
  });

  it("caps a product's production at whichever is lower: capacity or staffed labor", () => {
    const state = baseState();
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 100 };
    const result = simulateYear({
      decision: baseDecision("p1", { products: { shortboard: { productionVolume: 999999 } } }),
      openingState: state,
      events: [],
    });
    const shortboard = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    expect(shortboard.unitsProduced).toBe(100);
  });

  it("firing an entire product line's staff means it produces and sells nothing next year", () => {
    const state = baseState();
    state.products.fishboard = { ...state.products.fishboard, employees: 0 };
    const result = simulateYear({
      decision: baseDecision("p1", { products: { fishboard: { productionVolume: 999999 } } }),
      openingState: state,
      events: [],
    });
    const fishboard = result.incomeStatement.byProduct.find((p) => p.productId === "fishboard")!;
    expect(fishboard.unitsProduced).toBe(0);
    expect(fishboard.unitsSold).toBe(0);
    expect(fishboard.revenue).toBe(0);
  });

  it("higher wages raise labor capacity (productivity), all else equal", () => {
    const state = baseState();
    const lowState = { ...state.products.shortboard, wageLevel: 500 };
    const highState = { ...state.products.shortboard, wageLevel: 5000 };
    expect(computeLaborCapacity(highState)).toBeGreaterThan(computeLaborCapacity(lowState));
  });

  it("training raises productivity next year, which raises labor capacity the year after", () => {
    const state = baseState();
    const result = simulateYear({
      decision: baseDecision("p1", { products: { shortboard: { trainingSpend: 5000 } } }),
      openingState: state,
      events: [],
    });
    expect(result.closingState.products.shortboard.productivity).toBeGreaterThan(state.products.shortboard.productivity);
    expect(computeLaborCapacity(result.closingState.products.shortboard)).toBeGreaterThan(
      computeLaborCapacity(state.products.shortboard),
    );
  });

  it("R&D (innovation) raises the effective quality/attractiveness used for demand", () => {
    const state = baseState({ innovation: 0 });
    const price = PRODUCT_DEFINITIONS.shortboard.referencePrice;
    const low = computeAttractiveness(state.products.shortboard, state.brandAwareness, 0, price, price);
    const high = computeAttractiveness(state.products.shortboard, state.brandAwareness, 100, price, price);
    expect(high).toBeGreaterThan(low);
  });

  it("R&D (innovation) reduces the effective cost of capacity investment", () => {
    expect(computeCapacityCostPerUnit(100)).toBeLessThan(computeCapacityCostPerUnit(0));
    expect(computeCapacityCostPerUnit(0)).toBe(CAPACITY_COST_PER_UNIT);
  });

  it("a positive global demand-shock event increases units sold for every product (labor/capacity unconstrained)", () => {
    const state = baseState();
    for (const id of PRODUCT_IDS) {
      state.products[id] = { ...state.products[id], productionCapacity: 100000, employees: 1000 };
    }
    const decision = baseDecision("p1", {
      products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolume: 100000 }])) as never,
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

    for (const id of PRODUCT_IDS) {
      const before = noEvent.incomeStatement.byProduct.find((p) => p.productId === id)!;
      const after = withEvent.incomeStatement.byProduct.find((p) => p.productId === id)!;
      expect(after.unitsSold).toBeGreaterThan(before.unitsSold);
    }
  });

  it("a player-scoped event only affects the product it targets", () => {
    const state = baseState();
    for (const id of PRODUCT_IDS) {
      state.products[id] = { ...state.products[id], productionCapacity: 100000, employees: 1000 };
    }
    const decision = baseDecision("p1", {
      products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolume: 100000 }])) as never,
    });
    const noEvent = simulateYear({ decision, openingState: state, events: [] });
    const targetedEvent: RandomEvent = {
      id: "evt_test",
      year: 1,
      type: "demand_shock_positive",
      scope: "player",
      affectedPlayerId: "p1",
      description: "test",
      effects: { demandMultiplier: 1.5, productId: "longboard" },
    };
    const withEvent = simulateYear({ decision, openingState: state, events: [targetedEvent] });

    const longboardBefore = noEvent.incomeStatement.byProduct.find((p) => p.productId === "longboard")!;
    const longboardAfter = withEvent.incomeStatement.byProduct.find((p) => p.productId === "longboard")!;
    expect(longboardAfter.unitsSold).toBeGreaterThan(longboardBefore.unitsSold);

    const shortboardBefore = noEvent.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    const shortboardAfter = withEvent.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    expect(shortboardAfter.unitsSold).toBeCloseTo(shortboardBefore.unitsSold, 6);
  });

  it("a loan increases both cash and debt by the same amount, all else equal", () => {
    const state = baseState();
    const withoutLoan = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    const withLoan = simulateYear({
      decision: baseDecision("p1", { company: { loanAmountRequested: 10000 } }),
      openingState: state,
      events: [],
    });

    expect(withLoan.closingState.debt - withoutLoan.closingState.debt).toBeCloseTo(10000, 6);
    expect(withLoan.closingState.cash - withoutLoan.closingState.cash).toBeCloseTo(10000, 6);
  });

  it("firing employees on one product line reduces company-wide morale and that line's headcount", () => {
    const state = baseState();
    const result = simulateYear({
      decision: baseDecision("p1", { products: { shortboard: { fires: 3 } } }),
      openingState: state,
      events: [],
    });
    expect(result.closingState.products.shortboard.employees).toBe(state.products.shortboard.employees - 3);
    expect(result.closingState.morale).toBeLessThan(state.morale);
  });
});

describe("computeAttractiveness", () => {
  it("increases with quality, productivity, brand and innovation; decreases with price", () => {
    const state = baseState();
    const price = PRODUCT_DEFINITIONS.shortboard.referencePrice;

    const low = computeAttractiveness(
      { ...state.products.shortboard, quality: 10, productivity: 10 },
      10,
      0,
      price,
      price,
    );
    const high = computeAttractiveness(
      { ...state.products.shortboard, quality: 90, productivity: 90 },
      90,
      90,
      price,
      price,
    );
    expect(high).toBeGreaterThan(low);

    const cheap = computeAttractiveness(state.products.shortboard, state.brandAwareness, 0, price / 2, price);
    const expensive = computeAttractiveness(state.products.shortboard, state.brandAwareness, 0, price * 2, price);
    expect(cheap).toBeGreaterThan(expensive);
  });
});

describe("simulateMultiplayerYear", () => {
  it("splits each product's shares to ~100 and gives identical players equal shares", () => {
    const state = baseState();
    for (const id of PRODUCT_IDS) {
      state.products[id] = { ...state.products[id], productionCapacity: 100000, employees: 1000 };
    }
    const decision = (playerId: string) =>
      baseDecision(playerId, {
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolume: 100000 }])) as never,
      });

    const { market, results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision("p1"), openingState: state, playerEvents: [] },
        { decision: decision("p2"), openingState: state, playerEvents: [] },
      ],
      globalEvents: [],
    });

    const totalShare = Object.values(market.playerShares).reduce((a, b) => a + b, 0);
    expect(totalShare).toBeCloseTo(100, 6);
    expect(market.playerShares["p1"]).toBeCloseTo(50, 6);
    expect(market.playerShares["p2"]).toBeCloseTo(50, 6);

    for (const id of PRODUCT_IDS) {
      const s1 = results[0].incomeStatement.byProduct.find((p) => p.productId === id)!;
      const s2 = results[1].incomeStatement.byProduct.find((p) => p.productId === id)!;
      expect(s1.unitsSold).toBeCloseTo(s2.unitsSold, 6);
      expect(s1.marketSharePct).toBeCloseTo(50, 6);
    }
  });

  it("gives a cheaper/higher-quality player a larger share than a rival", () => {
    const weakState = baseState();
    const strongState = baseState();
    for (const id of PRODUCT_IDS) {
      weakState.products[id] = { ...weakState.products[id], quality: 30, productionCapacity: 100000, employees: 1000 };
      strongState.products[id] = { ...strongState.products[id], quality: 90, productionCapacity: 100000, employees: 1000 };
    }
    weakState.brandAwareness = 20;
    strongState.brandAwareness = 90;

    const decision = (playerId: string) =>
      baseDecision(playerId, {
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolume: 100000 }])) as never,
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
