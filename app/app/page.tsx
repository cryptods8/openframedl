import { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { NextServerPageProps } from "frames.js/next/types";

import { Game } from "../ui/game";
import { currentURL } from "../utils";
import { basePath } from "../games/frames";
import { gameService } from "../game/game-service";
import { UserData, UserKey } from "../game/game-repository";
import { verifyJwt } from "../lib/jwt";

export async function generateMetadata({
  searchParams,
}: NextServerPageProps): Promise<Metadata> {
  // fetch just slows things down
  // const queryParams = new URLSearchParams();
  // if (searchParams?.id) {
  //   queryParams.set("id", searchParams.id as string);
  // }
  // if (searchParams?.cw) {
  //   queryParams.set("cw", searchParams.cw as string);
  // }
  // queryParams.set("app", "1");

  // const framesUrl = currentURL(`${basePath}?${queryParams.toString()}`);
  // const other = await fetchMetadata(framesUrl);
  return {
    title: "Framedl by ds8",
    description: "Wordle in a frame",
    // other,
  };
}

async function loadGame({
  gameId,
  userKey,
  userData,
}: {
  gameId: string | undefined;
  userKey: UserKey | undefined;
  userData: UserData | undefined;
}) {
  if (gameId) {
    const game = await gameService.load(gameId);
    if (game) {
      if (
        userKey &&
        userKey.userId === game.userId &&
        userKey.identityProvider === game.identityProvider
      ) {
        return game;
      }
    }
  }
  if (userKey) {
    const gameKey = gameService.getDailyKey();
    return await gameService.loadOrCreate(
      { ...userKey, gameKey, isDaily: true },
      {
        userData,
      }
    );
  }
  return null;
}

export default async function App({ searchParams }: NextServerPageProps) {
  const gameIdParam = searchParams?.id as string | undefined;
  const jwt = searchParams?.jwt as string | undefined;
  const { userData, userKey } = jwt
    ? verifyJwt<{ userData?: UserData; userKey: UserKey }>(jwt)
    : { userData: undefined, userKey: undefined };
  const game = await loadGame({ gameId: gameIdParam, userKey, userData });
  return (
    <div className="w-full h-dvh min-h-full">
      <Game
        game={game ?? undefined}
        jwt={jwt}
        userData={userData ?? undefined}
      />
    </div>
  );
}
