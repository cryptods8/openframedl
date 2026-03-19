import { pgDb } from "@/app/db/pg/pg-db";
import { UserKey, UserStats } from "./game-repository";
import {
  BadgeCategory,
  getBadgesForCategory,
  getTier,
} from "@/app/lib/badges";
import { DBBadge } from "@/app/db/pg/types";

export async function findByUserKey(userKey: UserKey): Promise<DBBadge[]> {
  const { userId, identityProvider } = userKey;
  return pgDb
    .selectFrom("badge")
    .selectAll()
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .orderBy("category")
    .orderBy("milestone")
    .execute();
}

export async function findByUserKeyAndCategory(
  userKey: UserKey,
  category: string,
): Promise<DBBadge[]> {
  const { userId, identityProvider } = userKey;
  return pgDb
    .selectFrom("badge")
    .selectAll()
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("category", "=", category)
    .orderBy("milestone")
    .execute();
}

export async function findById(id: string): Promise<DBBadge | undefined> {
  return pgDb
    .selectFrom("badge")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function findByTokenId(
  tokenId: string,
): Promise<DBBadge | undefined> {
  return pgDb
    .selectFrom("badge")
    .selectAll()
    .where("tokenId", "=", tokenId)
    .executeTakeFirst();
}

export async function insertIfNotExists(badge: {
  userId: string;
  identityProvider: string;
  category: string;
  milestone: number;
  tier: string;
  earnedAt?: Date;
  username?: string | null;
}): Promise<DBBadge | undefined> {
  return pgDb
    .insertInto("badge")
    .values({
      userId: badge.userId,
      identityProvider: badge.identityProvider as any,
      category: badge.category,
      milestone: badge.milestone,
      tier: badge.tier,
      earnedAt: badge.earnedAt,
      username: badge.username ?? null,
    })
    .onConflict((oc) =>
      oc.columns(["userId", "identityProvider", "category", "milestone"]).doNothing()
    )
    .returningAll()
    .executeTakeFirst();
}

export async function updateMintInfo(
  id: string,
  info: { mintTxHash: string; tokenId: string },
): Promise<void> {
  await pgDb
    .updateTable("badge")
    .set({
      minted: true,
      mintTxHash: info.mintTxHash,
      tokenId: info.tokenId,
    })
    .where("id", "=", id)
    .execute();
}

/**
 * Compute milestones from stats, bulk-insert any newly earned ones.
 * Returns only the newly inserted badges.
 */
export async function materializeBadges(
  userKey: UserKey,
  stats: UserStats,
  username?: string | null,
): Promise<DBBadge[]> {
  const categoryValues: Record<BadgeCategory, number> = {
    wins: stats.totalWins,
    streaks: stats.maxStreak,
    fourdle: stats.winGuessCounts[4] ?? 0,
    wordone: stats.winGuessCounts[1] ?? 0,
    losses: stats.totalLosses,
  };

  const newBadges: DBBadge[] = [];

  for (const [cat, value] of Object.entries(categoryValues) as [BadgeCategory, number][]) {
    if (value <= 0) continue;

    const badges = getBadgesForCategory(cat, value);
    const earned = badges.filter((b) => b.earned);

    for (const badge of earned) {
      const result = await insertIfNotExists({
        userId: userKey.userId,
        identityProvider: userKey.identityProvider,
        category: cat,
        milestone: badge.milestone,
        tier: badge.tier,
        username: username ?? null,
      });
      if (result) {
        newBadges.push(result);
      }
    }
  }

  return newBadges;
}
