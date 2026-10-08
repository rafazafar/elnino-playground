// The atmosphere: the overturning Walker circulation drawn as thousands of wind streaks,
// storm towers where the air rises, rain beneath them and the occasional flash of lightning.
import * as THREE from "three";
import { OX0, OX1, ZH, AIR, clamp, lerp, rnd, streaks } from "./shared.js";

const XW = OX0 - 0.4, XE = OX1 + 0.4; // the cells reach a little over each coast
const SPEED = 1.9;

// Wind at (x, y) for two cells that meet at xc: air converges and rises there, sinks at both ends.
// Near the sea surface this is the trade wind; aloft it is the return flow.
function wind(x, y, xc, east, west, out) {
  const inWest = x < xc;
  const a = inWest ? XW : xc, b = inWest ? xc : XE, s = inWest ? west : -east;
  const width = Math.max(b - a, 1.6), xi = clamp((x - a) / (b - a), 0, 1), yy = clamp(y / AIR, 0, 1);
  out.u = s * Math.sin(Math.PI * xi) * Math.cos(Math.PI * yy) * SPEED;
  out.w = -s * (AIR / width) * Math.cos(Math.PI * xi) * Math.sin(Math.PI * yy) * SPEED * 0.55;
  return out;
}
export const surfaceWind = (x, xc, east, west) => wind(x, 0.05, xc, east, west, { u: 0, w: 0 }).u;

export function createAir({ lite, reducedMotion, sunDir }) {
  const group = new THREE.Group();

  // ── Wind streaks ───────────────────────────────────────────────────────────
  const N = lite ? 1300 : 3000;
  const flow = streaks(N);
  flow.lines.renderOrder = 5;
  group.add(flow.lines);
  const P = Array.from({ length: N }, () => spawn({}));
  function spawn(p) {
    p.x = rnd(XW, XE);
    p.y = 0.07 + (AIR - 0.16) * (Math.random() < 0.42 ? Math.random() * 0.2 : Math.random());   // extra streaks near the sea
    p.z = rnd(-ZH + 0.1, ZH - 0.1);
    p.life = 0; p.max = rnd(5, 13);
    return p;
  }
  P.forEach((p) => { p.life = Math.random() * p.max; });
  const v = { u: 0, w: 0 };

  // ── Conveyor belts ─────────────────────────────────────────────────────────
  // One ribbon of moving chevrons per cell makes the direction of the loop readable at a glance.
  const SEG = 72, RIB_Z = -0.7, RIB_W = 0.62;   // a band standing upright behind the storm, facing the viewer
  function makeRibbon() {
    const geo = new THREE.BufferGeometry();
    const position = new Float32Array((SEG + 1) * 6), uv = new Float32Array((SEG + 1) * 4), rise = new Float32Array((SEG + 1) * 2), index = [];
    for (let i = 0; i < SEG; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("rise", new THREE.BufferAttribute(rise, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(index);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPhase: { value: 0 }, uAlpha: { value: 0 } },
      vertexShader: /* glsl */ `attribute float rise; varying vec2 vUv; varying float vRise;
        void main() { vUv = uv; vRise = rise; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uPhase; uniform float uAlpha; varying vec2 vUv; varying float vRise;
        void main() {
          float c = fract(vUv.x * 1.15 - uPhase + abs(vUv.y) * 0.3);
          float band = smoothstep(0.0, 0.1, c) * smoothstep(0.5, 0.26, c);
          float edge = 1.0 - smoothstep(0.7, 1.0, abs(vUv.y));
          vec3 col = mix(vec3(0.55, 0.76, 1.0), vec3(1.0, 0.8, 0.5), smoothstep(-0.2, 0.7, vRise));   // rising air warm, the rest cool
          gl_FragColor = vec4(col, (band * 0.5 + 0.06) * edge * uAlpha);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 4;
    group.add(mesh);
    const pts = new Float32Array((SEG + 1) * 2);
    // Lay the ribbon along a rounded rectangle; `mirror` flips it so the west cell turns the other way.
    function set(xl, xr, mirror) {
      const yb = 0.52, yt = AIR - 0.55, r = Math.max(0.12, Math.min(0.95, (xr - xl) / 2 - 0.05));
      const pieces = [
        (t) => [lerp(xr - r, xl + r, t), yb], (t) => arc(xl + r, yb + r, r, -90 - 90 * t),
        (t) => [xl, lerp(yb + r, yt - r, t)], (t) => arc(xl + r, yt - r, r, 180 - 90 * t),
        (t) => [lerp(xl + r, xr - r, t), yt], (t) => arc(xr - r, yt - r, r, 90 - 90 * t),
        (t) => [xr, lerp(yt - r, yb + r, t)], (t) => arc(xr - r, yb + r, r, -90 * t),
      ];
      const per = SEG / pieces.length;
      for (let i = 0; i <= SEG; i++) {
        const k = Math.min(pieces.length - 1, Math.floor(i / per)), p = pieces[k]((i - k * per) / per);
        pts[i * 2] = mirror ? xl + xr - p[0] : p[0]; pts[i * 2 + 1] = p[1];
      }
      let len = 0;
      for (let i = 0; i <= SEG; i++) {
        const x = pts[i * 2], y = pts[i * 2 + 1], j = Math.min(SEG, i + 1), h = Math.max(0, i - 1);
        if (i) len += Math.hypot(x - pts[i * 2 - 2], y - pts[i * 2 - 1]);
        const dx = pts[j * 2] - pts[h * 2], dy = pts[j * 2 + 1] - pts[h * 2 + 1], ds = Math.hypot(dx, dy) || 1;
        const nx = (-dy / ds) * RIB_W * 0.5, ny = (dx / ds) * RIB_W * 0.5;       // offset across the path, within the x–y plane
        position.set([x - nx, y - ny, RIB_Z, x + nx, y + ny, RIB_Z], i * 6);
        uv.set([len, -1, len, 1], i * 4);
        rise[i * 2] = rise[i * 2 + 1] = dy / ds;
      }
      geo.attributes.position.needsUpdate = geo.attributes.uv.needsUpdate = geo.attributes.rise.needsUpdate = true;
    }
    return { set, mat, phase: 0 };
  }
  const arc = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const beltE = makeRibbon(), beltW = makeRibbon();

  // ── Storm towers ───────────────────────────────────────────────────────────
  const PUFFS = lite ? 44 : 78;
  const clouds = [
    { x: 0, strength: 1, scale: 1.14, base: 1.5 },     // the main rain band, wherever the warmest water is
    { x: OX1 + 0.35, strength: 0, scale: 0.8, base: 1.65 },   // over Peru's coast in El Niño
    { x: OX0 + 1.1, strength: 0, scale: 0.66, base: 1.6 },      // what is left over Indonesia
  ];
  const layout = clouds.map(() => Array.from({ length: PUFFS }, (_, i) => {
    const t = i / (PUFFS - 1), anvil = t > 0.72 ? (t - 0.72) / 0.28 : 0;
    const spread = 0.42 + 0.4 * Math.sin(Math.min(t / 0.72, 1) * Math.PI) + anvil * 1.05;
    const ang = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * spread;
    return { x: Math.cos(ang) * r * 1.15, y: t * 2.3 + rnd(-0.1, 0.1), z: Math.sin(ang) * r * 0.9, r: lerp(0.44, 0.24, t) * rnd(0.7, 1.25) + anvil * 0.08, ph: rnd(0, 6.28) };
  }));
  // Soft-edged puffs: bright sunlit tops, dark rain-heavy bases, edges feathered with alpha-to-coverage.
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir }, uFlash: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW;
      void main() {
        mat4 im = modelMatrix * instanceMatrix;
        vec4 w = im * vec4(position, 1.0);
        vN = normalize(mat3(im) * normal); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform float uFlash; uniform float uHeat;
      varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float ndv = max(dot(n, v), 0.0);
        float d = dot(n, uSun) * 0.5 + 0.5;
        float hgt = smoothstep(1.3, 3.7, vW.y);
        vec3 shade = mix(vec3(0.17, 0.21, 0.33), vec3(0.34, 0.4, 0.55), hgt);
        vec3 lit = mix(vec3(0.74, 0.79, 0.88), vec3(0.98, 0.95, 0.9), hgt);
        vec3 col = mix(shade, lit, pow(d, 1.5) * (0.5 + 0.5 * hgt));
        col *= mix(0.6, 1.0, smoothstep(-0.7, 0.2, n.y));
        col += vec3(0.85, 0.92, 1.0) * pow(1.0 - ndv, 3.0) * 0.2;
        col = mix(col, col * vec3(1.1, 0.92, 0.8), uHeat * 0.35);
        col += vec3(0.65, 0.78, 1.0) * uFlash;
        gl_FragColor = vec4(col, smoothstep(0.0, 0.6, ndv));
      }`,
    alphaToCoverage: true,
  });
  const cloudMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, lite ? 1 : 2), cloudMat, PUFFS * clouds.length);
  cloudMesh.frustumCulled = false;
  group.add(cloudMesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();

  // ── Rain ───────────────────────────────────────────────────────────────────
  const DROPS = lite ? 360 : 800;
  const rain = streaks(DROPS);
  rain.lines.renderOrder = 6;
  group.add(rain.lines);
  const drops = Array.from({ length: DROPS }, (_, i) => ({ c: i % 4 === 3 ? 1 : i % 9 === 0 ? 2 : 0, ang: rnd(0, 6.28), r: Math.sqrt(Math.random()), p: Math.random(), s: rnd(0.8, 1.5) }));

  // ── Lightning ──────────────────────────────────────────────────────────────
  const flash = new THREE.PointLight(0xbcd3ff, 0, 9, 1.6);
  group.add(flash);
  const boltGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  bolt.frustumCulled = false; bolt.renderOrder = 7;
  group.add(bolt);
  let nextStrike = 3, strike = 0;

  function update(dt, time, { xc, east, west, e, focus, belts }) {
    // wind
    const lift = 1 + focus * 0.5;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      wind(p.x, p.y, xc, east, west, v);
      p.x += v.u * dt; p.y += v.w * dt; p.life += dt;
      if (p.life > p.max || p.x < XW || p.x > XE || p.y < 0.04 || p.y > AIR) { spawn(p); wind(p.x, p.y, xc, east, west, v); }
      const speed = Math.hypot(v.u, v.w), fade = Math.sin((p.life / p.max) * Math.PI);
      const near = p.y < 0.55 ? 1.55 : 1;
      const a = clamp(speed / 1.1, 0.05, 1) * fade * 0.72 * near * lift;
      const tail = 0.2 + 0.1 * near, k = i * 6, c = i * 8;
      flow.position[k] = p.x - v.u * tail; flow.position[k + 1] = p.y - v.w * tail; flow.position[k + 2] = p.z;
      flow.position[k + 3] = p.x; flow.position[k + 4] = p.y; flow.position[k + 5] = p.z;
      const up = clamp(v.w / (speed + 1e-3), -1, 1);               // rising air warm, sinking air cool
      const r = up > 0 ? lerp(0.82, 1.0, up) : lerp(0.82, 0.5, -up), g = up > 0 ? lerp(0.9, 0.8, up) : lerp(0.9, 0.74, -up), b = up > 0 ? lerp(1.0, 0.52, up) : 1.0;
      flow.color[c] = r; flow.color[c + 1] = g; flow.color[c + 2] = b; flow.color[c + 3] = 0;
      flow.color[c + 4] = r; flow.color[c + 5] = g; flow.color[c + 6] = b; flow.color[c + 7] = a;
    }
    flow.geo.attributes.position.needsUpdate = flow.geo.attributes.color.needsUpdate = true;

    // conveyor belts: the east cell carries the trade winds, the west cell appears as they reverse
    const gapE = XE - 0.45 - (xc + 0.6), gapW = xc - 0.6 - (XW + 0.45);
    beltE.set(xc + 0.6, XE - 0.45, false); beltW.set(XW + 0.45, xc - 0.6, true);
    beltE.phase += dt * east * 0.55; beltW.phase += dt * west * 0.55;
    beltE.mat.uniforms.uPhase.value = beltE.phase; beltW.mat.uniforms.uPhase.value = beltW.phase;
    beltE.mat.uniforms.uAlpha.value = clamp(east, 0.2, 1) * clamp((gapE - 1.2) / 1.2, 0, 1) * belts;
    beltW.mat.uniforms.uAlpha.value = clamp(west * 1.1, 0, 1) * clamp((gapW - 1.2) / 1.2, 0, 1) * belts;

    // clouds follow the warm water
    cloudMat.uniforms.uHeat.value = clamp(e, 0, 1);
    clouds[0].x = xc;
    clouds[1].strength = clamp((e - 0.42) / 0.5, 0, 1);
    clouds[2].strength = 0;   // the west simply clears: no leftover tower once the rain band has moved on
    let n = 0;
    clouds.forEach((c, ci) => {
      const grow = c.scale * (ci === 0 ? 1 : c.strength);
      for (const p of layout[ci]) {
        const breathe = 1 + 0.07 * Math.sin(time * 0.9 + p.ph);
        pos.set(c.x + p.x * c.scale + Math.sin(time * 0.35 + p.ph) * 0.04, c.base + p.y * c.scale, p.z * c.scale);
        scl.setScalar(Math.max(1e-4, p.r * grow * breathe));
        cloudMesh.setMatrixAt(n++, m4.compose(pos, q, scl));
      }
    });
    cloudMesh.instanceMatrix.needsUpdate = true;

    // rain
    drops.forEach((d, i) => {
      const c = clouds[d.c], strength = d.c === 0 ? 1 : c.strength;
      d.p += dt * d.s * 0.9; if (d.p > 1) d.p -= 1;
      const rad = 0.85 * c.scale, x = c.x + Math.cos(d.ang) * d.r * rad - d.p * 0.22, z = Math.sin(d.ang) * d.r * rad * 0.9;
      const y = lerp(c.base + 0.05, 0.02, d.p), k = i * 6, cc = i * 8, a = 0.55 * strength * Math.sin(d.p * Math.PI);
      rain.position[k] = x + 0.03; rain.position[k + 1] = y + 0.16; rain.position[k + 2] = z;
      rain.position[k + 3] = x; rain.position[k + 4] = y; rain.position[k + 5] = z;
      rain.color.set([0.6, 0.78, 1, 0, 0.7, 0.86, 1, a], cc);
    });
    rain.geo.attributes.position.needsUpdate = rain.geo.attributes.color.needsUpdate = true;

    // lightning in the main tower
    if (!reducedMotion) {
      nextStrike -= dt;
      if (nextStrike <= 0) {
        nextStrike = rnd(2.5, 7);
        strike = 0.34;
        const bx = xc + rnd(-0.5, 0.5), bz = rnd(-0.6, 0.6), arr = boltGeo.attributes.position.array;
        for (let i = 0; i < 10; i++) {
          const t = i / 9;
          arr[i * 3] = bx + (i ? rnd(-0.16, 0.16) : 0) + t * 0.2; arr[i * 3 + 1] = lerp(clouds[0].base + 0.5, 0.03, t); arr[i * 3 + 2] = bz + (i ? rnd(-0.12, 0.12) : 0);
        }
        boltGeo.attributes.position.needsUpdate = true;
        flash.position.set(bx, clouds[0].base + 0.9, bz);
      }
      strike = Math.max(0, strike - dt);
      const f = strike > 0 ? (Math.sin(strike * 70) > -0.2 ? 1 : 0.25) * (strike / 0.34) : 0;
      flash.intensity = f * 55;
      bolt.material.opacity = f * 0.95;
      cloudMat.uniforms.uFlash.value = f * 0.55;
    }
    return clouds;
  }

  return { group, update, clouds };
}
