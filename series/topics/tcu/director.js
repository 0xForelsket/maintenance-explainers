// TCU — shots, labels, HUD, cards. Times follow timeline.json (George narration).
import { stateAt } from './story.js';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 87.46;
export const TITLE = { big: 'TCU', sub: 'mould temperature controller', t0: 7.0, t1: 10.05 };
export const END = { big: 'TCU', a: 'Steady steel.', b: 'Steady parts.', t0: 84.9 };
export const CHAPTERS = [
  { t: 10.15, label: 'HOW IT WORKS' },
  { t: 39.54, label: 'WHAT GOES WRONG' },
  { t: 57.23, label: 'WARNING SIGNS' },
  { t: 64.96, label: 'THE FIX' },
];
const k2 = (t0, t1, id, p0, g0, p1, g1, fov = 38, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, fov], [1, p1, g1, fov]], ez: 'lin', ...extra });
const DISP = [[-7.5, 1.45, 4.6], [-7.5, -0.72, 0.62], [-7.48, 1.15, 4.1], [-7.5, -0.72, 0.62]];
export const SHOTS = [
  k2(0, 5.32, 'S1', [0.0, 0.5, 9.0], [-0.4, 0.0, 0], [-0.3, 0.3, 7.8], [-0.4, 0.0, 0], 40),
  k2(5.32, 6.96, 'S2', [-2.4, 2.2, 21.0], [-3.8, -0.8, 0], [-2.8, 1.8, 19.5], [-3.8, -0.9, 0], 40),
  k2(6.96, 10.15, 'S3', [-5.2, -0.8, 7.0], [-7.1, -2.6, 0], [-5.6, -1.1, 6.2], [-7.1, -2.7, 0], 38),
  k2(10.15, 16.25, 'S4', [-6.4, -2.0, 7.4], [-7.1, -2.9, 0], [-6.6, -2.3, 6.6], [-7.1, -2.9, 0], 40),
  { id: 'S5', t0: 16.25, t1: 24.0, keys: [[0, [-5.6, -1.7, 3.6], [-6.0, -1.8, 0], 40], [0.35, [-3.6, 2.2, 7.5], [-3.2, 2.0, 0], 40], [0.7, [-0.6, 0.6, 8.2], [-0.5, 0.2, 0], 40], [1, [-2.8, 0.0, 11.0], [-4.2, -1.5, 0], 40]] },
  k2(24.0, 26.98, 'S6', [-5.95, -1.25, 2.3], [-6.45, -1.75, 0], [-6.05, -1.35, 1.9], [-6.45, -1.75, 0], 36),
  k2(26.98, 29.39, 'S7', [-6.6, -2.3, 2.9], [-7.2, -2.7, 0], [-6.7, -2.35, 2.5], [-7.2, -2.7, 0], 38),
  k2(29.39, 34.6, 'S8', [-7.3, -1.8, 3.4], [-7.8, -2.6, 0], [-7.4, -1.9, 3.0], [-7.8, -2.6, 0], 38),
  k2(34.6, 39.54, 'S9', ...DISP, 34),
  k2(39.54, 41.71, 'S10', [-6.85, -2.55, 1.35], [-7.2, -2.65, 0], [-6.9, -2.6, 1.15], [-7.2, -2.65, 0], 36, { headlamp: 2 }),
  k2(41.71, 46.31, 'S11', [-6.65, -2.4, 2.0], [-7.2, -2.7, 0], [-6.75, -2.45, 1.7], [-7.2, -2.7, 0], 38),
  k2(46.31, 48.4, 'S12a', [-7.4, -1.9, 2.2], [-7.95, -2.25, 0], [-7.5, -1.95, 1.9], [-7.95, -2.25, 0], 36),
  k2(48.4, 50.6, 'S12b', [0.0, 0.4, 8.6], [-0.4, 0.0, 0], [-0.2, 0.3, 7.8], [-0.4, 0.0, 0], 40),
  k2(50.6, 53.19, 'S12c', [-0.9, 0.6, 8.6], [-0.5, 0.0, 0], [-0.7, 0.4, 7.8], [-0.5, 0.0, 0], 40),
  k2(53.19, 55.0, 'S13a', [-6.6, -3.4, 2.9], [-7.0, -4.1, 0], [-6.7, -3.5, 2.5], [-7.0, -4.1, 0], 38),
  { id: 'S13b', t0: 55.0, t1: 57.23, cam: (t, p, S) => { const c = S.anchors.crack; return { pos: [c.x + 1.4 - 0.3 * p, c.y + 0.7, c.z + 3.2 - 0.5 * p], tgt: [c.x, c.y + 0.35, c.z], fov: 38 }; } },
  k2(57.23, 60.2, 'S14a', [-5.4, -0.4, 6.0], [-7.0, -1.8, 0], [-5.6, -0.6, 5.4], [-7.0, -1.8, 0], 38),
  k2(60.2, 62.4, 'S14b', ...DISP, 34),
  k2(62.4, 64.96, 'S14c', [-4.3, -2.3, 7.2], [-6.9, -3.9, 1.0], [-4.6, -2.5, 6.6], [-6.9, -3.9, 1.0], 38),
  k2(64.96, 67.5, 'S15a', [-6.65, -2.4, 2.0], [-7.2, -2.7, 0], [-6.75, -2.45, 1.7], [-7.2, -2.7, 0], 38),
  k2(67.5, 70.36, 'S15b', [-0.6, 1.4, 6.0], [-0.5, 0.6, 0], [-0.5, 1.2, 5.3], [-0.5, 0.6, 0], 38),
  k2(70.36, 72.4, 'S16a', [-5.6, -3.4, 2.6], [-6.6, -4.1, 0.4], [-5.7, -3.5, 2.3], [-6.6, -4.1, 0.4], 38),
  k2(72.4, 74.6, 'S16b', [-7.4, -1.9, 2.2], [-7.95, -2.25, 0], [-7.5, -1.95, 1.9], [-7.95, -2.25, 0], 36),
  { id: 'S17a', t0: 74.6, t1: 76.5, cam: (t, p, S) => { const c = S.anchors.sweep; return { pos: [c.x + 1.2, c.y + 1.0, c.z + 3.4], tgt: [c.x, c.y, c.z], fov: 40 }; } },
  k2(76.5, 78.5, 'S17b', ...DISP, 34),
  k2(78.5, 84.88, 'S18', [-5.8, -0.3, 4.6], [-6.9, -1.4, 0.3], [-6.0, -0.4, 4.0], [-6.9, -1.4, 0.3], 38),
  k2(84.88, 88, 'S19', [2.0, 2.0, 15.0], [-3.5, -0.8, 0], [4.0, 3.2, 20.0], [-3.5, -0.4, 0], 40, { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': case 'S12b': case 'S12c': return { cut: 1, thermal: 1 };
    case 'S2': case 'S3': case 'S14a': case 'S14c': case 'S18': return { cut: 0 };
    case 'S4': return { cut: ss(10.2, 11.2, t) };
    case 'S5': return { cut: 1, thermal: ss(20.0, 20.8, t) * (1 - ss(22.6, 23.2, t)) };
    case 'S19': return { cut: 1 - ss(85.4, 86.8, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(6.96, 7.6, t);
  return { exposure };
}

export const LABELS = [
  { text: 'HOT PART', anchor: 'part', t0: 1.4, t1: 5.2, dx: 60, dy: -300 },
  { text: 'MOULD STEEL', anchor: 'aPlate', t0: 2.4, t1: 5.2, dx: -60, dy: -280 },
  { text: 'TCU', anchor: 'cabinet', t0: 5.6, t1: 6.9, dx: 60, dy: -260 },
  { text: 'MOULD', anchor: 'bPlate', t0: 5.8, t1: 6.9, dx: -40, dy: -260 },
  { text: 'PUMP', anchor: 'pump', t0: 11.0, t1: 16.2, dx: 80, dy: 280 },
  { text: 'HEATER', anchor: 'heater', t0: 12.5, t1: 16.2, dx: 100, dy: -240 },
  { text: 'COOLING VALVE', anchor: 'valve', t0: 13.8, t1: 16.2, dx: -40, dy: -300 },
  { text: 'TO + FROM THE MOULD', anchor: 'supplyPort', t0: 14.8, t1: 16.2, dx: 60, dy: 300 },
  { text: 'TO THE MOULD', anchor: 'supplyHose', t0: 16.8, t1: 19.0, dx: 60, dy: -260 },
  { text: 'COOLING CHANNELS', anchor: 'A1', t0: 20.2, t1: 22.4, dx: -60, dy: -300 },
  { text: 'HEAT FROM THE PART', anchor: 'part', t0: 20.9, t1: 22.6, dx: 60, dy: 300 },
  { text: 'BACK TO THE UNIT', anchor: 'returnHose', t0: 22.8, t1: 23.95, dx: 60, dy: -260 },
  { text: 'SENSOR', anchor: 'sensor', t0: 24.3, t1: 26.9, dx: -60, dy: -280 },
  { text: 'HEATER ON', anchor: 'coil', t0: 27.3, t1: 29.35, dx: 80, dy: -280 },
  { text: 'COOLING VALVE OPEN', anchor: 'plunger', t0: 30.2, t1: 34.5, dx: 60, dy: -300 },
  { text: 'TOWER WATER', anchor: 'towerIn', t0: 31.0, t1: 34.5, dx: 60, dy: 280 },
  { text: 'HARD WATER', sub: 'dissolved minerals', anchor: 'heater', t0: 39.9, t1: 41.65, dx: -80, dy: -300, tone: 'warn' },
  { text: 'SCALE', anchor: 'coil', t0: 42.6, t1: 45.2, dx: 80, dy: -280, tone: 'warn' },
  { text: 'BURNT OUT', anchor: 'coil', t0: 45.5, t1: 46.25, dx: 80, dy: -280, tone: 'bad' },
  { text: 'STUCK SHUT', anchor: 'plunger', t0: 46.8, t1: 48.35, dx: 60, dy: -300, tone: 'bad' },
  { text: 'OVERHEATING', anchor: 'part', t0: 48.7, t1: 50.55, dx: 60, dy: -300, tone: 'bad' },
  { text: 'STUCK OPEN · TOO COLD', anchor: 'part', t0: 50.9, t1: 53.1, dx: 60, dy: -300, tone: 'bad' },
  { text: 'SEAL LEAK', anchor: 'seal', t0: 53.4, t1: 54.95, dx: 80, dy: -280, tone: 'bad' },
  { text: 'CRACKED HOSE', anchor: 'crack', t0: 55.3, t1: 57.15, dx: 60, dy: -300, tone: 'bad' },
  { text: 'PRESSURE ALARM', anchor: 'display', t0: 60.5, t1: 62.35, dx: 40, dy: 300, tone: 'bad' },
  { text: 'WATER UNDER THE UNIT', anchor: 'puddle', t0: 62.7, t1: 64.9, dx: -60, dy: -300, tone: 'bad' },
  { text: 'DESCALED', anchor: 'coil', t0: 66.4, t1: 67.45, dx: 80, dy: -280 },
  { text: 'CHANNELS CLEAR', anchor: 'A1', t0: 68.9, t1: 70.3, dx: -60, dy: -300 },
  { text: 'STRAINER', anchor: 'strainer', t0: 70.6, t1: 72.35, dx: 60, dy: -280 },
  { text: 'OPENS + CLOSES', anchor: 'plunger', t0: 72.7, t1: 74.55, dx: 60, dy: -300 },
  { text: 'CHECK EVERY HOSE', anchor: 'sweep', t0: 74.9, t1: 76.45, dx: 60, dy: -280 },
  { text: 'OVER-TEMP CUT-OUT', anchor: 'display', t0: 76.8, t1: 78.45, dx: 40, dy: 300 },
  { text: 'HOT WATER UNDER PRESSURE', sub: 'cool down first', anchor: 'gauge', t0: 80.2, t1: 84.8, dx: -40, dy: -300, tone: 'warn' },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
const spark = (t, span, n) => { const v = []; for (let i = n - 1; i >= 0; i--) v.push(+stateAt(t - (i / (n - 1)) * span).water.toFixed(1)); return v; };
export function hud(t, st) {
  if (t > 0.8 && t < 5.2) return { opacity: fade(t, 0.8, 5.2), items: [{ k: 'MOULD STEEL', v: `${st.mouldTemp.toFixed(1)} °C`, big: true, color: '#ffb35c' }, { k: 'WATER', v: `${st.water.toFixed(1)} °C` }] };
  if (t > 24.3 && t < 34.5) return { opacity: fade(t, 24.3, 34.5), items: [
    { k: 'WATER OUT', v: `${st.water.toFixed(1)} °C`, big: true, color: col(Math.abs(st.water - 60), 1, 2.5) },
    { k: 'HEATER', v: st.heater ? 'ON' : 'OFF', color: st.heater ? '#ff8a3c' : '#8a9aa6' },
    { k: 'COOLING', v: st.valve ? 'OPEN' : 'SHUT', color: st.valve ? '#6fd8ff' : '#8a9aa6' },
  ] };
  if (t > 34.9 && t < 39.4) return { opacity: fade(t, 34.9, 39.4), pos: 'mid', items: [{ k: 'WATER OUT · LAST 60 S', v: '' }], spark: { values: spark(t, 6, 16), n: 16, lo: 56, hi: 64, color: '#6ff0b0', band: [59, 61], unit: '°' } };
  if (t > 46.6 && t < 53.1) return { opacity: fade(t, 46.6, 53.1), items: [{ k: 'WATER OUT', v: `${st.water.toFixed(1)} °C`, big: true, color: col(Math.abs(st.water - 60), 1.5, 4) }, { k: 'SET', v: '60.0 °C' }] };
  if (t > 57.4 && t < 60.15) return { opacity: fade(t, 57.4, 60.15), pos: 'mid', items: [{ k: 'WATER OUT · SWINGING', v: '' }], spark: { values: spark(t, 2.8, 16), n: 16, lo: 52, hi: 68, color: '#ff5a4e', band: [59, 61], unit: '°' } };
  if (t > 79.0 && t < 84.8) return { opacity: fade(t, 79.0, 84.8), pos: 'mid', items: [{ k: 'WATER', v: `${st.water.toFixed(0)} °C`, big: true, color: col(st.water, 40, 50) }, { k: 'PRESSURE', v: `${st.pressure.toFixed(1)} bar`, color: st.pressure < 0.2 ? '#6ff0b0' : '#ffb35c' }] };
  return null;
}

export const CARDS = [
  { t0: 57.3, t1: 64.9, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Temperature swings or overshoots', t: 58.4 },
    { text: 'Slow heat-up', t: 60.8 },
    { text: 'Pressure alarms', t: 61.9 },
    { text: 'Water under the unit', t: 63.2 },
  ] },
  { t0: 65.0, t1: 84.8, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Treated water · descale on a schedule', t: 65.1, done: 70.0 },
    { text: 'Clean strainer · test cooling valve', t: 70.4, done: 74.4 },
    { text: 'Inspect hoses · test over-temp cut-out', t: 74.7, done: 78.3 },
    { text: 'Cool down + depressurise before opening', t: 78.6, done: 84.3 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [{ t: 45.32, a: 0.2, d: 0.12 }];
