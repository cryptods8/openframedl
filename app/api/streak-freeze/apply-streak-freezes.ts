import { NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { verifyBurnTx } from "@/app/lib/streak-freeze-contract";

export async function applyStreakFreezes(
  userKey: { userId: string; identityProvider: GameIdentityProvider },
  body: {
    burnTxHash?: string;
    walletAddress?: string;
    gameKeys?: string[];
  },
) {
  const { burnTxHash, walletAddress } = body;
  if (!walletAddress) {
    return NextResponse.json(
      { error: "No wallet found for user" },
      { status: 400 },
    );
  }

  const gameKeys: string[] = body.gameKeys ?? [];

  if (gameKeys.length === 0 || !burnTxHash) {
    return NextResponse.json(
      { error: "Missing required fields (gameKeys, burnTxHash)" },
      { status: 400 },
    );
  }

  const burnResult = await verifyBurnTx(burnTxHash, walletAddress);
  if (!burnResult.valid) {
    return NextResponse.json(
      { error: "Invalid burn transaction" },
      { status: 400 },
    );
  }

  // Find which gameKeys from this burn tx are already applied (idempotent retry)
  const alreadyApplied = await streakFreezeRepo.findAppliedByBurnTx(
    userKey,
    burnTxHash,
  );
  const alreadyAppliedKeys = new Set(
    alreadyApplied.map((a) => a.appliedToGameKey),
  );
  const remainingKeys = gameKeys.filter((k) => !alreadyAppliedKeys.has(k));

  // If all keys already applied, return success (full idempotent retry)
  if (remainingKeys.length === 0) {
    return NextResponse.json({
      success: true,
      freezes: alreadyApplied,
      retried: true,
    });
  }

  // Verify burned enough tokens for remaining + already used across all users
  const usedCount = await streakFreezeRepo.countFreezesByBurnTx(burnTxHash);
  if (BigInt(usedCount + remainingKeys.length) > burnResult.amount) {
    return NextResponse.json(
      {
        error: `Burn tx (burned ${burnResult.amount} tokens) has already been used for ${usedCount} freezes. Cannot apply ${remainingKeys.length} more.`,
      },
      { status: 400 },
    );
  }

  // Validate each remaining gameKey and collect the ones that need applying
  const LIMIT = 7;
  const keysToApply: string[] = [];
  for (const gameKey of remainingKeys) {
    const existing = await streakFreezeRepo.findByGameKey(userKey, gameKey);
    if (existing) {
      // Already applied via a different burn tx — skip rather than error
      continue;
    }

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

    keysToApply.push(gameKey);
  }

  if (keysToApply.length === 0) {
    return NextResponse.json({
      success: true,
      freezes: alreadyApplied,
      retried: true,
    });
  }

  // Apply all remaining freezes in a single DB transaction
  const results = await streakFreezeRepo.applyFreezesBatch(
    userKey,
    keysToApply,
    burnTxHash,
  );

  return NextResponse.json({ success: true, freezes: results });
}
