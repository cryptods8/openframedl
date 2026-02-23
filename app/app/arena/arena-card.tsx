"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/ui/card";
import { Badge } from "@/app/ui/badge";
import { Button } from "@/app/ui/button/button";
import { Avatar } from "@/app/ui/avatar";
import {
  ClockIcon,
  UsersIcon,
  PuzzlePieceIcon as TargetIcon,
  TrophyIcon,
  PlayIcon,
} from "@heroicons/react/16/solid";
import { PublicArena } from "@/app/games/arena/arena-utils";
import { PublicArenaListItem } from "@/app/api/arenas/list/route";
import { formatDurationSimple } from "@/app/game/game-utils";
import clsx from "clsx";

function Filler() {
  return <div className="flex-1 w-full bg-primary-900/5 h-1" />;
}

function StatusLine({
  status,
  timeInfo,
}: {
  status: string;
  timeInfo?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span>{status}</span>
      {timeInfo && <div className="flex-1" />}
      {timeInfo && <small className="opacity-80">{timeInfo}</small>}
    </div>
  );
}

interface ArenaCardProps {
  arena: PublicArenaListItem;
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString();
};

const getStartTime = (arena: PublicArenaListItem) => {
  const {
    startedAt,
    config: { start },
    firstStartedAt,
  } = arena;
  const startTime = startedAt || firstStartedAt;
  if (startTime) {
    return new Date(startTime);
  }
  if (start.type === "scheduled") {
    return new Date(start.date);
  }
  return null;
};

// const getEndTime = (arena: PublicArenaListItem) => {
//   const { config: { duration }, firstStartedAt } = arena;
//   const endTime = firstStartedAt ? new Date(firstStartedAt.getTime() + duration.minutes * 60 * 1000) : null;
//   if (endTime) {
//     return new Date(endTime);
//   }
//   return null;
// };

const formatStartTime = (arena: PublicArenaListItem) => {
  const {
    config: { start },
  } = arena;
  const startTime = getStartTime(arena);
  if (startTime) {
    return formatDateTime(new Date(startTime));
  }
  if (start.type === "immediate") return "Immediate";
  return "Unknown";
};

const formatEndTime = (arena: PublicArenaListItem) => {
  const {
    config: { duration },
    endsAt,
  } = arena;
  if (duration.type === "unlimited") return "Unlimited";
  const startTime = getStartTime(arena);
  if (endsAt) {
    return formatDateTime(new Date(endsAt));
  }
  // if (startTime) {
  //   return formatDateTime(
  //     new Date(startTime.getTime() + duration.minutes * 60 * 1000)
  //   );
  // }
  return formatDurationSimple(duration.minutes);
};

export function ArenaCard({ arena }: ArenaCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ENDED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCompletionColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "NOT_STARTED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (duration: { type: string; minutes?: number }) => {
    if (duration.type === "unlimited") return "Unlimited";
    if (duration.minutes) {
      return formatDurationSimple(duration.minutes);
    }
    return "Unknown";
  };

  // const completedGames = arena.games.filter((g) => g.completedAt).length;
  const totalPossibleGames = arena.config.wordCount * arena.config.audienceSize;

  const startTime = getStartTime(arena);
  const isPending = startTime && new Date(startTime) > new Date();
  const isCompletedForUser =
    arena.userCompletedCount === arena.config.wordCount;
  const isCompleted =
    arena.completedCount === totalPossibleGames ||
    (arena.endsAt && new Date(arena.endsAt) < new Date());

  return (
    <Card className="bg-white border-primary-200 shadow-none hover:shadow-md hover:shadow-primary-200 transition-all duration-100">
      <CardHeader className="space-y-4">
        <CardTitle>
          <div className="text-xl">
            <span className="align-middle">#{arena.id} by </span>
            <div className="inline-flex items-center gap-1 pl-1 align-middle">
              <Avatar
                avatar={arena?.userData?.profileImage}
                username={arena?.userData?.username}
              />
              <span>{arena?.userData?.username}</span>
            </div>
          </div>
        </CardTitle>
        <div
          className={clsx(
            "-mx-6 flex flex-row items-baseline gap-4 px-6 py-2 text-sm",
            isPending && "bg-gray-100 text-gray-800",
            isCompleted && "bg-green-100 text-green-800",
            !isPending && !isCompleted && "bg-orange-100 text-orange-800",
          )}
        >
          {isPending ? (
            <StatusLine
              status="Pending"
              timeInfo={
                "starts in " +
                formatDurationSimple(
                  Math.floor(
                    (new Date(startTime).getTime() - Date.now()) / 1000 / 60,
                  ),
                )
              }
            />
          ) : isCompleted ? (
            <StatusLine status="Completed" />
          ) : (
            <StatusLine
              status="In Progress"
              timeInfo={
                arena.endsAt
                  ? "ends in " +
                    formatDurationSimple(
                      Math.floor(
                        (new Date(arena.endsAt).getTime() - Date.now()) /
                          1000 /
                          60,
                      ),
                    )
                  : undefined
              }
            />
          )}
          {arena.userCompletedCount !== undefined && (
            <span className="text-xs text-primary-900/60">
              {arena.userCompletedCount > 0
                ? `You: ${arena.userCompletedCount}/${arena.config.wordCount} words`
                : "You: Not started"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Filler />
            <span>{arena.config.wordCount} words</span>
            <Filler />
          </div>
          <div className="flex items-center gap-2">
            <Filler />
            <span>
              {arena.members.length}/{arena.config.audienceSize} players
            </span>
            <Filler />
          </div>
          <div className="flex items-center gap-2">
            <Filler />
            <span>{formatDuration(arena.config.duration)}</span>
            <Filler />
          </div>
          {/* <div className="flex items-center gap-1">
            <Filler />
            <span>{arena.gameCount} games</span>
            <Filler />
          </div> */}
          <div className="flex items-center gap-2">
            <Filler />
            <span>
              {arena.config.isHardModeRequired
                ? "💪 Hard Mode"
                : "😌 Easy Mode"}
            </span>
            <Filler />
          </div>
          {/* <div className="flex items-center gap-1">
            <Filler />
            <span>
              {arena.config.randomWords ? "🎲 Random Words" : "Same Words"}
            </span>
            <Filler />
          </div> */}
        </div>

        {/* <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Start:</span>
            <span>{formatStartTime(arena)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">End:</span>
            <span>{formatEndTime(arena)}</span>
          </div> */}

        {/* {arena.availability.membership && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your status:</span>
              <Badge variant="outline" className="text-xs">
                {arena.availability.membership.type || "Not joined"}
              </Badge>
            </div>
          )} */}
        {/* </div> */}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          href={`/app/arena/${arena.id}${
            isCompleted || isCompletedForUser ? "/results" : "/join"
          }`}
        >
          {isCompleted || isCompletedForUser ? "View Results" : "Join"}
        </Button>
      </CardFooter>
    </Card>
  );
}
