import { pgDb } from "@/app/db/pg/pg-db";
import { UserKey } from "./game-repository";
import { sql } from "kysely";

const FREEZE_MAX_CONSECUTIVE = 7;

// --- Mint log (earning / purchasing) ---

export async function insertEarned(
  userKey: UserKey,
  streakLength: number,
  gameKey: string,
  walletAddress: string | null = null,
  claimNonce: string | null = null,
  claimSignature: string | null = null,
) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .insertInto("streakFreezeMint")
    .values({
      userId,
      identityProvider,
      source: "EARNED",
      earnedAtStreakLength: streakLength,
      earnedAtGameKey: gameKey,
      walletAddress,
      claimNonce,
      claimSignature,
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
}

export async function markClaimed(
  userKey: UserKey,
  id: number,
  claimTxHash: string,
  walletAddress?: string,
) {
  const { userId, identityProvider } = userKey;
  const query = pgDb.updateTable("streakFreezeMint").set({ claimTxHash });

  if (walletAddress) {
    query.set({ walletAddress });
  }

  return await query
    .where("id", "=", id)
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .execute();
}

export async function insertPurchased(
  userKey: UserKey,
  walletAddress: string,
  purchaseTxRef: string,
) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .insertInto("streakFreezeMint")
    .values({
      userId,
      identityProvider,
      source: "PURCHASED",
      walletAddress,
      purchaseTxRef,
      mintTxHash: purchaseTxRef,
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
}

export async function hasEarnedForGameKey(
  userKey: UserKey,
  gameKey: string,
): Promise<boolean> {
  const { userId, identityProvider } = userKey;
  const result = await pgDb
    .selectFrom("streakFreezeMint")
    .select("id")
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("source", "=", "EARNED")
    .where("earnedAtGameKey", "=", gameKey)
    .executeTakeFirst();
  return !!result;
}

export async function getLastEarnedFreeze(
  userKey: UserKey,
): Promise<{ earnedAtGameKey: string; earnedAtStreakLength: number } | null> {
  const { userId, identityProvider } = userKey;
  const result = await pgDb
    .selectFrom("streakFreezeMint")
    .select(["earnedAtGameKey", "earnedAtStreakLength"])
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("source", "=", "EARNED")
    .where("earnedAtGameKey", "is not", null)
    .orderBy("earnedAtGameKey", "desc")
    .limit(1)
    .executeTakeFirst();
  if (
    !result ||
    !result.earnedAtGameKey ||
    result.earnedAtStreakLength == null
  ) {
    return null;
  }
  return {
    earnedAtGameKey: result.earnedAtGameKey,
    earnedAtStreakLength: result.earnedAtStreakLength,
  };
}

export interface ActiveStreakWin {
  userId: string;
  identityProvider: string;
  gameKey: string;
  winIndexInStreak: number;
}

export async function findUsersWithStreaks(
  streakLengthMin: number = 100,
): Promise<ActiveStreakWin[]> {
  const result = await sql<ActiveStreakWin>`
    WITH daily_activity AS (
      SELECT user_id, identity_provider, game_key, true AS is_win
      FROM game
      WHERE is_daily = true AND status = 'WON'
      UNION ALL
      SELECT user_id, identity_provider, applied_to_game_key AS game_key, false AS is_win
      FROM streak_freeze_applied
    ),
    streak_groups AS (
      SELECT
        user_id,
        identity_provider,
        game_key,
        is_win,
        game_key::date - ROW_NUMBER() OVER (
          PARTITION BY user_id, identity_provider ORDER BY game_key
        )::int AS grp
      FROM daily_activity
    ),
    streak_agg AS (
      SELECT
        user_id,
        identity_provider,
        grp,
        MIN(game_key) AS start_key,
        MAX(game_key) AS end_key
      FROM streak_groups
      GROUP BY user_id, identity_provider, grp
      HAVING COUNT(*) >= ${streakLengthMin}
    ),
    active_wins AS (
      SELECT
        sg.user_id,
        sg.identity_provider,
        sg.game_key,
        ROW_NUMBER() OVER (
          PARTITION BY sg.user_id, sg.identity_provider, sg.grp ORDER BY sg.game_key
        )::int AS win_index_in_streak
      FROM streak_groups sg
      INNER JOIN streak_agg sa
        ON sg.user_id = sa.user_id
        AND sg.identity_provider = sa.identity_provider
        AND sg.grp = sa.grp
      WHERE sg.is_win = true
    )
    SELECT
      user_id AS "userId",
      identity_provider AS "identityProvider",
      game_key AS "gameKey",
      win_index_in_streak AS "winIndexInStreak"
    FROM active_wins
    ORDER BY user_id, identity_provider, game_key
  `.execute(pgDb);
  return result.rows;
}

export async function findUnclaimedByUser(userKey: UserKey) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .selectFrom("streakFreezeMint")
    .selectAll()
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("source", "=", "EARNED")
    .where("claimTxHash", "is", null)
    .execute();
}

// --- Applied freezes (burn + use) ---

export interface StreakGap {
  startDate: string;
  endDate: string;
  length: number;
  dates: string[];
}

export async function applyFreeze(
  userKey: UserKey,
  gameKey: string,
  burnTxHash: string,
) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .insertInto("streakFreezeApplied")
    .values({
      userId,
      identityProvider,
      appliedToGameKey: gameKey,
      appliedAt: new Date(),
      burnTxHash,
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
}

export async function findByGameKey(userKey: UserKey, gameKey: string) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .selectFrom("streakFreezeApplied")
    .selectAll()
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("appliedToGameKey", "=", gameKey)
    .executeTakeFirst();
}

export async function countFreezesByBurnTx(
  burnTxHash: string,
): Promise<number> {
  const result = await pgDb
    .selectFrom("streakFreezeApplied")
    .select(sql<number>`count(*)`.as("cnt"))
    .where("burnTxHash", "=", burnTxHash)
    .executeTakeFirst();
  return Number(result?.cnt ?? 0);
}

export async function findAppliedByUser(userKey: UserKey) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .selectFrom("streakFreezeApplied")
    .selectAll()
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .execute();
}

/**
 * Find streak gap dates for a user. Walks backward from yesterday:
 * a day is "covered" if the user won or has a freeze applied.
 * Returns uncovered dates between covered days (or between today and a previous covered day).
 * Limits gaps to FREEZE_MAX_CONSECUTIVE days maximum.
 * Returns dates in descending order (latest gaps first).
 */
export async function findStreakGaps(userKey: UserKey): Promise<StreakGap[]> {
  const { userId, identityProvider } = userKey;

  // Get all daily game results (WON or LOST) and applied freezes
  const [games, freezes] = await Promise.all([
    pgDb
      .selectFrom("game")
      .select(["gameKey", "status"])
      .where("userId", "=", userId)
      .where("identityProvider", "=", identityProvider)
      .where("isDaily", "=", true)
      .where("status", "=", ["WON"]) //, "LOST"])
      .orderBy("gameKey", "desc")
      .execute(),
    pgDb
      .selectFrom("streakFreezeApplied")
      .select(["appliedToGameKey"])
      .where("userId", "=", userId)
      .where("identityProvider", "=", identityProvider)
      .execute(),
  ]);

  if (games.length === 0) {
    return [];
  }

  const firstPlayedGameKey = games[games.length - 1]!.gameKey;
  const lastPlayedGameKey = games[0]!.gameKey;

  const wonSet = new Set(games.map((g) => g.gameKey));
  const frozenSet = new Set(freezes.map((f) => f.appliedToGameKey));

  // Walk backward from yesterday
  const gaps: StreakGap[] = [];
  const today = new Date();
  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  cursor.setUTCDate(cursor.getUTCDate()); // start from yesterday

  let currentGaps: string[] = [];
  let dateStr = lastPlayedGameKey;
  while (dateStr >= firstPlayedGameKey) {
    if (dateStr < firstPlayedGameKey) {
      break;
    }

    const isWon = wonSet.has(dateStr);
    const isFrozen = frozenSet.has(dateStr);
    const isCovered = isWon || isFrozen;

    if (isCovered) {
      if (currentGaps.length > 0) {
        gaps.push({
          startDate: currentGaps[currentGaps.length - 1]!,
          endDate: currentGaps[0]!,
          length: currentGaps.length,
          dates: [...currentGaps],
        });
        currentGaps = [];
      }
    } else {
      // Uncovered day
      currentGaps.push(dateStr);
      if (currentGaps.length > FREEZE_MAX_CONSECUTIVE) {
        // Gap exceeds the limit, so the streak is considered broken
        break;
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() - 1);
    dateStr = cursor.toISOString().split("T")[0]!;
  }

  // Return gaps in descending order (latest gaps first)
  return gaps;
}

export async function countConsecutiveUsed(
  userKey: UserKey,
  targetGameKey: string,
): Promise<number> {
  const { userId, identityProvider } = userKey;

  const result = await pgDb
    .withRecursive("consecutive_freezes", (db) =>
      db
        .selectFrom("streakFreezeApplied")
        .select(["appliedToGameKey", sql<number>`1`.as("cnt")])
        .where("userId", "=", userId)
        .where("identityProvider", "=", identityProvider)
        .where(
          "appliedToGameKey",
          "=",
          sql<string>`(${targetGameKey}::date - 1)::text`,
        )
        .unionAll((db) =>
          db
            .selectFrom("streakFreezeApplied as s")
            .innerJoin("consecutive_freezes as c", (join) => join.onTrue())
            .select(["s.appliedToGameKey", sql<number>`c.cnt + 1`.as("cnt")])
            .where("s.userId", "=", userId)
            .where("s.identityProvider", "=", identityProvider)
            .whereRef(
              "s.appliedToGameKey",
              "=",
              sql<string>`(c.applied_to_game_key::date - 1)::text`,
            ),
        ),
    )
    .selectFrom("consecutive_freezes")
    .select(sql<number>`MAX(cnt)`.as("maxConsecutive"))
    .executeTakeFirst();

  return result?.maxConsecutive ?? 0;
}
