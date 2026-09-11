import type { Game, LeaderboardEntry } from "@/types/game";

/**
 * Client-side only leaderboard, via localStorage — same caveat as
 * src/lib/game/storage.ts: no backend yet, so this only reflects games
 * completed in this browser.
 */

const LEADERBOARD_KEY = "edugame:leaderboard";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function listLeaderboardEntries(): LeaderboardEntry[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: LeaderboardEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

/** Records a completed game's final score. No-op if the game isn't completed or already recorded. */
export function recordLeaderboardEntry(game: Game): LeaderboardEntry | null {
  if (game.status !== "completed") return null;

  const entries = listLeaderboardEntries();
  if (entries.some((e) => e.gameId === game.config.id)) {
    return entries.find((e) => e.gameId === game.config.id) ?? null;
  }

  const player = game.players[0];
  const score = player.finalScore;
  if (!score) return null;

  const entry: LeaderboardEntry = {
    id: `lb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    gameId: game.config.id,
    playerName: player.displayName,
    companyName: player.companyName,
    completedAt: new Date().toISOString(),
    totalYears: game.config.totalYears,
    difficulty: game.config.difficulty,
    cumulativeNetProfit: score.cumulativeNetProfit,
    finalValuation: score.finalValuation,
    compositeScore: score.compositeScore,
  };

  saveEntries([entry, ...entries]);
  return entry;
}

export function clearLeaderboard(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LEADERBOARD_KEY);
}
