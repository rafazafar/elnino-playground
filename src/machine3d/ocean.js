// The ocean slab: a living surface coloured by sea surface temperature, and a cut front face
// that shows temperature with depth, the thermocline and the warm pulses travelling along it.
import * as THREE from "three";
import { OX0, L, ZH, DEPTH, MAX_M, T_LO, T_HI } from "./shared.js";

const SEA_HEIGHT = /* glsl */ `
  uniform float uTime; uniform float uTilt; uniform sampler2D uModel;
  float seaH(float x, float z) {
    float u = (x - (${OX0.toFixed(1)})) / ${L.toFixed(1)};
    float h = sin(x * 2.1 + uTime * 1.3) * 0.016 + sin(x * 4.7 - uTime * 1.9 + z * 3.1) * 0.009 + sin(z * 5.0 + uTime * 1.1 + x) * 0.007;
    h += uTilt * (0.5 - u) * 0.2;                       // trades pile water up in the west
    h += texture2D(uModel, vec2(u, 0.5)).b * 0.06;      // a warm pulse lifts the surface slightly
    return h;
  }`;

export function createOcean(uniforms) {
  const group = new THREE.Group();

  // ── Surface ────────────────────────────────────────────────────────────────
  const surfGeo = new THREE.PlaneGeometry(L, ZH * 2, 220, 34).rotateX(-Math.PI / 2);
  const surface = new THREE.Mesh(surfGeo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${SEA_HEIGHT}
      varying vec3 vWorld; varying float vU;
      void main() {
        vec3 p = position;
        p.y += seaH(p.x, p.z);
        vU = uv.x;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uModel; uniform sampler2D uPalette;
      uniform vec3 uClouds[3]; uniform vec3 uSun; uniform float uHeat;
      varying vec3 vWorld; varying float vU;
      float rip(vec2 p) { return sin(p.x * 9.0 + uTime * 2.0) * sin(p.y * 7.0 - uTime * 1.6) + 0.5 * sin(p.x * 17.0 - uTime * 2.4 + p.y * 13.0) + 0.35 * sin(p.x * 31.0 + p.y * 23.0 + uTime * 3.1); }
      void main() {
        vec4 m = texture2D(uModel, vec2(vU, 0.5));
        float sst = mix(${T_LO.toFixed(1)}, ${T_HI.toFixed(1)}, m.r);
        vec3 base = texture2D(uPalette, vec2((sst - ${T_LO.toFixed(1)}) / ${(T_HI - T_LO).toFixed(1)}, 0.5)).rgb;

        vec2 p = vWorld.xz; float e = 0.03;
        vec3 n = normalize(vec3(-(rip(p + vec2(e, 0.0)) - rip(p - vec2(e, 0.0))) / (2.0 * e) * 0.014, 1.0, -(rip(p + vec2(0.0, e)) - rip(p - vec2(0.0, e))) / (2.0 * e) * 0.014));
        vec3 v = normalize(cameraPosition - vWorld);
        float diff = max(dot(n, uSun), 0.0);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 70.0);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);

        vec3 col = base * (0.66 + 0.4 * diff);
        col = mix(col, vec3(0.55, 0.72, 0.95), fres * 0.28);
        col += vec3(1.0, 0.95, 0.85) * spec * 0.75;
        col += base * m.b * 0.25;                                   // pulse glow
        // cloud shadows
        for (int i = 0; i < 3; i++) {
          vec2 d = (vWorld.xz - vec2(uClouds[i].x, 0.0)) / vec2(1.25, 1.5);
          col *= 1.0 - 0.38 * uClouds[i].z * exp(-dot(d, d));
        }
        // a thin line of surf where the sea meets each coast
        float coast = smoothstep(0.012, 0.0, vU) + smoothstep(0.988, 1.0, vU);
        col = mix(col, vec3(0.9, 0.95, 1.0), coast * 0.5);
        gl_FragColor = vec4(col, 0.95);
      }`,
    transparent: true, depthWrite: false,
  }));
  surface.renderOrder = 1;
  group.add(surface);

  // ── Cut face ───────────────────────────────────────────────────────────────
  const faceGeo = new THREE.PlaneGeometry(L, DEPTH, 220, 1);
  faceGeo.translate(0, -DEPTH / 2, ZH);
  const face = new THREE.Mesh(faceGeo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${SEA_HEIGHT}
      varying vec2 vUv; varying float vTop;
      void main() {
        vec3 p = position;
        vTop = uv.y > 0.5 ? seaH(p.x, p.z) : 0.0;   // top edge follows the waves
        p.y += vTop;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uModel; uniform sampler2D uPalette; uniform float uFocus;
      varying vec2 vUv;
      void main() {
        vec4 m = texture2D(uModel, vec2(vUv.x, 0.5));
        float sst = mix(${T_LO.toFixed(1)}, ${T_HI.toFixed(1)}, m.r);
        float D = m.g * ${MAX_M.toFixed(1)};
        float z = (1.0 - vUv.y) * ${MAX_M.toFixed(1)};
        D += sin(vUv.x * 40.0 - uTime * 0.8) * 1.6 + sin(vUv.x * 17.0 + uTime * 0.5) * 2.2;   // internal waves

        float mixT = sst - z * 0.012;
        float deepT = 10.5 + 5.0 * exp(-max(0.0, z - D) / 110.0);
        float b = 0.5 * (1.0 + tanh((z - D) / 17.0));
        float T = mix(mixT, deepT, b);
        vec3 col = texture2D(uPalette, vec2((T - ${T_LO.toFixed(1)}) / ${(T_HI - T_LO).toFixed(1)}, 0.5)).rgb;

        // isotherms every 2°C, like contour lines on a chart
        float f = T / 2.0;
        float iso = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-4);
        col = mix(col, col * 1.35 + 0.035, (1.0 - smoothstep(0.0, 1.3, iso)) * 0.32);

        // the thermocline as a bright dashed line
        float dl = abs(z - D);
        float dash = 0.55 + 0.45 * step(0.5, fract(vUv.x * 46.0 - uTime * 0.08));
        col += vec3(0.75, 0.95, 1.0) * exp(-dl * dl / 9.0) * 0.75 * dash * (0.75 + uFocus * 0.6);
        col += vec3(0.5, 0.8, 1.0) * exp(-dl * dl / 260.0) * 0.1 * (1.0 + uFocus);

        // warm pulse sliding east above the thermocline
        float pz = (z - D * 0.62) / 55.0;
        col += vec3(1.0, 0.62, 0.25) * m.b * exp(-pz * pz) * 0.5;

        // light from above, darkness below
        float shaft = 0.5 + 0.5 * sin(vUv.x * 70.0 + uTime * 0.35 + sin(vUv.y * 5.0 + uTime * 0.2) * 2.5);
        col += vec3(0.25, 0.35, 0.4) * shaft * 0.07 * pow(vUv.y, 3.0);
        col *= mix(0.5, 1.06, pow(vUv.y, 0.55));
        col += vec3(1.0) * smoothstep(0.988, 1.0, vUv.y) * 0.4;       // waterline
        gl_FragColor = vec4(col, 1.0);
      }`,
    transparent: true, depthWrite: false,
  }));
  face.renderOrder = 2;
  group.add(face);

  return { group };
}
