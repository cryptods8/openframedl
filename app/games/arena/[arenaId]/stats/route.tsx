/* eslint-disable react/jsx-key */
import { findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { createCustomFrames } from "@/app/games/frames";
import { createComposeUrl } from "@/app/utils";
import { Button, error } from "frames.js/core";
import { getArenaAvailabilityProperties } from "../../arena-utils";
import { GameIdentityProvider } from "@/app/game/game-repository";

type ArenaStatsFrameState = {
  arenaId?: string;
};

const handler = createCustomFrames<ArenaStatsFrameState>({})(async (ctx) => {
  const { request, state, searchParams } = ctx;
  const arenaId = state.arenaId || request.nextContext?.params.arenaId;
  const from = searchParams.from;

  const uid = searchParams.uid;
  const ip = searchParams.ip as GameIdentityProvider | undefined;
  const userKey =
    ctx.userKey ??
    (uid && ip ? { userId: uid, identityProvider: ip } : undefined);

  if (!arenaId) {
    return error("No arena id provided");
  }
  const numArenaId = parseInt(arenaId, 10);
  if (isNaN(numArenaId)) {
    return error("Invalid arena id");
  }
  const arena = await findArenaWithGamesById(numArenaId);
  if (!arena) {
    return error("Arena not found");
  }
  const { memberCompletionStatus, completionStatus } =
    getArenaAvailabilityProperties(arena, userKey);

  const userKeyQuery: Record<string, string> = userKey
    ? { uid: userKey.userId, ip: userKey.identityProvider }
    : {};

  return {
    image: ctx.createSignedUrlWithBasePath({
      pathname: `/arena/${arenaId}/stats/image`,
      query: userKeyQuery,
    }),
    buttons: [
      <Button
        action="post"
        target={ctx.createUrlWithBasePath(
          `/arena/${arenaId}/stats?from=${from ?? "join"}`
        )}
      >
        Refresh
      </Button>,
      memberCompletionStatus !== "COMPLETED" &&
      completionStatus !== "COMPLETED" ? (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath(
            `/arena/${arenaId}/${from === "play" ? "play" : "join"}`
          )}
        >
          {from === "play" ? "Play" : "Join"}
        </Button>
      ) : undefined,
      <Button action="post" target={ctx.createUrlWithBasePath(`/arena/create`)}>
        Create Arena
      </Button>,
      <Button
        action="link"
        target={createComposeUrl(
          "",
          ctx.createExternalUrl({
            pathname: `/games/arena/${arenaId}/stats`,
            query: userKeyQuery,
          })
        )}
      >
        Share
      </Button>,
    ],
  };
});

export const POST = handler;
export const GET = handler;
