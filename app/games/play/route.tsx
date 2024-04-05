/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import {
  UserDataReturnType,
  getAddressesForFid,
  getUserDataForFid,
} from "frames.js";

import { frames } from "../frames";
import {
  GameIdentityProvider,
  UserGameKey,
  UserData,
} from "../../game/game-repository";
import { GuessedGame, gameService } from "../../game/game-service";
import { hubHttpUrl, isPro } from "../../constants";
import { createComposeUrl, signUrl } from "../../utils";
import { buildShareableResult } from "../../game/game-utils";
import { checkPassOwnership } from "../../pro/pass-ownership";
import {
  options as imageOptions,
  PassOwnershipCheckFailedImage,
} from "../../generate-image";

interface GameState {
  finished?: boolean;
  game: GuessedGame;
  message?: string;
}

async function nextGameState(
  userGameKey: UserGameKey,
  // prevState: State,
  inputText: string | undefined,
  userData: UserData | undefined
): Promise<GameState> {
  const game = await gameService.loadOrCreate(
    userGameKey,
    userData ?? undefined
  );
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
  const validationResult = gameService.validateGuess(guess);
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

  if (game.originalGuesses.includes(guess)) {
    return {
      message: "Already guessed!",
      game,
    };
  }
  const guessedGame = await gameService.guess(game, guess);
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
  const { clientProtocol, message, validationResult, state, searchParams } =
    ctx;
  if (!clientProtocol || !message) {
    throw new Error("Invalid context");
  }
  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }
  //
  let identityProvider: GameIdentityProvider;
  let userId: string;
  let userData: UserDataReturnType | undefined;
  let walletAddresses: string[] = [];
  switch (clientProtocol.id) {
    case "farcaster": {
      identityProvider = "fc";
      const fid = message.requesterFid;
      userId = fid.toString();
      const options = { hubHttpUrl: hubHttpUrl };
      if (!state.gameKey) {
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
      identityProvider = "xmtp";
      userId = message.verifiedWalletAddress!;
      walletAddresses.push(userId);
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

  const { variant } = searchParams;
  let gameKey: string;
  let daily: boolean;
  if (state.gameKey) {
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
      ? new Date().toISOString().split("T")[0]!
      : Math.random().toString(36).substring(2);
  }

  const userGameKey: UserGameKey = {
    userId,
    gameKey,
    identityProvider,
    isDaily: daily,
  };
  const inputText = message.inputText;
  const gameState = await nextGameState(userGameKey, inputText, {
    ...userData,
    passOwnership,
  });
  const { finished, game } = gameState;

  let resultsUrl: string | undefined;
  let shareUrl: string | undefined;
  if (finished && game) {
    const url = ctx.createUrl(`?id=${game.id}`);
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
          <Button action="post" target={ctx.createUrlWithBasePath("/..")}>
            Play again
          </Button>,
          <Button
            action="post"
            target={ctx.createUrlWithBasePath("/leaderboard")}
          >
            Leaderboard
          </Button>,
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
        ],
  };
});
