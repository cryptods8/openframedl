import { sql } from "kysely";
import { pgDb } from "../db/pg/pg-db";
import { DBGame, DBGameInsert, DBGameUpdate, DBGameView } from "../db/pg/types";
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

export async function findById(id: string): Promise<DBGameView | undefined> {
  return pgDb
    .selectFrom("vGame")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function findByUserGameKey(
  key: UserGameKey
): Promise<DBGameView | undefined> {
  return pgDb
    .selectFrom("vGame")
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

export type GameType = "DAILY" | "RANDOM" | "CUSTOM";

export interface GameFilter extends Partial<UserKey> {
  type?: GameType;
  gameKey?: string;
  completedOnly?: boolean;
}

export async function findAllByFilter(filter: GameFilter): Promise<DBGame[]> {
  return pgDb
    .selectFrom("game")
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
          eb.eb("isDaily", "=", false).and(eb.eb("gameKey", "like", "custom_%"))
        );
      }
      if (filter.type === "RANDOM") {
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
  maxGameKey: string | null;
  userData: UserData | null;
}

export interface Leaderboard {
  entries: LeaderboardDataItem[];
  date: string;
  days: number;
  final: boolean;
  identityProvider: GameIdentityProvider;
}

export async function loadLeaderboard(
  identityProvider: GameIdentityProvider,
  date: string,
  days?: number
): Promise<Leaderboard> {
  const entries = await loadLeaderboardEntries(identityProvider, date, days);
  return {
    entries,
    date,
    final: date < getDailyGameKey(new Date()),
    days: days || DEFAULT_LEADERBOARD_DAYS,
    identityProvider,
  };
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
