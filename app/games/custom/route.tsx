/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { v4 as uuid } from "uuid";

import { frames } from "../frames";
import * as customGameRepo from "../../game/custom-game-pg-repository";
import { createComposeUrl } from "../../utils";
import { hubHttpUrl } from "../../constants";
import { getUserDataForFid } from "frames.js";
import { getEnsFromAddress } from "../../get-ens";
import { DBCustomGameInsert } from "../../db/pg/types";

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
    if (userKey.identityProvider === "fc") {
      const options = { hubHttpUrl: hubHttpUrl };
      userData = await getUserDataForFid({
        fid: parseInt(userKey.userId, 10),
        options,
      });
    } else if (userKey.identityProvider === "xmtp") {
      const ens = await getEnsFromAddress(userKey.userId);
      if (ens) {
        userData = {
          displayName: ens,
          username: ens,
        };
      }
    }
    const customGame: DBCustomGameInsert = {
      id: uuid(),
      word,
      createdAt: new Date(),
      ...userKey,
      userData,
      isArt: message.buttonIndex === 2,
    };
    console.log("saving custom game", customGame);
    await customGameRepo.save(customGame);

    const playUrl = ctx.createExternalUrl({
      query: { cw: customGame.id },
    });
    const castMessage = customGame.isArt
      ? "Draw with my own word in Framedl"
      : "Play my own word in Framedl";
    const shareUrl = createComposeUrl(`${castMessage}\n\n${playUrl}`, playUrl);
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
      <Button action="post" target={ctx.createUrlWithBasePath("/custom")}>
        Create for drawing 🎨
      </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
