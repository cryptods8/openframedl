"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCategory,
  BADGE_CATEGORIES,
  formatBadgeValue,
  getBadgeImageUrl,
  getBadgesForCategory,
  BadgeTier,
} from "@/app/lib/badges";
import { PanelTitle } from "@/app/ui/panel-title";
import {
  LockClosedIcon,
  PlusCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/16/solid";
import { Button } from "@/app/ui/button/button";
import { cn } from "@/app/utils";
import { BadgeDetailDialog, DisplayBadge } from "@/app/ui/badge-detail-dialog";

interface BadgeStats {
  totalWins: number;
  totalLosses: number;
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
  username?: string | null;
}

function BadgeCard({
  badge,
  onClick,
}: {
  badge: DisplayBadge;
  onClick?: () => void;
}) {
  const imageUrl = getBadgeImageUrl(
    badge.category,
    badge.milestone,
    badge.username,
  );
  const displayValue = formatBadgeValue(badge.milestone);

  if (!badge.earned) {
    return (
      <div className="flex flex-col items-center gap-1.5 opacity-40">
        <div className="relative w-full aspect-square rounded-lg bg-primary-900/5 border-2 border-dashed border-primary-900/15 flex flex-col items-center justify-center gap-2">
          <LockClosedIcon className="w-8 h-8 text-primary-900/25" />
          <div className="text-sm font-medium text-primary-900/50 text-center">
            {displayValue}
          </div>
        </div>
        {/* <div className="text-sm font-medium text-primary-900/50 capitalize text-center">
          {badge.tier}
        </div> */}
      </div>
    );
  }

  return (
    <div
      role="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group cursor-pointer text-left w-full"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${displayValue} ${BADGE_CATEGORIES[badge.category].label}`}
          className="w-full h-full"
        />
        <div
          className={cn(
            "absolute right-0 left-0 flex",
            badge.minted
              ? "top-0 p-1.5 justify-end"
              : "bottom-0 p-0.5 justify-center items-center",
          )}
          title={badge.minted ? "Collected as NFT" : "Tap to collect as NFT"}
        >
          {badge.minted ? (
            <CheckCircleIcon className="w-6 h-6 text-green-500 drop-shadow bg-green-900 rounded-full" />
          ) : (
            <Button variant="secondary" size="sm">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Collect</span>
            </Button>
          )}
        </div>
      </div>
      {/* <div
        className={`text-sm font-semibold text-center capitalize ${TIER_COLORS[badge.tier] ?? ""}`}
      >
        {badge.tier}
      </div> */}
    </div>
  );
}

function CategorySection({
  category,
  badges,
  currentValue,
  onBadgeClick,
}: {
  category: BadgeCategory;
  badges: DisplayBadge[];
  currentValue: number;
  onBadgeClick: (badge: DisplayBadge) => void;
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
          No badges yet — keep playing to earn your first!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleBadges.map((badge) => (
              <BadgeCard
                key={badge.milestone}
                badge={badge}
                onClick={badge.earned ? () => onBadgeClick(badge) : undefined}
              />
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

export function ProfileBadges({
  stats,
  dbBadges,
  username,
}: ProfileBadgesProps) {
  const router = useRouter();
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);

  const handleCollected = useCallback(() => {
    router.refresh();
  }, [router]);

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
    losses: stats.totalLosses,
  };

  // For each category, merge DB badges (earned) with computed teasers (next unearned)
  const allCategories: BadgeCategory[] = [
    "wins",
    "streaks",
    "fourdle",
    "wordone",
    "losses",
  ];
  const allBadges: Record<BadgeCategory, DisplayBadge[]> = {} as any;

  for (const cat of allCategories) {
    const computed = getBadgesForCategory(cat, values[cat]);
    allBadges[cat] = computed.map((b) => {
      const dbBadge = dbBadgeMap.get(`${b.category}:${b.milestone}`);
      return {
        ...b,
        username,
        earned: dbBadge ? true : b.earned,
        dbId: dbBadge?.id,
        minted: dbBadge?.minted ?? false,
        earnedAt: dbBadge?.earnedAt,
      };
    });

    // Add any DB badges for milestones beyond what computed returns
    if (dbBadges) {
      const computedMilestones = new Set(computed.map((b) => b.milestone));
      const extraDb = dbBadges
        .filter(
          (b) => b.category === cat && !computedMilestones.has(b.milestone),
        )
        .map((b) => ({
          category: cat,
          milestone: b.milestone,
          earned: true,
          tier: b.tier as BadgeTier,
          username: b.username,
          dbId: b.id,
          minted: b.minted,
          earnedAt: b.earnedAt,
        }));
      if (extraDb.length > 0) {
        allBadges[cat] = [...extraDb, ...allBadges[cat]].sort(
          (a, b) => a.milestone - b.milestone,
        );
      }
    }
  }

  const allFlat = Object.values(allBadges).flat();
  const totalEarned = allFlat.filter((b) => b.earned).length;
  const totalCollected = allFlat.filter((b) => b.minted).length;

  return (
    <div className="space-y-6">
      <div className="text-sm text-primary-900/60">
        {totalEarned} earned · {totalCollected} collected
      </div>

      {allCategories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          badges={allBadges[cat]}
          currentValue={values[cat]}
          onBadgeClick={setSelectedBadge}
        />
      ))}

      <BadgeDetailDialog
        badge={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        onCollected={handleCollected}
      />
    </div>
  );
}
