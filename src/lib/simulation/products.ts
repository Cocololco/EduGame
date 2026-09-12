import type { ProductDefinition, ProductId } from "@/types/game";

/**
 * Static product catalog. Prices/costs are as specified by design; baseline
 * demand is tiered by market size (mass-market shortboard > mid longboard >
 * niche luxury fishboard) — see docs/RULES.md for the reasoning and worked
 * numbers.
 *
 * `demandWeights` (multiplayer only) says how each product's buyers pick a
 * winner: shortboard buyers mostly shop on price; fishboard buyers mostly
 * care about quality and brand, and barely notice price at all.
 */
export const PRODUCT_DEFINITIONS: Record<ProductId, ProductDefinition> = {
  shortboard: {
    id: "shortboard",
    name: "Shortboard",
    description: "High-volume, low-margin bread and butter — the mass market.",
    referencePrice: 50,
    baseUnitCost: 15,
    baseDemandUnits: 1800,
    demandWeights: { priceWeight: 60, qualityWeight: 15, brandWeight: 15, innovationWeight: 10 },
  },
  longboard: {
    id: "longboard",
    name: "Longboard",
    description: "Mid-market, better margin, smaller audience.",
    referencePrice: 110,
    baseUnitCost: 30,
    baseDemandUnits: 900,
    demandWeights: { priceWeight: 35, qualityWeight: 30, brandWeight: 25, innovationWeight: 10 },
  },
  fishboard: {
    id: "fishboard",
    name: "Luxury Fishboard",
    description: "Premium/niche — small volume, but the fattest margin.",
    referencePrice: 350,
    baseUnitCost: 150,
    baseDemandUnits: 300,
    demandWeights: { priceWeight: 10, qualityWeight: 50, brandWeight: 30, innovationWeight: 10 },
  },
};

export function getProductDefinition(id: ProductId): ProductDefinition {
  return PRODUCT_DEFINITIONS[id];
}
