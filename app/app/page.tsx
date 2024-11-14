import { Metadata } from "next";
import { NextServerPageProps } from "frames.js/next/types";

import { Game } from "../ui/game";
import { gameService } from "../game/game-service";
import { UserData, UserKey } from "../game/game-repository";
import { ProfileApp } from "../profiles/profile-app";
import { getUserInfoFromJwtOrSession } from "../lib/auth";
import { externalBaseUrl, isPro } from "../constants";

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
  anonymous,
}: {
  gameId: string | undefined;
  userKey: UserKey | undefined;
  userData: UserData | null | undefined;
  anonymous?: boolean;
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
  if (userKey && !anonymous) {
    const gameKey = gameService.getDailyKey();
    return await gameService.loadOrCreate(
      { ...userKey, gameKey, isDaily: true },
      {
        userData: userData ?? undefined,
      }
    );
  }
  return null;
}

export default async function App({ searchParams }: NextServerPageProps) {
  const gameIdParam = searchParams?.id as string | undefined;
  const gtParam = searchParams?.gt as string | undefined;
  const jwt = searchParams?.jwt as string | undefined;
  const { userData, userKey, anonymous } = await getUserInfoFromJwtOrSession(
    jwt
  );
  const game =
    gtParam !== "practice"
      ? await loadGame({
          gameId: gameIdParam,
          userKey,
          userData,
          anonymous,
        })
      : null;
  console.log("game", game);

  return (
    <div className="w-full h-dvh min-h-full">
      <ProfileApp headerless>
        <Game
          game={game ?? undefined}
          jwt={searchParams?.jwt as string | undefined}
          config={{
            externalBaseUrl: externalBaseUrl,
            isPro: isPro,
          }}
        />
      </ProfileApp>
    </div>
  );
}
