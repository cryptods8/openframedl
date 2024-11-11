/* eslint-disable react/jsx-key */

import { UserData, UserGameKey } from "@/app/game/game-repository";
import {
  gameService,
  GuessedGame,
  LoadOrCreateOptions,
} from "@/app/game/game-service";
import { timeCall } from "@/app/utils";

export interface GameState {
  finished?: boolean;
  game: GuessedGame;
  message?: string;
}

interface NextGameStateOptions extends LoadOrCreateOptions {
  resetType?: string;
}

export async function nextGameState(
  userGameKey: UserGameKey,
  inputText: string | undefined,
  options: NextGameStateOptions
): Promise<GameState> {
  const { resetType } = options;
  const game = await timeCall("loadOrCreate", () =>
    gameService.loadOrCreate(userGameKey, options)
  );
  if (resetType) {
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
      case "INVALID_ALREADY_GUESSED":
        message = "Already guessed!";
        break;
    }
    return {
      message,
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
