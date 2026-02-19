import { UserStats, GameResult } from "@/app/game/game-repository";

import { addDaysToDate, getDailyGameKey } from "@/app/game/game-utils";
import { primaryColor } from "../image-utils";
import { SnowFlakeIcon } from "../icons/SnowFlakeIcon";

interface UserStatsPanelProps {
  stats: UserStats;
  currentGuessCount?: number;
  currentGameKey?: string;
}

function StatLabel(props: { label: string }) {
  return (
    <div tw="flex flex-wrap text-3xl" style={{ color: primaryColor(0.54) }}>
      {props.label}
    </div>
  );
}

function StatItem(props: { label: string; value: string }) {
  return (
    <div
      tw="flex flex-col items-center text-center flex-wrap"
      style={{ gap: "0.5rem" }}
    >
      <div
        tw="flex w-full justify-center"
        style={{ fontWeight: 700, fontFamily: "SpaceGrotesk" }}
      >
        {props.value}
      </div>
      <div tw="flex w-full justify-center">
        <StatLabel label={props.label} />
      </div>
    </div>
  );
}

function StatGuessDistributionItem(props: {
  guessCount: number;
  amount: number;
  pctg: number;
  current: boolean;
}) {
  const { guessCount, amount, pctg, current } = props;
  return (
    <div tw="flex w-full text-3xl items-center">
      <div tw="flex w-8">{guessCount}</div>
      <div tw="flex flex-1">
        <div
          tw="flex text-white rounded px-2 py-1"
          style={{
            minWidth: `${pctg}%`,
            backgroundColor: current ? "green" : primaryColor(0.24),
          }}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}

const LAST_X_CELL_W = 56;
const LAST_X_CELL_H = 56;

// TODO this will display the latest stats always
export function UserStatsPanel(props: UserStatsPanelProps) {
  const { stats, currentGuessCount, currentGameKey } = props;
  const {
    totalGames,
    totalWins,
    totalLosses,
    currentStreak,
    maxStreak,
    winGuessCounts,
    last30,
  } = stats;

  // generate last 7
  const last30Map = last30.reduce(
    (acc, g) => {
      acc[g.date] = g;
      return acc;
    },
    {} as { [key: string]: GameResult },
  );
  const last7 = [];
  const startDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const currentDate = addDaysToDate(startDate, -i);
    const dateKey = getDailyGameKey(currentDate);
    const result = last30Map[dateKey];
    last7.push(
      <div
        key={i}
        tw={`flex rounded items-center justify-center text-white text-4xl relative`}
        style={{
          fontWeight: 500,
          width: LAST_X_CELL_W,
          height: LAST_X_CELL_H,
          // outline: currentGameKey === dateKey ? "px solid orange" : "none",
          backgroundColor: result
            ? result.frozen
              ? "#2563eb"
              : result.won
                ? "green"
                : "red"
            : primaryColor(0.12),
        }}
      >
        {result ? (
          result.frozen ? (
            <div tw="flex w-10 h-10">
              <SnowFlakeIcon />
            </div>
          ) : result.won ? (
            result.guessCount
          ) : (
            "X"
          )
        ) : (
          ""
        )}
        {currentGameKey === dateKey && (
          <div
            tw="flex absolute left-0 right-0 rounded"
            style={{
              bottom: "-10px",
              height: "6px",
              backgroundColor: "orange",
            }}
          />
        )}
      </div>,
    );
  }
  // guess distribution
  const distribution = [];
  const maxWinGuessCount = Object.keys(winGuessCounts).reduce(
    (acc, key) => Math.max(acc, winGuessCounts[parseInt(key, 10)] || 0),
    0,
  );
  for (let i = 1; i <= 6; i++) {
    const amount = winGuessCounts[i] || 0;
    const pctg = maxWinGuessCount > 0 ? (100 * amount) / maxWinGuessCount : 0;
    distribution.push(
      <StatGuessDistributionItem
        key={i}
        guessCount={i}
        amount={amount}
        pctg={pctg}
        current={i === currentGuessCount}
      />,
    );
  }
  //

  const totalFinished = totalWins + totalLosses;
  const winPctg =
    totalFinished > 0 ? ((100 * totalWins) / totalFinished).toFixed(0) : "N/A";
  return (
    <div
      tw="flex flex-col text-5xl"
      style={{
        fontFamily: "Inter",
        color: primaryColor(),
        borderColor: primaryColor(0.2),
      }}
    >
      {/* <div tw="flex flex-col w-full text-5xl">
        Hello
      </div> */}
      <div
        tw="flex flex-row border-t py-8 justify-between px-4"
        style={{ gap: "1rem", borderColor: primaryColor(0.2) }}
      >
        <StatItem label="Played" value={`${totalGames}`} />
        <StatItem label="Win %" value={winPctg} />
        <StatItem label="Streak" value={`${currentStreak}`} />
        <StatItem label="Max" value={`${maxStreak}`} />
      </div>
      <div
        tw="flex flex-col w-full items-center justify-between border-t pt-8 px-4"
        style={{ gap: "1rem", borderColor: primaryColor(0.2) }}
      >
        <div tw="flex flex-row items-center" style={{ gap: "0.5rem" }}>
          {last7}
        </div>
        <div tw="flex">
          <StatLabel label="Last 7 days" />
        </div>
      </div>
      {/* <div tw="flex flex-col w-full" style={{ gap: "0.5rem" }}>
        {distribution}
      </div> */}
    </div>
  );
}
