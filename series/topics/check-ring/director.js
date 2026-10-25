// Check ring — shots, labels, HUD, cards.
import { CUSHION_LOG } from './story.js';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export const TOTAL = 71.2;
export const TITLE = { big: 'CHECK RING', sub: 'the non-return valve on the screw', t0: 5.2, t1: 6.95 };
export const END = { big: 'CHECK RING', a: 'Steady cushion.', b: 'Steady parts.', t0: 67.4 };
export const CHAPTERS = [
  { t: 6.95, label: 'HOW IT WORKS' },
  { t: 32.9, label: 'WHAT GOES WRONG' },
  { t: 46.3, label: 'WARNING SIGNS' },
  { t: 52.9, label: 'THE FIX' },
];
// camera that rides along with the check ring
const ringCam = (off, look, fov) => (t, p, S) => {
  const x = S.U.screw.position.x + S.U.ring.position.x + 0.2;
  return { pos: [x + off[0], off[1], off[2]], tgt: [x + look[0], look[1], look[2]], fov };
};
export const SHOTS = [
  { id: 'S1', t0: 0, t1: 5.15, cam: (t, p, S) => { const x = S.U.screw.position.x + S.U.ring.position.x + 0.2; const k = p; return { pos: [x + 0.5 - 0.3 * k, 2.3 - 0.4 * k, 5.4 - 1.2 * k], tgt: [x + 0.2, -0.15, -0.2], fov: 34 }; }, hand: 0.004 },
  { id: 'S2', t0: 5.15, t1: 6.95, keys: [[0, [7.5, 4.2, 16.5], [-0.5, 0.6, 0], 38], [1, [6.4, 3.6, 15.0], [-0.5, 0.5, 0], 38]], ez: 'lin' },
  { id: 'S3', t0: 6.95, t1: 11.4, keys: [[0, [-7.4, 2.8, 8.2], [-7.2, 0.6, 0], 40], [0.5, [-4.6, 1.8, 7.0], [-4.4, 0.0, 0], 40], [1, [-0.6, 1.6, 7.0], [-0.4, 0.0, 0], 40]] },
  { id: 'S4', t0: 11.4, t1: 15.9, keys: [[0, [2.2, 1.8, 9.0], [2.0, -0.1, 0], 38], [1, [1.4, 1.8, 9.4], [1.2, -0.1, 0], 38]], ez: 'lin' },
  { id: 'S5', t0: 15.9, t1: 19.6, cam: ringCam([0.5, 1.9, 4.4], [0.1, -0.15, -0.2], 34), hand: 0.004 },
  { id: 'S6', t0: 19.6, t1: 22.95, keys: [[0, [3.6, 2.4, 16.0], [4.6, 0.0, 0], 38], [1, [4.6, 2.2, 15.0], [5.4, 0.0, 0], 38]], ez: 'lin' },
  { id: 'S7', t0: 22.95, t1: 27.0, cam: ringCam([0.4, 1.8, 4.1], [0.05, -0.15, -0.2], 34), hand: 0.004 },
  { id: 'S8', t0: 27.0, t1: 29.5, keys: [[0, [8.6, 1.6, 9.6], [7.6, 0.2, 0], 38], [1, [8.2, 1.3, 8.6], [7.8, 0.2, 0], 38]], ez: 'lin' },
  { id: 'S9', t0: 29.5, t1: 32.9, keys: [[0, [4.9, 0.9, 5.4], [4.6, 0.0, -0.2], 34], [1, [4.9, 0.8, 4.6], [4.65, 0.0, -0.2], 34]], ez: 'lin' },
  { id: 'S10', t0: 32.9, t1: 37.7, cam: ringCam([0.4, 1.9, 4.3], [0.0, -0.15, -0.2], 34), hand: 0.004 },
  { id: 'S11', t0: 37.7, t1: 43.0, cam: ringCam([0.3, 1.9, 4.5], [-0.1, -0.15, -0.2], 34), hand: 0.004 },
  { id: 'S12', t0: 43.0, t1: 46.3, keys: [[0, [7.0, 2.2, 13.5], [7.0, 0.3, 0], 38], [1, [7.3, 2.0, 12.5], [7.4, 0.3, 0], 38]], ez: 'lin' },
  { id: 'S13', t0: 46.3, t1: 52.9, keys: [[0, [9.6, 1.4, 8.4], [8.4, -0.2, 0], 38], [1, [9.2, 1.2, 7.6], [8.4, -0.2, 0], 38]], ez: 'lin' },
  { id: 'S14', t0: 52.9, t1: 55.1, keys: [[0, [3.0, 3.0, 12.0], [3.0, 2.2, 0], 38], [1, [3.2, 2.8, 11.4], [3.2, 2.1, 0], 38]], ez: 'lin' },
  { id: 'S15', t0: 55.1, t1: 62.85, keys: [[0, [4.4, 3.2, 12.5], [4.6, 1.6, 0], 38], [1, [4.4, 2.8, 10.0], [4.6, 1.2, 0], 38]], ez: 'lin' },
  { id: 'S16', t0: 62.85, t1: 67.4, keys: [[0, [5.6, 3.2, 13.5], [6.0, 0.6, 0], 40], [0.55, [6.6, 2.6, 11.0], [7.4, 0.4, 0], 40], [1, [5.4, 2.4, 11.5], [5.4, 0.2, 0], 40]] },
  { id: 'S17', t0: 67.4, t1: 72, keys: [[0, [7.0, 3.6, 16.0], [-0.4, 0.8, 0], 38], [1, [9.0, 5.0, 20.0], [-0.4, 1.8, 0], 38]] },
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S2': return { cut: 0 };
    case 'S3': return { cut: ss(7.0, 8.6, t), cutRange: [3.2, 0] };
    // slow-motion replay of the ring slamming shut
    case 'S7': return { cut: 1, t: 20.85 + (t - 22.95) * 0.32 };
    case 'S17': return { cut: 1 - ss(67.5, 68.9, t), cutRange: [3.2, 0] };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S2') exposure = 0.35 + 0.65 * ss(5.15, 5.9, t);
  return { exposure };
}

export const LABELS = [
  { text: 'CHECK RING', anchor: 'ring', t0: 2.7, t1: 5.1, dx: 80, dy: -330 },
  { text: 'PELLETS', anchor: 'hopper', t0: 8.0, t1: 9.6, dx: 120, dy: -260 },
  { text: 'SCREW', anchor: 'screw', t0: 8.7, t1: 11.35, dx: -100, dy: -300 },
  { text: 'MELT', anchor: [-1.4, 0.45, -0.1], t0: 10.8, t1: 11.35, dx: 120, dy: -300 },
  { text: 'SCREW MOVES BACK', sub: 'pushed by the melt', anchor: 'screw', t0: 12.9, t1: 15.85, dx: -60, dy: -320 },
  { text: 'MELT IN FRONT', anchor: 'cushion', t0: 12.0, t1: 15.85, dx: 80, dy: 300 },
  { text: 'CHECK RING', sub: 'slid forward', anchor: 'ring', t0: 16.2, t1: 19.55, dx: 80, dy: -320 },
  { text: 'GAP', anchor: 'gap', t0: 18.6, t1: 19.55, dx: -100, dy: 280 },
  { text: 'SEAT', anchor: 'seat', t0: 24.9, t1: 26.95, dx: -100, dy: -300 },
  { text: 'SEALED', anchor: 'gap', t0: 26.2, t1: 26.95, dx: 100, dy: 280 },
  { text: 'MOULD', anchor: 'mould', t0: 28.6, t1: 29.45, dx: -100, dy: -300 },
  { text: 'CUSHION', sub: 'melt left in front', anchor: 'cushion', t0: 31.4, t1: 32.85, dx: -60, dy: -320 },
  { text: 'WEAR', anchor: 'ring', t0: 34.6, t1: 37.65, dx: 80, dy: -320, tone: 'warn' },
  { text: 'GLASS FIBRES', anchor: [-2.6, 0.45, -0.1], t0: 36.0, t1: 37.65, dx: -80, dy: 280, tone: 'warn' },
  { text: 'BACKFLOW', sub: 'melt slips past the ring', anchor: 'gap', t0: 41.0, t1: 42.95, dx: -80, dy: -320, tone: 'bad' },
  { text: 'SHORT SHOT', anchor: [8.55, 1.6, 0.0], t0: 50.0, t1: 52.85, dx: -100, dy: -300, tone: 'bad' },
  { text: 'SCREW CREEPING', anchor: 'screw', t0: 60.7, t1: 62.8, dx: -60, dy: -320, tone: 'bad' },
  { text: 'WORN RING + SEAT', anchor: 'ring', t0: 64.3, t1: 65.1, dx: -60, dy: -320, tone: 'bad' },
  { text: 'NEW SET', anchor: 'ring', t0: 65.7, t1: 67.35, dx: -60, dy: -320 },
];

const col = (v, a, b) => (v > a ? '#6ff0b0' : v > b ? '#ffb35c' : '#ff5a4e');
export function hud(t, st) {
  if (t > 11.5 && t < 15.85) return { opacity: ss(11.5, 11.9, t) * (1 - ss(15.55, 15.85, t)), items: [
    { k: 'SCREW', v: 'TURNING' }, { k: 'SHOT BUILT', v: `${(st.screwMm).toFixed(0)} mm`, big: true, color: '#ffb35c' }, { k: 'RING', v: 'OPEN', color: '#8fe9ff' }] };
  if (t > 29.6 && t < 32.85) return { opacity: ss(29.6, 30.0, t) * (1 - ss(32.55, 32.85, t)), items: [
    { k: 'SHOT', v: 'FULL', color: '#6ff0b0' }, { k: 'CUSHION', v: `${st.cushionMm.toFixed(1)} mm`, big: true, color: '#6ff0b0' }, { k: 'RING', v: 'SEALED', color: '#6ff0b0' }] };
  if (t > 43.1 && t < 46.25) {
    const n = Math.min(CUSHION_LOG.length, 6 + Math.floor((t - 43.1) / 0.3));
    return { opacity: ss(43.1, 43.5, t) * (1 - ss(45.95, 46.25, t)), items: [{ k: 'CUSHION BY SHOT', v: '' }],
      spark: { values: CUSHION_LOG, n, lo: 0, hi: 6, color: '#ff5a4e', band: [4.5, 5.5], unit: ' mm' } };
  }
  if (t > 53.0 && t < 55.05) return { opacity: ss(53.0, 53.4, t) * (1 - ss(54.75, 55.05, t)), pos: 'mid', items: [{ k: 'CUSHION LOG · LAST 16 SHOTS', v: '' }],
    spark: { values: CUSHION_LOG, n: CUSHION_LOG.length, lo: 0, hi: 6, color: '#ffb35c', band: [4.5, 5.5], unit: ' mm' } };
  if (t > 56.2 && t < 62.8) return { opacity: ss(56.2, 56.6, t) * (1 - ss(62.5, 62.8, t)), pos: 'mid', items: [
    { k: 'HOLD PRESSURE', v: 'ON', color: '#ffb35c' }, { k: 'SCREW POSITION', v: `${st.screwMm.toFixed(1)} mm`, big: true, color: col(st.screwMm, 8.5, 4.0) }, { k: 'MOULD', v: 'FULL' }] };
  return null;
}

export const CARDS = [
  { t0: 46.4, t1: 52.85, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Cushion drifts or bottoms out', t: 47.5 },
    { text: 'Short shots', t: 50.05 },
    { text: 'Part weights vary', t: 50.95 },
  ] },
  { t0: 53.0, t1: 67.3, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Log the cushion every shift', t: 53.17, done: 54.9 },
    { text: 'Creep test: hold pressure, watch the screw', t: 55.18, done: 62.3 },
    { text: 'Replace ring + seat as a set', t: 62.86, done: 66.5 },
  ] },
];
export const SHAKES = [{ t: 23.55, a: 0.06, d: 0.18 }];
export const FLASHES = [{ t: 65.2, a: 0.08, d: 0.15 }];
