import { NextRequest, NextResponse } from "next/server";
import type { YearDecisionInput } from "@/types/game";
import { MultiplayerGameError, submitPlayerDecision } from "@/lib/game/multiplayerEngine";
import { readMultiplayerGame, writeMultiplayerGame } from "@/lib/server/gameStore";

export const runtime = "nodejs";

interface DecisionBody {
  userId: string;
  decision: YearDecisionInput;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<DecisionBody>;
  if (!body.userId || !body.decision) {
    return NextResponse.json({ error: "userId and decision are required." }, { status: 400 });
  }

  const game = readMultiplayerGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  const player = game.players.find((p) => p.userId === body.userId);
  if (!player) {
    return NextResponse.json({ error: "You're not a player in this game." }, { status: 403 });
  }

  try {
    const updated = submitPlayerDecision(game, player.id, body.decision);
    writeMultiplayerGame(updated);
    return NextResponse.json({ game: updated });
  } catch (err) {
    const message = err instanceof MultiplayerGameError ? err.message : "Couldn't submit that decision.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
