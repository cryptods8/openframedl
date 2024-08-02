import { sql } from "kysely";
import { pgDb } from "../db/pg/pg-db";
import {
  ArenaConfig,
  ArenaMember,
  DBGame,
  DBGameInsert,
  DBGameUpdate,
  DBGameView,
  UserDataColumn,
} from "../db/pg/types";
import {
  GameIdentityProvider,
  UserData,
  UserGameKey,
  UserKey,
} from "./game-repository";
import { addDaysToDate, getDailyGameKey } from "./game-utils";
import {
  DEFAULT_LEADERBOARD_DAYS,
  LOST_PENALTY,
  UNPLAYED_PENALTY,
} from "./game-constants";

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

export interface DBGameViewWithArena extends DBGameView {
  arenaConfig: ArenaConfig | null;
  arenaMembers: ArenaMember[] | null;
  arenaCreatedAt: Date | null;
  arenaUpdatedAt: Date | null;
  arenaDeletedAt: Date | null;
  arenaUserId: string | null;
  arenaIdentityProvider: GameIdentityProvider | null;
  arenaUserData: UserDataColumn | null;
  arenaStartedAt: Date | null;
}

function gameViewQuery() {
  return pgDb
    .selectFrom("vGame as g")
    .leftJoin("arena as a", "a.id", "g.arenaId")
    .select([
      "g.id",
      "g.userId",
      "g.identityProvider",
      "g.gameKey",
      "g.isDaily",
      "g.word",
      "g.guesses",
      "g.createdAt",
      "g.updatedAt",
      "g.completedAt",
      "g.status",
      "g.guessCount",
      "g.isHardMode",
      "g.userData",
      "g.srcGameId",
      "g.arenaId",
      "g.customUserId",
      "g.customIdentityProvider",
      "g.customIsArt",
      "g.customNumByUser",
      "g.customUserData",
      "g.arenaId",
      "g.arenaWordIndex",
      "a.config as arenaConfig",
      "a.members as arenaMembers",
      "a.createdAt as arenaCreatedAt",
      "a.updatedAt as arenaUpdatedAt",
      "a.deletedAt as arenaDeletedAt",
      "a.userId as arenaUserId",
      "a.identityProvider as arenaIdentityProvider",
      "a.userData as arenaUserData",
      "a.startedAt as arenaStartedAt",
    ]);
}

export async function findById(
  id: string
): Promise<DBGameViewWithArena | undefined> {
  return gameViewQuery().where("g.id", "=", id).executeTakeFirst();
}

export async function findByUserGameKey(
  key: UserGameKey
): Promise<DBGameViewWithArena | undefined> {
  return gameViewQuery()
    .where("g.userId", "=", key.userId)
    .where("g.gameKey", "=", key.gameKey)
    .where("g.identityProvider", "=", key.identityProvider)
    .where("g.isDaily", "=", key.isDaily)
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

export type GameType = "DAILY" | "PRACTICE" | "CUSTOM" | "ART";

export interface GameFilter extends Partial<UserKey> {
  type?: GameType;
  gameKey?: string;
  completedOnly?: boolean;
}

export async function findAllByFilter(
  filter: GameFilter
): Promise<DBGameView[]> {
  return pgDb
    .selectFrom("vGame")
    .where((eb) => {
      const conditions = [];
      if (filter.userId) {
        conditions.push(eb.eb("userId", "=", filter.userId));
      }
      if (filter.identityProvider) {
        conditions.push(
          eb.eb("identityProvider", "=", filter.identityProvider)
        );
      }
      if (filter.gameKey) {
        conditions.push(eb.eb("gameKey", "=", filter.gameKey));
      }
      if (filter.type === "DAILY") {
        conditions.push(eb.eb("isDaily", "=", true));
      }
      if (filter.type === "CUSTOM") {
        conditions.push(
          eb
            .eb("isDaily", "=", false)
            .and(eb.eb("gameKey", "like", "custom_%"))
            .and(
              eb.or([
                eb.eb("customIsArt", "is", null),
                eb.eb("customIsArt", "=", false),
              ])
            )
        );
      }
      if (filter.type === "ART") {
        conditions.push(
          eb
            .eb("isDaily", "=", false)
            .and(eb.eb("gameKey", "like", "custom_%"))
            .and(eb.eb("customIsArt", "=", true))
        );
      }
      if (filter.type === "PRACTICE") {
        conditions.push(
          eb
            .eb("isDaily", "=", false)
            .and(eb.not(eb.eb("gameKey", "like", "custom_%")))
        );
      }
      if (filter.completedOnly) {
        conditions.push(eb.eb("completedAt", "is not", null));
      }
      return eb.and(conditions);
    })
    .selectAll()
    .execute();
}

export async function insertAll(games: DBGameInsert[]) {
  await pgDb.insertInto("game").values(games).execute();
}

// for migration - framedl classic overwrites openframedl games, but we keep them as "random" games
export async function updateToRandom(games: UserGameKey[]) {
  const dailyGames = games.filter((g) => g.isDaily);
  if (dailyGames.length === 0) {
    return;
  }
  await pgDb
    .updateTable("game")
    .set({ isDaily: false })
    .where((db) =>
      db.or(
        dailyGames.map((g) =>
          db.and([
            db.eb("userId", "=", g.userId),
            db.eb("identityProvider", "=", g.identityProvider),
            db.eb("isDaily", "=", true),
          ])
        )
      )
    )
    .execute();
}

const LEADERBOARD_SIZE = 50;
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
  userData: UserData | null;
}

type BaseLeaderboardMetadata = {
  final: boolean;
  identityProvider: GameIdentityProvider;
};
export type DateRangeLeaderboardMetadata = BaseLeaderboardMetadata & {
  type: "DATE_RANGE";
  date: string;
  days: number;
};
export type TopNLeaderboardMetadata = BaseLeaderboardMetadata & {
  type: "TOP_N";
  topN: number;
};
export type LeaderboardMetadata =
  | DateRangeLeaderboardMetadata
  | TopNLeaderboardMetadata;

export interface Leaderboard {
  entries: LeaderboardDataItem[];
  metadata: LeaderboardMetadata;
}

export async function loadLeaderboard(
  identityProvider: GameIdentityProvider,
  date: string,
  days?: number
): Promise<Leaderboard> {
  const entries = await loadLeaderboardEntries(identityProvider, date, days);
  return {
    entries,
    metadata: {
      type: "DATE_RANGE",
      date,
      final: date < getDailyGameKey(new Date()),
      days: days || DEFAULT_LEADERBOARD_DAYS,
      identityProvider,
    },
  };
}

export async function loadTopNLeaderboard(
  identityProvider: GameIdentityProvider,
  topN: number
): Promise<Leaderboard> {
  const entries = await loadTopNLeaderboardEntries(identityProvider, topN);
  return {
    entries,
    metadata: {
      type: "TOP_N",
      final: true,
      topN,
      identityProvider,
    },
  };
}

function getExcludeUserIds(identityProvider: GameIdentityProvider): string[] {
  return EXCLUDED_USERS.map((u) => u.split(":"))
    .filter((u) => u[0]! === identityProvider)
    .map((u) => u[1]!);
}

export async function loadLeaderboardEntries(
  identityProvider: GameIdentityProvider,
  date: string,
  days?: number
): Promise<LeaderboardDataItem[]> {
  const toDate = new Date(date);
  const leaderboardDays = days || DEFAULT_LEADERBOARD_DAYS;
  const fromDate = addDaysToDate(toDate, -leaderboardDays + 1);
  const toDateString = getDailyGameKey(toDate);
  const fromDateString = getDailyGameKey(fromDate);

  const seriesTable = sql<GameKeyCTE>`
    (select
      to_char(generate_series, 'YYYY-MM-DD') as game_key,
      ui.user_id,
      ui.identity_provider
    from
      generate_series(${fromDateString}::timestamp with time zone, ${toDateString}::timestamp with time zone, '1 day'),
      (select user_id, identity_provider from game group by 1, 2) as ui)`;

  const excludedUserIds = getExcludeUserIds(identityProvider);

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
      s
        .selectFrom("game as mg")
        .select("mg.userData")
        .where("mg.userId", "=", s.ref("gk.userId"))
        .where("mg.identityProvider", "=", s.ref("gk.identityProvider"))
        .where("mg.isDaily", "=", true)
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

export async function loadTopNLeaderboardEntries(
  identityProvider: GameIdentityProvider,
  topN: number
): Promise<LeaderboardDataItem[]> {
  const excludedUserIds: string[] = EXCLUDED_USERS.map((u) => u.split(":"))
    .filter((u) => u[0]! === identityProvider)
    .map((u) => u[1]!);

  const cutOff = Math.floor(topN / 10);

  const results = await pgDb
    .with("guess_count", (db) =>
      db
        .selectFrom("game")
        .select((db) => [
          "userId",
          "identityProvider",
          "status",
          db
            .case()
            .when("status", "=", "WON")
            .then(db.ref("guessCount"))
            .else(LOST_PENALTY)
            .end()
            .as("guessCount"),
        ])
        .where("isDaily", "=", true)
        .where((db) =>
          db.or([db.eb("status", "=", "WON"), db.eb("status", "=", "LOST")])
        )
    )
    .with("ranked_guess_count", (db) =>
      db
        .selectFrom("guess_count")
        .select((db) => [
          "userId",
          "identityProvider",
          "status",
          "guessCount",
          sql<number>`row_number() over (partition by user_id, identity_provider order by guess_count asc)`.as(
            "rank"
          ),
        ])
    )
    .with("last_daily_game", (db) =>
      db
        .selectFrom("game")
        .select((db) => [
          "userId",
          "identityProvider",
          "isDaily",
          db.fn.max("gameKey").as("gameKey"),
        ])
        .where("isDaily", "=", true)
        .groupBy(["userId", "identityProvider", "isDaily"])
    )
    .with("fresh_user_data", (db) =>
      db
        .selectFrom("game as g")
        .innerJoin("last_daily_game as ldg", (join) =>
          join
            .onRef("g.userId", "=", "ldg.userId")
            .onRef("g.identityProvider", "=", "ldg.identityProvider")
            .onRef("g.gameKey", "=", "ldg.gameKey")
            .onRef("g.isDaily", "=", "ldg.isDaily")
        )
        .select(["g.userId", "g.identityProvider", "g.userData"])
        .where("g.isDaily", "=", true)
    )
    .selectFrom("ranked_guess_count as rgc")
    .select((db) => [
      "rgc.userId",
      "rgc.identityProvider",
      db
        .selectFrom("fresh_user_data as fud")
        .select("fud.userData")
        .where("fud.identityProvider", "=", db.ref("rgc.identityProvider"))
        .where("fud.userId", "=", db.ref("rgc.userId"))
        .as("userData"),
      db.fn
        .sum<number>(
          db.case().when("rgc.status", "=", "WON").then(1).else(0).end()
        )
        .as("wonCount"),
      db.fn
        .sum<number>(
          db.case().when("rgc.status", "=", "LOST").then(1).else(0).end()
        )
        .as("lostCount"),
      db.fn
        .sum<number>(
          db
            .case()
            .when("rgc.status", "=", "WON")
            .then(db.ref("rgc.guessCount"))
            .else(0)
            .end()
        )
        .as("wonGuessCount"),
      db.eb
        .parens(sql.val(topN), "-", db.fn.count<number>("rgc.guessCount"))
        .as("unplayedCount"),
      db
        .eb(
          db.fn.sum<number>(db.ref("rgc.guessCount")),
          "+",
          db.eb(
            db.eb.parens(
              sql.val(topN),
              "-",
              db.fn.count<number>("rgc.guessCount")
            ),
            "*",
            UNPLAYED_PENALTY
          )
        )
        .as("totalGuessCount"),
    ])
    .where("rgc.rank", "<=", topN + cutOff)
    .where("rgc.rank", ">", cutOff)
    .where((x) =>
      excludedUserIds.length > 0
        ? x.and([
            x.eb("rgc.identityProvider", "=", identityProvider),
            x.eb("rgc.userId", "not in", excludedUserIds),
          ])
        : x.eb("rgc.identityProvider", "=", identityProvider)
    )
    .groupBy(["rgc.userId", "rgc.identityProvider"])
    // .having((db) => db.eb(db.fn.count("guessCount"), "=", topN))
    .orderBy(["totalGuessCount asc", "wonCount desc", "userId asc"])
    .limit(LEADERBOARD_SIZE)
    .execute();

  return results;
}

export async function findUserData(key: UserKey) {
  const res = await pgDb
    .selectFrom("game")
    .select("userData")
    .where("userId", "=", key.userId)
    .where("identityProvider", "=", key.identityProvider)
    .where("isDaily", "=", true)
    .orderBy("gameKey", "desc")
    .limit(1)
    .executeTakeFirst();
  return res?.userData;
}

// export async function findStreaks(key: UserKey) {
//   /**
//    * with game_date as (
//   select
//     user_id,
//     identity_provider,
//     game_key::date,
//     row_number() over (partition by user_id order by game_key) as seqn
//   from
//     game
//   where is_daily and status = 'WON'
// )
// select
//   user_id,
//   (select user_data->'username' from game where user_id = t.user_id and is_daily and game_key::date = max(t.game_key)) as username,
//   max(game_key) - min(game_key) + 1 as streak,
//   min(game_key),
//   max(game_key)
// from game_date t
// group by user_id, game_key - seqn * interval '1 day'
// order by 3 desc;
//    */
//   pgDb
//     .with("game_date", (db) =>
//       db
//         .selectFrom("game")
//         .select((db) => [
//           "userId",
//           "identityProvider",
//           db.cast("gameKey", "date").as("gameKey"),
//           sql<number>`row_number() over (partition by user_id order by game_key)`.as(
//             "seqn"
//           ),
//         ])
//         .where("isDaily", "=", true)
//         .where("status", "=", "WON")
//     )
//     .selectFrom("game_date as gd")
//     .select((db) => [
//       "gd.userId",
//       sql<number>`max(game_key) - min(game_key) + 1`.as("streak"),
//       db.fn.min("gd.gameKey").as("streakStart"),
//       db.fn.max("gd.gameKey").as("streakEnd"),
//     ])
//     .groupBy(["gd.userId", sql<Date>`gd.gameKey - gd.seqn * interval '1 day'`]);
// }

export async function loadRanking(
  identityProvider: GameIdentityProvider,
  {
    limit,
    signedUpOnly,
    cutOffDate,
  }: { limit: number; signedUpOnly?: boolean; cutOffDate?: string }
) {
  const excludedUserIds = getExcludeUserIds(identityProvider);
  const ranking = await pgDb
    .with("gc_game", (db) =>
      db
        .selectFrom("game")
        .where("status", "in", ["WON", "LOST"])
        .where("isDaily", "=", true)
        .where((x) =>
          cutOffDate ? x.eb("gameKey", "<", cutOffDate) : x.and([])
        )
        .select((db) => [
          "status",
          "userId",
          "identityProvider",
          "gameKey",
          db
            .case()
            .when("status", "=", "WON")
            .then(db.ref("guessCount"))
            .else(LOST_PENALTY)
            .end()
            .as("guessCount"),
        ])
    )
    .with("ranked_game", (db) =>
      db
        .selectFrom("gc_game")
        .select([
          sql<number>`row_number() over (partition by user_id, identity_provider order by guess_count asc, game_key asc)`.as(
            "rank"
          ),
          "status",
          "userId",
          "identityProvider",
          "gameKey",
          "guessCount",
        ])
    )
    .with("max_rank", (db) =>
      db
        .selectFrom("ranked_game")
        .groupBy(["userId", "identityProvider"])
        .select((db) => [
          "userId",
          "identityProvider",
          db.fn.max("rank").as("maxRank"),
        ])
    )
    .with("filtered_ranked_game", (db) =>
      db
        .selectFrom("ranked_game as rg")
        .innerJoin("max_rank as mr", (join) =>
          join
            .onRef("mr.userId", "=", "rg.userId")
            .onRef("mr.identityProvider", "=", "rg.identityProvider")
        )
        .select([
          "rg.rank",
          "rg.status",
          "rg.userId",
          "rg.identityProvider",
          "rg.gameKey",
          "rg.guessCount",
          "mr.maxRank",
          sql<boolean>`rg.rank >= max_rank / 10 and rg.rank < (max_rank - max_rank / 10)`.as(
            "included"
          ),
        ])
    )
    .with("last_daily_game", (db) =>
      db
        .selectFrom("game")
        .select((db) => [
          "userId",
          "identityProvider",
          "isDaily",
          db.fn.max("gameKey").as("gameKey"),
        ])
        .where("isDaily", "=", true)
        .groupBy(["userId", "identityProvider", "isDaily"])
    )
    .with("fresh_user_data", (db) =>
      db
        .selectFrom("game as g")
        .innerJoin("last_daily_game as ldg", (join) =>
          join
            .onRef("g.userId", "=", "ldg.userId")
            .onRef("g.identityProvider", "=", "ldg.identityProvider")
            .onRef("g.gameKey", "=", "ldg.gameKey")
            .onRef("g.isDaily", "=", "ldg.isDaily")
        )
        .select(["g.userId", "g.identityProvider", "g.userData"])
        .where("g.isDaily", "=", true)
    )
    .with("signup", (db) =>
      db
        .selectFrom("championshipSignup")
        .select(["userId", "identityProvider", sql<boolean>`bool_or(has_ticket)`.as("hasTicket")])
        .groupBy(["userId", "identityProvider"])
    )
    .selectFrom("filtered_ranked_game as frg")
    .leftJoin("signup as s", (join) =>
      join
        .onRef("frg.userId", "=", "s.userId")
        .onRef("frg.identityProvider", "=", "s.identityProvider")
    )
    .select((db) => [
      "frg.userId",
      "frg.identityProvider",
      db.fn.sum("guessCount").as("totalGuessCount"),
      db.fn.count("guessCount").as("gameCount"),
      sql<number>`sum(guess_count)::decimal / count(*)`.as("averageGuessCount"),
      sql<number>`row_number() over (order by sum(guess_count)::decimal / (log(max_rank) * count(*)) asc, frg.user_id asc)`.as(
        "rank"
      ),
      "maxRank",
      sql<boolean>`s.user_id is not null`.as("signedUp"),
      's.hasTicket',
      sql<number>`sum(guess_count)::decimal / (log(max_rank) * count(*))`.as(
        "score"
      ),
      db
        .selectFrom("fresh_user_data as fud")
        .select("fud.userData")
        .where("fud.identityProvider", "=", db.ref("frg.identityProvider"))
        .where("fud.userId", "=", db.ref("frg.userId"))
        .as("userData"),
    ])
    .where("included", "=", true)
    .where("maxRank", ">", 1)
    .where((x) =>
      excludedUserIds.length > 0
        ? x.and([
            x.eb("frg.identityProvider", "=", identityProvider),
            x.eb("frg.userId", "not in", excludedUserIds),
          ])
        : x.eb("frg.identityProvider", "=", identityProvider)
    )
    .where((x) => (signedUpOnly ? x.eb("s.userId", "is not", null) : x.and([])))
    .groupBy(["frg.userId", "frg.identityProvider", "maxRank", "s.userId", "s.hasTicket"])
    // .orderBy(["averageGuessCount asc", "gameCount desc"])
    .orderBy(["score asc", "gameCount desc"])
    .limit(limit)
    .execute();
  return ranking;
}
