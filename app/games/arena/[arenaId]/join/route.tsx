/* eslint-disable react/jsx-key */
import { Button, error } from "frames.js/core";
import { createCustomFrames } from "@/app/games/frames";
import { getUserDataForFid } from "frames.js";
import { hubHttpUrl, hubRequestOptions } from "@/app/constants";
import {
  findArenaWithGamesById,
  updateArena,
} from "@/app/game/arena-pg-repository";
import { getArenaAvailabilityProperties } from "../../arena-utils";
import { createComposeUrl } from "@/app/utils";

const frames = createCustomFrames({});

export const GET = frames(async (ctx) => {
  const { request } = ctx;
  const arenaId = request.nextContext?.params?.arenaId;
  if (!arenaId) {
    return error("Arena ID not found!");
  }
  const numArenaId = parseInt(arenaId, 10);
  if (isNaN(numArenaId)) {
    return error("Invalid arena ID");
  }
  const arena = await findArenaWithGamesById(numArenaId);
  if (!arena) {
    return error("Arena not found");
  }

  return {
    image: ctx.createSignedUrlWithBasePath(`/arena/${arenaId}/join/image`),
    imageOptions: {
      aspectRatio: arena.config.audienceSize > 6 ? "1:1" : "1.91:1",
    },
    buttons: [
      <Button
        action="post"
        target={ctx.createUrlWithBasePath(
          `/arena/${arenaId}/join?id=${arenaId}`
        )}
      >
        Join
      </Button>,
      <Button
        action="post"
        target={ctx.createUrlWithBasePath(`/arena/${arenaId}/stats`)}
      >
        Results
      </Button>,
      <Button action="post" target={ctx.createUrlWithBasePath(`/arena/create`)}>
        Create
      </Button>,
      <Button
        action="link"
        target={createComposeUrl(
          "",
          ctx.createExternalUrl(`/games/arena/${arenaId}/join`)
        )}
      >
        Share
      </Button>,
    ],
  };
});

type ArenaJoinFrameState = {
  arenaId?: string;
};

const ARENA_BLACKLIST =
  process.env.ARENA_BLACKLIST ||
  "xmtp/0x8009eC9AAC8Cdebc896ecBf5Abb6fC5aAafcc4a7";

function isOnBlacklist(userKey: { userId: string; identityProvider: string }) {
  return ARENA_BLACKLIST.split(",").includes(
    `${userKey.identityProvider}/${userKey.userId}`
  );
}

export const POST = createCustomFrames<ArenaJoinFrameState>({})(async (ctx) => {
  const { request, userKey, state } = ctx;
  const arenaId = state.arenaId || request.nextContext?.params.arenaId;

  if (!arenaId) {
    return error("Arena ID not found!");
  }
  const numArenaId = parseInt(arenaId, 10);
  if (isNaN(numArenaId)) {
    return error("Invalid arena ID");
  }
  if (!userKey) {
    return error("User ID not found!");
  }
  if (isOnBlacklist(userKey)) {
    return error("You are not allowed to join this arena!");
  }

  // check if arena exists
  const [arena, userData] = await Promise.all([
    findArenaWithGamesById(numArenaId),
    getUserDataForFid({
      fid: parseInt(userKey.userId, 10),
      options: { hubHttpUrl, hubRequestOptions },
    }),
  ]);
  if (!arena) {
    return error("Arena not found");
  }
  const now = new Date();
  // check arena is open -- join should be allowed, play should be blocked
  // if (arena.start.type === "scheduled" && new Date(arena.start.date) > now) {
  //   return error("Arena not yet open");
  // }
  if (arena.startedAt && arena.config.duration.type === "interval") {
    const duration = arena.config.duration.minutes * 60 * 1000;
    if (now.getTime() - arena.startedAt.getTime() > duration) {
      return error("Arena already closed");
    }
  }
  // check arena members list
  const { membership, status: availabilityStatus } =
    getArenaAvailabilityProperties(arena, {
      ...userKey,
      username: userData?.username,
    });
  if (!membership || !membership.success) {
    return error("You can't join the arena - there are no free slots");
  }
  let added = false;
  if (membership.type === "audience" || membership.type === "free_slot") {
    // add user to members
    arena.members.push({
      userId: userKey.userId,
      identityProvider: userKey.identityProvider,
      username: userData?.username,
    });
    const { games, ...rest } = arena;
    await updateArena(arena.id, {
      ...rest,
      startedAt:
        arena.startedAt ||
        (arena.config.start.type === "immediate" ? new Date() : null),
      config: JSON.stringify(arena.config),
      members: JSON.stringify(arena.members),
      userData: JSON.stringify(arena.userData),
    });
    added = true;
  }

  return {
    state: {
      arenaId,
    },
    image: ctx.createSignedUrlWithBasePath({
      pathname: `/arena/${arenaId}/join/image`,
      query: {
        msg: `${availabilityStatus === "OPEN" ? "Perfect, you" : "You"} ${
          added ? "joined the arena!" : "are in the arena."
        } ${
          availabilityStatus === "OPEN"
            ? "Now it's time to play!"
            : availabilityStatus === "ENDED"
            ? "It has already closed though."
            : "Wait for it to open!"
        }`,
        uid: userKey.userId,
        ip: userKey.identityProvider,
      },
    }),
    imageOptions: {
      aspectRatio: arena.config.audienceSize > 6 ? "1:1" : "1.91:1",
    },
    buttons: [
      availabilityStatus === "OPEN" ? (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath(`/arena/${arenaId}/play`)}
        >
          Play
        </Button>
      ) : (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath(`/arena/${arenaId}/join`)}
        >
          Refresh
        </Button>
      ),
      <Button
        action="post"
        target={ctx.createUrlWithBasePath(`/arena/${arenaId}/stats`)}
      >
        Results
      </Button>,
      <Button action="post" target={ctx.createUrlWithBasePath(`/arena/create`)}>
        Create
      </Button>,
      <Button
        action="link"
        target={createComposeUrl(
          "",
          ctx.createExternalUrl(`/games/arena/${arenaId}/join`)
        )}
      >
        Share
      </Button>,
    ],
  };
});
