import { NextServerPageProps } from "frames.js/next/types";
import { PublicGuessedGame, gameService } from "../game/game-service";
import { Gallery } from "./gallery";
import { GameFilter, GameType } from "../game/game-pg-repository";
import { GameIdentityProvider } from "../game/game-repository";
import Link from "next/link";
import { addDaysToDate, getDailyGameKey } from "../game/game-utils";
import { IconButton, IconButtonProps } from "../ui/button/icon-button";

function buildFilter({ searchParams }: NextServerPageProps): GameFilter | null {
  const gameKey = searchParams?.gk as string | undefined;
  const userId = searchParams?.uid as string | undefined;
  const identityProvider = searchParams?.ip as GameIdentityProvider | undefined;
  const type = searchParams?.gt as GameType | undefined;

  let empty = true;
  const filter: GameFilter = {};
  if (gameKey) {
    empty = false;
    filter.gameKey = gameKey;
  }
  if (userId) {
    empty = false;
    filter.userId = userId;
    filter.identityProvider = identityProvider || "fc";
  }
  if (identityProvider) {
    // if nothing else, we treat the filter as empty
    filter.identityProvider = identityProvider;
  }
  if (type) {
    filter.type = type;
  }
  if (empty) {
    return null;
  }
  return filter;
}

interface ArrowButtonProps extends IconButtonProps {
  dir?: "left" | "right";
}

function ArrowButton({ dir = "right", ...props }: ArrowButtonProps) {
  return (
    <IconButton size="xs" {...props}>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dir === "left" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M13 5l-7 7 7 7"
          />
        )}
        {dir === "right" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M9 5l7 7-7 7"
          />
        )}
      </svg>
    </IconButton>
  );
}

function toUrlSearchParams(obj: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      params.set(key, value as string);
    } else if (value?.length) {
      for (const v of value) {
        params.append(key, v);
      }
    }
  }
  return params;
}

export default async function GalleryPage(props: NextServerPageProps) {
  const filter = buildFilter(props);

  let games: PublicGuessedGame[] = [];
  let subtitle: React.ReactNode | undefined;
  if (filter) {
    const { gameKey } = filter;
    games = (
      await gameService.loadAllPublic({ ...filter, completedOnly: true })
    ).sort((a, b) => (a.completedAt! > b.completedAt! ? 1 : -1));
    if (gameKey && gameKey.startsWith("custom_")) {
      const customMaker = await gameService.loadCustomGameMaker(
        gameKey.substring(7)
      );
      if (customMaker) {
        subtitle = `#${customMaker.number} by @${
          customMaker.userData?.username || `!${customMaker.userId}`
        }`;
      }
    } else if (gameKey) {
      if (filter.type === "DAILY") {
        const params = new URLSearchParams();
        for (const key in props.searchParams) {
          params.set(key, props.searchParams[key] as string);
        }
        const date = new Date(gameKey);
        const prevParams = toUrlSearchParams({
          ...props.searchParams,
          gk: getDailyGameKey(addDaysToDate(date, -1)),
        });
        const nextParams = toUrlSearchParams({
          ...props.searchParams,
          gk: getDailyGameKey(addDaysToDate(date, 1)),
        });
        subtitle = (
          <div className="flex gap-3 items-center">
            <Link href={`/gallery?${prevParams.toString()}`}>
              <ArrowButton dir="left" />
            </Link>
            <div>{gameKey}</div>
            <Link href={`/gallery?${nextParams.toString()}`}>
              <ArrowButton />
            </Link>
          </div>
        );
      } else {
        subtitle = gameKey;
      }
    }
  }
  return (
    <div className="w-full h-full bg-primary-100 text-left flex-1">
      <Gallery subtitle={subtitle} games={games} filter={filter} />
    </div>
  );
}