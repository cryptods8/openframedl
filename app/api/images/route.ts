import { NextRequest } from "next/server";

import { generateImage } from "../../generate-image";
import { gameService, GuessedGame } from "../../game/game-service";
import { verifySignedUrl, timeCall } from "../../utils";
import { baseUrl } from "../../constants";
import { UserKey } from "../../game/game-repository";

const allowedQueryParams = ["gid", "msg", "shr", "signed"];

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  // remove extra query params
  const urlParams = url.searchParams;
  for (const param of urlParams.keys()) {
    if (!allowedQueryParams.includes(param)) {
      urlParams.delete(param);
    }
  }

  const search = urlParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  const verifiedUrl = verifySignedUrl(url);
  return new URL(verifiedUrl);
}

function isGameFinished(game: GuessedGame) {
  return game.status === "LOST" || game.status === "WON";
}

export const dynamic = "force-dynamic";

async function loadGame(gid: string) {
  return timeCall("loadGame", () => gameService.load(gid));
}

async function loadGameStats(userKey: UserKey) {
  return timeCall("loadGameStats", () => gameService.loadStats(userKey));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    if (process.env.MAINTENANCE === "true") {
      return await generateImage(undefined, {
        overlayMessage: "Framedl is under maintenance",
      });
    }
    const url = verifyUrl(req);
    const params = url.searchParams;
    const gid = params.get("gid");
    const msg = params.get("msg");
    const shr = params.get("shr");
    const game = gid ? await loadGame(gid) : null;
    const options = {
      overlayMessage: msg,
      share: shr === "1",
      userStats:
        (game &&
          isGameFinished(game) &&
          game.isDaily &&
          (await loadGameStats(game))) ||
        undefined,
    };
    return timeCall("generateImage", () => generateImage(game, options));
  } catch (e) {
    console.error(e);
    return await generateImage(undefined, {
      overlayMessage: "Error occured: " + (e as any).message,
    });
  } finally {
    console.log(`Time for GET /api/images: ${Date.now() - start}ms`);
  }
}
