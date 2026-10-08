// 04 · The fallout — a Pacific-centred world map of what El Niño has done and is expected to do.
(() => {
  const { $, $$, svg, el, reducedMotion } = U;
  const G = GEO.world;
  const COLORS = { dry: "#d95926", wet: "#3987e5", storm: "#199e70", trade: "#c9cfda" };
  const SUMMARY = {
    jjas: "The northern summer: monsoons faltered, fires spread across Indonesia, and the Atlantic hurricane season stalled.",
    ond: "Right now: the Pacific's rain band is in the wrong half of the ocean, and East Africa's rains are forecast to overshoot.",
    djf: "The peak: the jet stream shifts south over North America while southern Africa's growing season dries out.",
    mam: "The ocean starts to cool, but the damage arrives late: failed harvests, the hot season, and the hungriest months.",
  };

  // Equal Earth, matching scripts/build-geo.mjs.
  const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  function project(lon, lat) {
    const lam = ((((lon - G.center + 540) % 360) + 360) % 360 - 180) * Math.PI / 180, phi = lat * Math.PI / 180;
    const l = Math.asin(M * Math.sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
    const px = (lam * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
    const py = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
    return [G.tx + G.k * px, G.ty - G.k * py];
  }
  const PX_PER_DEG = G.k * (Math.PI / 180) / (M * A1);

  let season = "ond";
  let selected = null;
  const types = new Set(Object.keys(DATA.types));
  const isVisible = (it) => it.seasons.includes(season) && types.has(it.type);

  // ── Map ───────────────────────────────────────────────────────────────────
  // Rebuilt at the map's real pixel size so markers and labels stay legible at any width.
  const map = $("#worldSvg");
  function buildMap() {
    const wpx = map.clientWidth || G.w, k = wpx / G.w, small = wpx < 560;
    const at = (lon, lat) => project(lon, lat).map((v) => v * k);
    map.setAttribute("viewBox", `0 0 ${wpx} ${(G.h * k).toFixed(1)}`);
    map.replaceChildren();
    const defs = svg("defs", {}, map);
    const grad = svg("radialGradient", { id: "tongue" }, defs);
    svg("stop", { offset: "0", "stop-color": "#ff6a3d", "stop-opacity": 0.8 }, grad);
    svg("stop", { offset: "0.55", "stop-color": "#f0a23a", "stop-opacity": 0.32 }, grad);
    svg("stop", { offset: "1", "stop-color": "#f0a23a", "stop-opacity": 0 }, grad);
    const [tx0] = at(172, 0), [tx1, tyc] = at(283, -1);
    svg("ellipse", { class: "w-tongue", cx: (tx0 + tx1) / 2 + 18 * k, cy: tyc, rx: (tx1 - tx0) / 2 + 10 * k, ry: 30 * k, fill: "url(#tongue)" }, map);
    const base = svg("g", { transform: `scale(${k})` }, map);
    svg("path", { class: "w-land", d: G.land }, base);
    svg("path", { class: "w-borders", d: G.borders, "vector-effect": "non-scaling-stroke" }, base);
    svg("line", { class: "w-eq", x1: 0, x2: wpx, y1: G.ty * k, y2: G.ty * k }, map);
    if (!small) svg("text", { class: "geo-label", x: (tx0 + tx1) / 2 + 10 * k, y: tyc - 30 * k - 6, "text-anchor": "middle", text: "Record-warm water" }, map);

    const layer = svg("g", {}, map);
    for (const it of [...DATA.impacts].sort((x, y) => y.r - x.r)) {
      const [cx, cy] = at(it.lon, it.lat), R = Math.max(small ? 6 : 9, it.r * PX_PER_DEG * 0.9 * k);
      const g = svg("g", { class: `marker ${it.status}${it === selected ? " is-on" : ""}`, style: `--c:${COLORS[it.type]}`, role: "button", "aria-label": `${it.name}: ${it.headline}. ${it.status === "observed" ? "Reported in 2026" : "Expected"}.`, transform: `translate(${cx.toFixed(1)},${cy.toFixed(1)})` }, layer);
      svg("circle", { class: "area", r: R.toFixed(1) }, g);
      if (it.status === "observed") svg("circle", { class: "ping", r: 7 }, g);
      svg("circle", { class: "core", r: small ? 4 : 6 }, g);
      const anchor = cx < 90 ? "start" : cx > wpx - 90 ? "end" : "middle";
      if (!small) svg("text", { class: "marker-label", y: -(R + 7), x: anchor === "start" ? -R : anchor === "end" ? R : 0, "text-anchor": anchor, text: it.name }, g);
      svg("circle", { class: "hit", r: small ? 14 : Math.min(22, Math.max(16, R)).toFixed(1) }, g);
      g.addEventListener("click", () => select(it));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(it); } });
      it.node = g;
    }
    applyFilter();
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const seg = $("#seasonSeg");
  for (const s of DATA.seasons) {
    const b = el("button", { type: "button", class: "seg-btn", "data-season": s.id }, seg);
    b.append(s.label);
    el("small", { text: s.note }, b);
    b.addEventListener("click", () => setSeason(s.id));
  }
  const legend = $("#typeLegend");
  for (const [id, t] of Object.entries(DATA.types)) {
    const b = el("button", { type: "button", class: "legend-item is-on", style: `--c:${COLORS[id]}`, "aria-pressed": "true" }, legend);
    el("span", { class: "key sq" }, b);
    el("span", { text: t.label }, b);
    b.addEventListener("click", () => {
      types.has(id) ? types.delete(id) : types.add(id);
      if (!types.size) Object.keys(DATA.types).forEach((k) => types.add(k)); // never leave the map empty
      $$(".legend-item", legend).forEach((x, i) => { const on = types.has(Object.keys(DATA.types)[i]); x.classList.toggle("is-on", on); x.classList.toggle("is-off", !on); x.setAttribute("aria-pressed", on); });
      refresh();
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────
  const list = $("#impactList");
  for (const it of DATA.impacts) {
    const b = el("button", { type: "button", class: `impact-item ${it.status}`, style: `--c:${COLORS[it.type]}` }, list);
    el("i", {}, b);
    el("span", { class: "ii-name", text: it.name }, b);
    el("span", { class: "ii-head", text: it.headline }, b);
    b.addEventListener("click", () => { select(it); if (window.innerWidth < 980) $("#impactPanel").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" }); });
    it.listNode = b;
  }

  // ── Panel ─────────────────────────────────────────────────────────────────
  const panel = $("#impactPanel");
  const visible = () => DATA.impacts.filter(isVisible);
  function select(it) {
    selected = it;
    for (const x of DATA.impacts) { if (x.node) x.node.classList.toggle("is-on", x === it); x.listNode.classList.toggle("is-on", x === it); }
    panel.replaceChildren();
    if (!it) return;
    panel.style.setProperty("--c", COLORS[it.type]);
    const tags = el("div", { class: "ip-tags" }, panel);
    const st = el("span", { class: `tag ${it.status}`, style: `--c:${COLORS[it.type]}` }, tags);
    el("i", {}, st); st.append(it.status === "observed" ? "Reported in 2026" : "Expected");
    el("span", { class: "tag", text: DATA.types[it.type].label }, tags);
    el("p", { class: "ip-place", text: it.name }, panel);
    el("h3", { class: "ip-head", text: it.headline }, panel);
    el("p", { class: "ip-stat", text: it.stat }, panel);
    el("p", { class: "ip-stat-label", text: it.statLabel }, panel);
    el("p", { class: "ip-text", text: it.text }, panel);
    el("p", { class: "ip-source", text: `Source: ${it.source}` }, panel);
    const nav = el("div", { class: "ip-nav" }, panel);
    const step = (d) => { const v = visible(); if (v.length) select(v[(v.indexOf(selected) + d + v.length) % v.length]); };
    el("button", { type: "button", text: "← Previous" }, nav).addEventListener("click", () => step(-1));
    el("button", { type: "button", text: "Next →" }, nav).addEventListener("click", () => step(1));
  }

  function applyFilter() {
    for (const it of DATA.impacts) {
      const on = isVisible(it);
      if (it.node) {
        it.node.classList.toggle("is-hidden", !on);
        it.node.setAttribute("tabindex", on ? 0 : -1);
        it.node.setAttribute("aria-hidden", !on);
      }
      if (it.listNode) it.listNode.hidden = !on;
    }
  }
  function refresh() {
    applyFilter();
    if (!selected || !isVisible(selected)) {
      const v = visible();
      select(v.find((x) => x.status === "observed") || v[0] || null);
    }
  }
  function setSeason(id) {
    season = id;
    $$(".seg-btn", seg).forEach((b) => { const on = b.dataset.season === id; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
    $("#seasonSummary").textContent = SUMMARY[id];
    refresh();
  }
  buildMap();
  setSeason(season);
  U.onWidthChange(map.parentElement, buildMap);

  // ── Ledger, prices, sources ───────────────────────────────────────────────
  const ledger = $("#ledger");
  for (const row of DATA.ledger) {
    const r = el("div", { class: "ledger-row" }, ledger);
    el("span", { class: "lv", text: row.value }, r);
    const l = el("span", { class: "ll", text: row.label }, r);
    el("small", { text: row.source }, l);
  }
  const bars = $("#priceChart");
  const max = 50;
  for (const p of DATA.prices) {
    const row = el("div", { class: "bar-row", title: `${p.crop}: +${p.change}% year on year` }, bars);
    el("span", { text: p.crop }, row);
    const fill = el("div", { class: "bar-fill" }, el("div", { class: "bar-track" }, row));
    el("b", { text: `+${p.change}%` }, row);
    fill.dataset.w = `${(p.change / max) * 100}%`;
  }
  const grow = () => $$(".bar-fill", bars).forEach((f) => { f.style.width = f.dataset.w; });
  if (reducedMotion) grow();
  else new IntersectionObserver(([e], io) => { if (e.isIntersecting) { grow(); io.disconnect(); } }, { threshold: 0.4 }).observe(bars);

  const sl = $("#sourceList");
  for (const s of DATA.sources) el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.name }, el("li", {}, sl));

  const last = DATA.weekly[DATA.weekly.length - 1];
  $("#navValue").textContent = `${U.fmt(last.n34)}°C`;
  $("#asOf").textContent = DATA.AS_OF;
  $$(".as-of").forEach((n) => { n.textContent = DATA.AS_OF; });
})();
