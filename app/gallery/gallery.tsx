"use client";

import { GameFilter } from "../game/game-pg-repository";
import { PublicGuessedGame } from "../game/game-service";
import { formatGameKey } from "../game/game-utils";
import { GalleryGameEntry } from "./gallery-game-entry";
import { useMemo, useState } from "react";

function matchesUsernameFilter(
  game: PublicGuessedGame,
  filter: string | undefined
) {
  return (
    !filter ||
    game.userData?.username?.toLowerCase().includes(filter.toLowerCase())
  );
}

function matchesGameKeyFilter(
  game: PublicGuessedGame,
  filter: string | undefined
) {
  return (
    !filter || formatGameKey(game).toLowerCase().includes(filter.toLowerCase())
  );
}

export function Gallery({
  games,
  subtitle,
  filter,
}: {
  games: PublicGuessedGame[];
  subtitle?: string;
  filter?: GameFilter | null;
}) {
  const [textFilter, setTextFilter] = useState("");
  const numberedGames = useMemo(
    () => games.map((game, index) => ({ game, number: index + 1 })),
    [games]
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value;
    setTextFilter(newFilter);
  };

  const filterFunction = filter?.userId
    ? matchesGameKeyFilter
    : matchesUsernameFilter;
  const filteredGames = numberedGames.filter(({ game }) =>
    filterFunction(game, textFilter)
  );

  return (
    <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto flex-1">
      <div className="flex flex-col items-center md:flex-row sm:px-4">
        <div className="w-full my-6 font-space text-center md:text-left">
          <h1 className="w-full text-3xl">
            <span className="font-spaceBold">Framedl</span> Gallery
          </h1>
          {subtitle && <span className="text-xl">{subtitle}</span>}
        </div>
        <input
          className="w-full px-5 py-4 rounded-full border border-primary-200 focus:border-primary-500 focus:outline-none transition duration-150 ease-in-out"
          value={textFilter}
          onChange={handleFilterChange}
          type="text"
          placeholder={`Filter by ${filter?.userId ? "game key" : "username"}`}
        />
      </div>
      <div className="w-full flex-wrap gap-6 mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
        {filteredGames.map(({ game, number }) => (
          <div key={game.id} style={{ width: 290 }}>
            <GalleryGameEntry
              game={game}
              number={number}
              showGameKey={!filter?.gameKey}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
