#!/usr/bin/env python3
"""
Framedl Achievement Badge Generator V2
Design Philosophy: Framedl Card/Ticket Aesthetic
Inspiration: nft-sample.png, xmas-cup-2024-ticket.png, streak-freeze-nft.png
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

# Paths
FONTS_DIR = "public" # Use fonts from public directory
OUTPUT_DIR = "badges/output/v2"
SIZE = 1024
CENTER = SIZE // 2

# Colors
PRIMARY = "#5E3FA6"
PRIMARY_DARK = "#1D1434"
PRIMARY_LIGHT = "#8C73C9"
ORANGE = "#FFA500"
GREEN = "#008000"
WHITE = "#FFFFFF"
GOLD = "#F0D060"
SILVER = "#C0CAD8"
BRONZE = "#B08D57"

os.makedirs(OUTPUT_DIR, exist_ok=True)
for cat in ["wins", "streaks", "fourdle", "wordone"]:
    os.makedirs(f"{OUTPUT_DIR}/{cat}", exist_ok=True)

def load_font(name, size):
    path = os.path.join(FONTS_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def get_tier_color(index, total):
    # Progress from Bronze -> Silver -> Gold -> Mythic (Purple/White)
    if index < total // 4:
        return BRONZE
    elif index < total // 2:
        return SILVER
    elif index < 3 * total // 4:
        return GOLD
    else:
        return WHITE

def draw_rounded_card(draw, x1, y1, x2, y2, radius, fill, outline=None, width=1):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=outline, width=width)

def add_glow(img, color_hex, cx, cy, radius, intensity=40):
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    r, g, b = hex_to_rgb(color_hex)
    for i in range(10):
        r_glow = radius + i * 8
        alpha = max(intensity - i * 4, 0)
        glow_draw.ellipse([cx - r_glow, cy - r_glow, cx + r_glow, cy + r_glow], fill=None, outline=(r, g, b, alpha), width=5)
    blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius=10))
    return Image.alpha_composite(img, blurred)

def create_base_card(category, value, index, total_steps, accent_color):
    # Base Image
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    tier_color = get_tier_color(index, total_steps)
    
    # Outer Card
    margin = 80
    draw_rounded_card(draw, margin, margin, SIZE - margin, SIZE - margin, 60, fill=hex_to_rgb(PRIMARY_DARK) + (255,), outline=hex_to_rgb(tier_color) + (255,), width=4)
    
    # Subtle inner border
    draw_rounded_card(draw, margin + 20, margin + 20, SIZE - margin - 20, SIZE - margin - 20, 45, fill=None, outline=hex_to_rgb(PRIMARY) + (100,), width=2)

    # Header
    font_header = load_font("SpaceGrotesk-Bold.ttf", 40)
    header_text = "FRAMEDL ACHIEVEMENT"
    bbox = draw.textbbox((0, 0), header_text, font=font_header)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, margin + 60), header_text, font=font_header, fill=WHITE)

    # Decorative lines
    line_y = margin + 120
    draw.line([CENTER - 300, line_y, CENTER + 300, line_y], fill=hex_to_rgb(accent_color) + (200,), width=3)
    
    # Footer - Tier
    tier_names = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MYTHIC"]
    tier_idx = min(index // (total_steps // 5 + 1), 5)
    tier_text = f"TIER {tier_names[tier_idx]}"
    font_footer = load_font("SpaceGrotesk-Medium.ttf", 30)
    bbox = draw.textbbox((0, 0), tier_text, font=font_footer)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, SIZE - margin - 80), tier_text, font=font_footer, fill=tier_color)

    return img, draw, tier_color

# Icons mapping (placeholders if files not found, but we will try to load them)
def load_icon(name, size):
    try:
        icon = Image.open(f"public/{name}").convert("RGBA")
        icon = icon.resize((size, size), Image.Resampling.LANCET)
        return icon
    except:
        return None

def generate_wins_badge_v2(value, index, total):
    accent = WHITE
    img, draw, tier_color = create_base_card("wins", value, index, total, accent)
    
    # Large Number
    num_str = f"{value:,}"
    font_num = load_font("SpaceGrotesk-Bold.ttf", 220)
    bbox = draw.textbbox((0, 0), num_str, font=font_num)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER - 100), num_str, font=font_num, fill=WHITE)
    
    # Label
    label = "VICTORIES" if value > 1 else "VICTORY"
    font_label = load_font("Inter-Medium.ttf", 50)
    bbox = draw.textbbox((0, 0), label, font=font_label)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER + 120), label, font=font_label, fill=SILVER)

    # Icon - Trophy
    icon_name = "cup-primary.png" if tier_color == WHITE else "cup.png"
    icon = load_icon(icon_name, 180)
    if icon:
        img.paste(icon, (CENTER - 90, CENTER - 320), icon)

    img = add_glow(img, tier_color, CENTER, CENTER, 200, intensity=30)
    img.save(f"{OUTPUT_DIR}/wins/wins_{value}.png")
    print(f"Generated Wins: {value}")

def generate_streaks_badge_v2(value, label, index, total):
    accent = ORANGE
    img, draw, tier_color = create_base_card("streaks", value, index, total, accent)
    
    # Large Number/Label
    font_num = load_font("SpaceGrotesk-Bold.ttf", 220)
    bbox = draw.textbbox((0, 0), label, font=font_num)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER - 100), label, font=font_num, fill=ORANGE)
    
    # Label
    sub_label = "DAY STREAK" if "Y" not in label else "STREAK"
    font_label = load_font("Inter-Medium.ttf", 50)
    bbox = draw.textbbox((0, 0), sub_label, font=font_label)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER + 120), sub_label, font=font_label, fill=WHITE)

    # Icon - Flame/Frozen
    icon = load_icon("frozen-icon.png", 180)
    if icon:
        img.paste(icon, (CENTER - 90, CENTER - 320), icon)

    img = add_glow(img, ORANGE, CENTER, CENTER, 200, intensity=30)
    img.save(f"{OUTPUT_DIR}/streaks/streak_{value}.png")
    print(f"Generated Streak: {value}")

def generate_fourdle_badge_v2(value, index, total):
    accent = GREEN
    img, draw, tier_color = create_base_card("fourdle", value, index, total, accent)
    
    # Large Number
    num_str = f"{value:,}"
    font_num = load_font("SpaceGrotesk-Bold.ttf", 200)
    bbox = draw.textbbox((0, 0), num_str, font=font_num)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER - 100), num_str, font=font_num, fill=GREEN)
    
    # Label
    label = "FOURDLE CLUB"
    font_label = load_font("Inter-Medium.ttf", 50)
    bbox = draw.textbbox((0, 0), label, font=font_label)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER + 120), label, font=font_label, fill=WHITE)

    # Visual motif: 4 dots
    for i in range(4):
        angle = math.radians(45 + i * 90)
        r = 280
        cx = CENTER + r * math.cos(angle)
        cy = CENTER + r * math.sin(angle)
        draw.ellipse([cx-15, cy-15, cx+15, cy+15], fill=GREEN)

    img = add_glow(img, GREEN, CENTER, CENTER, 200, intensity=30)
    img.save(f"{OUTPUT_DIR}/fourdle/fourdle_{value}.png")
    print(f"Generated Fourdle: {value}")

def generate_wordone_badge_v2(value, index, total):
    accent = SILVER
    img, draw, tier_color = create_base_card("wordone", value, index, total, accent)
    
    # Large Number
    num_str = str(value)
    font_num = load_font("SpaceGrotesk-Bold.ttf", 220)
    bbox = draw.textbbox((0, 0), num_str, font=font_num)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER - 100), num_str, font=font_num, fill=WHITE)
    
    # Label
    label = "WORD-IN-ONE"
    font_label = load_font("Inter-Medium.ttf", 50)
    bbox = draw.textbbox((0, 0), label, font=font_label)
    draw.text((CENTER - (bbox[2]-bbox[0])//2, CENTER + 120), label, font=font_label, fill=SILVER)

    # Icon - Bullseye (Simple draw)
    draw.ellipse([CENTER-250, CENTER-250, CENTER+250, CENTER+250], outline=WHITE, width=2)
    draw.ellipse([CENTER-300, CENTER-300, CENTER+300, CENTER+300], outline=WHITE, width=1)

    img = add_glow(img, WHITE, CENTER, CENTER, 250, intensity=20)
    img.save(f"{OUTPUT_DIR}/wordone/wordone_{value}.png")
    print(f"Generated Word-in-One: {value}")

# Values
WINS = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
STREAKS = [
    (7, "7"), (14, "14"), (30, "30"), (50, "50"), (100, "100"),
    (250, "250"), (365, "365"), (500, "500"),
    (730, "2Y"), (1095, "3Y"), (1460, "4Y"), (1825, "5Y"), (3650, "10Y")
]
FOURDLE = [4, 14, 24, 44, 104, 144, 244, 444, 844, 1444, 4444]
WORDONE = [1, 5, 10, 25, 50, 100]

if __name__ == "__main__":
    for i, v in enumerate(WINS):
        generate_wins_badge_v2(v, i, len(WINS))
    for i, (v, l) in enumerate(STREAKS):
        generate_streaks_badge_v2(v, l, i, len(STREAKS))
    for i, v in enumerate(FOURDLE):
        generate_fourdle_badge_v2(v, i, len(FOURDLE))
    for i, v in enumerate(WORDONE):
        generate_wordone_badge_v2(v, i, len(WORDONE))
    print("All V2 badges generated successfully.")
