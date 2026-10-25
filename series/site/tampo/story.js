// Tampo (pad) printing — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const win = (a, b, x) => (x >= a && x < b ? 1 : 0);
// piecewise keyframes [[t, v], ...]: smooth between neighbours, hold outside
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t < t1) return v0 + (v1 - v0) * ss(t0, t1, t);
  }
  return keys[keys.length - 1][1];
}

export const GEO = {
  CL_Y: -0.94, PART_Y: -0.65, TP_Y: -1.4, UP: 0.7,
  xC: -2.0, xT: 0.2, xP: 2.4, cupCover: -2.0, cupAway: -3.35,
  part: { a: 1.0, b: 0.55, c: 0.7, y: -1.2 },
};
const G = GEO, CLP = G.CL_Y - 0.26, PTP = G.PART_Y - 0.24, TPP = G.TP_Y - 0.25, J = 0.001;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 4.8, cut: 0 },
  { id: 'cliche', label: 'Cliché', t: 10.6, cut: 0 },
  { id: 'cup', label: 'Ink cup', t: 14.2, cut: 1 },
  { id: 'pickup', label: 'Pad pick-up', t: 22.9, cut: 0 },
  { id: 'print', label: 'Print', t: 26.8, cut: 0 },
  { id: 'defects', label: 'What goes wrong', t: 39.7, cut: 0 },
  { id: 'warning', label: 'Warning signs', t: 55.1, cut: 0 },
  { id: 'fix', label: 'The fix', t: 62.4, cut: 0 },
];

export function stateAt(t) {
  const padX = K(t, [[0, G.xC], [26.9, G.xC], [28.2, G.xP], [34.6, G.xP], [35.8, G.xC], [43.2, G.xC], [43.2 + J, G.xP], [45.0, G.xP], [45.0 + J, G.xC], [62.3, G.xC], [62.3 + J, G.xT], [64.4, G.xT], [64.4 + J, G.xC]]);
  const padY = K(t, [[0, G.UP], [23.6, G.UP], [24.3, CLP], [24.8, CLP], [25.4, G.UP], [28.4, G.UP], [29.0, PTP], [32.6, PTP], [33.3, G.UP], [43.2, G.UP], [43.2 + J, PTP], [43.6, PTP], [44.3, G.UP], [62.8, G.UP], [63.3, TPP], [63.6, TPP], [64.1, G.UP]]);
  const cupX = K(t, [[0, G.cupAway], [14.4, G.cupAway], [15.6, G.cupCover], [16.1, G.cupCover], [17.4, G.cupAway], [26.9, G.cupAway], [28.2, G.cupCover], [46.9, G.cupCover], [48.1, G.cupAway]]);
  const etchInk = K(t, [[0, 0], [15.0, 0], [15.4, 1], [24.0, 1], [24.2, 0.08], [27.6, 0.08], [28.0, 1]]);
  const tacky = ss(19.6, 21.9, t) * (1 - ss(27.6, 28.0, t));
  const padInk = K(t, [[0, 0], [24.2, 0], [24.35, 1], [32.7, 1], [33.0, 0], [43.2, 0], [43.2 + J, 1], [43.7, 1], [44.1, 0.6], [45.0, 0.6], [45.0 + J, 0]]);
  // the print on the part (each failure shot shows a fresh part)
  const print = K(t, [[0, 1], [4.7, 1], [4.7 + J, 0], [29.0, 0], [29.2, 1], [50.2, 1], [50.2 + J, 0], [52.5, 0], [52.5 + J, 1], [74.4, 1], [74.4 + J, 0], [75.9, 0], [75.9 + J, 1]]);
  const holes = win(41.3, 43.2, t) + 0.7 * win(55.0, 57.9, t);
  const fade = 0.7 * win(43.2, 45.0, t) * ss(43.6, 44.2, t) + 0.5 * win(55.0, 57.9, t);
  const blur = win(45.0, 46.7, t) + 0.85 * win(57.9, 59.8, t);
  const smudge = win(57.9, 59.8, t);
  const haze = win(48.5, 50.2, t), streak = win(48.5, 50.2, t);
  const fish = win(52.5, 55.0, t);
  const oil = win(50.2, 55.0, t) + win(74.4, 75.9, t);
  const clothX = K(t, [[74.6, -1.35], [75.6, 1.35]]);
  const cloth = win(74.4, 75.9, t);
  const clHaze = ss(47.1, 48.1, t) * (1 - ss(70.45, 70.5, t));
  const ringWorn = win(46.7, 70.5, t);
  const lint = win(39.6, 63.25, t), padCut = win(62.3, 65.35, t), newPad = pulse(65.3, 65.45, 65.7, 66.3, t);
  const tape = win(59.8, 62.3, t) + win(75.9, 78.1, t);
  const peel = win(59.8, 62.3, t) * ss(60.5, 61.4, t) + win(75.9, 78.1, t) * ss(76.7, 77.6, t);
  const peelBad = win(59.8, 62.3, t);
  const screw = ss(72.8, 73.9, t) * Math.PI * 4;
  const visc = pulse(66.5, 66.7, 68.7, 68.9, t), drain = 18.4 * ss(66.7, 68.5, t);
  const seal = pulse(69.2, 69.5, 70.2, 70.5, t);
  const sweep = win(70.5, 72.6, t) * ss(70.7, 72.4, t);
  // rig C: section through the cliché etch
  const rigBlade = K(t, [[0, -3.4], [17.2, -3.4], [18.8, 3.8]]);
  const rigFill = t >= 17.0 ? 1 : 0;
  const rigTacky = ss(19.8, 22.0, t);
  const rigPadY = K(t, [[0, 4], [24.7 - J, 4], [24.7, -0.08], [25.3, -0.08], [26.1, 1.5]]);
  const rigLifted = t >= 24.7 ? 1 : 0;
  return {
    t, padX, padY, cupX, etchInk, tacky, padInk, print, holes, fade, blur, smudge, haze, streak, fish, oil, cloth, clothX, clHaze, ringWorn,
    lint, padCut, newPad, tape, peel, peelBad, screw, visc, drain, seal, sweep, rigBlade, rigFill, rigTacky, rigPadY, rigLifted,
    warn: ss(37.0, 38.0, t) * (1 - ss(62.0, 62.4, t)),
  };
}
