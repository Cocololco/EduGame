"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Game } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { advanceSoloYear } from "@/lib/game/createGame";
import type { YearDecisionInput } from "@/lib/game/createGame";
import { deleteGame, loadGame, saveGame } from "@/lib/game/storage";
import { recordLeaderboardEntry } from "@/lib/game/leaderboard";
import { buildDefaultDecisionInput } from "@/lib/game/defaultDecision";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { CompanyStatusPanel } from "@/components/game/CompanyStatusPanel";
import { ProductDecisionPanel } from "@/components/game/ProductDecisionPanel";
import { CompanyDecisionPanel } from "@/components/game/CompanyDecisionPanel";
import { YearResultSummaryCard } from "@/components/game/YearResultSummaryCard";
import { FinalResultsCard } from "@/components/game/FinalResultsCard";
import { Button } from "@/components/ui/Button";

type FormState = YearDecisionInput;

function defaultFormState(game: Game): FormState {
  const state = game.players[0].companyStates[game.players[0].companyStates.length - 1];
  return buildDefaultDecisionInput(state);
}

export default function PlayClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [dismissedResultForYear, setDismissedResultForYear] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so `game` starts undefined
    // (matching the server-rendered "Loading…" output) and is populated
    // here after mount — loading it eagerly would cause a hydration
    // mismatch instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadGame(params.id));
  }, [params.id]);

  const player = game?.players[0];
  const resultsCount = player?.results.length ?? 0;
  const pendingResult = player && resultsCount > dismissedResultForYear ? player.results[resultsCount - 1] : null;
  const showDecisionForm = !!game && !pendingResult && game.status === "in_progress";
  const showFinal = !!game && !pendingResult && game.status === "completed";

  useEffect(() => {
    // Populate a fresh default decision form whenever a new year's
    // decision becomes the thing to show (initial load, or after
    // dismissing the previous year's result panel).
    if (game && showDecisionForm && !form) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(defaultFormState(game));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentYear, showDecisionForm]);

  useEffect(() => {
    // Idempotent — recordLeaderboardEntry no-ops if this game is already recorded.
    if (game && showFinal) recordLeaderboardEntry(game);
  }, [game, showFinal]);

  if (game === undefined) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (game === null) {
    return (
      <CenteredMessage>
        Couldn&apos;t find that game in this browser.{" "}
        <Link href="/solo/new" className="underline">
          Start a new one
        </Link>
        .
      </CenteredMessage>
    );
  }

  if (!player) return null;
  const latestState = player.companyStates[player.companyStates.length - 1];

  function handleSubmit() {
    if (!game || !form) return;
    const updated = advanceSoloYear(game, form);
    saveGame(updated);
    setGame(updated);
    setForm(null);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/solo" className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-zinc-100">
            ← My games
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/solo/play/${game.config.id}/financials`}
              className="text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-800 dark:text-teal-400 dark:decoration-teal-800 dark:hover:text-teal-300"
            >
              Full financials →
            </Link>
            <button
              onClick={() => {
                if (!confirm("Abandon this game? This can't be undone.")) return;
                deleteGame(game.config.id);
                router.push("/solo");
              }}
              className="text-sm text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Abandon
            </button>
          </div>
        </div>

        <CompanyStatusPanel
          state={latestState}
          year={game.currentYear}
          totalYears={game.config.totalYears}
          companyName={player.companyName}
        />

        {pendingResult && (
          <YearResultSummaryCard
            result={pendingResult}
            gameId={game.config.id}
            isLastYear={game.status === "completed"}
            onContinue={() => setDismissedResultForYear(resultsCount)}
          />
        )}

        {showDecisionForm && form && (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Each option shows its effect. Not sure what a number means?{" "}
              <Link href="/rules" className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300" target="_blank">
                See the rules
              </Link>
              .
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {PRODUCT_IDS.map((id) => (
                <ProductDecisionPanel
                  key={id}
                  def={PRODUCT_DEFINITIONS[id]}
                  state={latestState.products[id]}
                  companyBrandAwareness={latestState.brandAwareness}
                  companyInnovation={latestState.innovation}
                  licensedCountries={latestState.licensedCountries}
                  openedFactoryCountries={latestState.openedFactoryCountries}
                  value={form.products[id]}
                  onChange={(next) => setForm({ ...form, products: { ...form.products, [id]: next } })}
                  difficulty={game.config.difficulty}
                />
              ))}
            </div>

            <CompanyDecisionPanel
              state={latestState}
              value={form.company}
              onChange={(next) => setForm({ ...form, company: next })}
              difficulty={game.config.difficulty}
            />

            <Button onClick={handleSubmit} size="lg" className="w-full sm:w-auto">
              Submit year {game.currentYear + 1}
            </Button>
          </>
        )}

        {showFinal && <FinalResultsCard game={game} />}
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 text-center text-zinc-600 dark:bg-black dark:text-zinc-400">
      <p>{children}</p>
    </div>
  );
}
