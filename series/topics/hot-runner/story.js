// Hot runner — story state as pure functions of t (Emma narration, 209 s).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const win = (a, b, x) => (x >= a && x < b ? 1 : 0);
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; if (t < t1) return v0 + (v1 - v0) * ss(t0, t1, t); }
  return keys[keys.length - 1][1];
}
const J = 0.001;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 4.0, cut: 1 },
  { id: 'manifold', label: 'Sprue & manifold', t: 21.2, cut: 1 },
  { id: 'zones', label: 'Zones & control', t: 43.5, cut: 1 },
  { id: 'gates', label: 'Nozzle tips & gates', t: 52.6, cut: 1 },
  { id: 'seal', label: 'The thermal seal', t: 78.6, cut: 1 },
  { id: 'leak', label: 'Leaks', t: 103.9, cut: 1 },
  { id: 'heaters', label: 'Heaters & thermocouples', t: 120.8, cut: 1 },
  { id: 'gatefaults', label: 'Gate faults', t: 141.3, cut: 1 },
  { id: 'fix', label: 'The fix', t: 173.1, cut: 1 },
];

// one moulding cycle: fill → hold → cool → open → eject → close  (6 s)
function cycle(t, t0) {
  const u = (t - t0) / 6.0, ph = u - Math.floor(u), k = ph * 6.0;
  return { fill: ss(0.15, 1.3, k), open: pulse(4.2, 4.8, 5.4, 5.95, k), eject: ss(4.85, 5.45, k), gone: k > 5.45 ? 1 : 0, flow: pulse(0.1, 0.25, 1.25, 1.45, k) + 0.25 * pulse(1.3, 1.5, 2.3, 2.5, k), cool: ss(1.4, 4.4, k), ph };
}

export function stateAt(t) {
  // global run state: mould running (cycling) in the hook and the end, steady flow elsewhere
  let cyc = { fill: 1, open: 0, eject: 0, gone: 0, flow: 0.55, cool: 1, ph: 0.3 };
  if (t < 13.6) cyc = cycle(t, 0.2);
  else if (t >= 206.0) cyc = cycle(t, 206.0 - 0.5);
  // heat level of the hot half (1 = at set point) and thermal expansion (1 = sealed)
  const heat = K(t, [[0, 1], [83.6, 1], [83.6 + J, 0], [84.2, 0], [87.8, 1], [101.0, 1], [101.0 + J, 0.15], [104.0, 0.15], [106.0, 0.95], [173.0, 0.95], [173.0 + J, 0], [173.6, 0], [179.2, 1]]);
  const expand = K(t, [[0, 1], [83.6, 1], [83.6 + J, 0], [85.0, 0], [89.6, 1], [101.0, 1], [101.0 + J, 0], [112.2, 0], [112.2 + J, 1], [173.0, 1], [173.0 + J, 0], [175.2, 0], [179.4, 1]]);
  // heat-up sequence in the fix: manifold first, then nozzles
  let manHeat = t >= 173.0 && t < 180 ? ss(173.4, 176.6, t) : heat;
  let nozHeat = t >= 173.0 && t < 180 ? ss(175.6, 177.6, t) : heat;
  let exp2 = expand;
  if (t >= 90.6 && t < 101.0) { manHeat = ss(91.0, 97.1, t); nozHeat = ss(91.0, 91.7, t); exp2 = ss(91.2, 99.2, t); }   // time-lapse: 0 → 45 min
  const clock = t >= 90.6 && t < 100.5 ? 45 * ss(91.0, 100.2, t) : t >= 173.0 && t < 180.0 ? 45 * ss(173.2, 179.4, t) : t >= 101.0 && t < 112.3 ? 8 : 0;
  // leak (cold start) and its consequences
  const leak = ss(106.2, 111.2, t) * (1 - ss(120.4, 120.6, t));   // cleared at the strip-down
  const leakCool = ss(110.5, 114.0, t);
  const wireBreak = ss(114.0, 116.2, t) * (1 - ss(120.4, 120.6, t));
  const explode = pulse(116.8, 118.6, 119.8, 120.6, t);
  // heaters & thermocouples
  const moist = pulse(121.0, 121.6, 124.6, 125.2, t);
  const shortL = pulse(124.9, 125.0, 125.5, 126.4, t);
  const deadL = win(125.0, 128.1, t);
  const tcOut = ss(129.0, 130.6, t) * (1 - ss(134.9, 135.0, t));
  const overR = ss(130.4, 133.0, t) * (1 - ss(134.9, 135.0, t));
  const burnt = ss(131.5, 134.5, t) * (1 - ss(134.9, 135.0, t));
  const crossed = win(135.4, 141.2, t);
  // gate faults: mould opens to show drool / strings, then a frozen gate and a short cavity
  const gateOpen = pulse(141.6, 142.4, 144.6, 145.2, t);
  const drool = ss(142.0, 143.6, t) * (1 - ss(144.4, 144.9, t));
  const freeze = win(145.2, 148.1, t) * ss(145.4, 146.0, t);
  const shortShot = win(145.2, 148.1, t) + win(166.4, 168.7, t);
  const pinWear = win(148.1, 154.3, t) * ss(148.6, 150.2, t);
  const pinLeak = win(148.1, 154.3, t) * ss(150.6, 151.6, t);
  // warning signs
  const leakPower = win(154.3, 161.2, t);
  const unstable = win(161.2, 164.9, t);
  const vestige = win(164.9, 168.7, t);
  const weep = win(168.7, 172.9, t) * ss(169.0, 171.0, t);
  // the fix
  const soft = pulse(179.9, 180.3, 183.6, 184.0, t);
  const plates = win(184.4, 189.3, t);
  const meter = pulse(189.6, 190.0, 195.6, 196.0, t);
  const tags = ss(196.8, 198.0, t);
  const pinLift = pulse(201.0, 201.8, 204.6, 205.4, t);
  const clean = ss(202.6, 203.6, t);
  // valve gate pin: closed except while filling
  const pinOpen = t < 13.6 || t >= 206 ? pulse(0.02, 0.08, 0.8, 0.95, cyc.fill) : t >= 61 && t < 71 ? pulse(66.2, 66.6, 69.0, 69.4, t) : 0;
  return {
    t, ...cyc, heat: t >= 90.6 && t < 101 ? nozHeat : heat, expand: exp2, manHeat, nozHeat, clock, leak, leakCool, wireBreak, explode, moist, shortL, deadL, tcOut, overR, burnt, crossed,
    gateOpen, drool, freeze, shortShot, pinWear, pinLeak, leakPower, unstable, vestige, weep, soft, plates, meter, tags, pinLift, clean, pinOpen,
    warn: ss(101.0, 102.2, t) * (1 - ss(172.4, 173.0, t)),
  };
}
