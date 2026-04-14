import { NextRequest, NextResponse } from "next/server";
import { getFarcasterSession } from "@/app/lib/auth";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { isBadgeAccessUser } from "@/app/lib/badge-access";

export const dynamic = "force-dynamic";

/**
 * POST /api/badges/mark-seen
 * Body: { badgeIds: string[] }
 * Marks the given badges as seen for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isBadgeAccessUser(session.user.fid, "fc")) {
      return NextResponse.json({ ok: true });
    }

    const { badgeIds } = await req.json();
    if (!Array.isArray(badgeIds) || badgeIds.length === 0) {
      return NextResponse.json({ error: "Missing badgeIds" }, { status: 400 });
    }

    const userKey = {
      userId: session.user.fid,
      identityProvider: "fc" as GameIdentityProvider,
    };

    await badgeRepo.markSeen(userKey, badgeIds);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error marking badges seen", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
