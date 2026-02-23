import { NextRequest, NextResponse } from "next/server";
import { getFarcasterSession } from "@/app/lib/auth";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { GameIdentityProvider } from "@/app/game/game-repository";

export const dynamic = "force-dynamic";

/**
 * POST /api/streak-freeze/claim
 * Called after the user successfully submits claimEarned tx on-chain.
 * Marks the mint record as claimed.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mintId, claimTxHash, walletAddress } = await req.json();

    if (!mintId || !claimTxHash) {
      return NextResponse.json(
        { error: "Missing required fields (mintId, claimTxHash)" },
        { status: 400 },
      );
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    await streakFreezeRepo.markClaimed(
      userKey,
      mintId,
      claimTxHash,
      walletAddress,
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error marking claim", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
