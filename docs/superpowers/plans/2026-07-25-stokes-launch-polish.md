# Stokes Launch Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Stokes static site as Option A polish — config-driven X/CA chrome, complete head/OG assets, honest TBA states, mobile-readable top bar — without live chain ingestion.

**Architecture:** Keep the existing single-page manuscript + instrument shell. Add `window.STOKES` launch config applied once on boot to top-bar slots and optional absolute OG URL. Assets stay under `assets/`; SVG remains source of truth for the mark.

**Tech Stack:** Static HTML / CSS / vanilla JS · local file open or any static host · no build step

## Global Constraints

- Mark voice · product type `instrument` (+ manuscript): token = flag, illustrative until genesis, no hype
- Empty `siteUrl` / `xUrl` / `ca` / `gmgnUrl` must never produce fake `href="#"` social links
- Do not implement live path ingestion
- Do not invent domain, Twitter handle, or CA values
- Prefer editing existing `index.html` / `style.css` / `main.js` over new frameworks
- Do not git commit unless the user explicitly asks
- Spec source: `docs/superpowers/specs/2026-07-24-stokes-launch-polish-design.md`

## File map

| File | Responsibility |
|---|---|
| `index.html` | Markup, head meta/OG stubs, top-bar slot elements, config bootstrap script |
| `main.js` | Default `STOKES`, `applyLaunchChrome()`, routing/instrument unchanged |
| `style.css` | Top-bar + mobile visibility for X/CA slots |
| `assets/og.png` | 1200×630 share image |
| `assets/logo.png`, `assets/favicon.png` | Brand / favicon (regenerate if audit fails) |
| `README.md` | Short fill-in guide for `STOKES` when launch facts land |

---

### Task 1: Launch config + top-bar chrome

**Files:**
- Modify: `index.html` (top `<nav class="top-links">`, add bootstrap script before `main.js`)
- Modify: `main.js` (config defaults + apply function near top after DOM refs)
- Modify: `style.css` (`.top-links` TBA / link styles; mobile rules)

**Interfaces:**
- Produces: `window.STOKES = { siteUrl: string, xUrl: string, ca: string, caShort: string, gmgnUrl: string }`
- Produces: `applyLaunchChrome()` mutates `#link-x`, `#ca-slot` (and optional `#og-url` meta if present)
- Consumes: DOM ids `link-x`, `ca-slot`

- [ ] **Step 1: Replace top-bar CA span with X + CA slots in `index.html`**

Inside `.top-links`, after the `dev/note` link and its dot, replace `<span class="dim">CA TBA</span>` with:

```html
      <span class="dot">·</span>
      <span id="link-x" class="dim launch-slot" data-launch="x">x · TBA</span>
      <span class="dot">·</span>
      <span id="ca-slot" class="dim launch-slot" data-launch="ca">CA TBA</span>
```

- [ ] **Step 2: Add config bootstrap before `main.js`**

Just above `<script src="main.js"></script>`:

```html
  <script>
    window.STOKES = Object.assign({
      siteUrl: "",
      xUrl: "",
      ca: "",
      caShort: "",
      gmgnUrl: ""
    }, window.STOKES || {});
  </script>
  <script src="main.js"></script>
```

- [ ] **Step 3: Implement `applyLaunchChrome` in `main.js`**

Near the top of the IIFE (after overlay/view refs are fine; call before `applyRoute()` at bottom):

```js
  function truncateCa(ca) {
    const s = String(ca || "").trim();
    if (!s) return "";
    if (s.length <= 12) return s;
    return s.slice(0, 4) + "…" + s.slice(-4);
  }

  function applyLaunchChrome() {
    const cfg = window.STOKES || {};
    const xEl = document.getElementById("link-x");
    const caEl = document.getElementById("ca-slot");

    if (xEl) {
      const xUrl = String(cfg.xUrl || "").trim();
      if (xUrl) {
        const a = document.createElement("a");
        a.id = "link-x";
        a.href = xUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "x";
        a.className = "";
        xEl.replaceWith(a);
      } else {
        xEl.textContent = "x · TBA";
        xEl.classList.add("dim");
      }
    }

    if (caEl) {
      const ca = String(cfg.ca || "").trim();
      const short = String(cfg.caShort || "").trim() || truncateCa(ca);
      const gmgn = String(cfg.gmgnUrl || "").trim();
      if (!ca) {
        caEl.textContent = "CA TBA";
        caEl.classList.add("dim");
      } else if (gmgn) {
        const a = document.createElement("a");
        a.id = "ca-slot";
        a.href = gmgn;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "CA " + short;
        caEl.replaceWith(a);
      } else {
        caEl.textContent = "CA " + short;
        caEl.title = ca;
        caEl.classList.add("dim");
      }
    }

    const siteUrl = String(cfg.siteUrl || "").trim().replace(/\/$/, "");
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (siteUrl) {
      if (ogUrl) ogUrl.setAttribute("content", siteUrl + "/");
      if (canonical) canonical.setAttribute("href", siteUrl + "/");
    }
  }
```

Call `applyLaunchChrome();` immediately before `applyRoute();` at the end of the IIFE.

- [ ] **Step 4: CSS for slots + mobile visibility**

In `style.css`, add:

```css
.top-links .launch-slot { letter-spacing: 0.06em; }
.top-links a#link-x,
.top-links a#ca-slot { color: var(--muted); text-decoration: none; }
.top-links a#link-x:hover,
.top-links a#ca-slot:hover { color: var(--lime); }
```

Replace the mobile hide rule that currently hides `.top-links .dim` with a narrower rule so X/CA remain visible:

```css
@media (max-width: 960px) {
  .toc { display: none; }
  .col { padding-top: 64px; }
  section p,
  .overlay p { text-align: left; hyphens: none; }
  /* keep x / CA; collapse overlay links (still in hero) */
  .top-links a[data-overlay],
  .top-links .dot:has(+ a[data-overlay]),
  .top-links a[data-overlay] + .dot { display: none; }
  .desk-grid { grid-template-columns: 1fr; }
}
```

Note: `:has()` is fine for modern browsers; if avoiding `:has`, hide by wrapping source/note in `<span class="top-extra">…</span>` and use `.top-extra { display: none }` under the same media query instead (preferred if `:has` concerns).

Preferred markup alternative for reliable CSS: wrap source + note + their dots in:

```html
<span class="top-extra">
  <span class="dot">·</span>
  <a href="#/source" data-overlay="overlay-source">source/of/code</a>
  <span class="dot">·</span>
  <a href="#/note" data-overlay="overlay-note">dev/note</a>
</span>
```

Then mobile:

```css
@media (max-width: 960px) {
  .top-extra { display: none; }
}
```

Use the wrap approach (no `:has`).

- [ ] **Step 5: Verify empty config**

Open `index.html` in a browser. Expected top bar includes muted `x · TBA` and `CA TBA`, neither is a link. Clicking manuscript/instrument/source/note still works. Resize under 960px: source/note hide; x/CA remain.

- [ ] **Step 6: Verify filled config (temporary)**

In DevTools console:

```js
window.STOKES = { siteUrl: "https://example.com", xUrl: "https://x.com/example", ca: "SoL11111111111111111111111111111111111111112", caShort: "", gmgnUrl: "https://gmgn.ai" };
location.reload();
```

(Or temporarily set values in the bootstrap script, then revert to empty strings.) Expected: `x` and `CA SoL1…1112` are real links. Revert config to empty strings before finishing the task.

---

### Task 2: Head meta, icons, OG image

**Files:**
- Modify: `index.html` `<head>`
- Create: `assets/og.png` (1200×630)
- Possibly regenerate: `assets/favicon.png`, `assets/logo.png`
- Create: `README.md`

**Interfaces:**
- Consumes: `applyLaunchChrome` og:url / canonical behavior from Task 1
- Produces: share tags + `assets/og.png`

- [ ] **Step 1: Audit existing PNGs**

Check file sizes and dimensions of `assets/logo.png` and `assets/favicon.png`. If either is under ~32×32 usable sharpness or looks wrong, regenerate from `assets/logo.svg` (512×512 logo, 32×32 favicon) using a local converter (e.g. Inkscape/resvg/Sharp/browser canvas export). Keep SVG as source.

- [ ] **Step 2: Create `assets/og.png`**

Design: 1200×630, background `#0b0c0e`, lime `#bfff00` accent mark (disc + contour feel matching logo), wordmark `stokes` in serif/light, one mono subtitle: `circulation around a closed wallet path · Γ · 2π`. No CA, no “live”, no hype. Export PNG.

- [ ] **Step 3: Expand `<head>` in `index.html`**

Replace/extend icon + meta block after description with:

```html
  <meta name="theme-color" content="#0b0c0e" />
  <link rel="icon" href="assets/favicon.png" type="image/png" />
  <link rel="icon" href="assets/logo.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="assets/logo.png" />
  <meta property="og:title" content="stokes — circulation around a closed wallet path" />
  <meta property="og:description" content="Stokes keeps the running circulation of a wallet's closed trade path. The reading is the product. The token is a flag — not wired to the math." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="assets/og.png" />
  <meta property="og:url" content="" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="stokes — circulation around a closed wallet path" />
  <meta name="twitter:description" content="Circulation around a closed wallet path. The reading is the product. Token = flag — not wired to the math." />
  <meta name="twitter:image" content="assets/og.png" />
  <link rel="canonical" href="" />
```

Keep existing Google Fonts + `style.css` links. Absolute `og:url` / canonical filled only when `siteUrl` is set (Task 1). Relative `og:image` is acceptable until domain lands; when `siteUrl` is set, optionally also absolutize image URLs in `applyLaunchChrome`:

```js
    if (siteUrl) {
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => {
        m.setAttribute("content", siteUrl + "/assets/og.png");
      });
    }
```

Add that absolutize block inside the existing `if (siteUrl)` in `applyLaunchChrome`.

- [ ] **Step 4: Write short `README.md`**

```markdown
# stokes

Static desk: manuscript + instrument. The reading is the product. Token = flag — not wired to the math.

## Local

Open `index.html` in a browser (or any static host root = this folder).

## Launch fill-in

Edit the bootstrap `window.STOKES` object in `index.html` (or set it before `main.js`):

- `siteUrl` — origin with no trailing slash, e.g. `https://stokes.example`
- `xUrl` — full X profile URL
- `ca` — mint address
- `caShort` — optional display trunc; empty = auto
- `gmgnUrl` — optional chart link for the CA slot

Leave fields empty until real. Empty ⇒ honest TBA chrome, no fake links.
```

- [ ] **Step 5: Verify head + assets**

Open page, confirm favicon loads, no 404 for `logo.png` / `og.png` in Network. View source: OG + Twitter tags present. `og:url` and canonical empty until config filled.

---

### Task 3: Final polish pass + acceptance

**Files:**
- Modify: `style.css` / `index.html` / `main.js` only if Task 1–2 left gaps
- Touch: none otherwise

**Interfaces:**
- Consumes: all prior deliverables

- [ ] **Step 1: Reduced-motion + overlay sanity**

Toggle OS reduced motion if available: gauge should still draw one frame; cursor trail hidden. Escape closes overlays. Instrument regimes still change Γ readout.

- [ ] **Step 2: Mobile pass**

At ~390px width: hero readable; top bar shows `stokes` + manuscript/instrument + x/CA; instrument controls stack; no horizontal page scroll.

- [ ] **Step 3: Acceptance checklist (spec)**

1. Manuscript + instrument + overlays work locally  
2. No broken head/topbar images  
3. Share tags + `assets/og.png` exist  
4. Empty config ⇒ TBA, no fake hrefs  
5. Filled `STOKES` updates chrome  
6. Mobile readable; instrument usable  
7. Copy still Mark / illustrative / flag unwired  

- [ ] **Step 4: Revert any temporary test config**

Confirm bootstrap `STOKES` fields are all `""`.

- [ ] **Step 5: Commit only if user asks**

If requested:

```bash
git add stokes/index.html stokes/main.js stokes/style.css stokes/assets stokes/README.md stokes/docs
git commit -m "$(cat <<'EOF'
Polish Stokes into a launch-ready static desk.

Config-driven X/CA chrome, OG assets, and honest TBA states without fake social links.
EOF
)"
```

(On Windows PowerShell without HEREDOC, use an equivalent UTF-8 commit message.)

---

## Spec coverage check

| Spec item | Task |
|---|---|
| `window.STOKES` config | Task 1 |
| Honest empty X/CA | Task 1 |
| Top chrome slots + mobile | Task 1 |
| OG / Twitter / theme-color / icons | Task 2 |
| `assets/og.png` | Task 2 |
| Logo/favicon audit | Task 2 |
| README fill-in | Task 2 |
| Acceptance + motion | Task 3 |
| No live chain / no fake domain | Global + all tasks |

## Placeholder scan

None intentional. TBA is empty-config behavior, not an unfinished plan step.
