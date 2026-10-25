// Hydraulic hose — shots, labels, HUD, cards. Times follow timeline.json.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 67.56;
export const TITLE = { big: 'HYDRAULIC HOSE', sub: 'what holds the pressure', t0: 7.2, t1: 9.25 };
export const END = { big: 'HYDRAULIC HOSE', a: 'Check it', b: 'before it bursts.', t0: 64.25 };
export const CHAPTERS = [
  { t: 9.3, label: 'HOW IT WORKS' },
  { t: 28.2, label: 'WHAT GOES WRONG' },
  { t: 42.75, label: 'WARNING SIGNS' },
  { t: 48.95, label: 'THE FIX' },
];
const L = [40, 0, 0], D = [60, 0, 0], T = [80, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const sh = (id, t0, t1, o, p0, g0, p1, g1, fov = 38, extra = {}) => ({ id, t0, t1, keys: [[0, at(o, p0), at(o, g0), fov], [1, at(o, p1), at(o, g1), fov]], ez: 'lin', ...extra });
const O = [0, 0, 0];
export const SHOTS = [
  sh('S1', 0, 5.15, D, [2.7, 0.95, 2.9], [2.1, 0.6, 0.6], [2.5, 0.9, 2.5], [2.1, 0.65, 0.6], 40, { headlamp: 3, hand: 0.004 }),
  sh('S2', 5.15, 7.2, O, [2.5, 1.2, 6.5], [-0.5, -0.8, 0], [1.8, 0.8, 5.5], [-0.5, -0.9, 0], 40),
  sh('S3', 7.2, 9.3, O, [5.5, 2.8, 12.0], [0.4, -0.4, 0], [4.8, 2.4, 11.0], [0.4, -0.4, 0], 40),
  sh('S4', 9.3, 13.6, O, [-3.4, 1.6, 8.2], [-3.0, -0.4, 0], [2.6, 1.4, 8.4], [2.4, -0.4, 0], 40),
  sh('S5', 13.6, 17.15, L, [3.2, 1.5, 2.4], [2.0, 0.0, -0.1], [2.8, 1.3, 2.1], [1.9, 0.0, -0.1], 36),
  sh('S6', 17.15, 19.4, L, [1.5, 1.5, 2.4], [0.5, 0.0, -0.1], [1.2, 1.3, 2.1], [0.4, 0.0, -0.1], 36),
  sh('S7', 19.4, 21.6, L, [-0.4, 1.5, 2.4], [-1.3, 0.0, -0.1], [-0.7, 1.3, 2.1], [-1.4, 0.0, -0.1], 36),
  sh('S8', 21.6, 23.6, L, [-2.2, 1.0, 3.2], [-3.3, 0.0, 0], [-2.5, 0.9, 2.8], [-3.4, 0.0, 0], 36),
  sh('S9', 23.6, 28.2, O, [0.8, 0.2, 7.6], [-0.2, -1.4, 0], [0.4, 0.0, 6.6], [-0.2, -1.5, 0], 40),
  sh('S10', 28.2, 31.4, D, [0.4, 0.8, 3.6], [-0.6, 0.0, 0], [0.0, 0.7, 3.1], [-0.6, 0.0, 0], 38),
  sh('S11', 31.4, 35.6, D, [-1.7, 0.6, 2.5], [-2.45, 0.22, 0.2], [-1.9, 0.55, 2.0], [-2.45, 0.22, 0.2], 38),
  sh('S12', 35.6, 38.35, T, [0.9, 0.6, 5.6], [-0.5, -0.6, 0], [0.7, 0.5, 5.0], [-0.5, -0.6, 0], 40, { headlamp: 6 }),
  sh('S13a', 38.35, 39.65, D, [4.6, -0.2, 2.2], [3.8, -0.5, 0.3], [4.5, -0.25, 1.9], [3.8, -0.55, 0.3], 38),
  sh('S13b', 39.65, 41.0, D, [2.9, 0.9, 3.2], [2.1, 0.7, 0.6], [2.8, 0.85, 2.9], [2.1, 0.7, 0.6], 38),
  sh('S13c', 41.0, 42.75, D, [1.7, 1.0, 4.6], [0.6, 0.5, 0.3], [1.9, 1.1, 5.0], [0.6, 0.5, 0.3], 40),
  sh('S14a', 42.75, 45.0, D, [-0.1, 0.6, 2.2], [-0.8, 0.1, 0], [-0.3, 0.55, 1.9], [-0.8, 0.1, 0], 36),
  sh('S14b', 45.0, 46.1, D, [-1.9, 0.6, 2.0], [-2.45, 0.22, 0.2], [-2.0, 0.55, 1.75], [-2.45, 0.22, 0.2], 36),
  sh('S14c', 46.1, 47.1, D, [1.7, 0.9, 3.8], [0.6, 0.1, 0], [1.5, 0.8, 3.4], [0.6, 0.1, 0], 38),
  sh('S14d', 47.1, 48.95, D, [4.6, 0.2, 2.6], [3.8, -0.3, 0.2], [4.5, 0.15, 2.3], [3.8, -0.3, 0.2], 36),
  { id: 'S15', t0: 48.95, t1: 51.3, keys: [[0, [-2.0, 0.6, 5.5], [-1.6, -1.0, 0], 40], [1, [1.5, 0.4, 5.5], [1.0, -1.2, 0], 40]], ez: 'lin' },
  sh('S16', 51.3, 54.7, D, [4.4, 1.0, 2.6], [2.1, 0.8, 0.9], [4.1, 0.95, 2.3], [2.1, 0.8, 0.9], 40),
  sh('S17a', 54.7, 56.85, D, [-1.5, 0.4, 3.5], [-2.2, -0.2, 0.2], [-1.7, 0.35, 3.1], [-2.3, -0.2, 0.2], 38),
  sh('S17b', 56.85, 58.95, T, [1.6, 0.4, 8.2], [0.0, -0.8, 0], [1.3, 0.2, 7.4], [0.1, -0.8, 0], 40, { headlamp: 6 }),
  sh('S18a', 58.95, 60.45, D, [-4.7, 1.9, 2.4], [-5.25, 1.45, 0.3], [-4.8, 1.85, 2.1], [-5.25, 1.45, 0.3], 34),
  sh('S18b', 60.45, 61.9, D, [-5.9, 1.3, 3.4], [-6.8, 0.4, 0.6], [-6.0, 1.2, 3.0], [-6.8, 0.4, 0.6], 38),
  sh('S18c', 61.9, 64.25, D, [1.0, 1.6, 8.8], [-0.6, 0.0, 0], [0.6, 1.4, 8.0], [-0.6, 0.0, 0], 40),
  sh('S19', 64.25, 68, O, [5.0, 2.6, 11.5], [0.4, -0.4, 0], [7.5, 3.6, 15.5], [0.4, 0.2, 0], 40),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S4': return { cut: 0, xray: 1 };
    case 'S9': return { cut: 0, xray: 0.65 };
    case 'S5': case 'S6': case 'S7': case 'S8': return { cut: 1 };
    default: return { cut: 0 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(7.2, 7.9, t);
  return { exposure };
}

export const LABELS = [
  { text: 'PINHOLE LEAK', anchor: 'jet', t0: 0.9, t1: 5.05, dx: -80, dy: 300, tone: 'bad' },
  { text: 'VALVE BLOCK', anchor: 'manifold', t0: 9.8, t1: 11.4, dx: 60, dy: -300 },
  { text: 'HIGH-PRESSURE OIL', anchor: 'hose', t0: 10.4, t1: 13.5, dx: 60, dy: 280 },
  { text: 'MOVING PART', anchor: 'carriage', t0: 11.6, t1: 13.5, dx: -60, dy: -300 },
  { text: 'INNER TUBE', sub: 'holds the oil', anchor: 'tube', t0: 13.9, t1: 17.1, dx: -60, dy: -320 },
  { text: 'OIL', anchor: 'bore', t0: 15.0, t1: 17.1, dx: 80, dy: 280 },
  { text: 'STEEL WIRE BRAID', sub: 'holds the pressure', anchor: 'wire', t0: 17.4, t1: 19.35, dx: -60, dy: -320 },
  { text: 'COVER', sub: 'protects the wire', anchor: 'cover', t0: 19.6, t1: 21.55, dx: -60, dy: -320 },
  { text: 'CRIMPED FERRULE', anchor: 'ferrule', t0: 21.8, t1: 23.55, dx: 60, dy: -320 },
  { text: 'STEM', anchor: 'stem', t0: 22.3, t1: 23.55, dx: -60, dy: 300 },
  { text: 'PRESSURE SPIKE', anchor: 'hoseTop', t0: 24.8, t1: 28.1, dx: 60, dy: -300, tone: 'warn' },
  { text: 'CRACKING', anchor: 'crack', t0: 29.5, t1: 31.35, dx: 60, dy: -300, tone: 'warn' },
  { text: 'RUB POINT', anchor: 'rub', t0: 31.6, t1: 32.9, dx: -60, dy: 300, tone: 'warn' },
  { text: 'WIRE EXPOSED', sub: 'then it rusts', anchor: 'wire2', t0: 33.0, t1: 34.6, dx: -60, dy: -320, tone: 'bad' },
  { text: 'SNAPPED STRAND', anchor: 'strand', t0: 34.75, t1: 35.55, dx: 60, dy: -300, tone: 'bad' },
  { text: 'TIGHT BEND', anchor: 'bend', t0: 36.0, t1: 38.3, dx: -60, dy: -300, tone: 'bad' },
  { text: 'TWISTED', sub: 'see the print line', anchor: 'lay', t0: 36.8, t1: 38.3, dx: 80, dy: 260, tone: 'bad' },
  { text: 'WEEP', anchor: 'fitWet', t0: 38.6, t1: 39.6, dx: -60, dy: 280, tone: 'warn' },
  { text: 'SPRAY', anchor: 'jet', t0: 39.85, t1: 40.95, dx: -80, dy: 300, tone: 'bad' },
  { text: 'BURST', anchor: 'bulge', t0: 41.45, t1: 42.7, dx: -80, dy: -300, tone: 'bad' },
  { text: 'CRACKED COVER', anchor: 'crack', t0: 43.3, t1: 44.95, dx: 60, dy: -300, tone: 'bad' },
  { text: 'EXPOSED WIRE', anchor: 'wire2', t0: 45.15, t1: 46.05, dx: -60, dy: -300, tone: 'bad' },
  { text: 'BULGE', anchor: 'bulge', t0: 46.25, t1: 47.05, dx: -60, dy: -300, tone: 'bad' },
  { text: 'WET FITTING', anchor: 'fitWet', t0: 47.25, t1: 48.9, dx: -60, dy: 280, tone: 'bad' },
  { text: 'CARDBOARD', anchor: 'card', t0: 52.0, t1: 54.65, dx: -80, dy: -300 },
  { text: 'SPIRAL GUARD', anchor: 'guard', t0: 55.4, t1: 56.8, dx: 60, dy: -300 },
  { text: 'GENTLE BEND', anchor: 'bend', t0: 57.6, t1: 58.9, dx: -60, dy: -300 },
  { text: 'NO TWIST', anchor: 'lay', t0: 58.0, t1: 58.9, dx: 80, dy: 260 },
  { text: 'DEPRESSURISE', anchor: 'gauge', t0: 59.2, t1: 60.4, dx: 60, dy: -300 },
  { text: 'LOCK OUT', anchor: 'lock', t0: 61.0, t1: 61.85, dx: 60, dy: -300 },
  { text: 'NEW HOSE', anchor: 'crack', t0: 62.4, t1: 64.2, dx: 60, dy: -320 },
];

const SPIKES = [210, 211, 268, 212, 209, 292, 211, 210, 275, 212, 210, 286];
export function hud(t, st) {
  const fade = (a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
  if (t > 0.9 && t < 5.05) return { opacity: fade(0.9, 5.05), items: [{ k: 'LINE PRESSURE', v: '210 bar' }, { k: 'CAN PIERCE SKIN FROM', v: '≈ 7 bar', big: true, color: '#ff5a4e' }] };
  if (t > 10.0 && t < 13.5) return { opacity: fade(10.0, 13.5), items: [{ k: 'WORKING PRESSURE', v: '210 bar', big: true, color: '#ffb35c' }, { k: 'THAT IS', v: '≈ 2 tonnes / cm²' }] };
  if (t > 24.2 && t < 28.1) {
    const n = Math.max(2, Math.min(SPIKES.length, Math.round(2 + (t - 24.2) * 3)));
    return { opacity: fade(24.2, 28.1), items: [{ k: 'PRESSURE · bar', v: '' }], spark: { values: SPIKES, n, lo: 150, hi: 320, color: '#ffb35c', band: [200, 220], unit: '' } };
  }
  if (t > 28.6 && t < 31.35) return { opacity: fade(28.6, 31.35), items: [{ k: 'FLEX + PRESSURE CYCLES', v: st.cycles.toLocaleString('en-US'), big: true, color: '#ffb35c' }] };
  if (t > 52.0 && t < 54.65) return { opacity: fade(52.0, 54.65), pos: 'mid', items: [{ k: 'FINDING A LEAK', v: 'NEVER BY HAND', big: true, color: '#ff5a4e' }] };
  if (t > 59.1 && t < 60.45) return { opacity: fade(59.1, 60.45), pos: 'mid', items: [{ k: 'SYSTEM PRESSURE', v: `${Math.round(st.pressure)} bar`, big: true, color: st.pressure < 1 ? '#6ff0b0' : '#ffb35c' }] };
  return null;
}

export const CARDS = [
  { t0: 42.8, t1: 48.9, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Worn or cracked cover', t: 43.6 },
    { text: 'Exposed wire', t: 45.1 },
    { text: 'Bulges', t: 46.2 },
    { text: 'Wet fittings', t: 47.2 },
  ] },
  { t0: 49.0, t1: 64.2, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Inspect on a schedule', t: 49.1, done: 51.1 },
    { text: 'Find leaks with cardboard', t: 51.4, done: 54.4 },
    { text: 'Guard rubs · no twists or tight bends', t: 54.8, done: 58.7 },
    { text: 'Depressurise + lock out to replace', t: 59.0, done: 63.4 },
  ] },
];
export const SHAKES = [{ t: 41.42, a: 0.07, d: 0.22 }];
export const FLASHES = [{ t: 41.42, a: 0.35, d: 0.15 }, { t: 61.95, a: 0.55, d: 0.18 }];
