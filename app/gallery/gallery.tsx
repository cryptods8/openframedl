"use client";

import { GameFilter } from "../game/game-pg-repository";
import { PublicGuessedGame } from "../game/game-service";
import { formatGameKey } from "../game/game-utils";
import { GalleryGameEntry } from "../ui/gallery/gallery-game-entry";
import { useMemo, useState } from "react";
import { GamesGrid } from "../ui/gallery/games-grid";

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
  subtitle?: React.ReactNode;
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
      <div className="flex flex-col items-center md:flex-row sm:px-4 mb-8">
        <div className="w-full my-6 font-space flex flex-col items-center md:items-start">
          <h1 className="text-3xl">
            <span className="font-space font-bold">Framedl</span> Gallery
          </h1>
          {subtitle && <div className="text-xl">{subtitle}</div>}
        </div>
        <input
          className="w-full px-5 py-4 rounded-full border border-primary-200 focus:border-primary-500 focus:outline-none transition duration-150 ease-in-out"
          value={textFilter}
          onChange={handleFilterChange}
          type="text"
          placeholder={`Filter by ${filter?.userId ? "game key" : "username"}`}
        />
      </div>
      <GamesGrid games={filteredGames} />
    </div>
  );
}
