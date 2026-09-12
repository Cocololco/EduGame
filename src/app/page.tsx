import Link from "next/link";
import { ProductIcon } from "@/components/game/ProductIcon";
import { LinkButton } from "@/components/ui/Button";
import { PRODUCT_IDS } from "@/types/game";
import { PRODUCT_DEFINITIONS } from "@/lib/simulation/products";

const FEATURES = [
  {
    title: "Three product lines",
    body: "Shortboard, longboard, and luxury fishboard — independent price, production, staffing, and quality decisions for each.",
  },
  {
    title: "Solo or with friends",
    body: "Play against the market alone, or share a link for a shared-market multiplayer game with bots filling any open seats.",
  },
  {
    title: "Go international",
    body: "License, manufacture in, and price into 5 countries — each with its own labor cost, market size, and customer preferences.",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-teal-50/70 via-zinc-50 to-zinc-50 px-6 py-20 dark:from-teal-950/20 dark:via-black dark:to-black sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10"
      />

      <div className="relative flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex items-end gap-3 text-teal-600/70 dark:text-teal-400/60">
          {PRODUCT_IDS.map((id) => (
            <ProductIcon key={id} productId={id} className="h-24 w-12 drop-shadow-sm" />
          ))}
        </div>

        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">EduGame</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Run a surfboard company as owner/manager. Each round is one business year of pricing, production,
            staffing, and financing decisions — then the year simulates and the results come back.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <LinkButton href="/solo/new" size="lg" className="w-full sm:w-auto">
            Play Solo
          </LinkButton>
          <LinkButton href="/multiplayer/new" variant="secondary" size="lg" className="w-full sm:w-auto">
            Play Multiplayer
          </LinkButton>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/solo" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:text-zinc-100">
            My games
          </Link>
          <Link href="/multiplayer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:text-zinc-100">
            My multiplayer games
          </Link>
          <Link href="/leaderboard" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:text-zinc-100">
            Leaderboard
          </Link>
          <Link href="/rules" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:text-zinc-100">
            How the simulation works
          </Link>
        </div>
      </div>

      <div className="relative mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-left shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
          </div>
        ))}
      </div>

      <p className="relative mt-10 text-sm text-zinc-500 dark:text-zinc-500">
        No account needed — solo games live in this browser only; multiplayer just needs a name (see{" "}
        <Link href="/login" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 dark:decoration-zinc-700 dark:hover:text-zinc-100">
          sign in
        </Link>
        ).
      </p>

      <div className="relative mt-6 flex gap-6 text-xs text-zinc-400 dark:text-zinc-600">
        {PRODUCT_IDS.map((id) => (
          <span key={id}>{PRODUCT_DEFINITIONS[id].name}</span>
        ))}
      </div>
    </div>
  );
}
