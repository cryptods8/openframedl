import { sql } from "kysely";
import { pgDb } from "../db/pg/pg-db";
import { DBGame, DBGameInsert, DBGameUpdate } from "../db/pg/types";
import {
  GameIdentityProvider,
  UserData,
  UserGameKey,
  UserKey,
} from "./game-repository";

export async function insert(game: DBGameInsert) {
  return pgDb
    .insertInto("game")
    .values(game)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function update(id: string, game: DBGameUpdate) {
  return pgDb.updateTable("game").set(game).where("id", "=", id).execute();
}

export async function findById(id: string): Promise<DBGame | undefined> {
  return pgDb
    .selectFrom("game")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function findByUserGameKey(
  key: UserGameKey
): Promise<DBGame | undefined> {
  return pgDb
    .selectFrom("game")
    .where("userId", "=", key.userId)
    .where("gameKey", "=", key.gameKey)
    .where("identityProvider", "=", key.identityProvider)
    .where("isDaily", "=", key.isDaily)
    .selectAll()
    .executeTakeFirst();
}

export async function findAllDailyByUserKey(key: UserKey): Promise<DBGame[]> {
  return pgDb
    .selectFrom("game")
    .where("userId", "=", key.userId)
    .where("identityProvider", "=", key.identityProvider)
    .where("isDaily", "=", true)
    .selectAll()
    .execute();
}
export async function insertAll(games: DBGameInsert[]) {
  await pgDb.insertInto("game").values(games).execute();
}

const LEADERBOARD_DAYS = 14;
const LEADERBOARD_SIZE = 10;
const UNPLAYED_PENALTY = 9;
const LOST_PENALTY = 8;
const EXCLUDED_USERS = (
  process.env.LEADERBOARD_BLACKLISTED_USER_KEYS || "fc:11124"
).split(",");

interface GameKeyCTE {
  gameKey: string;
  userId: string;
  identityProvider: GameIdentityProvider;
}

export interface LeaderboardDataItem {
  userId: string;
  identityProvider: GameIdentityProvider;
  //
  wonCount: number;
  lostCount: number;
  unplayedCount: number;
  //
  wonGuessCount: number;
  totalGuessCount: number;
  //
  maxGameKey: string | null;
  userData: UserData | null;
}

export interface Leaderboard {
  entries: LeaderboardDataItem[];
  date: string;
  identityProvider: GameIdentityProvider;
}

export async function loadLeaderboard(
  identityProvider: GameIdentityProvider,
  date: string
): Promise<Leaderboard> {
  const entries = await loadLeaderboardEntries(identityProvider, date);
  return {
    entries,
    date,
    identityProvider,
  };
}

export async function loadLeaderboardEntries(
  identityProvider: GameIdentityProvider,
  date: string
): Promise<LeaderboardDataItem[]> {
  const toDate = new Date(date);
  const fromDate = new Date(
    toDate.getTime() - 1000 * 60 * 60 * 24 * (LEADERBOARD_DAYS - 1)
  );
  const toDateString = toDate.toISOString().split("T")[0]!;
  const fromDateString = fromDate.toISOString().split("T")[0]!;

  const seriesTable = sql<GameKeyCTE>`
    (select
      to_char(generate_series, 'YYYY-MM-DD') as game_key,
      ui.user_id,
      ui.identity_provider
    from
      generate_series(${fromDateString}::timestamp with time zone, ${toDateString}::timestamp with time zone, '1 day'),
      (select user_id, identity_provider from game group by 1, 2) as ui)`;

  const excludedUserIds: string[] = EXCLUDED_USERS.map((u) => u.split(":"))
    .filter((u) => u[0]! === identityProvider)
    .map((u) => u[1]!);

  const q = pgDb
    .with("game_key", () => seriesTable)
    .selectFrom("game_key as gk")
    .leftJoin("game as g", (db) =>
      db
        .onRef("gk.userId", "=", "g.userId")
        .onRef("gk.identityProvider", "=", "g.identityProvider")
        .onRef("gk.gameKey", "=", "g.gameKey")
        .on("g.isDaily", "=", true)
    )
    .select((s) => [
      "gk.userId",
      "gk.identityProvider",
      s.fn
        .sum(s.case().when("g.status", "=", "WON").then(1).else(0).end())
        .$castTo<number>()
        .as("wonCount"),
      s.fn
        .sum(
          s
            .case()
            .when("g.status", "=", "LOST")
            .then(1)
            .when("g.status", "=", "IN_PROGRESS")
            .then(1)
            .else(0)
            .end()
        )
        .$castTo<number>()
        .as("lostCount"),
      s.fn
        .sum(s.case().when("g.status", "is", null).then(1).else(0).end())
        .$castTo<number>()
        .as("unplayedCount"),
      s.fn
        .sum(
          s
            .case()
            .when("g.status", "=", "WON")
            .then(s.ref("g.guessCount"))
            .else(0)
            .end()
        )
        .$castTo<number>()
        .as("wonGuessCount"),
      s.fn
        .sum(
          s
            .case()
            .when("g.status", "=", "WON")
            .then(s.ref("g.guessCount"))
            .when("g.status", "=", "LOST")
            .then(LOST_PENALTY)
            .when("g.status", "=", "IN_PROGRESS")
            .then(LOST_PENALTY)
            .else(UNPLAYED_PENALTY)
            .end()
        )
        .$castTo<number>()
        .as("totalGuessCount"),
      s.fn.max("g.gameKey").$notNull().as("maxGameKey"),
      s
        .selectFrom("game as mg")
        .select("mg.userData")
        .where("mg.userId", "=", s.ref("gk.userId"))
        .where("mg.identityProvider", "=", s.ref("gk.identityProvider"))
        .where("mg.gameKey", "=", s.fn.max("g.gameKey"))
        .as("userData"),
    ])
    .where((x) =>
      excludedUserIds.length > 0
        ? x.and([
            x.eb("gk.identityProvider", "=", identityProvider),
            x.eb("gk.userId", "not in", excludedUserIds),
          ])
        : x.eb("gk.identityProvider", "=", identityProvider)
    )
    .groupBy(["gk.userId", "gk.identityProvider"])
    .orderBy(["totalGuessCount asc", "wonCount desc", "userId asc"])
    .limit(LEADERBOARD_SIZE)
    .execute();
  return q;
}
