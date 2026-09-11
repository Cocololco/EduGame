import type { Player, Score, ScoreWeights } from "@/types/game";

/**
 * Placeholder weights, not balanced/playtested (see docs/GAME_DESIGN.md's
 * open questions). These are coefficients, not 0-1 weights summing to 1 —
 * they exist to bring very different-scale inputs (raw dollars vs. a
 * percentage-point delta) into a roughly comparable range:
 * - $100,000 of cumulative net profit -> 100 points
 * - $100,000 of final valuation -> 100 points
 * - +10 percentage points of market share growth -> 50 points
 */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  netProfitWeight: 0.001,
  valuationWeight: 0.001,
  marketShareGrowthWeight: 5,
};

/**
 * Computes a player's final composite score from their accumulated
 * YearResults. Safe to call mid-game (e.g. for a running leaderboard) —
 * it just reflects whatever results exist so far.
 */
export function computeScore(player: Player, weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS): Score {
  const cumulativeNetProfit = player.results.reduce((sum, r) => sum + r.incomeStatement.netProfit, 0);

  const lastResult = player.results[player.results.length - 1];
  const finalValuation = lastResult ? lastResult.closingState.equity : (player.companyStates[0]?.equity ?? 0);

  // Only meaningful in multiplayer, where marketSharePct is populated.
  // Shortboard (the highest-volume line) stands in for overall company share.
  const shortboardShare = (r: typeof lastResult) =>
    r?.incomeStatement.byProduct.find((p) => p.productId === "shortboard")?.marketSharePct;
  const firstShare = shortboardShare(player.results[0]);
  const lastShare = shortboardShare(lastResult);
  const marketShareGrowthPct =
    firstShare !== undefined && lastShare !== undefined ? lastShare - firstShare : undefined;

  const compositeScore =
    cumulativeNetProfit * weights.netProfitWeight +
    finalValuation * weights.valuationWeight +
    (marketShareGrowthPct ?? 0) * weights.marketShareGrowthWeight;

  return {
    playerId: player.id,
    cumulativeNetProfit,
    finalValuation,
    marketShareGrowthPct,
    weights,
    compositeScore,
  };
}

/** Sorts scores highest-first and assigns `rank` (1 = best). */
export function rankScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => b.compositeScore - a.compositeScore).map((s, i) => ({ ...s, rank: i + 1 }));
}
