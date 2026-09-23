import { pgDb } from "../db/pg/pg-db";
import { DBArena, DBArenaInsert, DBArenaUpdate, DBGame } from "../db/pg/types";
import { sql } from "kysely";
import { UserKey } from "./game-repository";

export async function insertArena(arena: DBArenaInsert): Promise<number> {
  const res = await pgDb
    .insertInto("arena")
    .values(arena)
    .returning("id")
    .executeTakeFirst();
  return res!.id;
}

export async function updateArena(id: number, arena: DBArenaUpdate) {
  await pgDb
    .updateTable("arena")
    .set({ ...arena, updatedAt: new Date() })
    .where("id", "=", id)
    .execute();
}

export async function findArenaById(id: number): Promise<DBArena | undefined> {
  return await pgDb
    .selectFrom("arena")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export interface ArenaWithGames extends DBArena {
  games: DBGame[];
}

export function createArenasWithGamesQuery() {
  return pgDb
    .selectFrom("arena as a")
    .leftJoin("game as g", "a.id", "g.arenaId")
    .select([
      "a.id",
      "a.config",
      "a.createdAt",
      "a.updatedAt",
      "a.deletedAt",
      "a.userId",
      "a.identityProvider",
      "a.members",
      "a.startedAt",
      "a.userData",
      "a.lastNotifiedAt",
      "g.id as gameId",
      "g.userId as gameUserId",
      "g.identityProvider as gameIdentityProvider",
      "g.createdAt as gameCreatedAt",
      "g.updatedAt as gameUpdatedAt",
      "g.completedAt as gameCompletedAt",
      "g.word as gameWord",
      "g.guesses as gameGuesses",
      "g.status as gameStatus",
      "g.userData as gameUserData",
      "g.gameData as gameGameData",
      "g.gameKey as gameGameKey",
      "g.isDaily as gameIsDaily",
      "g.guessCount as gameGuessCount",
      "g.isHardMode as gameIsHardMode",
      "g.isHardModeRequired as gameIsHardModeRequired",
      "g.srcGameId as gameSrcGameId",
      "g.arenaId as gameArenaId",
      "g.arenaWordIndex as gameArenaWordIndex",
    ]);
}

export type ArenaWithGamesQuery = ReturnType<typeof createArenasWithGamesQuery>;
export type ArenaWithGamesQueryModifier = (
  q: ArenaWithGamesQuery
) => ArenaWithGamesQuery;

export async function findArenasWithGames(
  queryModifier: ArenaWithGamesQueryModifier
): Promise<ArenaWithGames[]> {
  let q = createArenasWithGamesQuery();
  q = queryModifier(q);
  q = q.orderBy("a.id", "asc");
  const result = await q.execute();

  const groupedResults = result.reduce((acc, r) => {
    if (!acc[r.id]) {
      acc[r.id] = [];
    }
    acc[r.id]!.push(r);
    return acc;
  }, {} as Record<number, typeof result>);

  return Object.values(groupedResults).map((res) => {
    if (!res || !res[0]) {
      throw new Error("Unexpected empty result");
    }
    const kickedMemberKeys = res[0].members
      .filter((m) => m.kickedAt != null)
      .map((m) => `${m.identityProvider}/${m.userId}`);
    const arena: ArenaWithGames = {
      id: res[0].id,
      config: res[0].config,
      createdAt: res[0].createdAt,
      updatedAt: res[0].updatedAt,
      deletedAt: res[0].deletedAt,
      userId: res[0].userId,
      identityProvider: res[0].identityProvider,
      members: res[0].members,
      startedAt: res[0].startedAt,
      userData: res[0].userData,
      lastNotifiedAt: res[0].lastNotifiedAt,
      games: res
        .filter(
          (gr) =>
            gr.gameId &&
            !kickedMemberKeys.includes(
              `${gr.gameIdentityProvider}/${gr.gameUserId}`
            )
        )
        .map((gr) => ({
          id: gr.gameId!,
          userId: gr.gameUserId!,
          identityProvider: gr.gameIdentityProvider!,
          createdAt: gr.gameCreatedAt!,
          updatedAt: gr.gameUpdatedAt!,
          completedAt: gr.gameCompletedAt,
          word: gr.gameWord!,
          guesses: gr.gameGuesses!,
          status: gr.gameStatus!,
          userData: gr.gameUserData,
          gameData: gr.gameGameData,
          gameKey: gr.gameGameKey!,
          isDaily: gr.gameIsDaily!,
          guessCount: gr.gameGuessCount!,
          isHardMode: gr.gameIsHardMode!,
          isHardModeRequired: gr.gameIsHardModeRequired,
          srcGameId: gr.gameSrcGameId,
          arenaId: gr.gameArenaId,
          arenaWordIndex: gr.gameArenaWordIndex,
        })),
    };
    return arena;
  });
}

export async function findArenaWithGamesById(
  id: number
): Promise<ArenaWithGames | undefined> {
  const res = await findArenasWithGames((q) => q.where("a.id", "=", id));
  return res[0];
}

export async function countInProgressArenas(userKey: UserKey): Promise<number> {
  const now = new Date();
  const res = await pgDb
    .with("arena_game_stats", (db) =>
      db
        .selectFrom("game")
        .select((db) => [
          "arenaId",
          db.fn.count<number>("id").as("gameCount"),
          db.fn
            .sum<number>(
              db
                .case()
                .when("status", "in", ["WON", "LOST"])
                .then(1)
                .else(0)
                .end(),
            )
            .as("completedCount"),
          db.fn.min<Date>("createdAt").as("firstStartedAt"),
        ])
        .where("arenaId", "is not", null)
        .groupBy("arenaId"),
    )
    .with("arena_base_meta", (db) =>
      db.selectFrom("arena as a").select((db) => [
        "a.id",
        db
          .eb(
            sql<number>`jsonb_array_length(a.config->'words')::int`,
            "*",
            sql<number>`(a.config->>'audienceSize')::int`,
          )
          .as("totalGameCount"),
        db
          .case()
          .when(sql<number>`a.config->'start'->>'date'`, "is", null)
          .then(db.val(null))
          .else(sql<Date>`(a.config->'start'->>'date')::timestamp`)
          .end()
          .as("startAt"),
        db
          .case()
          .when(
            sql<string>`(config->'duration'->>'type')::text`,
            "=",
            "unlimited",
          )
          .then(db.val(null))
          .else(
            sql<Date>`(config->'duration'->>'minutes' || ' minutes')::interval`,
          )
          .end()
          .as("duration"),
      ]),
    )
    .with("arena_meta", (db) =>
      db
        .selectFrom("arena as a")
        .innerJoin("arena_base_meta as abm", "a.id", "abm.id")
        .leftJoin("arena_game_stats as ags", "a.id", "ags.arenaId")
        .select((db) => [
          "a.id",
          db.fn.coalesce("ags.completedCount", db.val(0)).as("completedCount"),
          "abm.totalGameCount",
          "ags.firstStartedAt",
          "abm.startAt",
          db
            .case()
            .when("abm.duration", "is", null)
            .then(db.val(null))
            .when(
              db.fn.coalesce(
                "abm.startAt",
                "a.startedAt",
                "ags.firstStartedAt",
              ),
              "is",
              null,
            )
            .then(db.val(null))
            .else(
              db.eb(
                db.fn.coalesce(
                  "abm.startAt",
                  "a.startedAt",
                  "ags.firstStartedAt",
                ),
                "+",
                db.ref("abm.duration"),
              ),
            )
            .end()
            .as("endsAt"),
        ]),
    )
    .with("user_arena_stats", (db) =>
      db
        .selectFrom("game")
        .select((db) => [
          "arenaId",
          db.fn.count<number>("id").as("userGameCount"),
          db.fn
            .sum<number>(
              db
                .case()
                .when("status", "in", ["WON", "LOST"])
                .then(1)
                .else(0)
                .end(),
            )
            .as("userCompletedCount"),
        ])
        .where("arenaId", "is not", null)
        .where("userId", "=", userKey.userId)
        .where("identityProvider", "=", userKey.identityProvider)
        .groupBy("arenaId"),
    )
    .selectFrom("arena")
    .innerJoin("arena_meta as am", "arena.id", "am.id")
    .leftJoin("user_arena_stats as uas", "arena.id", "uas.arenaId")
    .select((db) => db.fn.count<number>("arena.id").as("count"))
    .where((db) =>
      db.and([
        db.eb("am.completedCount", "<", db.ref("am.totalGameCount")),
        db.or([
          db.eb("am.endsAt", "is", null),
          db.eb("am.endsAt", ">", now),
        ]),
        db.or([
          db.eb(
            db.fn.coalesce(
              "am.startAt",
              "arena.startedAt",
              "am.firstStartedAt",
            ),
            "is",
            null,
          ),
          db.eb(
            db.fn.coalesce(
              "am.startAt",
              "arena.startedAt",
              "am.firstStartedAt",
            ),
            "<=",
            now,
          ),
        ]),
        db.or([
          db.eb("uas.userGameCount", ">", 0),
          sql<boolean>`(
            jsonb_typeof(arena.members) = 'array' AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(arena.members) AS m
              WHERE m->>'userId' = ${userKey.userId}
                AND m->>'identityProvider' = ${userKey.identityProvider}
                AND (m->>'kickedAt' IS NULL OR m->>'kickedAt' = 'null')
            )
          )`,
        ]),
        db.or([
          db.eb("uas.userCompletedCount", "is", null),
          db.eb(
            "uas.userCompletedCount",
            "<",
            sql<number>`jsonb_array_length(arena.config->'words')::int`,
          ),
        ]),
      ]),
    )
    .executeTakeFirst();

  return Number(res?.count ?? 0);
}
