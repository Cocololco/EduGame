import type {
  Player,
  ProductDecision,
  ProductId,
  YearDecision,
  YearDecisionInput,
  YearResult,
} from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { computeScore } from "../simulation/scoring";

/** Turns a player's draft input into a full YearDecision (derives playerId/year/submittedAt/productId). */
export function buildYearDecision(playerId: string, year: number, input: YearDecisionInput): YearDecision {
  const products = {} as Record<ProductId, ProductDecision>;
  for (const id of PRODUCT_IDS) {
    products[id] = { productId: id, ...input.products[id] };
  }
  return {
    playerId,
    year,
    company: input.company,
    products,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Appends a resolved year's decision/result to a player, computing their
 * final score if this was the game's last configured year. Shared by both
 * solo (src/lib/game/createGame.ts) and multiplayer
 * (src/lib/server/multiplayerEngine.ts) turn resolution — keeps "what
 * happens to a player when a year resolves" defined in exactly one place.
 */
export function applyYearResultToPlayer(
  player: Player,
  decision: YearDecision,
  result: YearResult,
  totalYears: number,
): Player {
  const updated: Player = {
    ...player,
    companyStates: [...player.companyStates, result.closingState],
    decisions: [...player.decisions, decision],
    results: [...player.results, result],
    pendingDecision: undefined,
  };

  if (decision.year >= totalYears) {
    updated.finalScore = computeScore(updated);
  }

  return updated;
}
