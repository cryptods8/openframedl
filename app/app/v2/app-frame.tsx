"use client";

import { UserData } from "@/app/game/game-repository";
import { GuessedGame } from "@/app/game/game-service";
import { FarcasterSession } from "@/app/lib/auth";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Button } from "@/app/ui/button/button";
import { Game as GameComponent, GameProps } from "@/app/ui/game";
import { GameGuessGrid } from "@/app/ui/game-guess-grid";
import { ProgressBarIcon } from "@/app/ui/icons/progress-bar-icon";
import { createComposeUrl } from "@/app/utils";
import sdk, { FrameContext, SignIn as FrameSignIn } from "@farcaster/frame-sdk";
import { getCsrfToken, useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function toUserData(user: FrameContext["user"]) {
  return { ...user, profileImage: user.pfpUrl };
}

function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="size-12 p-1 animate-spin flex items-center justify-center text-primary-500">
        <ProgressBarIcon />
      </div>
    </div>
  );
}

function Game({
  asGuest,
  fid,
  gameType,
  ...props
}: Omit<GameProps, "game"> & { fid?: number; asGuest: boolean }) {
  const [loadedGame, setLoadedGame] = useState<GuessedGame | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/games/play`, {
          method: "POST",
          body: JSON.stringify({
            userData: props.userData,
            userId: fid?.toString(),
            identityProvider: asGuest
              ? fid
                ? "fc_unauth"
                : "anon"
              : undefined,
            gameType: gameType,
          }),
        });
        const data = await resp.json();
        setLoadedGame(data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fid, gameType, asGuest]);

  if (loading) {
    return <Loading />;
  }

  return <GameComponent {...props} gameType={gameType} game={loadedGame} />;
}

interface Config {
  externalBaseUrl: string;
  isPro: boolean;
}

const placeholderGuesses = ["PLAY ", "YOUR ", "HEART", "OUT! "].map((w) => ({
  characters: w
    .split("")
    .map((c) => ({ character: c, status: "UNKNOWN" as const })),
}));

function GameContainer({
  context,
  config,
  gameType,
  debugPanel,
}: {
  context: ClientContext;
  config: Config;
  gameType?: string;
  debugPanel?: React.ReactNode;
}) {
  const { data: session, status } = useSession() as {
    data: FarcasterSession | null;
    status: "loading" | "unauthenticated" | "authenticated";
  };

  const [signInFailure, setSignInFailure] = useState<string | undefined>();
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [asGuest, setAsGuest] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      setAsGuest(false);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({ nonce });

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof FrameSignIn.RejectedByUser) {
        setSignInFailure("Rejected by user");
        return;
      }

      setSignInFailure("Error signing in");
    } finally {
      setSigningIn(false);
    }
  }, [getNonce]);

  useEffect(() => {
    if (status === "authenticated") {
      setIsFirstLoad(false);
      return;
    }
    if (status === "unauthenticated" && isFirstLoad) {
      setIsFirstLoad(false);
      handleSignIn();
    }
  }, [status, isFirstLoad, handleSignIn]);

  // const handleSignOut = useCallback(async () => {
  //   try {
  //     setSigningOut(true);
  //     setAsGuest(false);
  //     await signOut({ redirect: false });
  //   } finally {
  //     setSigningOut(false);
  //   }
  // }, []);

  const handleContinueAsGuest = useCallback(() => {
    setAsGuest(true);
    setSignInFailure(undefined);
  }, []);

  useEffect(() => {
    if (context.client && !context.client.added && !isFirstLoad) {
      context.requestAddFrame();
    }
  }, [context, isFirstLoad]);

  const safeAreaInsets = context?.client?.safeAreaInsets;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{
        paddingTop: safeAreaInsets?.top,
        paddingBottom: safeAreaInsets?.bottom,
        paddingLeft: safeAreaInsets?.left,
        paddingRight: safeAreaInsets?.right,
      }}
    >
      {debugPanel}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {status === "authenticated" || asGuest ? (
          <div className="flex-1 w-full">
            <Game
              config={config}
              userData={context.userData}
              fid={context.userFid}
              appFrame
              gameType={gameType}
              onShare={context.share}
              asGuest={asGuest}
              userChip={
                asGuest ? (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignIn}
                      loading={signingIn}
                      disabled={signingIn}
                    >
                      Sign in
                    </Button>
                  </div>
                ) : (
                  <SignIn />
                )
              }
            />
          </div>
        ) : status === "loading" ? (
          <Loading />
        ) : (
          status === "unauthenticated" && (
            <div className="text-center flex-1 flex flex-col items-center justify-center gap-1">
              <div className="text-3xl font-bold font-space">Framedl</div>
              <div className="text-md text-primary-900/60">
                Wordle in a frame
              </div>
              <div className="w-full pt-5">
                <GameGuessGrid guesses={placeholderGuesses} placeholder full />
              </div>
            </div>
          )
        )}
        {status === "unauthenticated" && !asGuest && (
          <div className="flex flex-col gap-2 w-full p-4">
            <Button
              variant="primary"
              onClick={handleSignIn}
              disabled={signingIn}
              loading={signingIn}
            >
              Sign in
            </Button>
            <Button
              variant="outline"
              onClick={handleContinueAsGuest}
              disabled={signingIn}
              size="sm"
            >
              Continue as guest
            </Button>
          </div>
        )}
        {/* {(status === "authenticated" || asGuest) && (
          <div className="flex flex-col gap-2 w-full p-4">
            <Button variant="primary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        )} */}
        {signInFailure && (
          <div className="flex flex-col gap-2 w-full p-4 items-center">
            <div className="flex text-red-500 bg-red-100 rounded-md px-3 py-2 text-center text-sm">
              Sign in failed: {signInFailure}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ClientContext {
  userData?: UserData;
  userFid?: number;
  isReady: boolean;
  client?: FrameContext["client"];
  share: ({ title, url }: { title: string; url: string }) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  requestAddFrame: () => Promise<void>;
}

function useClientContext({
  onLoad,
}: {
  onLoad?: (ctx: FrameContext) => void;
}): ClientContext {
  const [context, setContext] = useState<FrameContext | undefined>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
      onLoad?.(ctx);
    };
    if (!ready && sdk) {
      setReady(true);
      load();
    }
  }, [ready]);

  const userData = useMemo(() => {
    return context?.user ? toUserData(context.user) : undefined;
  }, [context?.user]);

  const share = useCallback(
    ({ title, url }: { title: string; url: string }) => {
      return sdk.actions.openUrl(createComposeUrl(title, url));
    },
    []
  );

  const openUrl = useCallback((url: string) => {
    return sdk.actions.openUrl(url);
  }, []);

  const requestAddFrame = useCallback(() => {
    sdk.actions.addFrame();
    return Promise.resolve();
  }, []);

  return {
    userData,
    userFid: context?.user?.fid,
    isReady: ready,
    client: context?.client,
    share,
    openUrl,
    requestAddFrame,
  };
}

export function AppFrame({
  config,
  gameType,
  debug,
}: {
  config: Config;
  gameType?: string;
  debug?: {
    debugUrl?: string;
  };
}) {
  const clientContext = useClientContext({
    onLoad: () => {
      sdk.actions.ready();
      window.focus();
    },
  });

  if (!clientContext.isReady) {
    return null;
  }

  const debugPanel = debug ? (
    <div className={"text-xs max-h-[100px] overflow-y-auto"}>
      {JSON.stringify(clientContext, null, 2)}
      <button
        className="bg-primary-500 text-white px-4 py-3 font-bold rounded-md"
        onClick={() =>
          clientContext.openUrl(debug?.debugUrl || "https://www.google.com")
        }
      >
        Test open url
      </button>
    </div>
  ) : undefined;

  return (
    <GameContainer
      context={clientContext}
      config={config}
      gameType={gameType}
      debugPanel={debugPanel}
    />
  );
}
