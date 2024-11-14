import { Guess, GuessCharacter } from "../game/game-service";

const fullArray = Array.from({ length: 6 });
const emptyGuess: GuessCharacter[] = Array.from({ length: 5 });

export function GameGuessGrid({
  guesses,
  full,
  submitting,
  placeholder,
}: {
  guesses: Guess[];
  full?: boolean;
  submitting?: boolean;
  placeholder?: boolean;
}) {
  const arr = full ? fullArray : guesses;
  return (
    <div className="flex flex-col gap-1">
      {arr.map((_, i) => {
        const guess = guesses[i];
        const characters = guess?.characters || emptyGuess;
        const isLastGuess = i === guesses.length - 1;
        const hasSubmitAnimation = submitting && isLastGuess;
        return (
          <div key={i} className="flex gap-1">
            {characters.map((letter, j) => (
              <div
                key={j}
                className={`w-12 h-12 flex items-center justify-center font-bold text-2xl border-2 transition-[border-color,background-color] duration-100 ${
                  !letter
                    ? "bg-white border-primary-950/20"
                    : placeholder
                    ? "bg-white text-primary-950/30 border-primary-950/20"
                    : letter.status === "CORRECT"
                    ? "bg-green-600 text-white border-transparent"
                    : letter.status === "WRONG_POSITION"
                    ? "bg-orange-600 text-white border-transparent"
                    : letter.status === "UNKNOWN"
                    ? `bg-white ${
                        letter.character
                          ? "border-primary-950/40"
                          : "border-primary-950/20"
                      }`
                    : letter.character
                    ? "bg-primary-950/40 text-white border-transparent"
                    : "bg-primary-950/20 text-white border-transparent"
                }`}
              >
                <span
                  className={hasSubmitAnimation ? "animate-bounce" : ""}
                  style={{ animationDelay: `${j * 100}ms` }}
                >
                  {letter?.character.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
