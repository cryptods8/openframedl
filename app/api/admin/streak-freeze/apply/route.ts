import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { applyStreakFreezes } from "@/app/api/streak-freeze/apply-streak-freezes";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    console.error("Admin secret not set");
    return NextResponse.json({ message: "Auth error" }, { status: 401 });
  }
  const apiKey = req.headers.get("x-framedl-api-key");
  if (apiKey !== ADMIN_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, identityProvider, burnTxHash, walletAddress, gameKeys } =
      body;

    if (!userId || !identityProvider) {
      return NextResponse.json(
        { error: "Missing required fields (userId, identityProvider)" },
        { status: 400 },
      );
    }

    const userKey = {
      userId: String(userId),
      identityProvider: identityProvider as GameIdentityProvider,
    };

    return applyStreakFreezes(userKey, { burnTxHash, walletAddress, gameKeys });
  } catch (e) {
    console.error("Admin apply freeze error", e);
    return NextResponse.json(
      { error: "Internal server error", details: String(e) },
      { status: 500 },
    );
  }
}
