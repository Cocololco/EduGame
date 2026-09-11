import { describe, expect, it } from "vitest";
import type { Player, YearResult } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { DEFAULT_STARTING_CONDITIONS, createInitialCompanyState } from "../simulation/initialState";
import { buildFinancialsCsv } from "./exportCsv";

function fakeResult(year: number, netProfit: number): YearResult {
  const state = createInitialCompanyState(DEFAULT_STARTING_CONDITIONS);
  return {
    playerId: "p1",
    year,
    openingState: { ...state, year: year - 1 },
    closingState: { ...state, year },
    incomeStatement: {
      revenue: 1000,
      cogs: 400,
      grossProfit: 600,
      marketingExpense: 50,
      wagesExpense: 100,
      trainingExpense: 0,
      rndExpense: 0,
      otherOperatingExpense: 50,
      operatingProfit: netProfit,
      interestExpense: 0,
      netProfit,
      byProduct: PRODUCT_IDS.map((id) => ({
        productId: id,
        unitsProduced: 10,
        unitsSold: 10,
        unsoldInventory: 0,
        revenue: 100,
        cogs: 40,
        grossProfit: 60,
        wagesExpense: 20,
        trainingExpense: 0,
        demandIndex: 100,
      })),
    },
    balanceSheet: {
      cash: 1000,
      inventory: 0,
      fixedAssets: 0,
      totalAssets: 1000,
      debt: 0,
      totalLiabilities: 0,
      equity: 1000,
    },
    ratios: { grossMarginPct: 60, netMarginPct: 10, roiPct: 5, debtToEquity: 0 },
    eventsApplied: [],
  };
}

function fakePlayer(results: YearResult[]): Player {
  return {
    id: "p1",
    userId: "u1",
    displayName: "Coco",
    joinOrder: 0,
    startingConditions: DEFAULT_STARTING_CONDITIONS,
    companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
    decisions: [],
    results,
  };
}

describe("buildFinancialsCsv", () => {
  it("includes a header row and one row per year with the right column count", () => {
    const csv = buildFinancialsCsv(fakePlayer([fakeResult(1, 100), fakeResult(2, 200)]));
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 years

    const headerCols = lines[0].split(",");
    const rowCols = lines[1].split(",");
    expect(rowCols).toHaveLength(headerCols.length);
    expect(headerCols).toContain("netProfit");
    expect(headerCols).toContain("shortboard_revenue");
  });

  it("produces an empty-but-headed CSV for a player with no results yet", () => {
    const csv = buildFinancialsCsv(fakePlayer([]));
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
  });
});
