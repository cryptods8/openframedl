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

export interface CustomGameWithStats extends DBCustomGameView {
  gameCount: number;
  winCount: number;
  lossCount: number;
  totalGuessCount: number;
}

export async function findAllWithStatsByUserKey(
  userKey: UserKey
): Promise<CustomGameWithStats[]> {
  return await pgDb
    .selectFrom("vCustomGame as vcg")
    .leftJoin("vGame as vg", (db) =>
      db.on((eb) =>
        eb.eb(
          "vg.gameKey",
          "=",
          eb.fn<string>("concat", [
            eb.cast<string>(eb.val<string>("custom_"), "varchar"),
            "vcg.id",
          ])
        )
      )
    )
    .select((db) => [
      "vcg.id",
      "vcg.identityProvider",
      "vcg.userId",
      "vcg.createdAt",
      "vcg.word",
      "vcg.userData",
      "vcg.isArt",
      "vcg.numByUser",
      db.fn.count<number>("vg.id").as("gameCount"),
      db.fn
        .sum<number>(
          db.case().when("vg.status", "=", "WON").then(1).else(0).end()
        )
        .as("winCount"),
      db.fn
        .sum<number>(
          db.case().when("vg.status", "=", "LOST").then(1).else(0).end()
        )
        .as("lossCount"),
      db.fn
        .sum<number>(
          db
            .case()
            .when("vg.status", "=", "WON")
            .then(db.ref("vg.guessCount"))
            .when("vg.status", "=", "LOST")
            .then(8)
            .else(0)
            .end()
        )
        .as("totalGuessCount"),
    ])
    .where("vcg.identityProvider", "=", userKey.identityProvider)
    .where("vcg.userId", "=", userKey.userId)
    .groupBy([
      "vcg.id",
      "vcg.identityProvider",
      "vcg.userId",
      "vcg.createdAt",
      "vcg.word",
      "vcg.userData",
      "vcg.isArt",
      "vcg.numByUser",
    ])
    .execute();
}
