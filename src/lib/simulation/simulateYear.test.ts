import { describe, expect, it } from "vitest";
import type { CompanyDecision, CompanyYearState, ProductDecision, ProductId, RandomEvent, YearDecision } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { CAPACITY_COST_PER_UNIT, TRANSPORT_COST_PER_UNIT } from "./constants";
import { getCountryDefinition } from "./countries";
import { DEFAULT_STARTING_CONDITIONS, createInitialCompanyState } from "./initialState";
import { PRODUCT_DEFINITIONS } from "./products";
import {
  blendDemandWeights,
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
    productionVolumeByFactory: { france: state.startingCapacity },
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
      decision: baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 999999 } } } }),
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
      decision: baseDecision("p1", { products: { fishboard: { productionVolumeByFactory: { france: 999999 } } } }),
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
      products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
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
      products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
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
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
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
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
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

  it("hands a whole category's demand share to its outright winner (winner-take-category, not proportional)", () => {
    // p1 undercuts price but has middling quality/brand/innovation; p2 has
    // the highest price but wins every other category outright.
    const state = baseState();
    for (const id of PRODUCT_IDS) {
      state.products[id] = { ...state.products[id], productionCapacity: 100000, employees: 1000 };
    }
    const cheapLowQuality = baseDecision("p1", {
      products: Object.fromEntries(
        PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 }, price: PRODUCT_DEFINITIONS[id].referencePrice * 0.5 }]),
      ) as never,
    });
    const pricierHighQuality = baseDecision("p2", {
      products: Object.fromEntries(
        PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 }, price: PRODUCT_DEFINITIONS[id].referencePrice * 1.5 }]),
      ) as never,
    });
    // NOTE: build p2's products as a fresh object — `{...state, products:
    // state.products}` would alias the same nested products record, so
    // mutating one player's product state would silently mutate the
    // other's too.
    const p2Products = Object.fromEntries(
      PRODUCT_IDS.map((id) => [id, { ...state.products[id], quality: 90 }]),
    ) as CompanyYearState["products"];
    const p2State: CompanyYearState = { ...state, brandAwareness: 90, innovation: 90, products: p2Products };

    const { results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: cheapLowQuality, openingState: state, playerEvents: [] },
        { decision: pricierHighQuality, openingState: p2State, playerEvents: [] },
      ],
      globalEvents: [],
    });

    // Both players are only licensed in France by default, so the weights
    // in play are shortboard's own profile blended with France's
    // (blendDemandWeights averages them): price (60+35)/2=47.5,
    // quality (15+30)/2=22.5, brand (15+25)/2=20, innovation (10+10)/2=10.
    // p1 wins ONLY price -> should get exactly that blended price share
    // (note: France's own preferences pull enough weight toward
    // quality/brand/innovation that p2 actually edges p1 out overall here,
    // 52.5 vs 47.5 — winning price alone isn't a majority once blended).
    const shortboardShare = (playerIdx: number) =>
      results[playerIdx].incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.marketSharePct!;
    expect(shortboardShare(0)).toBeCloseTo(47.5, 6);
    expect(shortboardShare(1)).toBeCloseTo(52.5, 6);

    // Fishboard blended with France: price (10+35)/2=22.5, quality
    // (50+30)/2=40, brand (30+25)/2=27.5, innovation (10+10)/2=10. p2 wins
    // quality+brand+innovation = 77.5.
    const fishboardShare = (playerIdx: number) =>
      results[playerIdx].incomeStatement.byProduct.find((p) => p.productId === "fishboard")!.marketSharePct!;
    expect(fishboardShare(1)).toBeGreaterThan(fishboardShare(0));
    expect(fishboardShare(1)).toBeCloseTo(77.5, 6);
  });

  it("splits a category's share evenly among tied winners", () => {
    const state = baseState();
    for (const id of PRODUCT_IDS) {
      state.products[id] = { ...state.products[id], productionCapacity: 100000, employees: 1000 };
    }
    // Three identical players, all tied on every category.
    const decision = (playerId: string) =>
      baseDecision(playerId, {
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
      });

    const { results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision("p1"), openingState: state, playerEvents: [] },
        { decision: decision("p2"), openingState: state, playerEvents: [] },
        { decision: decision("p3"), openingState: state, playerEvents: [] },
      ],
      globalEvents: [],
    });

    for (const result of results) {
      const shortboard = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
      expect(shortboard.marketSharePct).toBeCloseTo(100 / 3, 6);
    }
  });
});

describe("blendDemandWeights", () => {
  it("averages two profiles that already sum to 100 into one that still sums to 100", () => {
    const blended = blendDemandWeights(PRODUCT_DEFINITIONS.fishboard.demandWeights, getCountryDefinition("morocco").demandWeights);
    const total = blended.priceWeight + blended.qualityWeight + blended.brandWeight + blended.innovationWeight;
    expect(total).toBeCloseTo(100, 6);
    // fishboard price 10, morocco price 55 -> average 32.5
    expect(blended.priceWeight).toBeCloseTo(32.5, 6);
  });
});

describe("countries: per-product demand size", () => {
  it("scales demand differently per product per country, not by one flat country-wide number", () => {
    // Australia's real surf culture supports the niche fishboard line
    // relatively BETTER than China's nascent one does, even though both
    // countries' shortboard multipliers are much closer together — a
    // company selling only into Australia should see a much bigger
    // fishboard-to-shortboard demand ratio than one selling only into China.
    const inAustralia = baseState({ licensedCountries: ["australia"] });
    const inChina = baseState({ licensedCountries: ["china"] });
    for (const s of [inAustralia, inChina]) {
      for (const id of PRODUCT_IDS) {
        s.products[id] = { ...s.products[id], productionCapacity: 100000, employees: 1000 };
      }
    }
    const decision = baseDecision(
      "p1",
      { products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never },
    );

    const australiaResult = simulateYear({ decision, openingState: inAustralia, events: [] });
    const chinaResult = simulateYear({ decision, openingState: inChina, events: [] });

    const ratio = (r: typeof australiaResult) => {
      const fishboard = r.incomeStatement.byProduct.find((p) => p.productId === "fishboard")!.unitsSold;
      const shortboard = r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.unitsSold;
      return fishboard / shortboard;
    };

    expect(ratio(australiaResult)).toBeGreaterThan(ratio(chinaResult));
    // Sanity-check against the catalog directly too.
    const australia = getCountryDefinition("australia");
    const china = getCountryDefinition("china");
    expect(australia.demandMultiplierByProduct.fishboard).toBeGreaterThan(australia.demandMultiplierByProduct.shortboard);
    expect(china.demandMultiplierByProduct.fishboard).toBeLessThan(china.demandMultiplierByProduct.shortboard);
  });
});

describe("countries: year-over-year demand growth", () => {
  it("compounds an emerging market's demand multiplier by its growth rate each year, leaving a flat (0%-growth) market unchanged", () => {
    const state = baseState({ licensedCountries: ["morocco"] });
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 100000, employees: 1000 };

    const decisionYear1 = baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 100000 } } } });
    const decisionYear11 = { ...decisionYear1, year: 11 }; // 10 years of compounding elapsed

    const year1 = simulateYear({ decision: decisionYear1, openingState: state, events: [] });
    const year11 = simulateYear({ decision: decisionYear11, openingState: state, events: [] });

    const sold = (r: typeof year1) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.unitsSold;
    const morocco = getCountryDefinition("morocco");
    const expectedRatio = Math.pow(1 + morocco.demandGrowthRatePerYear, 10);
    expect(sold(year11) / sold(year1)).toBeCloseTo(expectedRatio, 4);
    expect(morocco.demandGrowthRatePerYear).toBeGreaterThan(0);

    // France has 0 growth — a decade later, demand from it is unchanged.
    const franceState = baseState({ licensedCountries: ["france"] });
    franceState.products.shortboard = { ...franceState.products.shortboard, productionCapacity: 100000, employees: 1000 };
    const franceYear1 = simulateYear({ decision: decisionYear1, openingState: franceState, events: [] });
    const franceYear11 = simulateYear({ decision: decisionYear11, openingState: franceState, events: [] });
    expect(sold(franceYear11)).toBeCloseTo(sold(franceYear1), 6);
    expect(getCountryDefinition("france").demandGrowthRatePerYear).toBe(0);
  });
});

describe("countries: licenses", () => {
  it("a company only licensed in France gets no demand from a country it hasn't licensed", () => {
    const licensedOnlyFrance = baseState();
    const licensedBoth = baseState({ licensedCountries: ["france", "australia"] });

    const decision = baseDecision("p1", {
      products: { shortboard: { productionVolumeByFactory: { france: 100000 } } },
    });
    const stateWithBigCapacity = { ...licensedOnlyFrance, products: { ...licensedOnlyFrance.products, shortboard: { ...licensedOnlyFrance.products.shortboard, productionCapacity: 100000, employees: 1000 } } };
    const stateWithBigCapacityAndAustralia = { ...licensedBoth, products: { ...licensedBoth.products, shortboard: { ...licensedBoth.products.shortboard, productionCapacity: 100000, employees: 1000 } } };

    const franceOnly = simulateYear({ decision, openingState: stateWithBigCapacity, events: [] });
    const franceAndAustralia = simulateYear({ decision, openingState: stateWithBigCapacityAndAustralia, events: [] });

    const shortboardSold = (r: typeof franceOnly) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.unitsSold;
    // Licensing a second (bigger-demand) country should only ever add demand, never remove it.
    expect(shortboardSold(franceAndAustralia)).toBeGreaterThan(shortboardSold(franceOnly));
  });

  it("buying a license costs money now but only takes effect next year", () => {
    const state = baseState();
    const cost = getCountryDefinition("australia").licenseCost;
    const decision = baseDecision("p1", { company: { licenseCountry: "australia" } });
    const withoutLicense = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    const withLicense = simulateYear({ decision, openingState: state, events: [] });

    // Cash is down by the license cost this year...
    expect(withoutLicense.closingState.cash - withLicense.closingState.cash).toBeCloseTo(cost, 6);
    // ...and the closing state (next year's opening state) now includes it, but THIS year's demand was unaffected (same state used as input for both).
    expect(withLicense.closingState.licensedCountries).toContain("australia");
    expect(state.licensedCountries).not.toContain("australia");
  });

  it("buying a license you already have costs nothing (idempotent)", () => {
    const state = baseState({ licensedCountries: ["france", "morocco"] });
    const decision = baseDecision("p1", { company: { licenseCountry: "morocco" } });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const withoutRebuy = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });
    expect(result.closingState.cash).toBeCloseTo(withoutRebuy.closingState.cash, 6);
  });
});

describe("countries: factories, labor cost, transport", () => {
  it("opening a new factory changes wages next year, not this year, and ADDS to the existing factory rather than replacing it", () => {
    const state = baseState({ openedFactoryCountries: ["france", "morocco"] });
    state.products.shortboard = { ...state.products.shortboard, factoryCountries: ["france"] };

    const decision = baseDecision("p1", { products: { shortboard: { openFactoryIn: "morocco" } } });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const noNewFactory = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });

    // This year's wages are identical (still 100% France's labor cost) regardless of the decision...
    const wages = (r: typeof result) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.wagesExpense;
    expect(wages(result)).toBeCloseTo(wages(noNewFactory), 6);
    // ...but the closing state now runs BOTH factories, ready for next year's production split.
    expect(result.closingState.products.shortboard.factoryCountries).toEqual(["france", "morocco"]);
  });

  it("a lower labor-cost factory country reduces wages, weighted by that factory's share of production", () => {
    const cheapState = baseState();
    cheapState.products.shortboard = { ...cheapState.products.shortboard, factoryCountries: ["china"] };
    const expensiveState = baseState();
    expensiveState.products.shortboard = { ...expensiveState.products.shortboard, factoryCountries: ["france"] };

    const decision = baseDecision("p1");
    const cheap = simulateYear({ decision, openingState: cheapState, events: [] });
    const expensive = simulateYear({ decision, openingState: expensiveState, events: [] });

    const wages = (r: typeof cheap) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.wagesExpense;
    expect(wages(cheap)).toBeLessThan(wages(expensive));
    expect(getCountryDefinition("china").laborCostMultiplier).toBeLessThan(getCountryDefinition("france").laborCostMultiplier);
  });

  it("opening a new factory costs money once and adds to fixed assets; reusing an already-open one is free", () => {
    const state = baseState({ openedFactoryCountries: ["france"] });
    const cost = getCountryDefinition("morocco").factoryCost;

    const openNew = baseDecision("p1", { products: { shortboard: { openFactoryIn: "morocco" } } });
    const stayPut = baseDecision("p1");
    const opened = simulateYear({ decision: openNew, openingState: state, events: [] });
    const stayed = simulateYear({ decision: stayPut, openingState: state, events: [] });

    expect(opened.closingState.fixedAssets - stayed.closingState.fixedAssets).toBeCloseTo(cost, 6);
    expect(opened.closingState.openedFactoryCountries).toContain("morocco");
    expect(opened.closingState.products.shortboard.factoryCountries).toEqual(["france", "morocco"]);

    // Second product opening a factory in the SAME newly-opened country this year shouldn't be charged again.
    const openTwoProducts = baseDecision("p1", {
      products: { shortboard: { openFactoryIn: "morocco" }, longboard: { openFactoryIn: "morocco" } },
    });
    const both = simulateYear({ decision: openTwoProducts, openingState: state, events: [] });
    expect(both.closingState.fixedAssets - stayed.closingState.fixedAssets).toBeCloseTo(cost, 6); // still just ONE factoryCost
  });

  it("selling into a country other than the factory country costs a transport surcharge on those units", () => {
    const domesticOnly = baseState({ licensedCountries: ["france"] });
    const withExport = baseState({ licensedCountries: ["france", "australia"] });
    for (const s of [domesticOnly, withExport]) {
      s.products.shortboard = { ...s.products.shortboard, productionCapacity: 100000, employees: 1000, factoryCountries: ["france"] };
    }

    const decision = baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 100000 } } } });
    const domesticResult = simulateYear({ decision, openingState: domesticOnly, events: [] });
    const exportResult = simulateYear({ decision, openingState: withExport, events: [] });

    const shortboard = (r: typeof domesticResult) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    const domesticCostPerUnit = shortboard(domesticResult).cogs / shortboard(domesticResult).unitsSold;
    const exportCostPerUnit = shortboard(exportResult).cogs / shortboard(exportResult).unitsSold;

    // Some of the export scenario's demand comes from Australia (not the
    // factory country), so its blended per-unit cost should sit strictly
    // between "no transport cost" and "full TRANSPORT_COST_PER_UNIT surcharge".
    expect(exportCostPerUnit).toBeGreaterThan(domesticCostPerUnit);
    expect(exportCostPerUnit).toBeLessThan(domesticCostPerUnit + TRANSPORT_COST_PER_UNIT);
  });
});

describe("countries: multiplayer license gating", () => {
  it("a player not licensed in a country neither competes for nor receives its demand", () => {
    const franceOnly = baseState({ licensedCountries: ["france"] });
    const bothCountries = baseState({ licensedCountries: ["france", "australia"] });
    for (const s of [franceOnly, bothCountries]) {
      for (const id of PRODUCT_IDS) {
        s.products[id] = { ...s.products[id], productionCapacity: 100000, employees: 1000 };
      }
    }

    const decision = (playerId: string) =>
      baseDecision(playerId, {
        products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, { productionVolumeByFactory: { france: 100000 } }])) as never,
      });

    const { results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision("franceOnly"), openingState: franceOnly, playerEvents: [] },
        { decision: decision("both"), openingState: bothCountries, playerEvents: [] },
      ],
      globalEvents: [],
    });

    // The France-only player should get roughly HALF of France's shortboard
    // demand (split with the other player there) and nothing from
    // Australia; the other player gets France's other half PLUS all of Australia.
    const shortboardSold = (i: number) => results[i].incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.unitsSold;
    expect(shortboardSold(1)).toBeGreaterThan(shortboardSold(0));
  });
});

describe("countries: multi-country research", () => {
  it("buys research for multiple countries in the same year, summing their costs", () => {
    const state = baseState();
    const decision = baseDecision("p1", { company: { researchCountries: ["morocco", "portugal"] } });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const withoutResearch = simulateYear({ decision: baseDecision("p1"), openingState: state, events: [] });

    const expectedCost = getCountryDefinition("morocco").researchCost + getCountryDefinition("portugal").researchCost;
    expect(withoutResearch.closingState.cash - result.closingState.cash).toBeCloseTo(expectedCost, 6);
    expect(result.closingState.researchedCountries).toContain("morocco");
    expect(result.closingState.researchedCountries).toContain("portugal");
  });

  it("doesn't charge again for a country already researched, even if listed again", () => {
    const state = baseState({ researchedCountries: ["france", "morocco"] });
    const decision = baseDecision("p1", { company: { researchCountries: ["morocco", "portugal"] } });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const onlyPortugal = simulateYear({
      decision: baseDecision("p1", { company: { researchCountries: ["portugal"] } }),
      openingState: state,
      events: [],
    });
    // Re-listing an already-researched country costs nothing extra.
    expect(result.closingState.cash).toBeCloseTo(onlyPortugal.closingState.cash, 6);
  });
});

describe("countries: price per country", () => {
  it("a lower price override for one licensed country increases only that country's demand, pulling revenue-per-unit below the flat default", () => {
    const state = baseState({ licensedCountries: ["france", "morocco"] });
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 100000, employees: 1000 };

    const flatPrice = baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 100000 } } } });
    const cheaperInMorocco = baseDecision("p1", {
      products: {
        shortboard: {
          productionVolumeByFactory: { france: 100000 },
          priceByCountry: { morocco: PRODUCT_DEFINITIONS.shortboard.referencePrice * 0.5 },
        },
      },
    });

    const flat = simulateYear({ decision: flatPrice, openingState: state, events: [] });
    const discounted = simulateYear({ decision: cheaperInMorocco, openingState: state, events: [] });

    const shortboard = (r: typeof flat) => r.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;
    expect(shortboard(discounted).unitsSold).toBeGreaterThan(shortboard(flat).unitsSold);

    const revenuePerUnit = (r: typeof flat) => shortboard(r).revenue / shortboard(r).unitsSold;
    expect(revenuePerUnit(discounted)).toBeLessThan(revenuePerUnit(flat));
  });

  it("multiplayer: an undercut via priceByCountry (not the flat default price) decides who wins that country's price category", () => {
    const state = baseState({ licensedCountries: ["france"] });
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 100000, employees: 1000 };

    // p1's flat default price is HIGHER than p2's, but p1 undercuts
    // specifically in France via priceByCountry — the country-specific
    // price should be what the category ranking actually uses.
    const p1Decision = baseDecision("p1", {
      products: {
        shortboard: {
          price: PRODUCT_DEFINITIONS.shortboard.referencePrice * 2,
          priceByCountry: { france: PRODUCT_DEFINITIONS.shortboard.referencePrice * 0.5 },
          productionVolumeByFactory: { france: 100000 },
        },
      },
    });
    const p2Decision = baseDecision("p2", {
      products: {
        shortboard: { price: PRODUCT_DEFINITIONS.shortboard.referencePrice, productionVolumeByFactory: { france: 100000 } },
      },
    });

    const { results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: p1Decision, openingState: state, playerEvents: [] },
        { decision: p2Decision, openingState: state, playerEvents: [] },
      ],
      globalEvents: [],
    });

    const shortboardShare = (i: number) => results[i].incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.marketSharePct!;
    expect(shortboardShare(0)).toBeGreaterThan(shortboardShare(1));
  });
});

describe("multi-factory production", () => {
  it("weights the wage bill's labor-cost multiplier by each open factory's share of requested production", () => {
    const state = baseState();
    state.products.shortboard = {
      ...state.products.shortboard,
      factoryCountries: ["france", "morocco"],
      productionCapacity: 100000,
      employees: 1000,
    };
    const decision = baseDecision("p1", {
      products: { shortboard: { productionVolumeByFactory: { france: 500, morocco: 500 } } },
    });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const wages = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.wagesExpense;

    const expectedMultiplier = (getCountryDefinition("france").laborCostMultiplier + getCountryDefinition("morocco").laborCostMultiplier) / 2;
    const expectedWages = state.products.shortboard.employees * state.products.shortboard.wageLevel * expectedMultiplier;
    expect(wages).toBeCloseTo(expectedWages, 4);
  });

  it("caps the COMBINED total across factories at shared capacity/labor, same as a single factory would be", () => {
    const state = baseState();
    state.products.shortboard = {
      ...state.products.shortboard,
      factoryCountries: ["france", "morocco"],
      productionCapacity: 100,
      employees: 1000, // labor capacity is far above 100, so physical capacity (100) is the binding cap
    };
    const decision = baseDecision("p1", {
      products: { shortboard: { productionVolumeByFactory: { france: 90, morocco: 90 } } }, // 180 requested, only 100 possible
    });
    const result = simulateYear({ decision, openingState: state, events: [] });
    const unitsProduced = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!.unitsProduced;
    expect(unitsProduced).toBe(100);
  });
});

describe("per-country financials breakdown", () => {
  it("solo: byCountry sums back exactly to the product's own unitsSold/revenue/cogs, one entry per licensed country", () => {
    const state = baseState({ licensedCountries: ["france", "australia"] });
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 100000, employees: 1000 };
    const decision = baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 100000 } } } });

    const result = simulateYear({ decision, openingState: state, events: [] });
    const shortboard = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;

    expect(shortboard.byCountry.map((c) => c.countryId).sort()).toEqual(["australia", "france"]);
    const summedUnits = shortboard.byCountry.reduce((sum, c) => sum + c.unitsSold, 0);
    const summedRevenue = shortboard.byCountry.reduce((sum, c) => sum + c.revenue, 0);
    const summedCogs = shortboard.byCountry.reduce((sum, c) => sum + c.cogs, 0);
    expect(summedUnits).toBeCloseTo(shortboard.unitsSold, 4);
    expect(summedRevenue).toBeCloseTo(shortboard.revenue, 4);
    expect(summedCogs).toBeCloseTo(shortboard.cogs, 4);

    // France has a factory (no transport surcharge); Australia doesn't
    // (see factoryCountries default ["france"]) — Australia's per-unit
    // cost should be the higher one.
    const france = shortboard.byCountry.find((c) => c.countryId === "france")!;
    const australia = shortboard.byCountry.find((c) => c.countryId === "australia")!;
    expect(australia.cogs / australia.unitsSold).toBeGreaterThan(france.cogs / france.unitsSold);
  });

  it("solo: byCountry still sums correctly when capacity can't cover full demand (proportional rationing)", () => {
    const state = baseState({ licensedCountries: ["france", "australia"] });
    state.products.shortboard = { ...state.products.shortboard, productionCapacity: 50, employees: 1000 }; // far below uncapped demand
    const decision = baseDecision("p1", { products: { shortboard: { productionVolumeByFactory: { france: 50 } } } });

    const result = simulateYear({ decision, openingState: state, events: [] });
    const shortboard = result.incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;

    expect(shortboard.unitsProduced).toBe(50);
    const summedUnits = shortboard.byCountry.reduce((sum, c) => sum + c.unitsSold, 0);
    expect(summedUnits).toBeCloseTo(shortboard.unitsSold, 4);
  });

  it("multiplayer: byCountry sums back to the aggregate too, and a country a player isn't licensed in never appears for them", () => {
    const franceOnly = baseState({ licensedCountries: ["france"] });
    const bothCountries = baseState({ licensedCountries: ["france", "australia"] });
    for (const s of [franceOnly, bothCountries]) {
      s.products.shortboard = { ...s.products.shortboard, productionCapacity: 100000, employees: 1000 };
    }
    const decision = (playerId: string) =>
      baseDecision(playerId, { products: { shortboard: { productionVolumeByFactory: { france: 100000 } } } });

    const { results } = simulateMultiplayerYear({
      year: 1,
      players: [
        { decision: decision("franceOnly"), openingState: franceOnly, playerEvents: [] },
        { decision: decision("both"), openingState: bothCountries, playerEvents: [] },
      ],
      globalEvents: [],
    });

    const shortboard = (i: number) => results[i].incomeStatement.byProduct.find((p) => p.productId === "shortboard")!;

    expect(shortboard(0).byCountry.map((c) => c.countryId)).toEqual(["france"]);
    expect(shortboard(1).byCountry.map((c) => c.countryId).sort()).toEqual(["australia", "france"]);

    for (const i of [0, 1]) {
      const summedUnits = shortboard(i).byCountry.reduce((sum, c) => sum + c.unitsSold, 0);
      const summedRevenue = shortboard(i).byCountry.reduce((sum, c) => sum + c.revenue, 0);
      expect(summedUnits).toBeCloseTo(shortboard(i).unitsSold, 4);
      expect(summedRevenue).toBeCloseTo(shortboard(i).revenue, 4);
    }
  });
});
