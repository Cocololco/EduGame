import type { Player } from "@/types/game";
import { formatCurrency } from "@/lib/format";

export function MultiplayerResultsTable({ players, myPlayerId }: { players: Player[]; myPlayerId: string }) {
  const ranked = [...players]
    .filter((p) => p.finalScore)
    .sort((a, b) => (b.finalScore!.compositeScore ?? 0) - (a.finalScore!.compositeScore ?? 0));

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 pl-4 pr-4 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Player</th>
            <th className="py-2 pr-4 font-medium">Net profit</th>
            <th className="py-2 pr-4 font-medium">Valuation</th>
            <th className="py-2 pr-4 pl-0 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p, i) => (
            <tr
              key={p.id}
              className={`border-b border-zinc-100 last:border-b-0 dark:border-zinc-900 ${p.id === myPlayerId ? "bg-teal-50/60 dark:bg-teal-950/20" : ""}`}
            >
              <td className="py-2 pl-4 pr-4">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    i === 0
                      ? "bg-amber-400 text-amber-950"
                      : i === 1
                        ? "bg-zinc-300 text-zinc-800 dark:bg-zinc-400"
                        : i === 2
                          ? "bg-amber-700 text-amber-50"
                          : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                {p.companyName || p.displayName}
                {p.isBot && <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">(bot)</span>}
                {p.id === myPlayerId && <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">(you)</span>}
              </td>
              <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.finalScore!.cumulativeNetProfit)}</td>
              <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(p.finalScore!.finalValuation)}</td>
              <td className="py-2 pr-4 pl-0 font-semibold text-zinc-900 dark:text-zinc-100">
                {p.finalScore!.compositeScore.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
