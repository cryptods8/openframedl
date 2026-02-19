import { ClientGame } from "@/app/game/game-service";
import { useQuery } from "@tanstack/react-query";

import type { UserStats } from "@/app/game/game-repository";
import { getDailyGameKey } from "@/app/game/game-utils";
import { SnowFlakeIcon } from "@/app/image-ui/icons/SnowFlakeIcon";

interface UserStatsResponse {
  data: UserStats;
}

function StatsItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col items-center text-center flex-1 bg-primary-950/5 rounded-md py-2">
      <span className="text-lg font-semibold font-space">{value}</span>
      <span className="text-sm text-primary-950/50">{label}</span>
    </div>
  );
}

const mockData = {
  data: {
    totalWins: 0,
    last30: [],
    maxStreak: 0,
    totalGames: 0,
    currentStreak: 0,
  },
};

function UserStats({ game }: { game: ClientGame }) {
  const { data, isLoading } = useQuery<UserStatsResponse>({
    queryKey: ["user-stats", game.identityProvider, game.userId],
    queryFn: () =>
      fetch(
        `/api/games/stats?ip=${game.identityProvider}&uid=${game.userId}`,
      ).then((res) => res.json()),
  });

  const { totalWins, last30, maxStreak, totalGames, currentStreak } =
    data?.data || mockData.data;

  const last30Map = last30.reduce(
    (acc, item) => {
      acc[item.date] = item;
      return acc;
    },
    {} as Record<
      string,
      { guessCount: number; won: boolean; frozen?: boolean; date: string }
    >,
  );

  const last7Days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const gameKey = getDailyGameKey(date);
    return last30Map[gameKey];
  });

  return (
    <div className={isLoading ? "animate-pulse" : ""}>
      <div className="flex gap-2 justify-between gap-2">
        <StatsItem label="Played" value={isLoading ? "\u00A0" : totalGames} />
        <StatsItem
          label="Win %"
          value={
            isLoading
              ? "\u00A0"
              : `${totalGames === 0 ? 0 : Math.round((totalWins / totalGames) * 100)}%`
          }
        />
        <StatsItem
          label="Streak"
          value={isLoading ? "\u00A0" : currentStreak}
        />
        <StatsItem label="Max" value={isLoading ? "\u00A0" : maxStreak} />
      </div>
      <div className="flex items-center gap-2 justify-between mt-3">
        <span className="text-sm text-primary-950/50 pl-2">Last 7</span>
        <div className="flex items-center gap-1">
          {last7Days.map((item, index) => {
            return (
              <div
                key={index}
                className={`rounded-md size-7 font-semibold flex items-center justify-center text-white ${
                  item
                    ? item.frozen
                      ? "bg-blue-600"
                      : item.won
                        ? "bg-green-600"
                        : "bg-red-600"
                    : "bg-primary-950/5"
                }`}
              >
                {item ? (
                  item.frozen ? (
                    <div className="size-5">
                      <SnowFlakeIcon />
                    </div>
                  ) : item.won ? (
                    item.guessCount
                  ) : (
                    "X"
                  )
                ) : (
                  ""
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UserStats;
