import { NextRequest, NextResponse } from "next/server";
import {
  gameService,
  GuessedGame,
  PassRequiredError,
} from "@/app/game/game-service";
import { loadUserData } from "@/app/games/user-data";
import { BaseUserRequest, getUserInfoFromRequest } from "../../api-utils";

export const dynamic = "force-dynamic";

// TODO: remove this?
export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid");
  if (!fid) {
    return NextResponse.json({ error: "Missing fid" }, { status: 400 });
  }
  // const gk = searchParams.get("gk");
  const gameKey = gameService.getDailyKey();

  const game = await gameService.loadOrCreate({
    gameKey,
    userId: fid,
    identityProvider: "fc_unauth",
    isDaily: true,
  });

  return NextResponse.json(gameToResponse(game));
};

interface PlayRequest extends BaseUserRequest {
  guess: string;
  gameId?: string;
  gameType?: string;
}

function gameToResponse(game: GuessedGame) {
  return {
    data: game.completedAt != null ? game : { ...game, word: "" },
  };
}

export const POST = async (req: NextRequest) => {
  const body: PlayRequest = await req.json();

  const { userKey, userData } = await getUserInfoFromRequest(req, body);
  // if (isPro) {
  //   if (!userData?.passOwnership) {
  //     return NextResponse.json(
  //       { error: "Framedl PRO Pass is required to play!" },
  //       { status: 401 }
  //     );
  //   }
  // }

  let game: GuessedGame | null = null;
  try {
    game = body.gameId
      ? await gameService.load(body.gameId)
      : await gameService.loadOrCreate(
          {
            ...userKey,
            gameKey:
              body.gameType === "daily"
                ? gameService.getDailyKey()
                : Math.random().toString(36).substring(2),
            isDaily: body.gameType === "daily",
          },
          {
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
          }
        );
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
    return NextResponse.json(gameToResponse(game));
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
  return NextResponse.json(gameToResponse(updatedGame));
};
