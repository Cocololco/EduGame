/**
 * Shared Tailwind class strings for text inputs and selects, so every form
 * across the app shares one focus/border treatment instead of each page
 * re-deriving it. `SELECT_CLASS` is the same recipe at text-sm (selects in
 * the decision forms sit in denser layouts than the larger setup forms).
 */
export const INPUT_CLASS =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export const SELECT_CLASS =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
