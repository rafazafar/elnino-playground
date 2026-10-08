// 01 · The machine — shared model, scroll-driven story and controls.
// One number drives everything: T, the Niño 3.4 anomaly. Winds, thermocline, rain and upwelling are
// derived from it. This is a cartoon of the mechanism, not a physical model.
// A renderer (3D in js/machine3d.js, 2D fallback in js/machine2d.js) plugs in with MACHINE.use().
window.MACHINE = (() => {
  const { $, $$, clamp, lerp, smooth, fmt, el, whenVisible, reducedMotion } = U;
  const section = $("#machine"), stage = $("#m3Stage"), slider = $("#machineSlider");
  const T_MIN = +slider.min, T_MAX = +slider.max;

  const state = {
    T: 0, target: 0,      // current and target Niño 3.4 anomaly
    feedback: false,      // "nudge it & let go" is running
    time: 0,
    step: 0, progress: 0, // active story chapter and scroll progress through it
    play: false,          // last chapter: the reader has the controls
    pulses: [],           // warm "Kelvin wave" pulses travelling east along the thermocline
  };

  // ── Model ─────────────────────────────────────────────────────────────────
  const E = () => state.T / 4.1; // "El Niño-ness": 0 = neutral, 1 = forecast peak
  const softCap = (v, cap) => (v > cap ? cap + (v - cap) * 0.22 : v);
  function sst(u) {
    const uu = clamp(u, 0, 1);
    const base = 29.6 - 5.8 * smooth(0.12, 1, uu);
    const shape = smooth(0.12, 0.58, uu) * (1 + 0.3 * smooth(0.75, 1, uu)) - 0.08 * (1 - smooth(0, 0.3, uu));
    return softCap(base + state.T * shape, 30.3);
  }
  function thermocline(u) {
    const e = E(), uu = clamp(u, 0, 1);
    const west = 165 - 55 * e, east = clamp(48 + 95 * e, 18, 150);
    let d = lerp(west, east, smooth(0, 1, uu));
    for (const p of state.pulses) d += p.a * 26 * Math.exp(-(((uu - p.u) / 0.07) ** 2));
    return d;
  }
  const pulseAt = (u) => { let v = 0; for (const p of state.pulses) v += p.a * Math.exp(-(((u - p.u) / 0.07) ** 2)); return Math.min(1, v); };
  // Temperature at longitude fraction u and depth z (metres).
  function temp(u, z) {
    const s = sst(u), D = thermocline(u);
    const mix = s - z * 0.012, deep = 10.5 + 5 * Math.exp(-Math.max(0, z - D) / 110);
    const b = 0.5 * (1 + Math.tanh((z - D) / 17));
    return mix * (1 - b) + deep * b;
  }
  const trade = (u) => 1 - E() * (1.3 - 0.55 * u); // >0 blows westward (normal), <0 reversed
  const rainU = () => { const e = E(); return e <= 0 ? 0.14 + e * 0.08 : lerp(0.14, 0.64, Math.pow(clamp(e, 0, 1.05), 0.85)); };
  const upwelling = () => clamp(1 - E(), 0, 1.5);
  function poolEdge() { for (let u = 0; u <= 1; u += 0.004) if (sst(u) < 28.5) return u; return 1; }
  // The two overturning cells of the atmosphere, meeting where the air rises.
  const walker = () => ({ uc: rainU(), east: clamp(trade(0.6), 0.14, 1.5), west: 0.12 + 0.88 * smooth(0.15, 0.85, E()) });
  const lonLabel = (u) => { const lon = Math.round((120 + 160 * u) / 5) * 5; return lon <= 180 ? `${lon}°E` : `${360 - lon}°W`; };
  const model = { E, sst, thermocline, pulseAt, temp, trade, rainU, upwelling, poolEdge, walker, lonLabel };

  // ── Story chapters (read from the markup) ─────────────────────────────────
  const steps = $$(".m3-step", section).map((node, i) => ({
    node, i, id: node.dataset.step, cam: node.dataset.cam || node.dataset.step, title: node.dataset.title || "",
    t0: +(node.dataset.t0 || 0), t1: +(node.dataset.t1 ?? node.dataset.t0 ?? 0), from: +(node.dataset.from || 0.15),
  }));
  const last = steps.length - 1;
  // Each card pins itself while its chapter scrolls; it needs to know its own height to sit centred (or at the bottom on phones).
  const sizeCards = new ResizeObserver((entries) => { for (const e of entries) e.target.style.setProperty("--card-h", `${Math.round(e.target.offsetHeight)}px`); });
  $$(".m3-card", section).forEach((c) => sizeCards.observe(c));
  const LINE = 0.6; // the "reading line", as a fraction of the viewport height

  const dots = $("#m3Progress");
  steps.forEach((s) => {
    const li = el("li", {}, dots);
    const b = el("button", { type: "button", "aria-label": `Chapter ${s.i + 1}: ${s.title}`, title: s.title }, li);
    el("span", { text: s.title }, b);
    b.addEventListener("click", () => goTo(s.i));
    s.dot = b;
  });
  function goTo(i) {
    const r = steps[i].node.getBoundingClientRect();
    const y = window.scrollY + r.top + r.height * (i === last ? 0.5 : 0.42) - window.innerHeight * LINE;
    window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
  }
  $$("[data-m3-goto]", section).forEach((b) => b.addEventListener("click", () => goTo(b.dataset.m3Goto === "play" ? last : +b.dataset.m3Goto)));

  function onScroll() {
    const line = window.innerHeight * LINE;
    let active = 0, progress = 0;
    for (const s of steps) {
      const r = s.node.getBoundingClientRect();
      if (r.top <= line) { active = s.i; progress = clamp((line - r.top) / r.height, 0, 1); }
    }
    const changed = active !== state.step;
    state.step = active; state.progress = progress;
    const wasPlay = state.play;
    state.play = active === last;
    if (changed || wasPlay !== state.play || !stage.dataset.step) {
      stage.dataset.step = steps[active].id;
      stage.classList.toggle("is-play", state.play);
      steps.forEach((s) => { s.node.classList.toggle("is-active", s.i === active); s.node.classList.toggle("is-past", s.i < active); s.dot.classList.toggle("is-on", s.i === active); s.dot.classList.toggle("is-done", s.i < active); });
      if (!state.play) setFeedback(false);
      readouts(); // sync the slider and presets when the controls appear
      if (steps[active].id === "letgo" && !state.pulses.length) addPulse();
    }
    if (!state.play) {
      const s = steps[active];
      state.target = lerp(s.t0, s.t1, smooth(s.from, 0.88, progress));
    }
  }

  // ── Pulses ────────────────────────────────────────────────────────────────
  function addPulse() { if (state.pulses.length < 3) state.pulses.push({ u: 0.08, a: 0 }); }
  let rise = 0;
  function stepPulses(dt, dT) {
    rise += Math.max(0, dT);
    if (rise > 0.55) { rise = 0; addPulse(); }
    for (const p of state.pulses) {
      p.u += dt * 0.17;
      p.a = Math.min(smooth(0.08, 0.2, p.u), 1 - smooth(0.82, 1.02, p.u));
    }
    state.pulses = state.pulses.filter((p) => p.u < 1.03);
  }

  // ── Readouts ──────────────────────────────────────────────────────────────
  const out = { wind: $("#machineWind"), anom: $("#roAnom"), cls: $("#roClass"), pool: $("#roPool"), rain: $("#roRain"), up: $("#roUp"), explain: $("#machineExplain"), marker: $("#m3Marker") };
  const set = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };
  const EXPLAIN = [
    "<b>La Niña.</b> Stronger-than-normal trades shove even more warm water west. The thermocline tilts steeply, cold water wells up hard off Peru, and the rain stays locked over Indonesia and Australia.",
    "<b>A normal year.</b> Trade winds pile warm water up in the west. In the east the thermocline sits close to the surface, so cold, nutrient-rich water wells up. Rain falls where the water is warmest: over Indonesia.",
    "<b>El Niño.</b> The trades slacken and the warm pool slides east. The upwelling off Peru starts drawing up warm water instead of cold — which warms the east further and weakens the winds again.",
    "<b>A very strong El Niño</b> — the territory of 1982–83, 1997–98 and 2015–16. The rain has followed the warm water to mid-ocean. Indonesia and Australia sit under sinking, drying air; Peru's desert coast gets the storms.",
    "<b>Uncharted water.</b> Before 2026, no El Niño on record had pushed the monthly Niño 3.4 value past 2.72°C. Winds have reversed in the west, the east–west contrast is almost erased, and the upwelling that feeds Peru's fishery has all but shut off.",
  ];
  const FEEDBACK_TEXT = "<b>Let go and it runs away.</b> A slightly warmer east weakens the winds; weaker winds let more warm water slide east; that warms the east again. What finally stops it are slow waves inside the ocean that drain the warm water off the equator — which is why El Niños fade by late spring.";
  let lastExplain = -2;
  function readouts() {
    const T = state.T, tr = trade(0.45), up = upwelling(), pe = poolEdge(), ru = rainU();
    set(out.wind, T < -1 ? "Howling" : T < -0.5 ? "Strong" : T < 0.5 ? "Normal" : T < 1.5 ? "Slackening" : T < 2.75 ? "Failing" : tr > 0.12 ? "Nearly gone" : "Collapsed");
    set(out.anom, `${fmt(T, 1)}°C`);
    set(out.cls, T <= -0.5 ? "La Niña" : T < 0.5 ? "Neutral" : T < 1 ? "Weak El Niño" : T < 1.5 ? "Moderate El Niño" : T < 2 ? "Strong El Niño" : T < 2.75 ? "Very strong El Niño" : "Beyond any past event");
    set(out.pool, pe >= 0.995 ? "South America" : lonLabel(pe));
    set(out.rain, ru < 0.2 ? "Indonesia" : ru < 0.36 ? "Western Pacific" : ru < 0.5 ? "Date Line" : "Central Pacific");
    set(out.up, `${Math.round(up * 100)}%`);
    if (out.marker) out.marker.style.left = `${((T - T_MIN) / (T_MAX - T_MIN)) * 100}%`;
    const k = state.feedback ? -1 : T <= -0.5 ? 0 : T < 0.5 ? 1 : T < 2 ? 2 : T < 2.75 ? 3 : 4;
    if (k !== lastExplain) { out.explain.innerHTML = k === -1 ? FEEDBACK_TEXT : EXPLAIN[k]; lastExplain = k; }
    stage.style.setProperty("--heat", clamp(T / 4.1, 0, 1).toFixed(3));
    if (state.play) {
      slider.value = T;
      $$("[data-machine]").forEach((b) => b.classList.toggle("is-on", !state.feedback && Math.abs(+b.dataset.machine - state.target) < 0.03 && Math.abs(T - state.target) < 0.4));
    }
  }

  // ── Controls (live in the last chapter) ───────────────────────────────────
  const fbBtn = $("#machineFeedback");
  function setFeedback(on) {
    if (state.feedback === on) return;
    state.feedback = on;
    fbBtn.setAttribute("aria-pressed", on);
    fbBtn.textContent = on ? "■ Stop" : "▶ Nudge it & let go";
    readouts();
  }
  slider.addEventListener("input", () => { setFeedback(false); state.T = state.target = +slider.value; readouts(); });
  $$("[data-machine]").forEach((b) => b.addEventListener("click", () => { setFeedback(false); state.target = +b.dataset.machine; if (reducedMotion) state.T = state.target; readouts(); }));
  fbBtn.addEventListener("click", () => {
    if (state.feedback) return setFeedback(false);
    if (Math.abs(state.T) < 0.35 || state.T > 3.9 || state.T < -1.7) state.T = state.target = 0.35;
    setFeedback(true);
  });

  // ── Loop ──────────────────────────────────────────────────────────────────
  let renderer = null;
  function tick(dt, now) {
    state.time = now;
    const before = state.T;
    if (state.feedback) {
      const lim = state.T > 0 ? 4.2 : -1.9;
      state.T = state.target = clamp(state.T + 0.62 * state.T * (1 - (state.T / lim) ** 2) * dt, T_MIN, T_MAX);
      if (Math.abs(state.T) > Math.abs(lim) * 0.985) setFeedback(false); // saturated: the loop has run its course
    } else if (Math.abs(state.target - state.T) > 0.0015) {
      state.T += (state.target - state.T) * Math.min(1, dt * (state.play ? 4.5 : 3.2));
    }
    stepPulses(dt, state.T - before);
    if (state.T !== before) readouts();
    if (renderer) renderer.frame(dt, now);
  }

  function use(r) { renderer = r; stage.dataset.renderer = r.name; }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  readouts();
  if (reducedMotion) {
    // No animation loop: redraw only when the reader scrolls or touches a control.
    const once = () => { state.T = state.target; readouts(); if (renderer) renderer.frame(0, state.time); };
    window.addEventListener("scroll", once, { passive: true });
    ["input", "click"].forEach((ev) => section.addEventListener(ev, () => requestAnimationFrame(once)));
    requestAnimationFrame(once);
  } else {
    whenVisible(stage, tick);
  }

  return { state, model, steps, stage, use, T_MIN, T_MAX };
})();
