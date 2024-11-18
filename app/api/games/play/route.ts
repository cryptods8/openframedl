import { NextRequest, NextResponse } from "next/server";
import { gameService } from "@/app/game/game-service";
import { getUserInfoFromJwtOrSession } from "@/app/lib/auth";
import { isPro } from "@/app/constants";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  // const { searchParams } = new URL(req.url);
  // const gk = searchParams.get("gk");
  // const gameKey = gk ? (gk as string) : gameService.getDailyKey();

  // const game = await gameService.loadOrCreate({
  //   gameKey,
  //   userId: "11124",
  //   identityProvider: "fc",
  //   isDaily: true,
  // });

  return NextResponse.json({ data: null });
};

interface PlayRequest {
  guess: string;
  gameId?: string;
}

async function getUserInfoFromRequest(req: NextRequest) {
  const jwt = req.headers.get("Authorization")?.split(" ")[1];
  return getUserInfoFromJwtOrSession(jwt);
}

export const POST = async (req: NextRequest) => {
  const body: PlayRequest = await req.json();

  const { userData, userKey } = await getUserInfoFromRequest(req);
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
          gameKey: Math.random().toString(36).substring(2),
          isDaily: false,
        },
        {
          userData: userData || undefined,
        }
      );
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (
    game.userId !== userKey.userId ||
    game.identityProvider !== userKey.identityProvider
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  return NextResponse.json({
    data:
      updatedGame.completedAt != null
        ? updatedGame
        : { ...updatedGame, word: "" },
  });
};
