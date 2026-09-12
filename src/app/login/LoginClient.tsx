"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getIdentity, setDisplayName } from "@/lib/identity";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");

  useEffect(() => {
    const existing = getIdentity();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (existing) setName(existing.displayName);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Who&apos;s playing?</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Just a name — no account, no password. This browser remembers you for solo and multiplayer games.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Your name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coco"
            autoFocus
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <button
          type="submit"
          disabled={!name.trim()}
          className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
