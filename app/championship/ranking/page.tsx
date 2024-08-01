import { loadRanking } from "@/app/game/game-pg-repository";
import { Container } from "@/app/ui/layout/container";
import { NextServerPageProps } from "frames.js/next/types";

function formatNumber(num: number): string {
  return Number(num).toLocaleString("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export const fetchCache = "force-no-store";

export default async function Page({ searchParams }: NextServerPageProps) {
  const { mr, suo, ruc, cod } = searchParams || {};
  const maxResults = (mr && parseInt(mr as string, 10)) || 64;
  const runnerUpCoeficient = (ruc && parseFloat(ruc as string)) || 0.5;
  const cutOffDate = cod ? (cod as string) : "2024-07-31";
  const ranking = await loadRanking("fc", {
    limit: maxResults * (1 + runnerUpCoeficient),
    signedUpOnly: suo == null || suo === "1",
    cutOffDate,
  });

  return (
    <Container>
      <h1 className="text-3xl font-space">
        <span className="font-space font-bold text-3xl">Framedl</span> PRO Word
        Cup 2024 Roster
      </h1>
      <p className="text-primary-900/60 text-sm mt-2 mb-6 max-w-prose">
        {
          "Based on all the games played with top and bottom 10% cut off. Minimum 30 completed games."
        }
      </p>
      <div className="w-full">
        <div className="flex flex-row gap-4 px-4 py-3 w-full text-sm text-primary-900/60">
          <div className="w-8 text-right">Rank</div>
          <div className="flex-1 text-left">Handle</div>
          <div className="text-right">Games</div>
          <div className="w-8 text-right">Avg</div>
        </div>
        {ranking.map((p, idx) => [
          idx === maxResults ? (
            <div key="separator" className="my-6">
              <div className="text-sm p-4 border-y border-primary-900">
                Substitutes
              </div>
            </div>
          ) : null,
          <div
            className={`flex flex-row gap-4 even:bg-primary-200 px-4 rounded-md w-full relative ${
              !p.signedUp ? "opacity-50" : ""
            }${
              idx >= maxResults ? " text-xs text-primary-900/90 py-2" : " py-3"
            }`}
            key={`${p.identityProvider}/${p.userId}`}
          >
            <div className="w-8 text-right">{p.rank}</div>
            <div className="flex-1 text-left">
              {p.userData?.username
                ? `@${p.userData.username}`
                : `!${p.userId}`}
            </div>
            <div className="text-right">{p.gameCount}</div>
            <div className="w-8 text-right">
              {formatNumber(p.averageGuessCount)}
            </div>
          </div>,
        ])}
      </div>
    </Container>
  );
}
