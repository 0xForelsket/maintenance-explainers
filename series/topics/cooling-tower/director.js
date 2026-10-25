// Cooling tower — shots, labels, HUD, cards. Times follow topics/cooling-tower/timeline.json.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 71.6;
export const TITLE = { big: 'COOLING TOWER', sub: 'where the moulds’ heat goes', t0: 4.75, t1: 6.6 };
export const END = { big: 'COOLING TOWER', a: 'Clean water.', b: 'Cool moulds.', t0: 68.2 };
export const CHAPTERS = [
  { t: 6.7, label: 'HOW IT WORKS' },
  { t: 24.4, label: 'WHAT GOES WRONG' },
  { t: 48.3, label: 'WARNING SIGNS' },
  { t: 54.65, label: 'THE FIX' },
];

// keys: [u, camera position, target, fov]
export const SHOTS = [
  { id: 'S1', t0: 0, t1: 4.55, keys: [[0, [-12.2, -3.0, 9.6], [-13.5, -4.3, 0], 34], [0.55, [-12.8, -3.3, 7.6], [-13.6, -4.2, 0], 34], [1, [-15.0, -4.2, 7.4], [-15.9, -5.0, -0.2], 36]], hand: 0.008 },
  { id: 'S2', t0: 4.55, t1: 6.65, keys: [[0, [12.5, -6.6, 22.5], [0.2, 0.6, 0], 40], [1, [10.4, -6.1, 20.5], [0.2, 0.8, 0], 40]], ez: 'lin', hand: 0.006 },
  { id: 'S3', t0: 6.65, t1: 9.85, keys: [[0, [11.5, -4.8, 15.5], [2.6, -2.6, 0], 38], [1, [8.6, -0.4, 12.0], [2.8, -0.2, 0], 38]], hand: 0.006 },
  { id: 'S4', t0: 9.85, t1: 13.85, keys: [[0, [1.3, 1.5, 4.3], [-0.6, 0.45, -0.8], 40], [0.5, [1.0, 0.8, 4.5], [-0.4, 0.0, -0.6], 40], [1, [0.9, -0.6, 4.9], [0.0, -1.0, -0.2], 40]], hand: 0.006 },
  { id: 'S5', t0: 13.85, t1: 15.95, keys: [[0, [-1.0, -3.0, 15.5], [-0.6, -1.9, 0], 40], [1, [-0.6, -0.6, 16.0], [-0.3, 0.9, 0], 40]], hand: 0.006 },
  { id: 'S6a', t0: 15.95, t1: 17.9, keys: [[0, [0.7, -0.6, 3.5], [0.0, -1.0, -0.2], 40], [1, [0.5, -0.3, 3.0], [0.0, -0.8, -0.2], 40]], ez: 'lin', hand: 0.005 },
  { id: 'S6b', t0: 17.9, t1: 19.85, keys: [[0, [6.5, 3.2, 14.5], [0, 6.0, 0], 42], [1, [5.4, 3.8, 13.0], [0, 7.8, 0], 42]], ez: 'lin', hand: 0.006 },
  { id: 'S7', t0: 19.85, t1: 24.4, keys: [[0, [1.6, -4.0, 7.6], [0.0, -5.4, -0.6], 40], [0.55, [-1.8, -4.5, 7.2], [-2.8, -5.8, -0.2], 40], [1, [-4.2, -4.4, 6.8], [-5.4, -5.6, 0], 40]], hand: 0.006 },
  { id: 'S8', t0: 24.4, t1: 29.2, keys: [[0, [0.6, -1.5, 4.4], [0.2, -2.1, -0.4], 40], [0.5, [0.7, -3.4, 4.0], [0.3, -4.4, -0.6], 40], [1, [0.6, -4.7, 2.9], [0.3, -5.45, -0.8], 38]], hand: 0.005 },
  { id: 'S9', t0: 29.2, t1: 34.35, keys: [[0, [-6.2, -3.3, 6.4], [-3.1, -4.3, -0.8], 40], [1, [-5.0, -3.8, 5.2], [-2.6, -4.7, -0.6], 40]], hand: 0.006 },
  { id: 'S10', t0: 34.35, t1: 37.7, keys: [[0, [0.6, -2.2, 19.5], [0, -2.0, 0], 40], [1, [0.6, -2.6, 17.8], [0, -2.4, 0], 40]], ez: 'lin', hand: 0.004 },
  { id: 'S11', t0: 37.7, t1: 43.1, keys: [[0, [-13.2, -4.0, 8.2], [-13.5, -4.75, 0], 32], [1, [-13.4, -4.4, 6.4], [-13.5, -4.85, 0], 32]], hand: 0.004 },
  { id: 'S12', t0: 43.1, t1: 48.3, keys: [[0, [-11.6, -2.2, 10.2], [-13.5, -4.0, 0], 36], [1, [-12.2, -2.6, 9.2], [-13.5, -4.1, 0], 36]], ez: 'lin', hand: 0.005 },
  { id: 'S13', t0: 48.3, t1: 54.65, keys: [[0, [3.5, -3.1, 3.8], [1.6, -4.5, -2.6], 38], [1, [3.0, -3.5, 3.0], [1.6, -4.6, -2.7], 38]], ez: 'lin', hand: 0.005 },
  { id: 'S14', t0: 54.65, t1: 58.05, keys: [[0, [-8.6, -4.7, 3.9], [-6.9, -5.6, 0.1], 38], [0.45, [-7.4, -4.4, 4.2], [-5.6, -5.6, -0.6], 38], [1, [-2.6, -4.0, 3.1], [-1.8, -5.25, -1.6], 38]], hand: 0.005 },
  { id: 'S15', t0: 58.05, t1: 61.0, keys: [[0, [-1.9, -4.0, 1.9], [-3.4, -5.3, -2.4], 40], [1, [-1.9, -4.3, 1.2], [-3.1, -5.4, -2.4], 40]], ez: 'lin', hand: 0.005 },
  { id: 'S16', t0: 61.0, t1: 65.35, keys: [[0, [8.2, -3.6, 7.0], [4.6, -5.4, -1.6], 40], [1, [5.4, -2.6, 10.5], [1.8, -4.6, -1.0], 40]], hand: 0.006 },
  { id: 'S17', t0: 65.35, t1: 68.05, keys: [[0, [-13.4, -4.4, 6.4], [-13.5, -4.85, 0], 32], [1, [-12.9, -3.4, 9.6], [-13.5, -4.3, 0], 34]], hand: 0.005 },
  { id: 'S18', t0: 68.05, t1: 72, keys: [[0, [10.5, -4.2, 20.5], [0, 0.6, 0], 40], [1, [13.5, -5.4, 26.5], [0, 2.8, 0], 40]], hand: 0.005 },
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': return { cut: 1, cutRange: [1.6, 0] };
    case 'S2': return { cut: 0 };
    case 'S3': return { cut: ss(6.85, 8.6, t), cutRange: [3.5, 0] };
    case 'S18': return { cut: 1 - ss(68.2, 69.7, t), cutRange: [3.5, 0] };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S2') exposure = 0.35 + 0.65 * ss(4.55, 5.35, t);
  return { exposure };
}

export const LABELS = [
  { text: 'MOULD', sub: 'hot plastic inside', anchor: 'part', t0: 0.9, t1: 2.8, dx: 100, dy: -330 },
  { text: 'COOLING CHANNEL', anchor: 'channel', t0: 1.4, t1: 2.8, dx: -120, dy: 300 },
  { text: 'HOT WATER IN', sub: 'from the moulds', anchor: 'riser', t0: 7.8, t1: 9.8, dx: 120, dy: -260 },
  { text: 'SPRAY NOZZLES', anchor: 'nozzle', t0: 10.2, t1: 11.9, dx: 140, dy: -300 },
  { text: 'FILL', sub: 'thin PVC sheets', anchor: 'fill', t0: 11.6, t1: 13.8, dx: 120, dy: -330 },
  { text: 'AIR IN', sub: 'through the louvres', anchor: 'louver', t0: 14.5, t1: 15.9, dx: 60, dy: -260 },
  { text: 'FAN', anchor: 'fan', t0: 14.3, t1: 15.9, dx: 140, dy: 200 },
  { text: 'EVAPORATION', sub: 'heat leaves as vapour', anchor: 'evap', t0: 16.8, t1: 17.85, dx: 80, dy: -330 },
  { text: 'BASIN', anchor: 'basin', t0: 21.3, t1: 22.4, dx: 120, dy: -280 },
  { text: 'TO THE MOULDS', anchor: 'pump', t0: 22.5, t1: 24.3, dx: 80, dy: -300 },
  { text: 'PURE WATER VAPOUR', anchor: 'evap', t0: 25.8, t1: 27.4, dx: 60, dy: -300 },
  { text: 'MINERALS', sub: 'calcium, magnesium, silica', anchor: 'basin', t0: 27.7, t1: 29.15, dx: 80, dy: -320, tone: 'warn' },
  { text: 'DUST', anchor: 'louver', t0: 30.9, t1: 32.4, dx: 120, dy: -280, tone: 'warn' },
  { text: 'ALGAE', anchor: [-2.75, -4.9, -0.6], t0: 33.3, t1: 34.3, dx: 140, dy: 240, tone: 'warn' },
  { text: 'SCALE', sub: 'mineral crust', anchor: 'crust', t0: 39.1, t1: 43.05, dx: 80, dy: -320, tone: 'bad' },
  { text: 'CONDUCTIVITY', sub: 'µS/cm', anchor: 'controller', t0: 50.1, t1: 54.5, dx: -160, dy: 280, tone: 'warn' },
  { text: 'BLEED-OFF VALVE', anchor: 'bleed', t0: 55.0, t1: 56.7, dx: 100, dy: -320 },
  { text: 'FRESH MAKE-UP', anchor: 'makeup', t0: 56.8, t1: 58.0, dx: 80, dy: -300 },
  { text: 'DOSING PUMP', anchor: 'dosing', t0: 58.3, t1: 60.9, dx: 100, dy: -320 },
  { text: 'SIDE-STREAM FILTER', anchor: 'filter', t0: 61.3, t1: 63.3, dx: -120, dy: -300 },
  { text: 'CHANNELS CLEAR', anchor: 'zch', t0: 66.6, t1: 68.0, dx: 80, dy: -320 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
export function hud(t, st) {
  if (t > 20.3 && t < 24.35) {
    return { opacity: ss(20.3, 20.7, t) * (1 - ss(24.0, 24.35, t)), items: [
      { k: 'HOT IN', v: `${st.hotTemp.toFixed(1)} °C`, color: '#ffb38a' },
      { k: 'COOLED BY', v: `${(st.hotTemp - st.coldTemp).toFixed(1)} °C`, big: true, color: '#8fe9ff' },
      { k: 'COLD OUT', v: `${st.coldTemp.toFixed(1)} °C`, color: '#8fe9ff' },
    ] };
  }
  if (t > 34.4 && t < 37.65) {
    return { opacity: ss(34.4, 34.8, t) * (1 - ss(37.35, 37.65, t)), items: [
      { k: 'TIME', v: `WEEK ${st.week}` },
      { k: 'CONDUCTIVITY', v: `${Math.round(st.cond)}`, big: true, color: col(st.cond, 1300, 1800) },
      { k: 'CYCLES', v: `${st.cycles.toFixed(1)}×`, color: col(st.cycles, 5.2, 7.2) },
    ], bar: { k: 'DISSOLVED MINERALS', v: st.minerals, text: `${Math.round(st.minerals * 100)}%`, color: col(st.minerals, 0.5, 0.75) } };
  }
  if (t > 43.3 && t < 48.25) {
    return { opacity: ss(43.3, 43.7, t) * (1 - ss(47.95, 48.25, t)), items: [
      { k: 'MOULD', v: `${st.mouldTemp.toFixed(0)} °C`, color: col(st.mouldTemp, 49, 55) },
      { k: 'CYCLE TIME', v: `${st.cycleTime.toFixed(1)} s`, big: true, color: col(st.cycleTime, 18.8, 20.4) },
      { k: 'SCALE', v: `${(st.scale * 1.0).toFixed(1)} mm`, color: col(st.scale, 0.3, 0.6) },
    ] };
  }
  return null;
}

export const CARDS = [
  { t0: 48.4, t1: 54.6, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Conductivity rising', t: 49.9 },
    { text: 'Cycle times drifting', t: 52.7 },
  ] },
  { t0: 54.75, t1: 68.0, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Bleed off + top up', t: 54.95, done: 57.9 },
    { text: 'Treat the water', t: 58.1, done: 60.9 },
    { text: 'Filter + clean', t: 61.14, done: 64.9 },
    { text: 'Descale mould channels', t: 65.6, done: 67.3 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [];
