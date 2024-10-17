import { NextRequest, NextResponse } from "next/server";
import {
  determineAwaitingAudience,
  getArenaAvailabilityProperties,
} from "../../../arena-utils";
import { GameIdentityProvider, UserKey } from "@/app/game/game-repository";
import {
  ArenaWithGames,
  findArenaWithGamesById,
} from "@/app/game/arena-pg-repository";
import { LOST_PENALTY, UNPLAYED_PENALTY } from "@/app/game/game-constants";
import { primaryColor } from "@/app/image-ui/image-utils";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import { ArenaTitle } from "@/app/image-ui/arena/arena-title";
import { createImageResponse } from "@/app/utils/image-response";
import { options } from "@/app/generate-image";
import { GameStatus } from "@/app/db/pg/types";
import { ClockIcon } from "@/app/image-ui/icons/ClockIcon";
import { CheckIcon } from "@/app/image-ui/icons/CheckIcon";

export const dynamic = "force-dynamic";

interface ArenaPlayerStats {
  user?: {
    username?: string | undefined;
    userId?: string | undefined;
    identityProvider?: GameIdentityProvider;
    profileImage?: string | undefined;
  };
  games: { guessCount: number; status: GameStatus }[];
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

function getArenaStats(arena: ArenaWithGames): ArenaStats {
  const gamesTotal = arena.config.words.length;
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
          playerStats.gamesCompleted++;
          if (
            !playerStats.lastGameCompletedAt ||
            playerStats.lastGameCompletedAt < game.completedAt
          ) {
            playerStats.lastGameCompletedAt = game.completedAt;
          }
        }
        playerStats.games.push({
          guessCount: game.guessCount,
          status: game.status,
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
      ) === undefined
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
    players: allPlayers,
    gamesTotal: arena.config.words.length,
  };
}

function getDisplayedPlayers(
  players: ArenaPlayerStats[],
  userKey?: UserKey
): ArenaPlayerStats[] {
  if (players.length <= MAX_DISPLAYED_PLAYERS) {
    return players;
  }
  const userResultIdx = players.findIndex(
    (p) =>
      p.user?.userId === userKey?.userId &&
      p.user?.identityProvider === userKey?.identityProvider
  );
  const userResult = players[userResultIdx];
  if (!userResult || userResultIdx < MAX_DISPLAYED_PLAYERS) {
    return players.slice(0, MAX_DISPLAYED_PLAYERS);
  }
  return [
    ...players.slice(0, MAX_DISPLAYED_PLAYERS - 2),
    { ...EMPTY_PLAYER },
    userResult,
  ];
}

function renderGameStats(
  p: ArenaPlayerStats,
  gamesTotal: number,
  withFiller?: boolean
) {
  return (
    <div
      tw={`flex flex-wrap items-center ${withFiller ? "w-full" : ""}`}
      style={{ gap: "0.5rem" }}
    >
      {[
        Array.from({ length: gamesTotal }).map((_, idx) => {
          const g = p.games[idx];
          return (
            <div
              key={idx}
              tw="flex w-12 h-12 rounded items-center justify-center text-3xl"
              style={
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
                    }
              }
            >
              {g && g.status !== "IN_PROGRESS"
                ? g.status === "WON"
                  ? g.guessCount
                  : "X"
                : g
                ? g.guessCount
                : "-"}
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
      backgroundColor: "white",
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
    <div tw="flex items-end">
      {value
        .toFixed(2)
        .split(".")
        .map((part, idx) =>
          idx === 0 ? (
            <span key={idx}>{part}</span>
          ) : (
            <span key={idx} tw="text-2xl" style={{ color: primaryColor(0.54) }}>
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
      tw="flex w-14 h-14 rounded-full items-center justify-center text-3xl"
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
    <div tw="flex flex-1 overflow-hidden" style={{ flexShrink: 1 }}>
      <div
        tw="flex w-full pt-2 ml-6"
        style={{ backgroundColor: primaryColor(0.08) }}
      />
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
    <div
      tw="flex items-center rounded-full text-3xl p-2"
      style={{ color, backgroundColor }}
    >
      <div tw="flex h-12 w-12">
        <Icon />
      </div>
      <div tw="flex px-4 font-bold">{label}</div>
    </div>
  );
}

function Image({
  arena,
  userKey,
}: {
  arena: ArenaWithGames;
  userKey?: UserKey;
}) {
  const { players: allPlayers, gamesTotal } = getArenaStats(arena);
  const { completionStatus, status } = getArenaAvailabilityProperties(
    arena,
    userKey
  );
  const players = getDisplayedPlayers(allPlayers, userKey);
  const imageSizeClass =
    players.length > 2 ? "w-24 h-24 text-7xl" : "w-32 h-32 text-8xl";
  function isCurrentUser(p: ArenaPlayerStats) {
    return (
      userKey &&
      p.user?.userId === userKey.userId &&
      p.user.identityProvider === userKey.identityProvider
    );
  }

  return (
    <BasicLayout>
      <div
        tw="flex flex-col items-center w-full h-full relative"
        style={{ backgroundColor: primaryColor(0.04), color: primaryColor() }}
      >
        <div
          tw="flex w-full items-center px-20 relative"
          style={{ gap: "2rem" }}
        >
          <ArenaTitle size="md" />
          <div tw="flex">
            {status === "ENDED" || completionStatus === "COMPLETED" ? (
              <StatusBadge status="COMPLETED" />
            ) : status === "PENDING" ? (
              <StatusBadge status="PENDING" />
            ) : (
              <StatusBadge status="IN_PROGRESS" />
            )}
          </div>
        </div>
        {players.length <= 3 ? (
          <div
            tw="flex w-full justify-center px-16 pt-12 pb-20 flex-1 items-center"
            style={{ gap: players.length === 3 ? "1rem" : "3rem" }}
          >
            {players.map((p, idx) => (
              <div
                key={idx}
                tw={`flex flex-col rounded-xl bg-white px-6 py-10 flex-1 relative border ${
                  isCurrentUser(p) ? "shadow-xl" : ""
                }`}
                style={{
                  borderColor: isCurrentUser(p)
                    ? primaryColor(0.24)
                    : "transparent",
                }}
              >
                <div tw="flex items-center w-full" style={{ gap: "1.5rem" }}>
                  {p.user?.profileImage ? (
                    <img
                      src={p.user.profileImage}
                      tw={`${imageSizeClass} rounded-lg bg-white`}
                    />
                  ) : (
                    <div
                      tw={`${imageSizeClass} items-center justify-center rounded-lg`}
                      style={{
                        fontFamily: "SpaceGrotesk",
                        fontWeight: 700,
                        color: primaryColor(0.24),
                        backgroundColor: primaryColor(0.12),
                      }}
                    >
                      F
                    </div>
                  )}
                  <div
                    tw="flex flex-1 flex-col"
                    style={{ gap: "0.5rem", opacity: p.user ? 1 : 0.5 }}
                  >
                    <div tw="flex w-full items-center">
                      <div
                        tw="flex overflow-hidden"
                        style={{
                          flexShrink: 1,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          fontWeight: 600,
                        }}
                      >
                        {p.user?.username ??
                          (p.user && `!${p.user.userId}`) ??
                          "-"}
                      </div>
                      <Filler />
                    </div>

                    <div tw="flex w-full items-center">
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
                <div tw="flex pt-6 w-full">
                  {renderGameStats(p, gamesTotal, true)}
                </div>
                <div tw="flex absolute top-2 left-2 bg-white rounded-full shadow-xl">
                  <PlayerPosition player={p} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            tw="flex flex-col w-full p-16 flex-1 justify-center"
            style={{ gap: "0.75rem" }}
          >
            {players.map((p, idx) => (
              <div
                tw="flex w-full items-center"
                key={
                  p.user ? `${p.user.identityProvider}/${p.user.userId}` : idx
                }
                style={{
                  gap: "3rem",
                  fontWeight: isCurrentUser(p) ? 700 : 400,
                }}
              >
                <PlayerPosition player={p} />
                {p.user && (
                  <div
                    tw="flex overflow-hidden"
                    style={{
                      flexShrink: 1,
                      maxWidth: "330px",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.user.username ?? `!${p.user.userId}`}
                  </div>
                )}
                <div
                  tw="flex flex-1 pt-2"
                  style={{ backgroundColor: primaryColor(0.12) }}
                />
                {p.user && (
                  <div tw="flex">{renderGameStats(p, gamesTotal)}</div>
                )}
                {p.user && (
                  <div tw="flex justify-end" style={{ width: "80px" }}>
                    <Score
                      value={
                        p.gamesCompleted > 0
                          ? p.completedGuessCount / p.gamesCompleted
                          : 0
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {arena.config.suddenDeath && (
          <div
            tw="flex items-center absolute bottom-12 left-20 right-20"
            style={{ gap: "2rem" }}
          >
            <div
              tw="flex flex-1 w-full h-2"
              style={{ backgroundColor: primaryColor(0.12) }}
            />
            <div>🔥 Sudden Death</div>
            <div
              tw="flex flex-1 w-full h-2"
              style={{ backgroundColor: primaryColor(0.12) }}
            />
          </div>
        )}
      </div>
    </BasicLayout>
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Record<string, string | undefined> }
) {
  const { arenaId } = ctx.params;
  const userId = req.nextUrl.searchParams.get("uid") as string | undefined;
  const identityProvider = req.nextUrl.searchParams.get("ip") as
    | GameIdentityProvider
    | undefined;

  const userKey =
    userId && identityProvider ? { userId, identityProvider } : undefined;

  const arena = await findArenaWithGamesById(parseInt(arenaId!, 10));
  if (!arena) {
    return NextResponse.json({ error: "Arena not found" }, { status: 404 });
  }

  const { completionStatus } = getArenaAvailabilityProperties(arena, userKey);

  let imageOptions = {};
  if (arena.config.audienceSize > 6) {
    imageOptions = {
      width: 1200,
      height: 1200,
    };
  }

  const resp = createImageResponse(
    <Image arena={arena} userKey={userKey} />,
    imageOptions
  );

  if (completionStatus === "IN_PROGRESS") {
    resp.headers.set("cache-control", "public, max-age=60");
  } else if (completionStatus === "NOT_STARTED") {
    resp.headers.set("cache-control", "public, max-age=600");
  }
  return resp;
}
