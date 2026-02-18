import { pgDb } from "@/app/db/pg/pg-db";
import { UserKey } from "./game-repository";
import { sql } from "kysely";

const FREEZE_MAX_CONSECUTIVE = 7;

// --- Mint log (earning / purchasing) ---

export async function insertEarned(
  userKey: UserKey,
  streakLength: number,
  gameKey: string,
  mintTxHash: string
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
      mintTxHash,
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
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
