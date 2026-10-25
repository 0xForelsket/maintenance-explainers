// Cooling tower story state — pure functions of t (seconds), shared by the video and the interactive page.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const CHAPTERS = [
  { id: 'overview', label: 'Overview', t: 5.0, cut: 0 },
  { id: 'spray', label: 'Spray & fill', t: 10.4, cut: 1 },
  { id: 'air', label: 'Airflow', t: 14.2, cut: 1 },
  { id: 'evap', label: 'Evaporation', t: 16.4, cut: 1 },
  { id: 'minerals', label: 'Minerals', t: 25.6, cut: 1 },
  { id: 'dirt', label: 'Dust & algae', t: 30.6, cut: 1 },
  { id: 'scale', label: 'Scale', t: 41.5, cut: 1 },
  { id: 'fix', label: 'The fix', t: 54.9, cut: 1 },
];

export function stateAt(t) {
  const minerals = 0.15 + 0.85 * ss(24.8, 37.2, t) - 0.68 * ss(55.2, 58.2, t);
  const dirt = ss(29.6, 37.2, t) * (1 - 0.92 * ss(61.4, 65.0, t));
  const algae = ss(31.6, 37.2, t) * (1 - ss(58.4, 61.0, t));
  const scale = ss(38.8, 46.6, t) * (1 - ss(65.6, 67.4, t));
  const bleed = ss(54.9, 55.5, t) * (1 - ss(57.6, 58.2, t));
  const makeup = ss(55.4, 56.0, t) * (1 - ss(58.0, 58.6, t));
  const dosing = ss(58.3, 58.7, t) * (1 - ss(60.6, 61.1, t));
  const filter = ss(61.3, 61.8, t) * (1 - ss(64.6, 65.2, t));
  const evap = ss(15.9, 16.6, t) * (1 - ss(19.8, 20.4, t)) + ss(24.4, 25.0, t) * (1 - ss(28.9, 29.4, t));
  const dustAir = ss(29.3, 29.9, t) * (1 - ss(36.6, 37.4, t));
  const cycles = 2.6 + 7.0 * (minerals - 0.15) / 0.85;
  return {
    t, minerals, dirt, algae, scale, bleed, makeup, dosing, filter, evap, dustAir,
    cycles, cond: 250 * cycles,
    mouldTemp: 45 + 15 * scale, cycleTime: 18.0 + 3.8 * scale,
    hotTemp: 34.0, coldTemp: 29.0 + 0.6 * dirt,
    week: Math.max(1, Math.round(1 + 11 * ss(34.4, 37.4, t))),
    warn: ss(41.0, 45.0, t) * (1 - ss(54.6, 58.0, t)),
  };
}
