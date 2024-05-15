import { NextServerPageProps } from "frames.js/next/types";
import { PublicGuessedGame, gameService } from "../game/game-service";
import { Gallery } from "./gallery";
import { GameFilter, GameType } from "../game/game-pg-repository";
import { GameIdentityProvider } from "../game/game-repository";

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

export default async function GalleryPage(props: NextServerPageProps) {
  const filter = buildFilter(props);

  let games: PublicGuessedGame[] = [];
  let subtitle: string | undefined;
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
    } else {
      subtitle = gameKey;
    }
  }
  return (
    <div className="w-full h-full bg-primary-100 text-left flex-1">
      <Gallery subtitle={subtitle} games={games} filter={filter} />
    </div>
  );
}
