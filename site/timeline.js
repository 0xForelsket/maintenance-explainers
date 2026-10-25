// Story timeline shared by the video and the interactive page. All state is a pure function of t (seconds).
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lin = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));

export const T = {
  cutStart: 9.15, cutEnd: 10.75,
  heroImpact: [17.45, 17.95, 18.45],
  clogA: 19.6, clogB: 25.8, clogC: 28.4, clogD: 34.0,
  valveOpen: [38.3, 38.85],
  flushEnd: 42.2,
  valveClose: [44.0, 44.6],
  end: 50.0,
};

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 5.2 },
  { id: 'inside', label: 'Inside', t: 11.3 },
  { id: 'capture', label: 'Capture', t: 16.9 },
  { id: 'collect', label: 'Collects', t: 20.6 },
  { id: 'clog', label: 'Clogging', t: 28.6 },
  { id: 'blowdown', label: 'Blowdown', t: 37.8 },
  { id: 'restored', label: 'Restored', t: 44.6 },
];

export function clogAt(t) {
  let c = 0;
  if (t > T.clogA) c = 0.12 * lin(T.clogA, T.clogB, t);
  if (t > T.clogB) c = 0.12 + 0.6 * ss(T.clogB, T.clogC, t);
  if (t > T.clogC) c = 0.72 + 0.28 * ss(T.clogC, T.clogD, t);
  if (t > T.valveOpen[1] - 0.1) c = 1 - 0.96 * ss(T.valveOpen[1] - 0.1, T.flushEnd, t);
  return c;
}
export function valveAt(t) {
  return ss(T.valveOpen[0], T.valveOpen[1], t) * (1 - ss(T.valveClose[0], T.valveClose[1], t));
}
export function flowAt(t) {
  const c = clogAt(t);
  return 1 - 0.78 * Math.pow(c, 1.25);
}

// integral of flow factor -> "flow clock" so particle motion slows smoothly when clogged
const DT = 0.01, TAU = [0];
for (let i = 1; i <= 7000; i++) TAU.push(TAU[i - 1] + flowAt((i - 0.5) * DT) * DT);
export function tauAt(t) {
  if (t <= 0) return t;
  const f = t / DT, i = Math.floor(f);
  if (i >= TAU.length - 1) return TAU[TAU.length - 1] + (t - (TAU.length - 1) * DT);
  return TAU[i] + (TAU[i + 1] - TAU[i]) * (f - i);
}

export function stateAt(t) {
  const clog = clogAt(t);
  const valve = valveAt(t);
  return {
    t,
    cut: ss(T.cutStart, T.cutEnd, t),
    clog,
    flow: flowAt(t),
    tau: tauAt(t),
    valve,
    p1: 4.0 + 0.45 * clog - 0.55 * valve,
    p2: 3.75 - 2.35 * Math.pow(clog, 1.1) - 0.35 * valve,
    warn: ss(29.0, 34.0, t) * (1 - ss(39.5, 43.0, t)),
  };
}
