// Desiccant resin dryer — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 7.4, cut: 0 },
  { id: 'hopper', label: 'Drying hopper', t: 13.8, cut: 1 },
  { id: 'loop', label: 'Return air', t: 20.3, cut: 1 },
  { id: 'towers', label: 'Desiccant towers', t: 27.7, cut: 1 },
  { id: 'filters', label: 'Clogged filters', t: 41.2, cut: 1 },
  { id: 'saturated', label: 'Saturated desiccant', t: 44.4, cut: 1 },
  { id: 'leaks', label: 'Leaks & low level', t: 48.6, cut: 1 },
  { id: 'fix', label: 'The fix', t: 66.2, cut: 1 },
];
export const LEVEL_FULL = 3.85, LEVEL_LOW = 1.9;

export function stateAt(t) {
  const swapAt = 32.6;
  const towerA = t < swapAt ? 'process' : 'regen';
  const filterDirt = ss(41.0, 43.6, t) * (1 - ss(67.0, 67.6, t));
  const airflow = 1 - 0.55 * filterDirt;
  const regenDead = ss(44.2, 44.5, t) * (1 - ss(69.0, 69.4, t));
  const saturation = ss(44.6, 48.0, t) * (1 - 0.75 * ss(69.2, 71.5, t)) * (1 - ss(78.0, 79.2, t));          // process bed stays wet
  const leak = pulse(48.4, 48.7, 76.4, 77.0, t);
  const level = mix(LEVEL_FULL, LEVEL_LOW, ss(51.2, 53.4, t) * (1 - ss(74.4, 75.8, t)));
  let dew = -40 + 26 * ss(44.6, 48.2, t) + 6 * leak;
  dew = mix(dew, -40, ss(68.8, 70.2, t));
  const defects = Math.max(ss(54.3, 55.6, t), 0) * (1 - ss(66.0, 66.2, t));
  const returnAir = 58 + 28 * ss(51.6, 54.0, t) * (1 - ss(74.4, 75.8, t)) + 0.6 * Math.sin(t * 0.7);   // low hopper: air gives up little heat, return runs hot
  const filterOut = pulse(66.3, 66.8, 67.9, 68.4, t);
  const clamp = ss(76.2, 76.9, t);
  const fresh = ss(77.8, 79.2, t);
  const pour = pulse(77.7, 77.9, 79.0, 79.3, t);
  const moistAir = pulse(0.0, 0.1, 5.2, 5.4, t);
  return {
    t, towerA, swap: ss(swapAt - 0.4, swapAt + 0.4, t), filterDirt, airflow, regenDead, saturation, leak, level, dew, defects, returnAir,
    filterOut, clamp, fresh, pour, moistAir,
    hours: (ss(16.5, 19.8, t) * 3.5),
    warn: ss(38.2, 39.6, t) * (1 - ss(65.6, 66.2, t)),
  };
}
