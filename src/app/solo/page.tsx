"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game } from "@/types/game";
import { deleteGame, listGames } from "@/lib/game/storage";
import { formatCurrency } from "@/lib/format";

export default function MyGamesPage() {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGames(listGames());
  }, []);

  function handleDelete(id: string) {
    deleteGame(id);
    setGames((prev) => prev?.filter((g) => g.config.id !== id) ?? null);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">My games</h1>
          <Link
            href="/solo/new"
            className="flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            New game
          </Link>
        </div>

        {games === null && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}

        {games !== null && games.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No games saved in this browser yet.{" "}
            <Link href="/solo/new" className="underline">
              Start one
            </Link>
            .
          </p>
        )}

        <div className="flex flex-col gap-3">
          {games?.map((game) => {
            const player = game.players[0];
            const latest = player.companyStates[player.companyStates.length - 1];
            return (
              <div
                key={game.config.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {player.companyName || player.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Year {game.currentYear}/{game.config.totalYears} · {game.status.replace("_", " ")} · equity{" "}
                    {formatCurrency(latest.equity)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/solo/play/${game.config.id}`} className="text-sm underline text-zinc-700 dark:text-zinc-300">
                    {game.status === "completed" ? "View" : "Continue"}
                  </Link>
                  <button
                    onClick={() => handleDelete(game.config.id)}
                    className="text-sm text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
