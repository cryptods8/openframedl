import { pgDb } from "@/app/db/pg/pg-db";
import { getDailyGameKey } from "@/app/game/game-utils";
import { isPro } from "@/app/constants";
import { DBNotificationQueue, NotificationType } from "@/app/db/pg/types";

interface NotificationMessage {
  title: string;
  body: string;
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

const arenaNewConfig: NotificationTypeConfig = {
  async isStale(item) {
    const payload = item.payload as { arenaId?: number };
    if (!payload.arenaId) return true;

    const arena = await pgDb
      .selectFrom("arena")
      .select(["id", "startedAt", "config", "deletedAt"])
      .where("id", "=", payload.arenaId)
      .executeTakeFirst();

    if (!arena || arena.deletedAt) return true;

    // Check if arena has ended (for timed arenas)
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
      if (new Date() > endTime) return true;
    }

    return false;
  },

  buildMessage(items) {
    if (items.length === 1) {
      return {
        title: `New ${name} Arena`,
        body: "New Framedl Arena to play!",
      };
    }
    return {
      title: `New ${name} Arenas`,
      body: `You have ${items.length} new arenas!`,
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
