import { NextRequest } from "next/server";

import { generateImage } from "../../generate-image";
import {
  CustomGameMaker,
  gameService,
  GuessedGame,
} from "../../game/game-service";
import { timeCall } from "../../utils";
import { UserStats } from "../../game/game-repository";
import { verifyUrl } from "../api-utils";

const allowedQueryParams = ["gid", "msg", "shr", "custom", "cid"];

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

async function loadCustomGameMaker(
  cid: string | null | undefined
): Promise<CustomGameMaker | null> {
  if (cid) {
    return timeCall("loadCustomGameMaker", () =>
      gameService.loadCustomGameMaker(cid)
    );
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
    const url = verifyUrl(req, allowedQueryParams);
    const params = url.searchParams;
    const gid = params.get("gid");
    const msg = params.get("msg");
    const shr = params.get("shr");
    const custom = params.get("custom");
    const cid = params.get("cid");
    const game = gid ? await loadGame(gid) : null;
    const options = {
      overlayMessage: msg,
      share: shr === "1",
      custom: custom === "1",
      customMaker: await loadCustomGameMaker(cid),
      userStats: await loadUserStats(game),
      replacedScore: await loadReplacedScore(game),
    };
    return timeCall("generateImage", () => generateImage(game, options));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Error ocurred." }, { status: 500 });
  } finally {
    console.log(`Time for GET /api/images: ${Date.now() - start}ms`);
  }
}
