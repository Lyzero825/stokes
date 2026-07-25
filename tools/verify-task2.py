"""Static verification for Task 2."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
main = (ROOT / "main.js").read_text(encoding="utf-8")

checks = [
    ('theme-color', 'meta name="theme-color" content="#0b0c0e"'),
    ("favicon.png", 'href="assets/favicon.png"'),
    ("logo.svg icon", 'href="assets/logo.svg" type="image/svg+xml"'),
    ("og:image relative", 'content="assets/og.png"'),
    ("og:url empty", 'property="og:url" content=""'),
    ("canonical empty", 'rel="canonical" href=""'),
    ("twitter:card", "summary_large_image"),
    ("absolutize og:image", 'meta[property="og:image"], meta[name="twitter:image"]'),
    ("absolutize path", 'siteUrl + "/assets/og.png"'),
]

print("=== head / main.js ===")
for name, needle in checks:
    src = html if "absolutize" not in name or name.startswith("og") or name in ("theme-color", "favicon", "logo", "canonical", "twitter") else main
    if name.startswith("absolutize"):
        src = main
    ok = needle in (html if name not in ("absolutize og:image", "absolutize path") else main)
    print(("OK" if ok else "FAIL"), name)

print("\n=== assets ===")
from PIL import Image

for name, exp in [("logo.png", (512, 512)), ("favicon.png", (32, 32)), ("og.png", (1200, 630))]:
    p = ROOT / "assets" / name
    if not p.exists():
        print("MISSING", name)
        continue
    im = Image.open(p)
    ok = im.size == exp
    print(("OK" if ok else "FAIL"), name, im.size, "bytes", p.stat().st_size)

print("\n=== README ===")
readme = ROOT / "README.md"
print("OK README" if readme.exists() and "siteUrl" in readme.read_text(encoding="utf-8") else "FAIL README")
