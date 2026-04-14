"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CollectAllButton } from "@/app/ui/collect-all-button";

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
  seen: boolean;
}

interface ProfileBadgesProps {
  stats: BadgeStats;
  dbBadges?: SerializedBadge[];
  username?: string | null;
  canCollect?: boolean;
}

const ALL_CATEGORIES: BadgeCategory[] = [
  "wins",
  "streaks",
  "fourdle",
  "wordone",
  "losses",
];

function BadgeCard({
  badge,
  onClick,
  canCollect,
  currentValue,
}: {
  badge: DisplayBadge;
  onClick?: () => void;
  canCollect?: boolean;
  currentValue?: number;
}) {
  const imageUrl = getBadgeImageUrl(
    badge.category,
    badge.milestone,
    badge.username,
  );
  const displayValue = formatBadgeValue(badge.milestone);
  const categoryLabel = BADGE_CATEGORIES[badge.category].label;

  if (!badge.earned) {
    const progress =
      currentValue != null ? Math.min(currentValue / badge.milestone, 1) : 0;
    return (
      <div
        className="flex flex-col items-center gap-1.5"
        aria-label={`${displayValue} ${categoryLabel} — locked`}
      >
        <div className="relative w-full aspect-square rounded-lg bg-primary-900/5 border-2 border-dashed border-primary-900/15 flex flex-col items-center justify-center gap-2 p-3">
          <LockClosedIcon
            aria-hidden="true"
            className="w-6 h-6 text-primary-900/30"
          />
          <div className="text-sm font-semibold text-primary-900/60 tabular-nums text-center leading-none">
            {displayValue}
          </div>
          {currentValue != null && (
            <div className="w-full max-w-[85%] flex flex-col items-center gap-1">
              <div
                className="w-full h-1.5 rounded-full bg-primary-900/10 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={badge.milestone}
                aria-valuenow={currentValue}
              >
                <div
                  className="h-full rounded-full bg-primary-900/30 motion-safe:transition-[width] duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-primary-900/50 tabular-nums leading-none">
                {currentValue.toLocaleString()} / {displayValue}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stateSuffix = badge.minted
    ? ", collected"
    : canCollect
      ? ", tap to collect"
      : "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${displayValue} ${categoryLabel}${stateSuffix}`}
      className="group relative flex flex-col items-center gap-1.5 rounded-lg text-left w-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-sm motion-safe:transition-shadow group-hover:shadow-md group-active:shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="w-full h-full"
        />
        {badge.seen === false && (
          <span className="absolute top-1.5 left-1.5 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-amber-900 rounded-full leading-none shadow-sm">
            New
          </span>
        )}
        {canCollect && (
          <div
            className={cn(
              "absolute flex pointer-events-none",
              badge.minted
                ? "top-1.5 right-1.5"
                : "bottom-1.5 left-1.5 right-1.5 justify-center",
            )}
            aria-hidden="true"
          >
            {badge.minted ? (
              <CheckCircleIcon className="w-6 h-6 text-green-500 drop-shadow bg-green-900 rounded-full" />
            ) : (
              <span className="flex items-center justify-center gap-1 bg-white/95 text-primary-900 font-semibold text-xs rounded-md px-2 py-1 shadow-sm">
                <PlusCircleIcon className="w-4 h-4" />
                Collect
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function CategorySection({
  category,
  badges,
  currentValue,
  onBadgeClick,
  canCollect,
}: {
  category: BadgeCategory;
  badges: DisplayBadge[];
  currentValue: number;
  onBadgeClick: (badge: DisplayBadge) => void;
  canCollect?: boolean;
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
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 min-w-0">
          <PanelTitle>{cat.label}</PanelTitle>
          {earned.length > 0 && (
            <span className="text-xs text-primary-900/50 tabular-nums shrink-0">
              {earned.length}
            </span>
          )}
        </div>
        <div className="text-xs text-primary-900/50 tabular-nums">
          {currentValue.toLocaleString()} {cat.description.toLowerCase()}
        </div>
      </div>

      {earned.length === 0 ? (
        <div className="text-sm text-primary-900/40 py-4 text-center">
          No badges yet — keep playing to earn your first!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
            {visibleBadges.map((badge) => (
              <BadgeCard
                key={`${badge.category}-${badge.milestone}`}
                badge={badge}
                onClick={badge.earned ? () => onBadgeClick(badge) : undefined}
                canCollect={canCollect}
                currentValue={!badge.earned ? currentValue : undefined}
              />
            ))}
          </div>
          {hasMore && (
            <Button
              onClick={() => setExpanded((v) => !v)}
              variant="outline"
              size="sm"
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : `Show all ${earned.length} badges`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export function ProfileBadges({
  stats,
  dbBadges,
  username,
  canCollect,
}: ProfileBadgesProps) {
  const router = useRouter();
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);

  const handleCollected = useCallback(() => {
    router.refresh();
  }, [router]);

  const values = useMemo<Record<BadgeCategory, number>>(
    () => ({
      wins: stats.totalWins,
      streaks: stats.maxStreak,
      fourdle: stats.winGuessCounts[4] ?? 0,
      wordone: stats.winGuessCounts[1] ?? 0,
      losses: stats.totalLosses,
    }),
    [stats],
  );

  const allBadges = useMemo(() => {
    const dbBadgeMap = new Map<string, SerializedBadge>();
    if (dbBadges) {
      for (const b of dbBadges) {
        dbBadgeMap.set(`${b.category}:${b.milestone}`, b);
      }
    }

    const out = {} as Record<BadgeCategory, DisplayBadge[]>;
    for (const cat of ALL_CATEGORIES) {
      const computed = getBadgesForCategory(cat, values[cat]);
      out[cat] = computed.map((b) => {
        const dbBadge = dbBadgeMap.get(`${b.category}:${b.milestone}`);
        return {
          ...b,
          username,
          earned: dbBadge ? true : b.earned,
          dbId: dbBadge?.id,
          minted: dbBadge?.minted ?? false,
          earnedAt: dbBadge?.earnedAt,
          seen: dbBadge?.seen,
        };
      });

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
            username,
            dbId: b.id,
            minted: b.minted,
            earnedAt: b.earnedAt,
            seen: b.seen,
          }));
        if (extraDb.length > 0) {
          out[cat] = [...extraDb, ...out[cat]].sort(
            (a, b) => a.milestone - b.milestone,
          );
        }
      }
    }
    return out;
  }, [values, dbBadges, username]);

  const { totalEarned, totalCollected, uncollected, unseenKey } =
    useMemo(() => {
      const flat = Object.values(allBadges).flat();
      const earned = flat.filter((b) => b.earned);
      const unseen = earned
        .filter((b) => b.seen === false && b.dbId)
        .map((b) => b.dbId!);
      return {
        totalEarned: earned.length,
        totalCollected: flat.filter((b) => b.minted).length,
        uncollected: earned.filter((b) => !b.minted),
        unseenKey: unseen.join(","),
      };
    }, [allBadges]);

  useEffect(() => {
    if (!unseenKey) return;
    fetch("/api/badges/mark-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeIds: unseenKey.split(",") }),
    }).catch(() => {});
  }, [unseenKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-primary-900/60 tabular-nums">
          <span className="font-semibold text-primary-900">{totalEarned}</span>{" "}
          earned ·{" "}
          <span className="font-semibold text-primary-900">
            {totalCollected}
          </span>{" "}
          collected
        </div>
        {canCollect && uncollected.length > 1 && (
          <CollectAllButton
            badges={uncollected.map((b) => ({
              category: b.category,
              milestone: b.milestone,
            }))}
            onComplete={handleCollected}
          />
        )}
      </div>

      {ALL_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          badges={allBadges[cat]}
          currentValue={values[cat]}
          onBadgeClick={setSelectedBadge}
          canCollect={canCollect}
        />
      ))}

      <BadgeDetailDialog
        badge={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        onCollected={handleCollected}
        canCollect={canCollect}
      />
    </div>
  );
}
