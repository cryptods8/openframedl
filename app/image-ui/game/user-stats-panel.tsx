import { UserStats, GameResult } from "@/app/game/game-repository";

import { addDaysToDate, getDailyGameKey } from "@/app/game/game-utils";
import { primaryColor } from "../image-utils";

interface UserStatsPanelProps {
  stats: UserStats;
  currentGuessCount?: number;
  currentGameKey?: string;
}

function SnowFlakeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 52 52"
      width="100%"
      height="100%"
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
