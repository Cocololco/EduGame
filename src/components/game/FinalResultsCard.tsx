import Link from "next/link";
import type { Game } from "@/types/game";
import { formatCurrency } from "@/lib/format";

export function FinalResultsCard({ game }: { game: Game }) {
  const player = game.players[0];
  const score = player.finalScore;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Final results — {game.config.totalYears} years
      </h2>

      {score && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
        </dl>
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
