import {
  DBChampionshipSignup,
  DBChampionshipSignupInsert,
} from "../db/pg/types";
import { pgDb } from "../db/pg/pg-db";
import { GameIdentityProvider } from "./game-repository";

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

export async function findChampionshipSignupByUserId(
  userId: string,
  identityProvider: GameIdentityProvider,
  roundNumber: number
): Promise<DBChampionshipSignup | undefined> {
  return await pgDb
    .selectFrom("championshipSignup")
    .where("userId", "=", userId)
    .where("identityProvider", "=", identityProvider)
    .where("roundNumber", "=", roundNumber)
    .selectAll()
    .executeTakeFirst();
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
