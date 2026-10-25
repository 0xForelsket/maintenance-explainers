// Air-cooled water chiller — story state as pure functions of t (Emma narration, 198.6 s).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const win = (a, b, x) => (x >= a && x < b ? 1 : 0);

export const AMBIENT = 32;   // °C outside air (tropical plant)
export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 15.4, cut: 1 },
  { id: 'evaporator', label: 'Evaporator', t: 28.6, cut: 1 },
  { id: 'compressor', label: 'Compressor', t: 46.8, cut: 1 },
  { id: 'condenser', label: 'Condenser', t: 54.7, cut: 1 },
  { id: 'expansion', label: 'Expansion valve', t: 63.2, cut: 1 },
  { id: 'gauges', label: 'Gauges', t: 79.5, cut: 1 },
  { id: 'fouling', label: 'Fouled coils & exchanger', t: 107.2, cut: 1 },
  { id: 'leaks', label: 'Leaks & low flow', t: 130.2, cut: 1 },
  { id: 'fix', label: 'The fix', t: 163.9, cut: 1 },
];

export function stateAt(t) {
  // which part of the loop the narration is on (for highlights / the cycle diagram)
  const step = t < 28.5 ? -1 : t < 46.7 ? 0 : t < 54.5 ? 1 : t < 63.0 ? 2 : t < 79.4 ? 3 : -1;
  // condenser fouling → condensing temperature climbs → high-pressure trip
  const foulCond = ss(107.4, 115.2, t) * (1 - ss(170.0, 172.6, t));
  const trip = win(117.4, 121.4, t) * ss(117.4, 117.6, t);
  // evaporator fouling (scale) → approach opens
  const foulEvap = ss(122.0, 128.6, t) * (1 - ss(175.6, 177.6, t));
  // refrigerant leak → starved evaporator, bubbles in the sight glass
  const leak = ss(130.4, 133.0, t) * (1 - ss(185.0, 190.4, t));
  const bubbles = Math.max(ss(131.0, 132.0, t) * (1 - ss(137.6, 137.8, t)), win(158.4, 160.2, t), ss(185.4, 186.4, t) * (1 - ss(189.6, 190.4, t)));
  // low water flow → evaporator freezes → splits
  const strainer = ss(138.4, 140.6, t) * (1 - ss(176.0, 177.4, t));
  const freeze = ss(140.6, 143.4, t) * (1 - ss(144.95, 145.0, t));
  const crack = ss(143.6, 144.0, t) * (1 - ss(144.95, 145.0, t));
  const waterFlow = 1 - 0.75 * ss(138.6, 141.0, t) * (1 - ss(144.9, 145.0, t));
  // compressor running? (stops on the HP trip and after the split)
  const running = trip > 0.5 || (t >= 143.8 && t < 145.0) ? 0 : 1;
  const capacity = running * (1 - 0.45 * leak) * (1 - 0.3 * foulEvap);
  // temperatures
  const cond = 45 + 14 * foulCond + 4 * pulse(150.0, 151.0, 154.0, 154.5, t) - (t >= 150 && t < 154.5 ? 0 : 0);
  const evap = 3 - 3.5 * foulEvap - 4 * leak - 3 * ss(139.0, 141.0, t) * (1 - ss(144.9, 145.0, t));
  const approach = 3 + 4 * foulEvap;
  const superheat = 6 + 10 * leak - 3 * ss(139, 141, t) * (1 - ss(144.9, 145, t));
  const waterOut = 7 + 1.6 * foulEvap + 2.6 * leak + 1.2 * foulCond + (running ? 0 : 3 * ss(117.6, 121, t));
  const waterIn = waterOut + 5 * (running ? capacity : 0.2);
  const compHot = Math.max(t < 117.4 ? 0.6 * foulCond : 0, t < 145.7 ? leak : 0, 0.2);
  // fix-section props
  const spray = pulse(169.0, 169.4, 172.4, 172.8, t);
  const basket = pulse(175.0, 175.6, 177.6, 178.2, t);
  const check = pulse(178.8, 179.2, 184.0, 184.4, t);
  const detector = pulse(185.0, 185.5, 190.2, 190.6, t);
  const flowTest = pulse(191.2, 191.6, 194.8, 195.2, t);
  const frost = win(158.4, 163.2, t) * ss(159.6, 160.6, t);
  const oilStain = win(160.4, 163.2, t) + win(185.0, 190.6, t);
  return {
    t, step, foulCond, trip, foulEvap, leak, bubbles, strainer, freeze, crack, waterFlow, running, capacity, cond, evap, approach, superheat, waterOut, waterIn, compHot,
    spray, basket, check, detector, flowTest, frost, oilStain,
    warn: ss(103.8, 105.0, t) * (1 - ss(163.2, 163.9, t)),
  };
}
