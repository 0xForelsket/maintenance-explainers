// Heater bands + thermocouples — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 7.0, cut: 0 },
  { id: 'zones', label: 'Zones', t: 9.6, cut: 1 },
  { id: 'band', label: 'Heater band', t: 14.0, cut: 1 },
  { id: 'tc', label: 'Thermocouple', t: 17.0, cut: 1 },
  { id: 'control', label: 'Controller', t: 25.0, cut: 1 },
  { id: 'shear', label: 'Screw heat', t: 29.6, cut: 1 },
  { id: 'burnout', label: 'Burn-out', t: 35.8, cut: 1 },
  { id: 'tcout', label: 'TC backed out', t: 44.7, cut: 1 },
  { id: 'fix', label: 'The fix', t: 60.8, cut: 1 },
];

export const SV = [200, 215, 225, 230];
export const TC_J = (T) => 0.0527 * T + 0.3; // type J, roughly mV vs °C in this range

export function stateAt(t) {
  // per-band health: dead (burnt), loose (air gap), hot (overheated sheath)
  const dead1 = ss(36.3, 36.6, t) * (1 - ss(66.0, 66.2, t));
  const loose2 = ss(38.6, 39.4, t) * (1 - ss(68.0, 68.8, t));
  const fail2 = ss(41.4, 41.8, t) * (1 - ss(68.0, 68.8, t));
  const hot2 = pulse(39.4, 40.6, 41.3, 41.7, t);
  const tcOut3 = ss(44.8, 45.6, t) * (1 - ss(70.4, 71.2, t));
  const runaway3 = ss(48.4, 52.6, t) * (1 - ss(70.6, 72.0, t));
  const hot3 = ss(48.6, 52.0, t) * (1 - ss(70.6, 72.0, t));
  const arc = pulse(42.3, 42.4, 44.3, 44.5, t);
  const cooked = ss(42.5, 44.0, t) * (1 - ss(68.6, 68.8, t));
  // temperatures: zone 4 actual vs read
  const act4 = mix(230, 291, runaway3);
  const read4 = mix(230, 182, ss(45.0, 46.8, t) * (1 - ss(70.4, 71.2, t)));
  // controller output per zone (duty), with on/off pulsing for the healthy zones
  const duty = [0.38, 0.45, 0.42, 0.4];
  const out = duty.map((d, k) => {
    if (k === 1 && dead1 > 0.5) return 1;
    if (k === 3 && tcOut3 > 0.5) return 1;
    return d;
  });
  const on = out.map((o, k) => (o >= 0.99 ? 1 : (((t * 0.9 + k * 0.37) % 1) < o ? 1 : 0)));
  // glow per band (what you see on the coils)
  const glow = on.map((v, k) => {
    let g = v;
    if (k === 1) g *= 1 - dead1;
    if (k === 2) g = g * (1 - fail2) + hot2 * 1.4;
    if (k === 3) g = Math.max(g, 1.0 * (out[3] >= 0.99 ? 1 : 0));
    return g;
  });
  const sheathHot = [0, 0, hot2 * 1.0, hot3 * 0.75];
  // TC macro: the junction warms and the voltage climbs
  const tcHeat = ss(20.3, 23.8, t);
  const tcT = mix(25, 230, tcHeat);
  // display on the controller
  let ctrl = { zone: 'Z3', pv: 225 + 0.4 * Math.sin(t * 1.7), sv: 225, out: Math.round(out[2] * 100), alarm: 0 };
  if (t >= 45.0 && t < 53.0) ctrl = { zone: 'Z4', pv: read4, sv: 230, out: 100, alarm: 0 };
  if (t >= 53.0 && t < 60.7) ctrl = { zone: 'Z2', pv: 168 + 2 * ss(53, 60, t), sv: 215, out: 100, alarm: 1 };
  // lockout + test choreography
  const isolate = ss(61.3, 61.7, t);
  const padlock = ss(62.1, 62.6, t);
  const probes = pulse(63.7, 64.1, 65.6, 65.9, t);
  const clamp = pulse(65.8, 66.2, 67.6, 67.8, t);
  const wrench = pulse(67.8, 68.0, 69.2, 69.5, t);
  const pwr = 1 - pulse(61.3, 61.7, 65.6, 65.8, t) - pulse(67.6, 67.8, 69.9, 70.1, t);
  return {
    t, dead1, loose2, fail2, hot2, tcOut3, runaway3, hot3, arc, cooked, act4, read4, out, on, glow, sheathHot, tcHeat, tcT, mv: TC_J(tcT),
    ctrl, isolate, padlock, probes, clamp, wrench, pwr,
    warn: ss(36.0, 37.5, t) * (1 - ss(60.4, 61.0, t)),
  };
}
