// Mould cooling circuits — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 5.2, cut: 0 },
  { id: 'channels', label: 'Channels', t: 10.6, cut: 1 },
  { id: 'cores', label: 'Baffles & bubblers', t: 15.0, cut: 1 },
  { id: 'flow', label: 'Turbulent flow', t: 22.8, cut: 1 },
  { id: 'meters', label: 'Flow & ΔT', t: 30.0, cut: 1 },
  { id: 'scale', label: 'Scale', t: 36.2, cut: 1 },
  { id: 'block', label: 'Blocked & leaking', t: 43.6, cut: 1 },
  { id: 'fix', label: 'The fix', t: 64.0, cut: 1 },
];
export const NOM = 12.0;   // L/min per circuit when clean

export function stateAt(t) {
  const cyc = ((t % 5.0) + 5.0) % 5.0;
  const partHeat = cyc < 0.25 ? cyc / 0.25 : Math.exp(-(cyc - 0.25) / 1.7);
  const clean = ss(72.6, 73.4, t);                       // after the descale flush
  const scaleA = 0.55 * ss(36.0, 40.0, t) * (1 - clean);
  const scaleB = 1.0 * ss(36.2, 42.5, t) * (1 - clean);
  const flowA = NOM * (1 - 0.3 * scaleA), flowB = NOM * (1 - 0.74 * scaleB) * (t > 73.2 ? 1 : 1);
  const tin = 25.0;
  const dT = (f, s) => 2.5 * (NOM / Math.max(1, f)) * (1 + 0.6 * s);
  const outA = tin + dT(flowA, scaleA), outB = tin + dT(flowB, scaleB);
  // macro rigs
  const chScale = ss(38.6, 42.6, t);                      // crust in the turbulence rig
  const baffleBlock = ss(43.6, 44.4, t) * (1 - clean);
  const oringLeak = pulse(45.6, 45.9, 76.6, 77.0, t);
  const warp = ss(50.6, 52.0, t) * (1 - clean), sink = ss(51.2, 52.2, t) * (1 - clean);
  const cycleTime = 28.0 + 3.6 * Math.max(scaleB * 0.9, 0) * (t > 47.9 ? 1 : ss(36, 47.9, t));
  // fix choreography
  const treat = ss(64.2, 65.6, t);
  const flushStage = t < 69.3 ? 0 : t < 71.0 ? 1 : t < 72.0 ? 2 : t < 73.3 ? 3 : t < 74.6 ? 4 : 0;   // 1 descaler 2 neutralise 3 rinse 4 air
  const cart = pulse(69.0, 69.5, 74.5, 74.9, t);
  const ptest = pulse(74.8, 75.0, 76.5, 76.7, t), ptestP = 6.0 * ss(74.9, 75.4, t);
  const tags = ss(77.9, 78.4, t);
  return {
    t, partHeat, scaleA, scaleB, flowA, flowB, tin, outA, outB, chScale, baffleBlock, oringLeak, warp, sink, cycleTime,
    treat, flushStage, cart, ptest, ptestP, tags, clean,
    week: Math.round(52 * ss(36.0, 42.5, t)),
    warn: ss(36.2, 37.6, t) * (1 - ss(63.4, 64.0, t)),
  };
}
