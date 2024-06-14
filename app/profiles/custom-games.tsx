import {
  CustomGameWithStats,
  findAllWithStatsByUserKey,
} from "@/app/game/custom-game-pg-repository";
import { UserKey } from "@/app/game/game-repository";
import { EmptyMessage } from "./empty-message";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/16/solid";

interface CustomGamesProps {
  userKey: UserKey;
}

function formatNumber(num: number): string {
  return Number(num).toLocaleString("en", { maximumFractionDigits: 2 });
}

function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

function formatRatio(value: number, total: number): string {
  return formatPercentage(total > 0 ? value / total : 0);
}

function WonLostChart(props: { game: CustomGameWithStats }) {
  const {
    game: { winCount, lossCount, gameCount },
  } = props;
  return (
    <div className="flex rounded-full bg-primary-900/10 h-4 overflow-hidden w-full">
      <div
        className="bg-green-600 h-full"
        style={{
          width: gameCount > 0 ? `${(100 * winCount) / gameCount}%` : 0,
        }}
      ></div>
      <div
        className="bg-red-500 h-full"
        style={{
          width: gameCount > 0 ? `${(100 * lossCount) / gameCount}%` : 0,
        }}
      ></div>
    </div>
  );
}

function StatItem(props: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
  chart?: {
    val: number;
    total: number;
    color: "red" | "green";
  };
}) {
  const { compact, label, value, chart } = props;
  return (
    <div>
      <div className="flex flex-row w-full gap-2 justify-between items-baseline">
        <div
          className={`text-primary-900/60 ${compact ? "text-sm" : "text-base"}`}
        >
          {label}
        </div>
        <div className={`font-semibold ${compact ? "text-lg" : "text-xl"}`}>
          {value}
        </div>
      </div>
      {chart && (
        <div className="flex flex-row gap-2 items-center relative">
          <div
            className={`rounded-full absolute top-0 left-0 bottom-0 min-w-2 ${
              chart.color === "red" ? "bg-red-200" : "bg-green-200"
            }`}
            style={{
              width: `${
                (chart.total > 0 ? chart.val / chart.total : 0) * 100
              }%`,
            }}
          ></div>
          <div className="text-xs text-primary-900/60 font-semibold px-2 py-0.5 z-10">
            {formatRatio(chart.val, chart.total)}
          </div>
        </div>
      )}
    </div>
  );
}

export async function CustomGames(props: CustomGamesProps) {
  const games = await findAllWithStatsByUserKey(props.userKey);
  const sortedGames = games.sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1
  );

  return (
    <div className="flex flex-col">
      {games.length > 0 ? (
        <div className="w-full flex-wrap gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
          {sortedGames.map((game) => (
            <div
              key={game.id}
              className="flex flex-col gap-3 bg-white rounded border border-primary-200"
            >
              <div className="flex flex-col gap-3 px-6 pt-8">
                <div className="flex gap-3 items-center">
                  <div className="size-10 rounded-full bg-primary-800 text-primary-100 flex items-center justify-center text-xs font-semibold">
                    #{game.numByUser}
                  </div>
                  <div className="flex flex-row gap-1">
                    {game.word.split("").map((letter, idx) => (
                      <div
                        key={idx}
                        className="size-9 text-lg font-semibold flex items-center justify-center bg-primary-900/10"
                      >
                        {letter.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col py-2">
                  <StatItem
                    label={"Total played"}
                    value={formatNumber(game.gameCount)}
                  />
                  <div className="pt-1 pb-2">
                    <WonLostChart game={game} />
                  </div>
                  <StatItem
                    compact
                    label={"Won"}
                    value={formatNumber(game.winCount)}
                  />
                  <StatItem
                    compact
                    label={"Lost"}
                    value={formatNumber(game.lossCount)}
                  />
                  <StatItem
                    compact
                    label={"Avg guesses"}
                    value={formatNumber(
                      game.winCount + game.lossCount > 0
                        ? game.totalGuessCount /
                            (game.winCount + game.lossCount)
                        : 0
                    )}
                  />
                </div>
              </div>
              <div className="p-2">
                <Link
                  href={`/gallery?gk=custom_${game.id}&gt=${
                    game.isArt ? "ART" : "CUSTOM"
                  }`}
                >
                  <button className="w-full px-6 py-4 text-primary-900 font-bold rounded hover:bg-primary-900/10 active:bg-primary-900/20 flex items-center justify-center transition duration-150 ease-in-out">
                    Show gallery
                    <ArrowRightIcon className="ml-4 size-6" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyMessage>
          {"You haven't created any custom Framedls yet"}
        </EmptyMessage>
      )}
    </div>
  );
}
