import type { CompanyDecision, DifficultyLevel } from "@/types/game";
import type { ProductDecisionInput } from "./createGame";

/**
 * Which decision fields a difficulty tier exposes in the UI. Fields not
 * listed stay at their form default (usually 0/no-op) — the underlying
 * decision shape never changes by difficulty (see docs/GAME_DESIGN.md),
 * only what the player is prompted to touch.
 */
export const PRODUCT_FIELDS_BY_DIFFICULTY: Record<DifficultyLevel, (keyof ProductDecisionInput)[]> = {
  beginner: ["price", "productionVolume"],
  standard: [
    "price",
    "productionVolume",
    "capacityInvestment",
    "qualityInvestment",
    "trainingSpend",
    "hires",
    "fires",
    "wageAdjustmentPct",
  ],
  advanced: [
    "price",
    "productionVolume",
    "capacityInvestment",
    "qualityInvestment",
    "trainingSpend",
    "hires",
    "fires",
    "wageAdjustmentPct",
    "relocateFactoryTo",
  ],
};

export const COMPANY_FIELDS_BY_DIFFICULTY: Record<DifficultyLevel, (keyof CompanyDecision)[]> = {
  beginner: ["marketingSpend"],
  standard: ["marketingSpend", "rndSpend", "loanAmountRequested", "loanRepayment", "capexSpend"],
  advanced: [
    "marketingSpend",
    "rndSpend",
    "loanAmountRequested",
    "loanRepayment",
    "capexSpend",
    "licenseCountry",
    "researchCountry",
  ],
};
