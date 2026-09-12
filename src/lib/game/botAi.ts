import type { BotPersonality, CompanyYearState, ProductId, YearDecisionInput } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { effectiveCapacity } from "./decisionOptions";
import { PRODUCT_DEFINITIONS } from "../simulation/products";

/**
 * Simple heuristic bots — not adaptive to rivals (each decides from its own
 * state only), not minmaxing, just a plausible fixed "personality" so
 * multiplayer games have opponents without needing a real AI. Good enough
 * for filling seats, not a serious opponent.
 */
const PERSONALITY_PROFILES: Record<
  BotPersonality,
  {
    priceMultiplier: number;
    productionFraction: number;
    marketingSpend: number;
    qualityInvestment: number;
    trainingSpend: number;
    capacityInvestment: number;
    rndSpend: number;
  }
> = {
  aggressive: {
    priceMultiplier: 0.8,
    productionFraction: 1.0,
    marketingSpend: 1500,
    qualityInvestment: 200,
    trainingSpend: 200,
    capacityInvestment: 1000,
    rndSpend: 0,
  },
  premium: {
    priceMultiplier: 1.3,
    productionFraction: 0.7,
    marketingSpend: 3000,
    qualityInvestment: 2000,
    trainingSpend: 1000,
    capacityInvestment: 0,
    rndSpend: 2000,
  },
  balanced: {
    priceMultiplier: 1.0,
    productionFraction: 0.85,
    marketingSpend: 1500,
    qualityInvestment: 500,
    trainingSpend: 500,
    capacityInvestment: 500,
    rndSpend: 500,
  },
};

/** Deterministic-ish jitter (±`spread`) so bots of the same personality don't all decide byte-identically every game. */
function jitter(base: number, spread = 0.15): number {
  const factor = 1 + (Math.random() * 2 - 1) * spread;
  return Math.max(0, Math.round(base * factor));
}

/** Produces one bot's decision for the year ahead, from its personality and current company state. */
export function decideBotYear(personality: BotPersonality, state: CompanyYearState): YearDecisionInput {
  const profile = PERSONALITY_PROFILES[personality];

  const products = {} as YearDecisionInput["products"];
  for (const id of PRODUCT_IDS) {
    const def = PRODUCT_DEFINITIONS[id];
    const productState = state.products[id];
    const capacity = effectiveCapacity(productState);

    products[id as ProductId] = {
      price: Math.round(def.referencePrice * profile.priceMultiplier),
      productionVolume: Math.round(capacity * profile.productionFraction),
      capacityInvestment: jitter(profile.capacityInvestment),
      qualityInvestment: jitter(profile.qualityInvestment),
      trainingSpend: jitter(profile.trainingSpend),
      hires: 0,
      fires: 0,
      wageAdjustmentPct: 0,
    };
  }

  return {
    company: {
      marketingSpend: jitter(profile.marketingSpend),
      rndSpend: jitter(profile.rndSpend),
      loanAmountRequested: 0,
      loanRepayment: 0,
      capexSpend: 0,
    },
    products,
  };
}

const PERSONALITIES: BotPersonality[] = ["aggressive", "premium", "balanced"];

/** Assigns a personality to the Nth bot added to a game (cycles through the roster). */
export function personalityForBotIndex(index: number): BotPersonality {
  return PERSONALITIES[index % PERSONALITIES.length];
}
