import { NextRequest, NextResponse } from "next/server";
import { MultiplayerGameError, startMultiplayerGame } from "@/lib/game/multiplayerEngine";
import { readMultiplayerGame, writeMultiplayerGame } from "@/lib/server/gameStore";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { userId?: string };

  const game = readMultiplayerGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  if (!body.userId || !game.players.some((p) => p.userId === body.userId)) {
    return NextResponse.json({ error: "Only a player already in this game can start it." }, { status: 403 });
  }

  try {
    const updated = startMultiplayerGame(game);
    writeMultiplayerGame(updated);
    return NextResponse.json({ game: updated });
  } catch (err) {
    const message = err instanceof MultiplayerGameError ? err.message : "Couldn't start this game.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
