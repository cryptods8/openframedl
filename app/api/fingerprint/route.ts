import { NextRequest } from "next/server";

import { generateFingerprint } from "../../generate-image";
import { gameService } from "../../game/game-service";
import { timeCall } from "../../utils";
import { verifySignedUrl } from "../../signer";
import { baseUrl } from "../../constants";
import { GameIdentityProvider, UserKey } from "../../game/game-repository";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

export const dynamic = "force-dynamic";

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

async function loadAllGames(userKey: UserKey) {
  return timeCall("loadAllGames", () =>
    gameService.loadAllDailiesByUserKey(userKey)
  );
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const userId = params.get("uid") as string;
    const date = params.get("date") as string | undefined;
    const identityProvider = params.get("ip") as GameIdentityProvider;
    const games = await loadAllGames({ userId, identityProvider });
    return timeCall("generateFingerprint", () =>
      generateFingerprint(games, date)
    );
  } finally {
    console.log(`Time for GET /api/fingerprint: ${Date.now() - start}ms`);
  }
}
