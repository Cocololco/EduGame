import { NextResponse } from "next/server";
import { readMultiplayerGame } from "@/lib/server/gameStore";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const game = readMultiplayerGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  return NextResponse.json({ game });
}
