// Hydraulic oil filter — shots, labels, HUD, cards. Times follow timeline.json.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 71.17;
export const TITLE = { big: 'HYDRAULIC FILTER', sub: 'the return-line oil filter', t0: 3.95, t1: 6.4 };
export const END = { big: 'HYDRAULIC FILTER', a: 'Clean oil.', b: 'Long life.', t0: 67.6 };
export const CHAPTERS = [
  { t: 6.45, label: 'HOW IT WORKS' },
  { t: 33.4, label: 'WHAT GOES WRONG' },
  { t: 46.4, label: 'WARNING SIGNS' },
  { t: 54.6, label: 'THE FIX' },
];
const P = [40, 0, 0], V = [60, 0, 0], B = [80, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
export const SHOTS = [
  { id: 'S1', t0: 0, t1: 3.95, keys: [[0, at(V, [-1.0, 0.9, 3.3]), at(V, [-0.55, 0.1, 0]), 40], [1, at(V, [-0.7, 0.75, 2.5]), at(V, [-0.45, 0.2, 0]), 40]], ez: 'lin', headlamp: 3, hand: 0.004 },
  { id: 'S2', t0: 3.95, t1: 6.45, keys: [[0, [3.6, 2.6, 7.8], [0, 0.5, 0], 38], [1, [2.9, 2.2, 6.8], [0, 0.5, 0], 38]], ez: 'lin' },
  { id: 'S3', t0: 6.45, t1: 12.4, keys: [[0, [-0.6, 8.2, 11.5], [-0.9, 7.6, 0], 40], [0.5, [-1.2, 6.6, 12.0], [-1.4, 5.8, 0], 40], [1, [-2.4, 2.6, 13.6], [-2.2, 1.0, 0], 40]] },
  { id: 'S4', t0: 12.4, t1: 15.45, keys: [[0, [0.2, 3.4, 9.0], [-1.4, 1.8, 0], 40], [1, [2.4, 0.6, 7.6], [0.0, -0.9, 0], 40]] },
  { id: 'S5', t0: 15.45, t1: 21.0, keys: [[0, [1.9, 1.2, 4.2], [0.0, -1.5, 0.1], 40], [0.5, [0.6, 1.5, 3.9], [0.0, -1.6, 0.1], 40], [1, [-0.9, 1.1, 3.9], [0.0, -1.7, 0.1], 40]] },
  { id: 'S6', t0: 21.0, t1: 25.5, keys: [[0, [2.0, -0.6, 3.9], [0.2, -1.7, 0], 40], [1, [1.6, -1.2, 3.3], [0.2, -2.0, 0], 40]], ez: 'lin' },
  { id: 'S7', t0: 25.5, t1: 29.2, keys: [[0, [1.0, 0.4, 2.4], [0.0, -0.45, -0.1], 38], [1, [0.75, 0.2, 2.0], [0.0, -0.5, -0.1], 38]], ez: 'lin' },
  { id: 'S8', t0: 29.2, t1: 33.4, keys: [[0, [0.6, 2.5, 2.7], [0, 1.95, 0.1], 34], [1, [0.4, 2.3, 2.2], [0, 1.95, 0.1], 34]], ez: 'lin' },
  { id: 'S9', t0: 33.4, t1: 37.6, keys: [[0, [2.6, 1.2, 7.4], [0.2, -0.4, 0], 40], [1, [2.2, 0.9, 6.6], [0.2, -0.6, 0], 40]], ez: 'lin' },
  { id: 'S10', t0: 37.6, t1: 40.2, keys: [[0, [0.85, 0.15, 2.0], [0.0, -0.55, -0.1], 38], [1, [0.65, 0.0, 1.7], [0.0, -0.6, -0.1], 38]], ez: 'lin' },
  { id: 'S11', t0: 40.2, t1: 43.0, keys: [[0, [1.6, 0.0, 4.6], [0.0, -1.4, 0], 40], [1, [0.0, -1.6, 8.2], [-2.0, -3.0, 0], 40]] },
  { id: 'S12', t0: 43.0, t1: 44.6, keys: [[0, at(P, [0.5, 0.35, 4.9]), at(P, [0.0, 0.0, 0]), 38], [1, at(P, [0.3, 0.3, 4.2]), at(P, [0.05, 0.05, 0]), 38]], ez: 'lin', hand: 0.004 },
  { id: 'S13', t0: 44.6, t1: 46.4, keys: [[0, at(V, [0.5, 1.0, 4.6]), at(V, [0.2, 0.1, 0]), 38], [1, at(V, [0.55, 0.9, 3.6]), at(V, [0.35, 0.2, 0]), 38]], ez: 'lin', hand: 0.004 },
  { id: 'S14', t0: 46.4, t1: 49.5, keys: [[0, [0.7, 2.5, 2.9], [0, 1.95, 0.1], 34], [1, [0.45, 2.3, 2.3], [0, 1.95, 0.1], 34]], ez: 'lin' },
  { id: 'S15', t0: 49.5, t1: 51.5, keys: [[0, [-2.0, 2.0, 4.6], [-4.2, 0.6, 0], 38], [1, [-2.3, 1.8, 4.0], [-4.2, 0.6, 0], 38]], ez: 'lin' },
  { id: 'S16', t0: 51.5, t1: 54.6, keys: [[0, at(B, [0.45, 1.5, 4.8]), at(B, [0, 1.15, 0]), 36], [1, at(B, [0.25, 1.4, 4.3]), at(B, [0, 1.15, 0]), 36]], ez: 'lin' },
  { id: 'S17', t0: 54.6, t1: 59.8, keys: [[0, [3.8, 3.4, 10.0], [0.4, 1.6, 0], 40], [1, [3.4, 3.6, 9.2], [0.6, 2.0, 0], 40]], ez: 'lin' },
  { id: 'S18', t0: 59.8, t1: 61.75, keys: [[0, [-0.6, 2.5, 2.8], [0, 1.95, 0.1], 34], [1, [-0.4, 2.3, 2.3], [0, 1.95, 0.1], 34]], ez: 'lin' },
  { id: 'S19', t0: 61.75, t1: 64.45, keys: [[0, [2.0, 0.6, 2.5], [0.8, -0.15, 0], 38], [1, [1.75, 0.45, 2.05], [0.8, -0.18, 0], 38]], ez: 'lin' },
  { id: 'S20', t0: 64.45, t1: 67.5, keys: [[0, at(B, [-0.45, 1.5, 4.8]), at(B, [0, 1.15, 0]), 36], [1, at(B, [-0.25, 1.4, 4.3]), at(B, [0, 1.15, 0]), 36]], ez: 'lin' },
  { id: 'S21', t0: 67.5, t1: 72, keys: [[0, [4.6, 2.0, 10.0], [0, 0.2, 0], 40], [1, [6.6, 3.4, 14.5], [-0.6, 1.0, 0], 40]] },
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S2': case 'S3': case 'S15': case 'S17': return { cut: 0 };
    case 'S4': return { cut: ss(12.8, 14.3, t) };
    case 'S18': return { cut: 1, t: 48.2 + (t - 59.8) * 0.3 };
    case 'S21': return { cut: 1 - ss(68.0, 69.6, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S2') exposure = 0.35 + 0.65 * ss(3.95, 4.7, t);
  if (['S8', 'S14', 'S18'].includes(ctx.shot.id)) exposure = 0.82;
  return { exposure };
}

export const LABELS = [
  { text: 'DIRT', sub: 'smaller than a hair', anchor: 'spoolLand', t0: 1.4, t1: 3.9, dx: 80, dy: -320, tone: 'warn' },
  { text: 'CLAMP', anchor: 'clamp', t0: 7.8, t1: 10.2, dx: 60, dy: -200 },
  { text: 'INJECTION', anchor: 'injection', t0: 8.4, t1: 10.2, dx: 60, dy: -200 },
  { text: 'EJECTORS', anchor: 'ejectors', t0: 9.0, t1: 10.2, dx: 60, dy: -200 },
  { text: 'VALVES', anchor: 'manifold', t0: 10.4, t1: 12.3, dx: 120, dy: -260 },
  { text: 'PUMP', anchor: 'pump', t0: 10.9, t1: 12.3, dx: -60, dy: -280 },
  { text: 'TANK', anchor: 'tank', t0: 11.3, t1: 12.3, dx: 60, dy: 260 },
  { text: 'RETURN LINE', anchor: 'returnLine', t0: 12.6, t1: 14.4, dx: 120, dy: -260 },
  { text: 'FILTER', anchor: 'filter', t0: 14.0, t1: 15.4, dx: 80, dy: -300 },
  { text: 'PLEATED MEDIA', anchor: 'pleats', t0: 17.4, t1: 20.9, dx: -60, dy: -340 },
  { text: 'CORE', anchor: 'core', t0: 19.3, t1: 20.9, dx: -100, dy: 300 },
  { text: 'TRAPPED', sub: 'on the outside', anchor: 'trapped', t0: 23.6, t1: 25.45, dx: 80, dy: 280 },
  { text: 'BYPASS VALVE', anchor: 'bypass', t0: 26.0, t1: 29.15, dx: 80, dy: -330 },
  { text: 'SPRING', anchor: 'spring', t0: 27.4, t1: 29.15, dx: -80, dy: 280 },
  { text: 'ΔP INDICATOR', anchor: 'gauge', t0: 30.0, t1: 33.35, dx: 80, dy: -330 },
  { text: 'BYPASS OPEN', anchor: 'bypass', t0: 38.4, t1: 40.15, dx: 80, dy: -330, tone: 'bad' },
  { text: 'UNFILTERED OIL', anchor: 'core', t0: 40.6, t1: 42.9, dx: 100, dy: -320, tone: 'bad' },
  { text: 'PUMP WEAR', anchor: 'gearWear', t0: 43.3, t1: 44.55, dx: 60, dy: -320, tone: 'bad' },
  { text: 'VALVE JAMMED', anchor: 'jam', t0: 45.1, t1: 46.35, dx: -60, dy: -320, tone: 'bad' },
  { text: 'IN THE RED', anchor: 'gauge', t0: 47.6, t1: 49.45, dx: 80, dy: -330, tone: 'bad' },
  { text: 'NOISY PUMP', anchor: 'pump', t0: 49.9, t1: 51.45, dx: 60, dy: -320, tone: 'bad' },
  { text: 'OIL SAMPLE', anchor: 'bottle', t0: 51.9, t1: 54.55, dx: 80, dy: -330, tone: 'warn' },
  { text: 'NEW ELEMENT', anchor: 'element', t0: 57.4, t1: 59.75, dx: 80, dy: -300 },
  { text: 'BYPASS = DIRTY OIL', anchor: 'gauge', t0: 60.1, t1: 61.7, dx: 60, dy: -330, tone: 'bad' },
  { text: 'O-RING', sub: 'check the seal', anchor: 'oring', t0: 62.2, t1: 64.4, dx: 60, dy: -320 },
  { text: 'CLEAN SAMPLE', anchor: 'bottle', t0: 65.0, t1: 67.45, dx: 80, dy: -330 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
export function hud(t, st) {
  if (t > 17.6 && t < 20.95) {
    return { opacity: ss(17.6, 18.0, t) * (1 - ss(20.65, 20.95, t)), items: [
      { k: 'PLEATS', v: '36' },
      { k: 'MEDIA AREA', v: '5× MORE', big: true, color: '#8fe9ff' },
      { k: 'RATING', v: '10 µm' },
    ] };
  }
  if (t > 30.6 && t < 37.55) {
    const lapse = t > 33.4;
    return { opacity: ss(30.6, 31.0, t) * (1 - ss(37.25, 37.55, t)), items: [
      lapse ? { k: 'TIME', v: `WEEK ${st.week}` } : { k: 'ELEMENT', v: 'CLEAN' },
      { k: 'ΔP ELEMENT', v: `${st.dp.toFixed(1)} bar`, big: true, color: col(st.dp, 1.6, 2.5) },
      { k: 'BYPASS AT', v: '3.0 bar' },
    ], bar: { k: 'ELEMENT LOAD', v: st.load, text: `${Math.round(st.load * 100)}%`, color: col(st.load, 0.5, 0.8) } };
  }
  if (t > 52.0 && t < 54.5) {
    return { opacity: ss(52.0, 52.4, t) * (1 - ss(54.2, 54.5, t)), pos: 'mid', items: [
      { k: 'PARTICLE COUNT · ISO 4406', v: st.iso.join('/'), big: true, color: '#ff5a4e' },
      { k: 'TARGET', v: '16/14/11' },
    ] };
  }
  if (t > 65.0 && t < 67.4) {
    return { opacity: ss(65.0, 65.4, t) * (1 - ss(67.1, 67.4, t)), pos: 'mid', items: [
      { k: 'PARTICLE COUNT · ISO 4406', v: st.iso.join('/'), big: true, color: '#6ff0b0' },
      { k: 'TARGET', v: '16/14/11' },
    ] };
  }
  return null;
}

export const CARDS = [
  { t0: 46.5, t1: 54.5, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Indicator in the red', t: 48.3 },
    { text: 'Noisy pump', t: 49.9 },
    { text: 'Particle counts rising', t: 51.0 },
  ] },
  { t0: 54.7, t1: 67.4, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Change on the indicator, not the calendar', t: 54.9, done: 59.5 },
    { text: 'Never run in the red', t: 60.0, done: 61.5 },
    { text: 'Right element, check the seals', t: 61.9, done: 64.2 },
    { text: 'Sample the oil', t: 64.6, done: 66.8 },
  ] },
];
export const SHAKES = [49.6, 49.9, 50.2, 50.5, 50.8, 51.1].map((t) => ({ t, a: 0.02, d: 0.12 }));
export const FLASHES = [];
