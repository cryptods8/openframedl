"use client";

import { useBottomOffset } from "@/app/ui/bottom-nav";
import { LeaderboardEntryRow, LeaderboardEntries } from "./leaderboard-entry";
import { useMemo } from "react";

export function LeaderboardList({ entries }: { entries: LeaderboardEntries }) {
  const bottomOffset = useBottomOffset();

  const firstHighlightedEntryWithIndex = useMemo(
    () =>
      entries
        .map((entry, idx) => {
          if (entry?.highlighted) {
            return { entry: { ...entry, id: `h-${entry.id}` }, idx };
          }
          return null;
        })
        .filter((entry) => entry !== null)[0],
    [entries],
  );
  const allEntries = useMemo(() => {
    if (
      firstHighlightedEntryWithIndex &&
      firstHighlightedEntryWithIndex.idx > 4
    ) {
      return [firstHighlightedEntryWithIndex.entry, null, ...entries];
    }
    return entries;
  }, [firstHighlightedEntryWithIndex, entries]);

  return (
    <div className="space-y-1" style={{ paddingBottom: bottomOffset }}>
      {allEntries.map((entry, idx) => {
        if (!entry) {
          const prevHighlighted = allEntries[idx - 1]?.highlighted;
          const nextHighlighted = allEntries[idx + 1]?.highlighted;
          return (
            <div
              key={`empty-${idx}`}
              className={`${prevHighlighted ? "pt-3" : "pt-1"} ${nextHighlighted ? "pb-3" : "pb-1"}`}
            >
              <div className="h-1 bg-primary-900/10 rounded-full w-full" />
            </div>
          );
        }
        return <LeaderboardEntryRow key={entry.id} entry={entry} />;
      })}
    </div>
  );
}
