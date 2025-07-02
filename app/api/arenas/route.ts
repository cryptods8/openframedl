import { externalBaseUrl } from "@/app/constants";
import {
  ArenaAudienceMember,
  ArenaConfig,
  ArenaDuration,
  ArenaStart,
} from "@/app/db/pg/types";
import { insertArena } from "@/app/game/arena-pg-repository";
import { gameService } from "@/app/game/game-service";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export interface ArenaCreateRequest {
  wordCount: number;
  start: ArenaStart;
  duration: ArenaDuration;
  audience: ArenaAudienceMember[];
  audienceSize: number;
  suddenDeath: boolean;
  initWords: string[];
  randomWords: boolean;
  isHardModeRequired: boolean;
}

const allowedApiKeys = process.env.ALLOWED_API_KEYS?.split(",") ?? [];
const adminApiKey = process.env.ADMIN_SECRET;

async function getUserInfoFromRequest(req: NextRequest) {
  const apiKey = req.headers.get("x-framedl-api-key");
  if (apiKey && [...allowedApiKeys, adminApiKey].includes(apiKey)) {
    return {
      userKey: {
        userId: "0x0000000000000000000000000000000000000000",
        identityProvider: "xmtp" as const,
      },
      userData: {},
    };
  }
  const jwt = req.headers.get("Authorization")?.split(" ")[1];
  return getUserInfoFromJwtOrSession(jwt);
}

export async function POST(req: NextRequest) {
  const { userData, userKey, anonymous } = await getUserInfoFromRequest(req);
  if (anonymous) {
    return NextResponse.json(
      { error: "Anonymous users are not allowed" },
      { status: 403 }
    );
  }

  const {
    wordCount,
    start,
    duration,
    audienceSize,
    audience,
    suddenDeath,
    initWords,
    randomWords,
    isHardModeRequired,
  } = (await req.json()) as Partial<ArenaCreateRequest>;

  const config = {
    audience: audience ?? [],
    audienceSize: audienceSize ?? 2,
    duration: duration ?? { type: "unlimited" },
    start: start ?? { type: "immediate" },
    words: gameService.generateRandomWords(wordCount ?? 5),
    suddenDeath: suddenDeath ?? null,
    initWords: initWords ?? null,
    randomWords: randomWords ?? null,
    isHardModeRequired: isHardModeRequired ?? null,
  } satisfies ArenaConfig;
  const arena = {
    createdAt: new Date(),
    updatedAt: new Date(),
    config: JSON.stringify(config),
    members: "[]",
    userData: JSON.stringify(userData || {}),
    userId: userKey.userId,
    identityProvider: userKey.identityProvider,
  };
  const id = await insertArena(arena);

  const arenaUrl = `${externalBaseUrl}/games/arena/${id}/join`;

  return NextResponse.json(
    { id, arenaUrl },
    {
      status: 201,
      headers: {
        Location: arenaUrl,
      },
    }
  );
}
