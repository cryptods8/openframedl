"use client";

import { useState } from "react";
import {
  getAllBadges,
  BadgeInfo,
  BadgeCategory,
  BADGE_CATEGORIES,
  formatBadgeValue,
  getBadgeImageUrl,
} from "@/app/lib/badges";
import { PanelTitle } from "@/app/ui/panel-title";
import { LockClosedIcon } from "@heroicons/react/16/solid";
import { Button } from "@/app/ui/button/button";

interface BadgeStats {
  totalWins: number;
  maxStreak: number;
  winGuessCounts: Record<number, number>;
}

interface ProfileBadgesProps {
  stats: BadgeStats;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-gray-400",
  gold: "text-yellow-500",
  platinum: "text-blue-300",
  diamond: "text-cyan-400",
};

function BadgeCard({ badge }: { badge: BadgeInfo }) {
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

  const badgePageUrl = `/app/badges/${badge.category}/${badge.milestone}`;

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
  badges: BadgeInfo[];
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

export function ProfileBadges({ stats }: ProfileBadgesProps) {
  const allBadges = getAllBadges(stats);
  const values: Record<BadgeCategory, number> = {
    wins: stats.totalWins,
    streaks: stats.maxStreak,
    fourdle: stats.winGuessCounts[4] ?? 0,
    wordone: stats.winGuessCounts[1] ?? 0,
  };

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

      {(Object.keys(allBadges) as BadgeCategory[]).map((cat) => (
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
