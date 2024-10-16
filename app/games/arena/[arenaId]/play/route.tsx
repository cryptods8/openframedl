/* eslint-disable react/jsx-key */
import { Button, error } from "frames.js/core";
import { createCustomFrames } from "../../../frames";
import { UserGameKey } from "@/app/game/game-repository";
import { isPro } from "@/app/constants";
import { GameState, nextGameState } from "@/app/games/game-state";
import { loadUserData } from "@/app/games/user-data";
import {
  options as imageOptions,
  PassOwnershipCheckFailedImage,
} from "@/app/generate-image";
import { findArenaWithGamesById } from "@/app/game/arena-pg-repository";
import { GuessedGame, PreCreateFunction } from "@/app/game/game-service";
import {
  getArenaAvailabilityProperties,
  getArenaGamesForUser,
  checkSuddenDeath,
} from "../../arena-utils";

type ArenaPlayFrameState = {
  arenaId?: string;
  gameKey?: string;
};

async function hasNextGame(game: GuessedGame): Promise<boolean> {
  const { arena } = game;
  if (!arena) {
    return false;
  }
  const { config } = arena;
  if (config.suddenDeath && config.audienceSize === 2) {
    // check whether the opponent has better score
    const arenaWithGames = (await findArenaWithGamesById(arena.id))!;
    const suddenDeathStatus = checkSuddenDeath(arenaWithGames);
    if (suddenDeathStatus?.isOver) {
      return false;
    }
  }
  return config.words.length > game.arenaWordIndex! + 1;
}

export const POST = createCustomFrames<ArenaPlayFrameState>({})(async (ctx) => {
  const { request, userKey, state, message, validationResult, searchParams } =
    ctx;
  const arenaId = state.arenaId || request.nextContext?.params.arenaId;

  if (!arenaId) {
    return error("No arena id provided");
  }
  const numArenaId = parseInt(arenaId, 10);
  if (isNaN(numArenaId)) {
    return error("Invalid arena id");
  }
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
      imageOptions: imageOptions,
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
          target="https://zora.co/collect/base:0x402ae0eb018c623b14ad61268b786edd4ad87c56/1"
        >
          Get a pass
        </Button>,
      ],
    };
  }

  let gameKey = state.gameKey;
  let preCreateLoader: PreCreateFunction | undefined;
  if (!gameKey) {
    const arena = await findArenaWithGamesById(numArenaId);
    if (!arena) {
      return error("Arena not found");
    }
    const { membership, status, completionStatus } =
      getArenaAvailabilityProperties(arena, userKey);
    if (!membership?.success) {
      return error("You are not a member of the arena");
    }
    if (status !== "OPEN") {
      return error("Arena is not open for playing");
    }

    const games = getArenaGamesForUser(arena, userKey);
    const lastGame = games[games.length - 1];
    if (lastGame && lastGame.status === "IN_PROGRESS") {
      gameKey = lastGame.gameKey;
    } else if (
      games.length < arena.config.words.length &&
      completionStatus !== "COMPLETED"
    ) {
      gameKey = `arena_${arenaId}_${games.length + 1}`;
      preCreateLoader = async () => {
        const arenaWordIndex = games.length;
        return {
          word: arena.config.words[arenaWordIndex]!,
          arena: arena,
          arenaWordIndex,
          initWords: arena.config.initWords || undefined,
        };
      };
    } else {
      // TODO return special screen -- everything is finished
      gameKey = lastGame!.gameKey;
    }
  }
  let gameState: GameState | undefined = undefined;
  const userGameKey: UserGameKey = {
    ...userKey,
    gameKey,
    isDaily: false,
  };
  const inputText = message.inputText;
  gameState = await nextGameState(userGameKey, inputText, {
    srcGameId: searchParams.src,
    userData,
    preCreate: preCreateLoader,
  });
  const { finished, game } = gameState;

  const { arena } = game;
  const hasNext = await hasNextGame(game);

  return {
    state: { gameKey: finished ? undefined : game.gameKey, arenaId },
    textInput: finished ? undefined : "Make a guess...",
    imageOptions,
    image: ctx.createSignedUrlWithBasePath({
      pathname: `/arena/${arenaId}/play/image`,
      query: gameState.message
        ? { gid: game.id, msg: gameState.message }
        : { gid: game.id },
    }),
    buttons: finished
      ? hasNext
        ? [
            <Button
              action="post"
              target={ctx.createUrlWithBasePath(`/arena/${arenaId}/play`)}
            >
              {`Next word (${game.arenaWordIndex! + 2}/${
                arena!.config.words.length
              })`}
            </Button>,
            <Button
              action="post"
              target={ctx.createUrlWithBasePath(
                `/arena/${arenaId}/stats?from=play`
              )}
            >
              Results
            </Button>,
          ]
        : [
            <Button
              action="post"
              target={ctx.createUrlWithBasePath(
                `/arena/${arenaId}/stats?from=play`
              )}
            >
              Results
            </Button>,
          ]
      : [
          <Button
            action="post"
            target={ctx.createUrlWithBasePath(`/arena/${arenaId}/play`)}
          >
            Guess
          </Button>,
        ],
  };
});
