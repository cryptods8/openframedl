"use client";

import { PublicArenaWithGames } from "@/app/games/arena/arena-utils";
import { Avatar } from "@/app/ui/avatar";

export function ArenaHeader({
  arena,
  showAvatar,
}: {
  arena: PublicArenaWithGames;
  showAvatar?: boolean;
}) {
  return (
    <div>
      <span className="align-middle">Arena #{arena.id} by </span>
      <div className="inline-flex items-center gap-1 align-middle">
        {showAvatar && (
          <Avatar
            avatar={arena?.userData?.profileImage}
            username={arena?.userData?.username}
          />
        )}
        <span>{arena?.userData?.username}</span>
      </div>
    </div>
  );
}
