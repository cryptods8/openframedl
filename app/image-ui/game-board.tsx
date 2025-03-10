import { ReactNode } from "react";

import { GuessedGame } from "@/app/game/game-service";
import { getGuessCharacterColorStyle } from "./image-utils";

const MAX_GUESSES = 6;
const CELL_W = 84;
const CELL_H = 84;

export function GameBoard({
  game,
  isPublic,
  dark,
  reveal
}: {
  game: GuessedGame | null | undefined;
  isPublic?: boolean;
  dark?: boolean;
  reveal?: 'none' | 'all' | 'correct_word'
}) {
  const { guesses } = game || { guesses: [] };
  reveal = reveal || (isPublic ? "none" : "all");

  const rows: ReactNode[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i];
    const cells: ReactNode[] = [];
    for (let j = 0; j < 5; j++) {
      const letter = guess ? guess.characters[j] : undefined;
      const char = letter ? letter.character : "";
      const isRevealed = reveal === "all" || (reveal === "correct_word" && game?.status === "WON" && i === game.guessCount - 1);
      const { color, backgroundColor, borderColor } =
        getGuessCharacterColorStyle(letter, isRevealed, dark);
      cells.push(
        <div
          key={j}
          tw="flex justify-center items-center text-5xl"
          style={{
            lineHeight: 1,
            fontWeight: 600,
            width: CELL_W,
            height: CELL_H,
            color,
            backgroundColor,
            border: "4px solid",
            borderColor,
          }}
        >
          {isRevealed ? char.toUpperCase() : ""}
        </div>
      );
    }
    rows.push(
      <div
        key={i}
        tw="flex justify-center items-center"
        style={{ gap: "0.5rem" }}
      >
        {cells}
      </div>
    );
  }

  return (
    <div
      tw="flex flex-col items-center justify-center p-12"
      style={{ gap: "0.5rem" }}
    >
      {rows}
    </div>
  );
}
