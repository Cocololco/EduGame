import { NextRequest, NextResponse } from "next/server";
import type { DifficultyLevel } from "@/types/game";
import { createMultiplayerGame } from "@/lib/game/multiplayerEngine";
import { listMultiplayerGamesForUser, writeMultiplayerGame } from "@/lib/server/gameStore";

export const runtime = "nodejs";

interface CreateBody {
  totalYears: number;
  difficulty: DifficultyLevel;
  maxPlayers: number;
  numBots: number;
  userId: string;
  displayName: string;
  companyName?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<CreateBody>;
  if (!body.userId || !body.displayName) {
    return NextResponse.json({ error: "userId and displayName are required." }, { status: 400 });
  }

  const game = createMultiplayerGame({
    totalYears: Math.max(1, Math.min(50, Number(body.totalYears) || 5)),
    difficulty: body.difficulty ?? "standard",
    maxPlayers: Number(body.maxPlayers) || 4,
    numBots: Number(body.numBots) || 0,
    hostUserId: body.userId,
    hostDisplayName: body.displayName,
    hostCompanyName: body.companyName,
  });

  writeMultiplayerGame(game);
  return NextResponse.json({ game });
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId query param is required." }, { status: 400 });
  }
  const games = listMultiplayerGamesForUser(userId);
  return NextResponse.json({ games });
}
