import { DBCustomGameInsert, DBCustomGameView } from "../db/pg/types";
import { pgDb } from "../db/pg/pg-db";

export async function save(customGame: DBCustomGameInsert): Promise<void> {
  await pgDb.insertInto("customGame").values(customGame).execute();
  return;
}

export async function findById(
  id: string
): Promise<DBCustomGameView | undefined> {
  return await pgDb
    .selectFrom("vCustomGame")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}
