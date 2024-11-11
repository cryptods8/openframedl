import { NextServerPageProps } from "frames.js/next/types";
import {
  CustomGameMaker,
  PublicGuessedGame,
  gameService,
} from "../game/game-service";
import { Gallery } from "./gallery";
import { GameFilter, GameType } from "../game/game-pg-repository";
import { GameIdentityProvider } from "../game/game-repository";
import Link from "next/link";
import { addDaysToDate, getDailyGameKey } from "../game/game-utils";
import { IconButton, IconButtonProps } from "../ui/button/icon-button";
import { toUrlSearchParams } from "../utils";
import { ProfileApp } from "../profiles/profile-app";

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

export default async function GalleryPage(props: NextServerPageProps) {
  const filter = buildFilter(props);

  let games: PublicGuessedGame[] = [];
  let subtitle: React.ReactNode | undefined;
  let customMaker: CustomGameMaker | undefined | null;
  if (filter) {
    const { gameKey } = filter;
    if (gameKey && gameKey.startsWith("custom_")) {
      customMaker = await gameService.loadCustomGameMaker(gameKey.substring(7));
      if (customMaker) {
        subtitle = (
          <span>
            #{customMaker.number} by{" "}
            <Link
              className="text-primary-900 underline hover:text-primary-700"
              href={`/profiles/${customMaker.identityProvider}/${customMaker.userId}`}
            >
              @{customMaker.userData?.username || `!${customMaker.userId}`}
            </Link>
          </span>
        );
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
    const showWords = false;
    // const showWords =
    //   customMaker?.identityProvider === "fc" &&
    //   customMaker?.userId === session?.user?.name;
    games = (
      await gameService.loadAllPublic(
        { ...filter, completedOnly: true },
        showWords
      )
    ).sort((a, b) => (a.completedAt! > b.completedAt! ? 1 : -1));
  }
  return (
    <ProfileApp>
      <div className="w-full h-full bg-primary-100 text-left flex-1">
        <Gallery
          subtitle={subtitle}
          games={games}
          filter={filter}
          customMaker={customMaker}
        />
      </div>
    </ProfileApp>
  );
}
