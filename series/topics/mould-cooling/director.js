// Mould cooling circuits — shots, labels, HUD, cards. Times follow timeline.json (George narration).
import { stateAt, NOM } from './story.js';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 82.67;
export const TITLE = { big: 'MOULD COOLING', sub: 'circuits, flow and scale', t0: 7.85, t1: 10.2 };
export const END = { big: 'MOULD COOLING', a: 'Clear channels.', b: 'Faster cycles.', t0: 79.85 };
export const CHAPTERS = [
  { t: 10.3, label: 'HOW IT WORKS' },
  { t: 35.8, label: 'WHAT GOES WRONG' },
  { t: 54.6, label: 'WARNING SIGNS' },
  { t: 63.6, label: 'THE FIX' },
];
const C = [40, 0, 0], H = [60, 0, 0], P = [80, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, fov = 38, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, fov], [1, p1, g1, fov]], ez: 'lin', ...extra });
const A2B = [-1.85, -3.05, 0];
export const SHOTS = [
  k2('S1', 0, 5.0, [0.0, 0.5, 9.0], [-0.4, 0.0, 0], [-0.3, 0.3, 7.8], [-0.4, 0.0, 0], 40),
  k2('S2', 5.0, 7.8, [-1.2, 2.6, 18.0], [-2.6, 0.4, 0], [-1.6, 2.2, 16.6], [-2.6, 0.3, 0], 40),
  k2('S3', 7.8, 10.3, [2.6, 2.4, 9.5], [-0.4, 0.3, 0], [2.2, 2.1, 8.6], [-0.4, 0.3, 0], 40),
  k2('S4', 10.3, 14.7, [0.4, 1.0, 9.6], [-0.5, 0.0, 0], [0.1, 0.8, 8.4], [-0.5, 0.0, 0], 40),
  k2('S5', 14.7, 18.3, at(C, [0.9, 1.4, 7.6]), at(C, [0, 0.4, 0]), at(C, [0.6, 1.2, 6.8]), at(C, [0, 0.4, 0]), 40),
  k2('S6', 18.3, 22.5, [-0.2, 0.4, 8.6], [-0.4, 0.0, 0], [-0.4, 0.3, 7.6], [-0.4, 0.0, 0], 40),
  k2('S7', 22.5, 29.6, at(H, [0.4, 0.3, 6.4]), at(H, [0, 0, 0]), at(H, [0.2, 0.2, 5.6]), at(H, [0, 0, 0]), 40),
  k2('S8', 29.6, 35.8, [-4.3, 1.8, 3.8], [-5.8, 1.35, -0.8], [-4.6, 1.6, 3.2], [-5.8, 1.35, -0.8], 38),
  k2('S9', 35.8, 38.4, [-0.4, 1.4, 6.2], [-0.5, 0.6, 0], [-0.3, 1.2, 5.4], [-0.5, 0.6, 0], 38),
  k2('S10', 38.4, 43.3, at(H, [-0.2, 0.9, 4.2]), at(H, [-0.2, 0.6, 0]), at(H, [-0.4, 0.8, 3.6]), at(H, [-0.2, 0.6, 0]), 38),
  k2('S11a', 43.3, 45.6, at(C, [1.6, 1.9, 6.0]), at(C, [0.5, 0.7, 0]), at(C, [1.4, 1.8, 5.4]), at(C, [0.5, 0.7, 0]), 38),
  k2('S11b', 45.6, 48.0, [-1.0, -2.4, 3.0], [A2B[0], A2B[1], 0.1], [-1.15, -2.5, 2.6], [A2B[0], A2B[1], 0.1], 38),
  k2('S12a', 48.0, 50.5, [0.6, 0.4, 8.4], [-0.2, 0.0, 0], [0.4, 0.3, 7.6], [-0.2, 0.0, 0], 40),
  k2('S12b', 50.5, 52.6, at(P, [2.2, 3.2, 7.0]), at(P, [0, 0.0, 0]), at(P, [1.9, 3.0, 6.3]), at(P, [0, 0.0, 0]), 38),
  k2('S12c', 52.6, 54.6, [2.0, 1.0, 8.0], [0.0, 0.0, 0], [1.8, 0.9, 7.4], [0.0, 0.0, 0], 40),
  k2('S13a', 54.6, 57.6, [-5.0, 0.9, 2.6], [-5.4, 0.8, -0.8], [-5.05, 0.85, 2.2], [-5.4, 0.8, -0.8], 36),
  k2('S13b', 57.6, 59.9, [-3.0, 2.6, 8.0], [-3.6, 1.6, 0], [-3.2, 2.4, 7.2], [-3.6, 1.6, 0], 40),
  k2('S13c', 59.9, 61.7, [1.4, 0.9, 12.0], [-0.3, 0.0, 0], [1.2, 0.8, 11.2], [-0.3, 0.0, 0], 40),
  k2('S13d', 61.7, 63.6, [3.0, 2.0, 11.0], [0.0, 0.0, 0], [2.8, 1.8, 10.2], [0.0, 0.0, 0], 40),
  k2('S14', 63.6, 66.1, [-4.6, 4.2, 3.2], [-5.0, 3.6, -0.5], [-4.7, 4.1, 2.8], [-5.0, 3.6, -0.5], 38),
  k2('S15', 66.1, 69.2, [-4.5, 1.5, 3.0], [-5.8, 1.35, -0.8], [-4.65, 1.45, 2.6], [-5.8, 1.35, -0.8], 38),
  k2('S16', 69.2, 74.7, [0.8, 0.0, 9.5], [0.2, -0.4, 0], [0.6, 0.3, 8.8], [0.2, -0.4, 0], 40),
  k2('S17a', 74.7, 76.6, [2.6, 4.8, 3.4], [1.45, 4.05, 0.3], [2.4, 4.7, 3.0], [1.45, 4.05, 0.3], 36),
  k2('S17b', 76.6, 78.0, [-1.0, -2.4, 3.0], [A2B[0], A2B[1] + 0.4, 0.1], [-1.15, -2.5, 2.6], [A2B[0], A2B[1] + 0.4, 0.1], 38),
  k2('S17c', 78.0, 79.85, [-0.5, 5.6, 9.2], [-0.5, 3.6, 0], [-0.5, 5.5, 8.6], [-0.5, 3.6, 0], 38),
  k2('S18', 79.85, 84, [2.0, 2.0, 15.0], [-1.6, 0.0, 0], [4.0, 3.2, 20.0], [-1.6, 0.4, 0], 40, { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': case 'S6': case 'S12a': case 'S12c': case 'S13d': return { cut: 1, thermal: 1 };
    case 'S13c': return { cut: 0, thermal: 1 };
    case 'S2': case 'S11b': case 'S17b': case 'S14': return { cut: 0 };
    case 'S4': return { cut: ss(10.4, 11.6, t) };
    case 'S18': return { cut: 1 - ss(80.4, 81.8, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(7.8, 8.5, t);
  return { exposure };
}

export const LABELS = [
  { text: 'HOT PART', anchor: 'part', t0: 1.4, t1: 4.9, dx: 60, dy: -300 },
  { text: 'FLOW METERS', anchor: 'manifold', t0: 5.5, t1: 7.7, dx: 60, dy: -260 },
  { text: 'MOULD', anchor: 'bPlate', t0: 5.8, t1: 7.7, dx: -40, dy: -260 },
  { text: 'COOLING CHANNELS', anchor: 'A1', t0: 11.6, t1: 14.6, dx: -60, dy: -300 },
  { text: 'CAVITY', anchor: 'cavity', t0: 12.6, t1: 14.6, dx: 80, dy: 280 },
  { text: 'BUBBLER', sub: 'tube inside a hole', anchor: 'bubbler', t0: 15.2, t1: 18.2, dx: -80, dy: -300 },
  { text: 'BAFFLE', sub: 'blade splits the hole', anchor: 'baffle', t0: 16.2, t1: 18.2, dx: 80, dy: 300 },
  { text: 'HEAT INTO THE WATER', anchor: 'A1', t0: 19.4, t1: 22.4, dx: -60, dy: -300 },
  { text: 'TURBULENT', sub: 'strips heat from the wall', anchor: 'turb', t0: 24.2, t1: 29.5, dx: -40, dy: -320 },
  { text: 'LAMINAR', sub: 'barely touches it', anchor: 'lam', t0: 26.6, t1: 29.5, dx: 40, dy: 300, tone: 'warn' },
  { text: 'FLOW PER CIRCUIT', anchor: 'meterA', t0: 30.4, t1: 35.7, dx: -40, dy: -300 },
  { text: 'SCALE', anchor: 'A1', t0: 36.6, t1: 38.35, dx: -60, dy: -300, tone: 'warn' },
  { text: 'INSULATING LAYER', anchor: 'crust', t0: 39.4, t1: 43.2, dx: 40, dy: -300, tone: 'warn' },
  { text: 'BAFFLE BLOCKED', anchor: 'plug', t0: 44.0, t1: 45.55, dx: 60, dy: -300, tone: 'bad' },
  { text: 'O-RING LEAK', anchor: 'oring', t0: 46.0, t1: 47.95, dx: 60, dy: -300, tone: 'bad' },
  { text: 'HOT SPOT', anchor: 'B1', t0: 48.4, t1: 50.45, dx: 60, dy: -300, tone: 'bad' },
  { text: 'WARPED', anchor: 'partTop', t0: 50.9, t1: 52.55, dx: 60, dy: -300, tone: 'bad' },
  { text: 'SINK MARKS', anchor: 'sink', t0: 51.5, t1: 52.55, dx: -60, dy: 280, tone: 'bad' },
  { text: 'LOW FLOW', anchor: 'floatB', t0: 55.0, t1: 57.55, dx: 60, dy: -300, tone: 'bad' },
  { text: 'HOT SPOTS', sub: 'thermal camera', anchor: 'bPlate', t0: 60.2, t1: 61.65, dx: -40, dy: -280, tone: 'bad' },
  { text: 'TREATED WATER', anchor: 'supply', t0: 64.3, t1: 66.0, dx: 60, dy: -280 },
  { text: 'LOG EVERY CIRCUIT', anchor: 'meterB', t0: 66.5, t1: 69.1, dx: 60, dy: -300 },
  { text: 'DESCALER', anchor: 'cart', t0: 69.6, t1: 71.0, dx: -60, dy: -300 },
  { text: 'NEUTRALISE', anchor: 'B1', t0: 71.0, t1: 72.0, dx: 60, dy: -300 },
  { text: 'RINSE', anchor: 'B1', t0: 72.0, t1: 73.3, dx: 60, dy: -300 },
  { text: 'BLOW DRY', anchor: 'B1', t0: 73.3, t1: 74.6, dx: 60, dy: -300 },
  { text: 'PRESSURE TEST', anchor: 'gaugeT', t0: 75.0, t1: 76.55, dx: -60, dy: -280 },
  { text: 'NEW O-RING', anchor: 'oring', t0: 76.9, t1: 77.95, dx: 60, dy: -300 },
  { text: 'LABEL IN + OUT', anchor: 'tagA', t0: 78.4, t1: 79.8, dx: -40, dy: 300 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
const CYC = [28.0, 28.1, 28.0, 28.4, 28.9, 29.3, 29.9, 30.4, 30.9, 31.4, 31.6];
export function hud(t, st) {
  if (t > 0.8 && t < 4.9) return { opacity: fade(t, 0.8, 4.9), items: [{ k: 'CYCLE', v: '28 s' }, { k: 'COOLING', v: '≈ 2/3 OF IT', big: true, color: '#8fe9ff' }], bar: { k: 'COOLING TIME', v: 0.65, text: '65%', color: '#6fd8ff' } };
  if (t > 23.4 && t < 29.5) return { opacity: fade(t, 23.4, 29.5), items: [{ k: 'AIM FOR', v: 'Re > 10,000', big: true, color: '#6ff0b0' }, { k: 'LAMINAR BELOW', v: 'Re ≈ 2,300', color: '#ffb35c' }] };
  if (t > 30.2 && t < 35.7) return { opacity: fade(t, 30.2, 35.7), items: [
    { k: 'FLOW', v: `${st.flowA.toFixed(1)} L/min` }, { k: 'IN → OUT', v: `${st.tin.toFixed(1)} → ${st.outA.toFixed(1)} °C` },
    { k: 'ΔT', v: `${(st.outA - st.tin).toFixed(1)} °C`, big: true, color: col(st.outA - st.tin, 3.5, 5) },
  ] };
  if (t > 36.2 && t < 38.3) return { opacity: fade(t, 36.2, 38.3), items: [{ k: 'TIME', v: `WEEK ${st.week}` }] };
  if (t > 38.8 && t < 43.2) return { opacity: fade(t, 38.8, 43.2), items: [{ k: 'CIRCUIT B FLOW', v: `${st.flowB.toFixed(1)} L/min`, big: true, color: col(NOM - st.flowB, 2, 5) }, { k: 'TIME', v: `WEEK ${st.week}` }] };
  if (t > 52.8 && t < 54.5) return { opacity: fade(t, 52.8, 54.5), items: [{ k: 'CYCLE TIME', v: `${st.cycleTime.toFixed(1)} s`, big: true, color: '#ff5a4e' }, { k: 'WAS', v: '28.0 s' }] };
  if (t > 55.0 && t < 57.5) return { opacity: fade(t, 55.0, 57.5), pos: 'mid', items: [{ k: 'CIRCUIT A', v: `${st.flowA.toFixed(1)} L/min`, color: '#6ff0b0' }, { k: 'CIRCUIT B', v: `${st.flowB.toFixed(1)} L/min`, big: true, color: '#ff5a4e' }] };
  if (t > 57.9 && t < 59.8) return { opacity: fade(t, 57.9, 59.8), pos: 'mid', items: [{ k: 'B IN → OUT', v: `${st.tin.toFixed(1)} → ${st.outB.toFixed(1)} °C` }, { k: 'ΔT', v: `${(st.outB - st.tin).toFixed(1)} °C`, big: true, color: '#ff5a4e' }] };
  if (t > 61.9 && t < 63.5) return { opacity: fade(t, 61.9, 63.5), pos: 'mid', items: [{ k: 'CYCLE TIME · LAST 10 WEEKS', v: '' }], spark: { values: CYC, n: CYC.length, lo: 27, hi: 32.5, color: '#ff5a4e', band: [27.6, 28.4], unit: ' s' } };
  if (t > 66.5 && t < 69.1) return { opacity: fade(t, 66.5, 69.1), pos: 'mid', items: [{ k: 'CIRCUIT A', v: `${st.flowA.toFixed(1)} ✓`, color: '#6ff0b0' }, { k: 'CIRCUIT B', v: `${st.flowB.toFixed(1)} ✗`, big: true, color: '#ff5a4e' }, { k: 'L/min', v: '' }] };
  if (t > 75.1 && t < 76.55) return { opacity: fade(t, 75.1, 76.55), pos: 'mid', items: [{ k: 'TEST PRESSURE', v: `${st.ptestP.toFixed(1)} bar`, big: true, color: '#6ff0b0' }, { k: 'HOLDING', v: '✓' }] };
  return null;
}

export const CARDS = [
  { t0: 54.7, t1: 63.4, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Low flow on a circuit', t: 55.6 },
    { text: 'Big temperature rise in → out', t: 57.6 },
    { text: 'Hot spots on a thermal camera', t: 59.9 },
    { text: 'Longer cycles', t: 61.8 },
  ] },
  { t0: 64.0, t1: 79.6, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Treat the water at the source', t: 64.0, done: 65.9 },
    { text: 'Measure + log flow per circuit', t: 66.2, done: 69.0 },
    { text: 'Descale · neutralise · rinse · dry', t: 69.3, done: 74.5 },
    { text: 'Pressure test · O-rings · label in/out', t: 74.8, done: 79.2 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [];
