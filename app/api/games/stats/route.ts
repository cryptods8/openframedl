import { GameIdentityProvider } from "@/app/game/game-repository";
import { gameService } from "@/app/game/game-service";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const ip = req.nextUrl.searchParams.get("ip") as
    | GameIdentityProvider
    | undefined;
  const uid = req.nextUrl.searchParams.get("uid") as string | undefined;
  if (!ip || !uid) {
    return NextResponse.json({ error: "Missing ip or uid" }, { status: 400 });
  }
  const stats = await gameService.loadStats({
    identityProvider: ip,
    userId: uid,
  });
  return NextResponse.json({ data: stats });
};
