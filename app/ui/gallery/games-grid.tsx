"use client";

import { GalleryGameEntry } from "./gallery-game-entry";
import { PublicGuessedGame } from "../../game/game-service";

interface NumberedGame {
  game: PublicGuessedGame;
  number: number;
}

export function GamesGrid(props: { games: NumberedGame[] }) {
  const { games } = props;
  return (
    <div className="w-full flex-wrap gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
      {games.map(({ game, number }) => (
        <div key={game.id} style={{ width: 290 }}>
          <GalleryGameEntry game={game} number={number} showGameKey />
        </div>
      ))}
    </div>
  );
}
