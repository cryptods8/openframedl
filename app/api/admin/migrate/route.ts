import { NextRequest, NextResponse } from "next/server";
import { gameService } from "../../../game/game-service";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    console.error("Admin secret not set");
    return NextResponse.json({ message: "Auth error" }, { status: 401 });
  }
  try {
    const apiKey = req.headers.get("x-framedl-api-key");
    if (apiKey !== ADMIN_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await gameService.migrateToPg();
    return NextResponse.json({ count: data.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error occured" }, { status: 500 });
  }
}
