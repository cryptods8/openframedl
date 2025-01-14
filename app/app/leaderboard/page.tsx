import { getDailyGameKey } from "@/app/game/game-utils";
import { gameService } from "@/app/game/game-service";
import { NextServerPageProps } from "frames.js/next/types";
import { LeaderboardDataItem } from "@/app/game/game-pg-repository";
import { Button } from "@/app/ui/button/button";
import { GameIdentityProvider } from "@/app/game/game-repository";
import { LeaderboardEntry, LeaderboardEntryRow } from "./leaderboard-entry";
import { pgDb } from "@/app/db/pg/pg-db";
import { sql } from "kysely";
import { LeaderboardNav } from "./leaderboard-nav";

// interface LeaderboardEntry {
//   id: string;
//   username: string | null;
//   avatar: string | null;
//   wonCount: number;
//   totalGuessCount: number;
//   score: number;
//   avg: number;
//   pos: string;
//   highlighted: boolean;
// }

interface LeaderboardEntryWithTotalScore extends LeaderboardEntry {
  totalScore: number;
}

function entryToLeaderboardEntry(
  e: LeaderboardDataItem,
  highlighted: boolean,
  pos: string,
  days: number
): LeaderboardEntryWithTotalScore {
  return {
    id: e.userId,
    userId: e.userId,
    username: e.userData?.username ?? `!${e.userId}`,
    avatar: e.userData?.profileImage ?? null,
    value: e.wonCount,
    // totalGuessCount: e.totalGuessCount,
    totalScore: e.totalGuessCount,
    // score: e.totalGuessCount / days,
    score: e.wonCount > 0 ? e.wonGuessCount / e.wonCount : 0,
    pos,
    highlighted,
  };
}

type LeaderboardType = "SCORE" | "GAMES_WON" | "STREAK";

type LeaderboardEntries = (LeaderboardEntryWithTotalScore | null)[];

async function getStreakLeaderboardEntries({
  date,
  userId,
  ip,
}: {
  date: string;
  userId?: string;
  ip?: GameIdentityProvider;
}): Promise<LeaderboardEntries> {
  const entries = await pgDb
    .with("daily_game", (db) =>
      db
        .selectFrom("game as g")
        .select(["g.userId", "g.identityProvider", "g.gameKey"])
        .where("g.isDaily", "=", true)
        .where("g.gameKey", "<=", date)
        .where("g.status", "=", "WON")
    )
    .with("streak", (db) =>
      db
        .selectFrom("daily_game")
        .select([
          "userId",
          "identityProvider",
          "gameKey",
          sql<number>`(game_key::date - '2024-01-01'::date) - ROW_NUMBER() OVER (PARTITION BY user_id, identity_provider ORDER BY game_key::date)`.as(
            "streakGroup"
          ),
        ])
    )
    .with("streak_length", (db) =>
      db
        .selectFrom("streak")
        .select((s) => [
          "userId",
          "identityProvider",
          s.fn.countAll().as("streakLength"),
          s.fn.min("gameKey").as("streakStart"),
          s.fn.max("gameKey").as("streakEnd"),
        ])
        .groupBy(["userId", "identityProvider", "streakGroup"])
    )
    .selectFrom("streak_length as sl")
    .select((s) => [
      "sl.userId",
      "sl.identityProvider",
      "sl.streakEnd",
      s.ref("sl.streakLength").$castTo<number>().as("streakLength"),
      sql<number>`RANK() OVER (ORDER BY sl.streak_length DESC)`.as("pos"),
      s
        .selectFrom("game as mg")
        .select("mg.userData")
        .where("mg.userId", "=", s.ref("sl.userId"))
        .where("mg.identityProvider", "=", s.ref("sl.identityProvider"))
        .where("mg.isDaily", "=", true)
        .where("mg.gameKey", "=", s.ref("sl.streakEnd"))
        .as("userData"),
    ])
    .where("sl.identityProvider", "=", ip ?? "fc")
    .orderBy("sl.streakLength", "desc")
    .limit(100)
    .execute();

  return entries.reduce((acc, e, idx) => {
    const entry = {
      id: `${e.userId}-${e.streakEnd}`,
      userId: e.userId,
      username: e.userData?.username ?? `!${e.userId}`,
      avatar: e.userData?.profileImage ?? null,
      value: e.streakLength,
      totalScore: e.streakLength,
      pos: `${e.pos}`,
      highlighted: userId === e.userId,
    };
    acc.push(entry);
    return acc;
  }, [] as LeaderboardEntries);
}

async function getGamesWonLeaderboardEntries({
  date,
  userId,
  ip,
}: {
  date: string;
  userId?: string;
  ip?: GameIdentityProvider;
}): Promise<LeaderboardEntries> {
  const entries = await pgDb
    .selectFrom("game as g")
    .select((db) => [
      "g.userId",
      db.fn.countAll().$castTo<number>().as("gamesWon"),
      db
        .selectFrom("game as mg")
        .select("mg.userData")
        .where("mg.userId", "=", db.ref("g.userId"))
        .where("mg.identityProvider", "=", db.ref("g.identityProvider"))
        .where("mg.isDaily", "=", true)
        .where("mg.gameKey", "=", db.fn.max("g.gameKey"))
        .as("userData"),
    ])
    .where("g.identityProvider", "=", ip ?? "fc")
    .where("g.isDaily", "=", true)
    .where("g.gameKey", "<=", date)
    .where("g.status", "=", "WON")
    .groupBy("g.userId")
    .groupBy("g.identityProvider")
    .orderBy("gamesWon", "desc")
    .limit(100)
    .execute();
  return entries.reduce((acc, e, idx) => {
    const prevE = acc[idx - 1];
    const entry = {
      id: e.userId,
      userId: e.userId,
      username: e.userData?.username ?? `!${e.userId}`,
      avatar: e.userData?.profileImage ?? null,
      value: e.gamesWon,
      totalScore: e.gamesWon,
      pos: prevE && prevE.totalScore === e.gamesWon ? prevE.pos : `${idx + 1}`,
      highlighted: userId === e.userId,
    };
    acc.push(entry);
    return acc;
  }, [] as LeaderboardEntries);
}

async function getScoreLeaderboardEntries({
  days,
  date,
  userId,
  ip,
}: {
  days: number;
  date: string;
  userId?: string;
  ip?: GameIdentityProvider;
}): Promise<LeaderboardEntries> {
  const leaderboard = await gameService.loadLeaderboard(ip ?? "fc", {
    userId: userId,
    date,
    days,
    type: "DATE_RANGE",
  });
  const { entries, found } = leaderboard.entries.reduce(
    (acc, e, idx) => {
      const prevE = acc.entries[idx - 1];
      const found = userId === e.userId;
      const entry = entryToLeaderboardEntry(
        e,
        found,
        prevE && prevE.totalScore === e.totalGuessCount
          ? prevE.pos
          : `${idx + 1}`,
        days
      );
      acc.entries.push(entry);
      acc.found = acc.found || found;
      return acc;
    },
    { entries: [], found: false } as {
      entries: (LeaderboardEntryWithTotalScore | null)[];
      found: boolean;
    }
  );
  if (userId && !found && leaderboard.personalEntry) {
    entries.push(null);
    entries.push(
      entryToLeaderboardEntry(leaderboard.personalEntry, true, "X", days)
    );
  }
  return entries;
}

export default async function LeaderboardPage({
  searchParams,
}: NextServerPageProps) {
  const typeParam = searchParams?.type as LeaderboardType | undefined;
  const userIdParam = searchParams?.uid as string | undefined;
  const dateParam = searchParams?.date as string | undefined;
  const daysParam = searchParams?.days as string | undefined;
  const gameHref = searchParams?.gh as string | undefined;
  const ipParam = searchParams?.ip as GameIdentityProvider | undefined;

  let entries: LeaderboardEntries;
  const date = dateParam ?? getDailyGameKey(new Date());
  if (typeParam === "GAMES_WON") {
    entries = await getGamesWonLeaderboardEntries({
      date,
      userId: userIdParam,
      ip: ipParam,
    });
  } else if (typeParam === "STREAK") {
    entries = await getStreakLeaderboardEntries({
      date,
      userId: userIdParam,
      ip: ipParam,
    });
  } else {
    const days = daysParam != null ? parseInt(daysParam, 10) : 14;

    entries = await getScoreLeaderboardEntries({
      days,
      date,
      userId: userIdParam,
      ip: ipParam,
    });
  }

  return (
    <div
      className={`w-full flex-1 max-w-screen-sm pt-4 px-4 sm:px-8 font-inter ${
        gameHref ? "pb-28" : "pb-8"
      }`}
    >
      <div className="w-full pb-6 pt-2 px-2 flex gap-2 items-center flex-wrap justify-between">
        <div className="font-space font-semibold text-xl">
          Framedl Leaderboard
        </div>
        <div className="text-sm text-primary-900/50">{date}</div>
      </div>
      <div className="mb-4 -mx-4 sm:-mx-2">
        <LeaderboardNav activeType={typeParam ?? "SCORE"} />
      </div>
      <div className="space-y-1">
        {entries.map((entry, idx) => {
          if (!entry) {
            return (
              <div key={idx} className="pt-1 pb-3">
                <div className="h-1 bg-primary-900/10 rounded-full w-full" />
              </div>
            );
          }
          return <LeaderboardEntryRow key={entry.id} entry={entry} />;
        })}
      </div>
      {gameHref && (
        <div className="fixed border-t border-primary-500/10 w-full bottom-0 left-0 right-0 bg-white/30 backdrop-blur-sm shadow-xl shadow-primary-500/10">
          <div className="flex items-center justify-center h-full p-4">
            <Button variant="outline" href={gameHref}>
              Back to Game
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
