"use client";

import { GuessedGame } from "@/app/game/game-service";
import { Game } from "@/app/ui/game";
import sdk, { FrameContext } from "@farcaster/frame-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [error, setError] = useState<string | undefined>();
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

  const openUrl = useCallback(
    (url: string) => {
      try {
        return sdk.actions.openUrl(debug?.debugUrl || url);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError(e?.toString());
        }
      }
      return Promise.resolve();
    },
    [debug?.debugUrl]
  );
  const appFrame = useMemo(() => {
    return {
      openUrl,
    };
  }, [openUrl]);

  if (debug) {
    return (
      <div className="w-full h-dvh flex flex-col items-center justify-center">
        <div
          className={`text-xs max-h-[100px] overflow-y-auto ${
            error ? "text-red-500" : ""
          }`}
        >
          {error ? error : JSON.stringify(context, null, 2)}
          <button
            className="bg-primary-500 text-white px-4 py-3 font-bold rounded-md"
            onClick={() => openUrl(debug?.debugUrl || "https://www.google.com")}
          >
            Test open url
          </button>
        </div>
        <div className="flex-1 w-full">
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
