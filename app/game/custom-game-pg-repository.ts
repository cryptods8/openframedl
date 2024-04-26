import { DBCustomGame, DBCustomGameInsert } from "../db/pg/types";
import { pgDb } from "../db/pg/pg-db";

export async function save(customGame: DBCustomGameInsert): Promise<void> {
  await pgDb.insertInto("customGame").values(customGame).execute();
  return;
}

export async function findById(id: string): Promise<DBCustomGame | undefined> {
  return pgDb
    .selectFrom("customGame")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}
