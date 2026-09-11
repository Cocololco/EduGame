"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DifficultyLevel } from "@/types/game";
import { createSoloGame } from "@/lib/game/createGame";
import { saveGame } from "@/lib/game/storage";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Full decision set for now (per-difficulty field gating isn't built yet).",
  },
  { value: "standard", label: "Standard", description: "The default." },
  { value: "advanced", label: "Advanced", description: "Same as Standard for now." },
];

export default function NewSoloGamePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [totalYears, setTotalYears] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("standard");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const game = createSoloGame({
      totalYears,
      difficulty,
      userId: "local-player",
      displayName: displayName.trim() || "You",
    });
    saveGame(game);
    router.push(`/solo/play/${game.config.id}`);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">New solo game</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Set up a run. Starting conditions are fixed for now — see{" "}
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">Difficulty</legend>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-300 p-3 text-sm has-checked:border-zinc-950 dark:border-zinc-700 dark:has-checked:border-zinc-50"
            >
              <input
                type="radio"
                name="difficulty"
                value={opt.value}
                checked={difficulty === opt.value}
                onChange={() => setDifficulty(opt.value)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                <span className="block text-zinc-500 dark:text-zinc-400">{opt.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Start game
        </button>
      </form>
    </div>
  );
}
