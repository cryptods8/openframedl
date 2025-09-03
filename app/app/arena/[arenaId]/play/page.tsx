import { findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { ProfileApp } from "@/app/profiles/profile-app";
import { Metadata } from "next";
import { ArenaPlayMiniApp } from "./arena-play-mini-app";
import { toPublicArenaWithGames } from "@/app/games/arena/arena-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}): Promise<Metadata> {
  const { arenaId } = await params;

  return {
    title: "Framedl by ds8",
    description: "Wordle in a mini app",
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
    <div className="w-full h-dvh min-h-full flex flex-col items-center">
      <ProfileApp headerless>
        <ArenaPlayMiniApp arena={toPublicArenaWithGames(arena)} />
      </ProfileApp>
    </div>
  );
}
