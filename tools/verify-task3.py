"""Task 3 acceptance checks (static + optional Playwright)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
main = (ROOT / "main.js").read_text(encoding="utf-8")
css = (ROOT / "style.css").read_text(encoding="utf-8")

failures: list[str] = []


def check(name: str, ok: bool) -> None:
    print(("PASS" if ok else "FAIL"), name)
    if not ok:
        failures.append(name)


# Orphan dot fix
check("top-launch-sep present", "top-launch-sep" in html)
check(
    "dot before x inside top-extra tail",
    re.search(r'dev/note</a>\s*<span class="dot">·</span>\s*</span>', html) is not None,
)
check("top-launch-sep default hidden", ".top-launch-sep { display: none; }" in css)
check(
    "top-launch-sep shown on mobile",
    re.search(
        r"@media \(max-width: 960px\)[\s\S]*?\.top-launch-sep \{ display: inline; \}", css
    )
    is not None,
)

# Empty bootstrap config
for key in ("siteUrl", "xUrl", "ca", "caShort", "gmgnUrl"):
    check(f"STOKES.{key} empty", re.search(rf'{key}:\s*""', html) is not None)

# Reduced motion + overlay sanity (code paths)
check("hero gauge single frame on reduceMotion", "if (reduceMotion) drawFrame(0);" in main)
check("cursor trail gated", "reduceMotion || !finePointer" in main)
check("css hides cursor-trail coarse/reduce", "prefers-reduced-motion: reduce" in css)
check("escape closes overlays", 'e.key === "Escape"' in main)

# TBA / no fake social hrefs in markup
check("link-x default span TBA", 'id="link-x" class="dim launch-slot"' in html and "x · TBA" in html)
check("ca-slot default span TBA", 'id="ca-slot" class="dim launch-slot"' in html and "CA TBA" in html)

# Share + assets
for needle in (
    'property="og:image" content="assets/og.png"',
    'name="twitter:card" content="summary_large_image"',
    'href="assets/favicon.png"',
    'src="assets/logo.png"',
):
    check(f"head/ref {needle[:40]}", needle in html)

for asset in ("favicon.png", "logo.png", "logo.svg", "og.png"):
    check(f"asset exists {asset}", (ROOT / "assets" / asset).exists())

# Copy tone markers
check("illustrative label", "illustrative" in html)
check("flag not wired", "not wired to the math" in html)

# Playwright runtime checks (optional)
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("SKIP playwright (not installed)")
    sys.exit(1 if failures else 0)

BASE = "http://127.0.0.1:8765"


def dot_count_topbar(page) -> int:
    return page.evaluate(
        """() => {
          const nav = document.querySelector('.top-links');
          if (!nav) return -1;
          const text = nav.innerText.replace(/\\s+/g, ' ').trim();
          const m = text.match(/instrument(.*?)x/s);
          if (!m) return -1;
          return (m[1].match(/·/g) || []).length;
        }"""
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto(BASE + "/", wait_until="networkidle")
    check("manuscript view active", page.locator(".view-manuscript").is_visible())
    check("gauge canvas present", page.locator("#gauge").count() == 1)

    page.goto(BASE + "/#/instrument", wait_until="networkidle")
    check("instrument view visible", page.locator(".view-instrument").is_visible())

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE + "/#/instrument", wait_until="networkidle")
    grid_cols = page.evaluate(
        "() => getComputedStyle(document.querySelector('.desk-grid')).gridTemplateColumns"
    )
    check("controls stack single column at 390px", " " not in grid_cols.strip())

    before = page.locator("#readout-gamma").inner_text()
    page.select_option("#regime", "wash")
    after = page.locator("#readout-gamma").inner_text()
    check("regime changes gamma readout", before != after)

    page.goto(BASE + "/#/source", wait_until="networkidle")
    check("source overlay open", page.locator("#overlay-source.open").count() == 1)
    page.keyboard.press("Escape")
    check("escape closes overlay", page.locator("#overlay-source.open").count() == 0)

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE + "/", wait_until="networkidle")
    dots = dot_count_topbar(page)
    check("mobile single dot before x (not orphan double)", dots == 1)
    check(
        "mobile no horizontal scroll",
        page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"),
    )
    check("mobile top-extra hidden", page.evaluate(
        "() => getComputedStyle(document.querySelector('.top-extra')).display === 'none'"
    ))
    visible = page.evaluate(
        """() => {
          const nav = document.querySelector('.top-links');
          return nav ? nav.innerText.replace(/\\s+/g,' ').trim() : '';
        }"""
    )
    check("mobile topbar has manuscript/instrument/x/CA", all(
        x in visible.lower() for x in ("manuscript", "instrument", "x", "ca")
    ))

    # prefers-reduced-motion: reduce (must emulate before navigation)
    rm_page = browser.new_page()
    rm_page.emulate_media(reduced_motion="reduce")
    rm_page.goto(BASE + "/", wait_until="networkidle")

    def gauge_opaque_count(page) -> int:
        return page.evaluate(
            """() => {
              const c = document.getElementById('gauge');
              if (!c) return -1;
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
              let n = 0;
              for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
              return n;
            }"""
        )

    rm_pixels_a = gauge_opaque_count(rm_page)
    rm_page.wait_for_timeout(400)
    rm_pixels_b = gauge_opaque_count(rm_page)
    check("reduceMotion gauge draws frame (non-empty canvas)", rm_pixels_a > 0)
    check("reduceMotion gauge static (single frame)", rm_pixels_a == rm_pixels_b)
    check(
        "reduceMotion cursor trail hidden",
        rm_page.evaluate(
            """() => {
              const el = document.getElementById('cursorTrail');
              if (!el) return false;
              return getComputedStyle(el).display === 'none' || el.style.display === 'none';
            }"""
        ),
    )

    # Filled STOKES smoke (init script only; bootstrap in index.html stays "")
    fill_page = browser.new_page()
    fill_page.add_init_script(
        """
        window.STOKES = {
          xUrl: 'https://x.com/stokes_test',
          ca: 'So11111111111111111111111111111111111111112',
          caShort: 'So11…1112',
          gmgnUrl: 'https://gmgn.ai/sol/token/test'
        };
        """
    )
    fill_page.goto(BASE + "/", wait_until="networkidle")
    check(
        "filled STOKES x becomes anchor",
        fill_page.evaluate(
            """() => {
              const el = document.getElementById('link-x');
              return el && el.tagName === 'A' && el.href.includes('x.com/stokes_test');
            }"""
        ),
    )
    check(
        "filled STOKES ca becomes gmgn anchor",
        fill_page.evaluate(
            """() => {
              const el = document.getElementById('ca-slot');
              return el && el.tagName === 'A' && el.href.includes('gmgn.ai');
            }"""
        ),
    )

    browser.close()

sys.exit(1 if failures else 0)
