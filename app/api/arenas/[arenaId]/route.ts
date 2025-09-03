import { findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { toPublicArenaWithGames } from "@/app/games/arena/arena-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ arenaId: string }> }) {
  const { arenaId } = await params;
  const numArenaId = parseInt(arenaId, 10);
  const arena = await findArenaWithGamesById(numArenaId);

  if (!arena) {
    return NextResponse.json({ error: "Arena not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toPublicArenaWithGames(arena) });
}
