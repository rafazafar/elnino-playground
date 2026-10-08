// 03 · The record — every very strong El Niño since 1982, aligned on the January it began,
// with a draggable "what-if" peak for 2026–27.
(() => {
  const { $, $$, clamp, fmt, svg, el, tooltip, MONTHS } = U;
  const F = DATA.forecast;
  const COLORS = { e2026: "#d95926", e2015: "#3987e5", e1997: "#199e70", e1982: "#a3adbe", e2023: "#66728a" };
  const series = [...DATA.events, DATA.current];
  const box = $("#compareChart"), slider = $("#peakSlider");

  let index = "n34";
  let peak = F.peakMean;
  let focus = null;
  const hidden = new Set();
  const OBS = DATA.current.n34.length - 1; // last observed month index (Sep 2026 = 8)

  function path(p) {
    const arr = [];
    const last = DATA.current.n34[OBS];
    arr[OBS] = last;
    arr[OBS + 1] = last + (F.shape[1] * p - last) * 0.55;
    for (let k = 1; k < F.shape.length; k++) arr[OBS + 1 + k] = F.shape[k] * p;
    return arr;
  }
  const valueAt = (s, i) => {
    const v = s[index][i];
    if (v != null) return { v, fc: false };
    if (s.id === "e2026" && index === "n34") { const f = path(peak)[i]; if (f != null) return { v: f, fc: true }; }
    return null;
  };
  const when = (s, i) => `${MONTHS[i % 12]} ${s.year0 + Math.floor(i / 12)}`;

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = $("#compareLegend");
  for (const s of [...series].reverse()) {
    const b = el("button", { type: "button", class: "legend-item is-on", style: `--c:${COLORS[s.id]}`, "aria-pressed": "true", "data-id": s.id }, legend);
    el("span", { class: "key" }, b);
    el("span", { text: s.label }, b);
    b.addEventListener("click", () => {
      hidden.has(s.id) ? hidden.delete(s.id) : hidden.add(s.id);
      const on = !hidden.has(s.id);
      b.classList.toggle("is-on", on); b.classList.toggle("is-off", !on); b.setAttribute("aria-pressed", on);
      draw();
    });
    const setFocus = (id) => { focus = id; $$(".series", box).forEach((p) => p.classList.toggle("is-dim", focus && p.dataset.id !== focus)); };
    b.addEventListener("pointerenter", () => !hidden.has(s.id) && setFocus(s.id));
    b.addEventListener("pointerleave", () => setFocus(null));
    b.addEventListener("focus", () => !hidden.has(s.id) && setFocus(s.id));
    b.addEventListener("blur", () => setFocus(null));
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  let c = null;
  function draw() {
    const W = Math.max(320, box.clientWidth), H = clamp(W * 0.5, 330, 520), narrow = W < 620;
    const m = { l: 36, r: narrow ? 14 : 96, t: 18, b: 46 };
    const y0 = -2, y1 = index === "n34" ? 5.2 : 3.2;
    const x = (i) => m.l + (i / 23) * (W - m.l - m.r), y = (v) => m.t + ((y1 - v) / (y1 - y0)) * (H - m.t - m.b);
    box.replaceChildren();
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": index === "n34"
      ? "Line chart comparing monthly Niño 3.4 anomalies for the 1982–83, 1997–98, 2015–16, 2023–24 and 2026–27 El Niño events. By September 2026 the current event is at +2.98°C, above the peak of every earlier event."
      : "Line chart comparing NOAA's relative Niño index for five El Niño events. 2026–27 stands at +1.69°C for July–September, ahead of every earlier event at the same point." }, box);

    for (let v = y0; v <= y1; v++) {
      svg("line", { class: v === 0 ? "zero-line" : "grid-line", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, s);
      svg("text", { class: "axis-text", x: m.l - 8, y: y(v) + 4, "text-anchor": "end", text: v === 0 ? "0" : fmt(v, 0) }, s);
    }
    for (let i = 0; i < 24; i += 3) {
      svg("line", { class: "grid-line", x1: x(i), x2: x(i), y1: H - m.b, y2: H - m.b + 5 }, s);
      svg("text", { class: "axis-text", x: x(i), y: H - m.b + 18, "text-anchor": "middle", text: MONTHS[i % 12] }, s);
    }
    svg("line", { class: "grid-line", x1: x(11.5), x2: x(11.5), y1: m.t, y2: H - m.b + 30 }, s);
    svg("text", { class: "thr-label", x: x(5.5), y: H - 6, "text-anchor": "middle", text: "Year it began" }, s);
    svg("text", { class: "thr-label", x: x(17.5), y: H - 6, "text-anchor": "middle", text: "Year after" }, s);
    if (!narrow) for (const t of DATA.thresholds) {
      svg("line", { class: "zero-line", x1: W - m.r, x2: W - m.r + 6, y1: y(t.v), y2: y(t.v) }, s);
      svg("text", { class: "thr-label", x: W - m.r + 10, y: y(t.v) + 3.5, text: t.label }, s);
    }

    const lead = DATA.current, showLead = !hidden.has(lead.id);
    let mean = null, handle = null, handleLabel = null;
    if (index === "n34" && showLead) {
      const lo = path(F.peakLow), hi = path(F.peakHigh);
      const idx = Object.keys(lo).map(Number);
      const d = idx.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(hi[i]).toFixed(1)}`).join("") + [...idx].reverse().map((i) => `L${x(i).toFixed(1)},${y(lo[i]).toFixed(1)}`).join("") + "Z";
      svg("path", { class: "cone", d }, s);
      if (!narrow) svg("text", { class: "anno", x: x(13.25), y: y(hi[13]) - 2, text: "80% of model runs peak inside this band" }, s);
      mean = svg("path", { class: "cone-mean" }, s);
    }
    if (index === "roni" && showLead) {
      svg("line", { x1: x(9), x2: x(11), y1: y(F.roniHistoric), y2: y(F.roniHistoric), stroke: COLORS.e2026, "stroke-width": 3, "stroke-linecap": "round" }, s);
      svg("text", { class: "anno", x: x(11), y: y(F.roniHistoric) - 23, "text-anchor": "end", text: "“Historic” mark, +2.5°C" }, s);
      svg("text", { class: "anno", x: x(11), y: y(F.roniHistoric) - 9, "text-anchor": "end", text: "NOAA: 75% chance for Oct–Dec" }, s);
    }

    for (const sr of series) {
      if (hidden.has(sr.id)) continue;
      const pts = sr[index];
      const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      svg("path", { class: `series${sr.id === lead.id ? " is-lead" : ""}${focus && focus !== sr.id ? " is-dim" : ""}`, d, stroke: COLORS[sr.id], "data-id": sr.id }, s);
    }

    // direct labels: only the lead series and the record it is chasing
    const rec = index === "n34" ? { s: DATA.events[2], i: 10, text: `2015–16 · old record ${F.priorRecord.toFixed(2)}` } : { s: DATA.events[0], i: 12, text: `1982–83 · record ${F.roniRecord.toFixed(2)}` };
    if (!hidden.has(rec.s.id) && !narrow) {
      svg("circle", { class: "end-dot", cx: x(rec.i), cy: y(rec.s[index][rec.i]), r: 4, fill: COLORS[rec.s.id] }, s);
      svg("text", { class: "direct-label", x: x(rec.i) + (index === "n34" ? 14 : 12), y: y(rec.s[index][rec.i]) - (index === "n34" ? 9 : 4), text: rec.text }, s);
    }
    if (showLead) {
      const n = lead[index].length - 1, v = lead[index][n];
      svg("circle", { class: "end-dot", cx: x(n), cy: y(v), r: 5.5, fill: COLORS.e2026 }, s);
      svg("text", { class: "direct-label lead", x: x(n) - 10, y: y(v) - 9, "text-anchor": "end", text: index === "n34" ? `Sep 2026 · ${fmt(v, 2)}` : `Jul–Sep 2026 · ${fmt(v, 2)}` }, s);
    }
    if (mean) {
      handle = svg("g", { class: "peak-handle", tabindex: -1 }, s);
      svg("circle", { class: "halo", r: 15 }, handle);
      svg("circle", { class: "ring", r: 7 }, handle);
      svg("circle", { r: 16, fill: "transparent" }, handle);
      handleLabel = svg("text", { class: "direct-label lead", "text-anchor": "middle" }, s);
      let drag = false;
      const toPeak = (ev) => { const b = s.getBoundingClientRect(); const yy = (ev.clientY - b.top) * (H / b.height); setPeak(y1 - ((yy - m.t) / (H - m.t - m.b)) * (y1 - y0)); };
      handle.addEventListener("pointerdown", (ev) => { drag = true; U.capture(handle, ev); ev.preventDefault(); tooltip.hide(); });
      handle.addEventListener("pointermove", (ev) => drag && toPeak(ev));
      handle.addEventListener("pointerup", () => { drag = false; });
      handle.style.touchAction = "none";
    }

    // hover layer
    const cross = svg("line", { class: "crosshair", y1: m.t, y2: H - m.b, visibility: "hidden" }, s);
    const hit = svg("rect", { x: m.l - 8, y: m.t, width: W - m.l - m.r + 16, height: H - m.t - m.b, fill: "transparent" }, s);
    if (handle) s.appendChild(handle);
    hit.addEventListener("pointermove", (ev) => {
      const b = s.getBoundingClientRect();
      const i = clamp(Math.round((((ev.clientX - b.left) * (W / b.width) - m.l) / (W - m.l - m.r)) * 23), 0, 23);
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      tooltip.show((t) => {
        el("div", { class: "tt-head", text: `${MONTHS[i % 12]} · ${i < 12 ? "year it began" : "year after"}` }, t);
        const rows = series.filter((sr) => !hidden.has(sr.id)).map((sr) => ({ sr, p: valueAt(sr, i) })).filter((r) => r.p).sort((a, b) => b.p.v - a.p.v);
        for (const r of rows) tooltip.row(t, COLORS[r.sr.id], `${r.sr.label} · ${when(r.sr, i)}`, `${r.p.fc ? "≈ " : ""}${fmt(r.p.v, r.p.fc ? 1 : 2)}°C`, r.sr.id === "e2026");
        if (rows.some((r) => r.p.fc)) el("div", { class: "tt-foot", text: "≈ what-if path, not an observation" }, t);
      }, ev.clientX, ev.clientY);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tooltip.hide(); });

    c = { x, y, mean, handle, handleLabel };
    placePeak();
  }

  function placePeak() {
    if (!c || !c.mean) return;
    const p = path(peak), idx = Object.keys(p).map(Number);
    c.mean.setAttribute("d", idx.map((i, k) => `${k ? "L" : "M"}${c.x(i).toFixed(1)},${c.y(p[i]).toFixed(1)}`).join(""));
    const px = c.x(OBS + 3), py = c.y(peak);
    c.handle.setAttribute("transform", `translate(${px},${py})`);
    c.handleLabel.setAttribute("x", px); c.handleLabel.setAttribute("y", py - 16);
    c.handleLabel.textContent = `Dec peak ${peak.toFixed(1)}°C`;
  }

  // ── What-if tiles ─────────────────────────────────────────────────────────
  function setPeak(v) {
    peak = clamp(Math.round(v * 20) / 20, +slider.min, +slider.max);
    slider.value = peak;
    $("#peakOut").textContent = `${peak.toFixed(2).replace(/0$/, "")}°C`;
    const margin = peak - F.priorRecord;
    $("#wiMargin").textContent = `${fmt(margin, 2)}°C`;
    $("#wiMarginNote").textContent = `${Math.round((peak / F.priorRecord - 1) * 100)}% above 2015–16's ${F.priorRecord.toFixed(2)}°C`;
    $("#wiBump").textContent = `≈ ${fmt(peak * 0.1, 2)}°C`;
    $("#wiSpread").textContent = peak < F.peakLow ? "Low end" : peak > F.peakHigh ? "High end" : "Mid-range";
    $("#wiSpreadNote").textContent = peak < F.peakLow ? "Only about 1 model run in 10 peaks this low" : peak > F.peakHigh ? "Only about 1 model run in 10 peaks this high" : "Inside the band where 80% of model runs land";
    placePeak();
    buildTable();
  }
  slider.addEventListener("input", () => setPeak(+slider.value));
  const lo = +slider.min, span = +slider.max - lo;
  const band = $("#peakBand");
  band.style.left = `${((F.peakLow - lo) / span) * 100}%`;
  band.style.width = `${((F.peakHigh - F.peakLow) / span) * 100}%`;

  // ── Index toggle ──────────────────────────────────────────────────────────
  const NOTES = {
    n34: "Monthly values are NOAA's OISST index for every event, 2026 included, so like is compared with like. The dotted path and shaded cone are drawn by this site from published peak ranges (Carbon Brief: model mean 4.1°C, 80% of runs between 3.4 and 4.6°C, peaking November–January) and the way 2015–16 decayed. They are an illustration, not a forecast in their own right.",
    roni: "The relative index is a three-month average, so it lags: the latest value, +1.69°C, covers July–September. NOAA gives a 75% chance that October–December reaches +2.5°C, which would top the 1982–83 record of +2.40°C. No month-by-month forecast is published for this index, so none is drawn.",
  };
  function setIndex(id) {
    index = id;
    $$("[data-index]").forEach((b) => { const on = b.dataset.index === id; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
    $("#compareChartTitle").textContent = id === "n34" ? "Niño 3.4 sea surface temperature anomaly" : "Relative Oceanic Niño Index (RONI)";
    $("#compareChartSub").textContent = id === "n34" ? "°C, monthly · months counted from January of the year each event began" : "°C, three-month running mean, plotted at the middle month";
    $("#compareNote").textContent = NOTES[id];
    $("#whatif").classList.toggle("is-hidden", id !== "n34");
    draw(); buildTable();
  }
  $$("[data-index]").forEach((b) => b.addEventListener("click", () => setIndex(b.dataset.index)));

  // ── Table view ────────────────────────────────────────────────────────────
  function buildTable() {
    const host = $("#compareTable");
    const table = el("table");
    const hr = el("tr", {}, el("thead", {}, table));
    el("th", { text: "Month", scope: "col" }, hr);
    series.forEach((s) => el("th", { text: s.label, scope: "col" }, hr));
    const tb = el("tbody", {}, table);
    for (let i = 0; i < 24; i++) {
      const tr = el("tr", {}, tb);
      el("td", { text: `${MONTHS[i % 12]}, ${i < 12 ? "year 1" : "year 2"}` }, tr);
      for (const s of series) {
        const p = valueAt(s, i);
        el("td", { class: p && p.fc ? "fc" : "", text: p ? `${p.fc ? "≈ " : ""}${fmt(p.v, p.fc ? 1 : 2)}` : "—" }, tr);
      }
    }
    host.replaceChildren(table);
  }

  setIndex(index);
  setPeak(peak);
  U.onWidthChange(box, draw);
})();
