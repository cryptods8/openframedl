"use client";

import { Avatar } from "@/app/ui/avatar";
import sdk from "@farcaster/frame-sdk";
import { useCallback } from "react";

export interface LeaderboardEntry {
  id: string;
  userId: string;
  pos: string;
  username: string;
  avatar: string | null;
  highlighted: boolean;
  value: number;
  score?: number;
}

function Score({ score }: { score: number }) {
  const parts = score.toFixed(2).split(".");
  return (
    <div className="flex items-baseline">
      <div>{parts[0]}</div>
      <div className="opacity-50 text-xs">.{parts[1]}</div>
    </div>
  );
}

export function LeaderboardEntryRow({ entry }: { entry: LeaderboardEntry }) {

  const handleUserClick = useCallback(() => {
    sdk.actions.viewProfile({ fid: parseInt(entry.userId, 10) });
  }, []);

  return (
    <div
      className={`flex items-center gap-5 py-2 px-3 w-full ${
        entry.highlighted ? "font-bold text-white bg-primary-800 rounded-md" : ""
      }`}
    >
      <div
        className={`w-6 h-6 text-sm rounded bg-primary-900/10 flex items-center justify-center shrink-0 ${
          entry.pos === "1"
            ? "bg-primary-900/80 text-white"
            : entry.pos === "2"
            ? "bg-primary-900/60 text-white"
            : entry.pos === "3"
            ? "bg-primary-900/40 text-white"
            : "bg-primary-900/10"
        }`}
      >
        {entry.pos}
      </div>
      <div className="flex items-center gap-2 shrink cursor-pointer" onClick={handleUserClick} role="button">
        <div className="shrink-0">
          <Avatar avatar={entry.avatar} username={entry.username} />
        </div>
        <div className="shrink truncate overflow-hidden">{entry.username}</div>
      </div>
      <div
        className={`flex-1 h-1 rounded-full ${
          entry.highlighted ? "bg-primary-950" : "bg-primary-200/50"
        }`}
      />
      <div className="font-mono">{entry.value}</div>
      {entry.score != null && (
        <div className="w-8 flex justify-end font-mono">
          <Score score={entry.score} />
        </div>
      )}
    </div>
  );
}
