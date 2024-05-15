import { NextServerPageProps } from "frames.js/next/types";
import { PublicGuessedGame, gameService } from "../game/game-service";
import { Gallery } from "./gallery";

export default async function GalleryPage({
  searchParams,
}: NextServerPageProps) {
  const gameKey = searchParams?.gk as string | undefined;

  let games: PublicGuessedGame[] = [];
  let subtitle: string | undefined;
  if (gameKey) {
    if (gameKey.startsWith("custom_")) {
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
    games = (
      await gameService.loadAllPublic({ gameKey, completedOnly: true })
    ).sort((a, b) => (a.completedAt! > b.completedAt! ? 1 : -1));
  }
  return (
    <div className="w-full h-full bg-primary-100 text-left flex-1">
      <Gallery subtitle={subtitle} games={games} />
    </div>
  );
}
