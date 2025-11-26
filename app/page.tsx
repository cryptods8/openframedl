import { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";

import GameResult from "./ui/game-result";

import { gameService } from "./game/game-service";
import { externalBaseUrl, isPro } from "./constants";
import { currentURL } from "./utils";
import { isUrlSigned } from "./signer";
import { basePath } from "./games/frames";
import { ProfileApp } from "./profiles/profile-app";
import { Footer } from "./ui/layout/footer";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id, cw, app } = await searchParams;
  const queryParams = new URLSearchParams();
  if (id) {
    queryParams.set("id", id as string);
  }
  if (cw) {
    queryParams.set("cw", cw as string);
  }
  if (app) {
    queryParams.set("app", app as string);
  }

  // const framesUrl = currentURL(`${basePath}?${queryParams.toString()}`);
  // const other = await fetchMetadata(framesUrl);
  const imageUrl = id
    ? `${externalBaseUrl}/app/v2/frames/image?id=${id}`
    : cw
    ? `${externalBaseUrl}/app/v2/frames/image?cw=${cw}`
    : isPro
    ? `${externalBaseUrl}/init-pro.png`
    : `${externalBaseUrl}/init-v2.png`;
  const name = isPro ? "Framedl PRO" : "Framedl";
  const miniAppMetadata = JSON.stringify({
    version: "next",
    imageUrl,
    button: {
      title: "Play",
      action: {
        type: "launch_miniapp",
        name,
        url: `${externalBaseUrl}/app/v2`,
        splashImageUrl: isPro
          ? `${externalBaseUrl}/splash-pro.png`
          : `${externalBaseUrl}/splash-v2.png`,
        splashBackgroundColor: "#f3f0f9",
      },
    },
  } satisfies MiniAppEmbedNext);
  return {
    title: `${name} by ds8`,
    description: "Wordle in a mini app",
    other: {
      "fc:frame": miniAppMetadata,
      "fc:miniapp": miniAppMetadata,
    },
  };
}

export default async function Home({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await searchParamsPromise;
  const gameIdParam = searchParams?.id as string;
  const gameById = gameIdParam
    ? await gameService.loadPublic(
        gameIdParam,
        isUrlSigned(externalBaseUrl, searchParams)
      )
    : null;

  return (
    <ProfileApp>
      <div className="flex-1 flex flex-col p-6 w-full h-full justify-center items-center">
        <GameResult
          game={gameById}
          shareUrl={`${externalBaseUrl}${gameById ? `?id=${gameById.id}` : ""}`}
          config={{ isPro }}
        />
      </div>
      <Footer />
    </ProfileApp>
  );
}
