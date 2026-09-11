import type { ProductDefinition, ProductId } from "@/types/game";

/**
 * Static product catalog. Prices/costs are as specified by design; baseline
 * demand is tiered by market size (mass-market shortboard > mid longboard >
 * niche luxury fishboard) — see docs/RULES.md for the reasoning and worked
 * numbers.
 */
export const PRODUCT_DEFINITIONS: Record<ProductId, ProductDefinition> = {
  shortboard: {
    id: "shortboard",
    name: "Shortboard",
    description: "High-volume, low-margin bread and butter — the mass market.",
    referencePrice: 50,
    baseUnitCost: 15,
    baseDemandUnits: 1800,
  },
  longboard: {
    id: "longboard",
    name: "Longboard",
    description: "Mid-market, better margin, smaller audience.",
    referencePrice: 110,
    baseUnitCost: 30,
    baseDemandUnits: 900,
  },
  fishboard: {
    id: "fishboard",
    name: "Luxury Fishboard",
    description: "Premium/niche — small volume, but the fattest margin.",
    referencePrice: 350,
    baseUnitCost: 150,
    baseDemandUnits: 300,
  },
};

export function getProductDefinition(id: ProductId): ProductDefinition {
  return PRODUCT_DEFINITIONS[id];
}
