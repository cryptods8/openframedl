/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";
import { gameService } from "../../game/game-service";
import { addDaysToDate, getDailyGameKey } from "../../game/game-utils";

export type WotdState = "YESTERDAY" | "TODAY" | "UNPLAYED";

const handleRequest = frames(async (ctx) => {
  const { validationResult, userKey, searchParams } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  const params: Record<string, string> = {};
  let wotdState: WotdState = "YESTERDAY";
  if (searchParams.ip) {
    params.ip = searchParams.ip;
  }
  if (userKey) {
    const gameKey = getDailyGameKey(new Date());
    const gameUserKey = { ...userKey, isDaily: true, gameKey };
    const game = await gameService.loadPublicByUserGameKey(gameUserKey);
    if (game?.completedAt) {
      wotdState = "TODAY";
      params.gk = gameKey;
      params.uid = userKey.userId;
      params.ip = userKey.identityProvider;
    } else {
      wotdState = "UNPLAYED";
    }
  }
  params.state = wotdState;

  const imageUrl = ctx.createSignedUrl({
    pathname: "/api/images/wotd",
    query: params,
  });

  return {
    image: imageUrl,
    buttons: [
      <Button
        action="post"
        target={
          wotdState === "UNPLAYED"
            ? ctx.createUrlWithBasePath({
                pathname: "/play",
                query: { variant: "daily" },
              })
            : ctx.createUrlWithBasePath("/wotd")
        }
      >
        {wotdState === "TODAY"
          ? "Refesh"
          : wotdState === "UNPLAYED"
          ? "Play Framedl"
          : "Show today's word"}
      </Button>,
      <Button
        action="post"
        target={ctx.createUrlWithBasePath({
          query: { more: "1" },
        })}
      >
        More...
      </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
