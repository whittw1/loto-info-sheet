"""Generate placeholder app icon + splash for LOTO Collector.

Outputs:
- assets/icon-only.png        1024x1024 — Capacitor @capacitor/assets input
- assets/icon-foreground.png  1024x1024 — adaptive icon foreground (transparent)
- assets/icon-background.png  1024x1024 — adaptive icon background (solid)
- assets/splash.png           2732x2732 — splash, light/default
- assets/splash-dark.png      2732x2732 — splash, dark variant

Run: python3 assets/make_icon.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

BG = "#1a1f2e"
FG = "#ffffff"
ACCENT = "#4a9eff"
HERE = Path(__file__).parent


def font_for(px: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, font, fill, canvas_w, canvas_h):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (canvas_w - w) / 2 - bbox[0]
    y = (canvas_h - h) / 2 - bbox[1]
    draw.text((x, y), text, fill=fill, font=font)


def make_icon_only(size=1024):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    # Subtle inset border for visual structure
    pad = int(size * 0.10)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * 0.05),
        outline=ACCENT,
        width=int(size * 0.012),
    )
    draw_centered_text(draw, "LOTO", font_for(int(size * 0.28)), FG, size, size)
    img.save(HERE / "icon-only.png")


def make_icon_foreground(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_centered_text(draw, "LOTO", font_for(int(size * 0.28)), FG, size, size)
    img.save(HERE / "icon-foreground.png")


def make_icon_background(size=1024):
    img = Image.new("RGB", (size, size), BG)
    img.save(HERE / "icon-background.png")


def make_splash(size=2732, dark=False):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    draw_centered_text(draw, "LOTO", font_for(int(size * 0.14)), FG, size, size)
    name = "splash-dark.png" if dark else "splash.png"
    img.save(HERE / name)


if __name__ == "__main__":
    make_icon_only()
    make_icon_foreground()
    make_icon_background()
    make_splash(dark=False)
    make_splash(dark=True)
    print("wrote:", *[p.name for p in HERE.glob("*.png")])
