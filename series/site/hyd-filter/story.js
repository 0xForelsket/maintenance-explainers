// Hydraulic return-line filter — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 6.6, cut: 0 },
  { id: 'return', label: 'Return line', t: 12.6, cut: 1 },
  { id: 'element', label: 'Pleated element', t: 17.6, cut: 1 },
  { id: 'flow', label: 'Outside in', t: 21.2, cut: 1 },
  { id: 'bypass', label: 'Bypass & indicator', t: 25.8, cut: 1 },
  { id: 'loading', label: 'Loading up', t: 33.6, cut: 1 },
  { id: 'bypassing', label: 'In bypass', t: 38.4, cut: 1 },
  { id: 'fix', label: 'Element change', t: 54.8, cut: 1 },
];

export const BYPASS_AT = 3.0;
export function stateAt(t) {
  const swapAt = 57.0;
  const fresh = t >= swapAt;
  // element loading: light film early on, time-lapse 33.6-37.6 to fully loaded
  const load = fresh ? 0.0 : 0.12 + 0.88 * ss(33.6, 37.6, t);
  const bypass = ss(37.9, 38.5, t) * (1 - ss(54.9, 55.3, t));
  const flow = 1 - pulse(54.8, 55.3, 58.6, 59.2, t);
  const dpRaw = 0.35 + 2.85 * load;
  const dp = Math.min(dpRaw, BYPASS_AT + 0.12 * bypass) * flow;
  // element change choreography
  const lidUp = ss(55.3, 55.7, t) * (1 - ss(58.5, 58.9, t));
  const lidSide = ss(55.6, 56.0, t) * (1 - ss(58.1, 58.5, t));
  const elUp = ss(56.0, 56.6, t) * (1 - ss(57.5, 58.1, t));
  const elSide = ss(56.5, 56.95, t) * (1 - ss(57.05, 57.5, t));
  // section "slice" through the element: lowers to reveal the pleats
  const sliceY = mix(0.05, -1.4, ss(15.8, 17.4, t));
  // spool valve (macro rig): smooth shifting in the hook, jams at ~45 s
  let spool = 0.3 * Math.sin(t * 0.9), wedge = 0;
  if (t > 43.5) {
    const k = ss(44.75, 45.05, t);
    spool = mix(-0.3, 0.1, k) + (t > 45.05 ? 0.012 * Math.sin(t * 61) * pulse(45.05, 45.15, 46.2, 46.4, t) : 0);
    wedge = 1;
  }
  const sparks = pulse(43.0, 43.2, 44.4, 44.6, t);
  // oil sample: dirty during warning signs, clean after the fix
  const sampleDirt = 1 - ss(60.0, 61.0, t);
  const iso = sampleDirt > 0.5 ? [17 + Math.round(4 * ss(51.8, 53.6, t)), 15 + Math.round(4 * ss(51.8, 53.6, t)), 12 + Math.round(4 * ss(51.8, 53.6, t))] : [16, 14, 11];
  return {
    t, load, bypass, flow, dp, lidUp, lidSide, elUp, elSide, fresh, sliceY, spool, wedge, sparks, sampleDirt, iso,
    week: Math.round(26 * ss(33.6, 37.6, t)),
    noisy: pulse(49.5, 49.7, 51.3, 51.5, t),
    oring: pulse(62.0, 62.4, 64.0, 64.3, t),
    dirtyOil: Math.max(bypass, 0.0),
    warn: ss(40.2, 42.0, t) * (1 - ss(54.4, 55.0, t)),
  };
}
