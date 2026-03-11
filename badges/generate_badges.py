#!/usr/bin/env python3
"""
Framedl Achievement Badge Generator
Design Philosophy: Systematic Heraldry

Generates NFT-ready achievement badges across 4 categories:
1. Wins — total victories
2. Streaks — consecutive days
3. Fourdle Club — wins in exactly 4 guesses
4. Word-in-One — wins in 1 guess
"""

import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

FONTS_DIR = "/home/dusan/.claude/skills/canvas-design/canvas-fonts"
OUTPUT_DIR = "/home/dusan/devel/sandbox/frames/openframedl/badges/output"
SIZE = 1024  # Square badge size
CENTER = SIZE // 2

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/wins", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/streaks", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/fourdle", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/wordone", exist_ok=True)


def load_font(name, size):
    path = os.path.join(FONTS_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# Tier color palettes — progression from muted to luminous
TIER_PALETTES = [
    {"bg": "#1a1a1f", "pri": "#6b7280", "acc": "#9ca3af", "ring": "#374151", "glow": "#4b5563"},      # 0: Slate
    {"bg": "#1a1a1f", "pri": "#78716c", "acc": "#a8a29e", "ring": "#44403c", "glow": "#57534e"},      # 1: Stone
    {"bg": "#181a1e", "pri": "#7c8590", "acc": "#b0bec5", "ring": "#455a64", "glow": "#546e7a"},      # 2: Steel
    {"bg": "#1a1917", "pri": "#b08d57", "acc": "#d4a962", "ring": "#8b6914", "glow": "#a67c00"},      # 3: Bronze
    {"bg": "#191b1f", "pri": "#a0a8b8", "acc": "#c0cad8", "ring": "#6b7a8d", "glow": "#8899aa"},      # 4: Silver
    {"bg": "#1a1810", "pri": "#c9a84c", "acc": "#e8c547", "ring": "#a68a2e", "glow": "#b8982d"},      # 5: Gold
    {"bg": "#14121a", "pri": "#9b7fd4", "acc": "#b794f6", "ring": "#7c5cbf", "glow": "#6d4aad"},      # 6: Amethyst
    {"bg": "#0f1318", "pri": "#4ecdc4", "acc": "#7fede6", "ring": "#2d9e97", "glow": "#26867f"},      # 7: Emerald
    {"bg": "#18100f", "pri": "#e85d4a", "acc": "#ff7b6b", "ring": "#c0392b", "glow": "#a93226"},      # 8: Ruby
    {"bg": "#0d0d14", "pri": "#e0e0ff", "acc": "#ffffff", "ring": "#8888cc", "glow": "#6666bb"},      # 9: Platinum
    {"bg": "#0a0a0a", "pri": "#f0d060", "acc": "#ffe082", "ring": "#ffd700", "glow": "#ffab00"},      # 10: Mythic
]


def get_tier(index, total):
    tier_idx = int(index / max(total - 1, 1) * (len(TIER_PALETTES) - 1))
    return TIER_PALETTES[min(tier_idx, len(TIER_PALETTES) - 1)]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def draw_circle(draw, cx, cy, r, outline=None, fill=None, width=1):
    if r < 1:
        return
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=outline, fill=fill, width=width)


def draw_hexagon(draw, cx, cy, r, rotation=0, outline=None, fill=None, width=1):
    points = []
    for i in range(6):
        angle = math.radians(60 * i + rotation)
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, outline=outline, fill=fill, width=width)


def draw_concentric_rings(draw, cx, cy, radii, color, width=1):
    for r in radii:
        draw_circle(draw, cx, cy, r, outline=color, width=width)


def draw_tick_marks(draw, cx, cy, r_inner, r_outer, count, color, width=1):
    for i in range(count):
        angle = math.radians(360 * i / count - 90)
        x1 = cx + r_inner * math.cos(angle)
        y1 = cy + r_inner * math.sin(angle)
        x2 = cx + r_outer * math.cos(angle)
        y2 = cy + r_outer * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


def draw_dots_ring(draw, cx, cy, r, count, dot_r, color):
    for i in range(count):
        angle = math.radians(360 * i / count - 90)
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        draw_circle(draw, x, y, dot_r, fill=color)


def draw_crosshair(draw, cx, cy, r_inner, r_outer, color, width=1):
    for angle_deg in [0, 90, 180, 270]:
        angle = math.radians(angle_deg)
        x1 = cx + r_inner * math.cos(angle)
        y1 = cy + r_inner * math.sin(angle)
        x2 = cx + r_outer * math.cos(angle)
        y2 = cy + r_outer * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


def draw_square_frame(draw, cx, cy, half_size, color, width=2):
    draw.rectangle(
        [cx - half_size, cy - half_size, cx + half_size, cy + half_size],
        outline=color, width=width
    )


def center_text(draw, text, font, cx, cy, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = cx - tw / 2
    y = cy - th / 2
    draw.text((x, y), text, font=font, fill=fill)


def add_glow(img, pal, cx, cy, radius, intensity=30):
    """Add a subtle glow halo around center using compositing."""
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    r, g, b = hex_to_rgb(pal["glow"])
    # Multiple concentric translucent circles
    for i in range(8):
        r_glow = radius + i * 12
        alpha = max(intensity - i * 4, 2)
        glow_draw.ellipse(
            [cx - r_glow, cy - r_glow, cx + r_glow, cy + r_glow],
            fill=None, outline=(r, g, b, alpha), width=8
        )
    blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius=12))
    return Image.alpha_composite(img, blurred)


def draw_fine_radial(draw, cx, cy, r_inner, r_outer, count, color, width=1):
    """Fine radial hash marks."""
    for i in range(count):
        angle = math.radians(360 * i / count)
        x1 = cx + r_inner * math.cos(angle)
        y1 = cy + r_inner * math.sin(angle)
        x2 = cx + r_outer * math.cos(angle)
        y2 = cy + r_outer * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


# ──────────────────────────────────────────────
# CATEGORY 1: WINS
# ──────────────────────────────────────────────
WINS = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

def generate_wins_badge(value, index):
    pal = get_tier(index, len(WINS))
    img = Image.new("RGBA", (SIZE, SIZE), hex_to_rgb(pal["bg"]) + (255,))
    draw = ImageDraw.Draw(img)

    # Outer ring system
    draw_circle(draw, CENTER, CENTER, 485, outline=pal["ring"], width=2)
    draw_circle(draw, CENTER, CENTER, 475, outline=pal["ring"], width=1)
    draw_circle(draw, CENTER, CENTER, 460, outline=pal["ring"], width=1)

    # Fine tick marks — outer edge
    tick_count = 60 + index * 12
    draw_tick_marks(draw, CENTER, CENTER, 462, 473, tick_count, pal["ring"], width=1)

    # Major tick marks at cardinal + intermediate positions
    major_ticks = 4 + index
    draw_tick_marks(draw, CENTER, CENTER, 455, 473, major_ticks, pal["pri"], width=2)

    # Cardinal crosshair lines
    draw_crosshair(draw, CENTER, CENTER, 260, 453, pal["ring"], width=1)

    # Concentric rings — density scales with tier
    ring_count = 3 + index // 2
    for i in range(min(ring_count, 10)):
        r = 440 - i * 30
        if r > 160:
            w = 2 if i == 0 else 1
            draw_circle(draw, CENTER, CENTER, r, outline=pal["ring"], width=w)

    # Fine inner rings for density
    for i in range(3 + index):
        r = 150 - i * 12
        if r > 20:
            draw_circle(draw, CENTER, CENTER, r, outline=pal["ring"], width=1)

    # Hexagonal frames at mid-level
    if index >= 3:
        draw_hexagon(draw, CENTER, CENTER, 340, rotation=30, outline=pal["pri"], width=2)
    if index >= 6:
        draw_hexagon(draw, CENTER, CENTER, 370, rotation=0, outline=pal["ring"], width=1)
    if index >= 8:
        draw_hexagon(draw, CENTER, CENTER, 400, rotation=15, outline=pal["ring"], width=1)

    # Dot ring
    if index >= 1:
        dot_count = 8 + index * 3
        draw_dots_ring(draw, CENTER, CENTER, 420, dot_count, 2, pal["pri"])

    # Square frame at higher tiers
    if index >= 5:
        draw_square_frame(draw, CENTER, CENTER, 300, pal["ring"], width=1)
    if index >= 9:
        draw_square_frame(draw, CENTER, CENTER, 340, pal["ring"], width=1)

    # Clear central zone for text
    draw_circle(draw, CENTER, CENTER, 155, fill=hex_to_rgb(pal["bg"]) + (255,))
    draw_circle(draw, CENTER, CENTER, 155, outline=pal["pri"], width=2)

    # Central number
    num_str = f"{value:,}" if value >= 1000 else str(value)
    font_size = 160 if len(num_str) <= 2 else 130 if len(num_str) <= 3 else 105 if len(num_str) <= 5 else 85
    font_num = load_font("GeistMono-Bold.ttf", font_size)
    center_text(draw, num_str, font_num, CENTER, CENTER - 20, pal["acc"])

    # Label below number — singular for 1
    label = "VICTORY" if value == 1 else "VICTORIES"
    font_label = load_font("Jura-Medium.ttf", 26)
    center_text(draw, label, font_label, CENTER, CENTER + 55, pal["pri"])

    # Category at top
    font_cat = load_font("Jura-Light.ttf", 20)
    center_text(draw, "FRAMEDL", font_cat, CENTER, 30, pal["ring"])

    # Tier at bottom
    font_tier = load_font("DMMono-Regular.ttf", 16)
    tier_names = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"]
    center_text(draw, f"TIER {tier_names[index]}", font_tier, CENTER, SIZE - 45, pal["ring"])

    # Cardinal point dots
    for angle_deg in [0, 90, 180, 270]:
        angle = math.radians(angle_deg)
        draw_circle(draw, CENTER + 492 * math.cos(angle), CENTER + 492 * math.sin(angle), 4, fill=pal["pri"])

    # Add glow
    img = add_glow(img, pal, CENTER, CENTER, 155, intensity=20 + index * 3)

    img.save(f"{OUTPUT_DIR}/wins/wins_{value}.png", "PNG")
    print(f"  -> wins_{value}.png")


# ──────────────────────────────────────────────
# CATEGORY 2: STREAKS
# ──────────────────────────────────────────────
STREAKS = [
    (7, "7"), (14, "14"), (30, "30"), (50, "50"), (100, "100"),
    (250, "250"), (365, "365"), (500, "500"),
    (730, "2Y"), (1095, "3Y"), (1460, "4Y"), (1825, "5Y"), (3650, "10Y")
]

def generate_streaks_badge(value, label, index):
    pal = get_tier(index, len(STREAKS))
    img = Image.new("RGBA", (SIZE, SIZE), hex_to_rgb(pal["bg"]) + (255,))
    draw = ImageDraw.Draw(img)

    # Outer boundary — triple ring
    draw_circle(draw, CENTER, CENTER, 485, outline=pal["ring"], width=2)
    draw_circle(draw, CENTER, CENTER, 478, outline=pal["ring"], width=1)
    draw_circle(draw, CENTER, CENTER, 468, outline=pal["ring"], width=1)

    # Radial lines — rays representing streak energy
    line_count = 36 + index * 6
    for i in range(line_count):
        angle = math.radians(360 * i / line_count - 90)
        # Vary inner radius to create organic rhythm
        r_inner = 210 + 30 * abs(math.sin(angle * 3))
        r_outer = 466
        draw.line([
            (CENTER + r_inner * math.cos(angle), CENTER + r_inner * math.sin(angle)),
            (CENTER + r_outer * math.cos(angle), CENTER + r_outer * math.sin(angle))
        ], fill=pal["ring"], width=1)

    # Fine tick marks in outer band
    draw_tick_marks(draw, CENTER, CENTER, 470, 476, line_count * 2, pal["ring"], width=1)

    # Chain links — circles in the radial field
    if index >= 1:
        chain_r = 340
        chain_count = min(12 + index * 3, 48)
        for i in range(chain_count):
            angle = math.radians(360 * i / chain_count - 90)
            x = CENTER + chain_r * math.cos(angle)
            y = CENTER + chain_r * math.sin(angle)
            draw_circle(draw, x, y, 6, outline=pal["pri"], width=1)
            draw_circle(draw, x, y, 2, fill=pal["pri"])

    # Second chain ring at higher tiers
    if index >= 5:
        chain_r2 = 420
        chain_count2 = min(16 + index * 2, 40)
        for i in range(chain_count2):
            angle = math.radians(360 * i / chain_count2)
            x = CENTER + chain_r2 * math.cos(angle)
            y = CENTER + chain_r2 * math.sin(angle)
            draw_circle(draw, x, y, 4, outline=pal["ring"], width=1)

    # Vertical accent line (unbroken streak symbol)
    if index >= 3:
        draw.line([(CENTER, CENTER - 195), (CENTER, CENTER - 300)], fill=pal["acc"], width=2)
        draw_circle(draw, CENTER, CENTER - 305, 4, fill=pal["acc"])
        # Mirror below
        draw.line([(CENTER, CENTER + 195), (CENTER, CENTER + 300)], fill=pal["acc"], width=2)
        draw_circle(draw, CENTER, CENTER + 305, 4, fill=pal["acc"])

    # Inner circle — clean text zone
    draw_circle(draw, CENTER, CENTER, 200, fill=hex_to_rgb(pal["bg"]) + (255,), outline=pal["pri"], width=2)
    draw_circle(draw, CENTER, CENTER, 190, outline=pal["ring"], width=1)
    draw_circle(draw, CENTER, CENTER, 180, outline=pal["ring"], width=1)

    # Central number
    display = label
    font_size = 150 if len(display) <= 2 else 120 if len(display) <= 3 else 100
    font_num = load_font("BigShoulders-Bold.ttf", font_size)
    center_text(draw, display, font_num, CENTER, CENTER - 18, pal["acc"])

    # Sub-label
    sub_label = "STREAK" if "Y" in label else "DAY STREAK"
    font_label = load_font("Jura-Medium.ttf", 24)
    center_text(draw, sub_label, font_label, CENTER, CENTER + 55, pal["pri"])

    # Category
    font_cat = load_font("Jura-Light.ttf", 20)
    center_text(draw, "FRAMEDL", font_cat, CENTER, 30, pal["ring"])

    # Tier
    font_tier = load_font("DMMono-Regular.ttf", 16)
    tier_names = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"]
    center_text(draw, f"TIER {tier_names[index]}", font_tier, CENTER, SIZE - 45, pal["ring"])

    # Glow
    img = add_glow(img, pal, CENTER, CENTER, 200, intensity=18 + index * 3)

    img.save(f"{OUTPUT_DIR}/streaks/streak_{value}.png", "PNG")
    print(f"  -> streak_{value}.png")


# ──────────────────────────────────────────────
# CATEGORY 3: FOURDLE CLUB
# ──────────────────────────────────────────────
FOURDLE = [4, 14, 24, 44, 104, 144, 244, 444, 844, 1444, 4444]

def generate_fourdle_badge(value, index):
    pal = get_tier(index, len(FOURDLE))
    img = Image.new("RGBA", (SIZE, SIZE), hex_to_rgb(pal["bg"]) + (255,))
    draw = ImageDraw.Draw(img)

    # Diamond (rotated square) — signature fourdle shape
    half = 440
    diamond_pts = [
        (CENTER, CENTER - half), (CENTER + half, CENTER),
        (CENTER, CENTER + half), (CENTER - half, CENTER)
    ]
    draw.polygon(diamond_pts, outline=pal["ring"], width=2)

    # Smaller diamond
    half2 = 380
    diamond_pts2 = [
        (CENTER, CENTER - half2), (CENTER + half2, CENTER),
        (CENTER, CENTER + half2), (CENTER - half2, CENTER)
    ]
    draw.polygon(diamond_pts2, outline=pal["ring"], width=1)

    # Axis-aligned square
    inner_half = 310
    draw_square_frame(draw, CENTER, CENTER, inner_half, pal["ring"], width=2)

    # 4x4 grid
    cell = inner_half * 2 / 4
    grid_start = CENTER - inner_half
    for i in range(1, 4):
        x = grid_start + i * cell
        draw.line([(x, CENTER - inner_half), (x, CENTER + inner_half)], fill=pal["ring"], width=1)
        y = grid_start + i * cell
        draw.line([(CENTER - inner_half, y), (CENTER + inner_half, y)], fill=pal["ring"], width=1)

    # Corner dots
    for dx, dy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
        draw_circle(draw, CENTER + dx * (inner_half + 22), CENTER + dy * (inner_half + 22), 5, fill=pal["pri"])

    # Additional squares at higher tiers
    if index >= 3:
        draw_square_frame(draw, CENTER, CENTER, 250, pal["ring"], width=1)
    if index >= 5:
        # Inner diamond
        sm = 200
        draw.polygon([
            (CENTER, CENTER - sm), (CENTER + sm, CENTER),
            (CENTER, CENTER + sm), (CENTER - sm, CENTER)
        ], outline=pal["ring"], width=1)
    if index >= 7:
        # Cross lines through grid
        draw.line([(CENTER - inner_half, CENTER), (CENTER + inner_half, CENTER)], fill=pal["pri"], width=2)
        draw.line([(CENTER, CENTER - inner_half), (CENTER, CENTER + inner_half)], fill=pal["pri"], width=2)
    if index >= 9:
        draw_square_frame(draw, CENTER, CENTER, 170, pal["ring"], width=1)

    # "4" motif — four small 4s at cardinal positions
    if index >= 4:
        font_sm4 = load_font("GeistMono-Bold.ttf", 32)
        sm_r = 200 if index < 7 else 240
        for angle_deg in [0, 90, 180, 270]:
            angle = math.radians(angle_deg - 90)
            x = CENTER + sm_r * math.cos(angle)
            y = CENTER + sm_r * math.sin(angle)
            center_text(draw, "4", font_sm4, x, y, pal["ring"])

    # Central circle — sized to contain the number
    num_str = f"{value:,}" if value >= 1000 else str(value)
    # Scale central circle based on number width
    central_r = 130 if len(num_str) <= 3 else 160 if len(num_str) <= 5 else 185
    draw_circle(draw, CENTER, CENTER, central_r + 15, fill=hex_to_rgb(pal["bg"]) + (255,))
    draw_circle(draw, CENTER, CENTER, central_r + 15, outline=pal["pri"], width=2)
    draw_circle(draw, CENTER, CENTER, central_r, outline=pal["ring"], width=1)

    # Central number
    font_size = 120 if len(num_str) <= 2 else 100 if len(num_str) <= 3 else 80 if len(num_str) <= 5 else 68
    font_num = load_font("GeistMono-Bold.ttf", font_size)
    center_text(draw, num_str, font_num, CENTER, CENTER - 18, pal["acc"])

    # Label
    font_label = load_font("Jura-Medium.ttf", 20)
    center_text(draw, "FOURDLE CLUB", font_label, CENTER, CENTER + 42, pal["pri"])

    # Category
    font_cat = load_font("Jura-Light.ttf", 20)
    center_text(draw, "FRAMEDL", font_cat, CENTER, 30, pal["ring"])

    # Tier
    font_tier = load_font("DMMono-Regular.ttf", 16)
    tier_names = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"]
    center_text(draw, f"TIER {tier_names[index]}", font_tier, CENTER, SIZE - 45, pal["ring"])

    # Glow
    img = add_glow(img, pal, CENTER, CENTER, central_r, intensity=18 + index * 3)

    img.save(f"{OUTPUT_DIR}/fourdle/fourdle_{value}.png", "PNG")
    print(f"  -> fourdle_{value}.png")


# ──────────────────────────────────────────────
# CATEGORY 4: WORD-IN-ONE
# ──────────────────────────────────────────────
WORDONE = [1, 5, 10, 25, 50, 100]

def generate_wordone_badge(value, index):
    pal = get_tier(index, len(WORDONE))
    img = Image.new("RGBA", (SIZE, SIZE), hex_to_rgb(pal["bg"]) + (255,))
    draw = ImageDraw.Draw(img)

    # Outer ring
    draw_circle(draw, CENTER, CENTER, 485, outline=pal["ring"], width=2)

    # Bullseye rings — concentric precision circles
    ring_count = 10 + index * 4
    max_r = 465
    min_r = 60
    for i in range(ring_count):
        r = max_r - i * (max_r - min_r) / ring_count
        w = 2 if i % 5 == 0 else 1
        draw_circle(draw, CENTER, CENTER, r, outline=pal["ring"], width=w)

    # Full crosshair
    draw.line([(CENTER, 30), (CENTER, SIZE - 30)], fill=pal["ring"], width=1)
    draw.line([(30, CENTER), (SIZE - 30, CENTER)], fill=pal["ring"], width=1)

    # Fine tick marks along crosshair
    for axis in ['h', 'v']:
        for i in range(20):
            pos = 80 + i * 40
            if axis == 'h':
                draw.line([(pos, CENTER - 6), (pos, CENTER + 6)], fill=pal["ring"], width=1)
                draw.line([(SIZE - pos, CENTER - 6), (SIZE - pos, CENTER + 6)], fill=pal["ring"], width=1)
            else:
                draw.line([(CENTER - 6, pos), (CENTER + 6, pos)], fill=pal["ring"], width=1)
                draw.line([(CENTER - 6, SIZE - pos), (CENTER + 6, SIZE - pos)], fill=pal["ring"], width=1)

    # Diagonal crosshairs
    if index >= 2:
        offset = 340
        draw.line([(CENTER - offset, CENTER - offset), (CENTER + offset, CENTER + offset)], fill=pal["ring"], width=1)
        draw.line([(CENTER + offset, CENTER - offset), (CENTER - offset, CENTER + offset)], fill=pal["ring"], width=1)

    # Clear center for number + bullseye
    draw_circle(draw, CENTER, CENTER, 120, fill=hex_to_rgb(pal["bg"]) + (255,))
    draw_circle(draw, CENTER, CENTER, 120, outline=pal["pri"], width=3)
    draw_circle(draw, CENTER, CENTER, 80, outline=pal["pri"], width=2)
    draw_circle(draw, CENTER, CENTER, 40, outline=pal["acc"], width=2)
    draw_circle(draw, CENTER, CENTER, 10, fill=pal["acc"])

    # "1" marks at cardinal positions
    if index >= 2:
        font_one = load_font("GeistMono-Bold.ttf", 24)
        one_r = 155
        for angle_deg in [0, 90, 180, 270]:
            angle = math.radians(angle_deg - 90)
            center_text(draw, "1", font_one, CENTER + one_r * math.cos(angle), CENTER + one_r * math.sin(angle), pal["ring"])

    # Impact scatter dots
    if index >= 1:
        rng = random.Random(value * 42)
        mark_count = 6 + index * 3
        for _ in range(mark_count):
            angle = rng.uniform(0, 2 * math.pi)
            r = rng.uniform(180, 430)
            x = CENTER + r * math.cos(angle)
            y = CENTER + r * math.sin(angle)
            draw_circle(draw, x, y, 2, fill=pal["pri"])

    # Number below bullseye — inside a clean zone
    num_str = str(value)
    font_size = 100 if len(num_str) <= 2 else 80
    font_num = load_font("BigShoulders-Bold.ttf", font_size)

    # Clear a rectangle for the number area
    num_y = CENTER + 175
    rect_h = 70
    rect_w = 150
    draw.rectangle(
        [CENTER - rect_w, num_y - rect_h//2, CENTER + rect_w, num_y + rect_h//2],
        fill=hex_to_rgb(pal["bg"]) + (255,)
    )
    center_text(draw, num_str, font_num, CENTER, num_y, pal["acc"])

    # Label below number
    label_y = num_y + 55
    font_label = load_font("Jura-Medium.ttf", 22)
    center_text(draw, "WORD-IN-ONE", font_label, CENTER, label_y, pal["pri"])

    # Category
    font_cat = load_font("Jura-Light.ttf", 20)
    center_text(draw, "FRAMEDL", font_cat, CENTER, 30, pal["ring"])

    # Tier
    font_tier = load_font("DMMono-Regular.ttf", 16)
    tier_names = ["I", "II", "III", "IV", "V", "VI"]
    center_text(draw, f"TIER {tier_names[index]}", font_tier, CENTER, SIZE - 45, pal["ring"])

    # Glow on bullseye
    img = add_glow(img, pal, CENTER, CENTER, 120, intensity=25 + index * 5)

    img.save(f"{OUTPUT_DIR}/wordone/wordone_{value}.png", "PNG")
    print(f"  -> wordone_{value}.png")


# ──────────────────────────────────────────────
# GENERATE ALL
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating WINS badges...")
    for i, v in enumerate(WINS):
        generate_wins_badge(v, i)

    print("\nGenerating STREAKS badges...")
    for i, (v, label) in enumerate(STREAKS):
        generate_streaks_badge(v, label, i)

    print("\nGenerating FOURDLE CLUB badges...")
    for i, v in enumerate(FOURDLE):
        generate_fourdle_badge(v, i)

    print("\nGenerating WORD-IN-ONE badges...")
    for i, v in enumerate(WORDONE):
        generate_wordone_badge(v, i)

    total = len(WINS) + len(STREAKS) + len(FOURDLE) + len(WORDONE)
    print(f"\nDone! {total} badges saved to {OUTPUT_DIR}/")
