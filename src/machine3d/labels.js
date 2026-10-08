// HTML labels pinned to points in the 3D scene. Text stays crisp, and each chapter of the story
// decides which labels are worth showing.
import * as THREE from "three";
import { OX0, OX1, ZH, DEPTH, AIR, xOf, yOf, clamp } from "./shared.js";

const ALL = ["intro", "wind", "warm", "cold", "loop", "letgo", "runaway", "now", "play"];

export function createLabels({ host, model, state }) {
  const F = ZH + 0.03; // just in front of the cut face
  const defs = [
    { id: "trade", steps: ["intro", "wind", "loop", "play"], pos: (c) => [c.xc < 0.5 ? 2.2 : -3.2, 0.42, F],
      text: () => { const t = model.trade(0.6); return t > 0.5 ? "← Trade winds" : t > 0.05 ? "← Trades failing" : "Winds reversed →"; } },
    { id: "pool", steps: ["intro", "warm", "letgo", "runaway", "now", "play"], text: () => "Warm pool", pos: () => [xOf(clamp(model.poolEdge() * 0.5, 0.14, 0.5)), yOf(42), F] },
    { id: "thermo", steps: ["intro", "cold", "letgo", "play"], text: () => "Thermocline", pos: () => [xOf(0.34), yOf(model.thermocline(0.34)) - 0.2, F] },
    { id: "deep", steps: ["intro", "cold"], text: () => "Cold deep water", pos: () => [1.4, yOf(270), F], dim: true },
    { id: "up", steps: ["cold", "play"], when: () => model.upwelling() > 0.3, text: () => "Cold upwelling", pos: () => [5.75, yOf(165), F] },
    { id: "fish", steps: ["cold"], text: () => "Anchovy fishery", pos: () => [4.6, yOf(22), F] },
    { id: "rain", steps: ["warm", "loop", "runaway", "now", "play"], text: () => "Rising air · rain", pos: (c) => [c.xcWorld, AIR + 0.25, 0] },
    { id: "sinkE", steps: ["loop"], text: () => "Sinking air", pos: () => [6.1, 2.7, 0] },
    { id: "sinkW", steps: ["runaway", "now", "play"], when: (c) => c.e > 0.5, text: () => "Sinking, dry air", pos: () => [-5.9, 2.9, 0] },
    { id: "level", steps: ["warm"], text: () => "Sea level ≈ ½ m higher here", pos: () => [-5.1, 0.3, F] },
    { id: "wave", steps: ["letgo", "runaway"], when: () => state.pulses.length > 0, text: () => "Warm water surging east",
      pos: () => { const p = state.pulses[state.pulses.length - 1] || { u: 0.2 }; return [xOf(p.u), yOf(model.thermocline(p.u) * 0.55), F]; } },
    { id: "fire", steps: ["runaway", "now", "play"], when: (c) => c.e > 0.55, text: () => "Drought & fire", pos: () => [-8.3, 1.25, 0.6], hot: true },
    { id: "flood", steps: ["runaway", "now", "play"], when: (c) => c.e > 0.55, text: () => "Coastal floods", pos: () => [7.5, 0.55, 1.4], hot: true },
    { id: "stall", steps: ["now", "play"], when: () => model.upwelling() < 0.3, text: () => "Upwelling shut down", pos: () => [5.9, yOf(120), F], hot: true },
    // fixed geography along the plinth
    { id: "w", steps: ALL, text: () => "Indonesia · 120°E", pos: () => [OX0 - 1.3, -DEPTH - 0.02, F + 0.5], geo: true },
    { id: "c", steps: ALL, text: () => "Date Line", pos: () => [xOf(0.375), -DEPTH - 0.02, F + 0.5], geo: true },
    { id: "e", steps: ALL, text: () => "Peru · 80°W", pos: () => [OX1 + 1.3, -DEPTH - 0.02, F + 0.5], geo: true },
    { id: "d1", steps: ["intro", "cold", "letgo", "play"], text: () => "100 m", pos: () => [OX0 + 1.05, yOf(100), F], geo: true },
    { id: "d2", steps: ["intro", "cold", "letgo", "play"], text: () => "200 m", pos: () => [OX0 + 1.2, yOf(200), F], geo: true },
  ];

  // On phones the scene is small, so each chapter keeps only the labels it is actually about.
  const PHONE = { intro: ["trade", "pool"], wind: ["trade"], warm: ["rain", "pool"], cold: ["thermo", "up", "fish"], loop: ["rain", "sinkE"], letgo: ["wave", "thermo"], runaway: ["rain", "fire", "flood"], now: ["fire", "flood", "stall"], play: ["rain", "trade"] };

  for (const d of defs) {
    d.node = document.createElement("div");
    d.node.className = `m3-label${d.geo ? " is-geo" : ""}${d.hot ? " is-hot" : ""}${d.dim ? " is-dim" : ""}`;
    d.span = document.createElement("span");
    d.node.appendChild(d.span);
    host.appendChild(d.node);
    d.shown = null; d.last = "";
  }

  const v = new THREE.Vector3();
  function update(camera, view, ctx) {
    const c = { e: ctx.e, xcWorld: ctx.xc, xc: (ctx.xc - OX0) / (OX1 - OX0) };
    for (const d of defs) {
      const on = d.steps.includes(ctx.step) && (!d.when || d.when(c)) && (view.w > 640 || PHONE[ctx.step].includes(d.id));
      if (on !== d.shown) { d.node.classList.toggle("is-on", on); d.shown = on; }
      if (!on) continue;
      const text = d.text(c);
      if (text !== d.last) { d.span.textContent = text; d.last = text; }
      const p = d.pos(c);
      v.set(p[0], p[1], p[2]).project(camera);
      const x = (v.x * 0.5 + 0.5) * view.w, y = (-v.y * 0.5 + 0.5) * view.h;
      d.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }
  return { update };
}
