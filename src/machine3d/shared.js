// World layout for the diorama, shared by every part of the 3D scene.
// x runs west → east, y is up (sea level = 0), z is north–south.
import * as THREE from "three";

export const OX0 = -7, OX1 = 7, L = OX1 - OX0; // ocean extent in x (120°E → 80°W)
export const ZH = 2.2;                         // half-width of the slab in z
export const DEPTH = 3.0;                      // world units for MAX_M metres of ocean
export const MAX_M = 320;
export const AIR = 4.6;                        // height of the air column shown

export const xOf = (u) => OX0 + L * u;
export const uOf = (x) => (x - OX0) / L;
export const yOf = (metres) => (-metres / MAX_M) * DEPTH;

export const { clamp, lerp, smooth, ramp } = window.U;
export const rnd = (a, b) => a + Math.random() * (b - a);

// Ocean temperature (°C) → colour, the same ramp as the 2D fallback.
export const T_LO = 8, T_HI = 33;
export const sea = ramp([
  [8, [5, 14, 40]], [13, [9, 32, 78]], [18, [14, 62, 120]], [22, [24, 102, 150]], [24.5, [52, 140, 150]],
  [26.5, [150, 160, 96]], [28, [232, 158, 60]], [29.3, [240, 108, 48]], [30.5, [222, 56, 72]], [31.5, [240, 100, 150]],
]);

export function paletteTexture() {
  const n = 256, data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const c = sea(T_LO + ((T_HI - T_LO) * i) / (n - 1));
    data.set([c[0], c[1], c[2], 255], i * 4);
  }
  return dataTexture(data, n);
}
export function dataTexture(data, n) {
  const t = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

// Small value-noise helpers for terrain.
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), sx), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), sx), sy);
}
export const fbm = (x, y) => noise(x, y) * 0.58 + noise(x * 2.1, y * 2.1) * 0.29 + noise(x * 4.3, y * 4.3) * 0.13;

// Round, soft-edged points with per-vertex colour, alpha and size.
export function glowPoints(count, { blending = THREE.AdditiveBlending, px = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const position = new Float32Array(count * 3), color = new Float32Array(count * 4), size = new Float32Array(count);
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: px } },
    vertexShader: /* glsl */ `
      attribute vec4 color; attribute float size; uniform float uPx; varying vec4 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPx * clamp(20.0 / -mv.z, 0.35, 3.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec4 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vColor.a;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor.rgb, a);
      }`,
    transparent: true, depthWrite: false, blending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, position, color, size, geo, mat };
}

// Line segments with per-vertex RGBA, used for wind streaks and rain.
export function streaks(count) {
  const geo = new THREE.BufferGeometry();
  const position = new Float32Array(count * 6), color = new Float32Array(count * 8);
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { lines, position, color, geo };
}
