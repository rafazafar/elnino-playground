// Hero backdrop: the tropical Pacific, with the 2026 heat tongue replaying its growth and then shimmering.
(() => {
  const { $, clamp, lerp, heat, rgb, fieldAt, makeFieldRenderer, FIELD, fitCanvas, whenVisible, reducedMotion } = U;
  const canvas = $("#heroCanvas");
  const P = GEO.pacific;
  const land = new Path2D(P.land);
  const render = makeFieldRenderer();
  const weeks = DATA.weekly;
  const last = weeks[weeks.length - 1];

  // Replays January → September over the first few seconds, then holds on the latest week.
  const INTRO = reducedMotion ? 0 : 3.4;
  let started = null;
  function weekAt(now) {
    if (!INTRO) return last;
    if (started == null) started = now;
    const p = clamp((now - started) / INTRO, 0, 1);
    const e = 1 - Math.pow(1 - p, 2.2);
    const f = e * (weeks.length - 1), i = Math.floor(f), j = Math.min(weeks.length - 1, i + 1), t = f - i;
    const a = weeks[i], b = weeks[j];
    return { n12: lerp(a.n12, b.n12, t), n3: lerp(a.n3, b.n3, t), n34: lerp(a.n34, b.n34, t), n4: lerp(a.n4, b.n4, t) };
  }

  // Bright streaks drifting east along the equator: the warm water on the move.
  const N = 240;
  const parts = Array.from({ length: N }, () => spawn({}, true));
  function spawn(p, anywhere) {
    p.lon = anywhere ? 150 + Math.random() * 135 : 148 + Math.random() * 40;
    p.lat = (Math.random() - 0.5) * 16 - (p.lon > 255 ? 3 : 0);
    p.speed = 3 + Math.random() * 6;
    p.life = 0; p.max = 3 + Math.random() * 5;
    p.len = 0.8 + Math.random() * 2.2;
    return p;
  }

  let view = { s: 1, x0: 0, y0: 0, w: 0, h: 0 };
  function layout() {
    const { ctx, w, h } = fitCanvas(canvas);
    // Show roughly the eastern 70–110° of the Pacific, pinned to the right edge, with the
    // equator in the upper half. The map's top and bottom edges are faded into the page.
    const span = clamp(60 + w * 0.03, 70, 110);
    const s = w / ((span / 180) * P.w);
    view = { ctx, s, x0: w - P.w * s, y0: h * (w < 720 ? 0.3 : 0.4) - (P.h / 2) * s, w, h };
  }
  const X = (lon) => view.x0 + ((lon - P.lon0) / (P.lon1 - P.lon0)) * P.w * view.s;
  const Y = (lat) => view.y0 + ((P.lat1 - lat) / (P.lat1 - P.lat0)) * P.h * view.s;

  function frame(dt, now) {
    const { ctx, s, x0, y0, w, h } = view;
    const wk = weekAt(now);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#050b17";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const img = render(wk, now * 0.6);
    ctx.drawImage(img, 0, 0, FIELD.w, FIELD.h, x0, y0, P.w * s, P.h * s);

    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const p of parts) {
      const a = fieldAt(p.lon, p.lat, wk, now * 0.6);
      p.life += dt;
      const v = p.speed * (0.25 + clamp(a, 0, 5) * 0.3);
      p.lon += v * dt;
      p.lat += Math.sin(p.lon * 0.3 + now) * 0.4 * dt;
      if (p.life > p.max || p.lon > 287) { spawn(p, false); continue; }
      const fade = Math.sin((p.life / p.max) * Math.PI) * clamp(a / 3, 0, 1);
      if (fade < 0.03) continue;
      const c = heat(a + 1.4);
      ctx.strokeStyle = rgb([c[0] + 40, c[1] + 50, c[2] + 40], fade * 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(p.lon - p.len * (0.4 + a * 0.3)), Y(p.lat));
      ctx.lineTo(X(p.lon), Y(p.lat));
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(s, s);
    ctx.fillStyle = "#0a1424";
    ctx.fill(land);
    ctx.lineWidth = 1 / s;
    ctx.strokeStyle = "rgba(120,150,200,0.28)";
    ctx.stroke(land);
    ctx.restore();

    // fade the map's north and south edges into the page background
    const mh = P.h * s, edge = mh * 0.22;
    for (const [ya, yb] of [[y0, y0 + edge], [y0 + mh, y0 + mh - edge]]) {
      const gr = ctx.createLinearGradient(0, ya, 0, yb);
      gr.addColorStop(0, "rgba(5,11,23,1)"); gr.addColorStop(1, "rgba(5,11,23,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, Math.min(ya, yb) - 1, w, edge + 2);
    }
    ctx.fillStyle = "#050b17";
    if (y0 > 0) ctx.fillRect(0, 0, w, y0);
    if (y0 + mh < h) ctx.fillRect(0, y0 + mh, w, h - y0 - mh);
  }

  layout();
  window.addEventListener("resize", layout);
  if (reducedMotion) frame(0, 0);
  else whenVisible(canvas, frame);
})();
