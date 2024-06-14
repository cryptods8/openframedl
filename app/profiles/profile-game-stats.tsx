import { gameService } from "@/app/game/game-service";
import { UserKey } from "@/app/game/game-repository";
import { GameStats } from "./game-stats";
import { EmptyMessage } from "./empty-message";

interface ProfileGameStatsProps {
  userKey: UserKey;
}

export default async function ProfileGameStats(props: ProfileGameStatsProps) {
  const { userKey } = props;
  const stats = await gameService.loadStats(userKey);

  return (
    <div>
      {stats ? (
        <GameStats stats={stats} />
      ) : (
        <EmptyMessage>No stats available</EmptyMessage>
      )}
    </div>
  );
}
