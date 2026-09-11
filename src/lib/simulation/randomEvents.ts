import type {
  RandomEvent,
  RandomEventEffects,
  RandomEventScope,
  RandomEventType,
} from "@/types/game";
import { RANDOM_EVENT_CHANCE } from "./constants";

interface EventTemplate {
  type: RandomEventType;
  scope: RandomEventScope;
  description: string;
  effects: RandomEventEffects;
}

// Effect magnitudes are placeholders (see constants.ts) — not balanced yet.
const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "economic_downturn",
    scope: "global",
    description: "An economic downturn reduces overall demand.",
    effects: { demandMultiplier: 0.8 },
  },
  {
    type: "demand_shock_positive",
    scope: "global",
    description: "A surge in consumer interest boosts demand.",
    effects: { demandMultiplier: 1.2 },
  },
  {
    type: "demand_shock_negative",
    scope: "global",
    description: "A shift in consumer preferences reduces demand.",
    effects: { demandMultiplier: 0.85 },
  },
  {
    type: "cost_inflation",
    scope: "global",
    description: "Inflation raises costs across the market.",
    effects: { unitCostMultiplier: 1.1 },
  },
  {
    type: "regulatory_change",
    scope: "global",
    description: "New regulation adds compliance costs.",
    effects: { unitCostMultiplier: 1.05, extraCash: -2000 },
  },
  {
    type: "supply_disruption",
    scope: "player",
    description: "A supply chain disruption raises your unit costs.",
    effects: { unitCostMultiplier: 1.15 },
  },
  {
    type: "competitor_price_war",
    scope: "player",
    description: "A rival's price war pressures your margins.",
    effects: { priceCapMultiplier: 0.95 },
  },
];

export interface RandomEventGeneratorOptions {
  /** Injectable RNG for deterministic tests; defaults to Math.random. */
  rng?: () => number;
  /** Overrides RANDOM_EVENT_CHANCE. */
  eventChance?: number;
}

/**
 * Rolls whether an event happens this year for a given scope, and if so,
 * picks one at random from that scope's templates. Returns null if no event
 * occurs (the common case — see RANDOM_EVENT_CHANCE).
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

  return {
    id: `evt_${year}_${scope}_${affectedPlayerId ?? "global"}_${Math.floor(rng() * 1e9)}`,
    year,
    type: template.type,
    scope: template.scope,
    affectedPlayerId,
    description: template.description,
    effects: template.effects,
  };
}
