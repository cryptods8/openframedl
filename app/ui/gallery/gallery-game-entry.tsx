"use client";

import { PublicGuessedGame } from "../../game/game-service";
import { formatGameKey } from "../../game/game-utils";
import { IconButton } from "../button/icon-button";
import { GameGuessGrid } from "../game-guess-grid";
import { createComposeUrl } from "../../utils";
import Link from "next/link";
import { ShareIcon } from "@heroicons/react/16/solid";

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
        <ShareIcon className="size-4" />
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
                  {formatGameKey(game)}{game.isHardMode ? "*" : ""}
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
