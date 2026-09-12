"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DifficultyLevel } from "@/types/game";
import { createSoloGame } from "@/lib/game/createGame";
import { saveGame } from "@/lib/game/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASS } from "@/components/ui/field";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Just price, production, and marketing — everything else stays put." },
  { value: "standard", label: "Standard", description: "The full decision set: staffing, training, quality, R&D, financing." },
  { value: "advanced", label: "Advanced", description: "Standard, plus international expansion — licenses, factories, per-country pricing, market research." },
];

export default function NewGameClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [totalYears, setTotalYears] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("standard");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const game = createSoloGame({
      totalYears,
      difficulty,
      userId: "local-player",
      displayName: displayName.trim() || "You",
      companyName: companyName.trim() || undefined,
    });
    saveGame(game);
    router.push(`/solo/play/${game.config.id}`);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <Card className="h-fit w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">New solo game</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Run a surfboard company across three product lines — shortboard, longboard, and luxury fishboard.
              Starting conditions are fixed for now — see{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">DEFAULT_STARTING_CONDITIONS</code>.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Your name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="You"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Company name (optional)</span>
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

          <Button type="submit" size="lg" className="mt-2 w-full">
            Start game
          </Button>
        </form>
      </Card>
    </div>
  );
}
