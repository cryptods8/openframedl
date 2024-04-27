/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "./frames";
import { signUrl } from "../utils";
import { isPro } from "../constants";
import { GuessedGame, gameService } from "../game/game-service";

type GameVariant = "daily" | "random";

const handleRequest = frames(async (ctx) => {
  const { searchParams } = ctx;
  console.log("current url", ctx.url.toString());

  const params = new URLSearchParams();
  let gameById: GuessedGame | null = null;
  if (searchParams.id) {
    params.set("gid", searchParams.id);
    gameById = await gameService.load(searchParams.id);
    params.set("shr", "1");
  }
  const custom = searchParams.cw || gameById?.isCustom;
  if (custom) {
    params.set("custom", "1");
  }
  const paramString = params.toString();
  const imageUrl = ctx.createUrl(
    `/api/images${paramString ? `?${paramString}` : ""}`
  );
  const signedImageUrl = signUrl(imageUrl);

  if (custom) {
    return {
      image: signedImageUrl,
      buttons: [
        <Button
          action="post"
          target={ctx.createUrlWithBasePath({
            pathname: "/play",
            query: {
              variant: "random",
              gameKey: searchParams.cw
                ? `custom_${searchParams.cw}`
                : gameById?.gameKey,
            },
          })}
        >
          Play
        </Button>,
        <Button
          action="post"
          target={ctx.createUrlWithBasePath("/custom?new=1")}
        >
          Create my own
        </Button>,
      ],
    };
  }

  function toVariantTarget(variant: GameVariant) {
    return ctx.createUrlWithBasePath({ pathname: "/play", query: { variant } });
  }

  return {
    state: {},
    image: signedImageUrl,
    buttons: [
      <Button action="post" target={toVariantTarget("daily")}>
        Play
      </Button>,
      <Button action="post" target={toVariantTarget("random")}>
        🎲 Practice
      </Button>,
      isPro ? (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath("/leaderboard")}
        >
          Leaderboard
        </Button>
      ) : null,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
