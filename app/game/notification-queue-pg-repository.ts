import { pgDb } from "@/app/db/pg/pg-db";
import { sql } from "kysely";
import {
  DBNotificationQueueInsert,
  DBNotificationQueue,
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

export async function cleanupOld(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await pgDb
    .deleteFrom("notificationQueue")
    .where("status", "in", ["sent", "stale", "failed"])
    .where("processedAt", "<", cutoff)
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}
