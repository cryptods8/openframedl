import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { lightColor } from "@/app/image-ui/image-utils";
import { isPro } from "@/app/constants";
import { fonts } from "@/app/generate-image";
import React from "react";
import {
  BadgeTier as TierName,
  BadgeCategory as CategoryId,
  getTier,
} from "@/app/lib/badges";
import {
  TIERS,
  CATEGORIES,
  BadgeCard,
  BADGE_SIZE,
  CARD_MARGIN,
} from "@/app/image-ui/badge-elements";

export const dynamic = "force-dynamic";

function BadgeElement({
  category,
  tier,
  numberText,
  username,
}: {
  category: CategoryId;
  tier: TierName;
  numberText: string;
  username?: string | null;
}) {
  const t = TIERS[tier];

  return (
    <div
      style={{
        display: "flex",
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        position: "relative",
        background:
          "linear-gradient(135deg, #0a3a0a 0%, #041a08 55%, #010c04 100%)",
        fontFamily: "SpaceGrotesk",
      }}
    >
      {/* Tier-colored halo behind the badge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse 50% 55% at 50% 52%, ${t.fill}33 0%, transparent 65%)`,
          display: "flex",
        }}
      />

      {/* Top brand eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 42,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: t.fill,
            opacity: 0.85,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "SpaceGrotesk",
            fontSize: 28,
            fontWeight: 700,
            color: lightColor(0.65),
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {isPro ? "Framedl Pro" : "Framedl"}
        </div>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: t.fill,
            opacity: 0.85,
            display: "flex",
          }}
        />
      </div>

      {/* Badge — full-canvas BadgeCard */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          display: "flex",
        }}
      >
        <BadgeCard
          category={category}
          tier={tier}
          numberText={numberText}
          cardShadow="0 16px 48px rgba(0,0,0,0.55)"
        />
      </div>

      {/* Bottom attribution — centered within the card-bottom margin */}
      {username && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: CARD_MARGIN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: 34,
              color: lightColor(0.92),
              lineHeight: 1,
            }}
          >
            @{username}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const category = params.get("cat") as CategoryId | null;
  const valueStr = params.get("value");
  const username = params.get("username");

  if (!category || !valueStr || !CATEGORIES[category]) {
    return NextResponse.json(
      { error: "Use ?cat=wins|streaks|fourdle|wordone|losses&value=100" },
      { status: 400 },
    );
  }

  const value = parseInt(valueStr, 10);
  if (isNaN(value) || value < 1) {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const tier = getTier(category, value);
  const numberText =
    value >= 1000 ? value.toLocaleString("en-US") : String(value);

  const format = params.get("format");

  const svg = await satori(
    <BadgeElement
      category={category}
      tier={tier}
      numberText={numberText}
      username={username}
    />,
    { width: BADGE_SIZE, height: BADGE_SIZE, fonts },
  );

  if (format === "png") {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    //@ts-ignore
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
