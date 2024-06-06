import { DBCustomGameInsert, DBCustomGameView } from "../db/pg/types";
import { pgDb } from "../db/pg/pg-db";
import { UserKey } from "./game-repository";

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

export async function findAllByUserKey(
  userKey: UserKey
): Promise<DBCustomGameView[]> {
  return await pgDb
    .selectFrom("vCustomGame")
    .where("identityProvider", "=", userKey.identityProvider)
    .where("userId", "=", userKey.userId)
    .selectAll()
    .execute();
}
