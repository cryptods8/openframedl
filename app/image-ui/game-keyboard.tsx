import { ReactNode } from "react";

import { GuessedGame, CustomGameMaker } from "@/app/game/game-service";

import { lightColor, primaryColor } from "./image-utils";

const KEY_CELL_W = 48;
const KEY_CELL_H = 58;

const KEYS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export function GameKeyboard({
  game,
  customMaker,
  dark,
}: {
  game: GuessedGame | undefined | null;
  customMaker?: CustomGameMaker | null;
  dark?: boolean;
}) {
  const { allGuessedCharacters } = game || { guesses: [] };
  const artWord = customMaker?.word;

  // keyboard
  const keyboardRows = [];
  for (let i = 0; i < KEYS.length; i++) {
    const keys = KEYS[i]!;
    const keyCells: ReactNode[] = [];
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]!;
      const gc = allGuessedCharacters?.[key];
      // const color =
      //   gc &&
      //   (gc.status === "CORRECT" ||
      //     gc.status === "WRONG_POSITION" ||
      //     gc.status === "INCORRECT")
      //     ? "white"
      //     : dark ? "white" : primaryColor(1);
      const color =
        gc && gc.status === "CORRECT"
          ? "white"
          : gc && gc.status === "WRONG_POSITION"
          ? dark
            ? primaryColor(1)
            : "white"
          : gc && gc.status === "INCORRECT"
          ? dark
            ? primaryColor()
            : "white"
          : dark
          ? "white"
          : primaryColor(1);
      const backgroundColor =
        gc && gc.status === "CORRECT"
          ? "green"
          : gc && gc.status === "WRONG_POSITION"
          ? "orange"
          : gc && gc.status === "INCORRECT"
          ? dark
            ? lightColor(0.42)
            : primaryColor(0.42)
          : dark
          ? lightColor(0.12)
          : primaryColor(0.12);
      const isArtWordLetter = artWord?.toLowerCase().includes(key);
      keyCells.push(
        <div
          key={j}
          tw={"flex justify-center items-center rounded-md text-3xl relative"}
          style={{
            fontWeight: 500,
            width: KEY_CELL_W,
            height: KEY_CELL_H,
            color,
            backgroundColor,
            borderColor: dark ? lightColor() : primaryColor(),
          }}
        >
          {key.toUpperCase()}
          {isArtWordLetter && (
            <div
              tw="absolute -bottom-0 left-0 right-0 h-2 flex rounded-b"
              style={{
                backgroundColor: dark ? lightColor(0.2) : primaryColor(0.2),
              }}
            />
          )}
        </div>
      );
    }
    keyboardRows.push(
      <div key={i} tw="flex flex-row" style={{ gap: "0.5rem" }}>
        {keyCells}
      </div>
    );
  }

  return (
    <div
      tw="flex flex-col items-center justify-center"
      style={{ gap: "0.5rem" }}
    >
      {keyboardRows}
    </div>
  );
}
