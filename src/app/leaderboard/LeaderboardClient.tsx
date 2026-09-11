"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/types/game";
import { clearLeaderboard, listLeaderboardEntries } from "@/lib/game/leaderboard";
import { formatCurrency } from "@/lib/format";

type SortKey = "compositeScore" | "cumulativeNetProfit" | "finalValuation" | "completedAt";

const SORT_LABELS: Record<SortKey, string> = {
  compositeScore: "Score",
  cumulativeNetProfit: "Net profit",
  finalValuation: "Valuation",
  completedAt: "Date",
};

export default function LeaderboardClient() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(listLeaderboardEntries());
  }, []);

  function handleClear() {
    if (!confirm("Clear the leaderboard? This can't be undone.")) return;
    clearLeaderboard();
    setEntries([]);
  }

  const sorted = entries
    ? [...entries].sort((a, b) => {
        if (sortKey === "completedAt") return b.completedAt.localeCompare(a.completedAt);
        return b[sortKey] - a[sortKey];
      })
    : [];

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Leaderboard</h1>
          <Link href="/solo/new" className="text-sm underline text-zinc-600 dark:text-zinc-400">
            New game
          </Link>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every completed game in this browser, ranked. No accounts yet — this doesn&apos;t sync anywhere else.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Sort by:</span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                sortKey === key
                  ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        {entries !== null && entries.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No completed games yet.{" "}
            <Link href="/solo/new" className="underline">
              Play one
            </Link>
            .
          </p>
        )}

        {sorted.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-2 pl-4 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Years</th>
                  <th className="py-2 pr-4 font-medium">Difficulty</th>
                  <th className="py-2 pr-4 font-medium">Net profit</th>
                  <th className="py-2 pr-4 font-medium">Valuation</th>
                  <th className="py-2 pr-4 pl-0 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, i) => (
                  <tr key={e.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900">
                    <td className="py-2 pl-4 pr-4 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">{e.playerName}</td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{e.companyName || "—"}</td>
                    <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">
                      {new Date(e.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{e.totalYears}</td>
                    <td className="py-2 pr-4 capitalize text-zinc-700 dark:text-zinc-300">{e.difficulty}</td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(e.cumulativeNetProfit)}</td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{formatCurrency(e.finalValuation)}</td>
                    <td className="py-2 pr-4 pl-0 font-semibold text-zinc-900 dark:text-zinc-100">
                      {e.compositeScore.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries !== null && entries.length > 0 && (
          <button onClick={handleClear} className="self-start text-xs text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            Clear leaderboard
          </button>
        )}
      </div>
    </div>
  );
}
