// Single source of truth for a Blender-rendered topic: evaluates story.js (stateAt) and director.js (SHOTS, sceneOpts,
// frame, SHAKES, FLASHES) for every frame and writes topics/<topic>/blender/gen/{state.json, camera.json}.
// usage (from series/): node build/blender-export.mjs mould-pm [--fps 24]
// Coordinates stay three.js (Y up); the Blender build converts them. Flow clocks are integrals of the flow rates, so
// particles slow down and speed up smoothly and never jump or run backwards.
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { makeCamera } from '../shell/camera16.js';

const topic = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const fps = +(args.fps || 24);
const dir = path.resolve('topics', topic);
const STORY = await import(pathToFileURL(path.join(dir, 'story.js')).href);
const DIR = await import(pathToFileURL(path.join(dir, 'director.js')).href);
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const TOTAL = DIR.TOTAL || Math.ceil(timeline.total);
const N = Math.ceil(TOTAL * fps);
const CAM = makeCamera(THREE, DIR);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const stateFull = (t) => {
  const c = CAM.place(t);
  return { st: { ...STORY.stateAt(t), ...(DIR.sceneOpts ? DIR.sceneOpts(t, c.shot) : {}) }, c };
};
// flatten one state into numeric columns
function columns(t, st, c) {
  const out = {};
  for (const [k, v] of Object.entries(st)) if (typeof v === 'number') out[k] = v; else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
  for (const [k, v] of Object.entries(st.shot || {})) out['shot_' + k] = v;
  for (const r of STORY.RIGS || []) { const o = STORY.rigOffset(r, st); out[`rig_${r}_x`] = o[0]; out[`rig_${r}_y`] = o[1]; out[`rig_${r}_z`] = o[2]; }
  // grade: exposure (director), fade in/out, warning tint, flashes
  let exposure = 1; if (DIR.frame) { const r = DIR.frame(t, st, { shot: c.shot, p: c.p }) || {}; if (r.exposure != null) exposure = r.exposure; }
  let fadeV = 1; if (t < 0.7) fadeV = ss(0, 0.7, t); if (t > TOTAL - 0.95) fadeV = 1 - ss(TOTAL - 0.95, TOTAL - 0.15, t);
  let fl = 0; for (const f of (DIR.FLASHES || [])) if (t >= f.t) fl += f.a * Math.exp(-(t - f.t) / f.d);
  Object.assign(out, { g_exposure: exposure, g_fade: fadeV, g_warn: st.warn || 0, g_flash: fl });
  return out;
}

// clocks, integrated on a fine grid (10 substeps per frame)
const SUB = 10, dt = 1 / (fps * SUB);
const clocks = { clock_water: [], clock_waterA: [], clock_melt: [], clock_air: [], clock_seep: [], clock_idle: [] };
let cw = 0, cwa = 0, cm = 0, ca = 0, cs = 0, prev = STORY.stateAt(0);
for (let n = 0; n < N; n++) {
  for (const k in clocks) clocks[k].push(0);
  clocks.clock_water[n] = cw; clocks.clock_waterA[n] = cwa; clocks.clock_melt[n] = cm; clocks.clock_air[n] = ca; clocks.clock_seep[n] = cs; clocks.clock_idle[n] = n / fps;
  for (let i = 1; i <= SUB; i++) {
    const t = n / fps + i * dt, s = STORY.stateAt(t);
    const air = 2.5 * (s.blow || 0);
    cw += dt * ((s.waterOn ?? 1) + air);
    cwa += dt * ((s.flowA ?? 1) * (s.waterOn ?? 1) + air);
    const df = Math.max(0, (s.fill ?? 0) - (prev.fill ?? 0)), dft = Math.max(0, (s.fillTop ?? 0) - (prev.fillTop ?? 0));
    cm += 0.5 * (df + dft) + dt * 0.02;
    ca += dt * 0.35 + 2.5 * dft + 1.5 * df;
    cs += dt * (s.leak ?? 0);
    prev = s;
  }
}

const cols = {}, cam = { fps, frames: N, pos: [], tgt: [], fov: [], roll: [], shift: [], shot: [] };
const cuts = [];
let lastShot = null;
for (let n = 0; n < N; n++) {
  const t = n / fps;
  const { st, c } = stateFull(t);
  const row = columns(t, st, c);
  for (const k in clocks) row[k] = clocks[k][n];
  for (const [k, v] of Object.entries(row)) (cols[k] ||= new Array(N).fill(0))[n] = Math.round(v * 1e5) / 1e5;
  const r = (v) => [v.x, v.y, v.z].map((x) => Math.round(x * 1e5) / 1e5);
  cam.pos.push(r(c.pos)); cam.tgt.push(r(c.tgt)); cam.fov.push(c.fov); cam.roll.push(c.roll); cam.shift.push(c.shift); cam.shot.push(c.shot.id);
  if (c.shot.id !== lastShot) { if (lastShot !== null) cuts.push(n); lastShot = c.shot.id; }
}
cam.cuts = cuts;
const out = path.join(dir, 'blender', 'gen');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'state.json'), JSON.stringify({ fps, frames: N, total: TOTAL, cuts, cols }));
fs.writeFileSync(path.join(out, 'camera.json'), JSON.stringify(cam));
console.log(`${topic}: ${N} frames @ ${fps} fps, ${Object.keys(cols).length} state columns, ${cuts.length} cuts → ${path.relative(process.cwd(), out)}`);
