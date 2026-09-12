import type { CompanyYearState, ProductId, ProductLineState, StartingConditions } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { DEFAULT_STARTING_MORALE } from "./constants";
import { PRODUCT_DEFINITIONS } from "./products";

/**
 * Turns a player's StartingConditions into their year-0 CompanyYearState
 * (the snapshot shown before any decisions are made).
 */
export function createInitialCompanyState(startingConditions: StartingConditions): CompanyYearState {
  const { startingCash, startingDebt } = startingConditions;

  const products = {} as Record<ProductId, ProductLineState>;
  for (const id of PRODUCT_IDS) {
    const p = startingConditions.products[id];
    products[id] = {
      productId: id,
      currentPrice: p.startingPrice,
      productionCapacity: p.startingCapacity,
      employees: p.startingEmployees,
      wageLevel: p.startingWageLevel,
      quality: p.startingQuality,
      productivity: p.startingProductivity,
      inventoryUnits: 0,
      inventoryValue: 0,
      factoryCountry: "france",
    };
  }

  return {
    year: 0,
    cash: startingCash,
    debt: startingDebt,
    fixedAssets: 0,
    equity: startingCash - startingDebt,
    brandAwareness: startingConditions.startingBrandAwareness,
    innovation: startingConditions.startingInnovation,
    morale: startingConditions.startingMorale,
    products,
    // Every company starts able to sell into, and manufacturing in, France
    // only — expanding elsewhere costs a license/factory. France's own
    // info is free from the start ("year 1, country 1" — see REGIONS_DESIGN.md).
    licensedCountries: ["france"],
    openedFactoryCountries: ["france"],
    researchedCountries: ["france"],
  };
}

/**
 * A reasonable default starting position — sized against constants.ts and
 * the product catalog (src/lib/simulation/products.ts) so a
 * reasonably-played year is profitable across all three lines. See
 * docs/RULES.md for the worked numbers.
 *
 * Employee counts per line are sized to roughly match that line's demand
 * ceiling at default quality/brand/productivity, so labor isn't the sole
 * early bottleneck for any one product (shortboard 6, longboard 3,
 * fishboard 1 — mirroring their relative market sizes).
 */
export const DEFAULT_STARTING_CONDITIONS: StartingConditions = {
  startingCash: 80000,
  startingDebt: 0,
  startingBrandAwareness: 30,
  startingInnovation: 0,
  startingMorale: DEFAULT_STARTING_MORALE,
  products: {
    shortboard: {
      startingCapacity: 900,
      startingEmployees: 6,
      startingWageLevel: 2500,
      startingQuality: 50,
      startingProductivity: 50,
      startingPrice: PRODUCT_DEFINITIONS.shortboard.referencePrice,
    },
    longboard: {
      startingCapacity: 450,
      startingEmployees: 3,
      startingWageLevel: 2500,
      startingQuality: 50,
      startingProductivity: 50,
      startingPrice: PRODUCT_DEFINITIONS.longboard.referencePrice,
    },
    fishboard: {
      startingCapacity: 150,
      startingEmployees: 1,
      startingWageLevel: 2500,
      startingQuality: 50,
      startingProductivity: 50,
      startingPrice: PRODUCT_DEFINITIONS.fishboard.referencePrice,
    },
  },
};
