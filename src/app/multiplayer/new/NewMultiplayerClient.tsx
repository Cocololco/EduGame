"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DifficultyLevel } from "@/types/game";
import { getIdentity } from "@/lib/identity";
import { createMultiplayerGameApi } from "@/lib/game/multiplayerApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/field";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Just price, production, and marketing — everything else stays put." },
  { value: "standard", label: "Standard", description: "The full decision set: staffing, training, quality, R&D, financing." },
  { value: "advanced", label: "Advanced", description: "Standard, plus international expansion — licenses, factories, per-country pricing, market research." },
];

export default function NewMultiplayerClient() {
  const router = useRouter();
  const [identity, setIdentity] = useState<ReturnType<typeof getIdentity>>(undefined as never);
  const [companyName, setCompanyName] = useState("");
  const [totalYears, setTotalYears] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("standard");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [numBots, setNumBots] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(getIdentity());
  }, []);

  if (identity === undefined) return null;
  if (identity === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login?next=/multiplayer/new" className="text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
            Sign in
          </Link>{" "}
          first — just a name, no password.
        </p>
      </div>
    );
  }

  const maxHumanSeats = Math.max(1, maxPlayers - numBots);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setSubmitting(true);
    setError(null);
    try {
      const game = await createMultiplayerGameApi({
        totalYears,
        difficulty,
        maxPlayers,
        numBots,
        userId: identity.userId,
        displayName: identity.displayName,
        companyName: companyName.trim() || undefined,
      });
      router.push(`/multiplayer/${game.config.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that game.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <Card className="h-fit w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">New multiplayer game</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Playing as <strong className="text-zinc-800 dark:text-zinc-200">{identity.displayName}</strong>. You&apos;ll get
              a link to share once it&apos;s created.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Your company name (optional)</span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Point Break Boards"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Game length (years)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={totalYears}
              onChange={(e) => setTotalYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Total players (human + bot)</span>
            <select
              value={maxPlayers}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaxPlayers(v);
                if (numBots > v - 1) setNumBots(v - 1);
              }}
              className={SELECT_CLASS}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Bots</span>
            <select value={numBots} onChange={(e) => setNumBots(Number(e.target.value))} className={SELECT_CLASS}>
              {Array.from({ length: maxPlayers }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {maxHumanSeats} human seat{maxHumanSeats === 1 ? "" : "s"} (including you) — bots fill in once the game
              starts, whether or not all human seats are taken.
            </span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">Difficulty</legend>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-300 p-3 text-sm transition-colors has-checked:border-teal-500 has-checked:bg-teal-50/60 dark:border-zinc-700 dark:has-checked:border-teal-400 dark:has-checked:bg-teal-950/30"
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={opt.value}
                  checked={difficulty === opt.value}
                  onChange={() => setDifficulty(opt.value)}
                  className="mt-1 accent-teal-600"
                />
                <span>
                  <span className="block font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                  <span className="block text-zinc-500 dark:text-zinc-400">{opt.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" disabled={submitting} size="lg" className="mt-2 w-full">
            {submitting ? "Creating…" : "Create game"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
