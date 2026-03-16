"use client";

import { useState } from "react";
import {
  BadgeInfo,
  BadgeCategory,
  BADGE_CATEGORIES,
  formatBadgeValue,
  getBadgeImageUrl,
  getBadgesForCategory,
} from "@/app/lib/badges";
import { PanelTitle } from "@/app/ui/panel-title";
import { LockClosedIcon } from "@heroicons/react/16/solid";
import { Button } from "@/app/ui/button/button";

interface BadgeStats {
  totalWins: number;
  maxStreak: number;
  winGuessCounts: Record<number, number>;
}

export interface SerializedBadge {
  id: string;
  category: string;
  milestone: number;
  tier: string;
  earnedAt: string;
  username: string | null;
  minted: boolean;
}

interface ProfileBadgesProps {
  stats: BadgeStats;
  dbBadges?: SerializedBadge[];
}

const TIER_COLORS: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-gray-400",
  gold: "text-yellow-500",
  platinum: "text-blue-300",
  diamond: "text-cyan-400",
};

/** Badge info augmented with optional DB id for shareable links */
interface DisplayBadge extends BadgeInfo {
  dbId?: string;
}

function BadgeCard({ badge }: { badge: DisplayBadge }) {
  const imageUrl = getBadgeImageUrl(badge.category, badge.milestone);
  const displayValue = formatBadgeValue(badge.milestone);

  if (!badge.earned) {
    return (
      <div className="flex flex-col items-center gap-1.5 opacity-40">
        <div className="relative w-full aspect-square rounded-xl bg-primary-900/5 border-2 border-dashed border-primary-900/15 flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-primary-900/25" />
        </div>
        <div className="text-sm font-medium text-primary-900/40 text-center">
          {displayValue}
        </div>
      </div>
    );
  }

  // Use badge UUID route if available, fall back to category/value route
  const badgePageUrl = badge.dbId
    ? `/app/badges/${badge.dbId}`
    : `/app/badges/${badge.category}/${badge.milestone}`;

  return (
    <a
      href={badgePageUrl}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${displayValue} ${BADGE_CATEGORIES[badge.category].label}`}
          className="w-full h-full"
        />
      </div>
      <div
        className={`text-sm font-semibold text-center capitalize ${TIER_COLORS[badge.tier] ?? ""}`}
      >
        {badge.tier}
      </div>
    </a>
  );
}

function CategorySection({
  category,
  badges,
  currentValue,
}: {
  category: BadgeCategory;
  badges: DisplayBadge[];
  currentValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = BADGE_CATEGORIES[category];
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  // Default: last 2 earned + 1 locked teaser
  const defaultVisible = [...earned.slice(-2), ...locked.slice(0, 1)];
  const visibleBadges = expanded ? badges : defaultVisible;
  const hasMore = badges.length > defaultVisible.length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <PanelTitle>{cat.label}</PanelTitle>
        <div className="text-xs text-primary-900/50">
          {currentValue.toLocaleString("en")} {cat.description.toLowerCase()}
        </div>
      </div>

      {earned.length === 0 ? (
        <div className="text-sm text-primary-900/40 py-4 text-center">
          No badges yet — {cat.description.toLowerCase()} to earn your first!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleBadges.map((badge) => (
              <BadgeCard key={badge.milestone} badge={badge} />
            ))}
          </div>
          {hasMore && (
            <Button
              onClick={() => setExpanded((v) => !v)}
              variant="outline"
              size="sm"
            >
              {expanded ? "Show less" : `Show all ${earned.length} badges`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function ProfileBadges({ stats, dbBadges }: ProfileBadgesProps) {
  // Build a lookup of DB badges by category+milestone
  const dbBadgeMap = new Map<string, SerializedBadge>();
  if (dbBadges) {
    for (const b of dbBadges) {
      dbBadgeMap.set(`${b.category}:${b.milestone}`, b);
    }
  }

  const values: Record<BadgeCategory, number> = {
    wins: stats.totalWins,
    streaks: stats.maxStreak,
    fourdle: stats.winGuessCounts[4] ?? 0,
    wordone: stats.winGuessCounts[1] ?? 0,
  };

  // For each category, merge DB badges (earned) with computed teasers (next unearned)
  const allCategories: BadgeCategory[] = ["wins", "streaks", "fourdle", "wordone"];
  const allBadges: Record<BadgeCategory, DisplayBadge[]> = {} as any;

  for (const cat of allCategories) {
    const computed = getBadgesForCategory(cat, values[cat]);
    allBadges[cat] = computed.map((b) => {
      const dbBadge = dbBadgeMap.get(`${b.category}:${b.milestone}`);
      return {
        ...b,
        // If in DB, it's earned; otherwise use computed earned status
        earned: dbBadge ? true : b.earned,
        dbId: dbBadge?.id,
      };
    });

    // Add any DB badges for milestones beyond what computed returns
    // (shouldn't happen normally, but defensive)
    if (dbBadges) {
      const computedMilestones = new Set(computed.map((b) => b.milestone));
      const extraDb = dbBadges
        .filter((b) => b.category === cat && !computedMilestones.has(b.milestone))
        .map((b) => ({
          category: cat,
          milestone: b.milestone,
          earned: true,
          tier: b.tier as any,
          dbId: b.id,
        }));
      if (extraDb.length > 0) {
        allBadges[cat] = [...extraDb, ...allBadges[cat]].sort(
          (a, b) => a.milestone - b.milestone,
        );
      }
    }
  }

  const totalEarned = Object.values(allBadges)
    .flat()
    .filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-primary-900/60">
          {totalEarned} badge{totalEarned !== 1 ? "s" : ""} earned
        </div>
      </div>

      {allCategories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          badges={allBadges[cat]}
          currentValue={values[cat]}
        />
      ))}
    </div>
  );
}
