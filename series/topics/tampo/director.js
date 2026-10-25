// Tampo (pad) printing — shots, labels, HUD, cards. Times follow timeline.json (George narration).
import { stateAt } from './story.js';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 80.64;
export const TITLE = { big: 'TAMPO PRINTING', sub: 'also called pad printing', t0: 6.65, t1: 10.25 };
export const END = { big: 'TAMPO PRINTING', a: 'Sharp print.', b: 'Every time.', t0: 78.2 };
export const CHAPTERS = [
  { t: 10.4, label: 'HOW IT WORKS' },
  { t: 37.0, label: 'WHAT GOES WRONG' },
  { t: 55.0, label: 'WARNING SIGNS' },
  { t: 62.3, label: 'THE FIX' },
];
const E = [40, 0, 0], H = [80, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, fov = 38, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, fov], [1, p1, g1, fov]], ez: 'lin', ...extra });
const PRT = [[3.2, 0.75, 2.9], [2.4, -0.7, 0], [3.05, 0.6, 2.6]];   // print close-up from above-front
const TAPE = [[4.4, 0.3, 3.4], [2.4, -0.6, 0], [4.2, 0.2, 3.0]];
const CLI = [[-1.9, 1.2, 4.8], [-2.6, -0.9, 0], [-2.05, 1.05, 4.3]];
export const SHOTS = [
  k2('S1a', 0, 2.3, [3.4, 0.9, 3.4], [2.4, -0.8, 0], [3.2, 0.7, 3.0], [2.4, -0.8, 0], 40),
  k2('S1b', 2.3, 4.7, at(H, [2.2, 2.0, 6.2]), at(H, [0.2, 0.1, 0]), at(H, [1.8, 1.7, 5.4]), at(H, [0.2, 0.1, 0]), 40),
  k2('S2', 4.7, 6.6, [0.2, 1.6, 23.5], [-0.9, 0.4, 0], [0.0, 1.4, 22.0], [-0.9, 0.4, 0], 40),
  k2('S3', 6.6, 10.4, [7.0, 4.0, 17.0], [-0.8, 0.3, 0], [6.0, 3.4, 15.5], [-0.8, 0.3, 0], 40),
  k2('S4a', 10.4, 12.2, [-1.5, 2.0, 3.4], [-2.3, -0.95, 0], [-1.6, 1.7, 3.0], [-2.3, -0.95, 0], 40),
  k2('S4b', 12.2, 14.1, at(E, [0.4, 0.8, 7.0]), at(E, [0, -0.3, 0]), at(E, [0.2, 0.6, 6.2]), at(E, [0, -0.3, 0]), 40),
  k2('S5a', 14.1, 17.0, [-1.6, 1.0, 5.4], [-2.6, -0.95, 0], [-1.8, 0.85, 4.9], [-2.6, -0.95, 0], 40),
  k2('S5b', 17.0, 19.3, at(E, [0.6, 1.4, 8.0]), at(E, [0.3, 0.2, 0]), at(E, [0.3, 1.1, 7.0]), at(E, [0.3, 0.2, 0]), 40),
  k2('S6', 19.3, 22.7, at(E, [0.3, 0.8, 4.6]), at(E, [0, -0.05, 0]), at(E, [0.1, 0.6, 4.0]), at(E, [0, -0.05, 0]), 40),
  k2('S7a', 22.7, 24.7, [-0.4, 0.4, 6.2], [-2.0, -0.4, 0], [-0.6, 0.2, 5.6], [-2.0, -0.4, 0], 40),
  k2('S7b', 24.7, 26.7, at(E, [0.4, 1.4, 8.2]), at(E, [0, 0.5, 0]), at(E, [0.2, 1.2, 7.4]), at(E, [0, 0.5, 0]), 40),
  { id: 'S8a', t0: 26.7, t1: 29.4, keys: [[0, [0.8, 1.4, 10.5], [0.2, -0.2, 0], 40], [1, [2.2, 0.6, 8.0], [2.3, -0.5, 0], 40]], ez: 'ease' },
  k2('S8b', 29.4, 31.8, [4.4, -0.3, 4.0], [2.4, -0.7, 0], [4.2, -0.4, 3.6], [2.4, -0.7, 0], 40),
  k2('S9', 31.8, 37.0, [4.0, 0.2, 4.6], [2.4, -0.6, 0], [3.8, 0.5, 4.0], [2.4, -0.62, 0], 40),
  k2('S10', 37.0, 39.6, [-0.4, 2.2, 23.0], [-0.9, 0.2, 0], [-0.6, 2.0, 21.5], [-0.9, 0.2, 0], 40),
  k2('S11a', 39.6, 41.3, [-1.2, 0.1, 2.6], [-2.0, 0.85, 0], [-1.3, 0.05, 2.3], [-2.0, 0.85, 0], 40),
  k2('S11b', 41.3, 43.2, ...PRT, PRT[1], 40),
  k2('S12a', 43.2, 45.0, [4.2, -0.2, 3.8], [2.4, -0.45, 0], [4.0, -0.1, 3.4], [2.4, -0.45, 0], 40),
  k2('S12b', 45.0, 46.7, [2.9, 0.5, 2.2], [2.35, -0.66, 0], [2.8, 0.4, 1.95], [2.35, -0.66, 0], 40),
  k2('S13a', 46.7, 48.5, ...CLI, CLI[1], 40),
  k2('S13b', 48.5, 50.2, ...PRT, PRT[1], 40),
  k2('S14a', 50.2, 52.5, [3.6, 0.4, 3.2], [2.4, -0.75, 0], [3.4, 0.3, 2.8], [2.4, -0.75, 0], 40),
  k2('S14b', 52.5, 55.0, [2.95, 0.55, 2.3], [2.4, -0.67, 0], [2.85, 0.45, 2.05], [2.4, -0.67, 0], 40),
  k2('S15a', 55.0, 57.9, ...PRT, PRT[1], 40),
  k2('S15b', 57.9, 59.8, [1.8, 0.6, 2.7], [2.45, -0.68, 0], [1.9, 0.5, 2.4], [2.45, -0.68, 0], 40),
  k2('S15c', 59.8, 62.3, ...TAPE, TAPE[1], 40),
  k2('S16a', 62.3, 64.4, [1.8, -0.2, 4.8], [0.2, -1.0, 0], [1.6, -0.3, 4.3], [0.2, -1.0, 0], 40),
  k2('S16b', 64.4, 66.4, [-0.6, 0.9, 4.6], [-2.0, 1.05, 0], [-0.75, 0.85, 4.2], [-2.0, 1.05, 0], 40),
  k2('S17a', 66.4, 68.9, [-3.3, 0.2, 4.6], [-4.45, -0.6, 1.55], [-3.45, 0.1, 4.2], [-4.45, -0.6, 1.55], 40),
  k2('S17b', 68.9, 70.5, [-2.3, 0.6, 3.8], [-3.35, -0.5, 0], [-2.45, 0.5, 3.4], [-3.35, -0.5, 0], 40),
  k2('S18a', 70.5, 72.6, ...CLI, CLI[1], 40),
  k2('S18b', 72.6, 74.4, [3.4, -0.9, 6.0], [2.4, -1.45, 0.9], [3.2, -1.0, 5.4], [2.4, -1.45, 0.9], 40),
  k2('S19a', 74.4, 75.9, [3.7, 0.5, 3.4], [2.4, -0.7, 0], [3.5, 0.4, 3.0], [2.4, -0.7, 0], 40),
  k2('S19b', 75.9, 78.1, ...TAPE, TAPE[1], 40),
  k2('S20', 78.1, 82, [0.2, 1.4, 18.0], [-0.9, 0.3, 0], [1.6, 2.6, 23.0], [-0.9, 0.5, 0], 40, { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    default: return { cut: 0 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(6.65, 7.3, t);
  return { exposure };
}

export const LABELS = [
  { text: 'PRINTED LOGO', anchor: 'print', t0: 0.9, t1: 2.25, dx: -60, dy: -320 },
  { text: 'INK', anchor: 'ink10', t0: 2.7, t1: 4.65, dx: -60, dy: 300 },
  { text: 'HAIR', anchor: 'hair', t0: 3.3, t1: 4.65, dx: 60, dy: -300 },
  { text: 'SILICONE PAD', anchor: 'pad', t0: 5.0, t1: 6.55, dx: 60, dy: -300 },
  { text: 'CLICHÉ', anchor: 'cliche', t0: 5.3, t1: 6.55, dx: -60, dy: 300 },
  { text: 'PART', anchor: 'part', t0: 5.6, t1: 6.55, dx: 60, dy: 300 },
  { text: 'ETCHED IMAGE', anchor: 'image', t0: 10.9, t1: 12.15, dx: 60, dy: -320 },
  { text: 'CLICHÉ', sub: 'steel plate', anchor: 'cliche', t0: 11.4, t1: 12.15, dx: -60, dy: 300 },
  { text: 'ETCH', anchor: 'groove', t0: 12.5, t1: 14.05, dx: 60, dy: 300 },
  { text: 'SEALED INK CUP', anchor: 'cupNow', t0: 14.4, t1: 16.95, dx: 60, dy: -320 },
  { text: 'CERAMIC RING', anchor: 'blade', t0: 17.2, t1: 19.25, dx: 60, dy: -320 },
  { text: 'WIPED CLEAN', anchor: 'etchSurf', t0: 18.3, t1: 19.25, dx: -60, dy: 300 },
  { text: 'SOLVENT EVAPORATES', anchor: 'groove', t0: 19.7, t1: 21.5, dx: 40, dy: -340 },
  { text: 'TACKY', anchor: 'groove', t0: 21.6, t1: 22.65, dx: 40, dy: 300 },
  { text: 'SILICONE PAD', anchor: 'pad', t0: 23.0, t1: 24.65, dx: 60, dy: -320 },
  { text: 'INK LIFTS OUT', anchor: 'rigPad', t0: 25.4, t1: 26.65, dx: 60, dy: -300 },
  { text: 'PART', anchor: 'part', t0: 27.8, t1: 29.35, dx: 60, dy: 300 },
  { text: 'WRAPS AROUND CURVES', anchor: 'part', t0: 29.8, t1: 31.75, dx: -40, dy: 320 },
  { text: 'CLEAN RELEASE', anchor: 'print', t0: 34.0, t1: 36.9, dx: -60, dy: -320 },
  { text: 'LINT + DUST', anchor: 'padTip', t0: 40.0, t1: 41.25, dx: 60, dy: 320, tone: 'bad' },
  { text: 'HOLES', anchor: 'print', t0: 41.7, t1: 43.15, dx: -60, dy: -320, tone: 'bad' },
  { text: "WON'T RELEASE", sub: 'ink too thick', anchor: 'padTip', t0: 43.6, t1: 44.95, dx: -60, dy: -320, tone: 'bad' },
  { text: 'BLURRED', sub: 'ink too thin', anchor: 'print', t0: 45.3, t1: 46.65, dx: -60, dy: -320, tone: 'bad' },
  { text: 'WORN RING', anchor: 'cupNow', t0: 46.9, t1: 48.45, dx: 60, dy: -320, tone: 'bad' },
  { text: 'HAZE FILM', anchor: 'image', t0: 47.8, t1: 48.45, dx: -60, dy: 300, tone: 'bad' },
  { text: 'STREAKS + HAZE', anchor: 'print', t0: 49.0, t1: 50.15, dx: -60, dy: -320, tone: 'bad' },
  { text: 'OIL / RELEASE AGENT', anchor: 'part', t0: 50.6, t1: 52.45, dx: -40, dy: 320, tone: 'bad' },
  { text: "WON'T STICK", anchor: 'print', t0: 53.0, t1: 54.95, dx: -60, dy: -320, tone: 'bad' },
  { text: 'FADED · BROKEN', anchor: 'print', t0: 56.2, t1: 57.85, dx: -60, dy: 320, tone: 'bad' },
  { text: 'BLURRY · SMUDGED', anchor: 'print', t0: 58.1, t1: 59.75, dx: 60, dy: 320, tone: 'bad' },
  { text: 'TAPE TEST FAIL', anchor: 'print', t0: 60.6, t1: 62.25, dx: -60, dy: 320, tone: 'bad' },
  { text: 'CLEAN WITH TAPE', anchor: 'tapeStation', t0: 62.7, t1: 64.35, dx: 60, dy: 300 },
  { text: 'WORN OR CUT?', anchor: 'padTip', t0: 64.6, t1: 65.3, dx: 60, dy: 300, tone: 'warn' },
  { text: 'NEW PAD', anchor: 'padTip', t0: 65.5, t1: 66.35, dx: 60, dy: 300 },
  { text: 'VISCOSITY CUP', anchor: 'visc', t0: 66.7, t1: 68.85, dx: 60, dy: -300 },
  { text: 'KEEP IT SEALED', anchor: 'gasketNow', t0: 69.2, t1: 70.45, dx: 60, dy: -300 },
  { text: 'INSPECT CLICHÉ + RING', anchor: 'cliche', t0: 70.7, t1: 72.55, dx: -60, dy: 320 },
  { text: 'TIGHT FIXTURE', anchor: 'fixture', t0: 73.0, t1: 74.35, dx: -60, dy: -300 },
  { text: 'WIPE PARTS CLEAN', anchor: 'part', t0: 74.6, t1: 75.85, dx: -40, dy: 320 },
  { text: 'TAPE TEST ✓', anchor: 'print', t0: 76.9, t1: 78.05, dx: -60, dy: 320 },
];

const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
export function hud(t, st) {
  if (t > 2.5 && t < 4.65) return { opacity: fade(t, 2.5, 4.65), items: [{ k: 'INK LAYER', v: '≈ 10 µm', big: true }, { k: 'HUMAN HAIR', v: '≈ 70 µm', color: '#c8a27a' }] };
  if (t > 12.4 && t < 14.05) return { opacity: fade(t, 12.4, 14.05), items: [{ k: 'ETCH DEPTH', v: '≈ 20–25 µm', big: true }] };
  if (t > 66.7 && t < 68.85) return { opacity: fade(t, 66.7, 68.85), pos: 'mid', backdrop: true, items: [{ k: 'DRAIN TIME', v: `${st.drain.toFixed(1)} s`, big: true }, { k: 'LOG IT', v: 'EVERY SHIFT' }] };
  return null;
}

export const CARDS = [
  { t0: 55.1, t1: 62.2, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Faded or broken prints', t: 56.26 },
    { text: 'Blurry edges, smudges', t: 58.0 },
    { text: 'Ink peels in a tape test', t: 60.6 },
  ] },
  { t0: 62.35, t1: 78.0, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Clean the pad with tape · replace if worn', t: 62.65, done: 66.0 },
    { text: 'Check viscosity · keep the cup sealed', t: 66.5, done: 70.0 },
    { text: 'Inspect cliché + ring · tight fixture', t: 70.5, done: 74.1 },
    { text: 'Clean parts · tape test every batch', t: 74.5, done: 77.7 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [];
