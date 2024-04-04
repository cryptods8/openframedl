/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "./frames";
import { signUrl } from "../utils";
import { baseUrl } from "../constants";

type GameVariant = "daily" | "random";

function toVariantTarget(variant: GameVariant) {
  return { pathname: "/play", query: { variant } };
}

const handleRequest = frames(async (ctx) => {
  const { searchParams } = ctx;
  console.log("current url", ctx.url.toString());

  let imageUrl = `${baseUrl}/api/images`;
  if (searchParams.id) {
    imageUrl = `${baseUrl}/api/images?gid=${searchParams.id}&shr=1`;
  }
  const signedImageUrl = signUrl(imageUrl);

  return {
    state: {},
    image: signedImageUrl,
    buttons: [
      <Button action="post" target={toVariantTarget("daily")}>
        Daily
      </Button>,
      <Button action="post" target={toVariantTarget("random")}>
        🎲 Random
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
