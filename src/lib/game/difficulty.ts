import type { CompanyDecision, DifficultyLevel } from "@/types/game";
import type { ProductDecisionInput } from "./createGame";

/**
 * Which decision fields a difficulty tier exposes in the UI. Fields not
 * listed stay at their form default (usually 0/no-op) — the underlying
 * decision shape never changes by difficulty (see docs/GAME_DESIGN.md),
 * only what the player is prompted to touch.
 *
 * `productionVolumeByFactory` is in every tier, not just advanced — it's
 * the base production decision (a beginner/standard game only ever has
 * ONE factory open, so the UI renders exactly one row for it, identical to
 * the old flat `productionVolume` field). `priceByCountry`/`openFactoryIn`
 * are advanced-only, since they only do anything once a player has
 * licensed/opened more than the starting France setup.
 */
export const PRODUCT_FIELDS_BY_DIFFICULTY: Record<DifficultyLevel, (keyof ProductDecisionInput)[]> = {
  beginner: ["price", "productionVolumeByFactory"],
  standard: [
    "price",
    "productionVolumeByFactory",
    "capacityInvestment",
    "qualityInvestment",
    "trainingSpend",
    "hires",
    "fires",
    "wageAdjustmentPct",
  ],
  advanced: [
    "price",
    "priceByCountry",
    "productionVolumeByFactory",
    "capacityInvestment",
    "qualityInvestment",
    "trainingSpend",
    "hires",
    "fires",
    "wageAdjustmentPct",
    "openFactoryIn",
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
    "researchCountries",
  ],
};
