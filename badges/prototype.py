#!/usr/bin/env python3
"""
Framedl Achievement Badge System v3
- Inter + SpaceGrotesk fonts from public/
- Ribbon wraps around card with fold shadows at edges
- Better whitespace balance
- Improved platinum vs silver differentiation
- 2x render + LANCZOS downsample
"""

from PIL import Image, ImageDraw, ImageFont
import os

FONTS_DIR = "/home/dusan/devel/sandbox/frames/openframedl/public"
OUTPUT_DIR = "/home/dusan/devel/sandbox/frames/openframedl/badges/output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FINAL = 1024
SCALE = 2
SIZE = FINAL * SCALE

# Colors
PURPLE_BG = (45, 35, 75)
PURPLE_FRAME = (60, 48, 95)
CARD_WHITE = (255, 255, 255)
TEXT_DARK = (45, 40, 65)
TEXT_MID = (140, 130, 165)

TIERS = {
    "bronze": {
        "fill": (205, 127, 50),
        "dark": (170, 100, 35),
        "ribbon": (165, 100, 35),
        "ribbon_shadow": (120, 70, 20),
        "fold": (100, 58, 15),
    },
    "silver": {
        "fill": (180, 185, 192),
        "dark": (145, 150, 158),
        "ribbon": (135, 140, 150),
        "ribbon_shadow": (105, 110, 118),
        "fold": (80, 84, 92),
    },
    "gold": {
        "fill": (255, 215, 0),
        "dark": (220, 180, 0),
        "ribbon": (200, 160, 0),
        "ribbon_shadow": (160, 125, 0),
        "fold": (120, 95, 0),
    },
    "platinum": {
        "fill": (200, 210, 230),      # cool blue-ish tint
        "dark": (160, 172, 198),
        "ribbon": (75, 85, 115),       # dark navy ribbon — clearly different from silver
        "ribbon_shadow": (55, 62, 88),
        "fold": (38, 44, 65),
    },
    "diamond": {
        "fill": (160, 225, 255),
        "dark": (110, 195, 240),
        "ribbon": (45, 120, 170),
        "ribbon_shadow": (30, 90, 135),
        "fold": (20, 65, 100),
    },
}


def load_font(name, size):
    path = os.path.join(FONTS_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def center_text(draw, text, font, cx, cy, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2), text, font=font, fill=fill)


def draw_cell(draw, x, y, s, color, gap=3):
    r = max(s // 7, 2)
    draw.rounded_rectangle([x + gap, y + gap, x + s - gap, y + s - gap],
                           radius=r, fill=color)


def draw_grid_art(draw, grid, cell_size, ox, oy, cmap, gap=3):
    for ri, row in enumerate(grid):
        for ci, ch in enumerate(row):
            if ch in cmap:
                draw_cell(draw, ox + ci * cell_size, oy + ri * cell_size,
                          cell_size, cmap[ch], gap)


def make_side_text(text, font, fill, rotation):
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 10
    tmp = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((pad, pad), text, font=font, fill=fill + (255,))
    return tmp.rotate(rotation, expand=True, resample=Image.BICUBIC)


def draw_wrapped_ribbon(draw, card_left, card_right, y_center, height, tier):
    """
    Ribbon wraps around the card:
    - Small dark fold triangles peek out behind card edges (drawn first)
    - Main ribbon body drawn ON the card surface (drawn second, on top)
    """
    ribbon_col = tier["ribbon"]
    shadow_col = tier["ribbon_shadow"]
    fold_col = tier["fold"]

    y0 = y_center - height // 2
    y1 = y_center + height // 2
    fold_w = int(height * 0.40)
    fold_drop = int(height * 0.30)

    # 1) Fold triangles — drawn BEFORE the card clips them, peeking behind edges
    #    Each fold is a small right triangle suggesting the ribbon bends behind the card.

    # Left side: top fold + bottom fold
    draw.polygon([
        (card_left, y0),                          # inner top
        (card_left - fold_w, y0 + fold_drop),     # outer point
        (card_left, y0 + fold_drop),              # inner bottom
    ], fill=fold_col)
    draw.polygon([
        (card_left, y1),                          # inner bottom
        (card_left - fold_w, y1 - fold_drop),     # outer point
        (card_left, y1 - fold_drop),              # inner top
    ], fill=fold_col)

    # Right side: top fold + bottom fold
    draw.polygon([
        (card_right, y0),
        (card_right + fold_w, y0 + fold_drop),
        (card_right, y0 + fold_drop),
    ], fill=fold_col)
    draw.polygon([
        (card_right, y1),
        (card_right + fold_w, y1 - fold_drop),
        (card_right, y1 - fold_drop),
    ], fill=fold_col)

    # 2) Main ribbon body — on the card face, edge to edge
    draw.rectangle([card_left, y0, card_right, y1], fill=ribbon_col)

    # Subtle bottom shadow stripe
    shadow_h = height // 5
    draw.rectangle([card_left, y1 - shadow_h, card_right, y1], fill=shadow_col)


# ──────────────────────────────────────────────
# PIXEL ART SHAPES
# ──────────────────────────────────────────────

SHAPE_TROPHY = [
    "____GGGGGGG____",
    "___GGGGGGGGG___",
    "__GGGGGGGGGGG__",
    "__GGGGGGGGGGG__",
    "_GGGGGGGGGGGGG_",
    "_GGGGGGGGGGGGG_",
    "__GGGGGGGGGGG__",
    "___GGGGGGGGG___",
    "____GGGGGGG____",
    "_____GGGGG_____",
    "______GGG______",
    "______GGG______",
    "_____DDDDD_____",
    "____DDDDDDD____",
]

SHAPE_FLAME = [
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
]

SHAPE_FOUR = [
    "GG______GG_",
    "GG______GG_",
    "GG______GG_",
    "GG______GG_",
    "GG______GG_",
    "GG______GG_",
    "GGGGGGGGGGG",
    "GGGGGGGGGGG",
    "________GG_",
    "________GG_",
    "________GG_",
    "________GG_",
    "________GG_",
    "________GG_",
]

SHAPE_BOLT = [
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
]


def generate_badge(shape, tier_name, number_text, category_text, filename):
    tier = TIERS[tier_name]
    img = Image.new("RGBA", (SIZE, SIZE), PURPLE_BG + (255,))
    draw = ImageDraw.Draw(img)

    S = SIZE
    margin = int(S * 0.055)

    # Outer frame line
    draw.rounded_rectangle([margin, margin, S - margin, S - margin],
                           radius=int(S * 0.035), outline=PURPLE_FRAME, width=5)

    # White card
    card_m = int(S * 0.10)
    card_l, card_t = card_m, card_m
    card_r, card_b = S - card_m, S - card_m
    draw.rounded_rectangle([card_l, card_t, card_r, card_b],
                           radius=int(S * 0.025), fill=CARD_WHITE)

    card_w = card_r - card_l
    card_h = card_b - card_t

    # Color map
    cmap = {'G': tier["fill"], 'D': tier["dark"]}

    # Shape sizing — centered in upper ~55% of card with generous whitespace
    rows = len(shape)
    cols = max(len(r) for r in shape)
    available_h = int(card_h * 0.50)
    available_w = int(card_w * 0.65)
    cell = min(available_w // cols, available_h // rows)
    gap = max(cell // 6, 2)

    shape_w = cols * cell
    shape_h = rows * cell
    ox = (S - shape_w) // 2
    oy = card_t + int(card_h * 0.25) - shape_h // 2  # vertically center in upper portion

    draw_grid_art(draw, shape, cell, ox, oy, cmap, gap)

    # --- Ribbon ---
    ribbon_y = card_t + int(card_h * 0.75)
    ribbon_h = int(card_h * 0.20)

    draw_wrapped_ribbon(draw, card_l, card_r, ribbon_y, ribbon_h, tier)

    # Ribbon text
    font_num = load_font("SpaceGrotesk-Bold.ttf", int(ribbon_h * 0.50))
    font_cat = load_font("Inter-Medium.ttf", int(ribbon_h * 0.18))

    center_text(draw, number_text, font_num, S // 2, ribbon_y - int(ribbon_h * 0.10),
                (255, 255, 255))
    center_text(draw, category_text, font_cat, S // 2, ribbon_y + int(ribbon_h * 0.26),
                (255, 255, 255, 210))

    # Side text "Framedl"
    font_side = load_font("Inter-SemiBold.ttf", int(S * 0.020))
    left_txt = make_side_text("Framedl", font_side, TEXT_MID, 90)
    right_txt = make_side_text("Framedl", font_side, TEXT_MID, -90)

    lx = (card_l + margin) // 2 - left_txt.width // 2
    img.paste(left_txt, (lx, (S - left_txt.height) // 2), left_txt)
    rx = (card_r + S - margin) // 2 - right_txt.width // 2
    img.paste(right_txt, (rx, (S - right_txt.height) // 2), right_txt)

    # Downsample
    img = img.resize((FINAL, FINAL), Image.LANCZOS)
    fname = f"{OUTPUT_DIR}/{filename}"
    img.save(fname, "PNG")
    print(f"  -> {fname}")


if __name__ == "__main__":
    # One per category
    generate_badge(SHAPE_TROPHY, "gold",     "100",    "VICTORIES",    "proto_wins_gold.png")
    generate_badge(SHAPE_FLAME,  "diamond",  "365",    "DAY STREAK",   "proto_streak_diamond.png")
    generate_badge(SHAPE_FOUR,   "silver",   "44",     "FOURDLE CLUB", "proto_fourdle_silver.png")
    generate_badge(SHAPE_BOLT,   "platinum", "25",     "WORD-IN-ONE",  "proto_bolt_platinum.png")

    # Tier progression on trophy
    generate_badge(SHAPE_TROPHY, "bronze",   "1",      "VICTORIES",    "proto_wins_bronze.png")
    generate_badge(SHAPE_TROPHY, "silver",   "50",     "VICTORIES",    "proto_wins_silver.png")
    generate_badge(SHAPE_TROPHY, "platinum", "2,500",  "VICTORIES",    "proto_wins_platinum.png")
    generate_badge(SHAPE_TROPHY, "diamond",  "10,000", "VICTORIES",    "proto_wins_diamond.png")
