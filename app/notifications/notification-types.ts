import { pgDb } from "@/app/db/pg/pg-db";
import { getDailyGameKey } from "@/app/game/game-utils";
import { externalBaseUrl, isPro } from "@/app/constants";
import { DBNotificationQueue, NotificationType } from "@/app/db/pg/types";

interface NotificationMessage {
  title: string;
  body: string;
  targetUrl?: string;
}

interface NotificationTypeConfig {
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

export const notificationTypeRegistry: Record<
  NotificationType,
  NotificationTypeConfig
> = {
  daily_reminder: dailyReminderConfig,
  arena_new: arenaNewConfig,
  streak_freeze_earned: streakFreezeEarnedConfig,
};
