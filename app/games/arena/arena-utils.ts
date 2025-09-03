import {
  DirectCast,
  sendDirectCastWithRetries,
} from "@/app/api/bot/reminders/send-direct-cast";
import { externalBaseUrl, isPro } from "@/app/constants";
import {
  ArenaAudienceMember,
  ArenaConfig,
  ArenaMember,
  DBArena,
  GameStatus,
} from "@/app/db/pg/types";
import { ArenaWithGames } from "@/app/game/arena-pg-repository";
import {
  GameIdentityProvider,
  UserData,
  UserGameKey,
  UserKey,
} from "@/app/game/game-repository";

export function getArenaGamesForUser<
  T extends {
    userId: string;
    identityProvider: GameIdentityProvider;
    arenaWordIndex: number | null;
  }
>(
  arena: {
    games: T[];
  },
  userKey: UserKey
): T[] {
  const allUserGames = arena.games.filter(
    (g) =>
      g.userId === userKey.userId &&
      g.identityProvider === userKey.identityProvider
  );
  return allUserGames.sort((a, b) => a.arenaWordIndex! - b.arenaWordIndex!);
}

export function isAudienceMember(
  audienceMember: ArenaAudienceMember,
  user: UserKey
) {
  if (audienceMember.identityProvider !== user.identityProvider) {
    return false;
  }
  return audienceMember.userId === user.userId;
}

interface ArenaMembership {
  success: boolean;
  type?:
    | "audience"
    | "member"
    | "free_slot"
    | "member_free_slot"
    | "member_kicked";
}

export function checkMembership(
  arena: {
    members: ArenaMember[];
    config: {
      audience: ArenaAudienceMember[];
      audienceSize: number;
    };
  },
  user: UserKey
): ArenaMembership {
  const member = arena.members.find(
    (m) =>
      m.userId === user.userId && m.identityProvider === user.identityProvider
  );
  if (member?.kickedAt) {
    return { success: true, type: "member_kicked" };
  }
  const isInAudience = !!arena.config.audience.find((m) =>
    isAudienceMember(m, user)
  );
  if (member) {
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

export function determineAwaitingAudience(arena: {
  members: ArenaMember[];
  config: {
    audience: ArenaAudienceMember[];
    audienceSize: number;
  };
}) {
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

interface SuddenDeathCheckResult {
  isOver: boolean;
  wordIndex?: number;
}

export type ArenaAvailabilityProperties = {
  start?: Date;
  end?: Date;
  status: ArenaAvailabilityStatus;
  membership?: ArenaMembership;
  completionStatus: ArenaCompletionStatus;
  memberCompletionStatus?: ArenaCompletionStatus;
  suddenDeathStatus?: SuddenDeathCheckResult;
};

export function checkSuddenDeath(arena: {
  config: DualArenaConfig;
  games: {
    completedAt: Date | string | null;
    guessCount: number;
    arenaWordIndex: number | null;
  }[];
}) {
  const {
    config: { suddenDeath, audienceSize },
    games,
  } = arena;
  if (!suddenDeath || audienceSize !== 2) {
    return null;
  }
  const wordCount =
    "wordCount" in arena.config
      ? arena.config.wordCount
      : arena.config.words.length;
  for (let i = 0; i < wordCount; i++) {
    const gamesByWordIndex = games.filter((g) => g.arenaWordIndex === i);
    if (gamesByWordIndex.length !== 2) {
      return { isOver: false };
    }
    const g0 = gamesByWordIndex[0]!;
    const g1 = gamesByWordIndex[1]!;
    if (g0.completedAt == null || g1.completedAt == null) {
      return { isOver: false };
    }
    if (g0.guessCount !== g1.guessCount) {
      return { isOver: true, wordIndex: i };
    }
  }
  return { isOver: false };
}

type DualArenaConfig =
  | ArenaConfig
  | (Omit<ArenaConfig, "words"> & { wordCount: number });

export function getArenaAvailabilityProperties(
  arena: {
    startedAt: Date | string | null;
    config: DualArenaConfig;
    members: ArenaMember[];
    games: {
      userId: string;
      identityProvider: GameIdentityProvider;
      completedAt: Date | string | null;
      guessCount: number;
      arenaWordIndex: number | null;
    }[];
  },
  member?: UserKey
): ArenaAvailabilityProperties {
  const now = new Date();
  const {
    startedAt,
    config: { start, duration, audienceSize },
    games,
  } = arena;

  const wordCount =
    "wordCount" in arena.config
      ? arena.config.wordCount
      : arena.config.words.length;

  const arenaStart = startedAt
    ? new Date(startedAt)
    : start.type === "immediate"
    ? undefined
    : new Date(start.date);
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
  const suddenDeathStatus = checkSuddenDeath(arena);

  if (member) {
    const memberGames = getArenaGamesForUser(arena, member);
    if (memberGames.length === 0) {
      memberCompletionStatus = "NOT_STARTED";
    } else if (
      (memberGames.length === wordCount &&
        memberGames[memberGames.length - 1]?.completedAt != null) ||
      suddenDeathStatus?.isOver
    ) {
      memberCompletionStatus = "COMPLETED";
    } else {
      memberCompletionStatus = "IN_PROGRESS";
    }
  }

  let completionStatus: ArenaCompletionStatus =
    games.length === 0
      ? "NOT_STARTED"
      : suddenDeathStatus?.isOver ||
        games.filter((g) => g.completedAt != null).length ===
          wordCount * audienceSize
      ? "COMPLETED"
      : "IN_PROGRESS";

  return {
    start: arenaStart,
    end: arenaEnd,
    status: availabilityStatus,
    completionStatus,
    memberCompletionStatus,
    membership,
    suddenDeathStatus: suddenDeathStatus ?? undefined,
  };
}

export interface PublicArena {
  id: number;
  config: Omit<ArenaConfig, "words"> & { wordCount: number };
  startedAt: Date | string | null;
  userData: UserData | null;
  members: ArenaMember[];
}

export interface PublicArenaWithGames extends PublicArena {
  games: (UserGameKey & {
    id: string;
    userData: UserData | null;
    guessCount: number;
    status: GameStatus;
    isDaily: boolean;
    arenaWordIndex: number | null;
    isHardMode: boolean;
    completedAt: Date | string | null;
  })[];
}

export function toPublicArena(arena: DBArena): PublicArena | undefined {
  if (!arena) {
    return undefined;
  }
  const { config: arenaConfig, startedAt, userData } = arena;
  const { words, ...config } = arenaConfig;
  return {
    id: arena.id,
    config: {
      ...config,
      wordCount: words.length,
    },
    startedAt: startedAt,
    userData: userData ?? null,
    members: arena.members,
  };
}

export function toPublicArenaWithGames(
  arena: ArenaWithGames | undefined
): PublicArenaWithGames | undefined {
  if (!arena) {
    return undefined;
  }
  const { games } = arena;
  return {
    ...toPublicArena(arena)!,
    games: games.map((game) => ({
      id: game.id,
      userId: game.userId,
      identityProvider: game.identityProvider,
      gameKey: game.gameKey,
      isDaily: game.isDaily,
      userData: game.userData,
      guessCount: game.guesses.length,
      status: game.status,
      arenaWordIndex: game.arenaWordIndex,
      isHardMode: game.isHardMode,
      completedAt: game.completedAt,
    })),
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
    const arenaUrl = `${externalBaseUrl}/app/arena/${arena.id}/join`;
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
