// 01 · The machine — flat 2D renderer. Used only when WebGL is unavailable (or with ?flat in the URL).
// Draws the same model as the 3D scene as a cross-section on a plain canvas.
window.Machine2D = {
  start() {
    const M = window.MACHINE;
    const { $, clamp, lerp, smooth, ramp, rgb, fitCanvas } = U;
    const { E, sst, thermocline, trade, rainU, upwelling, poolEdge } = M.model;
    const canvas = $("#machineCanvas");
    canvas.hidden = false;
    $("#m3Canvas").hidden = true;
    let time = 0;

    const sea = ramp([
      [8, [5, 14, 40]], [13, [9, 32, 78]], [18, [14, 62, 120]], [22, [24, 102, 150]], [24.5, [52, 140, 150]],
      [26.5, [150, 160, 96]], [28, [232, 158, 60]], [29.3, [240, 108, 48]], [30.5, [222, 56, 72]], [31.5, [240, 100, 150]],
    ]);

    // ── Scene geometry ────────────────────────────────────────────────────────
    let g = null;
    const tex = document.createElement("canvas");
    tex.width = 200; tex.height = 64;
    const tctx = tex.getContext("2d");
    const timg = tctx.createImageData(tex.width, tex.height);
    const DEPTH = 320; // metres shown

    function layout() {
      const fit = fitCanvas(canvas), play = M.state.play;
      // The stage is a full viewport tall: draw the slice in a band, clear of the story card on wide screens.
      const left = !play && fit.w > 900 ? Math.min(440, fit.w * 0.35) + 70 : 0, w = fit.w - left - (left ? 50 : 0);
      const bh = Math.min(fit.h * 0.6, w * 0.52), top = Math.max(play ? 170 : 130, (fit.h - bh) * (play ? 0.3 : 0.45));
      g = { ctx: fit.ctx, w, h: bh, top, left, fullW: fit.w, full: fit.h, play, seaY: bh * 0.47, x0: w * 0.065, x1: w * 0.935 };
    }
    const X = (u) => g.x0 + u * (g.x1 - g.x0);
    const Zy = (m) => g.seaY + (m / DEPTH) * (g.h - g.seaY);

    // ── Particles ─────────────────────────────────────────────────────────────
    const rnd = (a, b) => a + Math.random() * (b - a);
    const wind = Array.from({ length: 70 }, () => ({ u: Math.random(), k: Math.random(), s: rnd(0.6, 1.3) }));
    const rain = Array.from({ length: 150 }, () => ({ o: rnd(-1, 1), p: Math.random(), s: rnd(0.8, 1.5) }));
    const coastRain = Array.from({ length: 50 }, () => ({ o: rnd(-1, 1), p: Math.random(), s: rnd(0.8, 1.5) }));
    const upw = Array.from({ length: 28 }, (_, i) => ({ i, o: Math.random(), p: Math.random(), s: rnd(0.6, 1.2) }));
    const fish = Array.from({ length: 16 }, (_, i) => ({ i, u: rnd(0.7, 0.93), z: rnd(14, 70), ph: rnd(0, 6.28), s: rnd(0.012, 0.03), dir: Math.random() < 0.5 ? -1 : 1 }));

    // ── Drawing ───────────────────────────────────────────────────────────────
    function drawOcean() {
      const d = timg.data, W = tex.width, Hh = tex.height;
      for (let x = 0; x < W; x++) {
        const u = (x / (W - 1)) * 1.16 - 0.08;
        const s = sst(u), D = thermocline(u);
        for (let y = 0; y < Hh; y++) {
          const z = ((y + 0.5) / Hh) * DEPTH;
          const mix = s - z * 0.012;
          const deep = 10.5 + 5 * Math.exp(-Math.max(0, z - D) / 110);
          const b = 0.5 * (1 + Math.tanh((z - D) / 17));
          const c = sea(mix * (1 - b) + deep * b);
          const i = (y * W + x) * 4;
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
      }
      tctx.putImageData(timg, 0, 0);
      const { ctx, w, h, seaY } = g;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(tex, 0, 0, tex.width, tex.height, X(-0.08), seaY, X(1.08) - X(-0.08), h - seaY);
      // depth shading
      const sh = ctx.createLinearGradient(0, seaY, 0, h);
      sh.addColorStop(0, "rgba(255,255,255,0.10)"); sh.addColorStop(0.06, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(2,6,16,0.45)");
      ctx.fillStyle = sh; ctx.fillRect(0, seaY, w, h - seaY);
    }

    function drawSky() {
      const { ctx, w, seaY } = g, e = E();
      const sky = ctx.createLinearGradient(0, 0, 0, seaY);
      sky.addColorStop(0, "#071127"); sky.addColorStop(0.7, "#10244a"); sky.addColorStop(1, "#1b3765");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, seaY);
      // fire haze over the west when the rain has left
      const haze = smooth(0.45, 1, e);
      if (haze > 0.01) {
        const hz = ctx.createRadialGradient(X(0.02), seaY, 0, X(0.02), seaY, w * 0.3);
        hz.addColorStop(0, `rgba(255,140,60,${0.34 * haze})`); hz.addColorStop(1, "rgba(255,140,60,0)");
        ctx.fillStyle = hz; ctx.fillRect(0, 0, w * 0.4, seaY);
      }
      // stars, dimmed by cloud later
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 40; i++) { const sx = (i * 137.5) % w, sy = ((i * 71.3) % (seaY * 0.55)); ctx.fillRect(sx, sy, 1, 1); }
    }

    function cloud(cx, baseY, scale, alpha) {
      if (alpha <= 0.01) return;
      const { ctx } = g;
      const lobes = [[-1.5, 0, 0.75], [-0.7, -0.5, 0.95], [0.1, -1.05, 1.15], [0.95, -0.55, 0.95], [1.6, 0, 0.7], [0, -0.1, 1.1], [-0.3, -1.7, 0.8], [0.5, -2.15, 0.62]];
      for (const [dx, dy, r] of lobes) {
        const x = cx + dx * scale * 1.05 + Math.sin(time * 0.5 + dx) * 1.5, y = baseY + dy * scale, rr = r * scale;
        const gr = ctx.createRadialGradient(x, y - rr * 0.25, rr * 0.1, x, y, rr);
        gr.addColorStop(0, `rgba(236,241,250,${0.85 * alpha})`); gr.addColorStop(0.7, `rgba(170,184,208,${0.5 * alpha})`); gr.addColorStop(1, "rgba(120,140,170,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
      }
    }
    function rainfall(drops, cx, baseY, halfW, alpha, dt) {
      if (alpha <= 0.02) return;
      const { ctx, seaY } = g;
      ctx.strokeStyle = `rgba(170,205,255,${0.5 * alpha})`; ctx.lineWidth = 1.1; ctx.beginPath();
      const n = Math.round(drops.length * clamp(alpha, 0, 1));
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        d.p += dt * d.s * 1.5; if (d.p > 1) d.p -= 1;
        const x = cx + d.o * halfW - d.p * 8, y = lerp(baseY, seaY - 2, d.p);
        ctx.moveTo(x, y); ctx.lineTo(x - 2.4, y + 9);
      }
      ctx.stroke();
    }

    function cell(xa, xb, clockwise, alpha, speed) {
      const { ctx, h, seaY } = g;
      if (alpha <= 0.02 || xb - xa < 36) return;
      const cx = (xa + xb) / 2, rx = (xb - xa) / 2, top = h * 0.085, bot = seaY - h * 0.055, cy = (top + bot) / 2, ry = (bot - top) / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.42 * alpha})`; ctx.lineWidth = 1.5; ctx.setLineDash([2, 9]); ctx.lineCap = "round";
      ctx.lineDashOffset = (clockwise ? -1 : 1) * time * 26 * speed;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832, !clockwise); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,255,255,${0.7 * alpha})`;
      const dir = clockwise ? 1 : -1;
      arrowHead(cx, top, 0, dir); arrowHead(cx, bot, Math.PI, dir);
      ctx.restore();
    }
    function arrowHead(x, y, rot, dir) {
      const { ctx } = g;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(dir, 1);
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-4, 4.5); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    function drawWind(dt) {
      const { ctx, h, seaY } = g;
      ctx.lineCap = "round";
      const count = g.w < 560 ? 34 : wind.length;
      for (let i = 0; i < count; i++) {
        const p = wind[i];
        const v = trade(p.u);
        p.u -= v * dt * 0.11 * p.s;
        if (p.u < 0) p.u += 1; if (p.u > 1) p.u -= 1;
        const y = seaY - h * (0.022 + p.k * 0.1), x = X(p.u);
        const len = clamp(Math.abs(v), 0.05, 1.6) * 20 * p.s, a = (0.22 + 0.5 * clamp(Math.abs(v), 0, 1)) * Math.sin(p.u * Math.PI) ** 0.5;
        const dir = v >= 0 ? -1 : 1; // head points the way the air moves
        ctx.strokeStyle = `rgba(215,232,255,${a})`; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x - dir * len, y); ctx.lineTo(x, y); ctx.stroke();
        if (len > 7) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * 4, y - 2.6); ctx.moveTo(x, y); ctx.lineTo(x - dir * 4, y + 2.6); ctx.stroke(); }
      }
    }

    function drawThermocline() {
      const { ctx } = g;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const u = i / 60, x = X(u), y = Zy(thermocline(u)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    }

    function drawUpwelling(dt) {
      const { ctx } = g, up = upwelling();
      const n = Math.round((upw.length * up) / 1.5);
      ctx.lineCap = "round";
      for (const p of upw) {
        if (p.i >= n) continue;
        p.p += dt * 0.22 * p.s * (0.5 + up); if (p.p > 1) { p.p -= 1; p.o = Math.random(); }
        const u = 0.985 - p.o * 0.07 - p.p * p.p * 0.07, z = lerp(230, 8, p.p);
        const x = X(u), y = Zy(z), a = Math.sin(p.p * Math.PI) * 0.8;
        ctx.strokeStyle = `rgba(150,225,255,${a})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x, y); ctx.moveTo(x - 3, y + 4); ctx.lineTo(x, y); ctx.lineTo(x + 3.4, y + 3.4); ctx.stroke();
      }
      const visible = (fish.length * up) / 1.15;
      for (const f of fish) {
        const a = clamp(visible - f.i, 0, 1); if (a <= 0.02) continue;
        f.u += f.dir * f.s * dt; if (f.u < 0.68) f.dir = 1; if (f.u > 0.94) f.dir = -1;
        const x = X(f.u), y = Zy(f.z + Math.sin(time * 1.3 + f.ph) * 5), wag = Math.sin(time * 9 + f.ph) * 2;
        ctx.save(); ctx.translate(x, y); ctx.scale(f.dir, 1);
        ctx.fillStyle = `rgba(214,232,244,${0.85 * a})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.3, 0, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, -3 + wag * 0.5); ctx.lineTo(-10, 3 + wag * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    function drawLand() {
      const { ctx, w, h, seaY } = g, e = E();
      const dry = smooth(0.4, 1, e), wet = smooth(0.45, 1, e);
      // West: Indonesia / Australia
      ctx.beginPath();
      ctx.moveTo(0, seaY - h * 0.075); ctx.quadraticCurveTo(w * 0.028, seaY - h * 0.115, w * 0.048, seaY - h * 0.03);
      ctx.lineTo(w * 0.066, seaY + h * 0.012); ctx.quadraticCurveTo(w * 0.082, seaY + h * 0.2, w * 0.1, h); ctx.lineTo(0, h); ctx.closePath();
      const c1 = [lerp(24, 74, dry), lerp(62, 52, dry), lerp(52, 36, dry)];
      const lg = ctx.createLinearGradient(0, seaY - h * 0.11, 0, h);
      lg.addColorStop(0, rgb(c1)); lg.addColorStop(0.2, "#0d1728"); lg.addColorStop(1, "#070d19");
      ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.stroke();
      // East: the Andes
      ctx.beginPath();
      ctx.moveTo(w, seaY - h * 0.27); ctx.lineTo(w * 0.982, seaY - h * 0.33); ctx.lineTo(w * 0.966, seaY - h * 0.2); ctx.lineTo(w * 0.953, seaY - h * 0.1);
      ctx.lineTo(w * 0.936, seaY + h * 0.005); ctx.quadraticCurveTo(w * 0.925, seaY + h * 0.2, w * 0.905, h); ctx.lineTo(w, h); ctx.closePath();
      const c2 = [lerp(58, 30, wet), lerp(50, 70, wet), lerp(44, 58, wet)];
      const rg = ctx.createLinearGradient(0, seaY - h * 0.33, 0, h);
      rg.addColorStop(0, "#5a6578"); rg.addColorStop(0.16, rgb(c2)); rg.addColorStop(0.42, "#0d1728"); rg.addColorStop(1, "#070d19");
      ctx.fillStyle = rg; ctx.fill(); ctx.stroke();
      // surface line
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w * 0.064, seaY + 0.5); ctx.lineTo(w * 0.937, seaY + 0.5); ctx.stroke();
    }

    function label(text, x, y, align = "center", alpha = 0.78) {
      if (alpha <= 0.02) return;
      const { ctx } = g;
      ctx.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = align; ctx.textBaseline = "middle";
      const t = text.toUpperCase();
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0.6px";
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(4,10,20,${0.55 * alpha})`; ctx.strokeText(t, x, y);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fillText(t, x, y);
    }

    function draw(dt) {
      if (!g) return;
      const { ctx, w, h, seaY } = g, e = E(), small = w < 560;
      ctx.clearRect(0, 0, g.fullW, g.full);
      ctx.save();
      ctx.translate(g.left, g.top);
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      drawSky();
      drawOcean();
      drawThermocline();
      drawUpwelling(dt);

      const ru = rainU(), rx = X(ru), cs = clamp(w / 34, 13, 30), base = seaY - h * 0.2;
      const tr = trade(0.6);
      cell(rx, X(0.955), true, 0.3 + 0.7 * clamp(tr, 0, 1), 0.4 + clamp(tr, 0, 1.4));
      cell(X(0.035), rx, false, smooth(0.22, 0.75, e), 0.5 + e * 0.6);
      drawWind(dt);

      cloud(X(0.085), base + cs * 0.4, cs * 0.6, clamp(1 - e * 1.7, 0, 1) * smooth(0.19, 0.3, ru));
      cloud(rx, base, cs, 1);
      rainfall(rain, rx, base + cs * 0.4, cs * 1.9, 1, dt);
      const coast = smooth(0.42, 0.95, e);
      cloud(X(0.965), base + cs * 0.1, cs * 0.72, coast);
      rainfall(coastRain, X(0.965), base + cs * 0.4, cs * 1.2, coast, dt);
      drawLand();

      // labels
      const pe = poolEdge();
      label("Warm pool", X(clamp(pe * 0.5, 0.14, 0.5)), Zy(34));
      label("Cold deep water", X(0.55), Zy(275), "center", 0.5);
      label("Thermocline", X(0.3), Zy(thermocline(0.3)) + 13, "center", 0.72);
      if (!small) {
        label(tr > 0.5 ? "← Trade winds" : tr > 0.05 ? "← Trades failing" : "Winds reversed →", X(ru < 0.42 ? 0.6 : 0.27), seaY - h * 0.145, "center", 0.7);
        label("Rising air · rain", rx, h * 0.045, "center", 0.62);
      }
      label("Upwelling", X(0.9), Zy(Math.max(120, thermocline(0.9) + 26)), "right", clamp(upwelling() * 1.6, 0, 0.8));
      if (e > 0.5 && !small) label("Sinking, dry air", X(0.1), h * 0.2, "left", smooth(0.5, 0.9, e) * 0.7);
      // depth ticks
      for (const m of [100, 200]) label(`${m} m`, w * (0.082 + 0.00006 * m) + 8, Zy(m), "left", 0.4);
      label("Indonesia", 12, h - 16, "left", 0.7);
      label("South America", w - 12, h - 16, "right", 0.7);
      ctx.restore();
    }

    layout();
    new ResizeObserver(layout).observe(canvas);
    M.use({ name: "2d", frame(dt, now) { time = now; if (g.play !== M.state.play) layout(); draw(dt); } });
  },
};
