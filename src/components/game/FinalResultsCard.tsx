"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game, ProductId } from "@/types/game";
import { formatCurrency } from "@/lib/format";
import { listLeaderboardEntries } from "@/lib/game/leaderboard";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { ProductIcon } from "./ProductIcon";

export function FinalResultsCard({ game }: { game: Game }) {
  const player = game.players[0];
  const score = player.finalScore;
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);

  useEffect(() => {
    // Runs after the page's own effect records this game to the
    // leaderboard, so the entry should already exist by the time this reads
    // it — falls back to no rank shown if not (e.g. leaderboard cleared).
    const entries = listLeaderboardEntries();
    const sorted = [...entries].sort((a, b) => b.compositeScore - a.compositeScore);
    const index = sorted.findIndex((e) => e.gameId === game.config.id);
    // localStorage doesn't exist during SSR, so this reads after mount —
    // same hydration-safety reasoning as the game-loading effects elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (index >= 0) setRank({ position: index + 1, total: sorted.length });
  }, [game.config.id]);

  const bestYear = player.results.reduce(
    (best, r) => (r.incomeStatement.netProfit > (best?.incomeStatement.netProfit ?? -Infinity) ? r : best),
    player.results[0],
  );

  const productTotals = new Map<ProductId, number>();
  for (const r of player.results) {
    for (const p of r.incomeStatement.byProduct) {
      productTotals.set(p.productId, (productTotals.get(p.productId) ?? 0) + p.grossProfit);
    }
  }
  const bestProductId = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Final results — {game.config.totalYears} years
      </h2>

      {score && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Cumulative net profit</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatCurrency(score.cumulativeNetProfit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Final valuation</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatCurrency(score.finalValuation)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Composite score</dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{score.compositeScore.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Leaderboard rank</dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {rank ? `#${rank.position} of ${rank.total}` : "—"}
            </dd>
          </div>
        </dl>
      )}

      {(bestYear || bestProductId) && (
        <div className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-4 text-sm text-zinc-600 dark:border-zinc-900 dark:text-zinc-400">
          {bestYear && (
            <p>
              Best year: <strong className="text-zinc-900 dark:text-zinc-100">Year {bestYear.year}</strong> (
              {formatCurrency(bestYear.incomeStatement.netProfit)} net profit)
            </p>
          )}
          {bestProductId && (
            <p className="inline-flex items-center gap-2">
              Best product:
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                <ProductIcon productId={bestProductId} className="h-5 w-2.5 text-zinc-400 dark:text-zinc-600" />
                {PRODUCT_DEFINITIONS[bestProductId].name}
              </span>{" "}
              ({formatCurrency(productTotals.get(bestProductId)!)} total gross profit)
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/solo/play/${game.config.id}/financials`}
          className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:w-auto"
        >
          Full financials
        </Link>
        <Link
          href="/leaderboard"
          className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:w-auto"
        >
          Leaderboard
        </Link>
        <Link
          href="/solo/new"
          className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
        >
          Play again
        </Link>
      </div>
    </div>
  );
}
