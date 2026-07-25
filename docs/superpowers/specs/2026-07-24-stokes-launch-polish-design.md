# Stokes — Launch Polish (Option A) Design

Date: 2026-07-24  
Status: approved direction (A + config-driven polish); awaiting user review of this spec  
Product type: `instrument` (+ manuscript essay) · Mark voice

## Goal

Ship a **finished static site** that opens cleanly, shares correctly, and keeps Mark honesty (illustrative gauge, token = flag, CA/X TBA). Domain and Twitter come later; the page must not pretend they exist.

## Non-goals

- Live chain path ingestion
- Fake domain / Twitter / CA links
- Full Mark template rewrite
- Deploy CI / hosting setup
- Telegram / Discord / roadmap chrome

## Current baseline

Static site under `stokes/`:

| Piece | State |
|---|---|
| `index.html` | Manuscript + instrument + source/note overlays; Mark copy |
| `style.css` | Manuscript + desk styles; mobile hides some top-links |
| `main.js` | Hash routing, gauge, interactive desk (illustrative) |
| `assets/logo.svg`, `logo-mark.svg` | Brand marks |
| `assets/logo.png`, `favicon.png` | Present on disk (small PNGs); verify quality for favicon/OG |

Gaps vs “finished”:

1. No centralized launch config (CA / X / site URL)
2. Incomplete social meta (OG / Twitter card / canonical)
3. No dedicated OG share image
4. Top bar shows raw `CA TBA` without a clean X slot for later fill-in
5. Mobile top-bar aggressively hides overlays/CA
6. Asset pipeline not documented (SVG → PNG sizes)

## Approach

**Config-driven polish** (chosen over minimal fix or full rewrite).

One small config object in `main.js` (or a tiny inline `<script>` before `main.js`) drives chrome that depends on launch facts:

```js
window.STOKES = {
  siteUrl: "",          // e.g. "https://stokes.example" — empty = relative / omit absolute OG
  xUrl: "",            // e.g. "https://x.com/stokes" — empty = show TBA, not a dead link
  ca: "",               // full mint — empty = "CA TBA"
  caShort: "",          // optional display trunc
  gmgnUrl: "",          // optional; empty = omit
};
```

Rules:

- Empty `xUrl` → top bar shows muted `x · TBA` (not `<a href="#">`)
- Non-empty `xUrl` → real link `x`
- Empty `ca` → `CA TBA` (text)
- Non-empty `ca` → short display + link to explorer or `gmgnUrl` if set
- Honesty copy in manuscript stays; only the chrome/readouts sync from config

## Work items

### 1. Head / share

- Keep title + description (Mark tone already present)
- Add: `theme-color`, favicon (png + svg if useful), apple-touch-icon
- Add Open Graph + Twitter card tags:
  - `og:title`, `og:description`, `og:type`, `og:image`
  - `twitter:card` = `summary_large_image`
  - `og:url` / canonical: only emit absolute URL when `siteUrl` is set; otherwise omit or use relative image paths that hosts can resolve later
- Add `assets/og.png` (1200×630): paper `#0b0c0e`, lime accent, wordmark `stokes`, one mono line (`circulation · Γ · 2π`). No fake CA, no hype.

### 2. Brand assets

- Audit `logo.png` / `favicon.png` (size, sharpness). If too soft/small, regenerate from `logo.svg` at 512 and 32/180.
- Point HTML icons at verified files; keep SVG as source of truth.

### 3. Top chrome

Target structure:

`manuscript · instrument · source/of/code · dev/note · x · CA …`

- Insert X slot driven by config (TBA vs link)
- CA slot driven by config
- Mobile: prefer keeping brand + instrument + x/CA visibility; collapse source/note into manuscript hero links if needed (adjust CSS so launch facts stay visible)

### 4. Footer / honesty sync

- Footer line may list `x · source` when X exists; otherwise keep current disclaimer only
- Do not invent socials

### 5. Motion / polish (light)

- Keep existing cursor trail + gauge + desk (already ≥2 intentional motions)
- Ensure `prefers-reduced-motion` paths remain correct
- Fix any obvious mobile desk control overflow; canvas scales already via CSS

### 6. Accessibility / hygiene

- Overlay close + Escape already present — keep
- Decorative images: empty `alt` OK for brand marks in chrome; OG image not in body
- Ensure `hidden` views and overlay `aria-hidden` stay consistent

## File touch list

| File | Change |
|---|---|
| `index.html` | Meta/OG, icon links, top-bar slots, optional config bootstrap |
| `main.js` | `STOKES` defaults + apply chrome from config |
| `style.css` | Top-bar / mobile rules for new slots |
| `assets/og.png` | New share image |
| `assets/logo.png`, `favicon.png` | Regenerate if audit fails |
| `README.md` (optional, short) | How to fill `STOKES` when domain/X/CA land |

## Acceptance criteria

1. Open `index.html` locally: manuscript + instrument + overlays work
2. No broken image icons in head/topbar
3. Sharing tags present; OG image file exists
4. With empty config: page shows honest TBA for X/CA, no fake hrefs
5. Filling `STOKES` fields updates top chrome without hunting copy
6. Mobile first viewport readable; instrument usable
7. Copy still Mark: illustrative, flag unwired, no hype

## Later (out of this spec)

- Paste real `siteUrl` / `xUrl` / `ca` / `gmgnUrl`
- Live path ingestion (Option C)
- Hosting / DNS

## Self-review notes

- No TBD mechanisms left: TBA is an explicit empty-config state
- Scope capped at Option A; chain ingestion excluded
- Absolute OG URL behavior explicit (emit only when `siteUrl` set)
