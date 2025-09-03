import { getUserInfoFromRequest } from "@/app/api/api-utils";
import {
  findArenaWithGamesById,
  updateArena,
} from "@/app/game/arena-pg-repository";
import { UserKey } from "@/app/game/game-repository";
import { getArenaAvailabilityProperties } from "@/app/games/arena/arena-utils";
import { loadUsername } from "@/app/games/user-data";
import { NextRequest, NextResponse } from "next/server";

const ARENA_BLACKLIST =
  process.env.ARENA_BLACKLIST ||
  "xmtp/0x8009eC9AAC8Cdebc896ecBf5Abb6fC5aAafcc4a7";

function isOnBlacklist(userKey: UserKey) {
  return ARENA_BLACKLIST.split(",").includes(
    `${userKey.identityProvider}/${userKey.userId}`
  );
}

function error(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { userKey } = await getUserInfoFromRequest(req, {});
  const { arenaId } = await params;

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

  const [arena, username] = await Promise.all([
    findArenaWithGamesById(numArenaId),
    loadUsername(userKey),
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
  const data =
    getArenaAvailabilityProperties(arena, userKey);
  const { membership, status: availabilityStatus } = data;
  if (!membership || !membership.success) {
    return error("You can't join the arena—there are no free slots");
  }
  if (membership.type === "member_kicked") {
    return error("You are not allowed to join this arena");
  }
  let added = false;
  if (membership.type === "audience" || membership.type === "free_slot") {
    // add user to members
    arena.members.push({
      userId: userKey.userId,
      identityProvider: userKey.identityProvider,
      username,
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
    data.membership = {
      success: true,
      type: membership.type === "audience" ? "member" : "member_free_slot",
    };
    data.memberCompletionStatus = "NOT_STARTED";
  }

  return NextResponse.json({
    message: "Arena joined",
    data,
    added,
  });
}
