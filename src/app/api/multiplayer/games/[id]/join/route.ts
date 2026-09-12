import { NextRequest, NextResponse } from "next/server";
import { MultiplayerGameError, joinMultiplayerGame } from "@/lib/game/multiplayerEngine";
import { readMultiplayerGame, writeMultiplayerGame } from "@/lib/server/gameStore";

export const runtime = "nodejs";

interface JoinBody {
  userId: string;
  displayName: string;
  companyName?: string;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<JoinBody>;
  if (!body.userId || !body.displayName) {
    return NextResponse.json({ error: "userId and displayName are required." }, { status: 400 });
  }

  const game = readMultiplayerGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  try {
    const updated = joinMultiplayerGame(game, body.userId, body.displayName, body.companyName);
    writeMultiplayerGame(updated);
    return NextResponse.json({ game: updated });
  } catch (err) {
    const message = err instanceof MultiplayerGameError ? err.message : "Couldn't join this game.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
