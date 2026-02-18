import { ClientGame } from "@/app/game/game-service";
import { useQuery } from "@tanstack/react-query";

import type { UserStats } from "@/app/game/game-repository";
import { getDailyGameKey } from "@/app/game/game-utils";

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

function SnowFlakeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 52 52"
      className="size-5"
    >
      <path d="M27,3c0.6,0,1,0.4,1,1v45.9c0,0.6-0.4,1-1,1h-2c-0.6,0-1-0.4-1-1V4c0-0.6,0.4-1,1-1H27z" />
      <path d="M26,17.2l-8.1-8.1c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0l5.3,5.3l5.3-5.3c0.4-0.4,1-0.4,1.4,0  l1.4,1.4c0.4,0.4,0.4,1,0,1.4L26,17.2" />
      <path d="M26,36.7l8.1,8.1c0.4,0.4,0.4,1,0,1.4l-1.4,1.4c-0.4,0.4-1,0.4-1.4,0L26,42.3l-5.3,5.3c-0.4,0.4-1,0.4-1.4,0  l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4L26,36.7" />
      <path d="M47.1,15.6c0.3,0.5,0.2,1.1-0.4,1.4L7.2,40.3c-0.5,0.3-1.1,0.2-1.4-0.4l-1-1.7c-0.3-0.5-0.2-1.1,0.4-1.4  l39.5-23.4c0.5-0.3,1.1-0.2,1.4,0.4L47.1,15.6z" />
      <path d="M34.4,22l2.8-11.1c0.1-0.6,0.6-0.9,1.2-0.7l1.9,0.5c0.6,0.1,0.9,0.6,0.7,1.2l-1.9,7.3l7.3,1.9  c0.6,0.1,0.9,0.6,0.7,1.2l-0.5,1.9c-0.1,0.6-0.6,0.9-1.2,0.7L34.4,22" />
      <path d="M17.6,31.9L14.8,43c-0.1,0.6-0.6,0.9-1.2,0.7l-1.9-0.5c-0.6-0.1-0.9-0.6-0.7-1.2l1.9-7.3l-7.3-1.9  c-0.6-0.1-0.9-0.6-0.7-1.2l0.5-1.9C5.5,29.1,6,28.8,6.6,29L17.6,31.9" />
      <path d="M5.9,13.9c0.3-0.5,0.9-0.7,1.4-0.4l39.5,23.4c0.5,0.3,0.7,0.9,0.4,1.4l-1,1.7c-0.3,0.5-0.9,0.7-1.4,0.4  L5.2,17c-0.5-0.3-0.7-0.9-0.4-1.4L5.9,13.9z" />
      <path d="M17.6,22L6.5,24.9c-0.6,0.1-1.1-0.1-1.2-0.7l-0.5-1.9c-0.1-0.6,0.1-1.1,0.7-1.2l7.3-1.9l-1.9-7.3  c-0.1-0.6,0.1-1.1,0.7-1.2l1.9-0.5c0.6-0.1,1.1,0.1,1.2,0.7L17.6,22" />
      <path d="M34.3,31.9L45.4,29c0.6-0.1,1.1,0.1,1.2,0.7l0.5,1.9c0.1,0.6-0.1,1.1-0.7,1.2l-7.3,1.9L41,42  c0.1,0.6-0.1,1.1-0.7,1.2l-1.9,0.5c-0.6,0.1-1.1-0.1-1.2-0.7L34.3,31.9" />
    </svg>
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
                    <SnowFlakeIcon />
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
