"use client";

import { Dialog } from "./dialog";
import { Button } from "./button/button";
import { GameGuessGrid } from "./game-guess-grid";

const WordExample = ({
  word,
  position,
  type,
}: {
  word: string;
  position: number;
  type: "correct" | "misplaced" | "wrong";
}) => {
  // return (
  //   <div className="flex gap-1">
  //     {word.split("").map((letter, index) => (
  //       <div
  //         key={index}
  //         className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded border-2 ${
  //           index === position
  //             ? "bg-green-500 text-white border-green-500"
  //             : "bg-gray-200 text-gray-600 border-gray-300"
  //         }`}
  //       >
  //         {letter.toUpperCase()}
  //       </div>
  //     ))}
  //   </div>
  // );
  return (
    <GameGuessGrid
      compact
      guesses={[
        {
          characters: word.split("").map((letter, idx) => ({
            character: letter,
            status:
              idx !== position
                ? "UNKNOWN"
                : type === "correct"
                ? "CORRECT"
                : type === "misplaced"
                ? "WRONG_POSITION"
                : type === "wrong"
                ? "INCORRECT"
                : "UNKNOWN",
          })),
        },
      ]}
    />
  );
};

export function GameIntroDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} noPadding flex>
      <div className="w-full flex-1 max-w-md flex flex-col overflow-y-auto h-full">
        {/* Header */}
        <div className="text-center space-y-1 px-4 py-6 sm:px-8 border-b border-primary-200">
          <h2 className="text-xl sm:text-2xl font-space font-bold">
            How to Play Framedl
          </h2>
          {/* <p className="text-sm sm:text-md text-primary-900/50">
            Guess the 5-letter word in 6 tries or less
          </p> */}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4">
          {/* Objective */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Objective</h3>
            <p className="text-sm leading-relaxed">
              Guess the hidden 5-letter word in 6 tries or less. Each guess must
              be a valid English word. Use the color clues to figure out the
              correct word!
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Examples</h3>

            {/* Correct letter example */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Correct letter in the right spot:
              </p>
              <WordExample word="CRAFT" position={0} type="correct" />
              <p className="text-xs">
                C is in the word and in the correct position
              </p>
            </div>

            {/* Misplaced letter example */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Correct letter in the wrong spot:
              </p>
              <WordExample word="SHARP" position={1} type="misplaced" />
              <p className="text-xs">
                A is in the word but in the wrong position
              </p>
            </div>

            {/* Wrong letter example */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Letter not in the word:</p>
              <WordExample word="BRAIN" position={0} type="wrong" />
              <p className="text-xs">B is not in the word in any position</p>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Tips</h3>
            <ul className="text-sm space-y-2 list-disc pl-4">
              <li>Start with words that have common vowels (A, E, I, O, U)</li>
              <li>Use different letters in your first few guesses</li>
              <li>Pay attention to letter frequency in English</li>
              <li>Remember that letters can appear more than once</li>
            </ul>
          </div>
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-primary-200">
          <Button variant="primary" onClick={onClose} size="md">
            Got it! Let's play
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
