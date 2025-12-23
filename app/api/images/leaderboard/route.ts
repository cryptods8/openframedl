import { NextRequest } from "next/server";

import { generateLeaderboardImage } from "../../../generate-image";
import {
  LoadLeaderboardOptions,
  gameService,
} from "../../../game/game-service";
import { timeCall } from "../../../utils";
import { GameIdentityProvider } from "../../../game/game-repository";
import { getDailyGameKey } from "../../../game/game-utils";
import { verifyUrl } from "../../api-utils";

const allowedQueryParams = ["uid", "ip", "date", "days", "type", "n"];

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req, allowedQueryParams);
    const params = url.searchParams;
    const userIdParam = params.get("uid") as string | undefined;
    const ipParam = (params.get("ip") ?? "fc") as GameIdentityProvider;
    const date = params.get("date") as string | undefined;
    const days = params.get("days") as string | undefined;
    const type = params.get("type") as "TOP_N" | "DATE_RANGE" | undefined;
    const n = params.get("n") as string | undefined;

    let loadLeaderboardOptions: LoadLeaderboardOptions;
    if (type === "TOP_N") {
      loadLeaderboardOptions = {
        userId: userIdParam,
        n: parseInt(n ?? days ?? "30", 10),
        type: "TOP_N",
      };
    } else {
      loadLeaderboardOptions = {
        userId: userIdParam,
        date:
          date ?? getDailyGameKey(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        days: days != null ? parseInt(days, 10) : undefined,
        type: "DATE_RANGE",
      };
    }

    const leaderboard = await timeCall("loadLeaderboard", () =>
      gameService.loadLeaderboard(ipParam, loadLeaderboardOptions)
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
