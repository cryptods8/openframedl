import type { Metadata } from "next";
import Link from "next/link";
import { fetchMetadata } from "frames.js/next";

import { basePath } from "../games/frames";
import { currentURL } from "../utils";
import { NextServerPageProps } from "frames.js/next/types";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const { ip } = searchParams || {};
  const params = new URLSearchParams();
  if (ip) {
    params.set("ip", ip as string);
  }
  const paramsStr = params.toString();
  const leaderboardUrl = currentURL(
    `${basePath}/wotd${paramsStr ? `?${paramsStr}` : ""}`
  );
  const other = await fetchMetadata(leaderboardUrl);
  return {
    title: "Framedl Word of the Day by ds8",
    description: "Wordle in a frame - Word of the Day",
    other,
  };
}

export default async function Home() {
  return (
    <div className="flex flex-col p-6 w-full justify-center items-center text-slate-600">
      <div>
        Framedl Word of the Day by{" "}
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
