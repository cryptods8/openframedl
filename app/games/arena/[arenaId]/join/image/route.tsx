import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "@vercel/og";
import { options } from "@/app/generate-image";
import { primaryColor } from "@/app/image-ui/image-utils";
import { ArenaTitle } from "@/app/image-ui/arena/arena-title";
import { BasicLayout } from "@/app/image-ui/basic-layout";
import {
  ArenaWithGames,
  findArenaWithGamesById,
} from "@/app/game/arena-pg-repository";
import { GameIdentityProvider, UserKey } from "@/app/game/game-repository";
import {
  determineAwaitingAudience,
  getArenaAvailabilityProperties,
  getArenaGamesForUser,
  isAudienceMember,
} from "../../../arena-utils";
import { ArenaAudienceMember, ArenaMember } from "@/app/db/pg/types";
import { formatDuration } from "../../../create/route";
import { CheckIcon } from "@/app/image-ui/icons/CheckIcon";
import { ClockIcon } from "@/app/image-ui/icons/ClockIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function AudienceMemberLabel({
  status,
  current,
  children,
}: {
  status: "JOINED" | "AWAITING";
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      tw="flex pl-3 pr-6 py-3 rounded-xl items-center"
      style={{
        backgroundColor:
          status === "JOINED" ? "rgba(0, 255, 0, 0.16)" : primaryColor(0.08),
        gap: "1rem",
        border: `2px solid ${current ? "green" : "transparent"}`,
      }}
    >
      <div
        tw="flex w-12 h-12"
        style={{ color: status === "JOINED" ? "green" : primaryColor(0.32) }}
      >
        {status === "JOINED" ? <CheckIcon /> : <ClockIcon />}
      </div>
      <div tw="flex">{children}</div>
    </div>
  );
}

function renderMessageWithHighlights(
  message: { text: string; highlighted?: boolean }[]
) {
  return (
    <div
      tw="flex flex-row flex-wrap items-center"
      style={{ whiteSpace: "pre-wrap" }}
    >
      {message.map(({ text, highlighted }, idx) => (
        <span
          key={idx}
          style={
            highlighted
              ? {}
              : {
                  color: primaryColor(0.54),
                }
          }
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

function renderParameters({ arena }: { arena: ArenaWithGames }) {
  const {
    config: { words, duration, start, suddenDeath },
    startedAt,
  } = arena;
  const startTime =
    startedAt ??
    (start.type === "immediate" ? undefined : new Date(start.date));
  const endTime =
    startTime && duration.type === "interval"
      ? new Date(startTime.getTime() + duration.minutes * 60 * 1000)
      : undefined;
  const isFinished = endTime && Date.now() > endTime.getTime();

  const items: React.ReactNode[] = [
    <div key="1" tw="flex">
      {renderMessageWithHighlights([
        { text: words.length.toString(), highlighted: true },
        { text: " words to play" },
      ])}
    </div>,
    <div key="2" tw="flex">
      {formatTimeRangeBoundary(startTime)}
    </div>,
    <div key="3" tw="flex">
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
    items.push(
      <div key="4" tw="flex">
        🔥 Sudden Death
      </div>
    );
  }
  return (
    <div tw="flex flex-col items-center w-full" style={{ gap: "1rem" }}>
      {items.map((item, idx) => (
        <div key={idx} tw="flex items-center w-full" style={{ gap: "2rem" }}>
          <div
            tw="flex flex-1 h-2"
            style={{ backgroundColor: primaryColor(0.12) }}
          />
          {item}
          <div
            tw="flex flex-1 h-2"
            style={{ backgroundColor: primaryColor(0.12) }}
          />
        </div>
      ))}
    </div>
  );
}

function AudienceMemberGameStats({
  arena,
  member,
}: {
  arena: ArenaWithGames;
  member: ArenaMember;
}) {
  const userGames = getArenaGamesForUser(arena, member);
  const completedGamesCount = userGames.filter(
    (g) => g.completedAt != null
  ).length;
  const totalGamesCount = arena.config.words.length;
  const completedPercentage = Math.round(
    (completedGamesCount / totalGamesCount) * 100
  );

  return (
    <div tw="flex items-center">
      {/* <div
        tw="flex absolute top-0 left-0 bottom-0 bg-green-500"
        style={{ width: `${completedPercentage}%` }}
      /> */}
      <span style={{ color: "green" }}>{completedGamesCount}</span>
      <span tw="text-2xl" style={{ color: primaryColor(0.54) }}>
        /{totalGamesCount}
      </span>
    </div>
  );
}

function shortenMid(string: string, start: number, end: number) {
  return (
    string.substring(0, start) + "…" + string.substring(string.length - end)
  );
}

function formatUsername({ identityProvider, userId, username }: ArenaAudienceMember) {
  if (username) {
    return `@${username}`;
  }
  if (identityProvider === "xmtp") {
    return `${shortenMid(userId!, 6, 4)}`;
  }
  return `!${userId}`;
}

function renderAudience({
  arena,
  currentUser,
}: {
  arena: ArenaWithGames;
  currentUser?: UserKey;
}) {
  const awaitingAudienceRes = arena ? determineAwaitingAudience(arena) : null;
  const awaitingAudience = awaitingAudienceRes?.audience || [];
  const freeSlots = awaitingAudienceRes?.freeSlots || 0;

  const items = [
    ...arena.members.map((m) => ({
      key: `${m.identityProvider}/${m.userId}`,
      label: (
        <div tw="flex items-center" style={{ gap: "1rem" }}>
          <div tw="flex">{formatUsername(m)}</div>
          <div tw="flex">
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
      key: `${m.identityProvider}/${m.userId ?? `@${m.username}`}`,
      label: formatUsername(m),
      status: "AWAITING" as const,
      current: currentUser && isAudienceMember(m, currentUser),
    })),
  ];

  function renderItem({ key, label, status, current }: (typeof items)[0]) {
    return (
      <AudienceMemberLabel key={key} status={status} current={current}>
        {label}
      </AudienceMemberLabel>
    );
  }

  return (
    <div tw="flex flex-col px-12 items-center">
      <div
        tw="flex flex-row flex-wrap items-center justify-center"
        style={{ gap: "1rem" }}
      >
        {items.length === 2 && freeSlots === 0 && (
          <div
            tw="flex flex-row flex-wrap items-center"
            style={{ gap: "1rem" }}
          >
            {renderItem(items[0]!)}
            <span style={{ color: primaryColor(0.54) }}>vs</span>
            {renderItem(items[1]!)}
          </div>
        )}
        {(items.length !== 2 || freeSlots !== 0) &&
          items.map((m) => renderItem(m))}
        {freeSlots > 0 && (
          <div tw="flex" style={{ color: primaryColor(0.54) }}>
            {`${items.length > 0 ? "+" : ""}${freeSlots} free slot${
              freeSlots > 1 ? "s" : ""
            }`}
          </div>
        )}
      </div>
    </div>
  );
}

function ArenaImage({
  arena,
  currentUser,
  message,
}: {
  arena?: ArenaWithGames;
  currentUser?: UserKey;
  message?: React.ReactNode;
}) {
  return (
    <div
      tw="flex flex-col items-center w-full h-full relative"
      style={{ backgroundColor: primaryColor(0.04) }}
    >
      <ArenaTitle />
      <div tw="flex flex-1 items-center justify-center w-full">
        {arena ? (
          <div tw="flex flex-col items-center w-full h-full px-12 pb-12">
            <div tw="flex flex-1 items-center justify-center">
              {renderAudience({ arena, currentUser })}
            </div>
            <div tw="flex w-full items-center justify-center">
              {renderParameters({ arena })}
            </div>
          </div>
        ) : (
          <div style={{ color: primaryColor(0.54) }}>{"No arena found :("}</div>
        )}
      </div>
      {message && (
        <div tw="flex absolute left-0 right-0 bottom-0 p-8 items-center justify-center">
          <div
            tw="flex rounded-lg py-4 px-8 shadow-lg text-white"
            style={{ backgroundColor: primaryColor() }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Record<string, string | undefined> }
) {
  const { arenaId } = ctx.params;
  const message = req.nextUrl.searchParams.get("msg") as string | undefined;
  const userId = req.nextUrl.searchParams.get("uid") as string | undefined;
  const identityProvider = req.nextUrl.searchParams.get("ip") as
    | GameIdentityProvider
    | undefined;

  const userKey =
    userId && identityProvider ? { userId, identityProvider } : undefined;

  const arena = arenaId
    ? await findArenaWithGamesById(parseInt(arenaId, 10))
    : null;
  if (!arena) {
    return NextResponse.json({ error: "Arena not found" }, { status: 404 });
  }

  const { completionStatus } = getArenaAvailabilityProperties(arena, userKey);

  let imageOptions = options;
  if (arena.config.audienceSize > 6) {
    imageOptions = {
      ...options,
      width: 1200,
      height: 1200,
    };
  }

  const resp = new ImageResponse(
    (
      <BasicLayout>
        <ArenaImage arena={arena} currentUser={userKey} message={message} />
      </BasicLayout>
    ),
    imageOptions
  );

  if (completionStatus === "IN_PROGRESS") {
    resp.headers.set("cache-control", "public, max-age=60");
  } else if (completionStatus === "NOT_STARTED") {
    resp.headers.set("cache-control", "public, max-age=600");
  }
  return resp;
}
