// Oil-injected rotary screw compressor — story state as pure functions of t (Emma narration, 193.7 s).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const win = (a, b, x) => (x >= a && x < b ? 1 : 0);

export const CHAPTERS = [
  { id: 'airend', label: 'Air end & rotors', t: 15.9, cut: 1 },
  { id: 'compression', label: 'Compression', t: 30.9, cut: 1 },
  { id: 'oil', label: 'Oil injection', t: 45.6, cut: 1 },
  { id: 'separator', label: 'Separator tank', t: 60.4, cut: 1 },
  { id: 'oilcircuit', label: 'Oil circuit', t: 81.1, cut: 1 },
  { id: 'aftercooler', label: 'Aftercooler & drains', t: 90.3, cut: 1 },
  { id: 'energy', label: 'Where the power goes', t: 97.9, cut: 1 },
  { id: 'wear', label: 'Filters, coolers & oil', t: 107.0, cut: 1 },
  { id: 'leaks', label: 'Thermostat & leaks', t: 129.2, cut: 1 },
  { id: 'fix', label: 'The fix', t: 159.9, cut: 1 },
];

export function stateAt(t) {
  // which part of the machine the narration is on (for the flow diagram)
  const step = t < 30.8 ? (t < 15.8 ? -1 : 0) : t < 45.5 ? 1 : t < 60.2 ? 2 : t < 80.9 ? 3 : t < 90.2 ? 4 : t < 97.8 ? 5 : -1;
  // 'without help' (no oil): the grooves glow far hotter for a moment
  const dry = pulse(47.7, 48.3, 50.6, 51.1, t);
  // intake filter clogs → output falls; changed in the fix
  const filterDirt = ss(109.4, 111.2, t) * (1 - ss(164.6, 164.9, t));
  // coolers foul → discharge temperature climbs → high-temperature trip
  const coolerDirt = ss(113.6, 115.4, t) * (1 - ss(174.6, 177.2, t));
  const climb = ss(115.9, 118.7, t) * win(115.9, 119.45, t);
  const trip = win(118.75, 119.45, t);
  // old oil (varnish) and a tired separator (carry-over, rising pressure drop); renewed in the fix
  const oilAge = ss(119.5, 121.3, t) * (1 - ss(169.0, 169.6, t));
  const sepDirt = ss(122.5, 124.2, t) * (1 - ss(170.6, 170.9, t));
  const carry = ss(123.8, 124.6, t) * (1 - ss(128.9, 129.1, t)) + ss(151.0, 151.6, t) * (1 - ss(155.3, 155.5, t));
  // stuck thermostat: stuck open (all oil through the cooler, runs cold, water) then stuck shut (bypass, runs hot)
  const thermoCold = pulse(130.5, 131.1, 132.85, 133.0, t);
  const thermoHot = pulse(133.0, 133.4, 134.45, 134.65, t);
  const toCooler = mix3(0.6, 1.0, 0.0, thermoCold, thermoHot);
  // air network leaks (rig); found and fixed with the ultrasonic detector
  const leaks = ss(134.8, 135.6, t) * (1 - ss(141.85, 142.0, t)) + win(185.15, 187.9, t);
  const detector = pulse(185.3, 185.8, 187.8, 188.0, t);
  const leakFixed = ss(187.0, 187.3, t);
  // load / unload (inlet valve) — unload demo in the fix; heavier loading in the warning signs
  const load = 1 - pulse(179.8, 180.4, 182.0, 182.6, t);
  const running = trip ? 0 : 1;
  const output = running * load * (1 - 0.28 * filterDirt);
  // temperatures (discharge = air + oil leaving the air end), pressures
  const dischargeT = 84 + 5 * coolerDirt * (t < 119.45 ? 1 : 0) + 24 * climb + 12 * thermoHot - 18 * thermoCold - 4 * (1 - load) + 13 * win(142.4, 146.8, t);
  const oilT = dischargeT - 22;
  const sepDP = 0.2 + 0.6 * sepDirt;
  const pressure = (t > 188.3 ? 7.5 - 1.0 * ss(188.4, 189.6, t) : 7.5) - 0.6 * pulse(179.8, 180.6, 182.0, 182.8, t);
  // oil condition: 0 fresh amber · varnish/dark with age · milky with water · burnt when cooked
  const milky = thermoCold, burnt = thermoHot;
  // maintenance props
  const swapIntake = pulse(163.9, 164.5, 164.9, 165.6, t);
  const swapOilFilter = pulse(165.7, 166.2, 166.7, 167.4, t);
  const oilChange = pulse(168.7, 169.0, 169.4, 170.0, t);
  const swapSep = pulse(170.0, 170.5, 170.9, 171.6, t);
  const spray = pulse(174.3, 174.7, 177.0, 177.4, t);
  const glint = win(182.8, 184.5, t);
  const drain = Math.max(win(94.2, 95.6, t), win(151.6, 155.3, t), win(161.9, 163.1, t));
  return {
    t, step, dry, filterDirt, coolerDirt, climb, trip, oilAge, sepDirt, carry, thermoCold, thermoHot, toCooler, leaks, detector, leakFixed,
    load, running, output, dischargeT, oilT, sepDP, pressure, milky, burnt,
    swapIntake, swapOilFilter, oilChange, swapSep, spray, glint, drain,
    warn: ss(142.3, 142.9, t) * (1 - ss(159.3, 159.85, t)),
  };
}
function mix3(base, a, b, ka, kb) { return base + (a - base) * ka + (b - base) * kb; }
