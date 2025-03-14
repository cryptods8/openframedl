import { NextRequest, NextResponse } from "next/server";
import { gameService } from "@/app/game/game-service";
import { GameFilter, GameType } from "@/app/game/game-pg-repository";
import { getUserInfoFromRequest } from "../../api-utils";
import { GameIdentityProvider } from "@/app/game/game-repository";

export async function GET(request: NextRequest) {
  try {
    const { userKey } = await getUserInfoFromRequest(request, {});
    const { searchParams } = new URL(request.url);

    // Extract filter parameters from the request
    const filter: GameFilter = {
      userId: searchParams.get("userId") || undefined,
      completedOnly: searchParams.get("completedOnly") === "true",
      type: searchParams.get("type") as GameType | undefined,
      gameKey: searchParams.get("gameKey") || undefined,
      identityProvider: searchParams.get("identityProvider") as
        | GameIdentityProvider
        | undefined,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : 0,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : 10,
    };

    // Parse isCurrentUser from string to boolean
    const isCurrentUser =
      filter.userId === userKey.userId &&
      filter.identityProvider === userKey.identityProvider;

    const games = await gameService.loadAllPublic(filter, isCurrentUser);

    return NextResponse.json({ data: { items: games } });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
