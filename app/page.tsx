import { Metadata } from "next";
import Link from "next/link";
import { NextServerPageProps } from "frames.js/next/types";
import { fetchMetadata } from "frames.js/next";

import GameResult from "./ui/game-result";

import { gameService } from "./game/game-service";
import { baseUrl } from "./constants";
import { currentURL, isUrlSigned } from "./utils";
import { basePath } from "./games/frames";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const queryParams = new URLSearchParams();
  if (searchParams?.id) {
    queryParams.set("id", searchParams.id as string);
  }

  const framesUrl = currentURL(`${basePath}?${queryParams.toString()}`);
  const other = await fetchMetadata(framesUrl);
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
    other,
  };
}

export default async function Home({ searchParams }: NextServerPageProps) {
  const gameIdParam = searchParams?.id as string;
  const gameById = gameIdParam
    ? await gameService.loadPublic(
        gameIdParam,
        isUrlSigned(baseUrl, searchParams)
      )
    : null;

  return (
    <div className="flex flex-col p-6 w-full justify-center items-center">
      <GameResult
        game={gameById}
        shareUrl={`${baseUrl}${gameById ? `?id=${gameById.id}` : ""}`}
      />
      <div className="text-center mt-8 text-sm text-slate-600">
        Framedl made by{" "}
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
