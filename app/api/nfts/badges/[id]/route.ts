import { externalBaseUrl } from "@/app/constants";
import { BADGE_CATEGORIES, BadgeCategory, getTier } from "@/app/lib/badges";
import * as badgeRepo from "@/app/game/badge-pg-repository";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const badge = await badgeRepo.findById(id);
  if (!badge) {
    return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  }

  const category = badge.category as BadgeCategory;
  const catInfo = BADGE_CATEGORIES[category];
  if (!catInfo) {
    return NextResponse.json({ error: "Invalid badge category" }, { status: 404 });
  }

  const tier = getTier(category, badge.milestone);
  const displayValue = badge.milestone >= 1000
    ? badge.milestone.toLocaleString("en-US")
    : String(badge.milestone);

  const imageParams = new URLSearchParams({
    cat: category,
    value: String(badge.milestone),
    format: "png",
  });
  if (badge.username) {
    imageParams.set("username", badge.username);
  }

  const metadata = {
    name: `${displayValue} ${catInfo.label}${badge.username ? ` — ${badge.username}` : ""}`,
    description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier achievement: ${displayValue} ${catInfo.label.toLowerCase()} in Framedl.${badge.username ? ` Earned by ${badge.username}.` : ""}`,
    image: `${externalBaseUrl}/api/images/badge?${imageParams}`,
    external_url: `${externalBaseUrl}/app/badges/${badge.id}`,
    attributes: [
      { trait_type: "Category", value: catInfo.label },
      { trait_type: "Milestone", value: badge.milestone },
      { trait_type: "Tier", value: tier.charAt(0).toUpperCase() + tier.slice(1) },
      ...(badge.username ? [{ trait_type: "Player", value: badge.username }] : []),
      { trait_type: "Earned", value: new Date(badge.earnedAt).toISOString().split("T")[0] },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
