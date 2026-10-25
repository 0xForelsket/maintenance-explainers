// Mould temperature controller (TCU) — story state as pure functions of t.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const mix = (a, b, t) => a + (b - a) * t;

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 7.2, cut: 0 },
  { id: 'inside', label: 'Inside the unit', t: 10.4, cut: 1 },
  { id: 'loop', label: 'Water loop', t: 16.4, cut: 1 },
  { id: 'control', label: 'Heat & cool', t: 27.0, cut: 1 },
  { id: 'scale', label: 'Scale & burn-out', t: 41.8, cut: 1 },
  { id: 'valve', label: 'Stuck valve', t: 46.4, cut: 1 },
  { id: 'leaks', label: 'Leaks', t: 53.2, cut: 1 },
  { id: 'fix', label: 'The fix', t: 65.0, cut: 1 },
];
export const SET = 60;

export function stateAt(t) {
  // moulding cycle: each shot dumps heat into the steel, which the water carries away
  const cyc = ((t % 5.2) + 5.2) % 5.2;
  const partHeat = cyc < 0.25 ? cyc / 0.25 : Math.exp(-(cyc - 0.25) / 1.6);
  // demo moves: too cold -> heater, too hot -> cooling valve
  const coldDemo = pulse(26.9, 27.1, 29.1, 29.3, t), hotDemo = pulse(29.3, 29.5, 34.3, 34.6, t);
  let water = SET + 0.25 * Math.sin(t * 0.9);
  water += coldDemo * mix(-2.4, -0.2, ss(27.1, 29.1, t)) + hotDemo * mix(2.4, 0.1, ss(30.2, 34.0, t));
  // failures
  const heaterScale = ss(41.8, 45.0, t) * (1 - ss(65.2, 67.2, t));
  const burnt = ss(45.3, 45.5, t) * (1 - ss(66.8, 67.0, t));
  const stuckShut = pulse(46.3, 46.6, 50.4, 50.6, t), stuckOpen = pulse(50.6, 50.8, 53.0, 53.2, t);
  water += stuckShut * 11.5 * ss(46.8, 50.2, t) - stuckOpen * 13 * ss(50.8, 52.8, t);
  // warning-sign swing
  const swing = pulse(57.2, 57.6, 60.0, 60.2, t);
  water += swing * 5.5 * Math.sin((t - 57.2) * 3.2);
  // cool-down before opening
  const cool = ss(79.0, 84.0, t);
  water = mix(water, 35, cool);
  const pressure = mix(3.4, 0, ss(80.5, 83.5, t));
  // heater + cooling valve duty (what the controller is doing)
  const heatDuty = coldDemo > 0.5 ? 1 : swing > 0.5 ? (Math.sin((t - 57.2) * 3.2) < 0 ? 1 : 0) : (((t * 0.7) % 1) < 0.28 ? 1 : 0);
  const coolDuty = hotDemo > 0.5 && t > 30.0 ? 1 : swing > 0.5 ? (Math.sin((t - 57.2) * 3.2) > 0 ? 1 : 0) : (((t * 0.7 + 0.5) % 1) < 0.22 ? 1 : 0);
  let valve = coolDuty * (1 - stuckShut);
  if (stuckOpen > 0.5) valve = 1;
  if (t > 72.4 && t < 74.5) valve = ((t - 72.4) % 1.0) < 0.5 ? 1 : 0;     // valve function test
  const heater = heatDuty * (1 - burnt) * (1 - cool) * (t > 46.3 && t < 53.2 ? 0 : 1);
  const mouldScale = Math.max(ss(41.8, 46.0, t), 0) * (1 - ss(67.6, 69.8, t));
  // leaks and the fix choreography
  const drip = pulse(53.0, 53.3, 64.6, 64.9, t);
  const puddle = ss(53.2, 63.0, t) * (1 - ss(64.8, 65.2, t));
  const crack = pulse(55.0, 55.3, 64.6, 64.9, t);
  const strainer = pulse(70.3, 70.9, 72.0, 72.4, t), strainerClean = ss(71.3, 71.6, t);
  const sweep = ss(74.6, 76.3, t);
  const otTest = pulse(76.6, 76.8, 78.2, 78.4, t);
  const alarm = pulse(60.3, 60.4, 62.2, 62.4, t);
  return {
    t, partHeat, water, heater, valve, heaterScale, burnt, stuckShut, stuckOpen, swing, cool, pressure, mouldScale,
    drip, puddle, crack, strainer, strainerClean, sweep, otTest, alarm,
    mouldTemp: water + 1.5 + 2.5 * partHeat * 0.3,
    warn: ss(41.6, 43.0, t) * (1 - ss(64.4, 65.0, t)),
  };
}
