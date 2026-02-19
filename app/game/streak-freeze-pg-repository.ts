import { pgDb } from "@/app/db/pg/pg-db";
import { UserKey } from "./game-repository";
import { sql } from "kysely";

const FREEZE_MAX_CONSECUTIVE = 7;

// --- Mint log (earning / purchasing) ---

export async function insertEarned(
  userKey: UserKey,
  streakLength: number,
  gameKey: string,
  walletAddress: string,
  claimNonce: string,
  claimSignature: string
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
  claimTxHash: string
) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .updateTable("streakFreezeMint")
    .set({ claimTxHash })
    .where("id", "=", id)
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .execute();
}

export async function insertPurchased(
  userKey: UserKey,
  purchaseTxRef: string,
  mintTxHash: string
) {
  const { userId, identityProvider } = userKey;
  return await pgDb
    .insertInto("streakFreezeMint")
    .values({
      userId,
      identityProvider,
      source: "PURCHASED",
      purchaseTxRef,
      mintTxHash,
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
}

export async function hasEarnedForStreak(
  userKey: UserKey,
  streakLength: number,
  gameKey: string
): Promise<boolean> {
  const { userId, identityProvider } = userKey;
  const result = await pgDb
    .selectFrom("streakFreezeMint")
    .select("id")
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("earnedAtStreakLength", "=", streakLength)
    .where(
      "earnedAtGameKey",
      ">=",
      sql<string>`(${gameKey}::date - ${streakLength}::int)::text`
    )
    .executeTakeFirst();
  return !!result;
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
    .where("claimSignature", "is not", null)
    .execute();
}

// --- Applied freezes (burn + use) ---

export async function applyFreeze(
  userKey: UserKey,
  gameKey: string,
  burnTxHash: string
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
 * Returns uncovered dates between covered dates (the gap).
 * Stops when hitting a LOST game or an uncovered day with no covered day after it.
 */
export async function findStreakGaps(userKey: UserKey): Promise<string[]> {
  const { userId, identityProvider } = userKey;

  // Get all daily game results (WON or LOST) and applied freezes
  const [games, freezes] = await Promise.all([
    pgDb
      .selectFrom("game")
      .select(["gameKey", "status"])
      .where("userId", "=", userId)
      .where("identityProvider", "=", identityProvider)
      .where("isDaily", "=", true)
      .where("status", "in", ["WON", "LOST"])
      .orderBy("gameKey", "desc")
      .execute(),
    pgDb
      .selectFrom("streakFreezeApplied")
      .select(["appliedToGameKey"])
      .where("userId", "=", userId)
      .where("identityProvider", "=", identityProvider)
      .execute(),
  ]);

  const wonSet = new Set<string>();
  const lostSet = new Set<string>();
  for (const g of games) {
    if (g.status === "WON") wonSet.add(g.gameKey);
    else if (g.status === "LOST") lostSet.add(g.gameKey);
  }
  const frozenSet = new Set(freezes.map((f) => f.appliedToGameKey));

  // Walk backward from yesterday
  const gaps: string[] = [];
  const today = new Date();
  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  cursor.setUTCDate(cursor.getUTCDate() - 1); // start from yesterday

  // We need to find the "active streak window": walk back while covered,
  // collecting gaps along the way. Stop when we hit a loss or a day that
  // is neither covered nor a gap (i.e., no covered day follows it).
  let foundCoveredDay = false;

  for (let i = 0; i < 365 * 3; i++) {
    const dateStr = cursor.toISOString().split("T")[0]!;

    const isWon = wonSet.has(dateStr);
    const isFrozen = frozenSet.has(dateStr);
    const isLost = lostSet.has(dateStr);
    const isCovered = isWon || isFrozen;

    if (isLost) {
      // Streak is broken here — stop
      break;
    }

    if (isCovered) {
      foundCoveredDay = true;
    } else {
      // Uncovered day
      if (!foundCoveredDay) {
        // No covered day after this yet (looking from today backward)
        // The streak hasn't started, stop
        break;
      }
      // This is a gap within the streak window
      gaps.push(dateStr);
    }

    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Return gaps in chronological order
  return gaps.reverse();
}

export async function countConsecutiveUsed(
  userKey: UserKey,
  targetGameKey: string
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
          sql<string>`(${targetGameKey}::date - 1)::text`
        )
        .unionAll((db) =>
          db
            .selectFrom("streakFreezeApplied as s")
            .innerJoin("consecutive_freezes as c", (join) =>
              join.onTrue()
            )
            .select([
              "s.appliedToGameKey",
              sql<number>`c.cnt + 1`.as("cnt"),
            ])
            .where("s.userId", "=", userId)
            .where("s.identityProvider", "=", identityProvider)
            .whereRef(
              "s.appliedToGameKey",
              "=",
              sql<string>`(c.appliedToGameKey::date - 1)::text`
            )
        )
    )
    .selectFrom("consecutive_freezes")
    .select(sql<number>`MAX(cnt)`.as("maxConsecutive"))
    .executeTakeFirst();

  return result?.maxConsecutive ?? 0;
}
