import type { CountryDefinition, CountryId, ProductId } from "@/types/game";

/**
 * Static country catalog — see docs/REGIONS_DESIGN.md for the reasoning
 * behind these numbers. Grounded in how each place actually relates to
 * surfing and manufacturing: France is the (free) home market; Portugal
 * and Australia are genuinely large real-world surf markets; Morocco and
 * China are cheap manufacturing bases with smaller/more niche surf demand
 * (China's overall consumer market is huge, but surf culture there
 * specifically is a small, growing niche — not proportional to population).
 *
 * `demandMultiplierByProduct` is deliberately per-product, not one flat
 * country-wide number — a country's real surf market skews toward
 * mass-market entry boards or toward the premium/niche line differently
 * (e.g. Morocco/China lean hard toward cheap entry boards with almost no
 * luxury demand; Australia is the one country where the niche fishboard
 * line does relatively BETTER than the mass-market ones, reflecting its
 * affluent, status-conscious surf culture).
 */
export const COUNTRY_DEFINITIONS: Record<CountryId, CountryDefinition> = {
  france: {
    id: "france",
    name: "France",
    description: "Home market — established surf culture (Hossegor, Biarritz), high labor cost.",
    laborCostMultiplier: 1.4,
    // Big surf-school/tourism scene skews toward mass-market entry boards;
    // luxury demand exists but is smaller relative to the mass market than
    // it is in Australia's more affluent, status-conscious surf culture.
    demandMultiplierByProduct: { shortboard: 1.3, longboard: 1.1, fishboard: 0.7 },
    // Mature, saturated home market — no meaningful year-over-year growth.
    demandGrowthRatePerYear: 0,
    demandWeights: { priceWeight: 35, qualityWeight: 30, brandWeight: 25, innovationWeight: 10 },
    licenseCost: 0,
    factoryCost: 0,
    researchCost: 0,
  },
  morocco: {
    id: "morocco",
    name: "Morocco",
    description: "Cheap labor, smaller/emerging surf destination (Taghazout).",
    laborCostMultiplier: 0.5,
    // Budget/backpacker surf destination — almost entirely entry-level
    // demand, luxury boards barely register.
    demandMultiplierByProduct: { shortboard: 0.7, longboard: 0.4, fishboard: 0.2 },
    // Emerging destination, steadily gaining recognition.
    demandGrowthRatePerYear: 0.02,
    demandWeights: { priceWeight: 55, qualityWeight: 15, brandWeight: 20, innovationWeight: 10 },
    licenseCost: 8000,
    factoryCost: 15000,
    researchCost: 1500,
  },
  portugal: {
    id: "portugal",
    name: "Portugal",
    description: "One of the world's top surf destinations right now (Nazaré, Peniche, Ericeira) — real, strong demand.",
    laborCostMultiplier: 0.7,
    // Real, strong demand across the board — big surf-school scene like
    // Morocco/France, but with a genuinely growing quality-conscious segment
    // (competitive/pro surf culture) that keeps fishboard demand healthier.
    demandMultiplierByProduct: { shortboard: 1.3, longboard: 1.2, fishboard: 0.9 },
    // Already strong and still rising — one of the fastest-growing real
    // surf destinations right now.
    demandGrowthRatePerYear: 0.025,
    demandWeights: { priceWeight: 40, qualityWeight: 25, brandWeight: 25, innovationWeight: 10 },
    licenseCost: 15000,
    factoryCost: 25000,
    researchCost: 2000,
  },
  china: {
    id: "china",
    name: "China",
    description: "The world's manufacturing hub — cheapest place to build. Surf culture is real but a small, growing niche relative to the population.",
    laborCostMultiplier: 0.35,
    // What little demand exists skews toward cheap/casual entry boards;
    // there's no domestic surf-status culture yet to support a premium
    // fishboard, so that demand is almost nonexistent.
    demandMultiplierByProduct: { shortboard: 0.5, longboard: 0.35, fishboard: 0.1 },
    // Growing off a tiny base, faster than anywhere else — the "small,
    // growing niche" is the operative word: still small in absolute terms
    // even after several years of this compounding.
    demandGrowthRatePerYear: 0.05,
    demandWeights: { priceWeight: 65, qualityWeight: 15, brandWeight: 15, innovationWeight: 5 },
    licenseCost: 20000,
    factoryCost: 20000,
    researchCost: 2500,
  },
  australia: {
    id: "australia",
    name: "Australia",
    description: "One of the largest surf cultures/markets in the world.",
    laborCostMultiplier: 1.05,
    // The biggest genuine surf culture, spanning mass market AND premium —
    // affluent, enthusiast customers make this the one country where the
    // niche luxury line actually outsells the mass-market lines per capita.
    demandMultiplierByProduct: { shortboard: 1.4, longboard: 1.5, fishboard: 1.6 },
    // Already the largest, most mature surf market — still growing, just slowly.
    demandGrowthRatePerYear: 0.01,
    demandWeights: { priceWeight: 25, qualityWeight: 30, brandWeight: 30, innovationWeight: 15 },
    licenseCost: 25000,
    factoryCost: 35000,
    researchCost: 3000,
  },
};

export function getCountryDefinition(id: CountryId): CountryDefinition {
  return COUNTRY_DEFINITIONS[id];
}

/**
 * A country's demand multiplier for one product, compounded by its
 * `demandGrowthRatePerYear` for however many years have elapsed since game
 * start. `gameYear` is 1-indexed (matches `YearDecision.year`/
 * `SimulateMultiplayerYearInput.year`) — year 1 gets the catalog's base
 * value unchanged (zero years of growth), year 2 gets one year compounded,
 * and so on. Deterministic, not random — see docs/REGIONS_DESIGN.md.
 */
export function effectiveDemandMultiplier(country: CountryDefinition, productId: ProductId, gameYear: number): number {
  const yearsElapsed = Math.max(0, gameYear - 1);
  return country.demandMultiplierByProduct[productId] * Math.pow(1 + country.demandGrowthRatePerYear, yearsElapsed);
}
