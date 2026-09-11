import type {
  ProductId,
  RandomEvent,
  RandomEventEffects,
  RandomEventScope,
  RandomEventType,
} from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { RANDOM_EVENT_CHANCE } from "./constants";
import { getProductDefinition } from "./products";

interface EventTemplate {
  type: RandomEventType;
  scope: RandomEventScope;
  /** true = affects one randomly-picked product line only, not the whole company. */
  productScoped: boolean;
  describe: (productName?: string) => string;
  effects: RandomEventEffects;
}

// Effect magnitudes are placeholders (see constants.ts) — not balanced yet.
const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "economic_downturn",
    scope: "global",
    productScoped: false,
    describe: () => "An economic downturn reduces demand across the board.",
    effects: { demandMultiplier: 0.8 },
  },
  {
    type: "demand_shock_positive",
    scope: "global",
    productScoped: false,
    describe: () => "A surge in consumer interest boosts demand across the board.",
    effects: { demandMultiplier: 1.2 },
  },
  {
    type: "demand_shock_negative",
    scope: "global",
    productScoped: false,
    describe: () => "A shift in consumer preferences reduces demand across the board.",
    effects: { demandMultiplier: 0.85 },
  },
  {
    type: "cost_inflation",
    scope: "global",
    productScoped: false,
    describe: () => "Inflation raises material costs across the board.",
    effects: { unitCostMultiplier: 1.1 },
  },
  {
    type: "regulatory_change",
    scope: "global",
    productScoped: false,
    describe: () => "New regulation adds compliance costs.",
    effects: { unitCostMultiplier: 1.05, extraCash: -2000 },
  },
  {
    type: "demand_shock_positive",
    scope: "player",
    productScoped: true,
    describe: (name) => `${name} is trending — a surge in demand.`,
    effects: { demandMultiplier: 1.4 },
  },
  {
    type: "supply_disruption",
    scope: "player",
    productScoped: true,
    describe: (name) => `A supply chain disruption raises your ${name} unit costs.`,
    effects: { unitCostMultiplier: 1.15 },
  },
  {
    type: "competitor_price_war",
    scope: "player",
    productScoped: true,
    describe: (name) => `A rival's price war pressures your ${name} margins.`,
    effects: { priceCapMultiplier: 0.95 },
  },
];

export interface RandomEventGeneratorOptions {
  /** Injectable RNG for deterministic tests; defaults to Math.random. */
  rng?: () => number;
  eventChance?: number;
}

/**
 * Rolls whether an event happens this year for a given scope, and if so,
 * picks one at random from that scope's templates (product-scoped
 * templates additionally pick a random product to target). Returns null if
 * no event occurs (the common case — see RANDOM_EVENT_CHANCE).
 */
export function rollRandomEvent(
  year: number,
  scope: RandomEventScope,
  affectedPlayerId: string | undefined,
  options: RandomEventGeneratorOptions = {},
): RandomEvent | null {
  const rng = options.rng ?? Math.random;
  const chance = options.eventChance ?? RANDOM_EVENT_CHANCE;
  if (rng() >= chance) return null;

  const candidates = EVENT_TEMPLATES.filter((e) => e.scope === scope);
  if (candidates.length === 0) return null;
  const template = candidates[Math.floor(rng() * candidates.length)];

  let productId: ProductId | undefined;
  let productName: string | undefined;
  if (template.productScoped) {
    productId = PRODUCT_IDS[Math.floor(rng() * PRODUCT_IDS.length)];
    productName = getProductDefinition(productId).name;
  }

  return {
    id: `evt_${year}_${scope}_${affectedPlayerId ?? "global"}_${Math.floor(rng() * 1e9)}`,
    year,
    type: template.type,
    scope: template.scope,
    affectedPlayerId,
    description: template.describe(productName),
    effects: { ...template.effects, productId },
  };
}
