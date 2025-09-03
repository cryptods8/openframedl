import { externalBaseUrl, isPro } from "@/app/constants";
import { ArenaWithGames, findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { ProfileApp } from "@/app/profiles/profile-app";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";
import { Metadata } from "next";
import { ArenaMiniApp } from "../arena-mini-app";
import { toPublicArenaWithGames } from "@/app/games/arena/arena-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}): Promise<Metadata> {
  const { arenaId } = await params;

  const miniAppConfig: MiniAppEmbedNext = {
    version: "next",
    imageUrl: `${externalBaseUrl}/games/arena/${arenaId}/join/image?aspectRatio=3:2`,
    button: {
      title: "Join Arena",
      action: {
        type: "launch_miniapp",
        name: "Framedl",
        url: `${externalBaseUrl}/app/arena/${arenaId}/join`,
        splashImageUrl: `${externalBaseUrl}/splash-v2.png`,
        splashBackgroundColor: "#f3f0f9",
      },
    },
  };
  return {
    title: "Framedl by ds8",
    description: "Wordle in a mini app",
    other: {
      "fc:miniapp": JSON.stringify(miniAppConfig),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const arenaId = (await params).arenaId;
  const numArenaId = parseInt(arenaId, 10);

  const arena = await findArenaWithGamesById(numArenaId);

  return (
    <div className="w-full h-dvh min-h-full flex flex-col items-center flex-1">
      <ProfileApp headerless>
        <ArenaMiniApp arena={toPublicArenaWithGames(arena)} />
      </ProfileApp>
    </div>
  );
}
