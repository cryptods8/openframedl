"use client";

import { GalleryGameEntry, GameEntryContext } from "./gallery-game-entry";
import { PublicGuessedGame } from "../../game/game-service";
import { cn } from "@/app/utils";

interface NumberedGame {
  game: PublicGuessedGame;
  number: number;
}

export function GamesGrid(props: {
  games: NumberedGame[];
  context?: GameEntryContext;
  narrow?: boolean;
}) {
  const { games, context, narrow } = props;
  return (
    <div
      className={cn({
        "w-full gap-6 grid grid-cols-1 md:grid-cols-2 justify-items-center": true,
        "lg:grid-cols-3 xl:grid-cols-4": !narrow,
      })}
    >
      {games.map(({ game, number }) => (
        <div key={game.id} className="w-full max-w-[290px]">
          <GalleryGameEntry game={game} number={number} context={context} />
        </div>
      ))}
    </div>
  );
}
