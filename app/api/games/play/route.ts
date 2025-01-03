import { NextRequest, NextResponse } from "next/server";
import { gameService, GuessedGame } from "@/app/game/game-service";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { isPro } from "@/app/constants";
import { UserData } from "@/app/game/game-repository";

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

interface PlayRequest {
  guess: string;
  gameId?: string;
  userData?: UserData & { fid?: number };
  identityProvider?: "fc_unauth" | "anon";
  userId?: string;
  gameType?: string;
}

function gameToResponse(game: GuessedGame) {
  return {
    data: game.completedAt != null ? game : { ...game, word: "" },
  };
}

async function getUserInfoFromRequest(req: NextRequest, body: PlayRequest) {
  if (
    (body.identityProvider === "fc_unauth" ||
      body.identityProvider === "anon") &&
    body.userId
  ) {
    return {
      userData: { ...body.userData, passOwnership: undefined },
      userKey: {
        userId: body.userId,
        identityProvider: body.identityProvider,
      },
    };
  }
  const jwt = req.headers.get("Authorization")?.split(" ")[1];
  return getUserInfoFromJwtOrSession(jwt);
}

export const POST = async (req: NextRequest) => {
  const body: PlayRequest = await req.json();

  const { userData, userKey, anonymous } = await getUserInfoFromRequest(
    req,
    body
  );
  if (isPro) {
    if (!userData?.passOwnership) {
      return NextResponse.json(
        { error: "Framedl PRO Pass is required to play!" },
        { status: 401 }
      );
    }
  }

  const game = body.gameId
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
          userData: userData || undefined,
        }
      );
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
