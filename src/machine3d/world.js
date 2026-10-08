// The solid parts of the diorama: the two coasts, the plinth it all sits on, and the sky behind.
import * as THREE from "three";
import { OX0, OX1, L, ZH, DEPTH, AIR, clamp, lerp, smooth, fbm, noise, rnd, glowPoints } from "./shared.js";

const ZW = ZH + 0.06;      // land is a touch wider than the water so its cut face sits in front
const SHELF = 0.8;         // width of the underwater slope at each coast
const WEST_EDGE = -9.05, EAST_EDGE = 9.15;

// Height of the ground at (x, z). Negative values are the submerged continental slope.
export function groundHeight(x, z) {
  if (x < 0) {
    if (x > OX0) return -DEPTH * Math.pow(clamp((x - OX0) / SHELF, 0, 1), 0.75);
    const d = OX0 - x;                                           // distance inland
    const hills = 0.16 + 0.62 * fbm(x * 1.25 + 3.1, z * 1.05 + 7.7);
    return 0.03 + smooth(0, 1.1, d) * hills + 0.05 * noise(x * 4.0, z * 4.0) * smooth(0.1, 0.6, d);
  }
  if (x < OX1) return -DEPTH * Math.pow(clamp((OX1 - x) / SHELF, 0, 1), 0.75);
  const d = x - OX1;
  const ridge = 0.62 + 0.5 * fbm(x * 0.9 + 11.0, z * 1.5 + 2.0);
  const andes = 3.0 * smooth(0.3, 1.45, d) * ridge * (1 - 0.25 * smooth(1.7, 2.3, d));
  return 0.035 + 0.05 * noise(x * 3.0, z * 3.0) + andes;
}

function landColor(side, x, y, z, dry, wet, out) {
  const n = noise(x * 5.3 + 1.7, z * 5.3 + 9.2);
  if (y < -0.03) {                                                // submerged rock
    const t = clamp(-y / DEPTH, 0, 1);
    return out.setRGB(lerp(0.17, 0.05, t), lerp(0.21, 0.07, t), lerp(0.29, 0.12, t));
  }
  if (side < 0) {
    if (y < 0.07) return out.setRGB(0.72, 0.63, 0.47);            // beach
    const k = clamp(y / 0.8, 0, 1), d = clamp(dry * (0.75 + 0.5 * n), 0, 1);
    return out.setRGB(lerp(lerp(0.2, 0.11, k), 0.5, d), lerp(lerp(0.46, 0.3, k), 0.39, d), lerp(lerp(0.27, 0.19, k), 0.22, d));
  }
  if (y < 0.06) return out.setRGB(0.68, 0.58, 0.42);
  if (y > 1.9 + n * 0.3) return out.setRGB(0.92, 0.94, 0.98);     // snow line
  if (y < 0.5) {                                                  // coastal desert that greens when the rain arrives
    const w = clamp(wet * (0.7 + 0.6 * n), 0, 1);
    return out.setRGB(lerp(0.62, 0.3, w), lerp(0.5, 0.47, w), lerp(0.34, 0.29, w));
  }
  const k = clamp((y - 0.5) / 1.4, 0, 1);
  return out.setRGB(lerp(0.44, 0.33, k) + n * 0.05, lerp(0.39, 0.33, k) + n * 0.04, lerp(0.35, 0.39, k));
}

function buildLand(side) {
  const xa = side < 0 ? WEST_EDGE : OX1 - SHELF, xb = side < 0 ? OX0 + SHELF : EAST_EDGE;
  const nx = 54, nz = 28, pos = [], idx = [], meta = [];
  const push = (x, y, z, kind) => { pos.push(x, y, z); meta.push(kind); return pos.length / 3 - 1; };

  // top surface
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = lerp(xa, xb, i / nx), z = lerp(-ZW, ZW, j / nz);
    push(x, groundHeight(x, z), z, 0);
  }
  const at = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) idx.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));

  // cut faces front and back, and the outer end
  const wall = (pts, flip) => {
    const top = pts.map(([x, z]) => push(x, groundHeight(x, z), z, 0)), bot = pts.map(([x, z]) => push(x, -DEPTH, z, 1));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = top[i], b = top[i + 1], c = bot[i], d = bot[i + 1];
      flip ? idx.push(a, b, c, b, d, c) : idx.push(a, c, b, b, c, d);
    }
  };
  const xs = Array.from({ length: nx + 1 }, (_, i) => lerp(xa, xb, i / nx));
  const zs = Array.from({ length: nz + 1 }, (_, j) => lerp(-ZW, ZW, j / nz));
  wall(xs.map((x) => [x, ZW]), false);
  wall(xs.map((x) => [x, -ZW]), true);
  const outer = side < 0 ? xa : xb;
  wall(zs.map((z) => [outer, z]), side > 0);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.length), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));

  const c = new THREE.Color();
  function recolor(dry, wet) {
    const col = geo.attributes.color;
    for (let i = 0; i < meta.length; i++) {
      if (meta[i] === 1) c.setRGB(0.07, 0.085, 0.13);
      else landColor(side, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], dry, wet, c);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }
  return { mesh, recolor };
}

export function createWorld({ lite }) {
  const group = new THREE.Group();
  const west = buildLand(-1), east = buildLand(1);
  group.add(west.mesh, east.mesh);

  // ── Forest on the western land ─────────────────────────────────────────────
  const TREES = lite ? 110 : 190;
  const treeGeo = new THREE.ConeGeometry(0.06, 0.2, 5).translate(0, 0.1, 0);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), TREES);
  const spots = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  let guard = 0;
  while (spots.length < TREES && guard++ < 5000) {
    const x = rnd(WEST_EDGE + 0.1, OX0 - 0.12), z = rnd(-ZH + 0.1, ZH - 0.1), y = groundHeight(x, z);
    if (y < 0.1) continue;
    const k = rnd(0.7, 1.5);
    spots.push({ x, y, z, k, burn: Math.random() });
    m4.compose(v.set(x, y - 0.02, z), q, s.set(k, k * rnd(0.9, 1.4), k));
    trees.setMatrixAt(spots.length - 1, m4);
  }
  trees.count = spots.length;
  trees.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(spots.length * 3), 3);
  group.add(trees);

  // Embers and smoke: Indonesia's fire season when the rain leaves.
  const embers = glowPoints(spots.length);
  embers.points.renderOrder = 4;
  group.add(embers.points);
  const SMOKE = lite ? 40 : 80;
  const smoke = glowPoints(SMOKE, { blending: THREE.NormalBlending });
  smoke.points.renderOrder = 4;
  group.add(smoke.points);
  const puffs = Array.from({ length: SMOKE }, () => ({ life: Math.random(), max: rnd(4, 8), x: 0, y: -9, z: 0, vx: 0 }));

  const tc = new THREE.Color();
  let lastKey = -1;
  function setClimate(e) {
    const dry = smooth(0.38, 1, e), wet = smooth(0.45, 1, e);
    const key = Math.round(e * 60);
    if (key === lastKey) return;
    lastKey = key;
    west.recolor(dry, wet); east.recolor(dry, wet);
    spots.forEach((t, i) => {
      const d = clamp(dry * 1.25 - t.burn * 0.45, 0, 1);
      tc.setRGB(lerp(0.1, 0.42, d), lerp(0.36, 0.25, d), lerp(0.18, 0.1, d));
      if (d > 0.82) tc.multiplyScalar(0.45);                       // burnt
      trees.setColorAt(i, tc);
    });
    trees.instanceColor.needsUpdate = true;
  }

  function update(dt, time, e) {
    setClimate(e);
    const dry = smooth(0.38, 1, e);
    // embers flicker on a growing share of the trees
    spots.forEach((t, i) => {
      const lit = t.burn < dry * 0.75 ? Math.max(0, Math.sin(time * (5 + t.burn * 9) + i * 1.7)) : 0;
      embers.position.set([t.x, t.y + 0.12 * t.k, t.z], i * 3);
      embers.color.set([1.0, 0.42 + 0.3 * lit, 0.12, lit * 0.95], i * 4);
      embers.size[i] = 5 + lit * 5;
    });
    embers.geo.attributes.position.needsUpdate = embers.geo.attributes.color.needsUpdate = embers.geo.attributes.size.needsUpdate = true;
    // smoke rises from burning trees and drifts with the reversed wind
    puffs.forEach((p, i) => {
      p.life += dt / p.max;
      if (p.life >= 1) {
        const t = spots[(Math.random() * spots.length) | 0];
        Object.assign(p, { life: 0, max: rnd(4, 8), x: t.x, y: t.y + 0.15, z: t.z, vx: rnd(0.1, 0.4), on: t.burn < dry * 0.75 });
      }
      p.x += p.vx * dry * dt; p.y += 0.26 * dt;
      const a = p.on ? Math.sin(p.life * Math.PI) * 0.2 * smooth(0.25, 0.7, dry) : 0;
      smoke.position.set([p.x, p.y, p.z], i * 3);
      smoke.color.set([0.36, 0.3, 0.27, a], i * 4);
      smoke.size[i] = 26 + p.life * 70;
    });
    smoke.geo.attributes.position.needsUpdate = smoke.geo.attributes.color.needsUpdate = smoke.geo.attributes.size.needsUpdate = true;
  }

  // ── Plinth and glow beneath ────────────────────────────────────────────────
  const plinthW = EAST_EDGE - WEST_EDGE + 0.5, plinthD = ZW * 2 + 0.8;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(plinthW, 0.34, plinthD), new THREE.MeshStandardMaterial({ color: 0x0c1526, roughness: 0.55, metalness: 0.35 }));
  plinth.position.y = -DEPTH - 0.17;
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(plinth.geometry), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.22 }));
  rim.position.copy(plinth.position);
  group.add(plinth, rim);

  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uHeat: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; varying vec2 vUv;
      void main() {
        vec2 d = (vUv - 0.5) * vec2(1.0, 1.6);
        float a = smoothstep(0.52, 0.0, length(d));
        vec3 col = mix(vec3(0.1, 0.28, 0.62), vec3(0.95, 0.36, 0.14), uHeat);
        gl_FragColor = vec4(col, a * a * 0.5);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(34, 15).rotateX(-Math.PI / 2), glowMat);
  glow.position.y = -DEPTH - 0.36;
  glow.renderOrder = -3;
  group.add(glow);

  // ── Sky behind the air column ──────────────────────────────────────────────
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; varying vec2 vUv;
      void main() {
        float y = vUv.y;
        vec3 low = mix(vec3(0.16, 0.34, 0.66), vec3(0.3, 0.3, 0.5), uHeat * 0.6);
        vec3 col = mix(low, vec3(0.04, 0.08, 0.2), smoothstep(0.0, 0.85, y));
        // fire haze over the west once the rain has gone
        float haze = uHeat * smoothstep(0.42, 0.0, vUv.x) * smoothstep(0.75, 0.0, y);
        col = mix(col, vec3(0.85, 0.42, 0.18), haze * 0.75);
        float a = pow(1.0 - y, 1.5) * 0.85 * smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(EAST_EDGE - WEST_EDGE, AIR + 0.6), skyMat);
  sky.position.set(0, (AIR + 0.6) / 2, -ZW - 0.02);
  sky.renderOrder = -2;
  group.add(sky);

  // Thin frame around the air column, so the atmosphere reads as part of the block.
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, AIR, ZH * 2)), new THREE.LineBasicMaterial({ color: 0xbfd6ff, transparent: true, opacity: 0.1 }));
  frame.position.y = AIR / 2;
  group.add(frame);

  return { group, update, uniforms: { glow: glowMat.uniforms, sky: skyMat.uniforms } };
}
