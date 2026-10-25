// Heater bands & thermocouples — shots, labels, HUD, cards. Times follow timeline.json.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 77.01;
export const TITLE = { big: 'HEATER BANDS', sub: 'and thermocouples', t0: 6.5, t1: 9.1 };
export const END = { big: 'HEATER BANDS', a: 'Right heat.', b: 'Right melt.', t0: 73.6 };
export const CHAPTERS = [
  { t: 9.2, label: 'HOW IT WORKS' },
  { t: 35.5, label: 'WHAT GOES WRONG' },
  { t: 53.0, label: 'WARNING SIGNS' },
  { t: 60.7, label: 'THE FIX' },
];
const I0 = [40, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (a, b, fa, fb) => [[0, a[0], a[1], fa], [1, b[0], b[1], fb ?? fa]];
export const SHOTS = [
  { id: 'S1', t0: 0, t1: 5.1, keys: k2([[-7.0, 2.6, 9.6], [-5.4, 0.5, 0]], [[1.0, 2.8, 9.2], [2.4, 0.5, 0]], 40) },
  { id: 'S2', t0: 5.1, t1: 6.5, keys: k2([[2.8, 2.2, 5.5], [0.65, 0.9, 0]], [[2.0, 1.8, 4.2], [0.65, 0.9, 0]], 40), ez: 'lin' },
  { id: 'S3', t0: 6.5, t1: 9.2, keys: k2([[7.5, 4.5, 14.0], [-1.5, 1.0, 0]], [[6.5, 4.0, 12.8], [-1.5, 1.0, 0]], 40), ez: 'lin' },
  { id: 'S4', t0: 9.2, t1: 13.8, keys: k2([[-7.8, 3.0, 9.0], [-6.4, 0.6, 0]], [[4.6, 2.8, 9.2], [4.8, 0.4, 0]], 40) },
  { id: 'S5', t0: 13.8, t1: 16.4, keys: k2([[1.8, 0.6, 5.6], [0.65, 0.0, 0]], [[1.5, 0.5, 5.0], [0.65, 0.0, 0]], 38), ez: 'lin' },
  { id: 'S6', t0: 16.4, t1: 20.0, keys: k2([[1.7, 1.8, 2.8], [0.9, 1.2, 0]], [[1.5, 1.6, 2.4], [0.9, 1.15, 0]], 38), ez: 'lin' },
  { id: 'S7', t0: 20.0, t1: 24.7, keys: k2([[1.2, 0.95, 1.15], [0.9, 0.75, 0]], [[1.1, 0.88, 0.92], [0.9, 0.72, 0]], 36), ez: 'lin', headlamp: 2.5 },
  { id: 'S8', t0: 24.7, t1: 29.4, keys: k2([[2.0, 3.0, 7.2], [0.7, 2.6, -1.2]], [[1.6, 3.1, 6.6], [0.7, 2.7, -1.2]], 40), ez: 'lin' },
  { id: 'S9', t0: 29.4, t1: 35.5, keys: k2([[-3.6, 1.4, 5.2], [-3.2, 0.0, 0]], [[-0.2, 1.3, 5.0], [0.0, 0.0, 0]], 40) },
  { id: 'S10', t0: 35.5, t1: 38.6, keys: k2([[-0.8, 2.1, 5.4], [-1.95, 0.7, 0]], [[-1.1, 1.9, 4.8], [-1.95, 0.7, 0]], 40), ez: 'lin' },
  { id: 'S11', t0: 38.6, t1: 42.0, keys: k2([[1.4, 1.9, 3.2], [0.6, 1.0, 0]], [[1.25, 1.75, 2.8], [0.6, 1.0, 0]], 38), ez: 'lin' },
  { id: 'S12', t0: 42.0, t1: 44.6, keys: k2([[1.8, 2.0, -4.2], [0.75, 0.8, -1.4]], [[1.6, 1.9, -3.6], [0.75, 0.85, -1.4]], 38), ez: 'lin' },
  { id: 'S13', t0: 44.6, t1: 48.3, keys: k2([[4.2, 1.4, 2.5], [3.5, 0.95, 0]], [[4.0, 1.3, 2.1], [3.5, 0.95, 0]], 36), ez: 'lin' },
  { id: 'S14', t0: 48.3, t1: 52.9, keys: k2([[5.6, 2.6, 7.0], [2.8, 1.2, -0.6]], [[5.2, 2.5, 6.4], [2.9, 1.2, -0.6]], 40), ez: 'lin' },
  { id: 'S15a', t0: 52.9, t1: 55.6, keys: k2([[5.6, 3.7, 6.9], [-2.0, 0.4, 0]], [[5.0, 3.4, 6.2], [-2.0, 0.4, 0]], 40), ez: 'lin' },
  { id: 'S15b', t0: 55.6, t1: 57.9, keys: k2([[1.1, 4.5, 5.8], [0.7, 4.3, -2.3]], [[0.95, 4.45, 5.0], [0.7, 4.3, -2.3]], 36), ez: 'lin' },
  { id: 'S15c', t0: 57.9, t1: 60.7, keys: k2([[4.0, 3.2, 9.0], [0.0, 1.0, 0]], [[3.4, 3.0, 8.4], [0.0, 1.0, 0]], 40), ez: 'lin' },
  { id: 'S16', t0: 60.7, t1: 63.6, keys: k2([at(I0, [0.9, 1.0, 6.2]), at(I0, [0, 0.3, 0])], [at(I0, [0.6, 0.9, 5.4]), at(I0, [0, 0.3, 0])], 38), ez: 'lin' },
  { id: 'S17a', t0: 63.6, t1: 65.75, keys: k2([[-3.4, 2.1, -4.6], [-4.45, 1.0, -1.7]], [[-3.6, 2.0, -4.1], [-4.45, 1.0, -1.7]], 38), ez: 'lin' },
  { id: 'S17b', t0: 65.75, t1: 67.75, keys: k2([[-5.6, 2.3, -4.8], [-4.3, 1.4, -2.2]], [[-5.3, 2.2, -4.3], [-4.3, 1.4, -2.2]], 38), ez: 'lin' },
  { id: 'S18', t0: 67.75, t1: 70.0, keys: k2([[1.4, 1.9, 3.2], [0.6, 1.0, 0]], [[1.3, 1.8, 2.9], [0.6, 1.0, 0]], 38), ez: 'lin' },
  { id: 'S19', t0: 70.0, t1: 73.6, keys: k2([[4.2, 1.4, 2.5], [3.5, 0.95, 0]], [[4.0, 1.3, 2.1], [3.5, 0.95, 0]], 36), ez: 'lin' },
  { id: 'S20', t0: 73.6, t1: 78, keys: k2([[6.5, 3.8, 13.0], [-1.0, 1.0, 0]], [[8.5, 5.0, 17.0], [-1.0, 1.6, 0]], 40) },
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S15a': return { cut: 0, thermal: 1 };
    case 'S1': case 'S2': case 'S3': case 'S15c': case 'S16': case 'S17a': case 'S17b': case 'S12': return { cut: 0 };
    case 'S4': return { cut: ss(9.4, 10.6, t) };
    case 'S9': return { cut: 1, shear: 1 };
    case 'S20': return { cut: 1 - ss(74.0, 75.6, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(6.5, 7.2, t);
  return { exposure };
}

export const LABELS = [
  { text: 'FEED THROAT', anchor: 'feed', t0: 10.6, t1: 13.7, dx: 60, dy: -300 },
  { text: 'NOZZLE', anchor: 'nozzle', t0: 12.4, t1: 13.7, dx: -80, dy: -300 },
  { text: 'HEATER BAND', anchor: 'band3', t0: 14.1, t1: 16.35, dx: -60, dy: -330 },
  { text: 'HEATING COIL', sub: 'in mica insulation', anchor: 'coil3', t0: 14.9, t1: 16.35, dx: 80, dy: -250 },
  { text: 'CLAMP', anchor: 'clamp3', t0: 15.4, t1: 16.35, dx: 80, dy: 240 },
  { text: 'THERMOCOUPLE', anchor: 'tc3cap', t0: 16.7, t1: 19.95, dx: -80, dy: -280 },
  { text: 'TWO METALS', anchor: 'tc3wires', t0: 17.9, t1: 19.95, dx: 100, dy: -200 },
  { text: 'JUNCTION', anchor: 'tc3bead', t0: 19.0, t1: 24.6, dx: 100, dy: 260 },
  { text: 'CONTROLLER', anchor: 'controller', t0: 25.0, t1: 29.35, dx: -40, dy: -240 },
  { text: 'HEATER', sub: 'switched on and off', anchor: 'band3', t0: 26.8, t1: 29.35, dx: 60, dy: 320 },
  { text: 'SHEAR HEAT', sub: 'from the turning screw', anchor: 'channel', t0: 30.6, t1: 35.4, dx: 60, dy: -320 },
  { text: 'BURNT OUT', anchor: 'band2', t0: 36.7, t1: 38.55, dx: 80, dy: -330, tone: 'bad' },
  { text: 'AIR GAP', anchor: 'gap3', t0: 39.2, t1: 41.95, dx: -80, dy: -300, tone: 'warn' },
  { text: 'OVERHEATING', anchor: 'band3', t0: 40.0, t1: 41.95, dx: 80, dy: 300, tone: 'bad' },
  { text: 'LOOSE TERMINAL', anchor: 'terminal3', t0: 42.4, t1: 44.55, dx: -60, dy: -320, tone: 'bad' },
  { text: 'COOKED WIRING', anchor: 'lead3', t0: 43.2, t1: 44.55, dx: 80, dy: 300, tone: 'bad' },
  { text: 'BACKED OUT', sub: 'tip off the bottom', anchor: 'tc4bead', t0: 45.5, t1: 48.25, dx: 80, dy: 280, tone: 'bad' },
  { text: 'FAR TOO HOT', anchor: 'band4', t0: 50.0, t1: 52.85, dx: -60, dy: 320, tone: 'bad' },
  { text: 'ZONE 2', sub: 'dead band', anchor: 'band2', t0: 53.5, t1: 55.55, dx: 80, dy: -320, tone: 'bad' },
  { text: 'OUTPUT 100%', anchor: 'screen', t0: 56.0, t1: 57.85, dx: -40, dy: 300, tone: 'bad' },
  { text: 'ISOLATE', anchor: 'isoHandle', t0: 61.0, t1: 63.55, dx: 80, dy: -300 },
  { text: 'LOCK + TAG', anchor: 'padlock', t0: 62.6, t1: 63.55, dx: -80, dy: 300 },
  { text: 'TIGHT', anchor: 'gap3', t0: 68.9, t1: 69.95, dx: -80, dy: -300 },
  { text: 'FULLY SEATED', anchor: 'tc4bead', t0: 71.3, t1: 73.5, dx: 80, dy: 280 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
const SWING = [225, 231, 219, 234, 216, 236, 214, 233, 217, 235];
export function hud(t, st) {
  const fade = (a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
  if (t > 0.6 && t < 5.0) return { opacity: fade(0.6, 5.0), items: [0, 1, 2, 3].map((k) => ({ k: `ZONE ${k + 1}`, v: `${(([200, 215, 225, 230])[k] + 0.3 * Math.sin(t * 1.3 + k * 2)).toFixed(1)}°`, color: '#ffb38a' })) };
  if (t > 9.9 && t < 13.75) return { opacity: fade(9.9, 13.75), items: [0, 1, 2, 3].map((k) => ({ k: `ZONE ${k + 1} SET`, v: `${[200, 215, 225, 230][k]}°C`, big: k === 3 })) };
  if (t > 20.3 && t < 24.65) return { opacity: fade(20.3, 24.65), items: [
    { k: 'JUNCTION', v: `${st.tcT.toFixed(0)} °C`, color: '#ffb38a' },
    { k: 'VOLTAGE', v: `${st.mv.toFixed(2)} mV`, big: true, color: '#8fe9ff' },
  ] };
  if (t > 30.6 && t < 35.4) return { opacity: fade(30.6, 35.4), items: [{ k: 'MELTING HEAT', v: 'MOSTLY THE SCREW', big: true, color: '#ffb38a' }],
    bar: { k: 'HEAT FROM SCREW SHEAR', v: 0.7, text: '≈ 70%', color: '#ffb35c' } };
  if (t > 45.4 && t < 48.25) return { opacity: fade(45.4, 48.25), items: [{ k: 'ZONE 4 READS', v: `${st.read4.toFixed(0)} °C`, big: true, color: col(230 - st.read4, 10, 30) }, { k: 'SET', v: '230 °C' }] };
  if (t > 48.6 && t < 52.85) return { opacity: fade(48.6, 52.85), items: [
    { k: 'READS', v: `${st.read4.toFixed(0)}°`, color: '#ffb35c' },
    { k: 'ACTUAL', v: `${st.act4.toFixed(0)}°`, big: true, color: col(st.act4, 240, 260) },
    { k: 'OUTPUT', v: '100%', color: '#ff5a4e' },
  ] };
  if (t > 53.4 && t < 55.55) return { opacity: fade(53.4, 55.55), pos: 'mid', items: [{ k: 'ZONE 2', v: `${st.ctrl.pv.toFixed(0)}°`, big: true, color: '#ff5a4e' }, { k: 'SET', v: '215°' }] };
  if (t > 58.1 && t < 60.6) {
    const n = Math.max(2, Math.min(SWING.length, Math.round(2 + (t - 58.1) * 4)));
    return { opacity: fade(58.1, 60.6), pos: 'mid', items: [{ k: 'ZONE 3 · LAST 10 MIN', v: '' }], spark: { values: SWING, n, lo: 205, hi: 245, color: '#ff5a4e', band: [222, 228], unit: '°' } };
  }
  if (t > 64.0 && t < 65.7) return { opacity: fade(64.0, 65.7), pos: 'mid', items: [{ k: 'RESISTANCE', v: '44.1 Ω', big: true, color: '#6ff0b0' }, { k: 'EXPECTED', v: '≈ 44 Ω' }] };
  if (t > 66.1 && t < 67.7) return { opacity: fade(66.1, 67.7), pos: 'mid', items: [{ k: 'CURRENT', v: '5.2 A', big: true, color: '#6ff0b0' }, { k: 'EXPECTED', v: '≈ 5.2 A' }] };
  if (t > 71.3 && t < 73.5) return { opacity: fade(71.3, 73.5), pos: 'mid', items: [{ k: 'ZONE 4 READS', v: `${st.read4.toFixed(0)} °C`, big: true, color: '#6ff0b0' }, { k: 'SET', v: '230 °C' }] };
  return null;
}

export const CARDS = [
  { t0: 53.0, t1: 60.6, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: "Zone won't reach setpoint", t: 54.3 },
    { text: 'Output stuck at 100%', t: 55.9 },
    { text: 'A zone that swings', t: 58.2 },
  ] },
  { t0: 60.8, t1: 73.5, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Lock out + isolate first', t: 60.9, done: 63.4 },
    { text: 'Check resistance or current', t: 63.7, done: 67.5 },
    { text: 'Bands tight, terminals clean', t: 67.9, done: 69.9 },
    { text: 'Thermocouples fully seated', t: 70.2, done: 72.8 },
  ] },
];
export const SHAKES = [{ t: 36.3, a: 0.03, d: 0.15 }];
export const FLASHES = [{ t: 36.3, a: 0.25, d: 0.12 }, { t: 42.35, a: 0.15, d: 0.1 }];
