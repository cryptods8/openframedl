import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { lightColor } from "@/app/image-ui/image-utils";
import { isPro } from "@/app/constants";
import { fonts } from "@/app/generate-image";
import React from "react";

export const dynamic = "force-dynamic";

const SIZE = 1024;
const CARD_MARGIN = 122;
const CARD_SIZE = SIZE - CARD_MARGIN * 2; // 820
const CARD_R = 24;

// ─── Tier definitions ───────────────────────────────────────────────
type TierName = "bronze" | "silver" | "gold" | "platinum" | "diamond";

const TIERS: Record<
  TierName,
  {
    fill: string;
    dark: string;
    ribbon: string;
    ribbonDark: string;
    fold: string;
  }
> = {
  bronze: {
    fill: "#cd7f32",
    dark: "#aa6423",
    ribbon: "#a56423",
    ribbonDark: "#784614",
    fold: "#5d3922",
  },
  silver: {
    fill: "#b4b9c0",
    dark: "#91969e",
    ribbon: "#878c96",
    ribbonDark: "#696e76",
    fold: "#50545c",
  },
  gold: {
    fill: "#ffd700",
    dark: "#dcb400",
    ribbon: "#c8a000",
    ribbonDark: "#a07d00",
    fold: "#785f00",
  },
  platinum: {
    fill: "#c8d2e6",
    dark: "#a0acc6",
    ribbon: "#4b5573",
    ribbonDark: "#373e58",
    fold: "#262c41",
  },
  diamond: {
    fill: "#a0e1ff",
    dark: "#6ec3f0",
    ribbon: "#2d78aa",
    ribbonDark: "#1e5a87",
    fold: "#144064",
  },
};

// ─── Category definitions ───────────────────────────────────────────
type CategoryId = "wins" | "streaks" | "fourdle" | "wordone";

const CATEGORIES: Record<CategoryId, { label: string; shape: string[] }> = {
  wins: {
    label: "VICTORIES",
    shape: [
      "___GGGGGGGGG___",
      "_GGGGGGGGGGGGG_",
      "G__GGGGGGGGG__G",
      "G__GGGGGGGGG__G",
      "G__GGGGGGGGG__G",
      "_G_GGGGGGGGG_G_",
      "__GGGGGGGGGGG__",
      "___GGGGGGGGG___",
      "____GGGGGGG____",
      "_____GGGGG_____",
      "______GGG______",
      "______GGG______",
      "_____DDDDD_____",
      "____DDDDDDD____",
    ],
  },
  streaks: {
    label: "DAY STREAK",
    shape: [
      "______G______",
      "_____GGG_____",
      "____GGGGG____",
      "____GGGGG____",
      "___GGGGGGG___",
      "__GGGGDGGGG__",
      "__GGGDDDGGG__",
      "_GGGGDDDGGGG_",
      "_GGGDDDDGGGG_",
      "GGGGDDDDDGGGG",
      "GGGGDDDDDGGGG",
      "GGGDDDDDDDGGG",
      "_GGGDDDDGGGG_",
      "__GGGGDGGGG__",
      "___GGGGGGG___",
      "____GGGGG____",
    ],
  },
  fourdle: {
    label: "FOURDLE CLUB",
    shape: [
      "_____GGGG__",
      "_____GGGG__",
      "____GG_GG__",
      "____GG_GG__",
      "___GG__GG__",
      "___GG__GG__",
      "__GG___GG__",
      "__GG___GG__",
      "_GG____GG__",
      "_GG____GG__",
      "GGGGGGGGGGG",
      "GGGGGGGGGGG",
      "_______GG__",
      "_______GG__",
      "_______GG__",
    ],
  },
  wordone: {
    label: "WORD-IN-ONE",
    shape: [
      "_______GGGG",
      "______GGGG_",
      "_____GGGG__",
      "____GGGG___",
      "___GGGG____",
      "__GGGG_____",
      "_GGGG______",
      "GGGGGGGGGGG",
      "GGGGGGGGGGG",
      "______GGGG_",
      "_____GGGG__",
      "____GGGG___",
      "___GGGG____",
      "__GGGG_____",
      "_GGGG______",
      "GGGG_______",
    ],
  },
};

// ─── Tier mapping ───────────────────────────────────────────────────
function getTier(category: CategoryId, value: number): TierName {
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
  }
}

// ─── Layout constants ───────────────────────────────────────────────
const RIBBON_H = Math.round(CARD_SIZE * 0.18);
const RIBBON_ABS_Y = CARD_MARGIN + Math.round(CARD_SIZE * 0.75);
const RIBBON_END_W = 80;
const RIBBON_END_DROP = 16;
const FOLD_SIZE = 18;
const NOTCH_INSET = Math.round(RIBBON_END_W * 0.55);

// ─── Ribbon end polygon helpers ─────────────────────────────────────
function makeEndPoints(x: number, y: number, h: number, left: boolean): string {
  const coef = left ? 1 : -1;
  const p1 = `${x + NOTCH_INSET * coef},${y + h / 2}`;
  const p2 = `${x},${y}`;
  const p3 = `${x + RIBBON_END_W * coef},${y}`;
  const p4 = `${x + RIBBON_END_W * coef},${y + h}`;
  const p5 = `${x},${y + h}`;
  const arr = [p1, p2, p3, p4, p5];
  if (!left) arr.reverse();
  return arr.join(" ");
}

function makeEndPointsOverlay(
  x: number,
  y: number,
  h: number,
  left: boolean,
): string {
  const coef = left ? 1 : -1;
  const p1 = `${x + NOTCH_INSET * coef},${y + h / 2}`;
  // const p2 = `${x},${y}`;
  const p2 = `${x + RIBBON_END_W * coef},${y + h / 2}`;
  const p3 = `${x + RIBBON_END_W * coef},${y + h}`;
  const p4 = `${x},${y + h}`;
  const arr = [p1, p2, p3, p4];
  if (!left) arr.reverse();
  return arr.join(" ");
}

function makeFoldPoints(fx: number, left: boolean): string {
  return `${fx},${RIBBON_ABS_Y} ${fx},${RIBBON_ABS_Y + RIBBON_END_DROP} ${fx + (left ? -1 : 1) * FOLD_SIZE},${RIBBON_ABS_Y + RIBBON_END_DROP}`;
}

// ─── Pixel art grid ─────────────────────────────────────────────────
function PixelArtGrid({
  category,
  tier,
}: {
  category: CategoryId;
  tier: TierName;
}) {
  const cat = CATEGORIES[category];
  const t = TIERS[tier];
  const rows = cat.shape.length;
  const cols = Math.max(...cat.shape.map((r) => r.length));
  const maxH = Math.floor(CARD_SIZE * 0.65);
  const maxW = Math.floor(CARD_SIZE * 0.65);
  const cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
  const cellGap = Math.max(Math.round(cellSize * 0.08), 1);
  const innerCell = cellSize - cellGap * 2;

  const shapeW = cols * cellSize;
  const shapeH = rows * cellSize;
  const shapeX = (SIZE - shapeW) / 2;
  const shapeY = RIBBON_ABS_Y - shapeH - 8; // (SIZE - shapeH) / 2;

  const cells: React.ReactNode[] = [];
  for (let ri = 0; ri < rows; ri++) {
    const row = cat.shape[ri]!;
    for (let ci = 0; ci < row.length; ci++) {
      const ch = row[ci];
      if (ch === "G" || ch === "D") {
        const color = ch === "G" ? t.fill : t.dark;
        cells.push(
          <div
            key={`${ri}-${ci}`}
            style={{
              position: "absolute",
              left: shapeX + ci * cellSize + cellGap,
              top: shapeY + ri * cellSize + cellGap,
              width: innerCell,
              height: innerCell,
              backgroundColor: color,
            }}
          />,
        );
      }
    }
  }
  return <>{cells}</>;
}

// ─── Ribbon ends (inline SVG) ───────────────────────────────────────
function RibbonEnds({ tier }: { tier: TierName }) {
  const t = TIERS[tier];

  const offset = 4;
  const leX = CARD_MARGIN - RIBBON_END_W + offset;
  const leY = RIBBON_ABS_Y + RIBBON_END_DROP;
  const leH = RIBBON_H - 4;
  const leftEnd = makeEndPoints(leX, leY, leH, true);
  const leftEndOverlay = makeEndPointsOverlay(leX, leY, leH, true);
  const reX = SIZE - CARD_MARGIN + RIBBON_END_W - offset;
  const rightEnd = makeEndPoints(reX, leY, leH, false);
  const rightEndOverlay = makeEndPointsOverlay(reX, leY, leH, false);

  const lfX = CARD_MARGIN + offset;
  // const leftFold = makeFoldPoints(lfX, true);
  const rfX = SIZE - CARD_MARGIN - offset;
  // const rightFold = makeFoldPoints(rfX, false);
  const rotateDeg = 5;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
      }}
    >
      <polygon
        points={leftEnd}
        fill={t.ribbonDark}
        transform={`rotate(${-rotateDeg}, ${lfX}, ${leY})`}
      />
      <polygon
        points={leftEndOverlay}
        fill={"black"}
        fillOpacity={0.15}
        transform={`rotate(${-rotateDeg}, ${lfX}, ${leY})`}
      />
      <polygon
        points={rightEnd}
        fill={t.ribbonDark}
        transform={`rotate(${rotateDeg}, ${rfX}, ${leY})`}
      />
      <polygon
        points={rightEndOverlay}
        fill={"black"}
        fillOpacity={0.15}
        transform={`rotate(${rotateDeg}, ${rfX}, ${leY})`}
      />
      {/* <polygon points={leftFold} fill={t.fold} /> */}
      {/* <polygon points={rightFold} fill={t.fold} /> */}
    </svg>
  );
}

// ─────────────────────
// ─── Badge element ───
// ─────────────────────
function BadgeElement({
  category,
  tier,
  numberText,
}: {
  category: CategoryId;
  tier: TierName;
  numberText: string;
}) {
  const t = TIERS[tier];
  const cat = CATEGORIES[category];
  const numFontSize = 80;
  // numberText.length <= 2 ? 72 : numberText.length <= 4 ? 64 : 52;
  const labelFontSize = 28;
  const ribbonCenterY = RIBBON_ABS_Y + RIBBON_H / 2;

  return (
    <div
      style={{
        display: "flex",
        width: SIZE,
        height: SIZE,
        position: "relative",
        background: "radial-gradient(circle, #5E3FA6 0%, #1D1434 100%)",
      }}
    >
      {/* Framedl title */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: CARD_MARGIN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "SpaceGrotesk",
          fontWeight: 700,
          fontSize: 40,
          color: lightColor(0.2),
        }}
      >
        {isPro ? "Framedl PRO" : "Framedl"}
      </div>

      {/* Ribbon ends — behind card via SVG polygons */}
      <RibbonEnds tier={tier} />

      {/* Card */}
      <div
        style={{
          position: "absolute",
          left: CARD_MARGIN,
          top: CARD_MARGIN,
          width: CARD_SIZE,
          height: CARD_SIZE,
          borderRadius: CARD_R,
          // background: `radial-gradient(circle, white, ${t.fill}10 100%)`,
          background: `linear-gradient(to bottom, white 33%, ${t.fill})`,
          // backgroundPosition: "top",
          backgroundColor: "white",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* Pixel art inside card */}
        <div
          style={{
            position: "absolute",
            left: -CARD_MARGIN,
            top: -CARD_MARGIN,
            width: SIZE,
            height: SIZE - (RIBBON_ABS_Y - CARD_MARGIN),
            display: "flex",
          }}
        >
          <PixelArtGrid category={category} tier={tier} />
        </div>

        {/* Ribbon body (on card) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: RIBBON_ABS_Y - CARD_MARGIN,
            width: CARD_SIZE,
            height: RIBBON_H,
            backgroundColor: t.ribbon,
            // opacity: 0.85,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: RIBBON_ABS_Y - CARD_MARGIN + RIBBON_H / 2,
            width: CARD_SIZE,
            height: RIBBON_H / 2,
            backgroundColor: "black",
            opacity: 0.15,
            display: "flex",
          }}
        />

        {/* Ribbon number */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: RIBBON_ABS_Y - CARD_MARGIN,
            height: RIBBON_H,
            display: "flex",
            flexDirection: "column",
            // gap: "1rem",
            justifyContent: "center",
            alignItems: "center",
            // backgroundColor: "red",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontFamily: "SpaceGrotesk",
              fontWeight: 700,
              fontSize: numFontSize,
              color: "white",
            }}
          >
            {numberText}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: RIBBON_ABS_Y - CARD_MARGIN + RIBBON_H - 20,
            padding: "10px 15px",
            background: "green",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 7,
              right: 7,
              height: 20,
              borderRadius: 15,
              background:
                "linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0))",
            }}
          />
          {/* Ribbon label */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontFamily: "SpaceGrotesk",
              fontWeight: 700,
              fontSize: 20,
              lineHeight: 1,
              color: "white",
              letterSpacing: "0.08em",
            }}
          >
            {cat.label}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: CARD_MARGIN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "SpaceGrotesk",
          fontWeight: 700,
          fontSize: labelFontSize,
          color: lightColor(0.7),
          textTransform: "uppercase",
        }}
      >
        {tier}
      </div>
    </div>
  );
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const category = params.get("cat") as CategoryId | null;
  const valueStr = params.get("value");

  if (!category || !valueStr || !CATEGORIES[category]) {
    return NextResponse.json(
      { error: "Use ?cat=wins|streaks|fourdle|wordone&value=100" },
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
    <BadgeElement category={category} tier={tier} numberText={numberText} />,
    { width: SIZE, height: SIZE, fonts },
  );

  if (format === "png") {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
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
