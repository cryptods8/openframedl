import { PublicGuessedGame } from "../game/game-service";
import { formatGameKey } from "../game/game-utils";
import { GameGuessGrid } from "../ui/game-guess-grid";

export function GalleryGameEntry(props: {
  game: PublicGuessedGame;
  number?: number;
  showGameKey?: boolean;
}) {
  const { game, number, showGameKey } = props;
  const { identityProvider, userId, guesses, userData } = game;
  return (
    <div className="p-4 flex flex-col gap-4 bg-white rounded border border-primary-200">
      <GameGuessGrid guesses={guesses} full />
      <div className="flex flex-col gap-1">
        <div className="flex flex-row gap-1 gap-x-3 items-center">
          <div className="px-2 py-1 rounded bg-primary-950 flex items-center justify-center text-xs text-white">
            {number}
          </div>
          <div className="text-lg break-all">
            {identityProvider === "fc" ? (
              <a
                href={`https://warpcast.com/${
                  userData?.username || `!${userId}`
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-900 underline hover:text-primary-700"
              >
                {userData?.username ? `@${userData?.username}` : `!${userId}`}
              </a>
            ) : (
              userData?.username || userId
            )}
          </div>
        </div>
        {showGameKey && <div className="text-sm text-primary-950/60">{formatGameKey(game)}</div>}
      </div>
    </div>
  );
}
