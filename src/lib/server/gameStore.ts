import fs from "node:fs";
import path from "node:path";
import type { Game } from "@/types/game";

/**
 * Server-only, file-based persistence for multiplayer games — one JSON
 * file per game, so two different browsers/devices can share state (unlike
 * solo games, which stay in localStorage; see docs/DEPLOYMENT.md and
 * docs/GAME_DESIGN.md for why this exists and its limits).
 *
 * Deliberately NOT a database: this is a personal project with a handful of
 * concurrent games, so a directory of JSON files is simpler to run and
 * reason about than standing up Postgres/SQLite. Writes use synchronous fs
 * calls specifically so concurrent requests can't interleave a read-modify-
 * write and corrupt a file — correctness over throughput, appropriate at
 * this scale. Must only be imported from server code (API route handlers),
 * never from a "use client" component.
 *
 * Data directory: $EDUGAME_DATA_DIR, defaulting to ./data — on the deployed
 * VPS this is a mounted Docker volume so games survive redeploys (see
 * docs/DEPLOYMENT.md). Locally it's a gitignored folder in the repo.
 */

const DATA_DIR = process.env.EDUGAME_DATA_DIR || path.join(process.cwd(), "data");
const GAMES_DIR = path.join(DATA_DIR, "multiplayer-games");

function ensureDir(): void {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

function filePathFor(id: string): string {
  // Games are created with generateId("mp"), which never produces path
  // separators, but guard against a malicious/malformed id anyway before
  // it touches the filesystem.
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid game id: ${id}`);
  }
  return path.join(GAMES_DIR, `${id}.json`);
}

export function readMultiplayerGame(id: string): Game | null {
  ensureDir();
  const file = filePathFor(id);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Game;
  } catch {
    return null;
  }
}

export function writeMultiplayerGame(game: Game): void {
  ensureDir();
  fs.writeFileSync(filePathFor(game.config.id), JSON.stringify(game), "utf-8");
}

/** Lists every multiplayer game a given userId is a player in (host or joined), most-recently-updated first. */
export function listMultiplayerGamesForUser(userId: string): Game[] {
  ensureDir();
  const files = fs.readdirSync(GAMES_DIR).filter((f) => f.endsWith(".json"));
  const games: Game[] = [];
  for (const file of files) {
    try {
      const game = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), "utf-8")) as Game;
      if (game.players.some((p) => p.userId === userId)) games.push(game);
    } catch {
      // Skip unreadable/corrupt files rather than failing the whole list.
    }
  }
  return games.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
