"use client";

import { GameIdentityProvider, UserKey } from "@/app/game/game-repository";
import { LOST_PENALTY, UNPLAYED_PENALTY } from "@/app/game/game-constants";
import { primaryColor } from "@/app/image-ui/image-utils";
import { GameStatus } from "@/app/db/pg/types";
import { ClockIcon } from "@/app/image-ui/icons/ClockIcon";
import { CheckIcon } from "@/app/image-ui/icons/CheckIcon";
import { UserGroupIcon } from "@/app/image-ui/icons/UserGroupIcon";
import {
  determineAwaitingAudience,
  getArenaAvailabilityProperties,
  PublicArenaWithGames,
} from "@/app/games/arena/arena-utils";
import clsx from "clsx";
import { FireIcon } from "@heroicons/react/16/solid";

interface ArenaPlayerStats {
  user?: {
    username?: string | undefined;
    userId?: string | undefined;
    identityProvider?: GameIdentityProvider;
    profileImage?: string | undefined;
  };
  games: { guessCount: number; status: GameStatus; isHardMode: boolean }[];
  gamesPlayed: number;
  gamesCompleted: number;
  gamesWon: number;
  wonGuessCount: number;
  completedGuessCount: number;
  score: number;
  pos?: number;
  lastGameCompletedAt?: Date;
}

interface ArenaStats {
  players: ArenaPlayerStats[];
  gamesTotal: number;
}

const MAX_DISPLAYED_PLAYERS = 14;

const EMPTY_PLAYER: ArenaPlayerStats = {
  games: [],
  gamesPlayed: 0,
  gamesCompleted: 0,
  gamesWon: 0,
  wonGuessCount: 0,
  completedGuessCount: 0,
  score: 0,
};

function getArenaStats(arena: PublicArenaWithGames): ArenaStats {
  const gamesTotal = arena.config.wordCount;
  const { suddenDeathStatus } = getArenaAvailabilityProperties(arena);
  let games = arena.games;
  if (suddenDeathStatus?.isOver) {
    const { wordIndex } = suddenDeathStatus;
    games = games.filter(
      (g) => wordIndex == null || g.arenaWordIndex! <= wordIndex
    );
  }
  const { map } = games
    .sort((a, b) => a.arenaWordIndex! - b.arenaWordIndex!)
    .reduce(
      (acc, game) => {
        const playerKey = `${game.identityProvider}/${game.userId}`;
        let playerStats = acc.map[playerKey];
        if (!playerStats) {
          playerStats = {
            user: {
              userId: game.userId,
              identityProvider: game.identityProvider,
              username: game.userData?.username ?? undefined,
              profileImage: game.userData?.profileImage ?? undefined,
            },
            games: [],
            gamesPlayed: 0,
            gamesCompleted: 0,
            gamesWon: 0,
            wonGuessCount: 0,
            completedGuessCount: 0,
            score: 0,
          };
          acc.map[playerKey] = playerStats;
        }
        playerStats.gamesPlayed++;
        if (game.status === "WON") {
          playerStats.gamesWon++;
          playerStats.wonGuessCount += game.guessCount;
          playerStats.completedGuessCount += game.guessCount;
        } else if (game.status === "LOST") {
          playerStats.completedGuessCount += LOST_PENALTY;
        }
        if (game.completedAt) {
          const completedAt = new Date(game.completedAt);
          playerStats.gamesCompleted++;
          if (
            !playerStats.lastGameCompletedAt ||
            playerStats.lastGameCompletedAt < completedAt
          ) {
            playerStats.lastGameCompletedAt = completedAt;
          }
        }
        playerStats.games.push({
          guessCount: game.guessCount,
          status: game.status,
          isHardMode: game.isHardMode,
        });
        return acc;
      },
      {
        map: {},
      } as { map: Record<string, ArenaPlayerStats> }
    );

  const players = Object.values(map)
    .map((p) => {
      const totalGuessCount =
        (gamesTotal - p.gamesCompleted) * UNPLAYED_PENALTY +
        (p.gamesCompleted - p.gamesWon) * LOST_PENALTY +
        p.wonGuessCount;
      const score = totalGuessCount / gamesTotal;
      return {
        ...p,
        score,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (a.gamesCompleted !== b.gamesCompleted) {
        return a.gamesCompleted - b.gamesCompleted;
      }
      return a.lastGameCompletedAt! < b.lastGameCompletedAt!
        ? -1
        : a.lastGameCompletedAt! > b.lastGameCompletedAt!
        ? 1
        : 0;
    });

  for (let i = 0; i < players.length; i += 1) {
    const p = players[i]!;
    const pp = players[i - 1];
    p.pos = pp && pp.score === p.score ? pp.pos : i + 1;
  }

  const otherMembers = arena.members.filter(
    (m) =>
      players.find(
        (p) =>
          p.user?.userId === m.userId &&
          p.user.identityProvider === m.identityProvider
      ) == null && m.kickedAt == null
  );
  const { audience, freeSlots } = determineAwaitingAudience(arena);

  const allPlayers = [
    ...players,
    ...otherMembers.map((m) => ({
      ...EMPTY_PLAYER,
      user: m,
    })),
    ...audience.map((a) => ({
      ...EMPTY_PLAYER,
      user: a,
    })),
    ...Array.from({ length: freeSlots }).map(() => ({
      ...EMPTY_PLAYER,
    })),
  ];

  return {
    players: allPlayers, // .slice(0, 3),
    gamesTotal: arena.config.wordCount,
  };
}

function renderGameStats(
  p: ArenaPlayerStats,
  gamesTotal: number,
  withFiller?: boolean
) {
  const compact = false; //gamesTotal > 9;
  // const style = { gap: "0.5rem" } as React.CSSProperties;
  // if (compact) {
  //   style.maxWidth = "12rem";
  // }
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-1",
        withFiller ? "w-full" : ""
      )}
      // style={style}
    >
      {[
        Array.from({ length: gamesTotal }).map((_, idx) => {
          const g = p.games[idx];
          const itemStyle =
            g && g.status !== "IN_PROGRESS"
              ? g.status === "WON"
                ? {
                    color: "white",
                    backgroundColor: "green",
                    fontWeight: 500,
                  }
                : {
                    color: "white",
                    backgroundColor: "red",
                    fontWeight: 500,
                  }
              : {
                  color: primaryColor(0.54),
                  backgroundColor: primaryColor(0.12),
                };
          return (
            <div
              key={idx}
              className={`flex rounded items-center justify-center text-md relative ${
                compact ? "w-3 h-3" : "w-6 h-6"
              }`}
              style={
                compact && itemStyle.fontWeight
                  ? {
                      color: itemStyle.backgroundColor,
                      fontWeight: itemStyle.fontWeight,
                    }
                  : itemStyle
              }
            >
              {g && g.status !== "IN_PROGRESS"
                ? g.status === "WON"
                  ? g.guessCount
                  : "X"
                : g
                ? g.guessCount
                : "-"}
              {g && g.isHardMode && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 text-base flex items-center justify-center rounded-full"
                  style={{ backgroundColor: "orange" }}
                />
              )}
            </div>
          );
        }),
      ]}
      {withFiller && <Filler />}
    </div>
  );
}

function getStatusProps(status: "COMPLETED" | "PENDING" | "IN_PROGRESS") {
  if (status === "COMPLETED") {
    return {
      label: "Completed",
      color: "green",
      backgroundColor: "rgba(0, 255, 0, 0.16)",
      Icon: CheckIcon,
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      label: "In Progress",
      color: "orange",
      backgroundColor: "transparent",
      Icon: ClockIcon,
    };
  }
  return {
    label: "Waiting",
    color: primaryColor(0.54),
    backgroundColor: primaryColor(0.12),
    Icon: ClockIcon,
  };
}

function Score({ value }: { value: number }) {
  return (
    <div className="flex items-baseline">
      {value
        .toFixed(2)
        .split(".")
        .map((part, idx) =>
          idx === 0 ? (
            <span key={idx}>{part}</span>
          ) : (
            <span key={idx} className="text-sm text-primary-900/50">
              .{part}
            </span>
          )
        )}
    </div>
  );
}

function PlayerPosition({ player }: { player: ArenaPlayerStats }) {
  const { user, gamesCompleted, pos } = player;
  const isActive = user && gamesCompleted > 0 && pos != null;
  return (
    <div
      className="flex w-8 h-8 rounded-full items-center justify-center text-base"
      style={{
        flexShrink: 0,
        backgroundColor: isActive
          ? pos === 1
            ? primaryColor(0.84)
            : pos === 2
            ? primaryColor(0.64)
            : pos === 3
            ? primaryColor(0.48)
            : primaryColor(0.12)
          : primaryColor(0.06),
        color: isActive
          ? pos <= 3
            ? "white"
            : primaryColor()
          : primaryColor(0.54),
        fontWeight: 600,
        lineHeight: "1",
      }}
    >
      {isActive ? pos : "-"}
    </div>
  );
}

function Filler() {
  return (
    <div className="flex flex-1 overflow-hidden shrink">
      <div className="flex w-full pt-1 ml-3 bg-primary-900/10" />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "COMPLETED" | "PENDING" | "IN_PROGRESS";
}) {
  const { label, color, backgroundColor, Icon } = getStatusProps(status);
  return (
    <div className="flex items-center rounded-full text-lg" style={{ color }}>
      <div className="flex h-6 w-6">
        <Icon />
      </div>
      <div className="flex px-2 font-bold">{label}</div>
    </div>
  );
}

export function ArenaResults({
  arena,
  userKey,
}: {
  arena: PublicArenaWithGames;
  userKey?: UserKey;
}) {
  const { players: allPlayers, gamesTotal } = getArenaStats(arena);
  const { completionStatus, status } = getArenaAvailabilityProperties(
    arena,
    userKey
  );
  const players = allPlayers; // getDisplayedPlayers(allPlayers, userKey, page, pageSize);
  const imageSizeClass =
    players.length > 2 ? "w-12 h-12 text-3xl" : "w-16 h-16 text-4xl";
  function isCurrentUser(p: ArenaPlayerStats) {
    return (
      userKey &&
      p.user?.userId === userKey.userId &&
      p.user.identityProvider === userKey.identityProvider
    );
  }

  return (
    <div className="flex items-stretch w-full h-full">
      <div className="flex flex-col items-center w-full h-full relative gap-6">
        <div className="flex w-full items-center relative gap-x-4 gap-y-2 flex-wrap">
          {/* <ArenaTitle size="md" /> */}
          <div>
            {status === "ENDED" || completionStatus === "COMPLETED" ? (
              <StatusBadge status="COMPLETED" />
            ) : status === "PENDING" ? (
              <StatusBadge status="PENDING" />
            ) : (
              <StatusBadge status="IN_PROGRESS" />
            )}
          </div>
          <div className="flex items-center text-primary-900/50">
            <div className="flex h-6 w-6">
              <UserGroupIcon />
            </div>
            <div className="flex items-baseline px-2">
              <div className="flex font-bold">{arena.members.length}</div>
              <div className="flex text-sm">/{arena.config.audienceSize}</div>
            </div>
          </div>
          {arena.config.suddenDeath && (
            <div className="flex items-center flex-1">
              <div className="flex flex-1 w-full" />
              <div className="whitespace-nowrap flex gap-1 items-center">
                <FireIcon className="w-5 h-5" /> 
                <div>Sudden Death</div>
              </div>
            </div>
          )}
        </div>
        {allPlayers.length <= 3 ? (
          <div
            className={clsx(
              "flex w-full justify-center flex-1 items-center flex-wrap",
              players.length === 3 ? "gap-2" : "gap-4"
            )}
          >
            {players.map((p, idx) => (
              <div
                key={idx}
                className={clsx(
                  "flex flex-col rounded-md bg-white px-3 py-5 flex-1 relative border min-w-[240px]",
                  isCurrentUser(p)
                    ? "shadow-md border-primary-900/20"
                    : "border-transparent"
                )}
              >
                <div className="flex items-center w-full gap-3">
                  {p.user?.profileImage ? (
                    <img
                      src={p.user.profileImage}
                      className={clsx(
                        "object-cover rounded-md bg-white",
                        imageSizeClass
                      )}
                    />
                  ) : (
                    <div
                      className={clsx(
                        "flex items-center justify-center rounded-md bg-primary-900/10 text-primary-900/20 font-bold font-space",
                        imageSizeClass
                      )}
                    >
                      F
                    </div>
                  )}
                  <div
                    className={clsx(
                      "flex flex-1 flex-col gap-1",
                      p.user ? "opacity-100" : "opacity-50"
                    )}
                  >
                    <div className="flex w-full items-center">
                      <div className="flex overflow-hidden font-bold whitespace-nowrap text-ellipsis shrink-0">
                        {p.user?.username ??
                          (p.user && `!${p.user.userId}`) ??
                          "-"}
                      </div>
                      <Filler />
                    </div>

                    <div className="flex w-full items-center">
                      <Score
                        value={
                          p.gamesCompleted > 0
                            ? p.completedGuessCount / p.gamesCompleted
                            : 0
                        }
                      />
                      <Filler />
                    </div>
                  </div>
                </div>
                <div className="flex pt-3 w-full">
                  {renderGameStats(p, gamesTotal, true)}
                </div>
                <div className="flex absolute top-1 left-1 bg-white rounded-full shadow-md">
                  <PlayerPosition player={p} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col w-full flex-1 justify-center gap-4">
            {players.map((p, idx) => (
              <div
                className={clsx(
                  "flex w-full items-start gap-5",
                  isCurrentUser(p) ? "font-bold" : ""
                )}
                key={
                  p.user ? `${p.user.identityProvider}/${p.user.userId}` : idx
                }
              >
                <PlayerPosition player={p} />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-5">
                    {p.user && (
                      <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis shrink flex-1 gap-5">
                        <div className="max-w-[330px]">
                          {p.user.username ?? `!${p.user.userId}`}
                        </div>
                        <div className="flex flex-1 h-1 bg-primary-900/10" />
                      </div>
                    )}
                    {!p.user && (
                      <div className="flex flex-1 h-1 bg-primary-900/10" />
                    )}
                    {/* {p.user && (
                      <div className="flex justify-end w-10">
                        <Score
                          value={
                            p.gamesCompleted > 0
                              ? p.completedGuessCount / p.gamesCompleted
                              : 0
                          }
                        />
                      </div>
                    )} */}
                  </div>
                  {p.user && (
                    <div className="flex flex-1 shrink gap-0 items-start">
                      <div className="flex flex-1 shrink">
                        <div className="flex flex-1 h-1 bg-primary-900/10 mt-2.5" />
                        <div className="flex flex-1 max-w-5 shrink" />
                      </div>
                      {renderGameStats(p, gamesTotal)}
                      {/* <div className="flex shrink">
                        <div className="w-5" />
                        <div className="flex w-10 shrink h-1 bg-primary-900/10 mt-2.5" />
                      </div> */}
                                            <div className="flex justify-end ml-5 w-10">
                        <Score
                          value={
                            p.gamesCompleted > 0
                              ? p.completedGuessCount / p.gamesCompleted
                              : 0
                          }
                        />
                      </div>

                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
