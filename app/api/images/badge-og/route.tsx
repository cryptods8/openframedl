import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { lightColor } from "@/app/image-ui/image-utils";
import { isPro } from "@/app/constants";
import { fonts } from "@/app/generate-image";
import React from "react";
import {
  BadgeCategory,
  BadgeTier,
  getTier,
  BADGE_CATEGORIES,
} from "@/app/lib/badges";
import {
  TIERS,
  CATEGORIES,
  BadgeCard,
  BADGE_SIZE,
} from "@/app/image-ui/badge-elements";

export const dynamic = "force-dynamic";

const ASPECT_RATIOS: Record<string, { w: number; h: number }> = {
  "1.91:1": { w: 1200, h: 630 },
  "3:2": { w: 1200, h: 800 },
};

function BadgeOGImage({
  category,
  tier,
  numberText,
  username,
  width,
  height,
}: {
  category: BadgeCategory;
  tier: BadgeTier;
  numberText: string;
  username?: string | null;
  width: number;
  height: number;
}) {
  const t = TIERS[tier];
  const cat = CATEGORIES[category];

  // Scale the badge to fit the height with padding.
  // Use a wrapper sized to the display dimensions so satori clips correctly
  // (satori clips on layout bounds, not post-transform visual bounds).
  const padding = 40;
  const badgeScale = Math.min(0.52, (height - padding * 2) / BADGE_SIZE);
  const badgeDisplaySize = Math.round(BADGE_SIZE * badgeScale);
  const textLeft = padding + badgeDisplaySize + 48;

  return (
    <div
      style={{
        display: "flex",
        width: width,
        height: height,
        position: "relative",
        background:
          "radial-gradient(circle at 30% 50%, #008000 0%, #002b00 100%)",
        fontFamily: "SpaceGrotesk",
      }}
    >
      {/* Subtle radial highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(ellipse 60% 80% at 30% 50%, rgba(255,255,255,0.06) 0%, transparent 100%)",
          display: "flex",
        }}
      />

      {/* Left: Badge card — wrapper sized to display dimensions */}
      <div
        style={{
          position: "absolute",
          left: padding,
          top: (height - badgeDisplaySize) / 2,
          width: badgeDisplaySize,
          height: badgeDisplaySize,
          display: "flex",
        }}
      >
        <div
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            transform: `scale(${badgeScale})`,
            transformOrigin: "top left",
            display: "flex",
          }}
        >
          <BadgeCard
            category={category}
            tier={tier}
            numberText={numberText}
            cardShadow="0 8px 30px rgba(0,0,0,0.4)"
          />
        </div>
      </div>

      {/* Right: Text content */}
      <div
        style={{
          position: "absolute",
          left: textLeft,
          top: 0,
          right: 60,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Achievement */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
            }}
          >
            {numberText}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              color: lightColor(0.85),
              letterSpacing: "0.05em",
              lineHeight: 1.1,
            }}
          >
            {numberText === "1" ? cat.singularLabel : cat.label}
          </div>
        </div>

        {/* Tier pill */}
        <div
          style={{
            display: "flex",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              borderRadius: 24,
              backgroundColor: t.ribbon,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: t.fill,
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {tier} tier
            </div>
          </div>
        </div>

        {/* Username */}
        {username && (
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: lightColor(0.7),
              marginTop: 4,
            }}
          >
            {username}
          </div>
        )}
      </div>

      {/* Bottom-right branding */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 40,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            color: lightColor(0.35),
            letterSpacing: "0.05em",
          }}
        >
          {isPro ? "Framedl PRO" : "Framedl"}
        </div>
      </div>
    </div>
  );
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const category = params.get("cat") as BadgeCategory | null;
  const valueStr = params.get("value");
  const username = params.get("username");
  const aspectRatio = params.get("aspectRatio") || "1.91:1";

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

  const { w, h } = ASPECT_RATIOS[aspectRatio] ?? ASPECT_RATIOS["1.91:1"]!;

  const tier = getTier(category, value);
  const numberText =
    value >= 1000 ? value.toLocaleString("en-US") : String(value);

  const svg = await satori(
    <BadgeOGImage
      category={category}
      tier={tier}
      numberText={numberText}
      username={username}
      width={w}
      height={h}
    />,
    { width: w, height: h, fonts },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  //@ts-ignore
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
