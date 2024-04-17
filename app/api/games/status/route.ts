import { NextRequest, NextResponse } from "next/server";
import { GameIdentityProvider } from "../../../game/game-repository";
import { gameService } from "../../../game/game-service";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const allowedApiKeys = process.env.ALLOWED_API_KEYS?.split(",") ?? [];
const adminApiKey = process.env.ADMIN_SECRET;

// TODO rate limit
export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const apiKey = req.headers.get("x-framedl-api-key");
    if (!apiKey || ![...allowedApiKeys, adminApiKey].includes(apiKey)) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }
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
      return NextResponse.json(
        { error: "No game found for the provided parameters" },
        { status: 404 }
      );
    }
    return NextResponse.json(game);
  } finally {
    console.log(
      `Time for GET /api/images/leaderboard: ${Date.now() - start}ms`
    );
  }
}
