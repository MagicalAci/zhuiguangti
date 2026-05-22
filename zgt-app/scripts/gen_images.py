#!/usr/bin/env python3
"""Generate product images, IP icons, and banners for the app."""

from PIL import Image, ImageDraw, ImageFont
import os, math, random

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD_DIR = os.path.join(BASE, "assets", "products")
IP_DIR = os.path.join(BASE, "assets", "ip")
BANNER_DIR = os.path.join(BASE, "assets", "banners")

os.makedirs(PROD_DIR, exist_ok=True)
os.makedirs(IP_DIR, exist_ok=True)
os.makedirs(BANNER_DIR, exist_ok=True)

PRODUCTS = [
    {"id": "badge_01", "name": "朔间零", "type": "吧唧", "colors": ["#7C3AED", "#A78BFA"], "emoji": "🎀"},
    {"id": "badge_02", "name": "天城一彩", "type": "吧唧", "colors": ["#F43F5E", "#FB7185"], "emoji": "🎀"},
    {"id": "badge_03", "name": "逆先夏目", "type": "吧唧", "colors": ["#3B82F6", "#93C5FD"], "emoji": "🎀"},
    {"id": "acrylic_01", "name": "月永レオ", "type": "亚克力", "colors": ["#F59E0B", "#FDE68A"], "emoji": "💎"},
    {"id": "paper_01", "name": "守沢千秋", "type": "色纸", "colors": ["#10B981", "#6EE7B7"], "emoji": "🎨"},
    {"id": "paper_02", "name": "明星色纸", "type": "色纸", "colors": ["#6366F1", "#A5B4FC"], "emoji": "🎨"},
    {"id": "poster_01", "name": "全员海报", "type": "海报", "colors": ["#EC4899", "#F9A8D4"], "emoji": "🖼️"},
    {"id": "keychain_01", "name": "限定挂件", "type": "盲盒挂件", "colors": ["#8B5CF6", "#C4B5FD"], "emoji": "🔑"},
    {"id": "candle_01", "name": "沈星回", "type": "香薰蜡烛", "colors": ["#DC2626", "#FCA5A5"], "emoji": "🕯️"},
    {"id": "candle_02", "name": "秦彻", "type": "香薰蜡烛", "colors": ["#7C3AED", "#C4B5FD"], "emoji": "🕯️"},
    {"id": "candle_03", "name": "黎深", "type": "香薰蜡烛", "colors": ["#0891B2", "#67E8F9"], "emoji": "🕯️"},
    {"id": "candle_04", "name": "祁煜", "type": "香薰蜡烛", "colors": ["#EA580C", "#FDBA74"], "emoji": "🕯️"},
    {"id": "giftbox_01", "name": "全员套装", "type": "礼盒", "colors": ["#BE123C", "#FDA4AF"], "emoji": "🎊"},
    {"id": "sticker_01", "name": "角色贴纸", "type": "贴纸", "colors": ["#4F46E5", "#A5B4FC"], "emoji": "⭐"},
    {"id": "bookmark_01", "name": "角色书签", "type": "书签", "colors": ["#059669", "#6EE7B7"], "emoji": "📑"},
    {"id": "standee_01", "name": "角色立牌", "type": "立牌", "colors": ["#D97706", "#FDE68A"], "emoji": "🏆"},
]

IPS = [
    {"id": "es", "name": "偶像梦幻祭", "short": "ES", "color": "#7C3AED"},
    {"id": "love", "name": "恋与深空", "short": "恋", "color": "#F43F5E"},
    {"id": "world", "name": "世界之外", "short": "世", "color": "#3B82F6"},
    {"id": "genshin", "name": "原神", "short": "原", "color": "#10B981"},
    {"id": "star", "name": "崩坏星穹铁道", "short": "崩", "color": "#F59E0B"},
    {"id": "blue", "name": "蔚蓝档案", "short": "蔚", "color": "#0EA5E9"},
]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def make_gradient(size, c1, c2, direction="diagonal"):
    """Create a gradient image."""
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    w, h = size
    for y in range(h):
        for x in range(w):
            if direction == "diagonal":
                t = (x / w + y / h) / 2
            else:
                t = y / h
            r = int(r1 + (r2 - r1) * t)
            g = int(g1 + (g2 - g1) * t)
            b = int(b1 + (b2 - b1) * t)
            draw.point((x, y), fill=(r, g, b))
    return img


def draw_circle(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def draw_rounded_rect(draw, x1, y1, x2, y2, r, fill):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill)


def gen_product_image(prod, size=400):
    """Generate a product card image."""
    c1, c2 = prod["colors"]
    img = make_gradient((size, size), c1, c2)
    draw = ImageDraw.Draw(img)

    # Decorative circles
    r1, g1, b1 = hex_to_rgb(c1)
    overlay = (min(r1 + 40, 255), min(g1 + 40, 255), min(b1 + 40, 255), 60)
    
    # Big decorative circle top-right
    img_rgba = img.convert("RGBA")
    overlay_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay_img)
    ov_draw.ellipse([size * 0.5, -size * 0.2, size * 1.3, size * 0.6], fill=(255, 255, 255, 25))
    ov_draw.ellipse([-size * 0.2, size * 0.5, size * 0.4, size * 1.1], fill=(255, 255, 255, 15))
    img_rgba = Image.alpha_composite(img_rgba, overlay_img)
    
    # Center product shape
    center_overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cd = ImageDraw.Draw(center_overlay)
    
    ptype = prod["type"]
    cx, cy = size // 2, size // 2 - 10
    
    if "吧唧" in ptype:
        # Circle badge
        cd.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(255, 255, 255, 180))
        cd.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(255, 255, 255, 230))
        cd.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=hex_to_rgb(c1) + (200,))
    elif "蜡烛" in ptype or "香薰" in ptype:
        # Candle shape
        cd.rounded_rectangle([cx - 35, cy - 50, cx + 35, cy + 60], radius=12, fill=(255, 255, 255, 200))
        # Flame
        cd.ellipse([cx - 8, cy - 70, cx + 8, cy - 50], fill=(255, 200, 50, 220))
        cd.ellipse([cx - 5, cy - 65, cx + 5, cy - 52], fill=(255, 240, 150, 250))
        # Wick
        cd.line([cx, cy - 50, cx, cy - 55], fill=(80, 60, 40, 200), width=2)
    elif "亚克力" in ptype:
        # Diamond/crystal shape
        points = [(cx, cy - 75), (cx + 55, cy), (cx, cy + 75), (cx - 55, cy)]
        cd.polygon(points, fill=(255, 255, 255, 180))
        inner = [(cx, cy - 50), (cx + 35, cy), (cx, cy + 50), (cx - 35, cy)]
        cd.polygon(inner, fill=(255, 255, 255, 220))
    elif "海报" in ptype or "色纸" in ptype:
        # Rectangle paper
        cd.rounded_rectangle([cx - 55, cy - 70, cx + 55, cy + 70], radius=6, fill=(255, 255, 255, 200))
        # Lines
        for ly in range(cy - 40, cy + 50, 16):
            cd.line([cx - 35, ly, cx + 35, ly], fill=hex_to_rgb(c2) + (80,), width=2)
    elif "挂件" in ptype or "钥匙" in ptype:
        # Keychain
        cd.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=(255, 255, 255, 200))
        cd.ellipse([cx - 10, cy - 80, cx + 10, cy - 60], fill=(200, 200, 200, 200))
        cd.line([cx, cy - 60, cx, cy - 40], fill=(180, 180, 180, 200), width=3)
    elif "礼盒" in ptype or "套装" in ptype:
        # Gift box
        cd.rounded_rectangle([cx - 60, cy - 45, cx + 60, cy + 55], radius=8, fill=(255, 255, 255, 200))
        # Ribbon
        cd.rectangle([cx - 8, cy - 45, cx + 8, cy + 55], fill=hex_to_rgb(c1) + (150,))
        cd.rectangle([cx - 60, cy - 5, cx + 60, cy + 8], fill=hex_to_rgb(c1) + (150,))
        # Bow
        cd.ellipse([cx - 25, cy - 60, cx, cy - 40], fill=hex_to_rgb(c1) + (180,))
        cd.ellipse([cx, cy - 60, cx + 25, cy - 40], fill=hex_to_rgb(c1) + (180,))
    elif "贴纸" in ptype:
        # Star shape
        for angle_off in range(5):
            a = math.radians(angle_off * 72 - 90)
            x1 = cx + int(60 * math.cos(a))
            y1 = cy + int(60 * math.sin(a))
            cd.ellipse([x1 - 20, y1 - 20, x1 + 20, y1 + 20], fill=(255, 255, 255, 160))
        cd.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=(255, 255, 255, 220))
    elif "书签" in ptype:
        cd.rounded_rectangle([cx - 25, cy - 75, cx + 25, cy + 75], radius=8, fill=(255, 255, 255, 200))
        # Notch at bottom
        cd.polygon([(cx - 25, cy + 55), (cx, cy + 40), (cx + 25, cy + 55), (cx + 25, cy + 75), (cx - 25, cy + 75)], fill=hex_to_rgb(c1) + (100,))
    elif "立牌" in ptype:
        # Standee
        cd.rounded_rectangle([cx - 45, cy - 65, cx + 45, cy + 50], radius=10, fill=(255, 255, 255, 200))
        # Base
        cd.rounded_rectangle([cx - 55, cy + 45, cx + 55, cy + 65], radius=5, fill=(200, 200, 200, 180))
    else:
        cd.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], fill=(255, 255, 255, 200))
    
    img_rgba = Image.alpha_composite(img_rgba, center_overlay)
    
    # Add name text at bottom
    text_overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_overlay)
    # Dark bottom strip
    td.rounded_rectangle([0, size - 80, size, size], radius=0, fill=(0, 0, 0, 80))
    img_rgba = Image.alpha_composite(img_rgba, text_overlay)
    
    img_final = img_rgba.convert("RGB")
    path = os.path.join(PROD_DIR, f"{prod['id']}.png")
    img_final.save(path, "PNG")
    print(f"  Product: {path}")


def gen_ip_icon(ip, size=120):
    """Generate an IP category icon."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    r, g, b = hex_to_rgb(ip["color"])
    # Rounded rect bg
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 4, fill=(r, g, b, 255))
    # Inner lighter circle
    draw.ellipse([size * 0.2, size * 0.2, size * 0.8, size * 0.8], fill=(min(r + 30, 255), min(g + 30, 255), min(b + 30, 255), 200))
    
    path = os.path.join(IP_DIR, f"{ip['id']}.png")
    img.convert("RGB").save(path, "PNG")
    print(f"  IP icon: {path}")


def gen_banner(idx, size=(800, 360)):
    """Generate a banner image."""
    colors_pairs = [
        ("#7C3AED", "#EC4899"),
        ("#3B82F6", "#8B5CF6"),
        ("#F43F5E", "#F97316"),
    ]
    c1, c2 = colors_pairs[idx % len(colors_pairs)]
    img = make_gradient(size, c1, c2, "diagonal")
    
    img_rgba = img.convert("RGBA")
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Decorative circles
    od.ellipse([size[0] * 0.6, -size[1] * 0.3, size[0] * 1.2, size[1] * 0.5], fill=(255, 255, 255, 20))
    od.ellipse([-size[0] * 0.1, size[1] * 0.4, size[0] * 0.4, size[1] * 1.2], fill=(255, 255, 255, 15))
    # Card shapes
    od.rounded_rectangle([size[0] * 0.6, size[1] * 0.15, size[0] * 0.85, size[1] * 0.85], radius=20, fill=(255, 255, 255, 40))
    od.rounded_rectangle([size[0] * 0.65, size[1] * 0.2, size[0] * 0.9, size[1] * 0.9], radius=20, fill=(255, 255, 255, 30))
    
    img_rgba = Image.alpha_composite(img_rgba, overlay)
    
    path = os.path.join(BANNER_DIR, f"banner_{idx + 1}.png")
    img_rgba.convert("RGB").save(path, "PNG")
    print(f"  Banner: {path}")


print("Generating product images...")
for prod in PRODUCTS:
    gen_product_image(prod)

print("\nGenerating IP icons...")
for ip in IPS:
    gen_ip_icon(ip)

print("\nGenerating banners...")
for i in range(3):
    gen_banner(i)

print("\nDone! All images generated.")
