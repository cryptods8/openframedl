import { pgDb } from "@/app/db/pg/pg-db";
import {
  DBPayout,
  DBPayoutInsert,
  PayoutDropResult,
  PayoutStatus,
} from "@/app/db/pg/types";
import { GameIdentityProvider } from "@/app/game/game-repository";

export async function findPayout(
  date: string,
  identityProvider: GameIdentityProvider
): Promise<DBPayout | undefined> {
  return pgDb
    .selectFrom("payout")
    .selectAll()
    .where("date", "=", date)
    .where("identityProvider", "=", identityProvider)
    .executeTakeFirst();
}

export async function createPayout(
  data: DBPayoutInsert
): Promise<DBPayout> {
  return pgDb
    .insertInto("payout")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updatePayoutStatus(
  id: number,
  status: PayoutStatus,
  drops?: PayoutDropResult[],
  error?: string | null
): Promise<void> {
  let query = pgDb
    .updateTable("payout")
    .set({
      status,
      updatedAt: new Date(),
      ...(drops !== undefined ? { drops: JSON.stringify(drops) } : {}),
      ...(error !== undefined ? { error } : {}),
    })
    .where("id", "=", id);

  await query.execute();
}
