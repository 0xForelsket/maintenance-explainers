// Check ring (non-return valve) story — screw motion, ring position, mould fill as pure functions of t.
import { makeClock } from 'series/look';
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lin = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 5.3, cut: 0 },
  { id: 'recovery', label: 'Recovery', t: 11.4, cut: 1 },
  { id: 'open', label: 'Ring open', t: 16.0, cut: 1 },
  { id: 'inject', label: 'Injection', t: 20.6, cut: 1 },
  { id: 'cushion', label: 'Cushion', t: 29.5, cut: 1 },
  { id: 'wear', label: 'Wear', t: 33.0, cut: 1 },
  { id: 'leak', label: 'Backflow', t: 37.8, cut: 1 },
  { id: 'test', label: 'Creep test', t: 55.2, cut: 1 },
  { id: 'replace', label: 'Replace', t: 62.9, cut: 1 },
];

const STROKE = 2.2, CUSH = 0.25;
// screw rotation speed (rad/s): turning while recovering
const rotSpeed = (t) => 2.6 * (t < 6.9 ? 0.6 : 0) + 2.6 * pulse(6.9, 7.3, 19.2, 19.5, t) + 2.6 * pulse(32.9, 33.2, 37.4, 37.7, t) + 2.6 * pulse(43.0, 43.2, 52.6, 52.9, t);
const rotClock = makeClock(rotSpeed, 90);

export function stateAt(t) {
  let pos, ringOpen, fill = 0, short = 0, leak = 0;
  // cycle 1 — healthy
  if (t < 11.4) { pos = t < 6.9 ? -1.0 : -1.0 + 1.0 * ss(6.9, 8.0, t) * 0; ringOpen = 1; }
  else if (t < 21.0) { pos = -0.2 - (STROKE - 0.2) * ss(11.4, 19.4, t); ringOpen = 1; }
  else if (t < 32.9) {
    pos = -STROKE + (STROKE - CUSH) * ss(21.0, 28.8, t);
    ringOpen = 1 - ss(21.0, 21.15, t);
    fill = lin(21.8, 28.8, t);
  } else if (t < 37.8) {
    // second cycle recovers while we look at wear
    pos = -CUSH - (STROKE - CUSH) * ss(33.0, 37.4, t); ringOpen = 1; fill = 1 - ss(32.9, 33.3, t);
  } else if (t < 43.0) {
    // worn ring: screw drives further (cushion bottoms out), melt leaks back, short shot
    pos = -STROKE + (STROKE - 0.02) * ss(38.0, 42.6, t);
    ringOpen = 0.32; leak = pulse(38.0, 38.3, 42.4, 42.8, t);
    fill = 0.72 * lin(38.8, 42.6, t); short = 1;
  } else if (t < 52.9) {
    // shots vary: quick cycles
    const k = Math.floor((t - 43.0) / 1.65), ph = ((t - 43.0) % 1.65) / 1.65;
    const amt = [0.92, 0.7, 0.98, 0.63, 0.88, 0.75, 0.95][k % 7];
    pos = ph < 0.45 ? -STROKE * ss(0, 0.45, ph) - 0.02 : -STROKE + (STROKE - 0.02 - (1 - amt) * 0.3) * ss(0.5, 0.9, ph);
    ringOpen = ph < 0.48 ? 1 : 0.32; leak = ph > 0.5 && ph < 0.9 ? 1 : 0;
    fill = ph < 0.5 ? 0 : amt * ss(0.52, 0.9, ph); short = 1;
  } else if (t < 62.85) {
    // creep test: full mould, hold injection pressure, screw creeps forward
    pos = -0.45 + 0.4 * ss(58.7, 62.4, t); ringOpen = 0.32 * (1 - ss(52.9, 53.3, t)) + 0.0; fill = 1; leak = pulse(58.7, 59.0, 62.2, 62.6, t) * 0.6;
  } else {
    // pull the screw out the front, swap ring + seat, put it back
    pos = -0.05 + 3.9 * ss(63.4, 64.6, t) * (1 - ss(66.0, 67.0, t)); ringOpen = 0; fill = 0;
  }
  const wear = ss(33.2, 36.8, t) * (1 - ss(65.0, 65.8, t));
  const nozzleOff = ss(62.9, 63.5, t) * (1 - ss(66.8, 67.4, t));
  const cushionMm = Math.max(0, -pos * 20);
  return {
    t, pos, rot: rotClock(t), rotSpeed: rotSpeed(t), ringOpen, fill, short, leak, wear, nozzleOff,
    recovering: rotSpeed(t) > 0.5 ? 1 : 0,
    injecting: (t > 21.0 && t < 28.8) || (t > 38.0 && t < 42.6) ? 1 : 0,
    swap: pulse(65.0, 65.2, 65.6, 65.8, t),
    screwMm: -pos * 20, cushionMm,
    glass: pulse(34.4, 35.0, 37.2, 37.8, t),
    warn: ss(38.0, 41.0, t) * (1 - ss(52.9, 55.0, t)),
  };
}

// cushion history for the HUD chart (mm per shot)
export const CUSHION_LOG = [5.1, 5.0, 5.1, 4.9, 5.0, 4.6, 4.2, 3.7, 4.4, 2.9, 3.6, 1.8, 2.7, 0.9, 1.6, 0.2];
