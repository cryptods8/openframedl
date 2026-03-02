import { pgDb } from "../db/pg/pg-db";
import {
  DBUserSettings,
  DBUserSettingsInsert,
  DBUserSettingsUpdate,
  UserSettingsTable,
} from "../db/pg/types";
import { UserKey } from "./game-repository";
import { Selectable, sql } from "kysely";

type UserSettingsData = Selectable<UserSettingsTable>["data"];

export type ArenaNotifFrequency = "asap" | "daily" | "weekly" | "never";

export function getArenaNotifFrequency(
  data: UserSettingsData | null | undefined
): ArenaNotifFrequency {
  const val = data?.arenaNotifFrequency;
  if (
    val === "asap" ||
    val === "daily" ||
    val === "weekly" ||
    val === "never"
  ) {
    return val as ArenaNotifFrequency;
  }
  return "daily";
}

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

export async function mergeUserSettingsData(
  userKey: UserKey,
  dataUpdate: Record<string, string | number | boolean | null>
): Promise<void> {
  await pgDb
    .updateTable("userSettings")
    .set({
      data: sql`COALESCE(data, '{}') || ${JSON.stringify(dataUpdate)}::jsonb`,
    } as any)
    .where("userId", "=", userKey.userId)
    .where("identityProvider", "=", userKey.identityProvider)
    .execute();
}
