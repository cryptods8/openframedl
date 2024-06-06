"use client";

import { GameFilter } from "../game/game-pg-repository";
import { CustomGameMaker, PublicGuessedGame } from "../game/game-service";
import { formatGameKey } from "../game/game-utils";
import { GalleryGameEntry } from "../ui/gallery/gallery-game-entry";
import { useMemo, useState } from "react";
import { GamesGrid } from "../ui/gallery/games-grid";
import { Checkbox, Description, Field, Label } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/16/solid";

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
  customMaker,
}: {
  games: PublicGuessedGame[];
  subtitle?: React.ReactNode;
  filter?: GameFilter | null;
  customMaker?: CustomGameMaker | null;
}) {
  const [textFilter, setTextFilter] = useState("");
  const [winInOneShown, setWinInOneShown] = useState(false);
  const numberedGames = useMemo(
    () => games.map((game, index) => ({ game, number: index + 1 })),
    [games]
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value;
    setTextFilter(newFilter);
  };

  const isArt = customMaker?.isArt ?? false;
  const filterFunction = filter?.userId
    ? matchesGameKeyFilter
    : matchesUsernameFilter;
  const filteredGames = numberedGames.filter(({ game }) => {
    const filtered = filterFunction(game, textFilter);
    if (winInOneShown || !isArt) {
      return filtered;
    }
    return filtered && game.guesses.length > 1;
  });

  return (
    <div className="max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto flex-1">
      <div className="flex flex-col items-center md:flex-row sm:px-4 mb-8">
        <div className="w-full my-6 font-space flex flex-col items-center md:items-start">
          <h1 className="text-3xl">
            <span className="font-space font-bold">Framedl</span> Gallery
          </h1>
          {subtitle && <div className="text-xl">{subtitle}</div>}
        </div>
        <div className="w-full flex flex-col items-end">
          <input
            className="w-full px-5 py-4 rounded-full border border-primary-200 focus:border-primary-500 focus:outline-none transition duration-150 ease-in-out"
            value={textFilter}
            onChange={handleFilterChange}
            type="text"
            placeholder={`Filter by ${
              filter?.userId ? "game key" : "username"
            }`}
          />
          {isArt && (
            <Field className="w-full flex gap-x-2 gap-y-1 mx-4 mt-4 items-center justify-end">
              <Checkbox
                checked={winInOneShown}
                onChange={setWinInOneShown}
                className="group size-6 rounded-md bg-white p-1 ring-1 ring-primary-200 ring-inset"
              >
                <CheckIcon className="hidden size-4 fill-primary-900 group-data-[checked]:block" />
              </Checkbox>
              <Label className="font-semibold text-primary-900/60 text-sm">
                Show wins in 1
              </Label>
            </Field>
          )}
        </div>
      </div>
      <GamesGrid games={filteredGames} context="GALLERY" />
    </div>
  );
}
