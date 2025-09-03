import { findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { toPublicArenaWithGames } from "@/app/games/arena/arena-utils";
import { ProfileApp } from "@/app/profiles/profile-app";
import React from "react";
import { ArenaResultsMiniApp } from "./arena-results-mini-app";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";
import { Metadata } from "next";
import { externalBaseUrl } from "@/app/constants";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ arenaId: string }>;
  searchParams: Promise<{ uid: string; ip: string }>;
}): Promise<Metadata> {
  const { arenaId } = await params;
  const { uid, ip } = await searchParams;
  let imageUrl = `${externalBaseUrl}/games/arena/${arenaId}/stats/image?aspectRatio=3:2`;
  if (uid && ip) {
    imageUrl += `&uid=${uid}&ip=${ip}`;
  }
  const miniAppConfig: MiniAppEmbedNext = {
    version: "next",
    imageUrl: imageUrl,
    button: {
      title: "Results",
      action: {
        type: "launch_miniapp",
        name: "Framedl",
        url: `${externalBaseUrl}/app/arena/${arenaId}/results`,
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
  const { arenaId } = await params;
  const numArenaId = parseInt(arenaId, 10);
  const arena = await findArenaWithGamesById(numArenaId);
  return (
    <div className="w-full h-dvh min-h-full flex flex-col flex-1 items-center">
      <ProfileApp headerless>
        <ArenaResultsMiniApp arena={toPublicArenaWithGames(arena)} />
      </ProfileApp>
    </div>
  );
}
