import { Metadata } from "next";
import { NextServerPageProps } from "frames.js/next/types";
import { fetchMetadata } from "frames.js/next";

import GameResult from "./ui/game-result";

import { gameService } from "./game/game-service";
import { externalBaseUrl } from "./constants";
import { currentURL, isUrlSigned } from "./utils";
import { basePath } from "./games/frames";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  const queryParams = new URLSearchParams();
  if (searchParams?.id) {
    queryParams.set("id", searchParams.id as string);
  }
  if (searchParams?.cw) {
    queryParams.set("cw", searchParams.cw as string);
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
        isUrlSigned(externalBaseUrl, searchParams)
      )
    : null;

  return (
    <div className="flex flex-col p-6 w-full justify-center items-center">
      <GameResult
        game={gameById}
        shareUrl={`${externalBaseUrl}${gameById ? `?id=${gameById.id}` : ""}`}
      />
    </div>
  );
}
