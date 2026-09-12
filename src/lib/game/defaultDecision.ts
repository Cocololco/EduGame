import type { CompanyDecision, CompanyYearState, CountryId, ProductId, YearDecisionInput } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { nearestOption, priceOptions, productionOptions } from "./decisionOptions";
import { computeAttractiveness } from "../simulation/simulateYear";
import { PRODUCT_DEFINITIONS } from "../simulation/products";
import type { ProductDecisionInput } from "@/types/game";

/**
 * A sensible starting point for a year's decision form, from a company's
 * current state: price near neutral, production aimed at roughly what you
 * can actually sell (not blindly maxed out — see the note in RULES.md about
 * why that used to be a trap), everything else untouched. Shared by solo
 * (PlayClient) and multiplayer (MultiplayerRoomClient) so both start from
 * the same reasoning.
 */
export function buildDefaultDecisionInput(state: CompanyYearState): YearDecisionInput {
  const products = {} as Record<ProductId, ProductDecisionInput>;

  for (const id of PRODUCT_IDS) {
    const def = PRODUCT_DEFINITIONS[id];
    const productState = state.products[id];
    const priceOpts = priceOptions(def);
    const defaultPrice = nearestOption(priceOpts, Math.round(productState.currentPrice));

    const attractiveness = computeAttractiveness(productState, state.brandAwareness, state.innovation, defaultPrice, def.referencePrice);
    const projectedDemand = Math.round(def.baseDemandUnits * attractiveness);
    const prodOpts = productionOptions(productState);
    const defaultProduction = nearestOption(prodOpts, projectedDemand);
    // Split evenly across however many factories are currently open for
    // this product — degenerates to "the whole amount" when there's just
    // one (the common case, and the only case below Advanced difficulty).
    const productionVolumeByFactory: Partial<Record<CountryId, number>> = {};
    const perFactory = Math.round(defaultProduction / productState.factoryCountries.length);
    for (const countryId of productState.factoryCountries) productionVolumeByFactory[countryId] = perFactory;

    products[id] = {
      price: defaultPrice,
      productionVolumeByFactory,
      capacityInvestment: 0,
      qualityInvestment: 0,
      trainingSpend: 0,
      hires: 0,
      fires: 0,
      wageAdjustmentPct: 0,
    };
  }

  const company: CompanyDecision = {
    marketingSpend: 1000,
    rndSpend: 0,
    loanAmountRequested: 0,
    loanRepayment: 0,
    capexSpend: 0,
  };

  return { company, products };
}
