// 02 · The build-up — scrub through 2026 week by week on a map of the tropical Pacific.
(() => {
  const { $, $$, clamp, lerp, fmt, svg, el, makeFieldRenderer, FIELD, fitCanvas, whenVisible, tooltip, MONTHS, fmtDate, trackFill, reducedMotion } = U;
  const P = GEO.pacific, weeks = DATA.weekly, N = weeks.length;
  const canvas = $("#growthCanvas"), map = $("#growthSvg"), slider = $("#growthSlider");
  const render = makeFieldRenderer();
  const HOT = "#d95926", GREY = "#8792a6";

  let pos = N - 1;        // fractional week index
  let playing = false;
  let region = "n34";
  let hover = null;
  let lastIndex = -1;

  let mk = 1; // map pixels per viewBox unit of the pre-rendered land path
  const X = (lon) => ((lon - P.lon0) / (P.lon1 - P.lon0)) * P.w * mk;
  const Y = (lat) => ((P.lat1 - lat) / (P.lat1 - P.lat0)) * P.h * mk;
  const at = (p) => {
    // Guard against any non-finite position so a bad frame can never index outside the data.
    const q = Number.isFinite(p) ? clamp(p, 0, N - 1) : N - 1, i = Math.floor(q), j = Math.min(N - 1, i + 1), t = q - i, a = weeks[i], b = weeks[j];
    return { n12: lerp(a.n12, b.n12, t), n3: lerp(a.n3, b.n3, t), n34: lerp(a.n34, b.n34, t), n4: lerp(a.n4, b.n4, t) };
  };

  // ── Map overlay ───────────────────────────────────────────────────────────
  // Rebuilt at the map's real pixel size so labels stay readable however small the map gets.
  const labelPos = { n4: { lon: 175, lat: 5, dy: -8, anchor: "middle" }, n34: { lon: 215, lat: -5, dy: 26, anchor: "middle" }, n3: { lon: 252, lat: 5, dy: -8, anchor: "middle" }, n12: { lon: 268.5, lat: -10, dy: 12, anchor: "end" } };
  const GEO_LABELS = [["Australia", 134, -25, 520], ["Hawaii", 204, 24.5, 0], ["Mexico", 257, 25, 520], ["Peru", 285.3, -9, 520], ["Borneo", 114.5, 0.5, 640]];
  let boxes = {};
  function buildMap() {
    const wpx = map.clientWidth || P.w;
    mk = wpx / P.w;
    map.setAttribute("viewBox", `0 0 ${wpx} ${(P.h * mk).toFixed(1)}`);
    map.replaceChildren();
    svg("line", { class: "equator", x1: 0, x2: wpx, y1: Y(0), y2: Y(0) }, map);
    svg("path", { class: "land", d: P.land, transform: `scale(${mk})`, "vector-effect": "non-scaling-stroke" }, map);
    for (const [t, lon, lat, min] of GEO_LABELS) if (wpx >= min) svg("text", { class: "geo-label", x: X(lon), y: Y(lat), "text-anchor": "middle", text: t }, map);
    boxes = {};
    for (const r of DATA.regions) {
      const gEl = svg("g", {}, map);
      const rect = svg("rect", { class: `region-box${r.id === region ? " is-on" : ""}`, x: X(r.lon[0]), y: Y(r.lat[1]), width: X(r.lon[1]) - X(r.lon[0]), height: Y(r.lat[0]) - Y(r.lat[1]), rx: 3, tabindex: 0, role: "button", "aria-label": `${r.name}: ${r.blurb}` }, gEl);
      const lp = labelPos[r.id];
      const label = svg("text", { class: "region-label", x: X(lp.lon), y: Y(lp.lat) + lp.dy, "text-anchor": lp.anchor }, gEl);
      if (wpx >= 520) svg("tspan", { text: `${r.name} ` }, label);
      const value = svg("tspan", { class: "region-value" }, label);
      boxes[r.id] = { rect, value };
      const pick = () => setRegion(r.id);
      rect.addEventListener("click", pick);
      rect.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    }
    lastIndex = -1;
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = $("#growthLegend");
  for (const r of DATA.regions) {
    const b = el("button", { type: "button", class: "legend-item", "data-region": r.id, title: r.blurb }, legend);
    el("span", { class: "key" }, b);
    el("span", { text: r.name }, b);
    b.addEventListener("click", () => setRegion(r.id));
  }
  function setRegion(id) {
    region = id;
    $$(".legend-item", legend).forEach((b) => { const on = b.dataset.region === id; b.classList.toggle("is-on", on); b.style.setProperty("--c", on ? HOT : GREY); b.setAttribute("aria-pressed", on); });
    for (const [k, b] of Object.entries(boxes)) b.rect.classList.toggle("is-on", k === id);
    drawChart();
  }

  // ── Scrubber ──────────────────────────────────────────────────────────────
  const syncFill = trackFill(slider);
  const monthCounts = {};
  weeks.forEach((w) => { const m = +w.date.slice(5, 7) - 1; monthCounts[m] = (monthCounts[m] || 0) + 1; });
  Object.entries(monthCounts).forEach(([m, c]) => el("span", { style: `--w:${c}`, text: MONTHS[m] }, $("#growthMonths")));

  const dots = $("#momentDots");
  const moments = DATA.timeline.map((m) => ({ ...m, index: weeks.findIndex((w) => w.date >= m.date) }));
  moments.forEach((m, i) => {
    const b = el("button", { type: "button", "aria-label": `${fmtDate(m.date, true)}: ${m.title}`, title: m.title }, dots);
    b.addEventListener("click", () => { stop(); pos = m.index; update(); });
    m.button = b; m.i = i;
  });
  let shownMoment = null;
  function showMoment(index) {
    let m = moments[0];
    for (const cand of moments) if (cand.index <= index) m = cand;
    if (m === shownMoment) return;
    shownMoment = m;
    $("#momentDate").textContent = fmtDate(m.date, true);
    $("#momentTitle").textContent = m.title;
    $("#momentText").textContent = m.text;
    moments.forEach((x) => x.button.classList.toggle("is-on", x === m));
  }

  const playBtn = $("#growthPlay"), icon = $("#growthPlayIcon");
  function setPlaying(on) {
    playing = on;
    icon.setAttribute("d", on ? "M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z" : "M7 4.5v15l13-7.5z");
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play the year");
  }
  const stop = () => setPlaying(false);
  playBtn.addEventListener("click", () => { if (!playing && pos >= N - 1) pos = 0; setPlaying(!playing); });
  slider.addEventListener("input", () => { stop(); pos = +slider.value; update(); });

  // ── Chart ─────────────────────────────────────────────────────────────────
  const chartBox = $("#growthChart");
  let cg = null;
  function drawChart() {
    const W = Math.max(320, chartBox.clientWidth), H = clamp(W * 0.3, 210, 300);
    const m = { l: 34, r: W < 560 ? 86 : 104, t: 12, b: 26 };
    const y0 = -1, y1 = 5.5;
    const x = (i) => m.l + (i / (N - 1)) * (W - m.l - m.r), y = (v) => m.t + ((y1 - v) / (y1 - y0)) * (H - m.t - m.b);
    chartBox.replaceChildren();
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Line chart of weekly sea surface temperature anomalies in the four Niño regions during 2026. Niño 1+2 rises from −0.6 to +5.3°C; Niño 3.4 from −0.7 to +3.2°C." }, chartBox);
    for (let v = -1; v <= 5; v++) {
      svg("line", { class: v === 0 ? "zero-line" : "grid-line", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, s);
      svg("text", { class: "axis-text", x: m.l - 8, y: y(v) + 4, "text-anchor": "end", text: v === 0 ? "0" : fmt(v, 0) }, s);
    }
    let seen = -1;
    weeks.forEach((w, i) => {
      const mo = +w.date.slice(5, 7) - 1;
      if (mo !== seen) { seen = mo; svg("text", { class: "axis-text", x: x(i), y: H - 6, text: MONTHS[mo] }, s); svg("line", { class: "grid-line", x1: x(i), x2: x(i), y1: H - m.b, y2: H - m.b + 4 }, s); }
    });
    const order = [...DATA.regions].sort((a, b) => (a.id === region) - (b.id === region));
    const ends = [];
    for (const r of order) {
      const lead = r.id === region;
      const d = weeks.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w[r.id]).toFixed(1)}`).join("");
      svg("path", { class: `series${lead ? " is-lead" : ""}`, d, stroke: lead ? HOT : GREY, opacity: lead ? 1 : 0.75 }, s);
      ends.push({ r, lead, v: weeks[N - 1][r.id] });
    }
    for (const e of ends) {
      svg("circle", { class: "end-dot", cx: x(N - 1), cy: y(e.v), r: e.lead ? 5 : 4, fill: e.lead ? HOT : GREY }, s);
      const t = svg("text", { class: `direct-label${e.lead ? " lead" : ""}`, x: x(N - 1) + 10, y: y(e.v) + 4 }, s);
      svg("tspan", { text: e.r.name }, t);
      svg("tspan", { text: ` ${fmt(e.v)}`, "font-weight": 700, fill: "#f4f1ea" }, t);
    }
    const cursor = svg("g", { style: "pointer-events:none" }, s);
    const line = svg("line", { class: "crosshair", y1: m.t, y2: H - m.b }, cursor);
    const cd = DATA.regions.map((r) => svg("circle", { class: "end-dot", r: r.id === region ? 5 : 3.5, fill: r.id === region ? HOT : GREY }, cursor));
    const hit = svg("rect", { x: m.l - 6, y: 0, width: W - m.l - m.r + 12, height: H, fill: "transparent", style: "cursor:col-resize" }, s);
    const idx = (ev) => { const b = s.getBoundingClientRect(); return clamp(Math.round(((ev.clientX - b.left) * (W / b.width) - m.l) / ((W - m.l - m.r) / (N - 1))), 0, N - 1); };
    let down = false;
    hit.addEventListener("pointerdown", (ev) => { down = true; U.capture(hit, ev); stop(); pos = idx(ev); update(); });
    hit.addEventListener("pointerup", () => { down = false; });
    hit.addEventListener("pointermove", (ev) => {
      const i = idx(ev);
      if (down) { pos = i; update(); }
      hover = i; placeCursor();
      const w = weeks[i];
      tooltip.show((t) => {
        el("div", { class: "tt-head", text: `Week of ${fmtDate(w.date)}` }, t);
        [...DATA.regions].sort((a, b) => w[b.id] - w[a.id]).forEach((r) => tooltip.row(t, r.id === region ? HOT : GREY, r.name, `${fmt(w[r.id])}°C`, r.id === region));
      }, ev.clientX, ev.clientY);
    });
    hit.addEventListener("pointerleave", () => { hover = null; tooltip.hide(); placeCursor(); });
    cg = { x, y, line, cd };
    placeCursor();
  }
  function placeCursor() {
    if (!cg) return;
    const p = hover != null ? hover : pos, v = at(clamp(p, 0, N - 1));
    cg.line.setAttribute("x1", cg.x(p)); cg.line.setAttribute("x2", cg.x(p));
    DATA.regions.forEach((r, i) => { cg.cd[i].setAttribute("cx", cg.x(p)); cg.cd[i].setAttribute("cy", cg.y(v[r.id])); });
  }

  // ── Frame ─────────────────────────────────────────────────────────────────
  let fit = null;
  function paint(t) {
    if (!fit) fit = fitCanvas(canvas);
    const { ctx, w, h } = fit;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(render(at(pos), t * 0.5), 0, 0, FIELD.w, FIELD.h, 0, 0, w, h);
  }
  function update() {
    const i = Math.round(pos), w = weeks[i];
    if (i !== lastIndex) {
      lastIndex = i;
      slider.value = i; syncFill();
      $("#growthDate").textContent = fmtDate(w.date);
      for (const r of DATA.regions) boxes[r.id].value.textContent = `${fmt(w[r.id])}°C`;
      showMoment(i);
    }
    placeCursor();
    if (reducedMotion) paint(0);
  }
  function frame(dt, now) {
    if (playing) {
      pos = clamp(pos + dt * 6.5, 0, N - 1);
      if (pos >= N - 1) stop();
      update();
    }
    paint(now);
  }

  buildMap();
  setRegion(region);
  update();
  U.onWidthChange(chartBox, () => { fit = null; buildMap(); update(); drawChart(); if (reducedMotion) paint(0); });
  if (reducedMotion) paint(0);
  else {
    whenVisible(canvas, frame);
    // Play the year once, the first time the map scrolls into view.
    const once = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      once.disconnect(); pos = 0; setPlaying(true); update();
    }, { threshold: 0.6 });
    once.observe(canvas);
  }
})();
