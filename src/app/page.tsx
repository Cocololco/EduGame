import Link from "next/link";
import { ProductIcon } from "@/components/game/ProductIcon";
import { PRODUCT_IDS } from "@/types/game";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex items-end gap-4 text-zinc-300 dark:text-zinc-700">
          {PRODUCT_IDS.map((id) => (
            <ProductIcon key={id} productId={id} className="h-24 w-12" />
          ))}
        </div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">EduGame</h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Run a surfboard company as owner/manager — three product lines, one brand. Each round is one business
            year of pricing, production, staffing, and financing decisions, then the year simulates and the results
            come back.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/solo/new"
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
          >
            Play Solo
          </Link>
          <Link
            href="/multiplayer/new"
            className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:w-auto"
          >
            Play Multiplayer
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/solo" className="underline">
            My games
          </Link>
          <Link href="/multiplayer" className="underline">
            My multiplayer games
          </Link>
          <Link href="/leaderboard" className="underline">
            Leaderboard
          </Link>
          <Link href="/rules" className="underline">
            How the simulation works
          </Link>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No account needed — solo games live in this browser only; multiplayer just needs a name (see{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>
          ).
        </p>

        <div className="flex gap-6 text-xs text-zinc-500 dark:text-zinc-500">
          {PRODUCT_IDS.map((id) => (
            <span key={id}>{PRODUCT_DEFINITIONS[id].name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
