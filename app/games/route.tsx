/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "./frames";
import { signUrl } from "../signer";
import { GuessedGame, gameService } from "../game/game-service";

export type GameVariant = "daily" | "random";

const handleRequest = frames(async (ctx) => {
  const { searchParams } = ctx;

  const params = new URLSearchParams();
  let gameById: GuessedGame | null = null;
  if (searchParams.id) {
    params.set("gid", searchParams.id);
    gameById = await gameService.load(searchParams.id);
    params.set("shr", "1");
  }
  const custom = searchParams.cw || gameById?.isCustom;
  if (searchParams.cw) {
    params.set("cid", searchParams.cw);
  }
  if (custom) {
    params.set("custom", "1");
  }
  const paramString = params.toString();
  const imageUrl = ctx.createUrl(
    `/api/images${paramString ? `?${paramString}` : ""}`
  );
  const signedImageUrl = signUrl(imageUrl);
  const isMore = searchParams.more === "1";

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
              src: searchParams.id || "",
            },
          })}
        >
          Play
        </Button>,
        <Button action="post" target={ctx.createUrlWithBasePath("/create")}>
          Create
        </Button>,
      ],
    };
  }

  function toVariantTarget(variant: GameVariant) {
    return ctx.createUrlWithBasePath({
      pathname: "/play",
      query: { variant, src: searchParams.id || "" },
    });
  }

  if (searchParams.app === "1") {
    return {
      state: {},
      image: signedImageUrl,
      buttons: [
        <Button
          action="link"
          target={`https://farcaster.xyz/~/composer-action?url=${encodeURIComponent(
            ctx.createExternalUrl("/api/actions/app")
          )}`}
        >
          Play
        </Button>,
      ],
    };
  }

  return {
    state: {},
    image: signedImageUrl,
    buttons: [
      <Button action="post" target={toVariantTarget("daily")}>
        Play
      </Button>,
      isMore ? (
        <Button action="post" target={toVariantTarget("random")}>
          🎲 Practice
        </Button>
      ) : (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath({
            query: { ...searchParams, more: "1" },
          })}
        >
          More...
        </Button>
      ),
      isMore ? (
        <Button
          action="post"
          target={ctx.createUrlWithBasePath("/leaderboard")}
        >
          Leaderboard
        </Button>
      ) : undefined,
      isMore ? (
        <Button action="post" target={ctx.createUrlWithBasePath("/create")}>
          Create
        </Button>
      ) : undefined,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
