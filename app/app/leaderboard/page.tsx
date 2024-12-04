import { getDailyGameKey } from "@/app/game/game-utils";
import { gameService } from "@/app/game/game-service";
import { NextServerPageProps } from "frames.js/next/types";
import { Avatar } from "@/app/ui/avatar";
import { LeaderboardDataItem } from "@/app/game/game-pg-repository";
import { Button } from "@/app/ui/button/button";
import { GameIdentityProvider } from "@/app/game/game-repository";

interface LeaderboardEntry {
  id: string;
  username: string | null;
  avatar: string | null;
  wonCount: number;
  totalGuessCount: number;
  score: number;
  avg: number;
  pos: string;
  highlighted: boolean;
}

function Score({ score }: { score: number }) {
  const parts = score.toFixed(2).split(".");
  return (
    <div className="flex items-baseline">
      <div>{parts[0]}</div>
      <div className="opacity-50 text-xs">.{parts[1]}</div>
    </div>
  );
}

function entryToLeaderboardEntry(
  e: LeaderboardDataItem,
  highlighted: boolean,
  pos: string,
  days: number
) {
  return {
    id: e.userId,
    username: e.userData?.username ?? `!${e.userId}`,
    avatar: e.userData?.profileImage ?? null,
    wonCount: e.wonCount,
    totalGuessCount: e.totalGuessCount,
    score: e.totalGuessCount / days,
    avg: e.wonCount > 0 ? e.wonGuessCount / e.wonCount : 0,
    pos,
    highlighted,
  };
}

export default async function LeaderboardPage({
  searchParams,
}: NextServerPageProps) {
  const userIdParam = searchParams?.uid as string | undefined;
  const dateParam = searchParams?.date as string | undefined;
  const daysParam = searchParams?.days as string | undefined;
  const gameHref = searchParams?.gh as string | undefined;
  const ipParam = searchParams?.ip as GameIdentityProvider | undefined;

  const days = daysParam != null ? parseInt(daysParam, 10) : 14;
  const date = dateParam ?? getDailyGameKey(new Date());
  const leaderboard = await gameService.loadLeaderboard(ipParam ?? "fc", {
    userId: userIdParam,
    date,
    days,
    type: "DATE_RANGE",
  });
  const { entries, found } = leaderboard.entries.reduce(
    (acc, e, idx) => {
      const prevE = acc.entries[idx - 1];
      const found = userIdParam === e.userId;
      const entry = entryToLeaderboardEntry(
        e,
        found,
        prevE && prevE.totalGuessCount === e.totalGuessCount
          ? prevE.pos
          : `${idx + 1}`,
        days
      );
      acc.entries.push(entry);
      acc.found = acc.found || found;
      return acc;
    },
    { entries: [], found: false } as {
      entries: (LeaderboardEntry | null)[];
      found: boolean;
    }
  );
  if (userIdParam && !found && leaderboard.personalEntry) {
    entries.push(null);
    entries.push(
      entryToLeaderboardEntry(leaderboard.personalEntry, true, "X", days)
    );
  }
  return (
    <div
      className={`w-full flex-1 max-w-xl pt-4 px-4 font-inter ${gameHref ? "pb-28" : "pb-8"}`}
    >
      <div className="w-full pb-4">
        <div className="font-space font-semibold text-xl">
          Framedl Leaderboard
        </div>
        <div className="text-sm text-primary-900/50">{date}</div>
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
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-5 py-2 px-3 w-full ${
                entry.highlighted
                  ? "font-bold rounded bg-primary-500 text-white"
                  : ""
              }`}
            >
              <div
                className={`w-6 h-6 text-sm rounded bg-primary-900/10 flex items-center justify-center shrink-0 ${
                  entry.pos === "1"
                    ? "bg-primary-900/80 text-white"
                    : entry.pos === "2"
                    ? "bg-primary-900/60 text-white"
                    : entry.pos === "3"
                    ? "bg-primary-900/40 text-white"
                    : "bg-primary-900/10"
                }`}
              >
                {entry.pos}
              </div>
              <div className="shrink-0">
                <Avatar avatar={entry.avatar} username={entry.username} />
              </div>
              <div className="shrink truncate overflow-hidden">
                {entry.username}
              </div>
              <div
                className={`flex-1 h-1 rounded-full ${
                  entry.highlighted ? "bg-white/20" : "bg-primary-900/10"
                }`}
              />
              <div className="font-mono">{entry.wonCount}</div>
              <div className="w-8 flex justify-end font-mono">
                <Score score={entry.avg} />
              </div>
            </div>
          );
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
