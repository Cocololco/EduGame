import { describe, expect, it } from "vitest";
import type { ProductDecisionInput, YearDecisionInput } from "./createGame";
import { PRODUCT_IDS } from "@/types/game";
import { DEFAULT_STARTING_CONDITIONS } from "../simulation/initialState";
import { advanceSoloYear, createSoloGame } from "./createGame";

function noOpDecisionInput(): YearDecisionInput {
  const products = {} as Record<(typeof PRODUCT_IDS)[number], ProductDecisionInput>;
  for (const id of PRODUCT_IDS) {
    const p = DEFAULT_STARTING_CONDITIONS.products[id];
    products[id] = {
      price: p.startingPrice,
      productionVolumeByFactory: { france: 100 },
      capacityInvestment: 0,
      qualityInvestment: 0,
      trainingSpend: 0,
      hires: 0,
      fires: 0,
      wageAdjustmentPct: 0,
    };
  }
  return {
    company: { marketingSpend: 0, rndSpend: 0, loanAmountRequested: 0, loanRepayment: 0, capexSpend: 0 },
    products,
  };
}

describe("createSoloGame", () => {
  it("starts a solo game at year 0 with one player, all three products, and no results yet", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });

    expect(game.config.mode).toBe("solo");
    expect(game.config.totalYears).toBe(3);
    expect(game.status).toBe("in_progress");
    expect(game.currentYear).toBe(0);
    expect(game.players).toHaveLength(1);
    expect(game.players[0].results).toHaveLength(0);
    expect(game.players[0].companyStates).toHaveLength(1);
    expect(Object.keys(game.players[0].companyStates[0].products)).toHaveLength(3);
  });
});

describe("advanceSoloYear", () => {
  it("appends a decision/result/state and advances currentYear", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });
    const next = advanceSoloYear(game, noOpDecisionInput());

    expect(next.currentYear).toBe(1);
    expect(next.status).toBe("in_progress");
    expect(next.players[0].decisions).toHaveLength(1);
    expect(next.players[0].results).toHaveLength(1);
    expect(next.players[0].companyStates).toHaveLength(2);
    expect(next.players[0].decisions[0].year).toBe(1);
    expect(Object.keys(next.players[0].decisions[0].products)).toHaveLength(3);
  });

  it("marks the game completed and computes a final score after the last configured year", () => {
    let game = createSoloGame({ totalYears: 2, difficulty: "standard", userId: "u1", displayName: "Coco" });
    game = advanceSoloYear(game, noOpDecisionInput());
    expect(game.status).toBe("in_progress");

    game = advanceSoloYear(game, noOpDecisionInput());
    expect(game.status).toBe("completed");
    expect(game.currentYear).toBe(2);
    expect(game.players[0].finalScore).toBeDefined();
    expect(game.players[0].finalScore?.playerId).toBe("p1");
  });

  it("does not mutate the game it was given (pure function)", () => {
    const game = createSoloGame({ totalYears: 3, difficulty: "standard", userId: "u1", displayName: "Coco" });
    const snapshotJson = JSON.stringify(game);

    advanceSoloYear(game, noOpDecisionInput());

    expect(JSON.stringify(game)).toBe(snapshotJson);
  });
});
