import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import { ClientProtocolId, UserDataReturnType } from "frames.js";
import Link from "next/link";

import { signUrl, verifySignedUrl, timeCall } from "./utils";
import { getClientType } from "./get-client-type";
import { baseUrl, hubHttpUrl } from "./constants";
import { gameService, GuessedGame } from "./game/game-service";
import { buildShareableResult } from "./game/game-utils";
import GameResult from "./ui/game-result";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import {
  GameIdentityProvider,
  UserGameKey,
  UserKey,
} from "./game/game-repository";

type GamePage = "initial" | "in_progress" | "finished" | "leaderboard";
type State = {
  page: GamePage;
  gameKey?: string;
  daily?: boolean;
};

const acceptedProtocols: ClientProtocolId[] = [
  {
    id: "xmtp",
    version: "vNext",
  },
  {
    id: "farcaster",
    version: "vNext",
  },
];

const initialState: State = { page: "initial" };

// const reducer: FrameReducer<State> = (state, action) => {
//   const buttonIndex = action.postBody?.untrustedData.buttonIndex;
//   switch (state.page) {
//     case "initial":
//       return {
//         ...state,
//         page: "in_progress",
//         gameKey:
//           buttonIndex === 1
//             ? new Date().toISOString().split("T")[0]
//             : Math.random().toString(36).substring(2),
//       };
//     case "in_progress":
//       return state;
//     case "finished":
//       return { ...state, page: "initial", gameKey: undefined };
//     case "leaderboard":
//       if (buttonIndex === 1) {
//         return { ...state, page: "initial", gameKey: undefined };
//       }
//   }
//   return state;
// };

interface GameImageParams {
  message?: string;
  gameId?: string;
  share?: boolean;
}

interface GameFrame {
  imageParams: GameImageParams;
  game?: GuessedGame;
  state: State;
}

function isUrlSigned(
  searchParams:
    | {
        [key: string]: string | string[] | undefined;
      }
    | undefined
) {
  const params = new URLSearchParams();
  for (const key in searchParams) {
    const value = searchParams[key];
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v);
        }
      } else {
        params.append(key, value as string);
      }
    }
  }
  const paramsString = params.toString();
  const fullUrl = `${baseUrl}${paramsString ? `?${paramsString}` : ""}`;
  try {
    verifySignedUrl(fullUrl);
    return true;
  } catch (e) {
    // ignore
  }
  return false;
}

async function nextFrame(
  userKey: UserKey | undefined,
  prevState: State,
  inputText: string | undefined,
  buttonIndex: number | undefined,
  userData?: GuessedGame["userData"]
): Promise<GameFrame> {
  if (!userKey) {
    return {
      imageParams: {},
      state: {
        page: "initial",
      },
    };
  }
  if (prevState.page === "leaderboard") {
    return {
      imageParams: {},
      state: {
        page: "initial",
      },
    };
  }
  if (prevState.page === "finished") {
    return {
      imageParams: {},
      state: {
        page: buttonIndex === 1 ? "initial" : "leaderboard",
      },
    };
  }

  let gameKey = prevState.gameKey;
  let daily = prevState.daily;
  if (prevState.page === "initial") {
    daily = buttonIndex === 1;
    gameKey = daily
      ? new Date().toISOString().split("T")[0]!
      : Math.random().toString(36).substring(2);
  }
  if (!gameKey || daily == null) {
    console.error("No game key");
    gameKey = Math.random().toString(36).substring(2);
    daily = false;
  }
  const newState = {
    gameKey,
    daily,
  };
  const userGameKey: UserGameKey = {
    ...userKey,
    gameKey,
    isDaily: daily,
  };
  const game = await gameService.loadOrCreate(userGameKey, userData);
  if (game.status !== "IN_PROGRESS") {
    return {
      state: {
        ...newState,
        page: "finished",
      },
      imageParams: { gameId: game.id },
      game,
    };
  }
  if (game.guesses.length === 0 && !inputText) {
    return {
      state: {
        ...newState,
        page: "in_progress",
      },
      imageParams: { gameId: game.id },
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
      state: {
        ...newState,
        page: "in_progress",
      },
      imageParams: { gameId: game.id, message },
      game,
    };
  }

  if (game.originalGuesses.includes(guess)) {
    return {
      state: {
        ...newState,
        page: "in_progress",
      },
      imageParams: { gameId: game.id, message: "Already guessed!" },
      game,
    };
  }
  const guessedGame = await gameService.guess(game, guess);
  if (guessedGame.status !== "IN_PROGRESS") {
    return {
      state: {
        ...newState,
        page: "finished",
      },
      imageParams: { gameId: guessedGame.id },
      game: guessedGame,
    };
  }

  return {
    state: {
      ...newState,
      page: "in_progress",
    },
    imageParams: { gameId: guessedGame.id },
    game: guessedGame,
  };
}

function buildImageUrl(p: GameImageParams): string {
  const params = new URLSearchParams();
  if (p.message) {
    params.append("msg", p.message);
  }
  if (p.gameId) {
    params.append("gid", p.gameId);
  }
  if (p.share) {
    params.append("shr", "1");
  }
  const strParams = params.toString();
  const unsignedImageSrc = `${baseUrl}/api/images${
    strParams ? `?${strParams}` : ""
  }`;
  return signUrl(unsignedImageSrc);
}

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const start = Date.now();
  const previousFrame = getPreviousFrame<State>(searchParams);
  const prevState = previousFrame.prevState || initialState;

  let userId: string | undefined;
  let inputText: string | undefined;
  let buttonIndex: number | undefined;
  let userData: UserDataReturnType | undefined;
  let identityProvider: GameIdentityProvider | undefined;
  if (
    previousFrame.postBody &&
    isXmtpFrameActionPayload(previousFrame.postBody)
  ) {
    const frameMessage = await getXmtpFrameMessage(previousFrame.postBody);
    userId = frameMessage.verifiedWalletAddress;
    // TODO do something with this
    // gameKey = frameMessage.opaqueConversationIdentifier;
    buttonIndex = frameMessage.buttonIndex;
    inputText = frameMessage.inputText;
    identityProvider = "xmtp";
  } else {
    const frameMessage = await getFrameMessage(previousFrame.postBody, {
      fetchHubContext: prevState.page === "initial",
      hubHttpUrl,
    });
    if (frameMessage) {
      userId = frameMessage.requesterFid.toString();
      buttonIndex = frameMessage.buttonIndex;
      inputText = frameMessage.inputText;
      userData = frameMessage.requesterUserData;
      identityProvider = "fc";
    }
  }

  const userGameKey =
    userId && identityProvider ? { userId, identityProvider } : undefined;
  const { game, imageParams, state } = await timeCall("nextFrame", () =>
    nextFrame(
      userGameKey,
      prevState,
      inputText,
      buttonIndex,
      userData || undefined
    )
  );

  if (state.page === "leaderboard" && userGameKey) {
    const clientType = previousFrame.postBody
      ? await timeCall("getClientType", () =>
          getClientType(previousFrame.postBody!)
        )
      : null;
    let shareUrl;
    const lpParams = new URLSearchParams();
    lpParams.set("uid", userGameKey.userId);
    lpParams.set("ip", userGameKey.identityProvider);
    if (clientType === "WARPCAST") {
      const url = `${baseUrl}/leaderboard?${lpParams.toString()}`;
      const params = new URLSearchParams();
      params.set("text", `Framedl Leaderboard`);
      params.set("embeds[]", url);
      shareUrl = `https://warpcast.com/~/compose?${params.toString()}`;
    }
    // return leaderboard
    const imageUrl = `${baseUrl}/api/images/leaderboard?${lpParams.toString()}`;
    const signedImageUrl = signUrl(imageUrl);
    return (
      <FrameContainer
        pathname="/"
        postUrl="/frames"
        state={{ page: "leaderboard" }}
        previousFrame={previousFrame}
        accepts={acceptedProtocols}
      >
        <FrameImage src={signedImageUrl} />
        <FrameButton>Back</FrameButton>
        {shareUrl ? (
          <FrameButton action="link" target={shareUrl}>
            Share
          </FrameButton>
        ) : null}
      </FrameContainer>
    );
  }

  const isFinished = state.page === "finished";

  const gameIdParam = searchParams?.id as string;
  const gameById = gameIdParam
    ? await gameService.loadPublic(gameIdParam, isUrlSigned(searchParams))
    : null;

  if (!imageParams.gameId && gameIdParam) {
    imageParams.gameId = gameIdParam;
    imageParams.share = true;
  }

  const redirects = [];
  if (isFinished && game) {
    const clientType = previousFrame.postBody
      ? await timeCall("getClientType", () =>
          getClientType(previousFrame.postBody!)
        )
      : null;
    const url = `${baseUrl}?id=${game.id}`;
    redirects.push({
      label: clientType === "WARPCAST" ? "Results" : "Share",
      url: signUrl(url),
    });
    if (clientType === "WARPCAST") {
      const { title, text } = buildShareableResult(game);
      const params = new URLSearchParams();
      params.set("text", `${title}\n\n${text}`);
      params.set("embeds[]", url);
      const shareUrl = `https://warpcast.com/~/compose?${params.toString()}`;
      redirects.push({ label: "Share", url: shareUrl });
    }
  }

  const elements = [];
  elements.push(<FrameImage key="image" src={buildImageUrl(imageParams)} />);
  if (userId && state.page === "in_progress") {
    elements.push(<FrameInput key="input" text="Make your guess..." />);
  }
  const buttonLabel = isFinished
    ? `Play again`
    : state.page === "in_progress"
    ? "Guess"
    : "Daily";
  elements.push(<FrameButton key="button">{buttonLabel}</FrameButton>);
  if (state.page === "initial") {
    elements.push(<FrameButton key="random">🎲 Random</FrameButton>);
  }
  if (state.page === "finished") {
    elements.push(<FrameButton key="leaderboard">Leaderboard</FrameButton>);
  }
  redirects.forEach((r, i) =>
    elements.push(
      <FrameButton key={i} action="link" target={r.url}>
        {r.label}
      </FrameButton>
    )
  );

  console.log(`Time for Home (before return): ${Date.now() - start}ms`);
  return (
    <div className="w-full min-h-dvh bg-gradient-to-b from-slate-300 to-slate-200 flex flex-col items-center justify-center p-8 font-inter">
      <FrameContainer
        pathname="/"
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
        accepts={acceptedProtocols}
      >
        {elements}
      </FrameContainer>
      <div className="flex flex-col p-6 w-full justify-center items-center">
        <GameResult
          game={gameById}
          shareUrl={`${baseUrl}${gameById ? `?id=${gameById.id}` : ""}`}
        />
        <div className="text-center mt-8 text-sm text-slate-600">
          OpenFramedl made by{" "}
          <Link href="https://warpcast.com/ds8" className="underline">
            ds8
          </Link>
        </div>
      </div>
    </div>
  );
}
