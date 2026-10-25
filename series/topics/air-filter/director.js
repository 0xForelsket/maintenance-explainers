// Compressed air filter — shots, labels, HUD, cards. Times follow timeline.json.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 74.2;
export const TITLE = { big: 'AIR FILTER', sub: 'compressed air · float drain', t0: 6.1, t1: 8.2 };
export const END = { big: 'AIR FILTER', a: 'Dry air.', b: 'Happy machines.', t0: 70.7 };
export const CHAPTERS = [
  { t: 8.3, label: 'HOW IT WORKS' },
  { t: 35.6, label: 'WHAT GOES WRONG' },
  { t: 49.3, label: 'WARNING SIGNS' },
  { t: 56.5, label: 'THE FIX' },
];
const py = 2.55;
export const SHOTS = [
  { id: 'S1', t0: 0, t1: 5.75, cam: (t) => {
    const x = -10.2 + 2.6 * (t / 5.75);
    return { pos: [x, py + 0.02 + 0.03 * Math.sin(t), 0.02], tgt: [x + 4, py - 0.05, 0], fov: 58, roll: 0.15 * Math.sin(t * 0.4) };
  }, headlamp: 9, hand: 0.01 },
  { id: 'S2', t0: 5.75, t1: 8.25, keys: [[0, [5.4, 0.9, 10.4], [0.6, 0.5, 0], 40], [1, [4.2, 0.4, 9.2], [0.5, 0.4, 0], 40]], ez: 'lin' },
  { id: 'S3', t0: 8.25, t1: 15.45, keys: [[0, [-7.4, 3.4, 4.0], [-7.0, py, 0], 40], [0.5, [-5.0, 3.1, 3.6], [-4.6, py - 0.1, 0], 40], [1, [-2.6, 3.0, 4.4], [-2.2, py - 0.2, 0], 40]] },
  { id: 'S4', t0: 15.45, t1: 18.75, keys: [[0, [1.4, 2.9, 5.0], [0.0, 1.7, -0.3], 38], [1, [1.0, 2.5, 4.3], [0.0, 1.5, -0.3], 38]], ez: 'lin' },
  { id: 'S5', t0: 18.75, t1: 22.4, keys: [[0, [1.3, 0.9, 4.6], [0.4, 0.4, -0.5], 40], [1, [1.2, -0.3, 4.6], [0.3, -0.9, -0.5], 40]] },
  { id: 'S6', t0: 22.4, t1: 26.3, keys: [[0, [1.0, 0.8, 3.6], [0.2, 0.3, -0.3], 38], [1, [0.8, 0.4, 3.1], [0.15, 0.1, -0.3], 38]], ez: 'lin' },
  { id: 'S7', t0: 26.3, t1: 28.7, keys: [[0, [1.2, 2.0, 5.6], [0.2, 1.6, 0], 40], [1, [3.4, 3.0, 6.4], [2.4, py, 0], 40]] },
  { id: 'S8', t0: 28.7, t1: 32.7, keys: [[0, [1.4, -1.0, 4.4], [0.2, -1.9, -0.2], 38], [1, [1.2, -1.5, 3.8], [0.15, -2.2, -0.2], 38]], ez: 'lin' },
  { id: 'S9', t0: 32.7, t1: 35.6, keys: [[0, [1.0, -2.2, 3.8], [0.0, -2.8, 0], 38], [1, [1.0, -2.6, 3.6], [0.0, -3.2, 0], 38]], ez: 'lin' },
  { id: 'S10', t0: 35.6, t1: 39.2, keys: [[0, [0.9, -2.0, 3.2], [0.0, -2.45, -0.1], 36], [1, [0.7, -2.2, 2.6], [0.0, -2.5, -0.1], 36]], ez: 'lin' },
  { id: 'S11', t0: 39.2, t1: 44.6, keys: [[0, [1.2, 0.6, 12.5], [0.6, 0.2, 0], 40], [0.5, [3.5, 0.9, 12.0], [3.2, 0.6, 0], 40], [1, [7.6, 1.2, 8.6], [7.6, 0.8, 0], 40]] },
  { id: 'S12', t0: 44.6, t1: 49.3, keys: [[0, [1.8, 2.8, 9.2], [0.0, 2.3, 0], 38], [1, [1.5, 3.0, 8.4], [0.0, 2.5, 0], 38]], ez: 'lin' },
  { id: 'S13a', t0: 49.3, t1: 52.9, keys: [[0, [1.9, -0.6, 5.8], [0.0, -1.2, 0], 38], [1, [1.5, -0.8, 5.0], [0.0, -1.3, 0], 38]], ez: 'lin' },
  { id: 'S13b', t0: 52.9, t1: 54.5, keys: [[0, [9.6, 1.8, 6.0], [8.0, 1.4, 0], 38], [1, [9.2, 1.7, 5.4], [8.0, 1.4, 0], 38]], ez: 'lin' },
  { id: 'S13c', t0: 54.5, t1: 56.5, keys: [[0, [0.6, 4.6, 3.0], [0.0, 4.25, 0], 34], [1, [0.4, 4.45, 2.5], [0.0, 4.25, 0], 34]], ez: 'lin' },
  { id: 'S14', t0: 56.5, t1: 61.3, keys: [[0, [2.2, -1.9, 5.0], [0.1, -2.6, 0], 38], [1, [1.8, -2.5, 4.2], [0.1, -3.1, 0], 38]], ez: 'lin' },
  { id: 'S15', t0: 61.3, t1: 63.5, keys: [[0, [0.9, -2.0, 3.2], [0.0, -2.5, -0.1], 36], [1, [0.9, -2.2, 3.4], [0.0, -2.7, -0.1], 36]], ez: 'lin' },
  { id: 'S16', t0: 63.5, t1: 66.6, keys: [[0, [1.8, 1.4, 7.4], [0.0, 1.0, 0], 38], [1, [1.6, 1.8, 7.0], [0.0, 1.5, 0], 38]], ez: 'lin' },
  { id: 'S17a', t0: 66.6, t1: 68.75, keys: [[0, [-4.6, 3.9, 6.2], [-5.0, py + 0.4, 0], 38], [1, [-4.4, 3.7, 5.6], [-4.8, py + 0.4, 0], 38]], ez: 'lin' },
  { id: 'S17b', t0: 68.75, t1: 70.6, keys: [[0, [2.4, -0.4, 6.8], [0.0, -0.7, 0], 38], [1, [2.2, -0.6, 6.4], [0.0, -0.8, 0], 38]], ez: 'lin' },
  { id: 'S18', t0: 70.6, t1: 75, keys: [[0, [5.4, 0.6, 10.6], [0.6, 0.8, 0], 40], [1, [7.4, 1.6, 13.6], [0.6, 2.2, 0], 40]] },
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': return { cut: 0 };
    case 'S2': return { cut: 0 };
    case 'S3': return { cut: ss(8.35, 9.7, t), cutRange: [1.7, 0] };
    case 'S13a': case 'S14': case 'S17a': case 'S17b': return { cut: 0 };
    case 'S18': return { cut: 0 };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S2') exposure = 0.35 + 0.65 * ss(5.75, 6.5, t);
  return { exposure };
}

export const LABELS = [
  { text: 'WATER', anchor: 'water', t0: 11.9, t1: 15.4, dx: -120, dy: -300 },
  { text: 'OIL', anchor: 'oil', t0: 13.05, t1: 15.4, dx: 120, dy: -300, tone: 'warn' },
  { text: 'RUST', anchor: 'rust', t0: 13.6, t1: 15.4, dx: -60, dy: 300, tone: 'warn' },
  { text: 'DEFLECTOR', sub: 'spins the air', anchor: 'deflector', t0: 16.7, t1: 18.7, dx: -60, dy: -320 },
  { text: 'BOWL', anchor: 'bowl', t0: 20.7, t1: 22.35, dx: -60, dy: -300 },
  { text: 'ELEMENT', sub: 'traps fine dirt', anchor: 'element', t0: 23.9, t1: 26.25, dx: 100, dy: -320 },
  { text: 'CLEAN AIR OUT', anchor: 'outlet', t0: 26.9, t1: 28.65, dx: 80, dy: -280 },
  { text: 'BAFFLE', anchor: 'baffle', t0: 30.0, t1: 32.65, dx: 100, dy: -300 },
  { text: 'QUIET ZONE', sub: 'still water', anchor: 'quiet', t0: 31.0, t1: 32.65, dx: -80, dy: 260 },
  { text: 'FLOAT DRAIN', anchor: 'float', t0: 33.2, t1: 35.55, dx: 100, dy: -300 },
  { text: 'STUCK FLOAT', sub: 'jammed by sludge', anchor: 'float', t0: 37.3, t1: 39.15, dx: 100, dy: -300, tone: 'bad' },
  { text: 'WATER DOWNSTREAM', anchor: 'carry', t0: 41.4, t1: 43.0, dx: 60, dy: -300, tone: 'bad' },
  { text: 'CYLINDER', anchor: 'cylinder', t0: 43.0, t1: 44.55, dx: -100, dy: -300, tone: 'bad' },
  { text: 'ΔP INDICATOR', anchor: 'dpGauge', t0: 47.0, t1: 49.25, dx: 120, dy: 260, tone: 'warn' },
  { text: 'MAX', sub: 'water line', anchor: 'maxLine', t0: 50.4, t1: 52.85, dx: 120, dy: -280, tone: 'bad' },
  { text: 'SPITTING', anchor: 'muffler', t0: 53.1, t1: 54.45, dx: -80, dy: -300, tone: 'bad' },
  { text: 'TEST BUTTON', anchor: 'testBtn', t0: 58.8, t1: 61.2, dx: 120, dy: -280 },
  { text: 'NEW ELEMENT', anchor: 'element', t0: 64.4, t1: 66.5, dx: 100, dy: -300 },
  { text: 'SHUT-OFF', anchor: 'valve', t0: 67.0, t1: 68.7, dx: 100, dy: -300 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
export function hud(t, st) {
  if (t > 44.7 && t < 49.25) {
    return { opacity: ss(44.7, 45.1, t) * (1 - ss(48.95, 49.25, t)), items: [
      { k: 'IN', v: `${st.pIn.toFixed(1)} bar` },
      { k: 'ΔP ELEMENT', v: `${st.dp.toFixed(2)} bar`, big: true, color: col(st.dp, 0.35, 0.65) },
      { k: 'OUT', v: `${st.pOut.toFixed(1)} bar`, color: col(st.dp, 0.35, 0.65) },
    ] };
  }
  return null;
}

export const CARDS = [
  { t0: 49.4, t1: 56.45, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Water above the line', t: 50.4 },
    { text: 'Tools spitting water', t: 53.05 },
    { text: 'Indicator in the red', t: 54.6 },
  ] },
  { t0: 56.6, t1: 70.5, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Check the bowl daily', t: 57.3, done: 58.6 },
    { text: 'Press the drain test button', t: 58.8, done: 60.9 },
    { text: 'Clean or replace a stuck drain', t: 61.5, done: 63.2 },
    { text: 'Change the element on the indicator', t: 63.6, done: 66.2 },
    { text: 'Release pressure before opening', t: 66.8, done: 68.7 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [];
