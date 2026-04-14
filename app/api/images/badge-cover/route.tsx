import { NextRequest } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { lightColor } from "@/app/image-ui/image-utils";
import { isPro } from "@/app/constants";
import { fonts } from "@/app/generate-image";
import React from "react";
import {
  BADGE_SIZE,
  CategoryId,
  TierName,
  BadgeCard,
} from "@/app/image-ui/badge-elements";

export const dynamic = "force-dynamic";

const W = 1200;
const H = 800;

// Each badge: category, tier to show, display number. Every tier represented once,
// ordered from back-outer (lowest tier) to front-center (highest tier).
const SHOWCASE_BADGES: {
  category: CategoryId;
  tier: TierName;
  numberText: string;
}[] = [
  { category: "losses", tier: "bronze", numberText: "1" },
  { category: "wordone", tier: "silver", numberText: "5" },
  { category: "fourdle", tier: "gold", numberText: "144" },
  { category: "streaks", tier: "platinum", numberText: "500" },
  { category: "wins", tier: "diamond", numberText: "5,000" },
];

// Layout: fan arrangement — x offset, y offset, rotation, scale
const CARD_LAYOUTS: {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}[] = [
  // Back-outer left: bronze
  { x: -335, y: 80, rotate: -22, scale: 0.38 },
  // Back-outer right: silver
  { x: 335, y: 80, rotate: 22, scale: 0.38 },
  // Middle left: gold
  { x: -180, y: 20, rotate: -10, scale: 0.44 },
  // Middle right: platinum
  { x: 180, y: 20, rotate: 10, scale: 0.44 },
  // Front center: diamond
  { x: 0, y: -30, rotate: 0, scale: 0.52 },
];

function CoverImage() {
  const titleFontSize = 52;
  const subtitleFontSize = 72;
  // Center point for the card fan
  const fanCenterX = W / 2;
  const fanCenterY = H / 2 - 10;

  return (
    <div
      style={{
        display: "flex",
        width: W,
        height: H,
        position: "relative",
        background: "radial-gradient(circle at 50% 60%, #008000 0%, #002b00 100%)",
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
            "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(255,255,255,0.06) 0%, transparent 100%)",
          display: "flex",
        }}
      />

      {/* Title area */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          height: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: lightColor(0.5),
            fontSize: titleFontSize,
            fontWeight: 700,
          }}
        >
          {/*
          <div
            style={{
              display: "flex",
              width: 120,
              height: 4,
              background: lightColor(0.3),
            }}
          />*/}
          <div style={{ display: "flex" }}>
            {isPro ? "Framedl PRO" : "Framedl"}
          </div>
          {/*<div
            style={{
              display: "flex",
              width: 120,
              height: 4,
              background: lightColor(0.3),
            }}
          />*/}
        </div>
      </div>

      {/* Badge fan */}
      {SHOWCASE_BADGES.map((badge, i) => {
        const layout = CARD_LAYOUTS[i]!;
        // Position so the unscaled box is centered on (fanCenterX+x, fanCenterY+y);
        // transform-origin: center keeps the visual center fixed through scale+rotate,
        // so mirrored x offsets produce mirrored visual positions regardless of rotation sign.
        const half = BADGE_SIZE / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fanCenterX + layout.x - half,
              top: fanCenterY + layout.y - half,
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              transform: `scale(${layout.scale}) rotate(${layout.rotate}deg)`,
              transformOrigin: "center center",
              display: "flex",
            }}
          >
            <BadgeCard
              category={badge.category}
              tier={badge.tier}
              numberText={badge.numberText}
              cardShadow="0 8px 30px rgba(0,0,0,0.5)"
            />
          </div>
        );
      })}

      {/* Bottom label */}
      <div
        style={{
          position: "absolute",
          bottom: 65,
          left: 0,
          right: 0,
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: subtitleFontSize,
            fontWeight: 700,
            color: lightColor(0.7),
            letterSpacing: "0.25em",
          }}
        >
         BADGES 
        </div>
      </div>
    </div>
  );
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const format = params.get("format");

  const svg = await satori(<CoverImage />, {
    width: W,
    height: H,
    fonts,
  });

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
