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
  aspectRatio,
}: {
  category: BadgeCategory;
  tier: BadgeTier;
  numberText: string;
  username?: string | null;
  width: number;
  height: number;
  aspectRatio: string;
}) {
  const t = TIERS[tier];
  const cat = CATEGORIES[category];

  const padding = aspectRatio === "1.91:1" ? 40 : 56;
  const footerReserve = 72;
  const usableHeight = height - footerReserve;

  // Scale the badge: height-bound by the canvas minus the footer reservation,
  // width-bound to 48% of the canvas so the text column keeps ≥ 480px.
  const maxByHeight = (usableHeight - padding) / BADGE_SIZE;
  const maxByWidth = (width * 0.48) / BADGE_SIZE;
  const badgeScale = Math.min(maxByHeight, maxByWidth);
  const badgeDisplaySize = Math.round(BADGE_SIZE * badgeScale);

  const badgeLeft = padding;
  const badgeTop = Math.round((usableHeight - badgeDisplaySize) / 2);
  const textLeft = badgeLeft + badgeDisplaySize + 56;

  // Tier halo anchored at badge center (percent coords for satori stability).
  const haloX = ((badgeLeft + badgeDisplaySize / 2) / width) * 100;
  const haloY = ((badgeTop + badgeDisplaySize / 2) / height) * 100;

  // Hero number auto-shrinks so long values ("5,000", "10,000") don't clip.
  const heroFontSize =
    numberText.length >= 6 ? 96 : numberText.length >= 5 ? 112 : 140;

  return (
    <div
      style={{
        display: "flex",
        width: width,
        height: height,
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
          background: `radial-gradient(ellipse 55% 70% at ${haloX}% ${haloY}%, ${t.fill}33 0%, transparent 65%)`,
          display: "flex",
        }}
      />

      {/* Badge — wrapper sized to display dimensions so satori clips correctly */}
      <div
        style={{
          position: "absolute",
          left: badgeLeft,
          top: badgeTop,
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
            cardShadow="0 12px 40px rgba(0,0,0,0.5)"
          />
        </div>
      </div>

      {/* Right: Text column */}
      <div
        style={{
          position: "absolute",
          left: textLeft,
          right: padding,
          top: 0,
          bottom: footerReserve,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Tier pill — eyebrow position */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 22px",
              borderRadius: 999,
              backgroundColor: t.ribbon,
              border: `1px solid ${t.ribbonDark}`,
              boxShadow: `inset 0 1px 0 ${lightColor(0.3)}`,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: t.fill,
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {tier} tier
            </div>
          </div>
        </div>

        {/* Hero number + category subhead */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: heroFontSize,
              fontWeight: 700,
              color: "white",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            {numberText}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              color: lightColor(0.92),
              lineHeight: 1,
              letterSpacing: "0.04em",
              marginTop: 12,
            }}
          >
            {numberText === "1" ? cat.singularLabel : cat.label}
          </div>
        </div>

        {/* Attribution */}
        {username && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 28,
            }}
          >
            <div
              style={{
                width: 60,
                height: 3,
                borderRadius: 2,
                backgroundColor: t.fill,
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: 20,
                fontWeight: 500,
                color: lightColor(0.5),
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 16,
              }}
            >
              Earned by
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: 34,
                fontWeight: 600,
                color: lightColor(0.92),
                marginTop: 4,
              }}
            >
              @{username}
            </div>
          </div>
        )}
      </div>

      {/* Brand footer — centered */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 28,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: t.fill,
            opacity: 0.8,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "SpaceGrotesk",
            fontSize: 26,
            fontWeight: 700,
            color: lightColor(0.6),
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {isPro ? "Framedl Pro" : "Framedl"}
        </div>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: t.fill,
            opacity: 0.8,
            display: "flex",
          }}
        />
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
      aspectRatio={aspectRatio}
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
