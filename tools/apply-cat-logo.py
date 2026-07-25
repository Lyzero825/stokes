"""Install cat logo PNG into ampere brand assets + SVG wrappers + OG mark."""
from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BG = "#0b0c0e"


def _font(serif: bool, size: int):
    from PIL import ImageFont

    candidates = (
        ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/GEORGIA.TTF"]
        if serif
        else [
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/Consolas.ttf",
        ]
    )
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def write_svg(path: Path, label: str, png_bytes: bytes) -> None:
    b64 = base64.b64encode(png_bytes).decode("ascii")
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        f'role="img" aria-label="{label}">\n'
        f'  <image width="512" height="512" '
        f'href="data:image/png;base64,{b64}"/>\n'
        f"</svg>\n",
        encoding="utf-8",
    )


def draw_og(mark: Image.Image) -> Image.Image:
    from PIL import ImageDraw

    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    mark_size = 176
    mark_cx, mark_cy = 280, h // 2
    m = mark.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    # rounded plate under mark (clip by paste with mask if RGBA)
    x0 = mark_cx - mark_size // 2
    y0 = mark_cy - mark_size // 2
    if m.mode == "RGBA":
        img.paste(m, (x0, y0), m)
    else:
        img.paste(m, (x0, y0))

    title_font = _font(True, 96)
    sub_font = _font(False, 28)
    tx = 520
    ty = h // 2 - 70
    draw.text((tx, ty), "ampere", fill="#e9e5d8", font=title_font)
    draw.text(
        (tx, ty + 110),
        "circulation around a closed wallet path · Γ · 2π",
        fill="#9a978c",
        font=sub_font,
    )
    return img


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src is None or not src.exists():
        # fallback: already-copied source in assets
        src = ASSETS / "logo-source.png"
    if not src.exists():
        raise SystemExit(f"missing source logo: {src}")

    ASSETS.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    im.save(ASSETS / "logo-source.png", optimize=True)

    logo = im.resize((512, 512), Image.Resampling.LANCZOS)
    logo.save(ASSETS / "logo.png", optimize=True)
    im.resize((32, 32), Image.Resampling.LANCZOS).save(
        ASSETS / "favicon.png", optimize=True
    )

    buf = io.BytesIO()
    logo.save(buf, format="PNG", optimize=True)
    png_bytes = buf.getvalue()
    write_svg(ASSETS / "logo.svg", "ampere", png_bytes)
    write_svg(ASSETS / "logo-mark.svg", "ampere mark", png_bytes)

    draw_og(logo).save(ASSETS / "og.png", optimize=True)
    print("wrote logo-source.png, logo.png, favicon.png, logo.svg, logo-mark.svg, og.png")


if __name__ == "__main__":
    main()
