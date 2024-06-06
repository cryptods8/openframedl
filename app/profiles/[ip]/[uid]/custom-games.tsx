import { findAllByUserKey } from "../../../game/custom-game-pg-repository";
import { UserKey } from "../../../game/game-repository";

interface CustomGamesProps {
  userKey: UserKey;
}

export async function CustomGames(props: CustomGamesProps) {
  // const games = await findAllByUserKey(props.userKey);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-center gap-3">
        <div className="text-lg font-semibold">Custom games</div>
        <div className="flex flex-row gap-3">Hello</div>
      </div>
      <div className="flex flex-row items-center gap-3">
        <div className="text-sm text-primary-900/50">No custom games</div>
      </div>
    </div>
  );
}
