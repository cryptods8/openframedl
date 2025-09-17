"use client";

import Loading from "@/app/app/loading";
import {
  ClientContext,
  useClientContext,
} from "@/app/app/v2/use-client-context";
import { useAppConfig } from "@/app/contexts/app-config-context";
import { ArenaAudienceMember, ArenaMember } from "@/app/db/pg/types";
import { UserKey } from "@/app/game/game-repository";
import { SignIn } from "@/app/ui/auth/sign-in";
import { Button } from "@/app/ui/button/button";
import { sdk, SignIn as MiniAppSignIn } from "@farcaster/miniapp-sdk";
import { getCsrfToken, signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import cn from "clsx";
import {
  ArenaAvailabilityProperties,
  determineAwaitingAudience,
  getArenaAvailabilityProperties,
  getArenaGamesForUser,
  isAudienceMember,
  PublicArenaWithGames,
} from "@/app/games/arena/arena-utils";
import { CheckIcon, ClockIcon } from "@heroicons/react/16/solid";
import { useMeasure } from "react-use";
import { useRouter } from "next/navigation";
import { toast } from "@/app/ui/toasts/toast";
import { useFarcasterSession } from "@/app/hooks/use-farcaster-session";
import { PaddedContainer } from "@/app/ui/padded-container";
import { ArenaHeader } from "./arena-header";
import Link from "next/link";

function renderMessageWithHighlights(
  message: { text: string; highlighted?: boolean }[]
) {
  return (
    <div className="text-center whitespace-pre-wrap">
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
  // Format timestamp using browser locale
  const formattedTimestamp = timestamp.toLocaleString(undefined);
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
    { text: `${formattedTimestamp}`, highlighted: true },
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

function AudienceMemberGameStats({
  arena,
  member,
}: {
  arena: PublicArenaWithGames;
  member: ArenaMember;
}) {
  const userGames = getArenaGamesForUser(arena, member);
  const completedGamesCount = userGames.filter(
    (g) => g.completedAt != null
  ).length;
  const totalGamesCount = arena.config.wordCount;
  const completedPercentage = Math.round(
    (completedGamesCount / totalGamesCount) * 100
  );

  return (
    <div className="flex items-baseline">
      {/* <div
        className="flex absolute top-0 left-0 bottom-0 bg-green-500"
        style={{ width: `${completedPercentage}%` }}
      /> */}
      <span className="text-green-600">{completedGamesCount}</span>
      <span className="text-sm text-primary-900/50">/{totalGamesCount}</span>
    </div>
  );
}

function shortenMid(string: string, start: number, end: number) {
  return (
    string.substring(0, start) + "…" + string.substring(string.length - end)
  );
}

function formatUsername({
  identityProvider,
  userId,
  username,
}: ArenaAudienceMember) {
  if (username) {
    return username;
  }
  if (identityProvider === "xmtp") {
    return `${shortenMid(userId!, 6, 4)}`;
  }
  return `!${userId}`;
}

const MAX_DISPLAYED_ITEMS = 10;

function AudienceMemberLabel({
  status,
  current,
  children,
}: {
  status: "JOINED" | "AWAITING";
  current?: boolean;
  children: React.ReactNode;
}) {
  const isJoined = status === "JOINED";
  return (
    <div
      className={cn(
        "flex pl-1 pr-2 py-1 rounded-md items-center gap-2 border border-2",
        isJoined ? "bg-green-600/10" : "bg-primary-900/10",
        current ? "border-green-600" : "border-transparent"
      )}
      style={
        {
          // backgroundColor:
          //   status === "JOINED" ? "rgba(0, 255, 0, 0.16)" : primaryColor(0.08),
          // gap: "1rem",
          // border: `2px solid ${current ? "green" : "transparent"}`,
        }
      }
    >
      <div
        className={cn(
          "flex w-6 h-6",
          isJoined ? "text-green-600" : "text-primary-900/30"
        )}
      >
        {isJoined ? <CheckIcon /> : <ClockIcon />}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ArenaAudience({
  arena,
  currentUser,
}: {
  arena: PublicArenaWithGames;
  currentUser?: UserKey;
}) {
  const awaitingAudienceRes = arena ? determineAwaitingAudience(arena) : null;
  const awaitingAudience = awaitingAudienceRes?.audience || [];
  const freeSlots = awaitingAudienceRes?.freeSlots || 0;

  const items = [
    ...arena.members
      .filter((m) => m.kickedAt == null)
      .map((m) => ({
        key: `${m.identityProvider}/${m.userId}`,
        label: (
          <div className="flex items-center gap-2">
            <div>{formatUsername(m)}</div>
            <div>
              <AudienceMemberGameStats arena={arena} member={m} />
            </div>
          </div>
        ),
        status: "JOINED" as const,
        current:
          currentUser &&
          isAudienceMember(
            {
              userId: m.userId,
              username: m.username,
              identityProvider: m.identityProvider,
            },
            currentUser
          ),
      })),
    ...awaitingAudience.map((m) => ({
      key: `${m.identityProvider}/${m.userId ?? m.username}`,
      label: formatUsername(m),
      status: "AWAITING" as const,
      current: currentUser && isAudienceMember(m, currentUser),
    })),
  ].sort((a, b) => (a.current ? -1 : b.current ? 1 : 0));

  const [isShownAllItems, setIsShownAllItems] = useState(false);
  const displayedItems = isShownAllItems
    ? items
    : items.slice(0, MAX_DISPLAYED_ITEMS);

  function renderItem({ key, label, status, current }: (typeof items)[0]) {
    return (
      <AudienceMemberLabel key={key} status={status} current={current}>
        {label}
      </AudienceMemberLabel>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-row flex-wrap items-center justify-center gap-2">
        {items.length === 2 && freeSlots === 0 && (
          <div className="flex flex-row flex-wrap items-center gap-2">
            {renderItem(items[0]!)}
            <span className="text-primary-900/50">vs</span>
            {renderItem(items[1]!)}
          </div>
        )}
        {(items.length !== 2 || freeSlots !== 0) &&
          displayedItems.map((m) => renderItem(m))}
        {displayedItems.length < items.length && !isShownAllItems && (
          <div
            className="text-primary-500 cursor-pointer hover:text-primary-900 hover:underline"
            role="button"
            onClick={() => setIsShownAllItems(true)}
          >
            {`+${items.length - displayedItems.length} more`}
          </div>
        )}
        {freeSlots > 0 && (
          <div className="text-primary-900/50">
            {`${items.length > 0 ? "+" : ""}${freeSlots} free slot${
              freeSlots > 1 ? "s" : ""
            }`}
          </div>
        )}
      </div>
    </div>
  );
}

function ArenaParameters({ arena }: { arena: PublicArenaWithGames }) {
  const {
    config: { wordCount, duration, start, suddenDeath, isHardModeRequired },
    startedAt,
  } = arena;
  const startTime = startedAt
    ? new Date(startedAt)
    : start.type === "immediate"
    ? undefined
    : new Date(start.date);
  const endTime =
    startTime && duration.type === "interval"
      ? new Date(startTime.getTime() + duration.minutes * 60 * 1000)
      : undefined;
  const isFinished = endTime && Date.now() > endTime.getTime();

  const items: React.ReactNode[] = [
    <div key="1">
      {renderMessageWithHighlights([
        { text: wordCount.toString(), highlighted: true },
        { text: " words to play" },
      ])}
    </div>,
    <div key="2">{formatTimeRangeBoundary(startTime)}</div>,
    <div key="3">
      {isFinished
        ? renderMessageWithHighlights([
            { text: "Already finished!", highlighted: true },
          ])
        : endTime || duration.type === "unlimited"
        ? formatTimeRangeBoundary(endTime, true)
        : renderMessageWithHighlights([
            { text: "Open for " },
            { text: formatDuration(duration.minutes), highlighted: true },
          ])}
    </div>,
  ];
  if (suddenDeath) {
    items.push(<div key="4">🔥 Sudden Death</div>);
  }
  if (isHardModeRequired) {
    items.push(<div key="5">💪 Hard Mode</div>);
  }
  return (
    <div className="flex flex-col items-center w-full gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center w-full gap-4 text-center">
          <div className="flex flex-1 h-1 bg-primary-900/10" />
          {item}
          <div className="flex flex-1 h-1 bg-primary-900/10" />
        </div>
      ))}
    </div>
  );
}

function JoinArena({
  arena: initialArena,
  context,
  currentUser,
}: {
  arena: PublicArenaWithGames;
  context: ClientContext;
  currentUser?: UserKey;
}) {
  const { isPro } = useAppConfig();
  const [arena, setArena] = useState(initialArena);
  const [buttonContainerRef, { height: buttonContainerHeight }] =
    useMeasure<HTMLDivElement>();
  const [isJoining, setIsJoining] = useState(false);
  const [joiningResult, setJoiningResult] = useState<{
    data: ArenaAvailabilityProperties;
    added: boolean;
    message: string;
  } | null>(null);
  const router = useRouter();

  const handlePlay = useCallback(async () => {
    router.push(`/app/arena/${arena.id}/play`);
  }, [arena]);

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

  const { status, completionStatus, memberCompletionStatus, membership } =
    useMemo(() => {
      return (
        joiningResult?.data ??
        getArenaAvailabilityProperties(arena, currentUser)
      );
    }, [arena, currentUser, joiningResult]);

  const isFinished = status === "ENDED" || completionStatus === "COMPLETED";
  const isFinishedForMember = memberCompletionStatus === "COMPLETED";

  return (
    <div className="flex flex-col sm:p-8 p-4 relative h-full flex-1 w-full">
      <div className="flex items-center gap-2 justify-between">
        <div>
          <Link href="/app/arena">
            <h1 className="text-xl font-semibold font-space flex items-center flex-wrap whitespace-pre-wrap">
              <span>Framedl</span>
              {isPro && <span style={{ color: "green" }}> PRO</span>}
              <span> ⚔️ ARENA</span>
            </h1>
          </Link>
          <div className="text-primary-900/50 text-sm">Join the arena</div>
        </div>
        <div>
          <SignIn />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 pt-8 pb-2">
        <div className="text-2xl font-semibold text-center">
          <ArenaHeader arena={arena} showAvatar />
        </div>
        <div className="flex-1">
          <ArenaAudience arena={arena} currentUser={currentUser} />
        </div>
        <ArenaParameters arena={arena} />
      </div>
      <div style={{ height: buttonContainerHeight }} />
      <div
        className="fixed border-t border-primary-500/10 w-full bottom-0 left-0 right-0 bg-white/30 backdrop-blur-sm shadow-xl shadow-primary-500/10"
        ref={buttonContainerRef}
      >
        <div className="p-4">
          <PaddedContainer context={context} sides="rbl">
            <div className="flex flex-col gap-2">
              {isFinished || isFinishedForMember ? (
                <div className="text-center text-primary-900/50">
                  {isFinished
                    ? "Arena already finished!"
                    : "You already finished the arena!"}
                </div>
              ) : membership?.type === "audience" ||
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
              {completionStatus !== "NOT_STARTED" && (
                <Button
                  variant={
                    isFinished || isFinishedForMember ? "primary" : "outline"
                  }
                  size={isFinished || isFinishedForMember ? "md" : "sm"}
                  href={`/app/arena/${arena.id}/results`}
                >
                  Results
                </Button>
              )}
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
  // const [signingOut, setSigningOut] = useState(false);
  // const [asGuest, setAsGuest] = useState(false);
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

  // const handleSignOut = useCallback(async () => {
  //   try {
  //     setSigningOut(true);
  //     setAsGuest(false);
  //     await signOut({ redirect: false });
  //   } finally {
  //     setSigningOut(false);
  //   }
  // }, []);

  // useEffect(() => {
  //   if (context.client && !context.client.added && !isFirstLoad) {
  //     context.requestAddFrame().catch((e) => {
  //       console.error(e);
  //     });
  //   }
  // }, [context, isFirstLoad]);

  return (
    <PaddedContainer
      className="w-full h-full flex-1 flex flex-col items-center justify-center"
      context={context}
    >
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center">
        {status === "authenticated" ? (
          <JoinArena
            arena={arena}
            context={context}
            currentUser={currentUser}
          />
        ) : status === "loading" ? (
          <Loading />
        ) : (
          status === "unauthenticated" && (
            <div className="text-center flex-1 flex flex-col items-center justify-center gap-1">
              <Link href="/app/arena">
                <div className="text-3xl font-bold font-space">
                  <span>Framedl</span>
                  {isPro && <span style={{ color: "green" }}> PRO</span>}
                  <span> ⚔️ ARENA</span>
                </div>
              </Link>
              <div className="text-md text-primary-900/60">
                Cross words with your friends
              </div>
              {/* <div className="w-full pt-5"> */}
              {/* <GameGuessGrid guesses={placeholderGuesses} placeholder full /> */}
              {/* </div> */}
            </div>
          )
        )}
        {status === "unauthenticated" && (
          <div className="flex flex-col gap-2 w-full max-w-sm p-4">
            <Button
              variant="primary"
              onClick={handleSignIn}
              disabled={signingIn}
              loading={signingIn}
            >
              Sign in
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
    </PaddedContainer>
  );
}

export function ArenaMiniApp({ arena }: { arena?: PublicArenaWithGames }) {
  const clientContext = useClientContext({});

  return (
    <div className="w-full h-full flex-1 flex flex-col">
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
