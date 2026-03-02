import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "@/app/db/pg/pg-db";
import { addDaysToDate, getDailyGameKey } from "@/app/game/game-utils";
import { getWordForUserGameKey } from "@/app/game/game-service";
import * as nqRepo from "@/app/game/notification-queue-pg-repository";
import { DBNotificationQueueInsert } from "@/app/db/pg/types";
import { GameIdentityProvider } from "@/app/game/game-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_HOURS_BETWEEN_DC_REMINDERS = 6;

async function getYesterdaysWord(ip: GameIdentityProvider) {
  const yesterday = addDaysToDate(new Date(), -1);
  const gameKey = getDailyGameKey(yesterday);
  const { word } = await getWordForUserGameKey({
    gameKey,
    userId: "unimportant",
    identityProvider: ip,
    isDaily: true,
  });
  return word;
}

export async function GET(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const variant = req.nextUrl.searchParams.get("variant") ?? "new";

  try {
    const gameKey = getDailyGameKey(new Date());
    const yesterdayWord = await getYesterdaysWord("fc");

    // Query users with notifications enabled who haven't completed today's game
    const usersToNotify = await pgDb
      .selectFrom("userSettings as r")
      .select([
        "r.userId",
        "r.identityProvider",
        "r.notificationDetails",
        "r.notificationsEnabled",
      ])
      .where("r.identityProvider", "=", "fc")
      .where("r.notificationsEnabled", "=", true)
      .where((wb) =>
        wb.not(
          wb.exists(
            wb
              .selectFrom("game as g")
              .where("g.isDaily", "=", true)
              .where("g.gameKey", "=", gameKey)
              .where((eb) =>
                eb.or([
                  eb("g.status", "=", "WON"),
                  eb("g.status", "=", "LOST"),
                ])
              )
              .whereRef("g.userId", "=", "r.userId")
              .whereRef("g.identityProvider", "=", "r.identityProvider")
          )
        )
      )
      .execute();

    // Also query users with DC reminders enabled
    const now = new Date();
    const startOfUTCDay = new Date(now);
    startOfUTCDay.setUTCHours(0, 0, 0, 0);
    const prevMaxSentAt = new Date(
      now.getTime() - 1000 * 60 * 60 * MIN_HOURS_BETWEEN_DC_REMINDERS
    );
    const maxSentAt =
      startOfUTCDay > prevMaxSentAt ? startOfUTCDay : prevMaxSentAt;

    const dcUsers = await pgDb
      .selectFrom("reminder as r")
      .select(["r.userId", "r.identityProvider"])
      .where("r.enabledAt", "is not", null)
      .where("r.identityProvider", "=", "fc")
      .where((eb) =>
        eb.or([
          eb("r.lastSentAt", "<", maxSentAt),
          eb("r.lastSentAt", "is", null),
        ])
      )
      .where((wb) =>
        wb.not(
          wb.exists(
            wb
              .selectFrom("game as g")
              .where("g.isDaily", "=", true)
              .where("g.gameKey", "=", gameKey)
              .where((eb) =>
                eb.or([
                  eb("g.status", "=", "WON"),
                  eb("g.status", "=", "LOST"),
                ])
              )
              .whereRef("g.userId", "=", "r.userId")
              .whereRef("g.identityProvider", "=", "r.identityProvider")
          )
        )
      )
      .execute();

    const refId = `${gameKey}-${variant}`;
    const payload = { variant, gameKey, yesterdayWord };

    const items: DBNotificationQueueInsert[] = [];

    // Frame notification rows for users with notificationDetails
    for (const user of usersToNotify) {
      if (user.notificationDetails) {
        items.push({
          userId: user.userId,
          identityProvider: user.identityProvider,
          type: "daily_reminder",
          channel: "frame",
          scheduledAt: now,
          payload: JSON.stringify(payload),
          refId,
        });
      }
    }

    // DC rows for users with DC reminders enabled
    for (const user of dcUsers) {
      items.push({
        userId: user.userId,
        identityProvider: user.identityProvider,
        type: "daily_reminder",
        channel: "direct_cast",
        scheduledAt: now,
        payload: JSON.stringify(payload),
        refId,
      });
    }

    if (items.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < items.length; i += 500) {
        await nqRepo.enqueue(items.slice(i, i + 500));
      }
    }

    console.log(
      `Enqueued daily reminders: ${items.length} items (variant=${variant})`
    );
    return NextResponse.json({
      ok: true,
      enqueued: items.length,
      variant,
    });
  } catch (e) {
    console.error("Daily reminder enqueue error", e);
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
