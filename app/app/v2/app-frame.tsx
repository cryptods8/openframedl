"use client";

import { GuessedGame } from "@/app/game/game-service";
import { Game } from "@/app/ui/game";
import sdk, { FrameContext } from "@farcaster/frame-sdk";
import { useEffect, useMemo, useState } from "react";

function toUserData(user: FrameContext["user"]) {
  return { ...user, profileImage: user.pfpUrl };
}

export function AppFrame({
  config,
  gameType,
  debug,
}: {
  config: {
    externalBaseUrl: string;
    isPro: boolean;
  };
  gameType?: string;
  debug?: {
    debugUrl?: string;
  };
}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext | undefined>();
  const [loadedGame, setLoadedGame] = useState<GuessedGame | undefined>();

  useEffect(() => {
    const load = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
      const fid = ctx?.user?.fid;
      if (fid) {
        try {
          const resp = await fetch(`/api/games/play`, {
            method: "POST",
            body: JSON.stringify({
              userData: toUserData(ctx.user),
              userId: fid.toString(),
              identityProvider: "fc_unauth",
              gameType,
            }),
          });
          const data = await resp.json();
          setLoadedGame(data.data);
        } catch (e) {
          console.error(e);
        }
      }
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  const openUrl = sdk.actions.openUrl;
  const appFrame = useMemo(() => {
    return {
      openUrl: (url: string) => openUrl(debug?.debugUrl || url),
    };
  }, [openUrl, debug?.debugUrl]);

  if (debug) {
    return (
      <div className="w-full h-dvh flex flex-col items-center justify-center">
        <div className="text-xs">{JSON.stringify(context, null, 2)}</div>
        <div className="flex-1">
          <Game
            game={loadedGame}
            config={config}
            userData={context?.user ? toUserData(context.user) : undefined}
            appFrame={appFrame}
            gameType={gameType}
          />
        </div>
      </div>
    );
  }

  return (
    <Game
      game={loadedGame}
      config={config}
      userData={context?.user ? toUserData(context.user) : undefined}
      appFrame={appFrame}
      gameType={gameType}
    />
  );
}
