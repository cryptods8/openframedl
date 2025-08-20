"use client";

import { useAppConfig } from "@/app/contexts/app-config-context";
import { UserData } from "@/app/game/game-repository";
import { GuessedGame } from "@/app/game/game-service";
import { useSessionId } from "@/app/hooks/use-session-id";
import { FarcasterSession } from "@/app/lib/auth";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Button } from "@/app/ui/button/button";
import { Game as GameComponent, GameProps } from "@/app/ui/game";
import { GameGuessGrid } from "@/app/ui/game-guess-grid";
import { ProgressBarIcon } from "@/app/ui/icons/progress-bar-icon";
import { composeCast, createComposeUrl } from "@/app/utils";
import sdk, { SignIn as FrameSignIn, Context } from "@farcaster/miniapp-sdk";
import { getCsrfToken, useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HapticsTest } from "./haptics-test";

function toUserData(user: Context.MiniAppContext["user"]) {
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

interface ErrorResponse {
  error: string;
  type?: string;
}

function Game({
  asGuest,
  fid,
  gameType,
  customWordId,
  ...props
}: Omit<GameProps, "game"> & { fid?: number; asGuest: boolean, customWordId?: string }) {
  const [loadedGame, setLoadedGame] = useState<GuessedGame | undefined>();
  const [error, setError] = useState<ErrorResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const { sessionId } = useSessionId();

  const userData = props.userData;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/games/play`, {
          method: "POST",
          body: JSON.stringify({
            userData,
            userId: fid?.toString() || sessionId,
            identityProvider: asGuest
              ? fid
                ? "fc_unauth"
                : "anon"
              : undefined,
            gameType,
            gameKey: customWordId ? `custom_${customWordId}` : undefined,
          }),
        });
        if (!resp.ok) {
          const data = await resp.json();
          setError(data);
        } else {
          const data = await resp.json();
          setLoadedGame(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fid, gameType, asGuest, sessionId, userData, customWordId]);

  if (loading) {
    return <Loading />;
  }

  return (
    <GameComponent
      {...props}
      gameType={gameType}
      error={error}
      game={loadedGame}
    />
  );
}

const placeholderGuesses = ["PLAY ", "YOUR ", "HEART", "OUT! "].map((w) => ({
  characters: w
    .split("")
    .map((c) => ({ character: c, status: "UNKNOWN" as const })),
}));

function GameContainer({
  context,
  gameType,
  debugPanel,
  customWordId,
}: {
  context: ClientContext;
  gameType?: string;
  debugPanel?: React.ReactNode;
  customWordId?: string;
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
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true
      });

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
      context.requestAddFrame().catch((e) => {
        console.error(e);
      });
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
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center">
        {status === "authenticated" || asGuest ? (
          <div className="flex-1 w-full">
            <Game
              userData={context.userData}
              fid={context.userFid}
              appFrame
              gameType={gameType}
              customWordId={customWordId}
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
          <div className="flex flex-col gap-2 w-full max-w-sm p-4">
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
  client?: Context.MiniAppContext["client"];
  share: ({ title, url }: { title: string; url: string }) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  requestAddFrame: () => Promise<boolean>;
}

function useClientContext({
  onLoad,
}: {
  onLoad?: (ctx: Context.MiniAppContext) => void;
}): ClientContext {
  const { isPro } = useAppConfig();
  const [context, setContext] = useState<Context.MiniAppContext | undefined>();
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
  }, [ready, onLoad]);

  const userData = useMemo(() => {
    return context?.user ? toUserData(context.user) : undefined;
  }, [context?.user]);

  const share = useCallback(
    async ({ title, url }: { title: string; url: string }) => {
      // return sdk.actions.openUrl(createComposeUrl(title, url, { isPro }));
      await sdk.actions.composeCast(composeCast(title, url, { isPro }));
      return;
    },
    [isPro]
  );

  const openUrl = useCallback((url: string) => {
    return sdk.actions.openUrl(url);
  }, []);

  const requestAddFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
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
  gameType,
  debug,
  customWordId,
}: {
  gameType?: string;
  customWordId?: string;
  debug?: {
    debugUrl?: string;
  };
}) {
  const onLoad = useCallback(() => {
    sdk.actions.ready();
    window.focus();
  }, []);
  const clientContext = useClientContext({ onLoad });

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
      <HapticsTest />
    </div>
  ) : undefined;

  return (
    <GameContainer
      context={clientContext}
      gameType={gameType}
      customWordId={customWordId}
      debugPanel={debugPanel}
    />
  );
}
