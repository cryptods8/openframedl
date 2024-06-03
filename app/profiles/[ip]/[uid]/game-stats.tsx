"use client";

import { GameResult, UserStats } from "../../../game/game-repository";
import { addDaysToDate, getDailyGameKey } from "../../../game/game-utils";

export interface GameStatsProps {
  stats: UserStats;
}

function formatNumber(num: number): string {
  return num.toLocaleString("en");
}

function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

function StatItem(props: {
  label: string;
  value: React.ReactNode;
  indicator?: string;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 justify-between w-full items-baseline text-primary-900/60">
        <div>{props.label}</div>
        {props.indicator && <div className="text-sm/5">{props.indicator}</div>}
      </div>
      <div className="font-semibold text-5xl">{props.value}</div>
    </div>
  );
}

function StatsCard({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white/30 border border-primary-200 rounded p-6 min-w-60">
      {children}
    </div>
  );
}

export function GameStats(props: GameStatsProps) {
  const { stats } = props;
  const items = [
    { label: "Played", value: formatNumber(stats.totalGames) },
    {
      label: "Wins",
      value: formatNumber(stats.totalWins),
      indicator: formatPercentage(
        stats.totalGames > 0 ? stats.totalWins / stats.totalGames : 0
      ),
    },
    { label: "Current streak", value: formatNumber(stats.currentStreak) },
    { label: "Max streak", value: formatNumber(stats.maxStreak) },
  ];

  const last30Map = stats.last30.reduce((acc, g) => {
    acc[g.date] = g;
    return acc;
  }, {} as { [key: string]: GameResult });
  const lastN = [];
  const N = 30;
  const startDate = new Date();
  for (let i = N - 1; i >= 0; i--) {
    const currentDate = addDaysToDate(startDate, -i);
    const dateKey = getDailyGameKey(currentDate);
    const result = last30Map[dateKey];
    lastN.push(result);
  }

  const maxWinGuessCount = Object.keys(stats.winGuessCounts).reduce(
    (acc, key) => Math.max(acc, stats.winGuessCounts[parseInt(key, 10)] || 0),
    0
  );

  return (
    <div className="w-full p-2">
      <div className="flex flex-wrap gap-3 w-full">
        {items.map((item, idx) => (
          <div key={idx} className="flex-1">
            <StatsCard>
              <StatItem {...item} />
            </StatsCard>
          </div>
        ))}
        <StatsCard>
          <StatItem
            label="Last 30"
            value={
              <div className="flex flex-row flex-wrap gap-2 text-3xl mt-1">
                {lastN.map((r, idx) => (
                  <div
                    key={idx}
                    className={`size-12 flex items-center justify-center rounded font-bold ${
                      r
                        ? r.won
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                        : "bg-primary-200"
                    }`}
                  >
                    {r ? (r.won ? r.guessCount : "X") : ""}
                  </div>
                ))}
              </div>
            }
          />
        </StatsCard>
        <div className="w-full">
          <StatsCard>
            <StatItem
              label="Guess distribution"
              value={
                <div className="flex flex-col gap-2 mt-1">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const guessCount = idx + 1;
                    const amount = stats.winGuessCounts[guessCount] ?? 0;
                    return (
                      <div
                        key={idx}
                        className="flex w-full text-2xl items-center"
                      >
                        <div className="flex w-8 text-primary-900/60 font-normal">
                          {idx + 1}
                        </div>
                        <div className="flex flex-1 bg-primary-200 h-12">
                          <div
                            className="flex text-white rounded px-2 py-1 min-w-8 text-3xl font-bold items-center"
                            style={{
                              width: `${
                                maxWinGuessCount > 0
                                  ? (100 * amount) / maxWinGuessCount
                                  : 0
                              }%`,
                              backgroundColor: "green",
                            }}
                          >
                            {amount}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            />
          </StatsCard>
        </div>
      </div>
      <div className="text-sm text-primary-900/50 p-4">
        Stats are available for daily games only
      </div>
    </div>
  );
}
