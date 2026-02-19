import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";
import { getAddressesForFid } from "@/app/lib/hub";
import {
  getStreakFreezeBalance,
  verifyBurnTx,
} from "@/app/lib/streak-freeze-contract";

export const dynamic = "force-dynamic";

async function resolveWallet(fid: string): Promise<string | null> {
  const addresses = await getAddressesForFid(parseInt(fid, 10));
  return addresses?.[0]?.address ?? null;
}

export async function GET(req: NextRequest) {
  const session = await getFarcasterSession();
  if (!session?.user?.fid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.fid;
  const ip: GameIdentityProvider = "fc";

  const userKey = { userId, identityProvider: ip };
  const applied = await streakFreezeRepo.findAppliedByUser(userKey);

  let available = 0;
  try {
    const wallet = await resolveWallet(userId);
    if (wallet) {
      const balance = await getStreakFreezeBalance(wallet);
      available = Number(balance);
    }
  } catch (e) {
    console.error("Error fetching on-chain balance", e);
  }

  // Unclaimed earned freezes (user needs to call claimEarned on contract)
  const unclaimed = await streakFreezeRepo.findUnclaimedByUser(userKey);
  const pendingClaims = unclaimed.map((u) => ({
    id: u.id,
    walletAddress: u.walletAddress,
    nonce: u.claimNonce,
    signature: u.claimSignature,
    streakLength: u.earnedAtStreakLength,
    gameKey: u.earnedAtGameKey,
  }));

  // Streak gaps (days within the active streak that need protection)
  const gaps = await streakFreezeRepo.findStreakGaps(userKey);

  return NextResponse.json({
    available,
    applied,
    pendingClaims,
    gaps,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const burnTxHash: string | undefined = body.burnTxHash;

    // Support batch mode (gameKeys[]) or single mode (gameKey)
    const gameKeys: string[] = body.gameKeys ?? (body.gameKey ? [body.gameKey] : []);

    if (gameKeys.length === 0 || !burnTxHash) {
      return NextResponse.json(
        { error: "Missing required fields (gameKey/gameKeys, burnTxHash)" },
        { status: 400 }
      );
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    // Verify burn tx on-chain
    const wallet = await resolveWallet(userId);
    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 400 }
      );
    }

    const burnResult = await verifyBurnTx(burnTxHash, wallet);
    if (!burnResult.valid) {
      return NextResponse.json(
        { error: "Invalid burn transaction" },
        { status: 400 }
      );
    }

    // Verify burned enough tokens for the batch
    if (burnResult.amount < BigInt(gameKeys.length)) {
      return NextResponse.json(
        {
          error: `Burn tx only burned ${burnResult.amount} tokens, but ${gameKeys.length} required`,
        },
        { status: 400 }
      );
    }

    // Check each gameKey: no duplicates, consecutive limit
    const LIMIT = 7;
    const results = [];

    for (const gameKey of gameKeys) {
      // Check if already covered
      const existing = await streakFreezeRepo.findByGameKey(userKey, gameKey);
      if (existing) {
        return NextResponse.json(
          { error: `Freeze already applied for ${gameKey}` },
          { status: 400 }
        );
      }

      // Check consecutive limit (including previously applied + ones we're about to apply)
      const consecutive = await streakFreezeRepo.countConsecutiveUsed(
        userKey,
        gameKey
      );
      if (consecutive >= LIMIT) {
        return NextResponse.json(
          { error: `Consecutive freeze limit reached (${LIMIT} days) at ${gameKey}` },
          { status: 400 }
        );
      }

      const result = await streakFreezeRepo.applyFreeze(
        userKey,
        gameKey,
        burnTxHash
      );
      results.push(result);
    }

    return NextResponse.json({ success: true, freezes: results });
  } catch (e) {
    console.error("Error applying freeze", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
