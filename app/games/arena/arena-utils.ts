import {
  DirectCast,
  sendDirectCastWithRetries,
} from "@/app/api/bot/reminders/send-direct-cast";
import { externalBaseUrl, isPro } from "@/app/constants";
import { ArenaAudienceMember, ArenaMember, DBArena } from "@/app/db/pg/types";
import { ArenaWithGames } from "@/app/game/arena-pg-repository";
import { UserKey } from "@/app/game/game-repository";

export function getArenaGamesForUser(arena: ArenaWithGames, userKey: UserKey) {
  const allUserGames = arena.games.filter(
    (g) =>
      g.userId === userKey.userId &&
      g.identityProvider === userKey.identityProvider
  );
  return allUserGames.sort((a, b) => a.arenaWordIndex! - b.arenaWordIndex!);
}

export function isAudienceMember(
  audienceMember: ArenaAudienceMember,
  user: ArenaMember
) {
  if (audienceMember.identityProvider !== user.identityProvider) {
    return false;
  }
  if (audienceMember.userId) {
    return audienceMember.userId === user.userId;
  }
  return audienceMember.username === user.username;
}

interface ArenaMembership {
  success: boolean;
  type?: "audience" | "member" | "free_slot" | "member_free_slot";
}

export function checkMembership(
  arena: DBArena,
  user: ArenaMember
): ArenaMembership {
  const isMember = arena.members.some(
    (m) =>
      m.userId === user.userId && m.identityProvider === user.identityProvider
  );
  const isInAudience = !!arena.config.audience.find((m) =>
    isAudienceMember(m, user)
  );
  if (isMember) {
    return {
      success: true,
      type: isInAudience ? "member" : "member_free_slot",
    };
  }
  if (isInAudience) {
    return { success: true, type: "audience" };
  }
  const freeSlotMembers = arena.members.filter(
    (m) => !arena.config.audience.find((a) => isAudienceMember(a, m))
  );
  const freeSlots =
    arena.config.audienceSize -
    arena.config.audience.length -
    freeSlotMembers.length;
  if (freeSlots > 0) {
    return { success: true, type: "free_slot" };
  }
  return { success: false };
}

export function determineAwaitingAudience(arena: DBArena) {
  return arena.members.reduce(
    (acc, m) => {
      const membership = checkMembership(arena, m);
      if (membership.type === "audience" || membership.type === "member") {
        acc.audience = acc.audience.filter((a) => !isAudienceMember(a, m));
      } else if (
        membership.type === "free_slot" ||
        membership.type === "member_free_slot"
      ) {
        acc.freeSlots -= 1;
      }
      return acc;
    },
    {
      audience: arena.config.audience,
      freeSlots: arena.config.audienceSize - arena.config.audience.length,
    }
  );
}

export type ArenaAvailabilityStatus = "PENDING" | "OPEN" | "ENDED";
export type ArenaCompletionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type ArenaAvailabilityProperties = {
  start?: Date;
  end?: Date;
  status: ArenaAvailabilityStatus;
  membership?: ArenaMembership;
  completionStatus: ArenaCompletionStatus;
  memberCompletionStatus?: ArenaCompletionStatus;
};

export function getArenaAvailabilityProperties(
  arena: ArenaWithGames,
  member?: ArenaMember
): ArenaAvailabilityProperties {
  const now = new Date();
  const {
    startedAt,
    config: { start, duration, words, audienceSize },
    games,
  } = arena;

  const arenaStart =
    startedAt || start.type === "immediate" ? undefined : new Date(start.date);
  const arenaEnd =
    arenaStart && duration.type === "interval"
      ? new Date(arenaStart.getTime() + duration.minutes * 60 * 1000)
      : undefined;

  const availabilityStatus =
    arenaStart && now < arenaStart
      ? "PENDING"
      : arenaEnd && now > arenaEnd
      ? "ENDED"
      : "OPEN";
  const membership = member ? checkMembership(arena, member) : undefined;

  let memberCompletionStatus: ArenaCompletionStatus = "NOT_STARTED";
  if (member) {
    const memberGames = getArenaGamesForUser(arena, member);
    if (memberGames.length === 0) {
      memberCompletionStatus = "NOT_STARTED";
    } else if (
      memberGames.length === words.length &&
      memberGames[memberGames.length - 1]?.completedAt != null
    ) {
      memberCompletionStatus = "COMPLETED";
    } else {
      memberCompletionStatus = "IN_PROGRESS";
    }
  }

  let completionStatus: ArenaCompletionStatus =
    games.length === 0
      ? "NOT_STARTED"
      : games.filter((g) => g.completedAt != null).length ===
        words.length * audienceSize
      ? "COMPLETED"
      : "IN_PROGRESS";

  return {
    start: arenaStart,
    end: arenaEnd,
    status: availabilityStatus,
    completionStatus,
    memberCompletionStatus,
    membership,
  };
}

export async function notifyArenaMembers(arena: ArenaWithGames) {
  if (!isPro) {
    return;
  }
  const { userId, identityProvider, config, members } = arena;
  if (identityProvider !== "fc" || userId !== "11124") {
    // only notify arenas created by me for now
    return;
  }
  const { status, end } = getArenaAvailabilityProperties(arena);
  const notifications: DirectCast[] = [];
  const fids = [...members, ...config.audience].reduce((acc, m) => {
    if (m.identityProvider === "fc" && m.userId) {
      const fid = parseInt(m.userId, 10);
      if (acc.includes(fid)) {
        return acc;
      }
      acc.push(fid);
    }
    return acc;
  }, [] as number[]);
  fids.forEach((fid) => {
    const arenaUrl = `${externalBaseUrl}/games/arena/${arena.id}/join`;
    let introMsg;
    if (status === "PENDING") {
      introMsg = `Framedl Arena was created. Join now!`;
    } else if (status === "ENDED") {
      introMsg = `Framedl Arena has ended! Thanks for playing!`;
    } else {
      if (end && end < new Date(Date.now() + 1000 * 60 * 60)) {
        introMsg = `Framedl Arena is ending soon. Don't miss out!`;
      } else {
        introMsg = `Framedl Arena has started. Good luck!`;
      }
    }
    let msg = `${introMsg}\n\n${arenaUrl}`;
    notifications.push({
      recipientFid: fid,
      message: msg,
      idempotencyKey: `arena-${arena.id}-${fid}-${Date.now()}`,
    });
  });
  await Promise.all(notifications.map((n) => sendDirectCastWithRetries(n)));
}
