/**
 * One-time backfill script: materialize badges for all existing users.
 *
 * For each user, loads stats and inserts earned badges. For wins/fourdle/wordone
 * milestones, approximates earned_at from the Nth winning game's completedAt.
 * For streaks, uses the game date corresponding to the streak milestone day.
 *
 * Usage:
 *   npx tsx scripts/backfill-badges.ts
 *
 * Requires PG_CONNECTION_STRING in environment.
 */

import { Pool, types } from "pg";
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from "kysely";
import { Database } from "../app/db/pg/types";
import {
  BadgeCategory,
  getBadgesForCategory,
} from "../app/lib/badges";

const int8TypeId = 20;
types.setTypeParser(int8TypeId, (val) => parseInt(val, 10));

const pgDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.PG_CONNECTION_STRING,
      max: 5,
    }),
  }),
  plugins: [new CamelCasePlugin()],
});

interface UserRow {
  userId: string;
  identityProvider: string;
  username: string | null;
}

async function getAllUsers(): Promise<UserRow[]> {
  const rows = await sql<UserRow>`
    SELECT DISTINCT
      g.user_id AS "userId",
      g.identity_provider AS "identityProvider",
      (g.user_data->>'username')::text AS "username"
    FROM game g
    WHERE g.is_daily = true AND g.status IN ('WON', 'LOST')
    ORDER BY g.user_id, g.identity_provider
  `.execute(pgDb);
  // Deduplicate, keeping the latest username per user
  const map = new Map<string, UserRow>();
  for (const r of rows.rows) {
    const key = `${r.userId}:${r.identityProvider}`;
    const existing = map.get(key);
    if (!existing || (r.username && !existing.username)) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

interface WinRow {
  gameKey: string;
  completedAt: Date;
  guessCount: number;
  rowNum: number;
}

async function getWinsForUser(
  userId: string,
  identityProvider: string,
): Promise<WinRow[]> {
  const result = await sql<WinRow>`
    SELECT
      game_key AS "gameKey",
      completed_at AS "completedAt",
      guess_count AS "guessCount",
      ROW_NUMBER() OVER (ORDER BY game_key) AS "rowNum"
    FROM game
    WHERE user_id = ${userId}
      AND identity_provider = ${identityProvider}
      AND is_daily = true
      AND status = 'WON'
    ORDER BY game_key
  `.execute(pgDb);
  return result.rows;
}

interface StatsRow {
  totalWins: number;
  totalLosses: number;
  maxStreak: number;
  winGuessCounts: Record<number, number>;
}

async function getStatsForUser(
  userId: string,
  identityProvider: string,
): Promise<StatsRow | null> {
  // Simple stats computation
  const wins = await getWinsForUser(userId, identityProvider);

  const totalWins = wins.length;
  const winGuessCounts: Record<number, number> = {};
  for (const w of wins) {
    winGuessCounts[w.guessCount] = (winGuessCounts[w.guessCount] ?? 0) + 1;
  }

  // Count losses
  const lossResult = await sql<{ totalLosses: number }>`
    SELECT COUNT(*)::int AS "totalLosses"
    FROM game
    WHERE user_id = ${userId}
      AND identity_provider = ${identityProvider}
      AND is_daily = true AND status = 'LOST'
  `.execute(pgDb);
  const totalLosses = lossResult.rows[0]?.totalLosses ?? 0;

  if (totalWins === 0 && totalLosses === 0) return null;

  // Compute max streak using gaps-and-islands on all daily activity
  const streakResult = await sql<{ maxStreak: number }>`
    WITH daily_activity AS (
      SELECT game_key FROM game
      WHERE user_id = ${userId}
        AND identity_provider = ${identityProvider}
        AND is_daily = true AND status = 'WON'
      UNION
      SELECT applied_to_game_key AS game_key FROM streak_freeze_applied
      WHERE user_id = ${userId}
        AND identity_provider = ${identityProvider}
    ),
    streaks AS (
      SELECT
        game_key,
        game_key::date - ROW_NUMBER() OVER (ORDER BY game_key)::int AS grp
      FROM daily_activity
    )
    SELECT COALESCE(MAX(cnt), 0) AS "maxStreak"
    FROM (SELECT COUNT(*) AS cnt FROM streaks GROUP BY grp) sub
  `.execute(pgDb);

  const maxStreak = streakResult.rows[0]?.maxStreak ?? 0;

  return { totalWins, totalLosses, maxStreak, winGuessCounts };
}

interface LossRow {
  completedAt: Date;
  rowNum: number;
}

async function getLossesForUser(
  userId: string,
  identityProvider: string,
): Promise<LossRow[]> {
  const result = await sql<LossRow>`
    SELECT
      completed_at AS "completedAt",
      ROW_NUMBER() OVER (ORDER BY game_key) AS "rowNum"
    FROM game
    WHERE user_id = ${userId}
      AND identity_provider = ${identityProvider}
      AND is_daily = true
      AND status = 'LOST'
    ORDER BY game_key
  `.execute(pgDb);
  return result.rows;
}

function findEarnedAtForLossMilestone(
  losses: LossRow[],
  milestone: number,
): Date | undefined {
  if (milestone <= losses.length) {
    return losses[milestone - 1]?.completedAt;
  }
  return undefined;
}

function findEarnedAtForWinMilestone(
  wins: WinRow[],
  milestone: number,
): Date | undefined {
  // The Nth win corresponds to the badge
  if (milestone <= wins.length) {
    return wins[milestone - 1]?.completedAt;
  }
  return undefined;
}

function findEarnedAtForGuessMilestone(
  wins: WinRow[],
  guessCount: number,
  milestone: number,
): Date | undefined {
  // Filter wins with the target guess count, find the Nth one
  let count = 0;
  for (const w of wins) {
    if (w.guessCount === guessCount) {
      count++;
      if (count === milestone) {
        return w.completedAt;
      }
    }
  }
  return undefined;
}

async function backfill() {
  console.log("Loading all users...");
  const users = await getAllUsers();
  console.log(`Found ${users.length} users to process`);

  let totalInserted = 0;
  let processedUsers = 0;

  for (const user of users) {
    const stats = await getStatsForUser(user.userId, user.identityProvider);
    if (!stats) continue;

    const wins = await getWinsForUser(user.userId, user.identityProvider);
    const losses = stats.totalLosses > 0
      ? await getLossesForUser(user.userId, user.identityProvider)
      : [];

    const categoryValues: Record<BadgeCategory, number> = {
      wins: stats.totalWins,
      streaks: stats.maxStreak,
      fourdle: stats.winGuessCounts[4] ?? 0,
      wordone: stats.winGuessCounts[1] ?? 0,
      losses: stats.totalLosses,
    };

    for (const [cat, value] of Object.entries(categoryValues) as [BadgeCategory, number][]) {
      if (value <= 0) continue;

      const badges = getBadgesForCategory(cat, value);
      const earned = badges.filter((b) => b.earned);

      for (const badge of earned) {
        let earnedAt: Date | undefined;

        if (cat === "wins") {
          earnedAt = findEarnedAtForWinMilestone(wins, badge.milestone);
        } else if (cat === "fourdle") {
          earnedAt = findEarnedAtForGuessMilestone(wins, 4, badge.milestone);
        } else if (cat === "wordone") {
          earnedAt = findEarnedAtForGuessMilestone(wins, 1, badge.milestone);
        } else if (cat === "losses") {
          earnedAt = findEarnedAtForLossMilestone(losses, badge.milestone);
        }
        // For streaks, we don't have an easy way to find exact date, use undefined (defaults to now())

        const result = await pgDb
          .insertInto("badge")
          .values({
            userId: user.userId,
            identityProvider: user.identityProvider as any,
            category: cat,
            milestone: badge.milestone,
            tier: badge.tier,
            earnedAt: earnedAt,
            username: user.username ?? null,
          })
          .onConflict((oc) =>
            oc.columns(["userId", "identityProvider", "category", "milestone"]).doNothing()
          )
          .returningAll()
          .executeTakeFirst();

        if (result) {
          totalInserted++;
        }
      }
    }

    processedUsers++;
    if (processedUsers % 100 === 0) {
      console.log(`Processed ${processedUsers}/${users.length} users, ${totalInserted} badges inserted`);
    }
  }

  console.log(`Done! Processed ${processedUsers} users, inserted ${totalInserted} badges total.`);
}

backfill()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .then(() => process.exit(0));
