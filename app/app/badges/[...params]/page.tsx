import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfilePageWrapper } from "@/app/app/profile/profile-page-wrapper";
import { externalBaseUrl, isPro } from "@/app/constants";
import {
  BadgeCategory,
  BadgeTier,
  BADGE_CATEGORIES,
  getTier,
  formatBadgeValue,
  getBadgeImageUrl,
} from "@/app/lib/badges";
import { BadgePageClient } from "./badge-page-client";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";
import { MiniAppEmbedNext } from "@farcaster/miniapp-node";

const TIER_STYLES: Record<
  BadgeTier,
  { ring: string; text: string; dot: string; halo: string }
> = {
  bronze: {
    ring: "from-amber-500/40 via-amber-300/20 to-amber-700/40",
    text: "text-amber-700",
    dot: "bg-amber-600",
    halo: "bg-amber-500/10",
  },
  silver: {
    ring: "from-slate-300/50 via-slate-100/30 to-slate-400/50",
    text: "text-slate-500",
    dot: "bg-slate-400",
    halo: "bg-slate-400/10",
  },
  gold: {
    ring: "from-yellow-400/50 via-yellow-200/30 to-yellow-500/50",
    text: "text-yellow-600",
    dot: "bg-yellow-500",
    halo: "bg-yellow-400/10",
  },
  platinum: {
    ring: "from-blue-300/50 via-sky-200/30 to-blue-400/50",
    text: "text-blue-500",
    dot: "bg-blue-400",
    halo: "bg-blue-300/10",
  },
  diamond: {
    ring: "from-cyan-300/60 via-fuchsia-200/30 to-cyan-400/60",
    text: "text-cyan-500",
    dot: "bg-cyan-400",
    halo: "bg-cyan-300/15",
  },
};

const VALID_CATEGORIES = new Set<string>(["wins", "streaks", "fourdle", "wordone", "losses"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BadgePageProps {
  params: Promise<{ params: string[] }>;
}

type BadgeData = {
  id?: string;
  category: BadgeCategory;
  milestone: number;
  tier: string;
  username?: string | null;
  earnedAt?: Date;
  minted?: boolean;
  userId?: string;
  identityProvider?: string;
};

async function resolveBadge(segments: string[]): Promise<BadgeData | null> {
  // /app/badges/<uuid>
  if (segments.length === 1 && UUID_RE.test(segments[0]!)) {
    const badge = await badgeRepo.findById(segments[0]!);
    if (!badge) return null;
    const category = badge.category as BadgeCategory;
    if (!BADGE_CATEGORIES[category]) return null;
    return {
      id: badge.id,
      category,
      milestone: badge.milestone,
      tier: badge.tier,
      username: badge.username,
      earnedAt: badge.earnedAt,
      minted: badge.minted,
      userId: badge.userId,
      identityProvider: badge.identityProvider,
    };
  }

  // /app/badges/<cat>/<value>
  if (segments.length === 2) {
    const [cat, valueStr] = segments;
    if (!VALID_CATEGORIES.has(cat!)) return null;
    const value = parseInt(valueStr!, 10);
    if (isNaN(value) || value < 1) return null;
    const category = cat as BadgeCategory;
    return {
      category,
      milestone: value,
      tier: getTier(category, value),
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: BadgePageProps): Promise<Metadata> {
  const { params: segments } = await params;
  const badge = await resolveBadge(segments);
  if (!badge) return {};

  const catInfo = BADGE_CATEGORIES[badge.category];
  const displayValue = formatBadgeValue(badge.milestone);
  const usernameLabel = badge.username ? ` — ${badge.username}` : "";
  const title = `${displayValue} ${catInfo.label}${usernameLabel} — Framedl Badge`;
  const description = `${badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)} tier achievement: ${displayValue} ${catInfo.label.toLowerCase()} in Framedl`;

  const ogParams = new URLSearchParams({
    cat: badge.category,
    value: String(badge.milestone),
  });
  if (badge.username) {
    ogParams.set("username", badge.username);
  }
  const ogImageUrl = `${externalBaseUrl}/api/images/badge-og?${ogParams}`;
  const miniAppImageUrl = `${externalBaseUrl}/api/images/badge-og?${ogParams}&aspectRatio=3:2`;

  const badgePath = segments.join("/");
  const name = isPro ? "Framedl PRO" : "Framedl";
  const miniAppConfig: MiniAppEmbedNext = {
    version: "next",
    imageUrl: miniAppImageUrl,
    button: {
      title: "View Badge",
      action: {
        type: "launch_miniapp",
        name,
        url: `${externalBaseUrl}/app/badges/${badgePath}`,
        splashImageUrl: isPro
          ? `${externalBaseUrl}/splash-pro.png`
          : `${externalBaseUrl}/splash-v2.png`,
        splashBackgroundColor: "#f3f0f9",
      },
    },
  };
  const miniAppMetadata = JSON.stringify(miniAppConfig);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      "fc:frame": miniAppMetadata,
      "fc:miniapp": miniAppMetadata,
    },
  };
}

export default async function BadgePage({ params }: BadgePageProps) {
  const { params: segments } = await params;

  const session = await getFarcasterSession();

  const badge = await resolveBadge(segments);
  if (!badge) notFound();

  const catInfo = BADGE_CATEGORIES[badge.category];
  const displayValue = formatBadgeValue(badge.milestone);
  const svgUrl = getBadgeImageUrl(badge.category, badge.milestone);

  // For UUID badges, share by ID; for legacy routes, share by cat/value
  const shareUrl = badge.id
    ? `${externalBaseUrl}/app/badges/${badge.id}`
    : `${externalBaseUrl}/app/badges/${badge.category}/${badge.milestone}`;

  // Check if current user owns this badge (for mint button)
  let isOwner = false;
  if (badge.id && badge.userId) {
    if (
      session?.user?.fid &&
      session.user.fid === badge.userId &&
      badge.identityProvider === "fc"
    ) {
      isOwner = true;
    }
  }

  const canMint = isOwner && !!badge.id && !badge.minted;
  const tierStyle = TIER_STYLES[badge.tier as BadgeTier] ?? TIER_STYLES.bronze;
  const isLoggedIn = Boolean(session?.user?.fid);
  const earnedDate = badge.earnedAt
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(badge.earnedAt))
    : null;

  return (
    <ProfilePageWrapper>
    <main className="relative flex flex-col items-center p-4 sm:p-8 overflow-hidden">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-[60vh] blur-3xl opacity-60 ${tierStyle.halo}`}
      />
      <div className="relative w-full max-w-md space-y-6">
        <div
          className={`relative rounded-[1.75rem] p-[2px] bg-gradient-to-br ${tierStyle.ring} shadow-xl`}
        >
          <div className="w-full aspect-square rounded-[1.625rem] overflow-hidden bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={svgUrl}
              alt={`${displayValue} ${catInfo.label} badge`}
              width={800}
              height={800}
              className="w-full h-full"
            />
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-white/80 backdrop-blur ring-1 ring-primary-900/10 ${tierStyle.text}`}
            >
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${tierStyle.dot}`}
              />
              {badge.tier} Tier
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-space font-bold text-balance text-primary-900">
            <span className="tabular-nums">{displayValue}</span>{" "}
            {catInfo.label}
          </h1>
          <p className="text-sm text-primary-900/60 text-pretty">
            {catInfo.description}
          </p>

          {(badge.username || earnedDate) && (
            <div className="pt-1 text-sm text-primary-900/60 space-y-0.5">
              {badge.username && (
                <p>
                  Earned by{" "}
                  <span className="font-medium text-primary-900/80" translate="no">
                    {badge.username}
                  </span>
                </p>
              )}
              {earnedDate && (
                <p className="text-xs text-primary-900/45 tabular-nums">
                  <time dateTime={new Date(badge.earnedAt!).toISOString()}>
                    {earnedDate}
                  </time>
                </p>
              )}
            </div>
          )}
        </div>

        <BadgePageClient
          shareUrl={shareUrl}
          category={badge.category}
          milestone={badge.milestone}
          canMint={canMint}
          minted={badge.minted}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </main>
    </ProfilePageWrapper>
  );
}
