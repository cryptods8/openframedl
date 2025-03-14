"use client";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { PublicGuessedGame } from "../game/game-service";
import { buildShareableResult, formatGameKey } from "../game/game-utils";
import { GameGuessGrid } from "./game-guess-grid";
import Link from "next/link";

export interface GameResultProps {
  game?: PublicGuessedGame | null;
  shareUrl?: string;
  config: { isPro: boolean };
}

export default function GameResult({ game, shareUrl, config }: GameResultProps) {
  const handleShare = () => {
    const url = shareUrl || window.location.href;
    const { title, text } = buildShareableResult(game, config);
    const { navigator } = window;
    const fullText = `${title}\n\n${text}\n\n${url}`;
    if (navigator?.share) {
      navigator.share({ title, text: fullText });
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(fullText);
      alert("Copied to clipboard");
    } else {
      alert("Sharing is not supported on this device!");
    }
  };

  return (
    <div className="w-64 flex flex-col items-center justify-center gap-6 text-primary-900">
      {game && (
        <div className="w-full flex flex-col gap-1 font-space">
          <p className="w-full text-left text-2xl py-1 font-space font-bold">
            Framedl {formatGameKey(game)}
          </p>
          <p className="w-full text-left text-xl">
            {game.status === "WON" ? "You won! 🎉" : "Better luck next time!"}
          </p>
          <p className="w-full text-left text-primary-900/50 leading-snug">
            {game.status === "WON" ? (
              <span>
                You found the word in {game.guesses.length}{" "}
                {game.guesses.length === 1 ? "attempt" : "attempts"}
              </span>
            ) : (
              <span>
                You ran out of guesses.{" "}
                {game.word && (
                  <span>
                    <span>The correct word was </span>
                    <span className="font-bold">{game.word.toUpperCase()}</span>
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      )}
      {game && (
        <div className="flex flex-col gap-1">
          <GameGuessGrid guesses={game.guesses} />
        </div>
      )}
      <div className="flex flex-col gap-2 w-full">
        <button
          className="bg-primary-800 w-full px-6 py-4 text-white font-bold rounded hover:bg-primary-900 active:bg-primary-950"
          onClick={handleShare}
        >
          Share
        </button>
        {game && (
          <Link href={`/profiles/${game?.identityProvider}/${game?.userId}`}>
            <button className="w-full px-6 py-4 text-primary-900 font-bold rounded hover:bg-white/50 active:bg-white/50 flex items-center justify-center">
              Go to profile
              <ArrowRightIcon className="ml-4 size-6" />
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
