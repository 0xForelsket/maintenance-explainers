// Hydraulic hose — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 9.6, cut: 0 },
  { id: 'layers', label: 'Layers', t: 13.8, cut: 1 },
  { id: 'fitting', label: 'Crimped fitting', t: 21.8, cut: 1 },
  { id: 'flex', label: 'Flex & pulses', t: 23.8, cut: 0 },
  { id: 'fatigue', label: 'Fatigue', t: 28.1, cut: 0 },
  { id: 'rub', label: 'Rubbing', t: 31.5, cut: 0 },
  { id: 'bends', label: 'Bends & twists', t: 35.8, cut: 0 },
  { id: 'failure', label: 'Weep, spray, burst', t: 38.5, cut: 0 },
  { id: 'fix', label: 'The fix', t: 49.1, cut: 0 },
];

export function stateAt(t) {
  const fresh = t >= 62.0;               // damaged hose swapped for a new one
  const keep = (v) => (fresh ? 0 : v);
  // machine: carriage travel; faster flexing during the flex chapter
  const cyc = t < 23.6 ? t * 0.18 : 23.6 * 0.18 + (t - 23.6) * 0.32;
  const ph = cyc % 1;
  const travel = ph < 0.5 ? ss(0.0, 0.42, ph) : 1 - ss(0.5, 0.92, ph);
  const pulses = pulse(24.0, 24.4, 27.6, 27.9, t);
  // damage rig
  const crack = keep(ss(28.4, 31.0, t));
  const wear = keep(ss(31.8, 33.4, t));
  const rust = keep(ss(33.3, 34.4, t));
  const snap = keep(ss(34.6, 34.75, t));
  const rub = pulse(31.4, 31.6, 34.4, 34.8, t);
  const weep = pulse(38.4, 38.6, 39.6, 39.7, t) + keep(ss(46.8, 47.2, t)) * (t < 59.0 ? 1 : 0);
  const wet = keep(Math.max(ss(38.5, 39.3, t), 0));
  const jet = pulse(0.0, 0.05, 5.0, 5.1, t) + pulse(39.7, 39.8, 40.8, 40.95, t) + pulse(51.6, 51.8, 54.5, 54.7, t);
  const bulge = keep(ss(41.0, 41.4, t));
  const burst = pulse(41.4, 41.45, 42.6, 42.7, t);
  const stain = ss(52.2, 54.0, t) * (1 - ss(54.6, 54.7, t));
  const card = pulse(51.5, 52.0, 54.5, 54.7, t);
  const guard = ss(54.9, 56.3, t);
  const fixBend = ss(57.0, 58.4, t);
  const pressure = t < 59.2 ? 210 : mix(210, 0, ss(59.2, 60.4, t));
  const lever = ss(60.5, 60.9, t);
  const padlock = ss(61.0, 61.5, t);
  return {
    t, travel, pulses, crack, wear, rust, snap, rub, weep: Math.min(1, weep), wet, jet, bulge, burst, stain, card, guard, fixBend, pressure, lever, padlock, fresh,
    cycles: Math.round(1e6 * Math.pow(ss(28.4, 31.0, t), 1.5)),
    warn: ss(31.6, 33.0, t) * (1 - ss(48.6, 49.2, t)),
  };
}
