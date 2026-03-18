import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "@/app/game/game-repository";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";
import {
  getStreakFreezeBalance,
  buildClaimNonce,
  signEarnedFreeze,
} from "@/app/lib/streak-freeze-contract";
import { applyStreakFreezes } from "./apply-streak-freezes";

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
    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    return applyStreakFreezes(userKey, body);
  } catch (e) {
    console.error("Error applying freeze", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

