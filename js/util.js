// Shared helpers: DOM, colour scales, the illustrative ocean-heat field, tooltip, page chrome.
window.U = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Signed number with a true minus sign; rounds first so a tiny negative never prints as "−0.0".
  const fmt = (v, d = 1) => { const r = +v.toFixed(d); return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(d)}`; };
  // Pointer capture keeps a drag alive outside the element; it is optional, so never let it throw.
  const capture = (node, ev) => { try { node.setPointerCapture(ev.pointerId); } catch { /* no live pointer */ } };

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs = {}, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (v != null) node.setAttribute(k, v);
    }
    if (parent) parent.appendChild(node);
    return node;
  }
  function el(tag, attrs = {}, parent) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k === "class") node.className = v;
      else if (v != null) node.setAttribute(k, v);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  // Piecewise-linear colour ramp → [r, g, b].
  function ramp(stops) {
    return (v) => {
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0]) {
          const [a, ca] = stops[i - 1], [b, cb] = stops[i];
          const t = (v - a) / (b - a);
          return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
        }
      }
      return stops[stops.length - 1][1];
    };
  }
  // Anomaly (°C): blue ← neutral navy → amber → red → hot pink.
  const heat = ramp([
    [-2.2, [44, 111, 214]], [-1, [30, 66, 128]], [-0.25, [16, 30, 54]], [0.25, [18, 30, 52]],
    [0.6, [70, 58, 50]], [1, [128, 92, 44]], [1.5, [198, 132, 46]], [2, [240, 162, 58]],
    [2.6, [242, 124, 48]], [3.1, [240, 92, 48]], [3.7, [226, 60, 68]], [4.3, [217, 43, 92]],
    [5, [226, 58, 128]], [5.8, [244, 108, 172]],
  ]);
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // ── Illustrative sea-surface anomaly field ────────────────────────────────
  // Interpolates NOAA's four regional readings along the equator and spreads them
  // north–south with a Gaussian. It is a drawing of the pattern, not observed data.
  function profile(lon, w) {
    const nodes = [
      [118, -0.1 * Math.max(w.n34, 0)], [150, 0.25 * w.n4], [185, w.n4], [215, w.n34], [240, w.n3],
      [264, 0.55 * w.n3 + 0.45 * w.n12], [277, w.n12], [292, w.n12],
    ];
    if (lon <= nodes[0][0]) return nodes[0][1];
    for (let i = 1; i < nodes.length; i++) {
      if (lon <= nodes[i][0]) {
        const t = (lon - nodes[i - 1][0]) / (nodes[i][0] - nodes[i - 1][0]);
        const s = t * t * (3 - 2 * t);
        return lerp(nodes[i - 1][1], nodes[i][1], s);
      }
    }
    return nodes[nodes.length - 1][1];
  }
  function fieldAt(lon, lat, w, t) {
    const centre = -4 * smooth(250, 280, lon) + 0.9 * Math.sin(lon * 0.21 - t * 0.7) * smooth(190, 230, lon);
    const sigma = lerp(9.5, 6.2, smooth(170, 250, lon)) * (1 + 0.06 * Math.sin(lon * 0.13 + t * 0.4));
    const d = (lat - centre) / sigma;
    let a = profile(lon, w) * Math.exp(-0.5 * d * d);
    // warm water hugging the South American coast
    if (lat < -2 && lon > 262) {
      const coast = 279.5 + (-lat - 5) * 0.4;
      const dc = (lon - coast) / 6;
      a += w.n12 * 0.6 * Math.exp(-dc * dc) * Math.exp(-(((lat + 5) / 15) ** 2));
    }
    // the cool "horseshoe" that flanks a mature El Niño in the west
    const hx = (lon - 162) / 30;
    a -= 0.2 * Math.max(w.n34, 0) * Math.exp(-hx * hx) * (Math.exp(-(((lat - 21) / 9) ** 2)) + Math.exp(-(((lat + 23) / 9) ** 2)));
    return a * (1 + 0.07 * Math.sin(lon * 0.37 + lat * 0.6 + t));
  }
  const FIELD = { w: 180, h: 70, lon0: 110, lat1: 35 };
  function makeFieldRenderer() {
    const c = document.createElement("canvas");
    c.width = FIELD.w; c.height = FIELD.h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(FIELD.w, FIELD.h);
    return function render(w, t = 0) {
      const d = img.data;
      for (let y = 0; y < FIELD.h; y++) {
        const lat = FIELD.lat1 - (y + 0.5);
        for (let x = 0; x < FIELD.w; x++) {
          const lon = FIELD.lon0 + x + 0.5;
          const c3 = heat(fieldAt(lon, lat, w, t));
          const i = (y * FIELD.w + x) * 4;
          d[i] = c3[0]; d[i + 1] = c3[1]; d[i + 2] = c3[2]; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c;
    };
  }

  // Canvas sized to its CSS box at device resolution. Returns {ctx, w, h} in CSS pixels.
  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // Run a frame loop only while the element is on screen.
  function whenVisible(target, frame) {
    let visible = false, raf = 0, last = 0;
    const tick = (now) => {
      if (!visible) { raf = 0; return; }
      const dt = clamp((now - last) / 1000 || 0.016, 0.001, 0.05);
      last = now;
      frame(dt, now / 1000);
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }, { rootMargin: "80px" }).observe(target);
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tip = $("#tooltip");
  const tooltip = {
    show(build, x, y) {
      tip.replaceChildren();
      build(tip);
      tip.hidden = false;
      const r = tip.getBoundingClientRect();
      let left = x + 16, top = y - r.height - 12;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - 16;
      if (top < 8) top = y + 18;
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${top}px`;
    },
    hide() { tip.hidden = true; },
    row(parent, color, label, value, lead) {
      const row = el("div", { class: `tt-row${lead ? " is-lead" : ""}` }, parent);
      el("i", { style: `--c:${color}` }, row);
      el("span", { text: label }, row);
      el("b", { text: value }, row);
    },
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (iso, long) => {
    const [y, m, d] = iso.split("-").map(Number);
    const month = long ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1] : MONTHS[m - 1];
    return long ? `${d} ${month}` : `${d} ${month} ${y}`;
  };

  // Call fn when an element's width changes (not on height-only changes, which our own redraws cause).
  function onWidthChange(node, fn) {
    let last = node.clientWidth;
    new ResizeObserver(() => { const w = node.clientWidth; if (w !== last) { last = w; fn(); } }).observe(node);
  }

  // Keep a range input's --fill in sync so its track can show progress.
  function trackFill(input) {
    const sync = () => input.style.setProperty("--fill", `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    input.addEventListener("input", sync);
    sync();
    return sync;
  }

  // ── Page chrome ───────────────────────────────────────────────────────────
  function chrome() {
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = $$(".nav-links a");
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section[id]").forEach((s) => spy.observe(s));

    const targets = $$(".section-head, .card, .note-card, .ledger-nums, .pull, .footer-grid");
    if (reducedMotion) return;
    targets.forEach((t) => t.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach((t) => io.observe(t));
  }

  function countUp() {
    if (reducedMotion) return;
    $$("[data-count]").forEach((node) => {
      const target = +node.dataset.count, dec = node.dataset.decimals != null ? +node.dataset.decimals : 1;
      const pre = node.dataset.prefix || "", suf = node.dataset.suffix || "";
      const t0 = performance.now() + 250, dur = 1500;
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - t, 4);
        node.textContent = `${pre}${(target * e).toFixed(dec)}${suf}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  document.addEventListener("DOMContentLoaded", () => { chrome(); countUp(); });

  return { $, $$, clamp, lerp, smooth, fmt, capture, svg, el, ramp, heat, rgb, fieldAt, makeFieldRenderer, FIELD, fitCanvas, whenVisible, tooltip, MONTHS, fmtDate, trackFill, onWidthChange, reducedMotion };
})();
