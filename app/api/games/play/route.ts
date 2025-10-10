import { NextRequest, NextResponse } from "next/server";
import {
  gameService,
  GuessedGame,
  PassRequiredError,
  GameMetadata,
  BasicStats,
} from "@/app/game/game-service";
import { loadUserData } from "@/app/games/user-data";
import { BaseUserRequest, getUserInfoFromRequest } from "../../api-utils";
import { UserData, UserGameKey, UserKey } from "@/app/game/game-repository";
import { pgDb } from "@/app/db/pg/pg-db";

export const dynamic = "force-dynamic";

interface PlayRequest extends BaseUserRequest {
  guess: string;
  gameId?: string;
  gameType?: string;
  gameKey?: string;
}

function gameToResponse(game: GuessedGame, metadata: GameMetadata | null) {
  return {
    data:
      game.completedAt != null
        ? { ...game, arena: undefined, metadata }
        : { ...game, arena: undefined, word: "", metadata },
  };
}

async function loadReplacedScore(gameKey: UserGameKey) {
  try {
    return await gameService.loadReplacedScore(gameKey);
  } catch (e) {
    console.error("Error loading replaced score", e);
    return null;
  }
}

async function loadBasicStats(userKey: UserKey): Promise<BasicStats> {
  try {
    return await pgDb
      .selectFrom("game as g")
      .where("g.isDaily", "=", true)
      .where("g.userId", "=", userKey.userId)
      .where("g.identityProvider", "=", userKey.identityProvider)
      .select((db) => [
        db.fn.count<number>("g.id").as("totalGames"),
        db.fn
          .coalesce(
            db.fn.sum<number | null>(
              db.case().when("g.status", "=", "WON").then(1).else(0).end()
            ),
            db.val(0)
          )
          .as("totalWins"),
        db.fn
          .coalesce(
            db.fn.sum<number | null>(
              db.case().when("g.status", "=", "LOST").then(1).else(0).end()
            ),
            db.val(0)
          )
          .as("totalLosses"),
      ])
      .executeTakeFirstOrThrow();
  } catch (e) {
    console.error("Error loading basic stats", userKey, e);
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
    };
  }
}

async function loadOrCreateGame(
  userGameKey: UserGameKey,
  userData: UserData | null | undefined
): Promise<{
  game: GuessedGame;
  replacedScore?: number | null;
  basicStats?: BasicStats;
}> {
  const loadGamePromise = gameService.loadOrCreate(userGameKey, {
    userData: async () => {
      if (
        userData &&
        (userGameKey.identityProvider === "fc_unauth" ||
          userGameKey.identityProvider === "anon")
      ) {
        return userData;
      }
      return await loadUserData(userGameKey);
    },
  });
  if (userGameKey.isDaily) {
    const [game, replacedScore, basicStats] = await Promise.all([
      loadGamePromise,
      loadReplacedScore(userGameKey),
      loadBasicStats(userGameKey),
    ]);
    return {
      game,
      replacedScore,
      basicStats,
    };
  }
  return { game: await loadGamePromise };
}

export const POST = async (req: NextRequest) => {
  const body: PlayRequest = await req.json();

  const { userKey, userData } = await getUserInfoFromRequest(req, body);

  let game: GuessedGame | null = null;
  let metadata: GameMetadata | null = null;
  try {
    if (body.gameId) {
      game = await gameService.load(body.gameId);
    } else {
      const isDaily = body.gameType === "daily";
      const gameKey = isDaily
        ? gameService.getDailyKey()
        : body.gameKey
        ? body.gameKey
        : Math.random().toString(36).substring(2);
      const userGameKey = {
        ...userKey,
        gameKey,
        isDaily,
      };
      const {
        game: newGame,
        replacedScore,
        basicStats,
      } = await loadOrCreateGame(userGameKey, userData);
      game = newGame;
      metadata = { replacedScore, basicStats };
    }
  } catch (e) {
    if (e instanceof PassRequiredError) {
      console.log("PassRequiredError", e, userKey, userData);
      return NextResponse.json(
        {
          error: "Framedl PRO Pass is required to play!",
          type: "pass_required",
        },
        { status: 401 }
      );
    }
    throw e;
  }
  if (!game) {
    console.log("Game not found", userKey, body);
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const isOwner =
    game.userId === userKey.userId &&
    game.identityProvider === userKey.identityProvider;
  if (!isOwner) {
    console.log("Unauthorized", game, userKey);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.guess) {
    return NextResponse.json(gameToResponse(game, metadata));
  }
  const guess = body.guess.trim().toLowerCase();
  const validationResult = gameService.validateGuess(game, guess);
  if (validationResult !== "VALID") {
    console.log("Invalid guess", guess, validationResult);
    return NextResponse.json(
      { error: "Invalid guess", validationResult },
      { status: 400 }
    );
  }
  const updatedGame = await gameService.guess(game, guess);
  return NextResponse.json(gameToResponse(updatedGame, metadata));
};
