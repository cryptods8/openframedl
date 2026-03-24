import { Metadata } from "next";
import { notFound } from "next/navigation";
import { externalBaseUrl } from "@/app/constants";
import {
  BadgeCategory,
  BADGE_CATEGORIES,
  getTier,
  formatBadgeValue,
  getBadgeImageUrl,
} from "@/app/lib/badges";
import { BadgePageClient } from "./badge-page-client";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { getFarcasterSession } from "@/app/lib/auth";

const VALID_CATEGORIES = new Set<string>(["wins", "streaks", "fourdle", "wordone"]);
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

  const imageParams = new URLSearchParams({
    cat: badge.category,
    value: String(badge.milestone),
    format: "png",
  });
  if (badge.username) {
    imageParams.set("username", badge.username);
  }
  const imageUrl = `${externalBaseUrl}/api/images/badge?${imageParams}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1024,
          height: 1024,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BadgePage({ params }: BadgePageProps) {
  const { params: segments } = await params;

  // TODO: remove gate once badges are released to all users
  const session = await getFarcasterSession();
  if (session?.user?.fid !== "11124") notFound();

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

  const canMint = isOwner && badge.id && !badge.minted;

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Badge image */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgUrl}
            alt={`${displayValue} ${catInfo.label}`}
            className="w-full h-full"
          />
        </div>

        {/* Badge info */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-space font-bold">
            {displayValue} {catInfo.label}
          </h1>
          <p className="text-sm text-primary-900/60 capitalize">{badge.tier} tier</p>
          {badge.username && (
            <p className="text-sm text-primary-900/50">
              Earned by {badge.username}
            </p>
          )}
          {badge.earnedAt && (
            <p className="text-xs text-primary-900/40">
              {new Date(badge.earnedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Actions */}
        <BadgePageClient
          shareUrl={shareUrl}
          category={badge.category}
          milestone={badge.milestone}
          canMint={isOwner && !badge.minted}
          minted={badge.minted}
        />
      </div>
    </div>
  );
}
