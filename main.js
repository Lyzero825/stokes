(function () {
  "use strict";

  const TWO_PI = Math.PI * 2;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  function stepGamma(G, x0, y0, x1, y1) {
    return G + 0.5 * (x0 * y1 - x1 * y0);
  }

  function circulation(pts) {
    let G = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      G = stepGamma(G, a.x, a.y, b.x, b.y);
    }
    return G;
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  // ── routing + overlays ──
  const views = {
    manuscript: document.querySelector('[data-view="manuscript"]'),
    instrument: document.querySelector('[data-view="instrument"]'),
  };
  const overlays = {
    source: document.getElementById("overlay-source"),
    note: document.getElementById("overlay-note"),
  };

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
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => {
        m.setAttribute("content", siteUrl + "/assets/og.png");
      });
    }
  }

  function closeOverlays() {
    Object.values(overlays).forEach((el) => {
      if (!el) return;
      el.classList.remove("open");
      el.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("overlay-open");
  }

  function openOverlay(key) {
    closeOverlays();
    const el = overlays[key];
    if (!el) return;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
    el.querySelector(".overlay-inner")?.scrollIntoView({ block: "start" });
  }

  function showView(name) {
    closeOverlays();
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      const on = key === name;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("is-current", a.getAttribute("data-nav") === name);
    });
    if (name === "instrument") {
      window.dispatchEvent(new CustomEvent("stokes:instrument"));
    }
    if (name === "manuscript") {
      window.scrollTo(0, 0);
      syncOrbit();
    }
  }

  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    if (raw.startsWith("/source") || raw === "source") return { view: "manuscript", overlay: "source" };
    if (raw.startsWith("/note") || raw === "note") return { view: "manuscript", overlay: "note" };
    if (raw.startsWith("/instrument") || raw === "instrument") return { view: "instrument" };
    // section anchors like #desk stay on manuscript
    if (raw && !raw.startsWith("/")) return { view: "manuscript", section: raw };
    return { view: "manuscript" };
  }

  function applyRoute() {
    const r = parseRoute();
    showView(r.view || "manuscript");
    if (r.overlay) openOverlay(r.overlay);
    if (r.section) {
      const el = document.getElementById(r.section);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  document.addEventListener("click", (e) => {
    const overlayLink = e.target.closest("[data-overlay]");
    if (overlayLink) {
      e.preventDefault();
      const id = overlayLink.getAttribute("data-overlay");
      const key = id === "overlay-source" ? "source" : "note";
      history.pushState(null, "", key === "source" ? "#/source" : "#/note");
      showView("manuscript");
      openOverlay(key);
      return;
    }
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      const name = nav.getAttribute("data-nav");
      history.pushState(null, "", name === "instrument" ? "#/instrument" : "#/");
      showView(name);
      return;
    }
    const orbit = e.target.closest(".orbit a");
    if (orbit && views.instrument && !views.instrument.hidden) {
      e.preventDefault();
      const href = orbit.getAttribute("href") || "#/";
      history.pushState(null, "", href);
      showView("manuscript");
      const id = href.replace(/^#/, "");
      const el = document.getElementById(id);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      history.pushState(null, "", "#/");
      closeOverlays();
    });
  });
  Object.values(overlays).forEach((el) => {
    el?.addEventListener("click", (e) => {
      if (e.target === el) {
        history.pushState(null, "", "#/");
        closeOverlays();
      }
    });
  });

  window.addEventListener("hashchange", applyRoute);
  window.addEventListener("popstate", applyRoute);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeOverlays();
      if ((location.hash || "").startsWith("#/")) history.pushState(null, "", "#/");
    }
  });

  // ── orbit sync (manuscript) ──
  const prog = document.getElementById("prog");
  const links = [...document.querySelectorAll(".orbit a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));

  function syncOrbit() {
    if (views.manuscript?.hidden) return;
    const y = window.scrollY + 90;
    let i = 0;
    sections.forEach((s, idx) => {
      if (s && s.offsetTop <= y) i = idx;
    });
    links.forEach((a, idx) => {
      a.classList.toggle("active", idx === i);
      a.classList.toggle("past", idx < i);
    });
    if (prog && sections[0] && sections.at(-1)) {
      const start = sections[0].offsetTop;
      const end =
        sections.at(-1).offsetTop +
        sections.at(-1).offsetHeight -
        window.innerHeight;
      const t =
        end <= start
          ? 0
          : Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      prog.style.height = `${Math.max(8, t * 100)}%`;
    }
  }
  window.addEventListener("scroll", syncOrbit, { passive: true });

  // ── cursor comet trail ──
  (function cursorTrail() {
    const root = document.documentElement;
    const canvas = document.getElementById("cursorTrail");
    if (!canvas || reduceMotion || !finePointer) {
      if (canvas) canvas.style.display = "none";
      return;
    }
    const ctx = canvas.getContext("2d");
    let W = 0,
      H = 0,
      dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let tx = W / 2,
      ty = H * 0.38,
      cx = tx,
      cy = ty;
    const trail = [];
    const MAX = 26;
    let raf = null;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < trail.length; i++) {
        const t = trail.length < 2 ? 1 : i / (trail.length - 1);
        const p = trail[i];
        const r = 2.5 + t * t * 22;
        const a = t * t * 0.6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, "rgba(214,255,74," + a + ")");
        g.addColorStop(0.35, "rgba(198,240,58," + a * 0.45 + ")");
        g.addColorStop(1, "rgba(198,240,58,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      trail.push({ x: cx, y: cy });
      if (trail.length > MAX) trail.shift();
      draw();
      const moving = Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3;
      const head = trail[trail.length - 1],
        tail = trail[0];
      const collapsed =
        Math.abs(head.x - tail.x) < 0.6 && Math.abs(head.y - tail.y) < 0.6;
      if (moving || !collapsed) raf = requestAnimationFrame(loop);
      else raf = null;
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        tx = e.clientX;
        ty = e.clientY;
        root.style.setProperty("--glow", "1");
        if (raf === null) {
          if (!trail.length) {
            cx = tx;
            cy = ty;
          }
          raf = requestAnimationFrame(loop);
        }
      },
      { passive: true }
    );
  })();

  // ── manuscript hero gauge ──
  (function heroGauge() {
    const canvas = document.getElementById("gauge");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const N = 256;
    let t0 = 0;

    function pathAt(time) {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const ang = u * Math.PI * 2 * (1.15 + 0.08 * Math.sin(time * 0.15));
        const wobble =
          0.18 * Math.sin(3 * ang + time * 0.4) +
          0.1 * Math.sin(5 * ang - time * 0.25);
        const r = 0.62 + wobble;
        pts.push({
          x: 0.5 + r * Math.cos(ang) * 0.42,
          y: 0.52 + r * Math.sin(ang) * 0.34,
        });
      }
      return pts;
    }

    function drawFrame(time) {
      const pts = pathAt(time);
      const G = circulation(pts);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(233,229,216,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (H / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = p.x * W;
        const y = p.y * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(191,255,0,0.85)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(191,255,0,0.05)";
      ctx.fill();
      const head = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(head.x * W, head.y * H, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#bfff00";
      ctx.fill();
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#9a978c";
      ctx.fillText("Γ  " + G.toFixed(4), 16, 22);
      ctx.fillStyle = "#bfff00";
      ctx.fillText("winds ≈ " + (G / TWO_PI).toFixed(3), 16, 40);
    }

    function loop(ts) {
      if (!t0) t0 = ts;
      if (!views.manuscript?.hidden) drawFrame((ts - t0) / 1000);
      if (!reduceMotion) requestAnimationFrame(loop);
    }
    if (reduceMotion) drawFrame(0);
    else requestAnimationFrame(loop);
  })();

  // ── interactive instrument desk ──
  (function desk() {
    const canvas = document.getElementById("desk-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const N = 256;
    const gammaEl = document.getElementById("readout-gamma");
    const windsEl = document.getElementById("readout-winds");
    const regimeEl = document.getElementById("regime");
    const seedEl = document.getElementById("seed");
    const pressureEl = document.getElementById("pressure");
    const addressEl = document.getElementById("address");
    const btnReseed = document.getElementById("btn-reseed");
    const btnFreeze = document.getElementById("btn-freeze");

    let seed = Number(seedEl.value) / 100;
    let pressure = Number(pressureEl.value) / 100;
    let regime = regimeEl.value;
    let frozen = false;
    let time = 0;
    let drag = null;
    let offset = { x: 0, y: 0 };
    let running = false;

    function buildPath(t) {
      const pts = [];
      const s = seed * TWO_PI;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        let x, y;
        if (regime === "wash") {
          const ang = u * TWO_PI * (4 + pressure * 4) + s;
          const r = 0.22 + 0.05 * Math.sin(ang * 2 + t);
          x = 0.5 + r * Math.cos(ang);
          y = 0.5 + r * Math.sin(ang);
        } else if (regime === "drain") {
          const ang = u * Math.PI * 1.15 + s;
          const r = 0.15 + u * (0.45 + pressure * 0.2);
          x = 0.28 + r * Math.cos(ang);
          y = 0.55 + r * Math.sin(ang) * 0.55 - u * 0.12;
        } else if (regime === "whale") {
          x = 0.18 + u * 0.64;
          y = 0.7 - u * (0.35 + pressure * 0.15) + 0.02 * Math.sin(u * 8 + s);
        } else {
          const ang = u * TWO_PI * (1.05 + 0.1 * Math.sin(t * 0.2 + s));
          const wobble =
            (0.12 + pressure * 0.2) * Math.sin(3 * ang + t * 0.35 + s) +
            0.08 * Math.sin(5 * ang - t * 0.2);
          const r = 0.55 + wobble;
          x = 0.5 + r * Math.cos(ang) * 0.4;
          y = 0.52 + r * Math.sin(ang) * 0.36;
        }
        pts.push({
          x: x + offset.x,
          y: y + offset.y,
        });
      }
      // close path for shoelace integrity when nearly closed
      if (regime !== "drain" && regime !== "whale") {
        pts.push({ x: pts[0].x, y: pts[0].y });
      }
      return pts;
    }

    function draw() {
      const pts = buildPath(time);
      const G = circulation(pts);
      if (gammaEl) gammaEl.textContent = "Γ " + G.toFixed(4);
      if (windsEl) windsEl.textContent = "winds ≈ " + (G / TWO_PI).toFixed(3);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#08090b";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(233,229,216,0.06)";
      for (let i = 1; i < 6; i++) {
        const y = (H / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = p.x * W;
        const y = p.y * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "rgba(191,255,0,0.9)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "rgba(191,255,0,0.045)";
      if (regime !== "drain" && regime !== "whale") ctx.fill();

      // vertices sample
      for (let i = 0; i < pts.length; i += 16) {
        const p = pts[i];
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 2, 0, TWO_PI);
        ctx.fillStyle = "rgba(191,255,0,0.55)";
        ctx.fill();
      }

      const head = pts[Math.max(0, pts.length - 2)];
      ctx.beginPath();
      ctx.arc(head.x * W, head.y * H, 4, 0, TWO_PI);
      ctx.fillStyle = "#bfff00";
      ctx.fill();
    }

    function loop(ts) {
      if (!running) return;
      if (!frozen && !reduceMotion) time = ts / 1000;
      draw();
      requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    }

    function reseed() {
      seed = Math.random();
      seedEl.value = String(Math.round(seed * 100));
      offset = { x: 0, y: 0 };
      draw();
    }

    regimeEl.addEventListener("change", () => {
      regime = regimeEl.value;
      draw();
    });
    seedEl.addEventListener("input", () => {
      seed = Number(seedEl.value) / 100;
      draw();
    });
    pressureEl.addEventListener("input", () => {
      pressure = Number(pressureEl.value) / 100;
      draw();
    });
    addressEl.addEventListener("input", () => {
      const v = addressEl.value.trim();
      if (!v) return;
      seed = hashStr(v.toLowerCase());
      seedEl.value = String(Math.round(seed * 100));
      draw();
    });
    btnReseed.addEventListener("click", reseed);
    btnFreeze.addEventListener("click", () => {
      frozen = !frozen;
      btnFreeze.textContent = frozen ? "thaw" : "freeze / thaw";
    });

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / canvas.clientWidth;
      const dy = (e.clientY - drag.y) / canvas.clientHeight;
      offset.x = Math.max(-0.2, Math.min(0.2, drag.ox + dx));
      offset.y = Math.max(-0.2, Math.min(0.2, drag.oy + dy));
      draw();
    });
    canvas.addEventListener("pointerup", () => {
      drag = null;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const next = Math.max(0, Math.min(100, Number(pressureEl.value) - Math.sign(e.deltaY) * 3));
        pressureEl.value = String(next);
        pressure = next / 100;
        draw();
      },
      { passive: false }
    );

    window.addEventListener("stokes:instrument", () => {
      start();
      draw();
    });

    // warm start if landing on instrument
    if ((location.hash || "").includes("instrument")) start();
  })();

  applyLaunchChrome();
  applyRoute();
  syncOrbit();
})();
