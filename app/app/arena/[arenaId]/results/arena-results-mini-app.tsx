"use client";

import Loading from "@/app/app/loading";
import {
  ClientContext,
  useClientContext,
} from "@/app/app/v2/use-client-context";
import { useAppConfig } from "@/app/contexts/app-config-context";
import { UserKey } from "@/app/game/game-repository";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Button } from "@/app/ui/button/button";
import { sdk, SignIn as MiniAppSignIn } from "@farcaster/miniapp-sdk";
import { getCsrfToken, signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import cn from "clsx";
import {
  ArenaAvailabilityProperties,
  getArenaAvailabilityProperties,
  PublicArenaWithGames,
} from "@/app/games/arena/arena-utils";
import { useMeasure } from "react-use";
import { toast } from "@/app/ui/toasts/toast";
import { useFarcasterSession } from "@/app/hooks/use-farcaster-session";
import { PaddedContainer } from "@/app/ui/padded-container";
import { ArenaResults } from "./arena-results";

function renderMessageWithHighlights(
  message: { text: string; highlighted?: boolean }[]
) {
  return (
    <div className="flex flex-row flex-wrap items-center whitespace-pre-wrap">
      {message.map(({ text, highlighted }, idx) => (
        <span
          key={idx}
          className={cn(
            highlighted ? "text-primary-900" : "text-primary-900/50"
          )}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function formatDurationSimple(durationInMinutes: number) {
  const days = Math.floor(durationInMinutes / 60 / 24);
  if (days > 1) {
    return `${days} days`;
  }
  const hours = Math.floor((durationInMinutes % (60 * 24)) / 60);
  if (days === 1) {
    return `1 day and ${hours} hours`;
  }
  if (hours > 2) {
    return `${hours} hours`;
  }
  const minutes = durationInMinutes % 60;
  const formatMinutes = (m: number) => `${m} minute${m === 1 ? "" : "s"}`;
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"} and ${formatMinutes(
        minutes
      )}`;
    }
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return formatMinutes(Math.max(1, minutes));
}

function formatTimeRangeBoundary(timestamp: Date | undefined, end?: boolean) {
  if (!timestamp) {
    if (end) {
      return renderMessageWithHighlights([
        { text: "Without", highlighted: true },
        { text: " time limit" },
      ]);
    }
    return renderMessageWithHighlights([
      { text: "Starts " },
      { text: "immediately", highlighted: true },
    ]);
  }
  const now = new Date();
  // format to YYYY-MM-DD HH:mm
  const isoString = timestamp.toISOString();
  const isoStringParts = isoString.split("T");
  const formattedTimestamp =
    isoStringParts[0]! + " " + isoStringParts[1]!.slice(0, 5);
  const inPast = now.getTime() > timestamp.getTime();
  const startDiff = now.getTime() - timestamp.getTime();
  const startDiffInMinutes = Math.floor(startDiff / 1000 / 60);
  return renderMessageWithHighlights([
    {
      text: end
        ? inPast
          ? "Ended at "
          : "Ends at "
        : inPast
        ? "Started at "
        : "Starts at ",
    },
    { text: `${formattedTimestamp} UTC`, highlighted: true },
    {
      text: ` (${inPast ? "" : "in "}${formatDurationSimple(
        Math.abs(startDiffInMinutes)
      )}${inPast ? " ago" : ""})`,
    },
  ]);
}

export function formatDuration(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts = [];
  if (d) {
    parts.push(`${d}d`);
  }
  if (h) {
    parts.push(`${h}h`);
  }
  if (m) {
    parts.push(`${m}m`);
  }
  return parts.join(" ");
}

function ArenaResultsPanel({
  arena: initialArena,
  context,
  currentUser,
}: {
  arena: PublicArenaWithGames;
  context: ClientContext;
  currentUser?: UserKey;
}) {
  const { isPro, externalBaseUrl } = useAppConfig();
  const [arena, setArena] = useState(initialArena);
  const [buttonContainerRef, { height: buttonContainerHeight }] =
    useMeasure<HTMLDivElement>();
  const [isJoining, setIsJoining] = useState(false);
  const [joiningResult, setJoiningResult] = useState<{
    data: ArenaAvailabilityProperties;
    added: boolean;
    message: string;
  } | null>(null);

  const reloadArena = useCallback(async () => {
    const res = await fetch(`/api/arenas/${arena.id}`);
    const data = await res.json();
    setArena(data.data);
  }, [arena]);

  const handleJoin = useCallback(async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/arenas/${arena.id}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if ("error" in data) {
        toast(data.error);
      } else {
        if (data.added) {
          await reloadArena();
        }
        toast(data.message);
        setJoiningResult(data);
      }
    } catch (e) {
      console.error(e);
      toast("Error joining arena");
    } finally {
      setIsJoining(false);
    }
  }, [arena, context]);

  const handleShare = useCallback(() => {
    let url = `${externalBaseUrl}/app/arena/${arena.id}/results`;
    if (currentUser) {
      url += `?uid=${currentUser.userId}&ip=${currentUser.identityProvider}`;
    }
    context.share({
      title: "",
      url,
    });
  }, [context, currentUser]);

  const { status, completionStatus, memberCompletionStatus, membership } =
    useMemo(() => {
      return (
        joiningResult?.data ??
        getArenaAvailabilityProperties(arena, currentUser)
      );
    }, [arena, currentUser, joiningResult]);

  // const hasStarted = status === "OPEN";
  // const isFinished = status === "ENDED" || completionStatus === "COMPLETED";

  // useEffect(() => {
  //   if (hasStarted && !isFinished) {
  //     const interval = setInterval(() => {
  //       reloadArena();
  //     }, 2000);
  //     return () => clearInterval(interval);
  //   }
  // }, [hasStarted, isFinished, reloadArena]);

  return (
    <div className="flex flex-col sm:p-8 p-4 relative h-full flex-1 w-full">
      <div className="flex items-center gap-2 justify-between">
        <div>
          <h1 className="text-xl font-semibold font-space flex items-center flex-wrap whitespace-pre-wrap">
            <span>Framedl</span>
            {isPro && <span style={{ color: "green" }}> PRO</span>}
            <span> ⚔️ ARENA</span>
          </h1>
          <div className="text-primary-900/50 text-sm" onClick={reloadArena}>
            #{arena.id}
            {arena.userData?.username ? ` by ${arena.userData?.username}` : ""}
          </div>
        </div>
        <div>
          <SignIn />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        {/* <div className="text-2xl font-semibold text-center">
          <ArenaHeader arena={arena} showAvatar />
        </div>
        <ArenaAudience arena={arena} currentUser={currentUser} />
        <ArenaParameters arena={arena} /> */}
        <ArenaResults arena={arena} userKey={currentUser} />
      </div>
      <div style={{ height: buttonContainerHeight }} />
      <div
        className="fixed border-t border-primary-500/10 w-full bottom-0 left-0 right-0 bg-white/30 backdrop-blur-sm shadow-xl shadow-primary-500/10"
        ref={buttonContainerRef}
      >
        <div className="p-4">
          <PaddedContainer context={context} sides="rbl">
            <div className="flex flex-col gap-2">
              {status === "ENDED" ||
              completionStatus === "COMPLETED" ||
              memberCompletionStatus ===
                "COMPLETED" ? null : membership?.type === "audience" ||
                membership?.type === "free_slot" ? (
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  loading={isJoining}
                  disabled={isJoining}
                >
                  Join
                </Button>
              ) : membership?.type === "member" ||
                membership?.type === "member_free_slot" ? (
                <Button variant="primary" href={`/app/arena/${arena.id}/play`}>
                  Play
                </Button>
              ) : (
                <div className="text-center text-primary-900/50">
                  {"You can't join this arena anymore"}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleShare}>
                Share
              </Button>
            </div>
          </PaddedContainer>
        </div>
      </div>
    </div>
  );
}

function AuthContainer({
  context,
  arena,
}: {
  context: ClientContext;
  arena: PublicArenaWithGames;
}) {
  const { isPro } = useAppConfig();
  const { session, status } = useFarcasterSession();

  const currentUser = useMemo(() => {
    if (!session?.user) {
      return undefined;
    }
    return {
      userId: session.user.fid.toString(),
      identityProvider: "fc" as const,
    };
  }, [session]);

  const [signInFailure, setSignInFailure] = useState<string | undefined>();
  const [signingIn, setSigningIn] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      // setAsGuest(false);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof MiniAppSignIn.RejectedByUser) {
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

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <PaddedContainer
      className="w-full h-full flex-1 flex flex-col items-center justify-center"
      context={context}
    >
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center">
        <ArenaResultsPanel
          arena={arena}
          currentUser={currentUser}
          context={context}
        />
      </div>
    </PaddedContainer>
  );
}

export function ArenaResultsMiniApp({
  arena,
}: {
  arena?: PublicArenaWithGames;
}) {
  const clientContext = useClientContext({});

  return (
    <div className="w-full h-full flex-1 flex flex-col items-center justify-center">
      {arena ? (
        <AuthContainer context={clientContext} arena={arena} />
      ) : (
        <div className="flex-1 flex flex-col gap-4 items-center justify-center text-center text-primary-900/30">
          <span className="text-5xl font-semibold hover:rotate-90 transition-transform duration-300">
            {":("}
          </span>
          <span className="text-lg font-semibold">Arena not found</span>
        </div>
      )}
    </div>
  );
}
