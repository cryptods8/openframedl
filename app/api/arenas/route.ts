import { externalBaseUrl } from "@/app/constants";
import { ArenaConfig, ArenaDuration, ArenaStart } from "@/app/db/pg/types";
import { insertArena } from "@/app/game/arena-pg-repository";
import { gameService } from "@/app/game/game-service";
import { NextResponse } from "next/server";

interface ArenaCreateRequest {
  wordCount: number;
  start: ArenaStart;
  duration: ArenaDuration;
  audienceSize: number;
  suddenDeath: boolean;
}

const allowedApiKeys = process.env.ALLOWED_API_KEYS?.split(",") ?? [];
const adminApiKey = process.env.ADMIN_SECRET;

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-framedl-api-key");
  if (!apiKey || ![...allowedApiKeys, adminApiKey].includes(apiKey)) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
  }

  const { wordCount, start, duration, audienceSize, suddenDeath } =
    (await req.json()) as Partial<ArenaCreateRequest>;

  const config = {
    audience: [],
    audienceSize: audienceSize ?? 2,
    duration: duration ?? { type: "unlimited" },
    start: start ?? { type: "immediate" },
    words: gameService.generateRandomWords(wordCount ?? 5),
    suddenDeath: suddenDeath ?? null,
  } satisfies ArenaConfig;
  const arena = {
    createdAt: new Date(),
    updatedAt: new Date(),
    config: JSON.stringify(config),
    members: "[]",
    userData: "{}",
    userId: "0x0000000000000000000000000000000000000000",
    identityProvider: "xmtp" as const,
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
