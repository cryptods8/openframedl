import { v4 as uuid } from "uuid";

import { externalBaseUrl } from "@/app/constants";
import {
  DBCustomGameInsert,
} from "@/app/db/pg/types";
import * as customGameRepo from "@/app/game/custom-game-pg-repository";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { loadUserData } from "@/app/games/user-data";

export interface CustomGameCreateRequest {
  word: string;
  isArt: boolean;
}

const allowedApiKeys = process.env.ALLOWED_API_KEYS?.split(",") ?? [];
const adminApiKey = process.env.ADMIN_SECRET;
const wordRegex = /^[a-z]{5}$/;

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
  const { userKey, anonymous } = await getUserInfoFromRequest(req);
  if (anonymous) {
    return NextResponse.json(
      { error: "Anonymous users are not allowed" },
      { status: 403 }
    );
  }

  const {
    word,
    isArt
  } = (await req.json()) as Partial<CustomGameCreateRequest>;

  if (!word || !wordRegex.test(word)) {
    return NextResponse.json({
      error: `Invalid word ${word}`
    }, { status: 400 })
  }
  const userData = await loadUserData(userKey);

  const customGame: DBCustomGameInsert = {
    id: uuid(),
    word,
    createdAt: new Date(),
    ...userKey,
    userData: JSON.stringify(userData),
    isArt,
  };
  await customGameRepo.save(customGame);

  const gameUrl = `${externalBaseUrl}/?cw=${customGame.id}`;

  return NextResponse.json(
    { id: customGame.id, config: { isArt, word: isArt ? word : null }, gameUrl },
    {
      status: 201,
      headers: {
        Location: gameUrl,
      },
    }
  );
}
