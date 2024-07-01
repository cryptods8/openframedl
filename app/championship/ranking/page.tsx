import { loadRanking } from "@/app/game/game-pg-repository";
import { Container } from "@/app/ui/layout/container";

function formatNumber(num: number): string {
  return Number(num).toLocaleString("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export default async function Page() {
  const ranking = await loadRanking("fc");

  return (
    <Container>
      <h1 className="text-3xl font-space">
        <span className="font-space font-bold text-3xl">Framedl</span>{" "}
        Championship Ranking
      </h1>
      <p className="text-primary-900/60 text-sm mt-2 mb-6 max-w-prose">
        {
          "Based on all the games played with top and bottom 10% cut off. Minimum 30 completed games."
        }
      </p>
      <div className="w-full">
        {ranking.map((p) => (
          <div
            className="flex flex-row gap-6 even:bg-primary-200 px-6 py-3 rounded-md w-full"
            key={`${p.identityProvider}/${p.userId}`}
          >
            <div className="w-6 text-right">{p.rank}</div>
            <div className="flex-1 text-left">
              {p.userData?.username
                ? `@${p.userData.username}`
                : `!${p.userId}`}
            </div>
            <div className="text-right">{p.gameCount}</div>
            <div className="w-6 text-right">
              {formatNumber(p.averageGuessCount)}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
