import { NextRequest, NextResponse } from "next/server";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { countInProgressArenas } from "@/app/game/arena-pg-repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const jwt = req.headers.get("Authorization")?.split(" ")[1];
    const { userKey, anonymous } = await getUserInfoFromJwtOrSession(jwt);

    if (anonymous || !userKey) {
      return NextResponse.json({ count: 0 });
    }

    const count = await countInProgressArenas(userKey);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching in-progress arena count:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
