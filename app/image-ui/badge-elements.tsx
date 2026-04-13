import React from "react";
import {
  BadgeTier as TierName,
  BadgeCategory as CategoryId,
  getTier,
} from "@/app/lib/badges";

export type { TierName, CategoryId };

// ─── Tier definitions ───────────────────────────────────────────────

export const TIERS: Record<
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

export const CATEGORIES: Record<
  CategoryId,
  { label: string; singularLabel: string; shape: string[] }
> = {
  wins: {
    label: "VICTORIES",
    singularLabel: "VICTORY",
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
    label: "DAY STREAKS",
    singularLabel: "DAY STREAK",
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
    singularLabel: "FOURDLE CLUB",
    shape: [
      "___GGDDDDDD",
      "___GGDDDDDD",
      "__GG_DD____",
      "__GG_DD____",
      "_GG__DD____",
      "_GG__DD____",
      "GGGGGDDDDD_",
      "GGGGGDDDDD_",
      "_____DD____",
      "_____DD____",
      "_____DD____",
      "_____DD____",
    ],
  },
  wordone: {
    label: "WORD-IN-ONE",
    singularLabel: "WORD-IN-ONE",
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
  losses: {
    label: "BATTLE SCARS",
    singularLabel: "BATTLE SCAR",
    shape: [
      "GG__________GG",
      "DGG________GGD",
      "_DGG______GGD_",
      "__DGG____GGD__",
      "___DGG__GGD___",
      "____DGGGGD____",
      "_____GDDG_____",
      "_____GDDG_____",
      "____DGGGGD____",
      "___DGG__GGD___",
      "__DGG____GGD__",
      "_DGG______GGD_",
      "DGG________GGD",
      "GG__________GG",
    ],
  },
};

// Re-export getTier from canonical source
export { getTier };

// ─── Layout constants ───────────────────────────────────────────────
export const BADGE_SIZE = 1024;
export const CARD_MARGIN = 122;
export const CARD_SIZE = BADGE_SIZE - CARD_MARGIN * 2; // 820
export const CARD_R = 24;

const numFontSize = 116;
const ribbonLabelFontSize = 40;
const RIBBON_H = Math.round(CARD_SIZE * 0.3);
const RIBBON_ABS_Y =
  CARD_MARGIN + CARD_SIZE - RIBBON_H - ribbonLabelFontSize * 2;
const RIBBON_END_W = 80;
const RIBBON_END_DROP = 16;
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
  const p2 = `${x + RIBBON_END_W * coef},${y + h / 2}`;
  const p3 = `${x + RIBBON_END_W * coef},${y + h}`;
  const p4 = `${x},${y + h}`;
  const arr = [p1, p2, p3, p4];
  if (!left) arr.reverse();
  return arr.join(" ");
}

// ─── Pixel art grid ─────────────────────────────────────────────────
export function PixelArtGrid({
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
  const maxH = Math.floor((RIBBON_ABS_Y - CARD_MARGIN) * 0.8);
  const maxW = Math.floor(CARD_SIZE * 0.8);
  const cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
  const cellGap = Math.max(Math.round(cellSize * 0.08), 1);
  const innerCell = cellSize - cellGap * 2;

  const shapeW = cols * cellSize;
  const shapeH = rows * cellSize;
  const shapeX = (BADGE_SIZE - shapeW) / 2;
  const shapeY = RIBBON_ABS_Y - shapeH - 8;

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
export function RibbonEnds({ tier }: { tier: TierName }) {
  const t = TIERS[tier];

  const offset = 4;
  const leX = CARD_MARGIN - RIBBON_END_W + offset;
  const leY = RIBBON_ABS_Y + RIBBON_END_DROP;
  const leH = RIBBON_H - 4;
  const leftEnd = makeEndPoints(leX, leY, leH, true);
  const leftEndOverlay = makeEndPointsOverlay(leX, leY, leH, true);
  const reX = BADGE_SIZE - CARD_MARGIN + RIBBON_END_W - offset;
  const rightEnd = makeEndPoints(reX, leY, leH, false);
  const rightEndOverlay = makeEndPointsOverlay(reX, leY, leH, false);

  const lfX = CARD_MARGIN + offset;
  const rfX = BADGE_SIZE - CARD_MARGIN - offset;
  const rotateDeg = 5;

  return (
    <svg
      viewBox={`0 0 ${BADGE_SIZE} ${BADGE_SIZE}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: BADGE_SIZE,
        height: BADGE_SIZE,
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
    </svg>
  );
}

// ─── Badge card (without outer background) ──────────────────────────
export function BadgeCard({
  category,
  tier,
  numberText,
  cardShadow,
}: {
  category: CategoryId;
  tier: TierName;
  numberText: string;
  cardShadow?: string;
}) {
  const t = TIERS[tier];
  const cat = CATEGORIES[category];

  return (
    <div
      style={{
        display: "flex",
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        position: "relative",
      }}
    >
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
          background: `linear-gradient(to bottom, white 33%, ${t.fill})`,
          backgroundColor: "white",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          ...(cardShadow ? { boxShadow: cardShadow } : {}),
        }}
      >
        {/* Pixel art inside card */}
        <div
          style={{
            position: "absolute",
            left: -CARD_MARGIN,
            top: -CARD_MARGIN,
            width: BADGE_SIZE,
            height: BADGE_SIZE - (RIBBON_ABS_Y - CARD_MARGIN),
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
            justifyContent: "center",
            alignItems: "center",
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
      </div>

      {/* Ribbon label pill — outside card to avoid overflow:hidden clipping */}
      <div
        style={{
          position: "absolute",
          left: CARD_MARGIN,
          top: RIBBON_ABS_Y + RIBBON_H - ribbonLabelFontSize,
          width: CARD_SIZE,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            padding: `${ribbonLabelFontSize / 2}px ${(3 * ribbonLabelFontSize) / 4}px`,
            background: "linear-gradient(to top, #008000, #002b00)",
            borderRadius: ribbonLabelFontSize,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 15,
              right: 15,
              height: ribbonLabelFontSize,
              borderRadius: (3 * ribbonLabelFontSize) / 4,
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
              fontSize: ribbonLabelFontSize,
              lineHeight: 1,
              color: "white",
              letterSpacing: "0.08em",
            }}
          >
            {numberText === "1" ? cat.singularLabel : cat.label}
          </div>
        </div>
      </div>
    </div>
  );
}
