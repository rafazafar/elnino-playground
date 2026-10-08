// 01 · The machine — WebGL renderer. Builds a diorama of the equatorial Pacific and plays the
// shared model (js/machine.js) through it. Bundled to js/machine3d.js with `npm run build:machine`.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { MAX_M, T_LO, T_HI, xOf, clamp, lerp, smooth, paletteTexture, dataTexture } from "./shared.js";
import { createOcean } from "./ocean.js";
import { createWorld } from "./world.js";
import { createAir } from "./air.js";
import { createLife } from "./life.js";
import { createLabels } from "./labels.js";

const M = window.MACHINE;
const { reducedMotion } = window.U;

// Camera framing for each chapter: what to look at (t), how much of the world to fit (w × h),
// and from which angle (azimuth / elevation in degrees).
const CAMS = {
  intro:   { t: [0, 0.6, 0],       w: 19.6, h: 9.4, az: -16, el: 13 },
  wind:    { t: [0.6, 1.3, 0],     w: 15.6, h: 5.8, az: 9,   el: 7 },
  warm:    { t: [-4.5, 0.8, 0],    w: 8.2,  h: 7.6, az: -27, el: 10 },
  cold:    { t: [4.9, -0.8, 0.3],  w: 7.0,  h: 5.4, az: 24,  el: 6 },
  loop:    { t: [0, 1.5, 0],       w: 19.0, h: 8.6, az: 0,   el: 5 },
  letgo:   { t: [-0.4, -0.5, 0],   w: 16.6, h: 6.8, az: -9,  el: 8 },
  runaway: { t: [0.5, 0.8, 0],     w: 19.0, h: 9.2, az: 13,  el: 12 },
  now:     { t: [0.8, 0.6, 0],     w: 18.6, h: 9.0, az: 21,  el: 17 },
  play:    { t: [0, 0.7, 0],       w: 19.6, h: 9.6, az: -12, el: 12 },
};
const FOV = 30;

function start() {
  const canvas = document.getElementById("m3Canvas"), stage = M.stage;
  const lite = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  THREE.ColorManagement.enabled = false;           // colours are authored for the screen; pass them through untouched
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x050b17, 1);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

  const sunDir = new THREE.Vector3(-0.45, 0.8, 0.42).normalize();
  scene.add(new THREE.HemisphereLight(0x9dbcf5, 0x0b1322, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
  sun.position.copy(sunDir).multiplyScalar(20);
  scene.add(sun);

  // ── Model → GPU ────────────────────────────────────────────────────────────
  // One 128-texel strip carries the state across the basin: R = sea surface temperature,
  // G = thermocline depth, B = strength of any warm pulse passing through.
  const SAMPLES = 128, strip = new Uint8Array(SAMPLES * 4);
  const modelTex = dataTexture(strip, SAMPLES);
  const uniforms = {
    uTime: { value: 0 }, uTilt: { value: 1 }, uHeat: { value: 0 }, uFocus: { value: 0 },
    uModel: { value: modelTex }, uPalette: { value: paletteTexture() },
    uClouds: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uSun: { value: sunDir },
  };
  function writeModel() {
    for (let i = 0; i < SAMPLES; i++) {
      const u = i / (SAMPLES - 1);
      strip[i * 4] = clamp(((M.model.sst(u) - T_LO) / (T_HI - T_LO)) * 255, 0, 255);
      strip[i * 4 + 1] = clamp((M.model.thermocline(u) / MAX_M) * 255, 0, 255);
      strip[i * 4 + 2] = M.model.pulseAt(u) * 255;
      strip[i * 4 + 3] = 255;
    }
    modelTex.needsUpdate = true;
  }

  const ocean = createOcean(uniforms);
  const land = createWorld({ lite });
  const air = createAir({ lite, reducedMotion, sunDir });
  const life = createLife({ lite, model: M.model });
  world.add(land.group, ocean.group, life.group, air.group);
  const labels = createLabels({ host: document.getElementById("m3Labels"), model: M.model, state: M.state });

  // ── Post-processing ────────────────────────────────────────────────────────
  let composer = null, bloom = null;
  if (!lite) {
    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.5, 0.6, 0.8);
    composer.addPass(bloom);
  }

  // ── Layout: where on the stage is the scene allowed to sit? ────────────────
  const view = { w: 1, h: 1, free: { x: 0, y: 0, w: 1, h: 1 }, yScale: 1 };
  function measure() {
    const w = stage.clientWidth, h = stage.clientHeight, wide = w > 900;
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
    view.w = w; view.h = h;
    view.wide = wide;
    camera.aspect = w / h;
  }
  function freeRect() {
    const { w, h, wide } = view;
    // The HUD sits along the top; the story card on the left (or bottom on phones); the controls at the bottom in play mode.
    if (M.state.play) return wide ? { x: 30, y: 170, w: w - 90, h: h - 170 - 262 } : { x: 6, y: 124, w: w - 12, h: h - 124 - 330 };
    if (wide) { const card = Math.min(440, w * 0.35) + 60; return { x: card, y: 170, w: w - card - 60, h: h - 170 - 46 }; }
    return { x: 6, y: 124, w: w - 12, h: h * 0.56 - 124 };
  }

  // ── Camera rig ─────────────────────────────────────────────────────────────
  const rig = { t: new THREE.Vector3(), d: 30, az: 0, el: 0.2, sx: 0, sy: 0, ready: false };
  const user = { az: 0, el: 0, dragging: false };
  const goal = new THREE.Vector3();
  function aim(dt, time) {
    const cam = CAMS[M.steps[M.state.step].cam] || CAMS.intro;
    const free = freeRect(), portrait = free.w / free.h < 0.95;
    const tan = Math.tan((FOV * Math.PI) / 360);
    // On tall phone screens, wide shots crop the far ends of the land so the ocean stays readable.
    const fw = portrait && cam.w > 15 ? cam.w * 0.7 : cam.w, fh = portrait ? cam.h * 1.08 : cam.h;
    const d = Math.max((fh * view.h) / (2 * tan * free.h), (fw * view.h) / (2 * tan * free.w));
    const sway = reducedMotion ? 0 : Math.sin(time * 0.16) * 2.4;
    const lift = portrait && cam.w > 15 ? 13 : 0;        // look down more on phones: the sea surface fills the tall frame
    const az = ((cam.az + user.az + sway) * Math.PI) / 180, el = (clamp(cam.el + lift + user.el, 2.5, 46) * Math.PI) / 180;
    const sx = free.x + free.w / 2 - view.w / 2, sy = free.y + free.h / 2 - view.h / 2;
    goal.set(cam.t[0], cam.t[1], cam.t[2]);

    if (!rig.ready && !reducedMotion) {
      // First sight of the scene: start high and far, then settle in.
      rig.t.copy(goal); rig.d = d * 1.9; rig.az = az - 0.75; rig.el = el + 0.5; rig.sx = sx; rig.sy = sy; rig.ready = true;
    }
    const k = dt > 0 ? 1 - Math.exp(-dt * 2.4) : reducedMotion || !rig.ready ? 1 : 0;
    rig.t.lerp(goal, k); rig.d = lerp(rig.d, d, k); rig.az = lerp(rig.az, az, k); rig.el = lerp(rig.el, el, k);
    rig.sx = lerp(rig.sx, sx, k); rig.sy = lerp(rig.sy, sy, k);
    rig.ready = true;

    camera.position.set(rig.t.x + rig.d * Math.sin(rig.az) * Math.cos(rig.el), rig.t.y + rig.d * Math.sin(rig.el), rig.t.z + rig.d * Math.cos(rig.az) * Math.cos(rig.el));
    camera.lookAt(rig.t);
    camera.setViewOffset(view.w, view.h, -rig.sx, -rig.sy, view.w, view.h);   // slide the picture into the free part of the stage
    camera.updateMatrixWorld();
    if (!user.dragging && !M.state.play) { const back = Math.exp(-dt * 1.6); user.az *= back; user.el *= back; }   // a peek springs back during the story
  }

  // Drag to look around. Vertical drags on touch screens stay with the page scroll.
  let last = null;
  canvas.addEventListener("pointerdown", (ev) => { last = { x: ev.clientX, y: ev.clientY }; user.dragging = true; window.U.capture(canvas, ev); stage.classList.add("is-dragging", "has-dragged"); });
  canvas.addEventListener("pointermove", (ev) => {
    if (!last) return;
    user.az = clamp(user.az - (ev.clientX - last.x) * 0.13, -36, 36);   // enough to see round the slab, never end-on
    if (ev.pointerType !== "touch") user.el = clamp(user.el + (ev.clientY - last.y) * 0.12, -12, 26);
    last = { x: ev.clientX, y: ev.clientY };
    if (reducedMotion) frame(0, M.state.time);
  });
  const release = () => { last = null; user.dragging = false; stage.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);

  // ── Frame ──────────────────────────────────────────────────────────────────
  let xc = xOf(M.model.rainU()), belts = 0.5;
  const BELTS = { intro: 0.55, wind: 0.85, warm: 0.35, cold: 0.2, loop: 1, letgo: 0.7, runaway: 0.9, now: 0.7, play: 0.75 };   // how loudly to draw the conveyor belts in each chapter
  function frame(dt, time) {
    const e = M.model.E(), cells = M.model.walker(), step = M.steps[M.state.step].id;
    xc = dt > 0 ? lerp(xc, xOf(cells.uc), 1 - Math.exp(-dt * 3)) : xOf(cells.uc);   // the rain band glides rather than jumps
    writeModel();
    uniforms.uTime.value = time;
    uniforms.uTilt.value = clamp(M.model.trade(0.5), -0.4, 1.5);
    uniforms.uHeat.value = clamp(e, 0, 1.1);
    uniforms.uFocus.value = step === "cold" || step === "letgo" ? 1 : 0;
    land.uniforms.glow.uHeat.value = land.uniforms.sky.uHeat.value = smooth(0.25, 1, e);

    const airy = step === "wind" || step === "loop";
    const flow = { xc, east: cells.east, west: cells.west, e, focus: airy ? 1 : 0, belts: (belts = lerp(belts, BELTS[step] ?? 0.55, dt > 0 ? 1 - Math.exp(-dt * 2.5) : 1)) };
    const clouds = air.update(dt, time, flow);
    clouds.forEach((c, i) => uniforms.uClouds.value[i].set(c.x, 0, i === 0 ? 1 : c.strength));
    life.update(dt, time, flow);
    land.update(dt, time, e);

    aim(dt, time);
    labels.update(camera, view, { xc, step, e });
    if (composer) composer.render(dt); else renderer.render(scene, camera);
  }

  measure();
  new ResizeObserver(() => { measure(); if (reducedMotion) frame(0, M.state.time); }).observe(stage);
  canvas.addEventListener("webglcontextlost", (ev) => ev.preventDefault());
  M.use({ name: "3d", frame });
  frame(0, 0);
}

// Fall back to the flat renderer if WebGL is missing, blocked, or explicitly declined.
try {
  if (/[?&]flat\b/.test(window.location.search)) throw new Error("flat renderer requested");
  start();
} catch (err) {
  console.info("El Niño machine: using the 2D renderer —", err.message);
  window.Machine2D.start();
}
