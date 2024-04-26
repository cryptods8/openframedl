/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { v4 as uuid } from "uuid";

import { frames } from "../frames";
import * as customGameRepo from "../../game/custom-game-pg-repository";
import { createComposeUrl } from "../../utils";
import { hubHttpUrl } from "../../constants";
import { getUserDataForFid } from "frames.js";

// 5-letter word regex
const wordRegex = /^[a-z]{5}$/;

const handleRequest = frames(async (ctx) => {
  const { userKey, message, validationResult, searchParams } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }

  // validate text input
  if (message && userKey && searchParams.new !== "1") {
    const word = message.inputText?.trim().toLowerCase();
    if (!word || !wordRegex.test(word)) {
      return {
        image: ctx.createSignedUrl({
          pathname: "/api/images/custom",
          query: { msg: "Invalid word. Try again!", error: true },
        }),
        textInput: "Enter a 5-letter word...",
        buttons: [
          <Button action="post" target={ctx.createUrlWithBasePath("/custom")}>
            Create
          </Button>,
        ],
      };
    }
    let userData;
    if (userKey.identityProvider === "farcaster") {
      const options = { hubHttpUrl: hubHttpUrl };
      userData = await getUserDataForFid({
        fid: parseInt(userKey.userId, 10),
        options,
      });
    }
    const customGame = {
      id: uuid(),
      word,
      createdAt: new Date(),
      ...userKey,
      userData,
    };
    console.log("saving custom game", customGame);
    await customGameRepo.save(customGame);

    const playUrl = ctx.createUrl({
      pathname: "/",
      query: { cw: customGame.id },
    });
    const shareUrl = createComposeUrl(
      `Play my own word in Framedl\n\n${playUrl}`,
      playUrl
    );
    return {
      image: ctx.createSignedUrl({
        pathname: "/api/images/custom",
        query: { success: "1", word },
      }),
      buttons: [
        <Button
          action="post"
          target={ctx.createUrlWithBasePath("/custom?new=1")}
        >
          Create another
        </Button>,
        <Button action="link" target={shareUrl}>
          Share
        </Button>,
      ],
    };
  }

  const query = new URLSearchParams();
  const imageUrl = ctx.createSignedUrl({
    pathname: "/api/images/custom",
    query,
  });

  return {
    image: imageUrl,
    textInput: "Enter a 5-letter word...",
    buttons: [
      <Button action="post" target={ctx.createUrlWithBasePath("/custom")}>
        Create
      </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
