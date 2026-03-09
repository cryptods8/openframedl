import { pgDb } from "@/app/db/pg/pg-db";
import { sql } from "kysely";
import {
  DBNotificationQueueInsert,
  DBNotificationQueue,
  NotificationChannel,
  NotificationType,
} from "@/app/db/pg/types";

export async function enqueue(
  items: DBNotificationQueueInsert[]
): Promise<void> {
  if (items.length === 0) return;

  await pgDb
    .insertInto("notificationQueue")
    .values(items)
    .onConflict((oc) => oc.doNothing())
    .execute();
}

export async function claimBatch(
  limit: number,
  lockId: string
): Promise<DBNotificationQueue[]> {
  const now = new Date();

  const claimed = await pgDb
    .with("batch", (db) =>
      db
        .selectFrom("notificationQueue")
        .select("id")
        .where("status", "in", ["pending", "rate_limited"])
        .where("scheduledAt", "<=", now)
        .orderBy("scheduledAt", "asc")
        .limit(limit)
        .forUpdate()
        .skipLocked()
    )
    .updateTable("notificationQueue")
    .set({
      status: "processing",
      lockedBy: lockId,
      lockedAt: now,
    })
    .from("batch")
    .whereRef("notificationQueue.id", "=", "batch.id")
    .returningAll("notificationQueue")
    .execute();

  return claimed as DBNotificationQueue[];
}

export async function markSent(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  await pgDb
    .updateTable("notificationQueue")
    .set({
      status: "sent",
      processedAt: new Date(),
    })
    .where("id", "in", ids)
    .execute();
}

export async function markStale(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  await pgDb
    .updateTable("notificationQueue")
    .set({
      status: "stale",
      processedAt: new Date(),
    })
    .where("id", "in", ids)
    .execute();
}

export async function markFailed(id: number, error: string): Promise<void> {
  const item = await pgDb
    .selectFrom("notificationQueue")
    .select(["attempts", "maxAttempts"])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!item) return;

  const newAttempts = item.attempts + 1;

  if (newAttempts >= item.maxAttempts) {
    await pgDb
      .updateTable("notificationQueue")
      .set({
        status: "failed",
        attempts: newAttempts,
        lastError: error,
        processedAt: new Date(),
      })
      .where("id", "=", id)
      .execute();
  } else {
    const retryAt = new Date(Date.now() + 5 * 60 * 1000);
    await pgDb
      .updateTable("notificationQueue")
      .set({
        status: "pending",
        attempts: newAttempts,
        lastError: error,
        scheduledAt: retryAt,
        lockedBy: null,
        lockedAt: null,
      })
      .where("id", "=", id)
      .execute();
  }
}

export async function markRateLimited(
  ids: number[],
  retryAt: Date
): Promise<void> {
  if (ids.length === 0) return;

  await pgDb
    .updateTable("notificationQueue")
    .set({
      status: "rate_limited",
      scheduledAt: retryAt,
      lockedBy: null,
      lockedAt: null,
    })
    .where("id", "in", ids)
    .execute();
}

export async function releaseStaleLocks(minutes: number): Promise<number> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const result = await pgDb
    .updateTable("notificationQueue")
    .set({
      status: "pending",
      lockedBy: null,
      lockedAt: null,
    })
    .where("status", "=", "processing")
    .where("lockedAt", "<", cutoff)
    .executeTakeFirst();

  return Number(result.numUpdatedRows);
}

/**
 * Find users who were recently sent a notification of the given type+channel.
 * Returns a Set of "userId:identityProvider" keys.
 */
export async function findRecentlyNotifiedUsers(
  type: NotificationType,
  channel: NotificationChannel,
  withinMinutes: number
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

  const rows = await pgDb
    .selectFrom("notificationQueue")
    .select(["userId", "identityProvider"])
    .distinct()
    .where("type", "=", type)
    .where("channel", "=", channel)
    .where("status", "=", "sent")
    .where("processedAt", ">", cutoff)
    .execute();

  return new Set(rows.map((r) => `${r.userId}:${r.identityProvider}`));
}

export interface GroupedNotificationItem extends DBNotificationQueueInsert {
  arenaId: number;
}

/**
 * Enqueue grouped arena notifications. Uses an upsert: if a row with the same
 * ref_id already exists (pending/processing/rate_limited), appends the arena ID
 * to the payload's arenaIds array instead of inserting a new row.
 */
export async function enqueueGrouped(
  items: GroupedNotificationItem[]
): Promise<void> {
  if (items.length === 0) return;

  // Deduplicate by (userId, identityProvider, refId) — keep the last arenaId
  // and collect all arenaIds so we can batch per unique key
  const keyMap = new Map<
    string,
    { item: GroupedNotificationItem; arenaIds: number[] }
  >();
  for (const item of items) {
    const key = `${item.userId}:${item.identityProvider}:${item.refId}`;
    const existing = keyMap.get(key);
    if (existing) {
      if (!existing.arenaIds.includes(item.arenaId)) {
        existing.arenaIds.push(item.arenaId);
      }
    } else {
      keyMap.set(key, { item, arenaIds: [item.arenaId] });
    }
  }

  for (const { item, arenaIds } of keyMap.values()) {
    const arenaIdsJson = JSON.stringify(arenaIds);
    await sql`
      INSERT INTO notification_queue (
        user_id, identity_provider, type, channel,
        scheduled_at, payload, ref_id, group_key
      ) VALUES (
        ${item.userId}, ${item.identityProvider}, ${item.type}, ${item.channel},
        ${item.scheduledAt}, jsonb_build_object('arenaIds', ${arenaIdsJson}::jsonb),
        ${item.refId}, ${item.groupKey}
      )
      ON CONFLICT (user_id, identity_provider, type, channel, ref_id)
        WHERE status IN ('pending', 'processing', 'rate_limited')
      DO UPDATE SET payload = jsonb_set(
        notification_queue.payload,
        '{arenaIds}',
        (
          SELECT jsonb_agg(DISTINCT val)
          FROM jsonb_array_elements(
            notification_queue.payload->'arenaIds' || ${arenaIdsJson}::jsonb
          ) AS val
        )
      )
    `.execute(pgDb);
  }
}

export async function cleanupOld(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await pgDb
    .deleteFrom("notificationQueue")
    .where("status", "in", ["sent", "stale", "failed"])
    .where("processedAt", "<", cutoff)
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}
