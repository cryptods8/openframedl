import { NextRequest, NextResponse } from "next/server";
import { loadLeaderboard } from "../../../game/game-pg-repository";
import { GameIdentityProvider } from "../../../game/game-repository";
import { getDailyGameKey } from "../../../game/game-utils";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function GET(req: NextRequest) {
  if (!ADMIN_SECRET) {
    console.error("Admin secret not set");
    return NextResponse.json({ message: "Auth error" }, { status: 401 });
  }
  try {
    const apiKey = req.headers.get("x-framedl-api-key");
    if (apiKey !== ADMIN_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ip = req.nextUrl.searchParams.get("ip") || "fc";
    const date =
      req.nextUrl.searchParams.get("date") || getDailyGameKey(new Date());
    const daysStr = req.nextUrl.searchParams.get("days");

    const data = await loadLeaderboard(
      ip as GameIdentityProvider,
      date,
      daysStr ? parseInt(daysStr, 10) : undefined
    );
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error occured" }, { status: 500 });
  }
}
