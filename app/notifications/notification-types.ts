import { pgDb } from "@/app/db/pg/pg-db";
import { getDailyGameKey } from "@/app/game/game-utils";
import { externalBaseUrl, isPro } from "@/app/constants";
import { DBNotificationQueue, NotificationType } from "@/app/db/pg/types";
import * as statsRepo from "@/app/game/stats-pg-repository";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { isBadgeAccessUser } from "@/app/lib/badge-access";

interface NotificationMessage {
  title: string;
  body: string;
  targetUrl?: string;
}

export interface NotificationTypeConfig {
  /** Optional async hook called before isStale. Return false to skip (mark stale). */
  prepare?: (item: DBNotificationQueue) => Promise<boolean>;
  isStale: (item: DBNotificationQueue) => Promise<boolean>;
  buildMessage: (items: DBNotificationQueue[]) => NotificationMessage;
}

const name = isPro ? "Framedl PRO" : "Framedl";

const dailyReminderConfig: NotificationTypeConfig = {
  async isStale(item) {
    const gameKey = getDailyGameKey(new Date());
    const completed = await pgDb
      .selectFrom("game")
      .select("id")
      .where("userId", "=", item.userId)
      .where("identityProvider", "=", item.identityProvider)
      .where("isDaily", "=", true)
      .where("gameKey", "=", gameKey)
      .where((eb) =>
        eb.or([eb("status", "=", "WON"), eb("status", "=", "LOST")])
      )
      .executeTakeFirst();
    return completed != null;
  },

  buildMessage(items) {
    const item = items[0]!;
    const payload = item.payload as {
      variant?: string;
      yesterdayWord?: string;
    };
    const variant = payload.variant ?? "new";
    const yesterdayWord = payload.yesterdayWord ?? "";

    const title =
      variant === "new"
        ? `New daily ${name}`
        : variant === "mid"
          ? `Have you played ${name} today?`
          : `Do not miss your daily ${name}`;

    const body =
      variant === "new"
        ? isPro
          ? "Your daily game is ready!"
          : `${yesterdayWord.toUpperCase()} stumped many! Can you crack today's word?`
        : variant === "mid"
          ? "Just here, in your notifs, reminding my own business…"
          : "You have 4 hours left to play your daily game!";

    return { title, body };
  },
};

function extractArenaIds(items: DBNotificationQueue[]): number[] {
  const ids: number[] = [];
  for (const item of items) {
    const payload = item.payload as {
      arenaId?: number;
      arenaIds?: number[];
    };
    if (payload.arenaIds) ids.push(...payload.arenaIds);
    else if (payload.arenaId) ids.push(payload.arenaId);
  }
  return [...new Set(ids)];
}

async function hasActiveArena(arenaIds: number[]): Promise<boolean> {
  if (arenaIds.length === 0) return false;

  const arenas = await pgDb
    .selectFrom("arena")
    .select(["id", "startedAt", "config", "deletedAt"])
    .where("id", "in", arenaIds)
    .execute();

  const now = new Date();
  for (const arena of arenas) {
    if (arena.deletedAt) continue;

    const config = arena.config as {
      start: { type: string };
      duration: { type: string; minutes?: number };
    };
    if (
      config.duration.type === "interval" &&
      config.duration.minutes &&
      arena.startedAt
    ) {
      const endTime = new Date(
        arena.startedAt.getTime() + config.duration.minutes * 60 * 1000
      );
      if (now > endTime) continue;
    }

    return true;
  }

  return false;
}

const arenaNewConfig: NotificationTypeConfig = {
  async isStale(item) {
    const arenaIds = extractArenaIds([item]);
    return !(await hasActiveArena(arenaIds));
  },

  buildMessage(items) {
    const arenaIds = extractArenaIds(items);

    if (arenaIds.length === 1) {
      return {
        title: `New ${name} Arena`,
        body: "New Framedl Arena to play!",
        targetUrl: `${externalBaseUrl}/app/arena/${arenaIds[0]}/join`,
      };
    }
    return {
      title: `New ${name} Arenas`,
      body: `You have ${arenaIds.length} new arenas!`,
      targetUrl: `${externalBaseUrl}/app/arena`,
    };
  },
};

const streakFreezeEarnedConfig: NotificationTypeConfig = {
  async isStale() {
    return false;
  },

  buildMessage(items) {
    const item = items[0]!;
    const payload = item.payload as { streakLength?: number };
    const streakLength = payload.streakLength ?? 0;
    return {
      title: "Streak Freeze Earned!",
      body: `You earned a Streak Freeze at ${streakLength} wins!`,
    };
  },
};

const badgeEarnedConfig: NotificationTypeConfig = {
  async prepare(item) {
    if (!isBadgeAccessUser(item.userId, item.identityProvider)) {
      return false;
    }
    const userKey = {
      userId: item.userId,
      identityProvider: item.identityProvider,
    };
    const stats = await statsRepo.loadStatsByUserKey(userKey);
    if (!stats) return false;
    const payload = item.payload as { username?: string; badges?: { category: string; milestone: number }[] };
    const newBadges = await badgeRepo.materializeBadges(userKey, stats, payload.username);
    if (newBadges.length === 0) return false;
    // Enrich in-memory payload for buildMessage
    payload.badges = newBadges.map((b) => ({
      category: b.category,
      milestone: b.milestone,
    }));
    return true;
  },

  async isStale() {
    return false;
  },

  buildMessage(items) {
    const item = items[0]!;
    const payload = item.payload as { badges?: { category: string; milestone: number }[] };
    const badges = payload.badges ?? [];
    if (badges.length === 1) {
      const b = badges[0]!;
      return {
        title: "New Badge Earned!",
        body: `You earned the ${b.milestone} ${b.category} badge!`,
        targetUrl: `${externalBaseUrl}/app/profile?tab=badges`,
      };
    }
    return {
      title: "New Badges Earned!",
      body: `You earned ${badges.length} new badges!`,
      targetUrl: `${externalBaseUrl}/app/profile?tab=badges`,
    };
  },
};

export const notificationTypeRegistry: Record<
  NotificationType,
  NotificationTypeConfig
> = {
  daily_reminder: dailyReminderConfig,
  arena_new: arenaNewConfig,
  streak_freeze_earned: streakFreezeEarnedConfig,
  badge_earned: badgeEarnedConfig,
};
