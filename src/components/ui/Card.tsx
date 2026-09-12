import type { HTMLAttributes } from "react";

/**
 * The app's one card recipe — a bordered, softly-shadowed panel. Every
 * feature page hand-rolled this same class string before; centralizing it
 * here means a future tweak (radius, shadow depth) happens in one place.
 */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className ?? ""}`}
      {...rest}
    />
  );
}
