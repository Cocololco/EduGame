"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game, GameStatus } from "@/types/game";
import { getIdentity } from "@/lib/identity";
import { listMyMultiplayerGames } from "@/lib/game/multiplayerApi";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const STATUS_STYLE: Record<GameStatus, string> = {
  in_progress: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  setup: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export default function MyMultiplayerGamesClient() {
  const [identity, setIdentity] = useState<ReturnType<typeof getIdentity> | undefined>(undefined);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getIdentity();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(id);
    if (id) {
      listMyMultiplayerGames(id.userId)
        .then(setGames)
        .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your games."));
    }
  }, []);

  if (identity === undefined) return null;

  if (identity === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login?next=/multiplayer" className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
            Sign in
          </Link>{" "}
          first — just a name, no password.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">My multiplayer games</h1>
          <LinkButton href="/multiplayer/new" size="sm">
            New game
          </LinkButton>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {games === null && !error && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}
        {games !== null && games.length === 0 && (
          <Card className="text-sm text-zinc-500 dark:text-zinc-400">
            No multiplayer games yet.{" "}
            <Link href="/multiplayer/new" className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
              Start one
            </Link>{" "}
            and send the link to whoever you want playing.
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {games?.map((game) => {
            const me = game.players.find((p) => p.userId === identity.userId);
            return (
              <Link key={game.config.id} href={`/multiplayer/${game.config.id}`} className="group block">
                <Card className="flex items-center justify-between transition-shadow group-hover:shadow-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {me?.companyName || `Game ${game.config.id.slice(-6)}`}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[game.status]}`}>
                        {game.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {game.players.length} player{game.players.length === 1 ? "" : "s"} · Year {game.currentYear}/
                      {game.config.totalYears}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
                    {game.status === "setup" ? "Lobby →" : game.status === "completed" ? "Results →" : "Play →"}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
