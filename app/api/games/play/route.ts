import { UserData, UserKey } from "@/app/game/game-repository";
import { gameService } from "@/app/game/game-service";
import { verifyJwt } from "@/app/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

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

export const POST = async (req: NextRequest) => {
  const body: PlayRequest = await req.json();
  const jwt = req.headers.get("Authorization")?.split(" ")[1];
  const { userData, userKey } = jwt
    ? verifyJwt<{ userData?: UserData; userKey: UserKey }>(jwt)
    : { userData: null, userKey: null };
  // if (!userKey) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  const game = body.gameId
    ? await gameService.load(body.gameId)
    : await gameService.loadOrCreate(
        {
          userId: "11124",
          identityProvider: "fc",
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
