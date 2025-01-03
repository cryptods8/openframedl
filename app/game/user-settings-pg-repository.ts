import { pgDb } from "../db/pg/pg-db";
import {
  DBUserSettings,
  DBUserSettingsInsert,
  DBUserSettingsUpdate,
} from "../db/pg/types";
import { UserKey } from "./game-repository";

export async function insertUserSettings(
  settings: DBUserSettingsInsert
): Promise<number> {
  const res = await pgDb
    .insertInto("userSettings")
    .values(settings)
    .returning("id")
    .executeTakeFirst();
  return res!.id;
}

export async function findUserSettingsByUserKey(
  userKey: UserKey
): Promise<DBUserSettings | undefined> {
  return await pgDb
    .selectFrom("userSettings")
    .where("userId", "=", userKey.userId)
    .where("identityProvider", "=", userKey.identityProvider)
    .selectAll()
    .executeTakeFirst();
}

export async function updateUserSettings(
  userKey: UserKey,
  settings: DBUserSettingsUpdate
) {
  await pgDb
    .updateTable("userSettings")
    .set(settings)
    .where("userId", "=", userKey.userId)
    .where("identityProvider", "=", userKey.identityProvider)
    .execute();
}
