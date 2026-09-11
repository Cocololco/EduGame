import { describe, expect, it } from "vitest";
import { REFERENCE_PRICE } from "../simulation/constants";
import { advanceSoloYear, createSoloGame } from "./createGame";

function decisionInput(overrides: Partial<Parameters<typeof advanceSoloYear>[1]> = {}) {
  return {
    playerId: "p1",
    pricingSales: { price: REFERENCE_PRICE, marketingSpend: 0 },
    productionOperations: { productionVolume: 500, capacityInvestment: 0, qualityInvestment: 0 },
    hrStaffing: { hires: 0, fires: 0, wageAdjustmentPct: 0, trainingSpend: 0 },
    financeInvestment: { loanAmountRequested: 0, loanRepayment: 0, rndSpend: 0, capexSpend: 0 },
    ...overrides,
  };
}

describe("createSoloGame", () => {
  it("starts a solo game at year 0 with one player and no results yet", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });

    expect(game.config.mode).toBe("solo");
    expect(game.config.totalYears).toBe(3);
    expect(game.status).toBe("in_progress");
    expect(game.currentYear).toBe(0);
    expect(game.players).toHaveLength(1);
    expect(game.players[0].results).toHaveLength(0);
    expect(game.players[0].companyStates).toHaveLength(1);
  });
});

describe("advanceSoloYear", () => {
  it("appends a decision/result/state and advances currentYear", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });
    const next = advanceSoloYear(game, decisionInput());

    expect(next.currentYear).toBe(1);
    expect(next.status).toBe("in_progress");
    expect(next.players[0].decisions).toHaveLength(1);
    expect(next.players[0].results).toHaveLength(1);
    expect(next.players[0].companyStates).toHaveLength(2);
    expect(next.players[0].decisions[0].year).toBe(1);
  });

  it("marks the game completed and computes a final score after the last configured year", () => {
    let game = createSoloGame({ totalYears: 2, difficulty: "standard", userId: "u1", displayName: "Coco" });
    game = advanceSoloYear(game, decisionInput());
    expect(game.status).toBe("in_progress");

    game = advanceSoloYear(game, decisionInput());
    expect(game.status).toBe("completed");
    expect(game.currentYear).toBe(2);
    expect(game.players[0].finalScore).toBeDefined();
    expect(game.players[0].finalScore?.playerId).toBe("p1");
  });

  it("does not mutate the game it was given (pure function)", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });
    const snapshotJson = JSON.stringify(game);

    advanceSoloYear(game, decisionInput());

    expect(JSON.stringify(game)).toBe(snapshotJson);
  });
});
