import { NextRequest, NextResponse } from "next/server";
import { pgDb } from "@/app/db/pg/pg-db";
import {
  ArenaWithGames,
  findArenasWithGames,
} from "@/app/game/arena-pg-repository";
import { sql } from "kysely";
import * as nqRepo from "@/app/game/notification-queue-pg-repository";
import { DBNotificationQueueInsert } from "@/app/db/pg/types";
import { GroupedNotificationItem } from "@/app/game/notification-queue-pg-repository";
import { GameIdentityProvider } from "@/app/game/game-repository";
import {
  ArenaNotifFrequency,
  getArenaNotifFrequency,
} from "@/app/game/user-settings-pg-repository";
import { getFreeSlots } from "@/app/games/arena/arena-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_HOURS_BETWEEN_ARENA_NOTIFS = 2;

/** Fetch all FC users who have notifications enabled (for broadcast to open arenas) */
async function fetchBroadcastUsers() {
  return pgDb
    .selectFrom("userSettings")
    .select(["userId", "identityProvider", "data"])
    .where("identityProvider", "=", "fc")
    .where("notificationsEnabled", "=", true)
    .where("notificationDetails", "is not", null)
    .execute();
}

/** Compute the arena's end time, or null if unlimited/unknown */
function getArenaEndTime(arena: ArenaWithGames): Date | null {
  const { config, startedAt } = arena;
  if (config.duration.type !== "interval" || !config.duration.minutes) {
    return null;
  }
  const start =
    startedAt ??
    (config.start.type === "scheduled" ? new Date(config.start.date) : null);
  if (!start) return null;
  return new Date(
    new Date(start).getTime() + config.duration.minutes * 60 * 1000
  );
}

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

    // Lazy-loaded cache of all FC users with notifications enabled
    // (shared across arenas in this cron run)
    let broadcastUsersCache: Awaited<
      ReturnType<typeof fetchBroadcastUsers>
    > | null = null;
    const getBroadcastUsers = async () => {
      if (!broadcastUsersCache) {
        broadcastUsersCache = await fetchBroadcastUsers();
      }
      return broadcastUsersCache;
    };

    // Users who were sent an arena notification recently (skip to avoid spam)
    const recentlyNotified = await nqRepo.findRecentlyNotifiedUsers(
      "arena_new",
      "frame",
      MIN_HOURS_BETWEEN_ARENA_NOTIFS * 60
    );

    for (const arena of arenas) {
      const { config, members } = arena;
      const arenaEndTime = getArenaEndTime(arena);
      const allUsers = [...members, ...config.audience];

      // Deduplicate users
      const seen = new Set<string>();
      const uniqueUsers: {
        userId: string;
        identityProvider: GameIdentityProvider;
      }[] = [];
      for (const u of allUsers) {
        if (u.identityProvider !== "fc" || !u.userId) continue;
        const key = `${u.userId}:${u.identityProvider}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueUsers.push(u);
      }

      // Determine which members have completed all arena words
      const wordCount = config.words.length;
      const completedKeys = new Set<string>();
      for (const member of members) {
        const completedGames = arena.games.filter(
          (g) =>
            g.userId === member.userId &&
            g.identityProvider === member.identityProvider &&
            g.completedAt != null
        );
        if (completedGames.length >= wordCount) {
          completedKeys.add(`${member.userId}:${member.identityProvider}`);
        }
      }

      const freeSlots = getFreeSlots(arena);

      const asapItems: DBNotificationQueueInsert[] = [];
      const groupedItems: GroupedNotificationItem[] = [];

      const enqueueUser = (
        userId: string,
        identityProvider: GameIdentityProvider,
        frequency: ArenaNotifFrequency
      ) => {
        const userKey = `${userId}:${identityProvider}`;
        if (recentlyNotified.has(userKey)) return;

        let scheduledAt = now;
        let groupKey: string | null = null;

        if (frequency === "daily" || frequency === "weekly") {
          const scheduled = getNextScheduledTime(
            frequency,
            userId,
            identityProvider
          );
          scheduledAt = scheduled.scheduledAt;
          groupKey = scheduled.groupKey;

          // Skip if arena will have ended by the scheduled notification time
          if (arenaEndTime && arenaEndTime <= scheduledAt) return;
        }

        const common = {
          userId,
          identityProvider,
          type: "arena_new" as const,
          channel: "frame" as const,
          scheduledAt,
        };

        if (frequency === "asap") {
          asapItems.push({
            ...common,
            payload: JSON.stringify({ arenaId: arena.id }),
            refId: `arena-${arena.id}`,
            groupKey: null,
          });
        } else {
          groupedItems.push({
            ...common,
            payload: JSON.stringify({ arenaIds: [arena.id] }),
            refId: groupKey!,
            groupKey,
            arenaId: arena.id,
          });
        }
      };

      // Process explicit users (members + audience)
      const eligibleUsers = uniqueUsers.filter(
        (u) => !completedKeys.has(`${u.userId}:${u.identityProvider}`)
      );

      // Bulk-fetch settings for all eligible users (all are fc identity)
      const userSettingsRows =
        eligibleUsers.length > 0
          ? await pgDb
              .selectFrom("userSettings")
              .select([
                "userId",
                "identityProvider",
                "notificationDetails",
                "notificationsEnabled",
                "data",
              ])
              .where("identityProvider", "=", "fc")
              .where(
                "userId",
                "in",
                eligibleUsers.map((u) => u.userId)
              )
              .execute()
          : [];

      const settingsMap = new Map(
        userSettingsRows.map((s) => [
          `${s.userId}:${s.identityProvider}`,
          s,
        ])
      );

      for (const user of eligibleUsers) {
        const settings = settingsMap.get(
          `${user.userId}:${user.identityProvider}`
        );
        if (!settings?.notificationsEnabled || !settings?.notificationDetails) {
          continue;
        }

        const frequency = getArenaNotifFrequency(settings.data);
        if (frequency === "never") continue;

        enqueueUser(user.userId, user.identityProvider, frequency);
      }

      // If arena has free slots, broadcast to eligible users (capped)
      const MAX_BROADCAST_USERS = 1000;
      if (freeSlots > 0) {
        const broadcastUsers = await getBroadcastUsers();
        let broadcastCount = 0;
        for (const settings of broadcastUsers) {
          if (broadcastCount >= MAX_BROADCAST_USERS) break;

          const key = `${settings.userId}:${settings.identityProvider}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const frequency = getArenaNotifFrequency(settings.data);
          if (frequency === "never") continue;

          enqueueUser(
            settings.userId,
            settings.identityProvider as GameIdentityProvider,
            frequency
          );
          broadcastCount++;
        }
      }

      // Enqueue asap items (one row per arena per user)
      if (asapItems.length > 0) {
        for (let i = 0; i < asapItems.length; i += 500) {
          await nqRepo.enqueue(asapItems.slice(i, i + 500));
        }
      }

      // Enqueue grouped items via upsert (one row per user per time window,
      // appends arenaId to payload.arenaIds)
      if (groupedItems.length > 0) {
        for (let i = 0; i < groupedItems.length; i += 500) {
          await nqRepo.enqueueGrouped(groupedItems.slice(i, i + 500));
        }
      }

      totalEnqueued += asapItems.length + groupedItems.length;

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
