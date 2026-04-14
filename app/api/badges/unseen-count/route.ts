import { NextResponse } from "next/server";
import { getFarcasterSession } from "@/app/lib/auth";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { isBadgeAccessUser } from "@/app/lib/badge-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getFarcasterSession();
    if (!session?.user?.fid) {
      return NextResponse.json({ count: 0 });
    }

    if (!isBadgeAccessUser(session.user.fid, "fc")) {
      return NextResponse.json({ count: 0 });
    }

    const userKey = {
      userId: session.user.fid,
      identityProvider: "fc" as GameIdentityProvider,
    };

    const count = await badgeRepo.countUnseen(userKey);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("Error fetching unseen badge count", e);
    return NextResponse.json({ count: 0 });
  }
}
