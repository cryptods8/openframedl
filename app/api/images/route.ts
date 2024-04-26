import { NextRequest } from "next/server";

import { generateImage } from "../../generate-image";
import { gameService, GuessedGame } from "../../game/game-service";
import { verifySignedUrl, timeCall } from "../../utils";
import { baseUrl } from "../../constants";
import { UserStats } from "../../game/game-repository";

const allowedQueryParams = ["gid", "msg", "shr", "signed", "custom"];

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

async function loadUserStats(
  game: GuessedGame | null
): Promise<UserStats | undefined | null> {
  if (game && isGameFinished(game) && game.isDaily) {
    return timeCall("loadGameStats", () => gameService.loadStats(game));
  }
  return undefined;
}

async function loadReplacedScore(
  game: GuessedGame | null
): Promise<number | null> {
  if (game && game.guesses.length === 0 && game.isDaily) {
    return timeCall("loadReplacedScore", () => {
      return gameService.loadReplacedScore(game);
    });
  }
  return null;
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
    const custom = params.get("custom");
    const game = gid ? await loadGame(gid) : null;
    const options = {
      overlayMessage: msg,
      share: shr === "1",
      custom: custom === "1",
      userStats: await loadUserStats(game),
      replacedScore: await loadReplacedScore(game),
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
