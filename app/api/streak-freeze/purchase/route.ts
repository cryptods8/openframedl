import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";
import { getAddressesForFid } from "@/app/lib/hub";
import { verifyPurchaseTx } from "@/app/lib/streak-freeze-contract";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { txHash } = await req.json();

    if (!txHash) {
      return NextResponse.json(
        { error: "Missing txHash" },
        { status: 400 }
      );
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    // Resolve wallet
    const addresses = await getAddressesForFid(parseInt(userId, 10));
    const wallet = addresses?.[0]?.address;
    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 400 }
      );
    }

    // Verify purchase tx on-chain
    const isValid = await verifyPurchaseTx(txHash, wallet);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid purchase transaction" },
        { status: 400 }
      );
    }

    // Log to mint table
    const result = await streakFreezeRepo.insertPurchased(
      userKey,
      txHash,
      txHash
    );

    return NextResponse.json({ success: true, mint: result });
  } catch (e) {
    console.error("Error logging purchase", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
