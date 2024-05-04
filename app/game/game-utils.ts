import { isPro } from "../constants";
import { PublicGuessedGame } from "./game-service";

function buildResultText(game: PublicGuessedGame) {
  return game.guesses
    .map((guess, i) => {
      return guess.characters
        .map((letter, j) => {
          return letter.status === "CORRECT"
            ? "🟩"
            : letter.status === "WRONG_POSITION"
            ? "🟨"
            : "⬜";
        })
        .join("");
    })
    .join("\n");
}

function formatGameKey(gameKey: string) {
  if (gameKey.startsWith("custom_")) {
    return gameKey.substring(gameKey.length - 8);
  }
  return gameKey;
}

export function buildShareableResult(
  game: PublicGuessedGame | null | undefined
) {
  if (!game) {
    return {
      title: "Framedl",
      text: `Play Framedl!`,
    };
  }
  const guessCount = game.status === "WON" ? `${game.guesses.length}` : "X";
  const title = `Framedl ${isPro ? "PRO " : ""}${formatGameKey(
    game.gameKey
  )} ${guessCount}/6${game.isHardMode ? "*" : ""}`;
  const text = buildResultText(game);
  return { title, text };
}

export function addDaysToDate(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getDailyGameKey(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export function getDateFromDailyGameKey(gameKey: string): Date {
  return new Date(gameKey);
}
