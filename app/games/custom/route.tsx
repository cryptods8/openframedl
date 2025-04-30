/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { v4 as uuid } from "uuid";

import { frames } from "../frames";
import * as customGameRepo from "../../game/custom-game-pg-repository";
import { createComposeUrl } from "../../utils";
import { DBCustomGameInsert } from "../../db/pg/types";
import { loadUserData } from "../user-data";

// 5-letter word regex
const wordRegex = /^[a-z]{5}$/;

const handleRequest = frames(async (ctx) => {
  const { userKey, message, validationResult, searchParams } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }

  const query: Record<string, string> = {};
  if (searchParams.from) {
    query.from = searchParams.from;
  }

  // validate text input
  if (message && userKey && searchParams.new !== "1") {
    const word = message.inputText?.trim().toLowerCase();
    if (!word || !wordRegex.test(word)) {
      return {
        image: ctx.createSignedUrl({
          pathname: "/api/images/custom",
          query: { msg: "Invalid word. Try again!", error: "true" },
        }),
        textInput: "Enter a 5-letter word...",
        buttons: [
          searchParams.from === "create" ? (
            <Button action="post" target={ctx.createUrlWithBasePath("/create")}>
              ⬅️ Back
            </Button>
          ) : undefined,
          <Button
            action="post"
            target={ctx.createUrlWithBasePath({ pathname: "/custom", query })}
          >
            Create
          </Button>,
        ],
      };
    }
    const userData = await loadUserData(userKey);
    const customGame: DBCustomGameInsert = {
      id: uuid(),
      word,
      createdAt: new Date(),
      ...userKey,
      userData: JSON.stringify(userData),
      isArt: false,
    };
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
          target={ctx.createUrlWithBasePath({
            pathname: "/custom",
            query: { ...query, new: "1" },
          })}
        >
          Create another
        </Button>,
        <Button action="link" target={shareUrl}>
          Share
        </Button>,
      ],
    };
  }

  return {
    image: ctx.createSignedUrl("/api/images/custom"),
    textInput: "Enter a 5-letter word...",
    buttons: [
      searchParams.from === "create" ? (
        <Button action="post" target={ctx.createUrlWithBasePath("/create")}>
          ⬅️ Back
        </Button>
      ) : undefined,
      <Button
        action="post"
        target={ctx.createUrlWithBasePath({
          pathname: "/custom",
          query,
        })}
      >
        Create
      </Button>,
      // <Button action="post" target={ctx.createUrlWithBasePath("/custom")}>
      //   Create for drawing 🎨
      // </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
