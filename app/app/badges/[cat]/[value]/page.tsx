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

const VALID_CATEGORIES = new Set<string>(["wins", "streaks", "fourdle", "wordone"]);

interface BadgePageProps {
  params: Promise<{ cat: string; value: string }>;
}

export async function generateMetadata({
  params,
}: BadgePageProps): Promise<Metadata> {
  const { cat, value: valueStr } = await params;
  if (!VALID_CATEGORIES.has(cat)) return {};

  const value = parseInt(valueStr, 10);
  if (isNaN(value) || value < 1) return {};

  const category = cat as BadgeCategory;
  const catInfo = BADGE_CATEGORIES[category];
  const tier = getTier(category, value);
  const displayValue = formatBadgeValue(value);
  const title = `${displayValue} ${catInfo.label} — Framedl Badge`;
  const description = `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier achievement: ${displayValue} ${catInfo.label.toLowerCase()} in Framedl`;
  const imageUrl = `${externalBaseUrl}${getBadgeImageUrl(category, value)}&format=png`;

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
  const { cat, value: valueStr } = await params;

  if (!VALID_CATEGORIES.has(cat)) notFound();
  const value = parseInt(valueStr, 10);
  if (isNaN(value) || value < 1) notFound();

  const category = cat as BadgeCategory;
  const catInfo = BADGE_CATEGORIES[category];
  const tier = getTier(category, value);
  const displayValue = formatBadgeValue(value);
  const svgUrl = getBadgeImageUrl(category, value);
  const shareUrl = `${externalBaseUrl}/app/badges/${category}/${value}`;

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
          <p className="text-sm text-primary-900/60 capitalize">{tier} tier</p>
        </div>

        {/* Share button */}
        <BadgePageClient shareUrl={shareUrl} />
      </div>
    </div>
  );
}
