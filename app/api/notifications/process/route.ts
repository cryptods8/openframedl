import { NextRequest, NextResponse } from "next/server";
import * as nqRepo from "@/app/game/notification-queue-pg-repository";
import { notificationTypeRegistry } from "@/app/notifications/notification-types";
import { sendFrameNotifications } from "@/app/utils/send-frame-notifications";
import {
  sendDirectCast,
  DirectCast,
} from "@/app/api/bot/reminders/send-direct-cast";
import { pgDb } from "@/app/db/pg/pg-db";
import { DBNotificationQueue } from "@/app/db/pg/types";
import { externalBaseUrl } from "@/app/constants";
import { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 50;
const MAX_DURATION_MS = 250_000;
const STALE_LOCK_MINUTES = 10;

export async function GET(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const lockId = uuidv4();
  const summary = { sent: 0, stale: 0, failed: 0, rateLimited: 0, batches: 0 };

  try {
    const releasedLocks = await nqRepo.releaseStaleLocks(STALE_LOCK_MINUTES);
    if (releasedLocks > 0) {
      console.log(`Released ${releasedLocks} stale locks`);
    }

    while (Date.now() - startTime < MAX_DURATION_MS) {
      const batch = await nqRepo.claimBatch(BATCH_SIZE, lockId);
      if (batch.length === 0) break;

      summary.batches++;

      const frameItems: DBNotificationQueue[] = [];
      const dcItems: DBNotificationQueue[] = [];

      for (const item of batch) {
        if (item.channel === "frame") {
          frameItems.push(item);
        } else {
          dcItems.push(item);
        }
      }

      if (frameItems.length > 0) {
        await processFrameItems(frameItems, summary);
      }

      if (dcItems.length > 0) {
        await processDirectCastItems(dcItems, summary);
      }
    }

    // Cleanup old terminal rows (older than 7 days)
    await nqRepo.cleanupOld(7);

    console.log("Notification processing complete", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("Notification processor error", e);
    return NextResponse.json(
      { ok: false, error: (e as any)?.message, summary },
      { status: 500 }
    );
  }
}

async function processFrameItems(
  items: DBNotificationQueue[],
  summary: { sent: number; stale: number; failed: number; rateLimited: number }
) {
  // Run stale checks and look up notification details
  const staleIds: number[] = [];
  const validItems: {
    item: DBNotificationQueue;
    notificationDetails: MiniAppNotificationDetails;
  }[] = [];

  for (const item of items) {
    const config = notificationTypeRegistry[item.type];

    if (await config.isStale(item)) {
      staleIds.push(item.id);
      continue;
    }

    // Look up user's notification details
    const settings = await pgDb
      .selectFrom("userSettings")
      .select(["notificationDetails", "notificationsEnabled"])
      .where("userId", "=", item.userId)
      .where("identityProvider", "=", item.identityProvider)
      .executeTakeFirst();

    if (
      !settings ||
      !settings.notificationsEnabled ||
      !settings.notificationDetails
    ) {
      staleIds.push(item.id);
      continue;
    }

    validItems.push({
      item,
      notificationDetails: settings.notificationDetails as MiniAppNotificationDetails,
    });
  }

  if (staleIds.length > 0) {
    await nqRepo.markStale(staleIds);
    summary.stale += staleIds.length;
  }

  // Group valid items by type + payload variant for bulk sending
  const groups = new Map<
    string,
    {
      items: DBNotificationQueue[];
      recipients: {
        fid: number;
        notificationDetails: MiniAppNotificationDetails;
      }[];
    }
  >();

  for (const { item, notificationDetails } of validItems) {
    const payload = item.payload as Record<string, any>;
    const groupKey = `${item.type}:${payload.variant ?? "default"}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = { items: [], recipients: [] };
      groups.set(groupKey, group);
    }

    group.items.push(item);
    group.recipients.push({
      fid: parseInt(item.userId, 10),
      notificationDetails,
    });
  }

  // Send each group
  for (const [, group] of groups) {
    const config = notificationTypeRegistry[group.items[0]!.type];
    const { title, body } = config.buildMessage(group.items);

    // Send in sub-batches of 100 (Farcaster API limit)
    for (let i = 0; i < group.recipients.length; i += 100) {
      const recipientSlice = group.recipients.slice(i, i + 100);
      const itemSlice = group.items.slice(i, i + 100);
      const ids = itemSlice.map((it) => it.id);

      try {
        const results = await sendFrameNotifications({
          recipients: recipientSlice,
          title,
          body,
        });

        const hasRateLimit = results.some((r) => r.state === "rate_limit");
        const hasError = results.some((r) => r.state === "error");

        if (hasRateLimit) {
          const retryAt = new Date(Date.now() + 10 * 60 * 1000);
          await nqRepo.markRateLimited(ids, retryAt);
          summary.rateLimited += ids.length;
        } else if (hasError) {
          for (const id of ids) {
            await nqRepo.markFailed(
              id,
              "Frame notification send error"
            );
          }
          summary.failed += ids.length;
        } else {
          await nqRepo.markSent(ids);
          summary.sent += ids.length;
        }
      } catch (e) {
        for (const id of ids) {
          await nqRepo.markFailed(id, (e as any)?.message ?? "Unknown error");
        }
        summary.failed += ids.length;
      }
    }
  }
}

async function processDirectCastItems(
  items: DBNotificationQueue[],
  summary: { sent: number; stale: number; failed: number; rateLimited: number }
) {
  for (const item of items) {
    const config = notificationTypeRegistry[item.type];

    if (await config.isStale(item)) {
      await nqRepo.markStale([item.id]);
      summary.stale++;
      continue;
    }

    const { title, body } = config.buildMessage([item]);

    try {
      const cast: DirectCast = {
        recipientFid: parseInt(item.userId, 10),
        message: `${title}\n\n${body}\n\n${externalBaseUrl}/app/v2`,
        idempotencyKey: `nq-${item.id}`,
      };
      await sendDirectCast(cast);
      await nqRepo.markSent([item.id]);
      summary.sent++;
    } catch (e) {
      await nqRepo.markFailed(item.id, (e as any)?.message ?? "Unknown error");
      summary.failed++;
    }
  }
}
