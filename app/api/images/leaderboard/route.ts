import { NextRequest } from "next/server";

import { generateLeaderboardImage } from "../../../generate-image";
import { gameService } from "../../../game/game-service";
import { verifySignedUrl, timeCall } from "../../../utils";
import { baseUrl } from "../../../constants";
import { GameIdentityProvider } from "../../../game/game-repository";

const allowedQueryParams = ["uid", "ip", "date", "signed", "days"];

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  // remove extra query params
  const urlParams = url.searchParams;
  for (const param of urlParams.keys()) {
    if (!allowedQueryParams.includes(param)) {
      urlParams.delete(param);
    }
  }

  const search = urlParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const userIdParam = params.get("uid");
    const ipParam = (params.get("ip") ?? "fc") as GameIdentityProvider;
    const date = params.get("date") as string;
    const days = params.get("days") as string | undefined;

    const leaderboard = await timeCall("loadLeaderboard", () =>
      gameService.loadLeaderboard(userIdParam, ipParam, date, days != null ? parseInt(days, 10) : undefined)
    );

    return timeCall("generateLeaderboardImage", () =>
      generateLeaderboardImage(leaderboard)
    );
  } finally {
    console.log(
      `Time for GET /api/images/leaderboard: ${Date.now() - start}ms`
    );
  }
}
