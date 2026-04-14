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
  TIERS,
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

// Colors for the tier progression rule under "BADGES"
const TIER_ORDER: TierName[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
];

function CoverImage() {
  // Fan center (the diamond sits at approx (W/2, H/2 - 10 - 30) = (600, 360))
  const fanCenterX = W / 2;
  const fanCenterY = H / 2 - 10;
  const diamondCenterY = fanCenterY - 30;

  // Halo anchored at the diamond (front-center) badge
  const haloX = (fanCenterX / W) * 100;
  const haloY = (diamondCenterY / H) * 100;
  const diamondFill = TIERS.diamond.fill;

  return (
    <div
      style={{
        display: "flex",
        width: W,
        height: H,
        position: "relative",
        background:
          "linear-gradient(135deg, #0a3a0a 0%, #041a08 55%, #010c04 100%)",
        fontFamily: "SpaceGrotesk",
      }}
    >
      {/* Diamond halo behind the focal badge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse 50% 55% at ${haloX}% ${haloY}%, ${diamondFill}33 0%, transparent 65%)`,
          display: "flex",
        }}
      />

      {/* Top brand eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: diamondFill,
            opacity: 0.8,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "SpaceGrotesk",
            fontSize: 32,
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
            backgroundColor: diamondFill,
            opacity: 0.8,
            display: "flex",
          }}
        />
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
              cardShadow="0 12px 40px rgba(0,0,0,0.55)"
            />
          </div>
        );
      })}

      {/* Bottom title — tier legend + BADGES wordmark */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {/* Tier progression legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {TIER_ORDER.map((name) => (
            <div
              key={name}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: TIERS[name].fill,
                display: "flex",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: lightColor(0.88),
            letterSpacing: "0.28em",
            lineHeight: 1,
            // Offset half the letter-spacing so the optical center matches the canvas center
            paddingLeft: "0.28em",
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
