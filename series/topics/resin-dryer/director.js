// Desiccant resin dryer — shots, labels, HUD, cards. Times follow timeline.json (George narration).
import { stateAt, LEVEL_FULL } from './story.js';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const TOTAL = 82.32;
export const TITLE = { big: 'RESIN DRYER', sub: 'desiccant drying, step by step', t0: 7.4, t1: 10.2 };
export const END = { big: 'RESIN DRYER', a: 'Dry resin.', b: 'Strong parts.', t0: 79.75 };
export const CHAPTERS = [
  { t: 10.3, label: 'HOW IT WORKS' },
  { t: 38.1, label: 'WHAT GOES WRONG' },
  { t: 58.35, label: 'WARNING SIGNS' },
  { t: 65.9, label: 'THE FIX' },
];
const P = [40, 0, 0], Q = [60, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, fov = 38, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, fov], [1, p1, g1, fov]], ez: 'lin', ...extra });
const DISP0 = [-4.6, 2.95, 4.4], DISP1 = [-4.7, 2.8, 3.85], DISPT = [-4.9, 1.95, 0.6];
const LEAKC = [[-2.55, 2.95, 2.7], [-3.75, 2.1, 0.1], [-2.7, 2.8, 2.3]];
const HOPC = [[1.9, 2.7, 7.6], [0.0, 2.2, 0], [1.6, 2.5, 6.9]];
export const SHOTS = [
  k2('S1a', 0, 2.9, at(P, [1.6, 1.5, 4.0]), at(P, [0, -0.1, 0]), at(P, [1.2, 1.25, 3.4]), at(P, [0, -0.1, 0]), 40),
  k2('S1b', 2.9, 5.3, at(Q, [1.7, 2.3, 3.5]), at(Q, [0, 0, 0]), at(Q, [1.35, 2.05, 3.0]), at(Q, [0, 0, 0]), 40),
  k2('S2', 5.3, 7.4, [-1.0, 2.6, 21.0], [-2.5, 1.2, 0], [-1.4, 2.4, 19.6], [-2.5, 1.2, 0], 40),
  k2('S3', 7.4, 10.3, [4.6, 3.6, 15.0], [-2.4, 1.2, 0], [3.8, 3.1, 13.6], [-2.4, 1.2, 0], 40),
  k2('S4', 10.3, 13.5, [2.0, 3.0, 8.4], [-0.1, 2.3, 0], [1.6, 2.7, 7.6], [-0.1, 2.3, 0], 40),
  k2('S5a', 13.5, 16.4, [1.0, 1.95, 4.4], [0.0, 1.35, -0.4], [0.8, 1.75, 3.9], [0.0, 1.35, -0.4], 40),
  k2('S5b', 16.4, 20.1, [0.9, 3.95, 5.8], [0.0, 3.2, -0.3], [0.75, 3.7, 5.1], [0.0, 3.2, -0.3], 40),
  { id: 'S6', t0: 20.1, t1: 24.1, keys: [[0, [-1.4, 4.2, 8.2], [-2.6, 3.3, 0], 40], [1, [-2.8, 0.4, 4.6], [-3.8, -0.25, 0], 40]], ez: 'ease' },
  k2('S7', 24.1, 27.5, [-4.7, 0.05, 3.4], [-5.5, -0.4, 0], [-4.85, -0.1, 3.0], [-5.5, -0.4, 0], 38),
  k2('S8', 27.5, 33.4, [-4.0, 0.1, 6.8], [-5.15, -0.6, 0], [-4.25, -0.05, 6.1], [-5.15, -0.6, 0], 38),
  k2('S9', 33.4, 38.1, DISP0, DISPT, DISP1, DISPT, 38),
  k2('S10', 38.1, 41.0, [0.0, 3.2, 19.5], [-2.6, 1.0, 0], [-0.6, 2.9, 17.8], [-2.6, 1.0, 0], 40),
  k2('S11', 41.0, 44.1, [-3.0, 0.9, 3.0], [-3.8, 0.1, 0], [-3.1, 0.8, 2.6], [-3.8, 0.1, 0], 38),
  k2('S12', 44.1, 48.4, [-4.2, -0.5, 6.0], [-5.2, -0.9, 0], [-4.45, -0.65, 5.4], [-5.2, -0.9, 0], 38),
  k2('S13a', 48.4, 51.0, LEAKC[0], LEAKC[1], LEAKC[2], LEAKC[1], 38),
  k2('S13b', 51.0, 54.1, HOPC[0], HOPC[1], HOPC[2], HOPC[1], 40),
  k2('S14', 54.1, 58.3, at(Q, [1.4, 2.4, 3.6]), at(Q, [0, 0, 0]), at(Q, [1.1, 2.1, 3.1]), at(Q, [0, 0, 0]), 40),
  k2('S15a', 58.3, 61.0, DISP0, DISPT, DISP1, DISPT, 38),
  k2('S15b', 61.0, 62.3, at(Q, [-0.1, 1.35, 1.7]), at(Q, [-0.5, 0.1, 0]), at(Q, [-0.25, 1.2, 1.45]), at(Q, [-0.5, 0.1, 0]), 38),
  k2('S15c', 62.3, 65.9, [1.1, 5.7, 4.6], [-0.6, 4.6, 0], [0.85, 5.45, 4.0], [-0.6, 4.6, 0], 40),
  k2('S16', 65.9, 68.5, [-2.5, 1.7, 4.4], [-3.5, 0.9, 0.5], [-2.65, 1.55, 3.9], [-3.5, 0.9, 0.5], 38),
  k2('S17a', 68.5, 70.6, DISP0, DISPT, DISP1, DISPT, 38),
  k2('S17b', 70.6, 74.1, [2.1, 3.6, 8.3], [-0.1, 2.9, 0], [1.75, 3.35, 7.6], [-0.1, 2.9, 0], 40),
  k2('S18a', 74.1, 76.0, HOPC[0], HOPC[1], HOPC[2], HOPC[1], 40),
  k2('S18b', 76.0, 77.6, LEAKC[0], LEAKC[1], LEAKC[2], LEAKC[1], 38),
  k2('S18c', 77.6, 79.75, [-4.85, 0.15, 3.1], [-5.5, -0.35, 0], [-4.95, 0.0, 2.75], [-5.5, -0.35, 0], 38),
  k2('S19', 79.75, 84, [0.0, 2.6, 16.0], [-2.5, 1.2, 0], [2.0, 3.6, 21.0], [-2.5, 1.4, 0], 40, { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1b': return { cut: 1, defects: 1 };
    case 'S2': case 'S3': return { cut: 0 };
    case 'S4': return { cut: ss(10.5, 11.8, t) };
    case 'S19': return { cut: 1 - ss(80.3, 81.8, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.35 + 0.65 * ss(7.4, 8.1, t);
  return { exposure };
}

export const LABELS = [
  { text: 'HUMID AIR', anchor: 'pelRig', t0: 0.9, t1: 2.85, dx: -60, dy: -320 },
  { text: 'SPLAY', anchor: 'splay', t0: 3.4, t1: 5.25, dx: -60, dy: -300, tone: 'bad' },
  { text: 'BUBBLES', anchor: 'bubbles', t0: 3.9, t1: 5.25, dx: 60, dy: 300, tone: 'bad' },
  { text: 'DRYING HOPPER', anchor: 'hopper', t0: 5.6, t1: 7.35, dx: 40, dy: -300 },
  { text: 'DRYER', anchor: 'cabinet', t0: 5.9, t1: 7.35, dx: -40, dy: 300 },
  { text: 'PELLETS', anchor: 'pellets', t0: 11.7, t1: 13.45, dx: 60, dy: -300 },
  { text: 'HOT, DRY AIR IN', anchor: 'diffuser', t0: 13.9, t1: 16.35, dx: 60, dy: 300 },
  { text: 'DIFFUSER CONE', sub: 'spreads the air', anchor: 'diffuser', t0: 14.7, t1: 16.35, dx: -60, dy: -300 },
  { text: 'MOISTURE OUT', anchor: 'pellets', t0: 17.0, t1: 20.05, dx: 60, dy: -320 },
  { text: 'WET AIR BACK', anchor: 'returnHose', t0: 20.5, t1: 22.2, dx: -40, dy: -300 },
  { text: 'FILTER', anchor: 'filter', t0: 22.2, t1: 24.05, dx: 60, dy: -300 },
  { text: 'COOLER', anchor: 'cooler', t0: 23.0, t1: 24.05, dx: 60, dy: 300 },
  { text: 'DESICCANT', sub: 'soaks up the water', anchor: 'towerA', t0: 24.6, t1: 27.45, dx: 60, dy: -320 },
  { text: 'DRYING THE AIR', anchor: 'towerA', t0: 29.3, t1: 32.4, dx: -60, dy: -320 },
  { text: 'REGENERATING', sub: 'heated, water driven out', anchor: 'towerB', t0: 30.4, t1: 32.4, dx: 60, dy: 320, tone: 'warn' },
  { text: 'SWAP', anchor: 'towerB', t0: 32.6, t1: 33.35, dx: 60, dy: -300 },
  { text: 'CLOGGED FILTER', anchor: 'filter', t0: 41.6, t1: 44.05, dx: 60, dy: -300, tone: 'bad' },
  { text: 'REGEN HEATER DEAD', anchor: 'regenHeater', t0: 44.6, t1: 46.3, dx: 60, dy: 300, tone: 'bad' },
  { text: 'SATURATED', sub: 'both beds wet', anchor: 'towerB', t0: 46.4, t1: 48.35, dx: 60, dy: -320, tone: 'bad' },
  { text: 'LEAKY JOINT', sub: 'sucks in wet air', anchor: 'leak', t0: 48.9, t1: 50.95, dx: 60, dy: -300, tone: 'bad' },
  { text: 'LOW LEVEL', anchor: 'level', t0: 51.6, t1: 54.05, dx: -80, dy: -300, tone: 'bad' },
  { text: 'SPLAY', sub: 'silver streaks', anchor: 'splay', t0: 54.9, t1: 58.25, dx: -60, dy: -320, tone: 'bad' },
  { text: 'BUBBLES', anchor: 'bubbles', t0: 55.8, t1: 58.25, dx: 60, dy: 300, tone: 'bad' },
  { text: 'BRITTLE', anchor: 'crackPart', t0: 56.6, t1: 58.25, dx: 60, dy: -300, tone: 'bad' },
  { text: 'DEW POINT RISING', anchor: 'display', t0: 59.9, t1: 60.95, dx: 60, dy: -260, tone: 'bad' },
  { text: 'SPLAY', anchor: 'splay', t0: 61.15, t1: 62.25, dx: 60, dy: -300, tone: 'bad' },
  { text: 'RETURN AIR TEMP', anchor: 'outlet', t0: 62.5, t1: 65.85, dx: -60, dy: 420, tone: 'bad' },
  { text: 'CLEAN WEEKLY', anchor: 'filter', t0: 66.4, t1: 68.45, dx: 60, dy: -300 },
  { text: 'BACK TO −40 °C', anchor: 'display', t0: 69.6, t1: 70.55, dx: 60, dy: -260 },
  { text: 'KEEP IT FULL', anchor: 'level', t0: 74.7, t1: 75.95, dx: -80, dy: -300 },
  { text: 'TIGHTEN', anchor: 'leak', t0: 76.1, t1: 77.55, dx: 60, dy: -300 },
  { text: 'FRESH DESICCANT', anchor: 'towerA', t0: 77.9, t1: 79.7, dx: 60, dy: -320 },
];

const col = (v, a, b) => (v < a ? '#6ff0b0' : v < b ? '#ffb35c' : '#ff5a4e');
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.3, b, t));
const DEWLOG = [-41, -40, -40, -38, -34, -28, -21, -15, -10, -8];
const RETLOG = [58, 59, 58, 57, 58, 63, 71, 78, 84, 86];
export function hud(t, st) {
  if (t > 0.8 && t < 2.85) return { opacity: fade(t, 0.8, 2.85), items: [{ k: 'HYGROSCOPIC', v: 'PC · PA · PET' }, { k: 'SOAKS UP', v: 'WATER', big: true, color: '#8fd8ff' }] };
  if (t > 16.8 && t < 20.05) {
    const m = 0.30 - 0.28 * (st.hours / 3.5);
    return { opacity: fade(t, 16.8, 20.05), items: [{ k: 'DRYING TIME', v: `${st.hours.toFixed(1)} h`, big: true }], bar: { k: 'MOISTURE IN THE PELLETS', v: m / 0.3, text: `${m.toFixed(2)} %`, color: '#6fd8ff' } };
  }
  if (t > 33.8 && t < 38.05) return { opacity: fade(t, 33.8, 38.05), items: [{ k: 'DEW POINT', v: '−40 °C', big: true, color: '#6ff0b0' }, { k: 'WATER IN AIR', v: '≈ 0.1 g/m³' }, { k: 'ROOM AIR', v: '≈ 10 g/m³' }] };
  if (t > 41.4 && t < 44.05) return { opacity: fade(t, 41.4, 44.05), items: [{ k: 'AIRFLOW', v: `${Math.round(st.airflow * 100)} %`, big: true, color: col(1 - st.airflow, 0.15, 0.35) }], bar: { k: 'AIRFLOW', v: st.airflow, text: `${Math.round(st.airflow * 100)} %`, color: col(1 - st.airflow, 0.15, 0.35) } };
  if (t > 44.6 && t < 48.35) return { opacity: fade(t, 44.6, 48.35), items: [{ k: 'DEW POINT', v: `${Math.round(st.dew)} °C`, big: true, color: col(st.dew, -34, -25) }, { k: 'TARGET', v: '−40 °C' }] };
  if (t > 51.6 && t < 54.05) {
    const h = 3.5 * (st.level - 0.5) / (LEVEL_FULL - 0.5);
    return { opacity: fade(t, 51.6, 54.05), items: [{ k: 'TIME IN HOPPER', v: `${h.toFixed(1)} h`, big: true, color: col(3.5 - h, 0.4, 1.0) }, { k: 'NEEDED', v: '3–4 h' }] };
  }
  if (t > 62.5 && t < 65.85) return { opacity: fade(t, 62.5, 65.85), pos: 'mid', backdrop: true, items: [{ k: 'RETURN AIR', v: `${Math.round(st.returnAir)} °C`, big: true, color: '#ff5a4e' }, { k: 'USUAL', v: '≈ 58 °C' }] };
  if (t > 70.9 && t < 74.05) return { opacity: fade(t, 70.9, 74.05), pos: 'mid', backdrop: true, items: [{ k: 'PC · 120 °C', v: '3–4 h' }, { k: 'ABS · 80 °C', v: '2–4 h' }, { k: 'PET · 160 °C', v: '4–6 h' }], bar: { k: 'TYPICAL · ALWAYS CHECK YOUR GRADE', v: 1, text: 'DATASHEET', color: '#ffb35c' } };
  return null;
}

export const CARDS = [
  { t0: 58.45, t1: 65.8, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Dew point rising', t: 59.9 },
    { text: 'Splay on the parts', t: 61.15 },
    { text: 'Return air temp out of range', t: 62.45 },
  ] },
  { t0: 66.0, t1: 79.6, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Clean the filters every week', t: 66.3, done: 67.8 },
    { text: 'Watch the dew point', t: 68.6, done: 70.3 },
    { text: 'Temp + time from the datasheet', t: 70.6, done: 73.9 },
    { text: 'Full hopper · tight hoses · fresh desiccant', t: 74.2, done: 79.2 },
  ] },
];
export const SHAKES = [];
export const FLASHES = [];
