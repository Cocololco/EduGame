"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game, GameStatus } from "@/types/game";
import { deleteGame, listGames } from "@/lib/game/storage";
import { formatCurrency } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const STATUS_STYLE: Record<GameStatus, string> = {
  in_progress: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  setup: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

function StatusBadge({ status }: { status: GameStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function MyGamesClient() {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGames(listGames());
  }, []);

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}"? This can't be undone.`)) return;
    deleteGame(id);
    setGames((prev) => prev?.filter((g) => g.config.id !== id) ?? null);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">My games</h1>
          <LinkButton href="/solo/new" size="sm">
            New game
          </LinkButton>
        </div>

        {games === null && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}

        {games !== null && games.length === 0 && (
          <Card className="text-sm text-zinc-500 dark:text-zinc-400">
            No games saved in this browser yet.{" "}
            <Link href="/solo/new" className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
              Start one
            </Link>
            .
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {games?.map((game) => {
            const player = game.players[0];
            const latest = player.companyStates[player.companyStates.length - 1];
            return (
              <Card key={game.config.id} className="flex items-center justify-between transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {player.companyName || player.displayName}
                    </p>
                    <StatusBadge status={game.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Year {game.currentYear}/{game.config.totalYears} · equity {formatCurrency(latest.equity)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/solo/play/${game.config.id}`}
                    className="text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-800 dark:text-teal-400 dark:decoration-teal-800 dark:hover:text-teal-300"
                  >
                    {game.status === "completed" ? "View" : "Continue"}
                  </Link>
                  <button
                    onClick={() => handleDelete(game.config.id, player.companyName || player.displayName)}
                    className="text-sm text-red-600 underline decoration-red-200 underline-offset-4 hover:text-red-700 dark:text-red-400 dark:decoration-red-900 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
