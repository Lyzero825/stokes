"""Generate ampere PNG assets from brand spec (Pillow)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

BG = "#0b0c0e"
LIME = "#bfff00"
DOT = "#0a0a0a"


def _font(serif: bool, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/GEORGIA.TTF"]
        if serif
        else [
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/Consolas.ttf",
            "C:/Windows/Fonts/lucon.ttf",
        ]
    )
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def draw_logo(size: int) -> Image.Image:
    # Solid lime plate + black contour integral ∮ (no dark outer field)
    img = Image.new("RGBA", (size, size), LIME)
    draw = ImageDraw.Draw(img)
    scale = size / 512
    cx = cy = size / 2
    mark_size = max(10, int(220 * scale * 0.95))
    font = _font(True, mark_size)
    for path in (
        "C:/Windows/Fonts/seguisym.ttf",
        "C:/Windows/Fonts/seguibli.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ):
        p = Path(path)
        if p.exists():
            try:
                font = ImageFont.truetype(str(p), mark_size)
                break
            except OSError:
                pass
    ch = "∮"
    bbox = draw.textbbox((0, 0), ch, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - th * 0.02),
        ch,
        fill=DOT,
        font=font,
    )
    return img


def draw_og() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # Accent mark — solid lime plate + contour integral
    mark_cx, mark_cy = 280, h // 2
    mark_r = 88
    draw.rounded_rectangle(
        (mark_cx - mark_r, mark_cy - mark_r, mark_cx + mark_r, mark_cy + mark_r),
        radius=18,
        fill=LIME,
    )
    mark_font = _font(True, 96)
    for path in (
        "C:/Windows/Fonts/seguisym.ttf",
        "C:/Windows/Fonts/seguibli.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ):
        p = Path(path)
        if p.exists():
            try:
                mark_font = ImageFont.truetype(str(p), 96)
                break
            except OSError:
                pass
    ch = "∮"
    bbox = draw.textbbox((0, 0), ch, font=mark_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (mark_cx - tw / 2 - bbox[0], mark_cy - th / 2 - bbox[1] - th * 0.02),
        ch,
        fill=DOT,
        font=mark_font,
    )

    # Contour loop around the disc (circulation feel)
    loop_cx, loop_cy = mark_cx, mark_cy
    loop_rx, loop_ry = 150, 118
    import math

    pts = []
    for i in range(64):
        t = i / 64 * math.tau
        wobble = 0.14 * math.sin(3 * t) + 0.08 * math.sin(5 * t + 0.6)
        rx = loop_rx * (1 + wobble)
        ry = loop_ry * (1 - wobble * 0.4)
        pts.append((loop_cx + rx * math.cos(t), loop_cy + ry * math.sin(t)))
    draw.line(pts + [pts[0]], fill=(191, 255, 0, 120), width=2)

    # Wordmark + subtitle
    title_font = _font(True, 96)
    sub_font = _font(False, 28)
    title = "ampere"
    subtitle = "circulation around a closed wallet path · Γ · 2π"

    tx = 520
    ty = h // 2 - 70
    draw.text((tx, ty), title, fill="#e9e5d8", font=title_font)
    sb = draw.textbbox((0, 0), subtitle, font=sub_font)
    draw.text((tx, ty + 110), subtitle, fill="#9a978c", font=sub_font)

    return img


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    draw_logo(512).save(ASSETS / "logo.png", optimize=True)
    draw_logo(32).save(ASSETS / "favicon.png", optimize=True)
    draw_og().save(ASSETS / "og.png", optimize=True)
    print("wrote logo.png, favicon.png, og.png")


if __name__ == "__main__":
    main()
