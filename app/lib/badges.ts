// ─── Badge milestone generation ─────────────────────────────────────
// Milestones are generated dynamically — no fixed arrays.

export type BadgeCategory = "wins" | "streaks" | "fourdle" | "wordone" | "losses";

export const BADGE_CATEGORIES: Record<
  BadgeCategory,
  { label: string; description: string }
> = {
  wins: { label: "Victories", description: "Total games won" },
  streaks: { label: "Day Streak", description: "Consecutive days played" },
  fourdle: {
    label: "Fourdle Club",
    description: "Games won in exactly 4 guesses",
  },
  wordone: { label: "Word-in-One", description: "Games won in 1 guess" },
  losses: { label: "Battle Scars", description: "Total games lost" },
};

// ─── Milestone generators ───────────────────────────────────────────

const WINS_EARLY = [1, 10, 25];
// After 25, every 25: 50, 75, 100, ...

const STREAKS_EARLY = [7, 14, 25];
// After 25, every 25: 50, 75, ... plus yearly milestones (365n)

const FOURDLE_EARLY = [4, 14, 24, 44];
// After 44, every 20 (ending in 4): 64, 84, 104, ...

const WORDONE_EARLY = [1, 5, 10, 25];
// After 25, every 25: 50, 75, 100, ...

const LOSSES_EARLY = [1, 5, 10, 25];
// After 25, every 25: 50, 75, 100, ...

function generateWinsMilestones(upTo: number): number[] {
  const ms = [...WINS_EARLY];
  let v = 50;
  while (v <= upTo) {
    ms.push(v);
    v += 25;
  }
  return ms;
}

function generateStreaksMilestones(upTo: number): number[] {
  const set = new Set(STREAKS_EARLY);
  // Regular 25-step milestones
  let v = 50;
  while (v <= upTo) {
    set.add(v);
    v += 25;
  }
  // Yearly milestones
  for (let y = 1; y * 365 <= upTo; y++) {
    set.add(y * 365);
  }
  return [...set].sort((a, b) => a - b);
}

function generateFourdleMilestones(upTo: number): number[] {
  const ms = [...FOURDLE_EARLY];
  let v = 64; // 44 + 20
  while (v <= upTo) {
    ms.push(v);
    v += 20;
  }
  return ms;
}

function generateWordoneMilestones(upTo: number): number[] {
  const ms = [...WORDONE_EARLY];
  let v = 50;
  while (v <= upTo) {
    ms.push(v);
    v += 25;
  }
  return ms;
}

function generateLossesMilestones(upTo: number): number[] {
  const ms = [...LOSSES_EARLY];
  let v = 50;
  while (v <= upTo) {
    ms.push(v);
    v += 25;
  }
  return ms;
}

const generators: Record<BadgeCategory, (upTo: number) => number[]> = {
  wins: generateWinsMilestones,
  streaks: generateStreaksMilestones,
  fourdle: generateFourdleMilestones,
  wordone: generateWordoneMilestones,
  losses: generateLossesMilestones,
};

// ─── Public API ─────────────────────────────────────────────────────

export interface BadgeInfo {
  category: BadgeCategory;
  milestone: number;
  earned: boolean;
  tier: BadgeTier;
}

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export function getTier(category: BadgeCategory, value: number): BadgeTier {
  switch (category) {
    case "wins":
      if (value >= 5000) return "diamond";
      if (value >= 1000) return "platinum";
      if (value >= 250) return "gold";
      if (value >= 50) return "silver";
      return "bronze";
    case "streaks":
      if (value >= 1460) return "diamond";
      if (value >= 500) return "platinum";
      if (value >= 250) return "gold";
      if (value >= 50) return "silver";
      return "bronze";
    case "fourdle":
      if (value >= 1444) return "diamond";
      if (value >= 444) return "platinum";
      if (value >= 144) return "gold";
      if (value >= 44) return "silver";
      return "bronze";
    case "wordone":
      if (value >= 50) return "diamond";
      if (value >= 25) return "platinum";
      if (value >= 10) return "gold";
      if (value >= 5) return "silver";
      return "bronze";
    case "losses":
      if (value >= 100) return "diamond";
      if (value >= 50) return "platinum";
      if (value >= 25) return "gold";
      if (value >= 10) return "silver";
      return "bronze";
  }
}

/**
 * Returns all earned badges + the next unearned milestone (teaser) for a category.
 */
export function getBadgesForCategory(
  category: BadgeCategory,
  currentValue: number,
): BadgeInfo[] {
  // Generate milestones up to currentValue + generous headroom for the "next" teaser
  const headroom =
    category === "fourdle" ? 20 : category === "streaks" ? 365 : 25; // losses uses 25 (default)
  const milestones = generators[category](currentValue + headroom);

  const badges: BadgeInfo[] = [];
  let addedTeaser = false;

  for (const m of milestones) {
    const earned = currentValue >= m;
    badges.push({
      category,
      milestone: m,
      earned,
      tier: getTier(category, m),
    });
    if (!earned && !addedTeaser) {
      addedTeaser = true;
      break; // only include one unearned (the next teaser)
    }
  }

  // If all milestones earned, generate the next one
  if (!addedTeaser && milestones.length > 0) {
    const nextMilestones = generators[category](
      currentValue + headroom * 10,
    );
    const next = nextMilestones.find((m) => m > currentValue);
    if (next) {
      badges.push({
        category,
        milestone: next,
        earned: false,
        tier: getTier(category, next),
      });
    }
  }

  return badges;
}

/**
 * Returns all badges across all categories for a user's stats.
 */
export function getAllBadges(stats: {
  totalWins: number;
  totalLosses: number;
  maxStreak: number;
  winGuessCounts: Record<number, number>;
}): Record<BadgeCategory, BadgeInfo[]> {
  return {
    wins: getBadgesForCategory("wins", stats.totalWins),
    streaks: getBadgesForCategory("streaks", stats.maxStreak),
    fourdle: getBadgesForCategory("fourdle", stats.winGuessCounts[4] ?? 0),
    wordone: getBadgesForCategory("wordone", stats.winGuessCounts[1] ?? 0),
    losses: getBadgesForCategory("losses", stats.totalLosses),
  };
}

/**
 * Format a badge value for display (with commas for large numbers).
 */
export function formatBadgeValue(value: number): string {
  return value >= 1000 ? value.toLocaleString("en-US") : String(value);
}

/**
 * Get the badge image URL.
 */
export function getBadgeImageUrl(
  category: BadgeCategory,
  value: number,
  username?: string | null,
): string {
  const base = `/api/images/badge?cat=${category}&value=${value}`;
  if (username) {
    return `${base}&username=${encodeURIComponent(username)}`;
  }
  return base;
}
