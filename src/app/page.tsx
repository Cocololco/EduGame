import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">EduGame</h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Run a company as owner/manager. Each round is one business year of decisions — pricing, production,
            HR, finance — then the year simulates and the results come back.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/solo/new"
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
          >
            Play Solo
          </Link>
          <span
            title="Not built yet"
            className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-zinc-300 px-6 text-base font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-600 sm:w-auto"
          >
            Multiplayer (soon)
          </span>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No account needed yet — solo games are saved in this browser only.
        </p>
      </div>
    </div>
  );
}
