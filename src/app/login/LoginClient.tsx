"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getIdentity, setDisplayName } from "@/lib/identity";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASS } from "@/components/ui/field";

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
      <Card className="h-fit w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
              className={INPUT_CLASS}
            />
          </label>

          <Button type="submit" disabled={!name.trim()} size="lg" className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    </div>
  );
}
