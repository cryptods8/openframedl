"use client";

import { Button } from "@/app/ui/button/button";
import { useBottomOffset } from "@/app/ui/bottom-nav";

export function LeaderboardBackBar({ gameHref }: { gameHref: string }) {
  const bottomOffset = useBottomOffset();

  return (
    <div
      className="fixed border-t border-primary-500/10 w-full left-0 right-0 bg-white/30 backdrop-blur-sm shadow-xl shadow-primary-500/10"
      style={{ bottom: bottomOffset }}
    >
      <div className="flex items-center justify-center h-full p-4">
        <Button variant="outline" href={gameHref}>
          Back to Game
        </Button>
      </div>
    </div>
  );
}
