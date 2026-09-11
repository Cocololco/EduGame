import type { Game } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";

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

/**
 * Structural check that saved JSON actually matches the current multi-product
 * Game shape — guards against stale data from an earlier, incompatible
 * schema version (e.g. the single-product model this app used before).
 * There's no version tag on Game; this checks the one field that changed.
 */
function isCompatibleGame(value: unknown): value is Game {
  const g = value as Game | null | undefined;
  const products = g?.players?.[0]?.companyStates?.[0]?.products;
  return !!products && PRODUCT_IDS.every((id) => id in products);
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
    const parsed: unknown = JSON.parse(raw);
    return isCompatibleGame(parsed) ? parsed : null;
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

/**
 * Loads every saved game (most-recently-saved first). Silently prunes any
 * entry that fails to parse or no longer matches the current schema (e.g.
 * left over from before the multi-product model) — those are unusable, so
 * there's no point letting them clutter "My games".
 */
export function listGames(): Game[] {
  const ids = listGameIds();
  const games: Game[] = [];
  const staleIds: string[] = [];

  for (const id of ids) {
    const game = loadGame(id);
    if (game) games.push(game);
    else staleIds.push(id);
  }

  if (staleIds.length > 0) {
    for (const id of staleIds) deleteGame(id);
  }

  return games;
}

export function deleteGame(id: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(GAME_PREFIX + id);
  window.localStorage.setItem(GAME_IDS_KEY, JSON.stringify(listGameIds().filter((gid) => gid !== id)));
}
