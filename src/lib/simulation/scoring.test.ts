import { describe, expect, it } from "vitest";
import type { Player, YearResult } from "@/types/game";
import { createInitialCompanyState, DEFAULT_STARTING_CONDITIONS } from "./initialState";
import { computeScore, rankScores } from "./scoring";

function fakeResult(playerId: string, year: number, netProfit: number, equity: number): YearResult {
  const state = createInitialCompanyState(DEFAULT_STARTING_CONDITIONS);
  return {
    playerId,
    year,
    openingState: { ...state, year: year - 1 },
    closingState: { ...state, year, equity },
    incomeStatement: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      marketingExpense: 0,
      wagesExpense: 0,
      trainingExpense: 0,
      rndExpense: 0,
      otherOperatingExpense: 0,
      operatingProfit: netProfit,
      interestExpense: 0,
      netProfit,
    },
    balanceSheet: {
      cash: 0,
      inventory: 0,
      fixedAssets: 0,
      totalAssets: equity,
      debt: 0,
      totalLiabilities: 0,
      equity,
    },
    ratios: { grossMarginPct: 0, netMarginPct: 0, roiPct: 0, debtToEquity: 0 },
    marketMetrics: { unitsSold: 0, unitsProduced: 0, unsoldInventory: 0, demandIndex: 100 },
    eventsApplied: [],
  };
}

function fakePlayer(id: string, results: YearResult[]): Player {
  return {
    id,
    userId: `user-${id}`,
    displayName: id,
    joinOrder: 0,
    startingConditions: DEFAULT_STARTING_CONDITIONS,
    companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
    decisions: [],
    results,
  };
}

describe("computeScore", () => {
  it("sums net profit across years and uses the final year's equity as valuation", () => {
    const player = fakePlayer("p1", [fakeResult("p1", 1, 1000, 51000), fakeResult("p1", 2, 2000, 53000)]);
    const score = computeScore(player);

    expect(score.cumulativeNetProfit).toBe(3000);
    expect(score.finalValuation).toBe(53000);
    expect(score.marketShareGrowthPct).toBeUndefined();
  });

  it("falls back to the starting equity when no results exist yet", () => {
    const player = fakePlayer("p1", []);
    const score = computeScore(player);
    expect(score.finalValuation).toBe(player.companyStates[0].equity);
    expect(score.cumulativeNetProfit).toBe(0);
  });
});

describe("rankScores", () => {
  it("ranks highest composite score first", () => {
    const player1 = fakePlayer("p1", [fakeResult("p1", 1, 1000, 51000)]);
    const player2 = fakePlayer("p2", [fakeResult("p2", 1, 5000, 55000)]);
    const ranked = rankScores([computeScore(player1), computeScore(player2)]);

    expect(ranked[0].playerId).toBe("p2");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].playerId).toBe("p1");
    expect(ranked[1].rank).toBe(2);
  });
});
