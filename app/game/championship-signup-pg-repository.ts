import {
  DBChampionshipSignup,
  DBChampionshipSignupInsert,
} from "../db/pg/types";
import { pgDb } from "../db/pg/pg-db";

export async function saveChampionshipSignup(
  signup: DBChampionshipSignupInsert
): Promise<number> {
  const res = await pgDb
    .insertInto("championshipSignup")
    .values(signup)
    .returning("id")
    .executeTakeFirst();
  return Number(res?.id);
}

export async function findChampionshipSignupById(
  id: number
): Promise<DBChampionshipSignup | undefined> {
  return await pgDb
    .selectFrom("championshipSignup")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}
