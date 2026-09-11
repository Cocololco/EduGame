import type { Game } from "@/types/game";

/**
 * Client-side only game persistence, via localStorage. There's no backend
 * yet (see docs/GAME_DESIGN.md) — games live in the browser that created
 * them and aren't shared/synced anywhere. Safe to call from server code
 * (all functions no-op/return null there); real usage is from client
 * components only.
 */

const GAME_PREFIX = "edugame:game:";
const GAME_IDS_KEY = "edugame:gameIds";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveGame(game: Game): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(GAME_PREFIX + game.config.id, JSON.stringify(game));

  const ids = listGameIds();
  if (!ids.includes(game.config.id)) {
    window.localStorage.setItem(GAME_IDS_KEY, JSON.stringify([game.config.id, ...ids]));
  }
}

export function loadGame(id: string): Game | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(GAME_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Game;
  } catch {
    return null;
  }
}

/** Most-recently-saved game id first. */
export function listGameIds(): string[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(GAME_IDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
