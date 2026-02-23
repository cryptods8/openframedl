import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";
import {
  getStreakFreezeBalance,
  verifyBurnTx,
  buildClaimNonce,
  signEarnedFreeze,
} from "@/app/lib/streak-freeze-contract";

export const dynamic = "force-dynamic";

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
  const walletParam = req.nextUrl.searchParams.get("walletAddress");
  try {
    const wallet = walletParam;
    if (wallet) {
      const balance = await getStreakFreezeBalance(wallet);
      available = Number(balance);
    }
  } catch (e) {
    console.error("Error fetching on-chain balance", e);
  }

  // Unclaimed earned freezes (user needs to call claimEarned on contract)
  const unclaimed = await streakFreezeRepo.findUnclaimedByUser(userKey);
  const pendingClaims = await Promise.all(
    unclaimed.map(async (u) => {
      let nonce = u.claimNonce;
      let signature = u.claimSignature;
      let walletAddress = u.walletAddress;

      if (
        !signature &&
        walletParam &&
        u.earnedAtStreakLength &&
        u.earnedAtGameKey
      ) {
        walletAddress = walletParam;
        const generatedNonce = buildClaimNonce(
          ip,
          userId,
          u.earnedAtGameKey,
          u.earnedAtStreakLength,
        );
        const signResult = await signEarnedFreeze(
          walletAddress as `0x${string}`,
          1,
          generatedNonce,
        );
        nonce = generatedNonce;
        signature = signResult.signature;
      }

      return {
        id: u.id,
        walletAddress,
        nonce,
        signature,
        streakLength: u.earnedAtStreakLength,
        gameKey: u.earnedAtGameKey,
      };
    }),
  );

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
    const walletAddress: string | undefined = body.walletAddress;
    if (!walletAddress) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 400 },
      );
    }

    // Support batch mode (gameKeys[]) or single mode (gameKey)
    const gameKeys: string[] = body.gameKeys ?? [];

    if (gameKeys.length === 0 || !burnTxHash) {
      return NextResponse.json(
        { error: "Missing required fields (gameKeys, burnTxHash)" },
        { status: 400 },
      );
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    const burnResult = await verifyBurnTx(burnTxHash, walletAddress);
    if (!burnResult.valid) {
      return NextResponse.json(
        { error: "Invalid burn transaction" },
        { status: 400 },
      );
    }

    // Verify burned enough tokens for the batch, accounting for previous usages
    const usedCount = await streakFreezeRepo.countFreezesByBurnTx(burnTxHash);
    if (BigInt(usedCount + gameKeys.length) > burnResult.amount) {
      return NextResponse.json(
        {
          error: `Burn tx (burned ${burnResult.amount} tokens) has already been used for ${usedCount} freezes. Cannot apply ${gameKeys.length} more.`,
        },
        { status: 400 },
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
          { status: 400 },
        );
      }

      // Check consecutive limit (including previously applied + ones we're about to apply)
      const consecutive = await streakFreezeRepo.countConsecutiveUsed(
        userKey,
        gameKey,
      );
      if (consecutive >= LIMIT) {
        return NextResponse.json(
          {
            error: `Consecutive freeze limit reached (${LIMIT} days) at ${gameKey}`,
          },
          { status: 400 },
        );
      }

      const result = await streakFreezeRepo.applyFreeze(
        userKey,
        gameKey,
        burnTxHash,
      );
      results.push(result);
    }

    return NextResponse.json({ success: true, freezes: results });
  } catch (e) {
    console.error("Error applying freeze", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
