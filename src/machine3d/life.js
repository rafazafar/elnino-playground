// What moves inside the water: drifting tracers that show the currents, the cold upwelling off
// Peru, and the fish that depend on it.
import * as THREE from "three";
import { OX0, OX1, ZH, MAX_M, uOf, yOf, clamp, lerp, rnd, sea, glowPoints, streaks } from "./shared.js";
import { surfaceWind } from "./air.js";

export function createLife({ lite, model }) {
  const group = new THREE.Group();

  // ── Current tracers ────────────────────────────────────────────────────────
  // The wind drags the surface layer with it; beneath, an undercurrent flows the other way.
  const N = lite ? 420 : 900;
  const tracers = glowPoints(N);
  tracers.points.renderOrder = 3;
  group.add(tracers.points);
  const T = Array.from({ length: N }, () => ({ x: rnd(OX0 + 0.8, OX1 - 0.8), f: Math.pow(Math.random(), 0.8) * 1.25, z: ZH + 0.012, life: Math.random(), max: rnd(5, 11) }));

  // ── Surface drift ──────────────────────────────────────────────────────────
  // Thin streaks riding on the sea surface show which way the top layer is being pushed.
  const DR = lite ? 120 : 260;
  const drift = streaks(DR);
  drift.lines.renderOrder = 3;
  group.add(drift.lines);
  const D = Array.from({ length: DR }, () => ({ x: rnd(OX0 + 0.5, OX1 - 0.5), z: rnd(-ZH + 0.08, ZH - 0.08), life: Math.random(), max: rnd(3, 7) }));

  // ── Upwelling ──────────────────────────────────────────────────────────────
  const UP = lite ? 120 : 260;
  const up = glowPoints(UP);
  up.points.renderOrder = 3;
  group.add(up.points);
  const U = Array.from({ length: UP }, (_, i) => ({ i, p: Math.random(), o: Math.random(), z: Math.random() < 0.4 ? ZH + 0.012 : rnd(-ZH + 0.1, ZH), s: rnd(0.7, 1.3) }));

  // ── Fish ───────────────────────────────────────────────────────────────────
  const FISH = lite ? 28 : 54;
  const fishGeo = new THREE.ConeGeometry(0.028, 0.17, 5).rotateZ(-Math.PI / 2);
  const fish = new THREE.InstancedMesh(fishGeo, new THREE.MeshBasicMaterial({ color: 0xdfeaf5, transparent: true }), FISH);
  fish.renderOrder = 3; fish.frustumCulled = false;
  group.add(fish);
  const F = Array.from({ length: FISH }, (_, i) => ({ i, cx: rnd(3.7, 6.0), cy: rnd(-0.75, -0.16), cz: rnd(-1.6, ZH - 0.25), r: rnd(0.22, 0.62), w: rnd(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, 6.28) }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), axis = new THREE.Vector3(0, 1, 0);

  function update(dt, time, { xc, east, west }) {
    for (let i = 0; i < N; i++) {
      const t = T[i], u = clamp(uOf(t.x), 0, 1), D = model.thermocline(u);
      const drive = surfaceWind(t.x, xc, east, west) * 0.3;
      t.x += drive * Math.cos(Math.PI * Math.min(t.f, 1)) * dt;
      t.life += dt / t.max;
      if (t.life >= 1 || t.x < OX0 + 0.7 || t.x > OX1 - 0.7) { t.x = rnd(OX0 + 0.9, OX1 - 0.9); t.f = Math.pow(Math.random(), 0.8) * 1.25; t.life = 0; }
      const metres = Math.min(t.f * D, MAX_M - 6), c = sea(model.temp(u, metres));
      tracers.position.set([t.x, yOf(metres), t.z], i * 3);
      tracers.color.set([c[0] / 255 * 1.1 + 0.1, c[1] / 255 * 1.1 + 0.1, c[2] / 255 * 1.1 + 0.1, Math.sin(t.life * Math.PI) * 0.5], i * 4);
      tracers.size[i] = 4.5;
    }
    tracers.geo.attributes.position.needsUpdate = tracers.geo.attributes.color.needsUpdate = tracers.geo.attributes.size.needsUpdate = true;

    for (let i = 0; i < DR; i++) {
      const d = D[i], vel = surfaceWind(d.x, xc, east, west) * 0.34;
      d.x += vel * dt; d.life += dt / d.max;
      if (d.life >= 1 || d.x < OX0 + 0.35 || d.x > OX1 - 0.35) { d.x = rnd(OX0 + 0.5, OX1 - 0.5); d.z = rnd(-ZH + 0.08, ZH - 0.08); d.life = 0; }
      const a = Math.sin(d.life * Math.PI) * clamp(Math.abs(vel) * 3, 0.08, 0.5), tail = vel * 1.1, tilt = (0.5 - uOf(d.x)) * 0.2 * clamp(model.trade(0.5), -0.4, 1.5);
      drift.position.set([d.x - tail, 0.035 + tilt, d.z, d.x, 0.035 + tilt, d.z], i * 6);
      drift.color.set([1, 1, 1, 0, 1, 1, 1, a], i * 8);
    }
    drift.geo.attributes.position.needsUpdate = drift.geo.attributes.color.needsUpdate = true;

    const strength = model.upwelling(), active = (UP * strength) / 1.5;
    for (const p of U) {
      p.p += dt * 0.2 * p.s * (0.45 + strength); if (p.p > 1) { p.p -= 1; p.o = Math.random(); }
      let x, m;
      if (p.p < 0.62) { const k = p.p / 0.62; x = 6.72 - p.o * 0.42 - k * k * 0.3; m = lerp(265, 9, k); }       // rising along the slope
      else { const k = (p.p - 0.62) / 0.38; x = 6.42 - p.o * 0.42 - k * 2.0; m = 9 + k * 14; }                     // then spreading west at the surface
      const a = p.i < active ? Math.sin(p.p * Math.PI) * 0.85 : 0;
      up.position.set([x, yOf(m), p.z], p.i * 3);
      up.color.set([0.55, 0.9, 1, a], p.i * 4);
      up.size[p.i] = 6;
    }
    up.geo.attributes.position.needsUpdate = up.geo.attributes.color.needsUpdate = up.geo.attributes.size.needsUpdate = true;

    // the school thins and scatters as its food supply fails
    const visible = (FISH * strength) / 1.1;
    for (const f of F) {
      const s = clamp(visible - f.i, 0, 1), th = time * f.w + f.ph, r = f.r * (1 + (1 - s) * 1.6);
      pos.set(f.cx + Math.cos(th) * r, f.cy + Math.sin(th * 2) * 0.05, clamp(f.cz + Math.sin(th) * r * 0.55, -ZH + 0.1, ZH - 0.08));
      q.setFromAxisAngle(axis, -th - (f.w > 0 ? Math.PI / 2 : -Math.PI / 2));
      scl.setScalar(Math.max(1e-4, s));
      fish.setMatrixAt(f.i, m4.compose(pos, q, scl));
    }
    fish.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
