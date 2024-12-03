import { loadRanking, MIN_GAMES_FOR_RANK } from "@/app/game/game-pg-repository";
import { basePath } from "@/app/games/frames";
import { Container } from "@/app/ui/layout/container";
import { currentURL } from "@/app/utils";
import { fetchMetadata } from "frames.js/next";
import { NextServerPageProps } from "frames.js/next/types";
import { Metadata } from "next";
import Link from "next/link";

function formatNumber(num: number): string {
  return Number(num).toLocaleString("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const { sid } = searchParams || {};
  const params = new URLSearchParams();
  if (sid) {
    params.set("sid", sid as string);
  }
  const paramsStr = params.toString();
  const leaderboardUrl = currentURL(
    `${basePath}/pro/championship/signup${paramsStr ? `?${paramsStr}` : ""}`
  );
  const other = await fetchMetadata(leaderboardUrl);
  return {
    title: "Framedl PRO Xmas Cup 2024",
    description: "Ranking for the upcoming Framedl PRO Xmas Cup 2024",
    other,
  };
}

export const fetchCache = "force-no-store";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      width="100%"
      height="100%"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function RankedUser({
  p,
  type,
}: {
  p: Awaited<ReturnType<typeof loadRanking>>[number];
  type: "CURRENT" | "REGULAR" | "SUB";
}) {
  return (
    <div
      className={`flex flex-row gap-4 px-4 rounded-md w-full relative ${
        !p.signedUp ? "opacity-60" : ""
      }${
        type === "SUB"
          ? " text-xs text-primary-900/90 even:bg-primary-200 py-2"
          : type === "CURRENT"
          ? " bg-primary-600 text-white font-bold py-3"
          : " even:bg-primary-200 py-3"
      }`}
      key={`${p.identityProvider}/${p.userId}`}
    >
      <div className="w-8 text-right">
        {p.maxRank != null && p.maxRank >= MIN_GAMES_FOR_RANK ? p.rank : "-"}
      </div>
      <div className="flex-1 text-left flex gap-2 items-center">
        <span>
          {p.userData?.username ? p.userData.username : `!${p.userId}`}
        </span>
        {p.hasTicket && (
          <span
            className={`text-green-600 ${type === "SUB" ? "size-4" : "size-5"}`}
          >
            <CheckIcon />
          </span>
        )}
      </div>
      <div className="text-right">{p.gameCount}</div>
      <div className="w-8 text-right">{formatNumber(p.averageGuessCount)}</div>
    </div>
  );
}

function Button({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href} className="w-full">
      <button
        className={`px-4 py-2 rounded-md w-full font-semibold text-sm ${
          active ? "bg-primary-900 text-white " : "bg-primary-900/50 text-white"
        }`}
      >
        {children}
      </button>
    </Link>
  );
}

export default async function Page({ searchParams }: NextServerPageProps) {
  const { mr, suo, ruc, cod, s, uid } = searchParams || {};
  const maxResults = (mr && parseInt(mr as string, 10)) || 64;
  const runnerUpCoeficient = (ruc && parseFloat(ruc as string)) || 1;
  const cutOffDate = cod ? (cod as string) : "2024-11-30";
  const signedUpOnly = suo == null || suo === "1";
  // const [userRanking, ranking] = await Promise.all([
  //   uid
  //     ? (
  //         await loadRanking("fc", {
  //           signedUpOnly,
  //           cutOffDate,
  //           userId: uid as string,
  //           limit: 1,
  //         })
  //       )[0]
  //     : null,
  //   loadRanking("fc", {
  //     limit: maxResults * (1 + runnerUpCoeficient),
  //     signedUpOnly,
  //     cutOffDate,
  //   }),
  // ]);
  const userId = uid as string | undefined;
  const ranking = await loadRanking("fc", {
    limit: maxResults * (1 + runnerUpCoeficient),
    signedUpOnly,
    cutOffDate,
    userId,
  });
  const userRanking = userId ? ranking.find((r) => r.userId === userId) : null;
  let finalRanking = ranking;
  if (s === "final") {
    finalRanking = ranking.filter((p) => p.hasTicket);
  } else if (s === "subs") {
    finalRanking = ranking.filter((p) => p.hasTicket || p.rank > maxResults);
  }

  function getButtonHref(suo: boolean) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams || {})) {
      params.set(key, value as string);
    }
    if (suo) {
      params.set("suo", "1");
    } else {
      params.set("suo", "0");
    }
    return `/championship/ranking?${params.toString()}`;
  }

  return (
    <div className="py-8 pb-20 px-4 sm:px-8 max-w-screen-sm">
      <h1 className="text-3xl font-space">
        <span className="font-space font-bold text-3xl">Framedl</span> PRO Xmas
        Cup 2024 Ranking
      </h1>
      <p className="text-primary-900/60 text-sm mt-2 mb-6 max-w-prose">
        {`Based on all the games played with top and bottom 10% cut off. Minimum ${MIN_GAMES_FOR_RANK} completed games.`}
      </p>
      <div className="w-full">
        <div className="flex flex-row gap-4 px-4 py-3 w-full text-sm text-primary-900/60">
          <div className="w-8 text-right">Rank</div>
          <div className="flex-1 text-left">Handle</div>
          <div className="text-right">Games</div>
          <div className="w-8 text-right">Avg</div>
        </div>
        {userRanking && <RankedUser p={userRanking} type="CURRENT" />}
        {finalRanking.map((p) => (
          <RankedUser
            p={p}
            type={"REGULAR"}
            key={`${p.identityProvider}/${p.userId}`}
          />
        ))}
      </div>
      <div className="w-full flex gap-2 fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-sm p-4 border-t border-primary-200">
        <Container>
          <Button href={getButtonHref(!signedUpOnly)} active>
            {signedUpOnly ? "Show All" : "Show Signed Up Only"}
          </Button>
        </Container>
      </div>
    </div>
  );
}
