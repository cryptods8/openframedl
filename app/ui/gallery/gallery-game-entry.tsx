"use client";

import { PublicGuessedGame } from "../../game/game-service";
import { formatGameKey } from "../../game/game-utils";
import { IconButton } from "../button/icon-button";
import { GameGuessGrid } from "../game-guess-grid";
import { createComposeUrl } from "../../utils";
import Link from "next/link";

function ShareIconButton({ game }: { game: PublicGuessedGame }) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const url = new URL(`/?id=${game.id}`, origin);
  const username = game.userData?.username || `${game.userId}`;

  const href = createComposeUrl(
    `Framedl ${game.gameKey.substring(
      game.gameKey.length - 8
    )} by @${username}`,
    url.toString()
  );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <IconButton title="Share to Warpcast">
        <svg
          className="w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          version="1.1"
          viewBox="0 0 458.624 458.624"
        >
          <path d="M339.588,314.529c-14.215,0-27.456,4.133-38.621,11.239l-112.682-78.67c1.809-6.315,2.798-12.976,2.798-19.871    c0-6.896-0.989-13.557-2.798-19.871l109.64-76.547c11.764,8.356,26.133,13.286,41.662,13.286c39.79,0,72.047-32.257,72.047-72.047    C411.634,32.258,379.378,0,339.588,0c-39.79,0-72.047,32.257-72.047,72.047c0,5.255,0.578,10.373,1.646,15.308l-112.424,78.491    c-10.974-6.759-23.892-10.666-37.727-10.666c-39.79,0-72.047,32.257-72.047,72.047s32.256,72.047,72.047,72.047    c13.834,0,26.753-3.907,37.727-10.666l113.292,79.097c-1.629,6.017-2.514,12.34-2.514,18.872c0,39.79,32.257,72.047,72.047,72.047    c39.79,0,72.047-32.257,72.047-72.047C411.635,346.787,379.378,314.529,339.588,314.529z" />
        </svg>
      </IconButton>
    </a>
  );
}

export type GameEntryContext = "PROFILE" | "GALLERY";

export function GalleryGameEntry(props: {
  game: PublicGuessedGame;
  context?: GameEntryContext;
  number?: number;
}) {
  const { game, number, context } = props;
  const { identityProvider, userId, guesses, userData } = game;
  return (
    <div className="p-4 flex flex-col gap-4 bg-white rounded border border-primary-200">
      <GameGuessGrid guesses={guesses} full />
      <div className="flex flex-row gap-2">
        <div className="flex flex-col flex-1 gap-1">
          <div className="flex flex-row gap-1 gap-x-3 items-center">
            <div className="px-2 py-1 rounded bg-primary-950 flex items-center justify-center text-xs text-white">
              {number}
            </div>
            <div className="text-lg break-all">
              {context === "PROFILE" ? (
                <Link
                  href={`/gallery?gk=${game.gameKey}${
                    game.isDaily ? "&gt=DAILY" : ""
                  }`}
                  className="text-primary-900 underline hover:text-primary-700"
                >
                  {formatGameKey(game)}
                </Link>
              ) : (
                <Link
                  href={`/profiles/${identityProvider}/${userId}`}
                  className="text-primary-900 underline hover:text-primary-700"
                >
                  {identityProvider === "fc"
                    ? userData?.username
                      ? `@${userData?.username}`
                      : `!${userId}`
                    : userData?.username ?? userId}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="text-primary-200">
          <ShareIconButton game={game} />
        </div>
      </div>
    </div>
  );
}
