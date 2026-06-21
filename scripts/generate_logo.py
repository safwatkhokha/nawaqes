#!/usr/bin/env python3
"""
Nawaqes Logo Generator
Creates a professional logo with Arabic identity (نواقص) for the app.
Theme: Red-to-yellow gradient (matching the project's HF Spaces theme).
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# Output directories
OUT_DIR = "/home/z/my-project/nawaqes-apk/assets"
os.makedirs(OUT_DIR, exist_ok=True)

# Color palette (matching README.md HF Spaces theme: red -> yellow)
COLORS = {
    "red_primary": (220, 38, 38),
    "red_deep":    (185, 28, 28),
    "orange_mid":  (249, 115, 22),
    "amber":       (245, 158, 11),
    "yellow_top":  (251, 191, 36),
    "white":       (255, 255, 255),
    "dark_bg":     (30, 12, 12),
    "cream":       (255, 247, 230),
}


def get_font(size: int, bold: bool = True):
    candidates = [
        "/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.otf",
        "/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.otf",
        "/usr/share/fonts/truetype/chinese/NotoSansSC-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_vertical_gradient(draw, size, c1, c2):
    w, h = size
    for y in range(h):
        ratio = y / max(h - 1, 1)
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def make_master_logo(size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(size * 0.04)
    bg_box = (margin, margin, size - margin, size - margin)
    radius = int(size * 0.22)

    grad = Image.new("RGB", (size, size), COLORS["red_primary"])
    gdraw = ImageDraw.Draw(grad)
    draw_vertical_gradient(gdraw, (size, size), COLORS["yellow_top"], COLORS["red_deep"])

    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle(bg_box, radius=radius, fill=255)

    img.paste(grad, (0, 0), mask)

    # Top highlight glow
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse(
        [int(size * 0.1), int(size * -0.3), int(size * 0.9), int(size * 0.5)],
        fill=(255, 255, 255, 60),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(size / 20))
    highlight_masked = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    highlight_masked.paste(highlight, (0, 0), mask)
    img.alpha_composite(highlight_masked)

    # Central emblem - white circle with subtle shadow
    cx, cy = size // 2, size // 2
    emblem_size = int(size * 0.45)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        [cx - emblem_size // 2 + int(size * 0.015),
         cy - emblem_size // 2 + int(size * 0.02),
         cx + emblem_size // 2 + int(size * 0.015),
         cy + emblem_size // 2 + int(size * 0.02)],
        fill=(0, 0, 0, 80),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(size / 50))
    img.alpha_composite(shadow)

    draw.ellipse(
        [cx - emblem_size // 2, cy - emblem_size // 2,
         cx + emblem_size // 2, cy + emblem_size // 2],
        fill=COLORS["white"]
    )

    # Stylized Arabic "ن" using thick arc + dot
    stroke_w = int(size * 0.055)
    inner_r = int(emblem_size * 0.32)

    arc_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arc_img)

    start_angle = 20
    end_angle = 200
    steps = 80
    for i in range(steps):
        t1 = start_angle + (end_angle - start_angle) * i / steps
        t2 = start_angle + (end_angle - start_angle) * (i + 1) / steps
        x1 = cx + inner_r * math.cos(math.radians(t1))
        y1 = cy - inner_r * math.sin(math.radians(t1))
        x2 = cx + inner_r * math.cos(math.radians(t2))
        y2 = cy - inner_r * math.sin(math.radians(t2))
        ad.line([(x1, y1), (x2, y2)], fill=COLORS["red_deep"], width=stroke_w)

    tail_start_angle = 200
    tx = cx + inner_r * math.cos(math.radians(tail_start_angle))
    ty = cy - inner_r * math.sin(math.radians(tail_start_angle))
    ad.line(
        [(tx, ty), (tx + int(size * 0.04), ty + int(size * 0.08))],
        fill=COLORS["red_deep"], width=stroke_w
    )

    dot_r = int(size * 0.04)
    ad.ellipse(
        [cx + int(inner_r * 0.6) - dot_r,
         cy - inner_r - dot_r - int(size * 0.03),
         cx + int(inner_r * 0.6) + dot_r,
         cy - inner_r + dot_r - int(size * 0.03)],
        fill=COLORS["amber"]
    )

    img.alpha_composite(arc_img)

    # Outer ring
    draw.rounded_rectangle(bg_box, radius=radius,
                           outline=(255, 255, 255, 90),
                           width=int(size * 0.012))

    return img


def make_wordmark(size: int = 1200) -> Image.Image:
    icon_size = int(size * 0.5)
    icon = make_master_logo(icon_size)

    img = Image.new("RGBA", (size, icon_size), (0, 0, 0, 0))
    img.paste(icon, (int(size * 0.05), 0), icon)

    font_size = int(icon_size * 0.45)
    font = get_font(font_size, bold=True)
    font_small = get_font(int(font_size * 0.45), bold=False)

    text_x = int(size * 0.05) + icon_size + int(size * 0.04)
    text_y_ar = int(icon_size * 0.18)
    text_y_en = int(icon_size * 0.62)

    draw = ImageDraw.Draw(img)
    draw.text((text_x, text_y_ar), "نواقص",
              font=font, fill=COLORS["dark_bg"])
    draw.text((text_x, text_y_en), "Nawaqes",
              font=font_small, fill=COLORS["red_primary"])

    return img


def make_splash(size: tuple = (1080, 1920)) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", (w, h), COLORS["dark_bg"])

    grad = Image.new("RGB", (w, h), COLORS["red_deep"])
    gdraw = ImageDraw.Draw(grad)
    draw_vertical_gradient(gdraw, (w, h), COLORS["red_deep"], COLORS["dark_bg"])
    img.paste(grad, (0, 0))

    logo_size = int(w * 0.42)
    logo = make_master_logo(logo_size)
    img.alpha_composite(logo, ((w - logo_size) // 2, int(h * 0.32)))

    font_ar = get_font(int(w * 0.09), bold=True)
    font_en = get_font(int(w * 0.045), bold=False)
    draw = ImageDraw.Draw(img)
    draw.text((w // 2, int(h * 0.72)), "نواقص",
              font=font_ar, fill=COLORS["white"], anchor="mm")
    draw.text((w // 2, int(h * 0.78)), "Nawaqes — Smart Ads Platform",
              font=font_en, fill=COLORS["amber"], anchor="mm")

    return img


def main():
    logo_1024 = make_master_logo(1024)
    logo_1024.save(f"{OUT_DIR}/icon-1024.png", "PNG")
    print(f"OK icon-1024.png")

    for size in [512, 192, 180, 152, 144, 96, 72, 48, 32]:
        logo = make_master_logo(size)
        logo.save(f"{OUT_DIR}/icon-{size}x{size}.png", "PNG")
        print(f"OK icon-{size}x{size}.png")

    logo_1024.resize((180, 180)).save(f"{OUT_DIR}/apple-touch-icon.png", "PNG")
    print(f"OK apple-touch-icon.png")

    maskable = Image.new("RGBA", (512, 512), COLORS["red_deep"])
    grad = Image.new("RGB", (512, 512), COLORS["red_primary"])
    gdraw = ImageDraw.Draw(grad)
    draw_vertical_gradient(gdraw, (512, 512), COLORS["yellow_top"], COLORS["red_deep"])
    maskable.paste(grad, (0, 0))
    inner = make_master_logo(int(512 * 0.62))
    maskable.alpha_composite(inner, ((512 - inner.width) // 2, (512 - inner.height) // 2))
    maskable.save(f"{OUT_DIR}/maskable-icon-512x512.png", "PNG")
    print(f"OK maskable-icon-512x512.png")

    favicon = make_master_logo(64)
    favicon.save(f"{OUT_DIR}/favicon.png", "PNG")
    favicon.resize((32, 32)).save(f"{OUT_DIR}/favicon-32.png", "PNG")
    favicon.resize((16, 16)).save(f"{OUT_DIR}/favicon-16.png", "PNG")
    print(f"OK favicon set")

    wm = make_wordmark(1200)
    wm.save(f"{OUT_DIR}/wordmark-1200x600.png", "PNG")
    print(f"OK wordmark-1200x600.png")

    splash = make_splash((1080, 1920))
    splash.save(f"{OUT_DIR}/splash-1080x1920.png", "PNG")
    print(f"OK splash-1080x1920.png")

    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, sz in android_sizes.items():
        out = f"/home/z/my-project/nawaqes-apk/apk-source/res/{folder}"
        os.makedirs(out, exist_ok=True)
        logo_1024.resize((sz, sz)).save(f"{out}/ic_launcher.png", "PNG")
        logo_1024.resize((sz, sz)).save(f"{out}/ic_launcher_round.png", "PNG")
        print(f"OK {folder}/ic_launcher.png ({sz}x{sz})")

    out = "/home/z/my-project/nawaqes-apk/apk-source/res/mipmap-xxxhdpi"
    logo_1024.resize((512, 512)).save(f"{out}/ic_launcher_playstore.png", "PNG")
    print(f"OK ic_launcher_playstore.png (512x512)")

    hero = make_splash((1200, 630))
    hero.save(f"{OUT_DIR}/og-image-1200x630.png", "PNG")
    print(f"OK og-image-1200x630.png")

    print("\nDONE all icons generated at:", OUT_DIR)


if __name__ == "__main__":
    main()
