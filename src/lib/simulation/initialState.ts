import type { CompanyYearState, StartingConditions } from "@/types/game";
import { DEFAULT_STARTING_MORALE } from "./constants";

/**
 * Turns a player's StartingConditions into their year-0 CompanyYearState
 * (the snapshot shown before any decisions are made).
 */
export function createInitialCompanyState(startingConditions: StartingConditions): CompanyYearState {
  const { startingCash, startingDebt } = startingConditions;
  return {
    year: 0,
    cash: startingCash,
    debt: startingDebt,
    fixedAssets: 0,
    inventory: 0,
    inventoryUnits: 0,
    equity: startingCash - startingDebt,
    employees: startingConditions.startingEmployees,
    wageLevel: startingConditions.startingWageLevel,
    morale: DEFAULT_STARTING_MORALE,
    productionCapacity: startingConditions.startingCapacity,
    quality: startingConditions.startingQuality,
    brandAwareness: startingConditions.startingBrandAwareness,
    currentPrice: startingConditions.startingPrice,
  };
}

/**
 * A reasonable default starting position — symmetric, mid-range values.
 * Used as a baseline for solo games and as one option among asymmetric
 * starts in multiplayer (see docs/GAME_DESIGN.md).
 */
export const DEFAULT_STARTING_CONDITIONS: StartingConditions = {
  startingCash: 50000,
  startingDebt: 0,
  startingCapacity: 1200,
  startingEmployees: 10,
  startingPrice: 50,
  startingWageLevel: 3000,
  startingQuality: 50,
  startingBrandAwareness: 30,
};
