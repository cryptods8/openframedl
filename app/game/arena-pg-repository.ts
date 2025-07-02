import { pgDb } from "../db/pg/pg-db";
import { DBArena, DBArenaInsert, DBArenaUpdate, DBGame } from "../db/pg/types";

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
