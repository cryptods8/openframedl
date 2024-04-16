import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "../../../game/game-repository";
import { gameService } from "../../../game/game-service";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// TODO rate limit
export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const params = new URL(req.url).searchParams;
    const userIdParam = params.get("uid");
    if (!userIdParam) {
      return badRequest("Missing uid parameter - user id");
    }
    const ipParam = params.get("ip") as GameIdentityProvider;
    if (!ipParam) {
      return badRequest(
        "Missing ip parameter - identity provider ('xmtp' or 'fc')"
      );
    }
    const date = params.get("date") as string;
    if (!date) {
      return badRequest("Missing date parameter - YYYY-MM-DD format");
    }

    const game = await gameService.loadPublicByUserGameKey({
      userId: userIdParam,
      identityProvider: ipParam,
      gameKey: date,
      isDaily: true,
    });
    if (!game) {
      return badRequest("No game found for the provided parameters");
    }
    return NextResponse.json(game);
  } finally {
    console.log(
      `Time for GET /api/images/leaderboard: ${Date.now() - start}ms`
    );
  }
}
