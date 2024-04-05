/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "./frames";
import { signUrl } from "../utils";

type GameVariant = "daily" | "random";

const handleRequest = frames(async (ctx) => {
  const { searchParams } = ctx;
  console.log("current url", ctx.url.toString());

  let imageUrl = ctx.createUrl("/api/images");
  if (searchParams.id) {
    imageUrl = ctx.createUrl(`/api/images?gid=${searchParams.id}&shr=1`);
  }
  const signedImageUrl = signUrl(imageUrl);

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
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
