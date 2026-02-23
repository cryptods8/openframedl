import { NextRequest, NextResponse } from "next/server";
import * as streakFreezeRepo from "@/app/game/streak-freeze-pg-repository";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const FREEZE_EARN_INTERVAL = 100;

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
    const wins = await streakFreezeRepo.findUsersWithActiveStreaks();

    // Group by user
    const byUser = new Map<
      string,
      streakFreezeRepo.ActiveStreakWin[]
    >();
    for (const win of wins) {
      const key = `${win.identityProvider}:${win.userId}`;
      if (!byUser.has(key)) {
        byUser.set(key, []);
      }
      byUser.get(key)!.push(win);
    }

    let created = 0;
    let skipped = 0;
    const details: Array<{
      userId: string;
      identityProvider: string;
      gameKey: string;
      winIndex: number;
      action: "created" | "skipped";
    }> = [];

    for (const [, userWins] of byUser) {
      // Find milestone positions (every FREEZE_EARN_INTERVAL wins)
      for (const win of userWins) {
        if (
          win.winIndexInStreak > 0 &&
          win.winIndexInStreak % FREEZE_EARN_INTERVAL === 0
        ) {
          const userKey = {
            userId: win.userId,
            identityProvider: win.identityProvider as any,
          };

          const exists = await streakFreezeRepo.hasEarnedForGameKey(
            userKey,
            win.gameKey,
          );

          if (exists) {
            skipped++;
            details.push({
              userId: win.userId,
              identityProvider: win.identityProvider,
              gameKey: win.gameKey,
              winIndex: win.winIndexInStreak,
              action: "skipped",
            });
          } else {
            await streakFreezeRepo.insertEarned(
              userKey,
              win.winIndexInStreak,
              win.gameKey,
            );
            created++;
            details.push({
              userId: win.userId,
              identityProvider: win.identityProvider,
              gameKey: win.gameKey,
              winIndex: win.winIndexInStreak,
              action: "created",
            });
          }
        }
      }
    }

    return NextResponse.json({
      usersProcessed: byUser.size,
      created,
      skipped,
      details,
    });
  } catch (e) {
    console.error("Backfill error", e);
    return NextResponse.json(
      { message: "Internal error", error: String(e) },
      { status: 500 },
    );
  }
}
