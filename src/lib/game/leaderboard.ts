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

/**
 * Records a completed game's final score for one player — defaults to
 * players[0] (solo games only ever have one player). For multiplayer, pass
 * `playerId` for whichever player this browser's viewer actually is, so
 * each participant logs their own result to their own local leaderboard
 * (there's no shared server-side leaderboard — see docs/GAME_DESIGN.md).
 * No-op if the game isn't completed or this entry is already recorded.
 * Dedup is keyed on gameId alone: within one browser, a given multiplayer
 * game only ever corresponds to one player (this browser's own identity),
 * so that's unambiguous — no need to fold playerId into the key.
 */
export function recordLeaderboardEntry(game: Game, playerId?: string): LeaderboardEntry | null {
  if (game.status !== "completed") return null;

  const entries = listLeaderboardEntries();
  if (entries.some((e) => e.gameId === game.config.id)) {
    return entries.find((e) => e.gameId === game.config.id) ?? null;
  }

  const player = playerId ? game.players.find((p) => p.id === playerId) : game.players[0];
  const score = player?.finalScore;
  if (!player || !score) return null;

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
