"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game } from "@/types/game";
import { getIdentity } from "@/lib/identity";
import { listMyMultiplayerGames } from "@/lib/game/multiplayerApi";

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
          <Link href="/login?next=/multiplayer" className="underline">
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
          <Link
            href="/multiplayer/new"
            className="flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            New game
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {games === null && !error && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}
        {games !== null && games.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No multiplayer games yet.{" "}
            <Link href="/multiplayer/new" className="underline">
              Start one
            </Link>{" "}
            and send the link to whoever you want playing.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {games?.map((game) => {
            const me = game.players.find((p) => p.userId === identity.userId);
            return (
              <Link
                key={game.config.id}
                href={`/multiplayer/${game.config.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {me?.companyName || `Game ${game.config.id.slice(-6)}`}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {game.players.length} player{game.players.length === 1 ? "" : "s"} · Year {game.currentYear}/
                    {game.config.totalYears} · {game.status.replace("_", " ")}
                  </p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {game.status === "setup" ? "Lobby →" : game.status === "completed" ? "Results →" : "Play →"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
