import { pgDb } from "../../../db/pg/pg-db";
import {
  DBReminder,
  DBReminderInsert,
  DBReminderUpdate,
} from "../../../db/pg/types";
import { UserKey } from "../../../game/game-repository";

export async function findReminderById(id: number): Promise<DBReminder | undefined> {
  return await pgDb
    .selectFrom("reminder")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function findReminderByUserKey(
  userKey: UserKey
): Promise<DBReminder | undefined> {
  return await pgDb
    .selectFrom("reminder")
    .where("identityProvider", "=", userKey.identityProvider)
    .where("userId", "=", userKey.userId)
    .selectAll()
    .executeTakeFirst();
}

export async function insertReminder(reminder: DBReminderInsert) {
  await pgDb.insertInto("reminder").values(reminder).execute();
  return;
}

export async function updateReminder(id: number, reminder: DBReminderUpdate) {
  return pgDb
    .updateTable("reminder")
    .set({ ...reminder, updatedAt: new Date() })
    .where("id", "=", id)
    .execute();
}
