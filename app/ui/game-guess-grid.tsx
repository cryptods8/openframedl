import { Guess, GuessCharacter } from "../game/game-service";

const fullArray = Array.from({ length: 6 });
const emptyGuess: GuessCharacter[] = Array.from({ length: 5 });

export function GameGuessGrid({
  guesses,
  full,
}: {
  guesses: Guess[];
  full?: boolean;
}) {
  const arr = full ? fullArray : guesses;
  return (
    <div className="flex flex-col gap-1">
      {arr.map((_, i) => {
        const guess = guesses[i];
        const characters = guess?.characters || emptyGuess;
        return (
          <div key={i} className="flex gap-1">
            {characters.map((letter, j) => (
              <div
                key={j}
                className={`w-12 h-12 flex items-center justify-center font-bold text-2xl border-2 ${
                  !letter
                    ? "bg-white border-primary-950/20"
                    : letter.status === "CORRECT"
                    ? "bg-green-600 text-white border-transparent"
                    : letter.status === "WRONG_POSITION"
                    ? "bg-orange-600 text-white border-transparent"
                    : letter.character
                    ? "bg-primary-950/40 text-white border-transparent"
                    : "bg-primary-950/20 text-white border-transparent"
                }`}
              >
                {letter?.character.toUpperCase()}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
