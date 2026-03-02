import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "@/app/db/pg/pg-db";
import { findArenasWithGames } from "@/app/game/arena-pg-repository";
import { sql } from "kysely";
import * as nqRepo from "@/app/game/notification-queue-pg-repository";
import { DBNotificationQueueInsert } from "@/app/db/pg/types";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { getArenaNotifFrequency } from "@/app/game/user-settings-pg-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_HOURS_BETWEEN_ARENA_NOTIFS = 2;

function getNextScheduledTime(
  frequency: "daily" | "weekly",
  userId: string,
  identityProvider: string
): { scheduledAt: Date; groupKey: string } {
  const now = new Date();

  if (frequency === "daily") {
    const scheduledAt = new Date(now);
    scheduledAt.setUTCHours(18, 0, 0, 0);
    if (scheduledAt <= now) {
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
    }
    const dateStr = scheduledAt.toISOString().split("T")[0];
    return {
      scheduledAt,
      groupKey: `arena-daily-${userId}-${identityProvider}-${dateStr}`,
    };
  }

  // weekly: next Sunday 18:00 UTC
  const scheduledAt = new Date(now);
  const daysUntilSunday = (7 - scheduledAt.getUTCDay()) % 7 || 7;
  scheduledAt.setUTCDate(scheduledAt.getUTCDate() + daysUntilSunday);
  scheduledAt.setUTCHours(18, 0, 0, 0);
  if (scheduledAt <= now) {
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 7);
  }
  const year = scheduledAt.getUTCFullYear();
  const week = Math.ceil(
    ((scheduledAt.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) /
      7
  );
  return {
    scheduledAt,
    groupKey: `arena-weekly-${userId}-${identityProvider}-${year}w${week}`,
  };
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

  try {
    const now = new Date();
    const maxNotifiedAt = new Date(
      now.getTime() - 1000 * 60 * 60 * MIN_HOURS_BETWEEN_ARENA_NOTIFS
    );

    const arenas = await findArenasWithGames((q) => {
      return q
        .where((db) =>
          db.or([
            db.eb("a.lastNotifiedAt", "<", maxNotifiedAt),
            db.eb("a.lastNotifiedAt", "is", null),
          ])
        )
        .where((db) =>
          db.or([
            // Newly created (within 30 min)
            db.eb(
              "a.createdAt",
              ">",
              new Date(now.getTime() - 1000 * 60 * 30)
            ),
            // Recently started
            db.between(
              sql<Date>`case when config->'start'->>'type' = 'immediate' then started_at else to_timestamp(config->'start'->>'date', 'yyyy-mm-dd') end`,
              new Date(now.getTime() - 1000 * 60 * 30),
              now
            ),
            // Ending soon (within 1 hour)
            db.between(
              sql<Date>`case when config->'start'->>'type' = 'immediate' and started_at is not null and config->'duration'->>'type' = 'interval' then started_at + (config->'duration'->>'minutes' || ' minutes')::interval when config->'start'->>'type' = 'scheduled' and config->'duration'->>'type' = 'interval' then to_timestamp(config->'start'->>'date', 'yyyy-mm-dd') + (config->'duration'->>'minutes' || ' minutes')::interval end`,
              now,
              new Date(now.getTime() + 1000 * 60 * 60)
            ),
          ])
        )
        .where("a.identityProvider", "=", "fc");
    });

    let totalEnqueued = 0;

    for (const arena of arenas) {
      const { config, members } = arena;
      const allUsers = [...members, ...config.audience];

      // Deduplicate users
      const seen = new Set<string>();
      const uniqueUsers: { userId: string; identityProvider: GameIdentityProvider }[] = [];
      for (const u of allUsers) {
        if (u.identityProvider !== "fc" || !u.userId) continue;
        const key = `${u.userId}:${u.identityProvider}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueUsers.push(u);
      }

      const items: DBNotificationQueueInsert[] = [];

      for (const user of uniqueUsers) {
        // Look up user's arena notification preference
        const settings = await pgDb
          .selectFrom("userSettings")
          .select(["notificationDetails", "notificationsEnabled", "data"])
          .where("userId", "=", user.userId)
          .where("identityProvider", "=", user.identityProvider)
          .executeTakeFirst();

        if (!settings?.notificationsEnabled || !settings?.notificationDetails) {
          continue;
        }

        const frequency = getArenaNotifFrequency(settings.data);
        if (frequency === "never") continue;

        let scheduledAt = now;
        let groupKey: string | null = null;

        if (frequency === "daily" || frequency === "weekly") {
          const scheduled = getNextScheduledTime(
            frequency,
            user.userId,
            user.identityProvider
          );
          scheduledAt = scheduled.scheduledAt;
          groupKey = scheduled.groupKey;
        }

        items.push({
          userId: user.userId,
          identityProvider: user.identityProvider as any,
          type: "arena_new",
          channel: "frame",
          scheduledAt,
          payload: JSON.stringify({ arenaId: arena.id }),
          refId: `arena-${arena.id}`,
          groupKey,
        });
      }

      if (items.length > 0) {
        for (let i = 0; i < items.length; i += 500) {
          await nqRepo.enqueue(items.slice(i, i + 500));
        }
        totalEnqueued += items.length;
      }

      // Update lastNotifiedAt on the arena
      await pgDb
        .updateTable("arena")
        .set({ lastNotifiedAt: now })
        .where("id", "=", arena.id)
        .execute();
    }

    console.log(
      `Arena enqueue: found ${arenas.length} arenas, enqueued ${totalEnqueued} items`
    );
    return NextResponse.json({
      ok: true,
      arenas: arenas.length,
      enqueued: totalEnqueued,
    });
  } catch (e) {
    console.error("Arena enqueue error", e);
    return NextResponse.json(
      { ok: false, error: (e as any)?.message },
      { status: 500 }
    );
  }
}
