import { NextRequest, NextResponse } from "next/server";
import {
  gameService,
  GuessedGame,
  PassRequiredError,
  GameMetadata,
} from "@/app/game/game-service";
import { loadUserData } from "@/app/games/user-data";
import { BaseUserRequest, getUserInfoFromRequest } from "../../api-utils";
import { UserData, UserGameKey, UserKey } from "@/app/game/game-repository";

export const dynamic = "force-dynamic";

interface PlayRequest extends BaseUserRequest {
  guess: string;
  gameId?: string;
  gameType?: string;
}

function gameToResponse(game: GuessedGame, metadata: GameMetadata | null) {
  return {
    data: game.completedAt != null ? { ...game, metadata } : { ...game, word: "", metadata },
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

async function loadOrCreateGame(
  userKey: UserKey,
  userData: UserData | null | undefined,
  gameType: string | undefined
): Promise<{ game: GuessedGame, replacedScore?: number | null }> {
  const isDaily = gameType === "daily";
  const gameKey = isDaily
    ? gameService.getDailyKey()
    : Math.random().toString(36).substring(2);
  const userGameKey = {
    ...userKey,
    gameKey,
    isDaily,
  };
  const loadGamePromise = gameService.loadOrCreate(userGameKey, {
    userData: async () => {
      if (
        userData &&
        (userKey.identityProvider === "fc_unauth" ||
          userKey.identityProvider === "anon")
      ) {
        return userData;
      }
      return await loadUserData(userKey);
    },
  });
  if (isDaily) {
    const [game, replacedScore] = await Promise.all([
      loadGamePromise,
      loadReplacedScore(userGameKey),
    ]);
    return {
      game,
      replacedScore,
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
      const { game: newGame, replacedScore } = await loadOrCreateGame(userKey, userData, body.gameType);
      game = newGame;
      metadata = { replacedScore };
    }
  } catch (e) {
    if (e instanceof PassRequiredError) {
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
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const isOwner =
    game.userId === userKey.userId &&
    game.identityProvider === userKey.identityProvider;
  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.guess) {
    return NextResponse.json(gameToResponse(game, metadata));
  }
  const guess = body.guess.trim().toLowerCase();
  const validationResult = gameService.validateGuess(game, guess);
  if (validationResult !== "VALID") {
    return NextResponse.json(
      { error: "Invalid guess", validationResult },
      { status: 400 }
    );
  }
  const updatedGame = await gameService.guess(game, guess);
  return NextResponse.json(gameToResponse(updatedGame, metadata));
};
