"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game, YearDecisionInput } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { getIdentity } from "@/lib/identity";
import {
  fetchMultiplayerGame,
  joinMultiplayerGameApi,
  startMultiplayerGameApi,
  submitMultiplayerDecisionApi,
} from "@/lib/game/multiplayerApi";
import { buildDefaultDecisionInput } from "@/lib/game/defaultDecision";
import { recordLeaderboardEntry } from "@/lib/game/leaderboard";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";
import { CompanyStatusPanel } from "@/components/game/CompanyStatusPanel";
import { ProductDecisionPanel } from "@/components/game/ProductDecisionPanel";
import { CompanyDecisionPanel } from "@/components/game/CompanyDecisionPanel";
import { YearResultSummaryCard } from "@/components/game/YearResultSummaryCard";
import { MultiplayerResultsTable } from "@/components/game/MultiplayerResultsTable";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASS } from "@/components/ui/field";

const POLL_INTERVAL_MS = 3500;

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 text-center text-zinc-600 dark:bg-black dark:text-zinc-400">
      <p>{children}</p>
    </div>
  );
}

export default function MultiplayerRoomClient() {
  const params = useParams<{ id: string }>();
  // Both start undefined (matching the SSR-rendered "Loading…" output) and
  // are populated after mount — localStorage/fetch don't exist during SSR,
  // so reading them eagerly would cause a hydration mismatch.
  const [identity, setIdentity] = useState<ReturnType<typeof getIdentity> | undefined>(undefined);
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissedResultForYear, setDismissedResultForYear] = useState(0);
  const [form, setForm] = useState<YearDecisionInput | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinCompany, setJoinCompany] = useState("");

  const refresh = useRef(async () => {
    try {
      const g = await fetchMultiplayerGame(params.id);
      setGame(g);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load this game.");
      setGame(null);
    }
  });

  useEffect(() => {
    // localStorage doesn't exist during SSR, so identity starts undefined
    // (matching the server-rendered "Loading…" output) and is populated
    // here after mount — reading it eagerly would cause a hydration mismatch.
    const id = getIdentity();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(id);
    setJoinName(id?.displayName ?? "");
    refresh.current();
    const interval = setInterval(() => refresh.current(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const me = identity && game ? game.players.find((p) => p.userId === identity.userId) : undefined;
  const resultsCount = me?.results.length ?? 0;
  const pendingResult = me && resultsCount > dismissedResultForYear ? me.results[resultsCount - 1] : null;

  useEffect(() => {
    // Deps cover every transition that should (re)populate the form: the
    // game moving from lobby to in-progress, `me` first existing (right
    // after joining), a year resolving (currentYear changes), and a
    // pendingDecision being cleared after resolution.
    if (!game || !me || me.pendingDecision || pendingResult) return;
    const latestState = me.companyStates[me.companyStates.length - 1];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => prev ?? buildDefaultDecisionInput(latestState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.currentYear, me?.id, me?.pendingDecision]);

  useEffect(() => {
    if (game && me && game.status === "completed") recordLeaderboardEntry(game, me.id);
  }, [game, me]);

  if (identity === undefined || game === undefined) return <CenteredMessage>Loading…</CenteredMessage>;

  if (identity === null) {
    return (
      <CenteredMessage>
        <Link href={`/login?next=/multiplayer/${params.id}`} className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
          Sign in
        </Link>{" "}
        first — just a name, no password.
      </CenteredMessage>
    );
  }

  if (game === null) {
    return <CenteredMessage>{loadError ?? "Couldn't find that game."}</CenteredMessage>;
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/multiplayer/${game.config.id}` : "";
  const humanSeats = game.config.maxPlayers - game.config.numBots;
  const humanCount = game.players.filter((p) => !p.isBot).length;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!identity || !game) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await joinMultiplayerGameApi(game.config.id, identity.userId, joinName.trim() || identity.displayName, joinCompany.trim() || undefined);
      setGame(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't join.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStart() {
    if (!identity || !game) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await startMultiplayerGameApi(game.config.id, identity.userId);
      setGame(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't start the game.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSubmitDecision() {
    if (!identity || !game || !form) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await submitMultiplayerDecisionApi(game.config.id, identity.userId, form);
      setGame(updated);
      setForm(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't submit your decision.");
    } finally {
      setActionBusy(false);
    }
  }

  // ===== Lobby =====
  if (game.status === "setup") {
    return (
      <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
        <div className="flex w-full max-w-lg flex-col gap-6">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Lobby</h1>

          <Card>
            <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Invite link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              />
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {humanCount}/{humanSeats} human seat{humanSeats === 1 ? "" : "s"} filled · {game.config.numBots} bot
              {game.config.numBots === 1 ? "" : "s"} join when the game starts
            </p>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Players</p>
            <ul className="flex flex-col gap-2 text-sm">
              {game.players.map((p) => (
                <li key={p.id} className="text-zinc-700 dark:text-zinc-300">
                  {p.displayName}
                  {p.companyName ? ` — ${p.companyName}` : ""}
                </li>
              ))}
            </ul>
          </Card>

          {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

          {me ? (
            <Button onClick={handleStart} disabled={actionBusy} size="lg" className="w-full">
              {actionBusy ? "Starting…" : "Start game"}
            </Button>
          ) : humanCount >= humanSeats ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">This game&apos;s human seats are full.</p>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Your name</span>
                <input value={joinName} onChange={(e) => setJoinName(e.target.value)} className={INPUT_CLASS} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Company name (optional)</span>
                <input value={joinCompany} onChange={(e) => setJoinCompany(e.target.value)} className={INPUT_CLASS} />
              </label>
              <Button type="submit" disabled={actionBusy} size="lg" className="w-full">
                {actionBusy ? "Joining…" : "Join game"}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!me) {
    return <CenteredMessage>This game already started without you — sorry, you can&apos;t join mid-game.</CenteredMessage>;
  }

  const latestState = me.companyStates[me.companyStates.length - 1];

  // ===== Completed =====
  if (game.status === "completed") {
    return (
      <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Final results — {game.config.totalYears} years</h1>
          <MultiplayerResultsTable players={game.players} myPlayerId={me.id} />
          <LinkButton href="/multiplayer/new" className="w-full sm:w-auto">
            New game
          </LinkButton>
        </div>
      </div>
    );
  }

  // ===== In progress =====
  const waitingOnHumans = game.players.filter((p) => !p.isBot && !p.pendingDecision);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <CompanyStatusPanel state={latestState} year={game.currentYear} totalYears={game.config.totalYears} companyName={me.companyName} />

        {pendingResult && (
          <YearResultSummaryCard
            result={pendingResult}
            gameId={game.config.id}
            financialsHref={null}
            isLastYear={game.status === ("completed" as Game["status"])}
            onContinue={() => setDismissedResultForYear(resultsCount)}
          />
        )}

        {!pendingResult && me.pendingDecision && (
          <Card>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              You&apos;ve submitted year {game.currentYear + 1}. Waiting on:{" "}
              {waitingOnHumans.length === 0 ? "everyone — resolving…" : waitingOnHumans.map((p) => p.displayName).join(", ")}
            </p>
          </Card>
        )}

        {!pendingResult && !me.pendingDecision && form && (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Each option shows its effect.{" "}
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

            <CompanyDecisionPanel state={latestState} value={form.company} onChange={(next) => setForm({ ...form, company: next })} difficulty={game.config.difficulty} />

            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

            <Button onClick={handleSubmitDecision} disabled={actionBusy} size="lg" className="w-full sm:w-auto">
              {actionBusy ? "Submitting…" : `Submit year ${game.currentYear + 1}`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
