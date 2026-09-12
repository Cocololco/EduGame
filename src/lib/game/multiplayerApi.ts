"use client";

import type { DifficultyLevel, Game, YearDecisionInput } from "@/types/game";

/**
 * Thin client-side wrappers around the /api/multiplayer/games routes. Every
 * call takes the caller's identity explicitly (see src/lib/identity.ts) —
 * there's no cookie/session, the server just trusts whatever userId is sent.
 */

async function parseOrThrow(res: Response): Promise<{ game: Game }> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function createMultiplayerGameApi(params: {
  totalYears: number;
  difficulty: DifficultyLevel;
  maxPlayers: number;
  numBots: number;
  userId: string;
  displayName: string;
  companyName?: string;
}): Promise<Game> {
  const res = await fetch("/api/multiplayer/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await parseOrThrow(res)).game;
}

export async function fetchMultiplayerGame(id: string): Promise<Game> {
  const res = await fetch(`/api/multiplayer/games/${id}`, { cache: "no-store" });
  return (await parseOrThrow(res)).game;
}

export async function listMyMultiplayerGames(userId: string): Promise<Game[]> {
  const res = await fetch(`/api/multiplayer/games?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "Couldn't load your games.");
  return body.games as Game[];
}

export async function joinMultiplayerGameApi(
  id: string,
  userId: string,
  displayName: string,
  companyName?: string,
): Promise<Game> {
  const res = await fetch(`/api/multiplayer/games/${id}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, displayName, companyName }),
  });
  return (await parseOrThrow(res)).game;
}

export async function startMultiplayerGameApi(id: string, userId: string): Promise<Game> {
  const res = await fetch(`/api/multiplayer/games/${id}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return (await parseOrThrow(res)).game;
}

export async function submitMultiplayerDecisionApi(
  id: string,
  userId: string,
  decision: YearDecisionInput,
): Promise<Game> {
  const res = await fetch(`/api/multiplayer/games/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, decision }),
  });
  return (await parseOrThrow(res)).game;
}
