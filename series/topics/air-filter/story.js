// Compressed air filter + float drain — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 6.0, cut: 0 },
  { id: 'condense', label: 'Condensate', t: 8.6, cut: 1 },
  { id: 'deflector', label: 'Deflector', t: 15.6, cut: 1 },
  { id: 'element', label: 'Element', t: 22.6, cut: 1 },
  { id: 'drain', label: 'Baffle & drain', t: 28.8, cut: 1 },
  { id: 'stuck', label: 'Stuck drain', t: 35.8, cut: 1 },
  { id: 'clog', label: 'Clogged element', t: 44.8, cut: 1 },
  { id: 'fix', label: 'The fix', t: 56.6, cut: 1 },
];

// float drain cycles: water level builds, float lifts, valve dumps
function drainCycle(t) {
  // working drain until it sticks at ~36s; sludge cleared at ~62.6s
  const P = 4.2;
  const ph = ((t - 28.8) % P + P) % P / P;
  return ph;
}

export function stateAt(t) {
  const stuck = ss(36.2, 36.8, t) * (1 - ss(62.4, 62.9, t));
  const sludge = ss(36.0, 38.6, t) * (1 - ss(61.6, 62.8, t));
  // normal level oscillates as the float drain dumps; when stuck it climbs over the baffle
  const ph = drainCycle(t);
  const cycleLevel = t < 28.6 ? 0.18 + 0.1 * ss(18.8, 28.6, t) : 0.16 + 0.22 * Math.min(1, ph / 0.75) - 0.22 * ss(0.75, 0.9, ph);
  const dumpNormal = t < 28.6 ? 0 : pulse(0.74, 0.78, 0.9, 0.96, ph);
  const climb = ss(38.8, 43.0, t) * (1 - ss(61.8, 63.3, t));
  const level = Math.min(1, cycleLevel * (1 - stuck) + stuck * (0.38 + 0.6 * climb) - 0.3 * pulse(59.6, 59.8, 60.6, 61.2, t) * (1 - stuck));
  const testBtn = pulse(59.4, 59.55, 60.4, 60.7, t);
  const dump = Math.max(dumpNormal * (1 - stuck), testBtn * (1 - stuck * 0.0) * (t < 62.4 ? 1 : 1));
  const carry = ss(40.4, 41.4, t) * (1 - ss(61.8, 62.8, t));
  const clog = ss(44.8, 48.6, t) * (1 - ss(64.0, 65.4, t));
  const dirt = 0.15 + 0.85 * ss(24.6, 48.4, t) * (1 - ss(64.0, 65.4, t));
  const dp = 0.1 + 0.75 * clog;
  const shutoff = ss(67.2, 67.8, t) * (1 - ss(72.0, 72.5, t));
  const pIn = 7.0 * (1 - shutoff * ss(67.6, 68.6, t));
  const bowlOpen = ss(68.9, 69.9, t) * (1 - ss(71.2, 71.8, t));
  const elementSwap = pulse(64.0, 64.4, 65.0, 65.6, t);
  return {
    t, stuck, sludge, level, dump, testBtn, carry, clog, dirt, dp, pIn, pOut: Math.max(0, pIn - dp), shutoff, bowlOpen, elementSwap,
    condense: ss(9.6, 11.6, t), swirl: 1,
    warn: ss(40.0, 43.0, t) * (1 - ss(56.4, 59.0, t)),
  };
}
