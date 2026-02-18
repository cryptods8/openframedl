import { pgDb } from "@/app/db/pg/pg-db";
import { sql, SqlBool } from "kysely";
import { UserKey, UserStats, GameResult } from "./game-repository";

/**
 * Compute user stats entirely from the PG `game` table using SQL.
 * Replaces the Firebase-based cache + TS replay loop.
 */
export async function loadStatsByUserKey(
  userKey: UserKey
): Promise<UserStats | null> {
  const { userId, identityProvider } = userKey;

  const result = await pgDb
    .with("daily", (db) =>
      db
        .selectFrom("game")
        .select(["gameKey", "status", "guessCount"])
        .where("userId", "=", userId)
        .where("identityProvider", "=", identityProvider)
        .where("isDaily", "=", true)
        .where("status", "in", ["WON", "LOST"])
        .orderBy("gameKey")
    )
    .with("daily_activity", (db) =>
      db
        .selectFrom("daily")
        .select(["gameKey", sql<boolean>`true`.as("isWin")])
        .where("status", "=", "WON")
        .union(
          db
            .selectFrom("streakFreezeApplied")
            .select([
              sql<string>`applied_to_game_key`.as("gameKey"),
              sql<boolean>`false`.as("isWin"),
            ])
            .where("userId", "=", userId)
            .where("identityProvider", "=", identityProvider)
        )
    )
    .with("streak", (db) =>
      db
        .selectFrom("daily_activity")
        .select([
          "gameKey",
          sql<boolean>`is_win`.as("isWin"),
          sql<number>`game_key::date - ROW_NUMBER() OVER (ORDER BY game_key)::int`.as(
            "grp"
          ),
        ])
    )
    .with("streak_agg", (db) =>
      db
        .selectFrom("streak")
        .select((s) => [
          "grp",
          sql<number>`SUM(CASE WHEN is_win THEN 1 ELSE 0 END)`.as("len"),
          s.fn.min("gameKey").as("startKey"),
          s.fn.max("gameKey").as("endKey"),
        ])
        .groupBy("grp")
    )
    .with("agg", (db) =>
      db
        .selectFrom("daily")
        .select((s) => [
          s.fn.countAll<number>().as("totalGames"),
          s.fn
            .sum<number>(
              s.case().when("status", "=", "WON").then(1).else(0).end()
            )
            .as("totalWins"),
          s.fn
            .sum<number>(
              s.case().when("status", "=", "LOST").then(1).else(0).end()
            )
            .as("totalLosses"),
          sql<string | null>`MAX(game_key) FILTER (WHERE status = 'WON')`.as(
            "lastGameWonDate"
          ),
        ])
    )
    .with("guess_dist", (db) =>
      db
        .selectFrom("daily")
        .select((s) => [
          "guessCount",
          s.fn.countAll<number>().as("cnt"),
        ])
        .where("status", "=", "WON")
        .groupBy("guessCount")
    )
    .with("last30", (db) =>
      db
        .selectFrom("daily")
        .select([
          "gameKey",
          sql<boolean>`status = 'WON'`.as("won"),
          sql<boolean>`false`.as("frozen"),
          "guessCount",
        ])
        .union(
          db
            .selectFrom("streakFreezeApplied")
            .select([
              sql<string>`applied_to_game_key`.as("gameKey"),
              sql<boolean>`false`.as("won"),
              sql<boolean>`true`.as("frozen"),
              sql<number>`0`.as("guessCount"),
            ])
            .where("userId", "=", userId)
            .where("identityProvider", "=", identityProvider)
            .where(
              sql<boolean>`applied_to_game_key not in (select game_key from daily)`
            )
        )
        .orderBy("gameKey", "desc")
        .limit(30)
    )
    .selectFrom("agg as a")
    .select((s) => [
      "a.totalGames",
      "a.totalWins",
      "a.totalLosses",
      "a.lastGameWonDate",
      s
        .selectFrom("streak_agg")
        .select(sql<number>`COALESCE(MAX(len), 0)`.as("val"))
        .as("maxStreak"),
      s
        .selectFrom("streak_agg")
        .select("len")
        .where(sql<SqlBool>`end_key::date >= CURRENT_DATE - 1`)
        .orderBy("endKey", "desc")
        .limit(1)
        .as("currentStreak"),
      s
        .selectFrom("guess_dist")
        .select(
          sql<Record<number, number>>`jsonb_object_agg(guess_count, cnt)`.as(
            "val"
          )
        )
        .as("winGuessCounts"),
      s
        .selectFrom("last30")
        .select(
          sql<
            GameResult[]
          >`jsonb_agg(jsonb_build_object('date', game_key, 'won', won, 'frozen', frozen, 'guessCount', guess_count) ORDER BY game_key ASC)`.as(
            "val"
          )
        )
        .as("last30"),
    ])
    .executeTakeFirst();

  if (!result || result.totalGames === 0) {
    return null;
  }

  return {
    id: `${identityProvider}:${userId}`,
    userId,
    identityProvider,
    totalGames: result.totalGames ?? 0,
    totalWins: result.totalWins ?? 0,
    totalLosses: result.totalLosses ?? 0,
    maxStreak: result.maxStreak ?? 0,
    currentStreak: result.currentStreak ?? 0,
    lastGameWonDate: result.lastGameWonDate ?? undefined,
    winGuessCounts: result.winGuessCounts ?? {},
    last30: result.last30 ?? [],
  };
}
