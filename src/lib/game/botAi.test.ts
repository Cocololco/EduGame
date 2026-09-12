import { describe, expect, it } from "vitest";
import { PRODUCT_IDS } from "@/types/game";
import { DEFAULT_STARTING_CONDITIONS, createInitialCompanyState } from "../simulation/initialState";
import { decideBotYear, personalityForBotIndex } from "./botAi";

describe("decideBotYear", () => {
  const state = createInitialCompanyState(DEFAULT_STARTING_CONDITIONS);

  it.each(["aggressive", "premium", "balanced"] as const)("produces a valid, non-negative decision for %s", (personality) => {
    const decision = decideBotYear(personality, state);

    expect(decision.company.marketingSpend).toBeGreaterThanOrEqual(0);
    expect(decision.company.rndSpend).toBeGreaterThanOrEqual(0);
    for (const id of PRODUCT_IDS) {
      const p = decision.products[id];
      expect(p.price).toBeGreaterThan(0);
      expect(p.productionVolume).toBeGreaterThanOrEqual(0);
      expect(p.capacityInvestment).toBeGreaterThanOrEqual(0);
      expect(p.qualityInvestment).toBeGreaterThanOrEqual(0);
      expect(p.trainingSpend).toBeGreaterThanOrEqual(0);
      expect(p.hires).toBe(0);
      expect(p.fires).toBe(0);
    }
  });

  it("premium bots price higher and produce less than aggressive bots", () => {
    const premium = decideBotYear("premium", state);
    const aggressive = decideBotYear("aggressive", state);
    expect(premium.products.shortboard.price).toBeGreaterThan(aggressive.products.shortboard.price);
    expect(premium.products.shortboard.productionVolume).toBeLessThan(aggressive.products.shortboard.productionVolume);
  });
});

describe("personalityForBotIndex", () => {
  it("cycles through the three personalities", () => {
    expect(personalityForBotIndex(0)).toBe("aggressive");
    expect(personalityForBotIndex(1)).toBe("premium");
    expect(personalityForBotIndex(2)).toBe("balanced");
    expect(personalityForBotIndex(3)).toBe("aggressive");
  });
});
