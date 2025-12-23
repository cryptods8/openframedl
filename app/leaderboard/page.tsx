import type { Metadata } from "next";
import Link from "next/link";
import { fetchMetadata } from "frames.js/next";

import { basePath } from "../games/frames";
import { currentURL } from "../utils";
import { toLeaderboardSearchParams } from "./leaderboard-utils";
import { isPro } from "../constants";
import { Button } from "../ui/button/button";

export async function generateMetadata({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await searchParamsPromise;
  const queryParams = toLeaderboardSearchParams(searchParams || {});
  // backwards compatibility
  if (searchParams?.fid) {
    queryParams.set("uid", searchParams.fid as string);
    queryParams.set("ip", "fc");
  }
  if (searchParams?.prize) {
    queryParams.set("prize", searchParams.prize as string);
  }

  const leaderboardUrl = currentURL(
    `${basePath}/leaderboard?${queryParams.toString()}`
  );
  const other = await fetchMetadata(leaderboardUrl);
  return {
    title: `Framedl ${isPro ? "PRO " : ""}Leaderboard by ds8`,
    description: "Wordle in a mini app",
    other,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  console.log("SP", searchParams);
  const sp = await searchParams;
  const queryParams = toLeaderboardSearchParams(sp || {});
  if (sp?.prize) {
    queryParams.set("prize", sp.prize as string);
  }
  return (
    <div className="flex flex-col p-6 w-full justify-center items-center text-slate-600 gap-4 max-w-sm">
      <div>
        Framedl {isPro ? "PRO " : ""}Leaderboard by{" "}
        <Link
          href="https://farcaster.xyz/ds8"
          className="underline hover:text-slate-700"
        >
          ds8
        </Link>
      </div>
      <Button
        href={`/api/leaderboard/daily?${queryParams.toString()}`}
        target="_blank"
      >
        Share
      </Button>
    </div>
  );
}
