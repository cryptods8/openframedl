/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "../frames";
import { UserGameKey } from "../../game/game-repository";
import { gameService } from "../../game/game-service";
import { isPro } from "../../constants";
import { createComposeUrl } from "../../utils";
import { signUrl } from "../../signer";
import { buildShareableResult } from "../../game/game-utils";
import {
  options as imageOptions,
  PassOwnershipCheckFailedImage,
} from "../../generate-image";
import { GameState, nextGameState } from "../game-state";
import { loadUserData } from "../user-data";

function buildImageUrl(url: string, state: GameState): string {
  const params = new URLSearchParams();
  if (state.message) {
    params.append("msg", state.message);
  }
  if (state.game) {
    params.append("gid", state.game.id);
  }
  const strParams = params.toString();
  const unsignedImageSrc = `${url}${strParams ? `?${strParams}` : ""}`;
  return signUrl(unsignedImageSrc);
}

function determineGameKey(
  searchParams: Record<string, string | undefined>,
  state: { gameKey?: string; daily?: boolean }
) {
  const { variant, gameKey: spGameKey } = searchParams;
  let gameKey: string;
  let daily: boolean;
  if (spGameKey) {
    gameKey = spGameKey;
    daily = false;
  } else if (state.gameKey) {
    gameKey = state.gameKey;
    if (state.daily == null) {
      console.warn("Missing daily flag in state");
      daily = false;
    } else {
      daily = state.daily;
    }
  } else {
    if (!variant) {
      throw new Error("Missing variant");
    }
    daily = variant === "daily";
    gameKey = daily
      ? gameService.getDailyKey()
      : Math.random().toString(36).substring(2);
  }

  return {
    gameKey,
    isDaily: daily,
  };
}

export const POST = frames(async (ctx) => {
  const { message, validationResult, state, searchParams, userKey } = ctx;
  if (!message || !userKey) {
    throw new Error("Invalid context");
  }
  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  //
  const isInitial = !state.gameKey;
  const userData = isInitial ? await loadUserData(userKey) : undefined;
  if (isPro && isInitial && !userData?.passOwnership) {
    return {
      imageOptions,
      image: <PassOwnershipCheckFailedImage baseUrl={ctx.createUrl("")} />,
      buttons: [
        <Button action="post" target={ctx.createUrlWithBasePath("/..")}>
          Back
        </Button>,
        <Button
          action="post"
          target={ctx.createUrlWithBasePath("/leaderboard")}
        >
          Leaderboard
        </Button>,
        <Button
          action="link"
          target="https://zora.co/collect/base:0x402ae0eb018c623b14ad61268b786edd4ad87c56"
        >
          Get a pass
        </Button>,
      ],
    };
  }

  const userGameKey: UserGameKey = {
    ...userKey,
    ...determineGameKey(searchParams, state),
  };
  const inputText = message.inputText;
  const resetType = searchParams.reset;
  const gameState = await nextGameState(userGameKey, inputText, {
    resetType,
    srcGameId: searchParams.src,
    userData,
  });
  const { finished, game } = gameState;

  let resultsUrl: string | undefined;
  let shareUrl: string | undefined;
  if (finished && game) {
    const url = ctx.createExternalUrl(`?id=${game.id}`);
    resultsUrl = signUrl(url);

    const { title, text } = buildShareableResult(game);
    shareUrl = createComposeUrl(`${title}\n\n${text}`, url);
  }

  return {
    state: { daily: userGameKey.isDaily, gameKey: userGameKey.gameKey },
    image: buildImageUrl(ctx.createUrl("/api/images"), gameState),
    textInput: finished ? undefined : "Make your guess...",
    buttons: finished
      ? [
          game.customMaker?.isArt ? (
            <Button
              action="post"
              target={ctx.createUrlWithBasePath("/play?reset=undo")}
            >
              Undo last guess
            </Button>
          ) : (
            <Button action="post" target={ctx.createUrlWithBasePath("/")}>
              Play
            </Button>
          ),
          game.isDaily ? (
            <Button
              action="post"
              target={ctx.createUrlWithBasePath("/leaderboard")}
            >
              Leaderboard
            </Button>
          ) : game.isCustom ? (
            <Button
              action="post"
              target={ctx.createUrlWithBasePath("/custom?new=1")}
            >
              Create my own
            </Button>
          ) : undefined,
          resultsUrl ? (
            <Button action="link" target={resultsUrl}>
              Results
            </Button>
          ) : undefined,
          shareUrl ? (
            <Button action="link" target={shareUrl}>
              Share
            </Button>
          ) : undefined,
        ]
      : [
          <Button action="post" target={ctx.createUrlWithBasePath("/play")}>
            Guess
          </Button>,
          game.customMaker?.isArt && game.guessCount > 0 ? (
            <Button
              action="post"
              target={ctx.createUrlWithBasePath("/play?reset=undo")}
            >
              Undo guess
            </Button>
          ) : undefined,
          game.customMaker?.isArt && game.guessCount > 0 ? (
            <Button
              action="post"
              target={ctx.createUrlWithBasePath("/play?reset=full")}
            >
              Start again
            </Button>
          ) : undefined,
        ],
  };
});
