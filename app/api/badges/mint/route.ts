import { NextRequest, NextResponse } from "next/server";
import { getFarcasterSession } from "@/app/lib/auth";
import { signBadgeMint, verifyBadgeMintTx } from "@/app/lib/badge-nft-contract";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { gameService } from "@/app/game/game-service";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { BadgeCategory, getTier, TIER_MINT_PRICES } from "@/app/lib/badges";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set<string>([
  "wins",
  "streaks",
  "fourdle",
  "wordone",
  "losses",
]);

/**
 * GET /api/badges/mint?category=<cat>&milestone=<n>&walletAddress=<0x...>
 * Materializes the badge if needed, then returns the signature for minting.
 * Only works for badges the user has actually earned.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = new URL(req.url).searchParams;
    const category = params.get("category");
    const milestoneStr = params.get("milestone");
    const walletAddress = params.get("walletAddress");

    if (!category || !VALID_CATEGORIES.has(category) || !milestoneStr || !walletAddress) {
      return NextResponse.json(
        { error: "Missing or invalid category, milestone, or walletAddress" },
        { status: 400 },
      );
    }

    const milestone = parseInt(milestoneStr, 10);
    if (isNaN(milestone) || milestone < 1) {
      return NextResponse.json({ error: "Invalid milestone" }, { status: 400 });
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";
    const userKey = { userId, identityProvider };

    // Verify the user has actually earned this milestone
    const stats = await gameService.loadStats(userKey);
    if (!stats) {
      return NextResponse.json({ error: "No stats found" }, { status: 400 });
    }

    const categoryValues: Record<BadgeCategory, number> = {
      wins: stats.totalWins,
      streaks: stats.maxStreak,
      fourdle: stats.winGuessCounts[4] ?? 0,
      wordone: stats.winGuessCounts[1] ?? 0,
      losses: stats.totalLosses,
    };

    const currentValue = categoryValues[category as BadgeCategory];
    if (currentValue < milestone) {
      return NextResponse.json({ error: "Badge not yet earned" }, { status: 403 });
    }

    // Materialize (insert if not exists)
    const tier = getTier(category as BadgeCategory, milestone);
    const username = session.user.userData?.username ?? session.user.name ?? null;

    let badge = await badgeRepo.insertIfNotExists({
      userId,
      identityProvider,
      category,
      milestone,
      tier,
      username,
    });

    // insertIfNotExists returns undefined on conflict — fetch existing
    if (!badge) {
      const existing = await badgeRepo.findByUserKey(userKey);
      badge = existing.find(
        (b) => b.category === category && b.milestone === milestone,
      );
    }

    if (!badge) {
      return NextResponse.json({ error: "Failed to materialize badge" }, { status: 500 });
    }

    if (badge.minted) {
      return NextResponse.json(
        { error: "Badge already minted" },
        { status: 409 },
      );
    }

    const mintPrice = TIER_MINT_PRICES[tier];
    const { nonce, signature, price } = await signBadgeMint(walletAddress, badge.id, mintPrice);

    return NextResponse.json({ badgeId: badge.id, nonce, signature, price });
  } catch (e) {
    console.error("Error signing badge mint", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/badges/mint
 * Called after user successfully submits mintBadge tx on-chain.
 * Verifies the tx and marks the badge as minted.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { badgeId, mintTxHash, walletAddress } = await req.json();

    if (!badgeId || !mintTxHash) {
      return NextResponse.json(
        { error: "Missing badgeId or mintTxHash" },
        { status: 400 },
      );
    }

    const userId = session.user.fid;
    const identityProvider: GameIdentityProvider = "fc";

    // Verify badge ownership
    const badge = await badgeRepo.findById(badgeId);
    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }
    if (badge.userId !== userId || badge.identityProvider !== identityProvider) {
      return NextResponse.json({ error: "Not your badge" }, { status: 403 });
    }
    if (badge.minted) {
      return NextResponse.json(
        { error: "Badge already minted" },
        { status: 409 },
      );
    }

    // Verify the on-chain tx
    const verification = await verifyBadgeMintTx(
      mintTxHash,
      walletAddress,
      badgeId,
    );
    if (!verification.valid) {
      return NextResponse.json(
        { error: "Could not verify mint transaction" },
        { status: 400 },
      );
    }

    // Record mint in DB
    await badgeRepo.updateMintInfo(badgeId, {
      mintTxHash,
      tokenId: verification.tokenId ?? "",
    });

    return NextResponse.json({
      success: true,
      tokenId: verification.tokenId,
    });
  } catch (e) {
    console.error("Error confirming badge mint", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
