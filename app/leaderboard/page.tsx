import type { Metadata } from "next";
import Link from "next/link";
import { fetchMetadata } from "frames.js/next";

import { basePath } from "../games/frames";
import { currentURL } from "../utils";
import { NextServerPageProps } from "frames.js/next/types";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const queryParams = new URLSearchParams();
  if (searchParams?.ip) {
    queryParams.set("ip", searchParams.ip as string);
  }
  if (searchParams?.uid) {
    queryParams.set("uid", searchParams.uid as string);
  }
  if (searchParams?.date) {
    queryParams.set("date", searchParams.date as string);
  }
  if (searchParams?.days) {
    queryParams.set("days", searchParams.days as string);
  }
  // backwards compatibility
  if (searchParams?.fid) {
    queryParams.set("uid", searchParams.fid as string);
    queryParams.set("ip", "fc");
  }

  const leaderboardUrl = currentURL(
    `${basePath}/leaderboard?${queryParams.toString()}`
  );
  const other = await fetchMetadata(leaderboardUrl);
  return {
    title: "Framedl Leaderboard by ds8",
    description: "Wordle in a frame",
    other,
  };
}

export default async function Home() {
  return (
    <div className="flex flex-col p-6 w-full justify-center items-center text-slate-600">
      <div>
        Framedl Leaderboard by{" "}
        <Link
          href="https://warpcast.com/ds8"
          className="underline hover:text-slate-700"
        >
          ds8
        </Link>
      </div>
    </div>
  );
}
