/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import {
  UserDataReturnType,
  getAddressesForFid,
  getUserDataForFid,
} from "frames.js";

import { frames } from "../frames";
import { UserGameKey, UserData } from "../../game/game-repository";
import { GuessedGame, gameService } from "../../game/game-service";
import { hubHttpUrl, hubRequestOptions, isPro } from "../../constants";
import { createComposeUrl, timeCall } from "../../utils";
import { signUrl } from "../../signer";
import { buildShareableResult } from "../../game/game-utils";
import { checkPassOwnership } from "../../pro/pass-ownership";
import {
  options as imageOptions,
  PassOwnershipCheckFailedImage,
} from "../../generate-image";
import { getEnsFromAddress } from "../../get-ens";

interface GameState {
  finished?: boolean;
  game: GuessedGame;
  message?: string;
}

interface NextGameStateOptions {
  resetType?: string;
  userData?: UserData;
  srcGameId?: string;
}

async function nextGameState(
  userGameKey: UserGameKey,
  inputText: string | undefined,
  options: NextGameStateOptions
): Promise<GameState> {
  const { resetType } = options;
  const game = await timeCall("loadOrCreate", () =>
    gameService.loadOrCreate(userGameKey, options)
  );
  if (resetType) {
    console.log("resetting the game", game.id);
    const resetGame = await timeCall("reset", async () => {
      if (resetType === "undo") {
        return await gameService.undoGuess(game);
      }
      if (resetType === "full") {
        return await gameService.reset(game);
      }
      console.warn("Unknown reset type", resetType);
      return game;
    });
    return {
      game: resetGame,
    };
  }
  if (game.status !== "IN_PROGRESS") {
    return {
      finished: true,
      game,
    };
  }
  if (game.guesses.length === 0 && !inputText) {
    return {
      game,
    };
  }
  const guess = inputText?.trim().toLowerCase() || "";
  const validationResult = gameService.validateGuess(game, guess);
  if (validationResult !== "VALID") {
    let message = "Not a valid guess!";
    switch (validationResult) {
      case "INVALID_EMPTY":
      case "INVALID_SIZE":
      case "INVALID_FORMAT":
        message = "Enter a 5-letter word!";
        break;
      case "INVALID_WORD":
        message = "Word not found in dictionary!";
        break;
    }
    return {
      message,
      game,
    };
  }

  if (game.originalGuesses.includes(guess) && !game.customMaker?.isArt) {
    return {
      message: "Already guessed!",
      game,
    };
  }
  const guessedGame = await timeCall("guess", () =>
    gameService.guess(game, guess)
  );
  if (guessedGame.status !== "IN_PROGRESS") {
    return {
      finished: true,
      game: guessedGame,
    };
  }

  return {
    game: guessedGame,
  };
}

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

export const POST = frames(async (ctx) => {
  const {
    clientProtocol,
    message,
    validationResult,
    state,
    searchParams,
    userKey,
  } = ctx;
  if (!clientProtocol || !message) {
    throw new Error("Invalid context");
  }
  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  //
  let userData: UserDataReturnType | undefined;
  let walletAddresses: string[] = [];
  switch (clientProtocol.id) {
    case "farcaster": {
      const fid = message.requesterFid;
      if (!state.gameKey) {
        const options = { hubHttpUrl, hubRequestOptions };
        const userDataPromise = getUserDataForFid({ fid, options });
        if (isPro) {
          const [userDataRes, addressesRes] = await Promise.all([
            userDataPromise,
            getAddressesForFid({ fid, options }),
          ]);
          userData = userDataRes;
          walletAddresses = addressesRes.map((a) => a.address);
        } else {
          userData = await userDataPromise;
        }
      }
      break;
    }
    case "xmtp": {
      walletAddresses.push(userKey.userId);
      if (!state.gameKey) {
        const ens = await getEnsFromAddress(userKey.userId);
        if (ens) {
          userData = {
            displayName: ens,
            username: ens,
          };
        }
      }
      break;
    }
    default: {
      throw new Error("Unsupported identity provider: " + clientProtocol.id);
    }
  }

  let passOwnership;
  if (isPro && !state.gameKey) {
    // check pass ownership
    let passOwnershipResult;
    try {
      passOwnershipResult = await checkPassOwnership(walletAddresses);
    } catch (e) {
      console.error("Error checking pass ownership", e);
    }
    if (!passOwnershipResult) {
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
    passOwnership = passOwnershipResult;
  }

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

  const userGameKey: UserGameKey = {
    ...userKey,
    gameKey,
    isDaily: daily,
  };
  const inputText = message.inputText;
  const resetType = searchParams.reset;
  const gameState = await nextGameState(userGameKey, inputText, {
    resetType,
    srcGameId: searchParams.src,
    userData: {
      ...userData,
      passOwnership,
    },
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
    state: { daily, gameKey },
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
