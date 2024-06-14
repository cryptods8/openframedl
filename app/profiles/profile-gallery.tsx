import { gameService } from "@/app/game/game-service";
import { GamesGrid } from "@/app/ui/gallery/games-grid";
import { GameFilter } from "@/app/game/game-pg-repository";
import { ProfileGalleryFilter } from "./profile-gallery-filter";
import { UserData } from "@/app/game/game-repository";

interface ProfileGalleryProps {
  isCurrentUser: boolean;
  filter: GameFilter;
  userData: UserData | null;
}

export async function ProfileGallery(props: ProfileGalleryProps) {
  const { filter, isCurrentUser, userData } = props;

  const games = await gameService.loadAllPublic(filter, isCurrentUser);
  const sortedGames = games
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .map((game, index) => ({ game: { ...game, userData }, number: index + 1 }));

  return (
    <div className="flex flex-col gap-3">
      <div className="p-2">
        <ProfileGalleryFilter />
      </div>
      <GamesGrid games={sortedGames} context="PROFILE" />
    </div>
  );
}
