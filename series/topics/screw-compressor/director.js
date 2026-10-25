// Oil-injected screw compressor — 16:9 deep dive. Shots, labels, panels, HUD and cards; times follow timeline.json (Emma).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.35, b, t));

export const TOTAL = 193.66;
export const TITLE = { big: 'SCREW COMPRESSOR', sub: 'rotors, oil and air, step by step', t0: 12.99, t1: 15.7 };
export const END = { big: 'SCREW COMPRESSOR', a: 'Less pressure.', b: 'Less power.', t0: 191.2 };
export const CHAPTERS = [
  { t: 15.85, label: 'HOW IT WORKS', sub: 'Air end, oil, separator and coolers' },
  { t: 106.95, label: 'WHAT GOES WRONG', sub: 'Filters, coolers, oil and leaks' },
  { t: 142.55, label: 'WARNING SIGNS', sub: 'What the readings tell you' },
  { t: 159.9, label: 'THE FIX', sub: 'Checks, changes and the set pressure' },
];
const RR = [40, 0, 0], NN = [60, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, extra.fov || 36], [1, p1, g1, extra.fov || 36]], ez: 'lin', ...extra });
const HMI = [[-3.05, 1.3, 1.55], [-3.65, 1.08, -0.74], [-3.15, 1.25, 1.35], [-3.65, 1.08, -0.74]];
export const SHOTS = [
  k2('S1', 0, 8.5, [8.4, 2.6, 13.0], [0.2, -0.2, 0], [7.0, 2.2, 11.6], [0.2, -0.2, 0], { shift: -0.1 }),
  k2('S2', 8.5, 12.95, [4.8, 1.7, 13.6], [0.3, -0.2, 0], [3.0, 1.2, 13.0], [0.3, -0.2, 0]),
  k2('S3', 12.95, 15.75, [2.2, 1.0, 13.8], [0.3, -0.2, 0], [1.6, 0.9, 13.2], [0.3, -0.2, 0]),
  k2('S4', 15.75, 22.85, [-0.7, -0.5, 3.9], [-1.45, -1.2, 0], [-0.9, -0.6, 3.5], [-1.45, -1.2, 0], { shift: 0.15 }),
  k2('S5', 22.85, 30.8, [-2.2, -0.1, 5.0], [-2.7, -0.95, 0], [-1.5, -0.35, 4.3], [-1.75, -1.1, 0], { shift: 0.15 }),
  k2('S6', 30.8, 36.6, [-1.15, 0.95, 4.3], [-1.95, 0.3, 0], [-1.3, 0.25, 3.9], [-1.95, -0.35, 0], { shift: 0.15 }),
  k2('S7', 36.6, 45.4, at(RR, [1.1, 2.2, 10.8]), at(RR, [0.2, 0.15, 0]), at(RR, [0.7, 1.8, 9.8]), at(RR, [0.2, 0.15, 0]), { shift: 0.15 }),
  k2('S8', 45.4, 51.1, [-0.4, -0.55, 3.9], [-1.4, -1.22, 0], [-0.55, -0.7, 3.5], [-1.4, -1.22, 0], { shift: -0.12 }),
  k2('S9', 51.1, 60.2, at(RR, [0.9, 3.4, 10.0]), at(RR, [0.3, 0.6, 0]), at(RR, [0.6, 3.0, 8.9]), at(RR, [0.3, 0.5, 0]), { shift: 0.15 }),
  k2('S10', 60.2, 65.9, [0.9, -0.3, 5.4], [0.5, -1.0, 0], [1.2, -0.25, 4.9], [0.9, -0.9, 0], { shift: -0.12 }),
  k2('S11', 65.9, 73.3, [2.3, -0.2, 4.2], [1.35, -0.55, 0], [2.3, 0.1, 3.8], [1.35, -0.3, 0], { shift: 0.15 }),
  k2('S12', 73.3, 80.9, [2.0, 1.7, 4.0], [1.5, 1.05, 0], [2.7, 1.6, 4.4], [2.3, 1.1, 0], { shift: -0.12 }),
  k2('S13', 80.9, 90.2, [1.5, 0.4, 8.4], [1.45, -0.25, 0], [1.7, 0.3, 7.8], [1.5, -0.25, 0], { shift: 0.15 }),
  k2('S14', 90.2, 97.8, [4.0, 0.7, 4.6], [3.9, 0.2, 0], [4.7, 0.0, 4.0], [4.55, -0.45, 0], { shift: -0.12 }),
  k2('S15', 97.8, 106.85, [0.8, 1.9, 15.2], [0.5, 0.2, 0], [0.6, 1.6, 14.0], [0.5, 0.2, 0], { shift: 0.15 }),
  k2('S16', 106.85, 109.05, [0.4, 0.9, 15.4], [0.3, -0.1, 0], [0.3, 0.8, 14.4], [0.3, -0.1, 0]),
  k2('S17', 109.05, 113.45, [-1.2, 1.0, 3.8], [-1.95, 0.55, 0], [-1.35, 0.9, 3.4], [-1.95, 0.55, 0], { shift: -0.12 }),
  k2('S18a', 113.45, 116.0, [4.9, 0.5, 5.4], [3.5, 0.05, 0], [4.6, 0.4, 4.9], [3.5, 0.05, 0], { shift: -0.12 }),
  k2('S18b', 116.0, 119.45, ...HMI, { shift: -0.12 }),
  k2('S19', 119.45, 122.4, at(RR, [1.2, 1.8, 10.0]), at(RR, [-0.2, 0.2, 0]), at(RR, [1.0, 1.6, 9.2]), at(RR, [-0.2, 0.2, 0]), { shift: -0.12 }),
  k2('S20', 122.4, 129.15, [2.3, 0.4, 4.2], [1.4, 0.25, 0], [2.6, 0.9, 4.6], [2.0, 0.85, 0], { shift: -0.12 }),
  k2('S21', 129.15, 134.65, [2.7, -0.75, 3.7], [1.9, -1.6, 0], [2.6, -0.85, 3.3], [1.9, -1.65, 0], { shift: -0.12 }),
  k2('S22', 134.65, 142.45, at(NN, [0.6, 0.8, 10.4]), at(NN, [0, -0.1, 0]), at(NN, [0.2, 0.6, 9.4]), at(NN, [0, -0.1, 0]), { shift: -0.12 }),
  k2('S23', 142.45, 146.75, ...HMI, { shift: 0.06 }),
  k2('S24', 146.75, 150.85, [2.3, 0.7, 4.3], [1.4, 0.35, 0], [2.4, 0.6, 3.9], [1.4, 0.35, 0], { shift: 0.06 }),
  k2('S25', 150.85, 155.55, [5.3, -0.9, 3.0], [4.6, -1.35, 0], [5.25, -1.0, 2.7], [4.6, -1.4, 0], { shift: 0.06 }),
  k2('S26', 155.55, 159.85, [-2.9, 1.35, 1.8], [-3.65, 1.08, -0.74], [-3.0, 1.3, 1.6], [-3.65, 1.08, -0.74], { shift: 0.06 }),
  k2('S27', 159.85, 163.55, [-2.9, 1.35, 1.8], [-3.65, 1.08, -0.74], [-3.0, 1.3, 1.55], [-3.65, 1.08, -0.74], { shift: 0.12 }),
  k2('S28', 163.55, 168.45, [-0.55, 1.7, 5.8], [-0.75, 0.95, 0], [-0.6, 1.6, 5.3], [-0.75, 0.95, 0], { shift: 0.08 }),
  k2('S29', 168.45, 174.05, [2.6, 0.2, 6.0], [1.5, -0.6, 0], [2.5, 0.35, 5.5], [1.5, -0.45, 0], { shift: 0.08 }),
  k2('S30', 174.05, 178.35, [5.6, 2.2, 7.4], [3.4, 1.0, 0], [5.2, 2.4, 6.8], [3.4, 1.25, 0], { shift: 0.06 }),
  k2('S31a', 178.35, 182.25, [-1.2, 0.35, 3.6], [-1.95, -0.3, 0], [-1.3, 0.3, 3.3], [-1.95, -0.3, 0], { shift: 0.06 }),
  k2('S31b', 182.25, 185.15, [-1.9, -0.35, 2.7], [-2.53, -0.95, 0], [-2.0, -0.4, 2.45], [-2.53, -0.95, 0], { shift: 0.06 }),
  k2('S32', 185.15, 188.05, at(NN, [-1.9, 0.3, 4.2]), at(NN, [-2.6, -0.6, 0]), at(NN, [-2.0, 0.15, 3.6]), at(NN, [-2.6, -0.7, 0]), { shift: 0.06 }),
  k2('S33', 188.05, 191.15, [-2.9, 1.35, 1.8], [-3.65, 1.08, -0.74], [-3.05, 1.3, 1.5], [-3.65, 1.08, -0.74], { shift: 0.06 }),
  k2('S34', 191.15, 197, [0.6, 0.9, 13.8], [0.3, -0.1, 0], [3.8, 2.4, 17.0], [0.3, 0, 0], { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': return { cut: 0 };
    case 'S2': return { cut: ss(9.6, 12.2, t) };
    case 'S34': return { cut: 1 - ss(191.7, 193.1, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.4 + 0.6 * ss(12.95, 13.55, t);
  return { exposure };
}

export const LABELS = [
  { text: 'COOLING AIR OUT', sub: 'most of the input power, as heat', anchor: 'heatOut', t0: 5.0, t1: 8.45, dx: -120, dy: -90 },
  { text: 'AIR END', anchor: 'airEnd', t0: 16.5, t1: 22.8, dx: 110, dy: -90 },
  { text: 'MALE ROTOR', sub: '4 lobes', anchor: 'male', t0: 18.9, t1: 22.8, dx: 120, dy: -60 },
  { text: 'FEMALE ROTOR', sub: '6 flutes', anchor: 'female', t0: 20.8, t1: 22.8, dx: 120, dy: 80 },
  { text: 'MOTOR', anchor: 'motor', t0: 23.1, t1: 30.75, dx: -100, dy: -90 },
  { text: 'COUPLING', anchor: 'coupling', t0: 23.6, t1: 30.75, dx: 60, dy: -130 },
  { text: 'OIL FILM', sub: 'no metal contact', anchor: 'mesh', t0: 27.5, t1: 30.75, dx: 120, dy: 90 },
  { text: 'INTAKE FILTER', anchor: 'intakeFilter', t0: 32.2, t1: 36.55, dx: -140, dy: -60 },
  { text: 'INLET VALVE', anchor: 'inletValve', t0: 33.1, t1: 36.55, dx: 120, dy: 40 },
  { text: 'TRAPPED', sub: 'a pocket between the lobes', anchor: 'pocketIn', t0: 34.4, t1: 36.55, dx: 110, dy: 90 },
  { text: 'POCKET', anchor: 'rigPocketIn', t0: 38.5, t1: 45.35, dx: -80, dy: -140 },
  { text: 'SHRINKS', anchor: 'rigPocketOut', t0: 40.0, t1: 45.35, dx: -60, dy: -150 },
  { text: 'OUTLET', sub: '7–10 bar', anchor: 'rigOutlet', t0: 41.9, t1: 45.35, dx: -40, dy: 120 },
  { text: 'HEAT OF COMPRESSION', anchor: 'pocketOut', t0: 46.9, t1: 51.05, dx: -150, dy: -120, tone: 'bad' },
  { text: 'OIL INJECTION', anchor: 'rigOil', t0: 51.8, t1: 60.15, dx: 110, dy: -90 },
  { text: 'SEALS THE GAPS', anchor: 'rigMesh', t0: 55.1, t1: 60.15, dx: -120, dy: 110 },
  { text: 'BEARINGS', anchor: 'rigBearing', t0: 57.3, t1: 60.15, dx: 60, dy: -120 },
  { text: 'SOAKS UP THE HEAT', anchor: 'rigPocketOut', t0: 58.9, t1: 60.15, dx: 80, dy: 120 },
  { text: 'AIR + OIL', sub: '80–90 °C', anchor: 'discharge', t0: 61.0, t1: 65.85, dx: -110, dy: -100 },
  { text: 'SEPARATOR TANK', anchor: 'tank', t0: 64.7, t1: 65.85, dx: 110, dy: 80 },
  { text: 'SWIRL', anchor: 'swirl', t0: 66.6, t1: 73.25, dx: -90, dy: -110 },
  { text: 'OIL DROPS OUT', anchor: 'sump', t0: 68.7, t1: 73.25, dx: 110, dy: 70 },
  { text: 'SEPARATOR ELEMENT', sub: 'catches the mist', anchor: 'element', t0: 70.9, t1: 73.25, dx: 120, dy: -80 },
  { text: 'MINIMUM PRESSURE VALVE', anchor: 'mpv', t0: 73.6, t1: 80.85, dx: -120, dy: -100 },
  { text: 'TO THE AFTERCOOLER', anchor: 'afterCooler', t0: 79.7, t1: 80.85, dx: 60, dy: -120 },
  { text: 'OIL COOLER', anchor: 'oilCooler', t0: 82.4, t1: 90.15, dx: 90, dy: 90 },
  { text: 'THERMOSTATIC VALVE', anchor: 'thermoValve', t0: 83.4, t1: 90.15, dx: -60, dy: 110 },
  { text: 'OIL FILTER', anchor: 'oilFilter', t0: 84.8, t1: 90.15, dx: 100, dy: -80 },
  { text: 'BACK TO THE AIR END', anchor: 'injection', t0: 85.4, t1: 90.15, dx: -60, dy: -120 },
  { text: 'AFTERCOOLER', anchor: 'afterCooler', t0: 90.5, t1: 97.75, dx: -110, dy: -90 },
  { text: 'MOISTURE SEPARATOR', anchor: 'moistSep', t0: 93.4, t1: 97.75, dx: -150, dy: 40 },
  { text: 'AUTO DRAIN', anchor: 'drain', t0: 94.3, t1: 97.75, dx: -110, dy: 100 },
  { text: 'TO DRYER + FILTERS', anchor: 'airOut', t0: 95.9, t1: 97.75, dx: -40, dy: -130 },
  { text: 'HEAT OUT', sub: 'oil cooler, aftercooler, motor', anchor: 'heatOut', t0: 99.4, t1: 101.9, dx: -110, dy: -70, tone: 'bad' },
  { text: 'CLOGGED INTAKE FILTER', anchor: 'intakeFilter', t0: 110.1, t1: 113.4, dx: -150, dy: -90, tone: 'bad' },
  { text: 'DIRTY COOLER', anchor: 'oilCooler', t0: 113.9, t1: 115.95, dx: -130, dy: 100, tone: 'bad' },
  { text: 'DISCHARGE TEMP', anchor: 'hmi', t0: 116.3, t1: 118.7, dx: 150, dy: 150, tone: 'bad' },
  { text: 'HIGH TEMP TRIP', anchor: 'hmi', t0: 118.75, t1: 119.4, dx: 150, dy: 150, tone: 'bad' },
  { text: 'VARNISH', anchor: 'rigMale', t0: 121.2, t1: 122.35, dx: -120, dy: -100, tone: 'bad' },
  { text: 'TIRED ELEMENT', anchor: 'element', t0: 122.9, t1: 129.1, dx: -130, dy: 100, tone: 'bad' },
  { text: 'OIL CARRY-OVER', sub: 'into the air lines', anchor: 'mpv', t0: 124.0, t1: 129.1, dx: 90, dy: -110, tone: 'bad' },
  { text: 'STUCK THERMOSTAT', anchor: 'thermoValve', t0: 129.6, t1: 134.6, dx: 90, dy: -120, tone: 'bad' },
  { text: 'WATER IN THE OIL', anchor: 'sump', t0: 131.9, t1: 132.95, dx: -150, dy: -90, tone: 'bad' },
  { text: 'OIL COOKING', anchor: 'sump', t0: 133.6, t1: 134.6, dx: -150, dy: -90, tone: 'bad' },
  { text: 'LEAK', sub: 'quick coupler', anchor: 'netLeak1', t0: 135.0, t1: 142.4, dx: -100, dy: 90, tone: 'bad' },
  { text: 'LEAK', sub: 'threaded joint', anchor: 'netLeak2', t0: 135.7, t1: 142.4, dx: 90, dy: -90, tone: 'bad' },
  { text: 'LEAK', sub: 'split hose', anchor: 'netLeak3', t0: 136.4, t1: 142.4, dx: 90, dy: 90, tone: 'bad' },
  { text: 'DISCHARGE TEMP', anchor: 'hmi', t0: 144.0, t1: 146.7, dx: 120, dy: 160, tone: 'bad' },
  { text: 'SEPARATOR ΔP', anchor: 'element', t0: 147.9, t1: 150.8, dx: 110, dy: 120, tone: 'bad' },
  { text: 'OILY CONDENSATE', anchor: 'drain', t0: 151.7, t1: 155.5, dx: -130, dy: 100, tone: 'bad' },
  { text: 'MOTOR LOAD', anchor: 'hmi', t0: 156.6, t1: 159.8, dx: 120, dy: 160, tone: 'bad' },
  { text: 'DAILY READINGS', anchor: 'hmi', t0: 160.1, t1: 163.5, dx: 120, dy: 160 },
  { text: 'NEW INTAKE ELEMENT', anchor: 'intakeFilter', t0: 165.1, t1: 168.4, dx: -60, dy: -140 },
  { text: 'NEW OIL FILTER', anchor: 'oilFilter', t0: 166.9, t1: 168.4, dx: 110, dy: 80 },
  { text: 'FRESH OIL', anchor: 'sump', t0: 169.8, t1: 174.0, dx: 120, dy: 60 },
  { text: 'NEW ELEMENT', anchor: 'element', t0: 171.2, t1: 174.0, dx: 120, dy: -80 },
  { text: 'CLEAN THE COOLERS', anchor: 'oilCooler', t0: 174.6, t1: 178.3, dx: -60, dy: 120 },
  { text: 'HOT AIR DUCTED OUT', anchor: 'duct', t0: 176.4, t1: 178.3, dx: -150, dy: -40 },
  { text: 'INLET VALVE CLOSES', sub: 'unloaded', anchor: 'inletValve', t0: 180.0, t1: 182.2, dx: 120, dy: -80 },
  { text: 'COUPLING', anchor: 'coupling', t0: 182.7, t1: 185.1, dx: 110, dy: -90 },
  { text: 'ULTRASONIC DETECTOR', anchor: 'detector', t0: 186.0, t1: 188.0, dx: 110, dy: -90 },
  { text: 'LEAK TAGGED', anchor: 'netLeak1', t0: 186.8, t1: 188.0, dx: -120, dy: 90 },
  { text: 'SET PRESSURE', anchor: 'hmi', t0: 188.4, t1: 191.1, dx: 120, dy: 160 },
];

// ---------------------------------------------------------------- panels (left / right)
const MPROF = (th) => 0.2 + 0.11 * Math.pow((1 + Math.cos(4 * th)) / 2, 2.0);
const FPROF = (th) => 0.36 - 0.11 * Math.pow((1 + Math.cos(6 * th)) / 2, 1.3);
function rotorSVG(t) {
  const W = 548, H = 270, S = 340, cy = 128, cm = 274 - 0.28 * S, cf = 274 + 0.28 * S;
  const a = t * 1.4;
  const path = (prof, cx, rot) => { let d = ''; for (let i = 0; i <= 160; i++) { const th = (i / 160) * Math.PI * 2, r = prof(th) * S, q = th + rot; d += `${i ? 'L' : 'M'}${(cx + Math.cos(q) * r).toFixed(1)},${(cy + Math.sin(q) * r).toFixed(1)}`; } return d + 'Z'; };
  return `<svg width="${W}" height="${H}" style="display:block">
    <circle cx="${cm}" cy="${cy}" r="${0.325 * S}" fill="rgba(79,195,255,0.10)" stroke="rgba(255,255,255,0.25)" stroke-dasharray="5 5"/><circle cx="${cf}" cy="${cy}" r="${0.375 * S}" fill="rgba(79,195,255,0.10)" stroke="rgba(255,255,255,0.25)" stroke-dasharray="5 5"/>
    <path d="${path(MPROF, cm, -a)}" fill="#b8c0c8" stroke="#ffffff" stroke-width="1.5"/>
    <path d="${path(FPROF, cf, a * 4 / 6 + Math.PI)}" fill="#8d97a1" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="${cm}" cy="${cy}" r="16" fill="#3a4148"/><circle cx="${cf}" cy="${cy}" r="16" fill="#3a4148"/>
    <text x="${cm}" y="${H - 6}" fill="#8fe9ff" font-size="17" font-weight="700" text-anchor="middle">MALE · 4 LOBES</text><text x="${cf}" y="${H - 6}" fill="#cfd8df" font-size="17" font-weight="700" text-anchor="middle">FEMALE · 6 FLUTES</text>
  </svg>`;
}
function compressionSVG(t) {
  const W = 548, H = 250, X = (u) => 50 + u * 470, Yv = (v) => 210 - v * 170;
  const vol = (u) => 1 - 0.78 * ss(0.05, 0.95, u), pres = (u) => Math.pow(1 / vol(u), 1.35);
  let dv = '', dp = ''; for (let i = 0; i <= 60; i++) { const u = i / 60; dv += `${i ? 'L' : 'M'}${X(u).toFixed(1)},${Yv(vol(u)).toFixed(1)}`; dp += `${i ? 'L' : 'M'}${X(u).toFixed(1)},${Yv(pres(u) / 8).toFixed(1)}`; }
  const u = ss(37.2, 41.9, t), open = t > 41.9;
  return `<svg width="${W}" height="${H}" style="display:block">
    <line x1="${X(0)}" y1="${Yv(0)}" x2="${X(1)}" y2="${Yv(0)}" stroke="rgba(255,255,255,0.25)"/><line x1="${X(0)}" y1="${Yv(0)}" x2="${X(0)}" y2="${Yv(1.05)}" stroke="rgba(255,255,255,0.25)"/>
    <path d="${dv}" fill="none" stroke="#4fc3ff" stroke-width="4"/><path d="${dp}" fill="none" stroke="#ff8a5c" stroke-width="4"/>
    <text x="${X(0.03)}" y="${Yv(1.0) - 8}" fill="#4fc3ff" font-size="16">pocket volume</text><text x="${X(0.97)}" y="${Yv(pres(1) / 8) - 10}" fill="#ff8a5c" font-size="16" text-anchor="end">pressure ≈ ${pres(1).toFixed(0)} bar(a)</text>
    <line x1="${X(0.95)}" y1="${Yv(0)}" x2="${X(0.95)}" y2="${Yv(1.05)}" stroke="${open ? '#6ff0b0' : 'rgba(255,255,255,0.2)'}" stroke-dasharray="6 6" stroke-width="2"/><text x="${X(0.95) - 6}" y="${Yv(0.62)}" fill="${open ? '#6ff0b0' : '#8fa2b0'}" font-size="15" text-anchor="end">opens to outlet</text>
    <circle cx="${X(u)}" cy="${Yv(vol(u))}" r="8" fill="#fff"/><circle cx="${X(u)}" cy="${Yv(pres(u) / 8)}" r="8" fill="#fff"/>
    <text x="${X(1)}" y="${Yv(0) + 26}" fill="#8fa2b0" font-size="15" text-anchor="end">rotation →</text>
  </svg>`;
}
const tb = (rows) => `<div class="tb">${rows.map(([k, v, c, o]) => `<span style="opacity:${o ?? 1}">${k}</span><b style="color:${c || '#fff'};opacity:${o ?? 1}">${v}</b>`).join('')}</div>`;
const on = (t, a) => (t > a ? 1 : 0.2);
function oilLoopSVG(t) {
  const W = 548, H = 250;
  const node = (x, y, w, txt, hi, col = '#ffb35c') => `<rect x="${x - w / 2}" y="${y - 22}" width="${w}" height="44" rx="10" fill="${hi ? 'rgba(255,179,92,0.22)' : 'rgba(255,255,255,0.05)'}" stroke="${hi ? col : 'rgba(255,255,255,0.25)'}" stroke-width="${hi ? 2.5 : 1.5}"/><text x="${x}" y="${y + 6}" fill="${hi ? '#fff' : '#a9bccb'}" font-size="16" font-weight="700" text-anchor="middle">${txt}</text>`;
  const arrow = (x1, y1, x2, y2, c = '#ffb35c', dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="url(#ah)"/>`;
  return `<svg width="${W}" height="${H}" style="display:block"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ffb35c"/></marker></defs>
    ${node(90, 40, 140, 'TANK SUMP', false)}${node(274, 40, 170, 'THERMOSTAT', t > 83.4)}${node(458, 40, 140, 'COOLER', t > 82.4)}
    ${node(458, 200, 140, 'FILTER', t > 84.8)}${node(90, 200, 140, 'AIR END', t > 85.4)}
    ${arrow(162, 40, 186, 40)}${arrow(361, 40, 385, 40)}${arrow(458, 64, 458, 174)}${arrow(386, 200, 162, 200)}${arrow(90, 176, 90, 66)}
    <path d="M274,64 C274,140 380,190 386,192" fill="none" stroke="#ffb35c" stroke-width="2.5" stroke-dasharray="7 6" opacity="${t > 86.0 ? 1 : 0.35}"/>
    <text x="300" y="132" fill="#ffb35c" font-size="15" opacity="${t > 86.0 ? 1 : 0.35}">cold oil bypasses</text>
  </svg>`;
}
export function panel(t, st) {
  if (t > 16.0 && t < 30.75) return { opacity: fade(t, 16.0, 30.75), side: 'left', title: 'THE ROTOR PAIR · END VIEW', html: rotorSVG(t) + `<div class="note">The lobes of the male roll into the flutes of the female. The female turns at four-sixths of the male's speed, carried on a film of oil.</div>` };
  if (t > 36.8 && t < 45.35) return { opacity: fade(t, 36.8, 45.35), side: 'left', title: 'ONE POCKET, INLET TO OUTLET', html: compressionSVG(t) + `<div class="note">Illustrative. The pocket is sealed off at the inlet end and carried to the outlet end, getting smaller all the way.</div>` };
  if (t > 51.3 && t < 60.15) return { opacity: fade(t, 51.3, 60.15), side: 'left', title: 'WHAT THE OIL DOES', html: tb([['Seals', 'rotor gaps', '#8fe9ff', on(t, 55.1)], ['Lubricates', 'bearings', '#8fe9ff', on(t, 57.3)], ['Cools', 'heat of compression', '#8fe9ff', on(t, 58.9)], ['Dry discharge', '> 200 °C', '#ff5a4e'], ['With oil', '80–90 °C', '#6ff0b0']]) };
  if (t > 66.1 && t < 73.25) return { opacity: fade(t, 66.1, 73.25), side: 'left', title: 'TWO-STAGE SEPARATION', html: tb([['1 · Swirl + gravity', 'most of the oil', '#ffb35c', on(t, 66.6)], ['2 · Coalescing element', 'the remaining mist', '#ffb35c', on(t, 70.3)], ['Oil left in the air', 'a few mg/m³ when healthy', '#6ff0b0', on(t, 72.0)]]) + `<div class="note">The oil collects in the sump and goes round again; a scavenge line returns what the element catches.</div>` };
  if (t > 81.1 && t < 90.15) return { opacity: fade(t, 81.1, 90.15), side: 'left', title: 'THE OIL CIRCUIT', html: oilLoopSVG(t) + `<div class="note">Until the oil is hot, the thermostat sends it past the cooler. That keeps the air end above the dew point, so water never condenses in the oil.</div>` };
  if (t > 98.0 && t < 101.95) {
    const parts = [['Oil cooler', 72, '#ff8a5c'], ['Aftercooler', 13, '#ffb35c'], ['Motor', 9, '#ffd27a'], ['Left in the air', 4, '#8fe9ff'], ['Radiation', 2, '#6b7f8f']];
    let x = 0; const bar = parts.map(([k, v, c]) => { const r = `<rect x="${(x * 5.2).toFixed(1)}" y="0" width="${(v * 5.2).toFixed(1)}" height="46" fill="${c}"/>`; x += v; return r; }).join('');
    return { opacity: fade(t, 98.0, 101.95), side: 'left', title: 'WHERE THE POWER GOES', html: `<svg width="548" height="56" style="display:block">${bar}</svg>` + tb(parts.map(([k, v, c]) => [k, `${v} %`, c])) + `<div class="note">Typical oil-injected screw. Around 94 % of the input can be recovered as heat.</div>` };
  }
  if (t > 102.2 && t < 106.8) {
    const bars = [[6, 93], [7, 100], [8, 107], [9, 114], [10, 121]];
    return { opacity: fade(t, 102.2, 106.8), side: 'left', title: 'PRESSURE VS ENERGY', html: `<svg width="548" height="240" style="display:block">${bars.map(([p, e], i) => `<rect x="${40 + i * 100}" y="${205 - (e - 60) * 2.6}" width="62" height="${(e - 60) * 2.6}" rx="6" fill="${p <= 7 ? '#6ff0b0' : p <= 8 ? '#ffb35c' : '#ff5a4e'}" opacity="${t > 102.6 + i * 0.45 ? 1 : 0.15}"/><text x="${71 + i * 100}" y="228" fill="#a9bccb" font-size="16" text-anchor="middle">${p} bar</text><text x="${71 + i * 100}" y="${195 - (e - 60) * 2.6}" fill="#fff" font-size="16" text-anchor="middle">${e}</text>`).join('')}</svg><div class="note">Energy for the same air, 7 bar = 100. Roughly 7 % for every extra bar.</div>` };
  }
  if (t > 160.1 && t < 163.5) return { opacity: fade(t, 160.1, 163.5), side: 'right', w: 560, title: 'DAILY CHECK', color: '#6ff0b0', html: tb([['Discharge temp', '84 °C ✓', '#6ff0b0', on(t, 160.4)], ['Net pressure', '7.5 bar ✓', '#6ff0b0', on(t, 161.3)], ['Separator ΔP', '0.25 bar ✓', '#6ff0b0', on(t, 161.8)], ['Drains', 'cycling ✓', '#6ff0b0', on(t, 162.1)], ['Oil level', 'in the glass ✓', '#6ff0b0', on(t, 162.6)]]) + `<div class="note">Write it down. The trend is what gives a fault away.</div>` };
  if (t > 171.5 && t < 173.95) return { opacity: fade(t, 171.5, 173.95), side: 'right', w: 560, title: 'OIL ANALYSIS', color: '#6ff0b0', html: tb([['Viscosity', 'in range ✓', '#6ff0b0'], ['Acid number', 'low ✓', '#6ff0b0'], ['Water', 'low ✓', '#6ff0b0'], ['Wear metals', 'normal ✓', '#6ff0b0']]) + `<div class="note">Results set the change interval, instead of guessing.</div>` };
  return null;
}

// ---------------------------------------------------------------- HUD (right-hand readouts)
const TLOG = [84, 84, 85, 84, 86, 87, 89, 91, 94, 97];
const DPLOG = [0.22, 0.23, 0.25, 0.27, 0.31, 0.36, 0.43, 0.51, 0.6, 0.7];
const TOPUP = [1.0, 1.0, 1.1, 1.2, 1.5, 1.9, 2.4, 3.0, 3.6, 4.2];
const LOADLOG = [56, 57, 56, 58, 60, 62, 64, 67, 69, 72];
export function hud(t, st) {
  if (t > 0.8 && t < 8.4) return { opacity: fade(t, 0.8, 8.4), title: 'ELECTRICITY IN', items: [{ k: 'INPUT POWER', v: '100 %' }, { k: 'COMES OUT AS HEAT', v: '≈ 94 %', big: true, color: '#ff8a5c' }, { k: 'LEFT IN THE AIR', v: '≈ 4 %' }] };
  if (t > 23.4 && t < 30.75) return { opacity: fade(t, 23.4, 30.75), title: 'ROTOR SPEEDS · EXAMPLE', items: [{ k: 'MALE (4 LOBES)', v: '3000 rpm', big: true, color: '#8fe9ff' }, { k: 'FEMALE (6 FLUTES)', v: '2000 rpm' }, { k: 'RATIO', v: '6 : 4' }] };
  if (t > 30.9 && t < 36.55) return { opacity: fade(t, 30.9, 36.55), title: 'INTAKE', items: [{ k: 'AIR IN', v: '1 bar(a)' }, { k: 'INLET VALVE', v: st.load > 0.5 ? 'open' : 'closed', big: true, color: '#6ff0b0' }] };
  if (t > 45.7 && t < 51.05) return { opacity: fade(t, 45.7, 51.05), title: 'COMPRESSION · NO OIL', items: [{ k: 'AIR IN', v: '25 °C' }, { k: 'WOULD LEAVE AT', v: '> 200 °C', big: true, color: '#ff5a4e' }] };
  if (t > 60.4 && t < 65.85) return { opacity: fade(t, 60.4, 65.85), title: 'OUT OF THE AIR END', items: [{ k: 'AIR + OIL', v: '80–90 °C', big: true, color: '#ffb35c' }, { k: 'PRESSURE', v: `${st.pressure.toFixed(1)} bar` }] };
  if (t > 73.7 && t < 80.85) return { opacity: fade(t, 73.7, 80.85), title: 'MINIMUM PRESSURE VALVE', items: [{ k: 'OPENS ABOVE', v: '≈ 4 bar', big: true, color: '#8fe9ff' }, { k: 'TANK PRESSURE', v: 'pushes the oil' }, { k: 'AIR', v: 'on to the cooler' }] };
  if (t > 90.5 && t < 97.75) return { opacity: fade(t, 90.5, 97.75), title: 'AFTERCOOLER', items: [{ k: 'AIR IN', v: '≈ 85 °C', color: '#ffb35c' }, { k: 'AIR OUT', v: 'amb. + 10 K', big: true, color: '#4fc3ff' }, { k: 'CONDENSATE', v: st.drain ? 'draining' : 'collecting', color: '#8fe9ff' }] };
  if (t > 109.6 && t < 113.4) return { opacity: fade(t, 109.6, 113.4), title: 'INTAKE FILTER', items: [{ k: 'PRESSURE DROP', v: `${Math.round(25 + 40 * st.filterDirt)} mbar`, big: true, color: st.filterDirt > 0.5 ? '#ff5a4e' : '#fff' }, { k: 'AIR DELIVERED', v: `${Math.round(100 - 6 * st.filterDirt)} %`, color: '#ffb35c' }] };
  if (t > 113.7 && t < 119.4) return { opacity: fade(t, 113.7, 119.4), title: st.trip ? 'ALARM' : 'DISCHARGE TEMPERATURE', items: [{ k: 'DISCHARGE', v: `${Math.round(st.dischargeT)} °C`, big: true, color: st.dischargeT > 100 ? '#ff5a4e' : '#ffb35c' }, { k: 'NORMAL BAND', v: '80–90 °C' }, { k: 'TRIP', v: '≈ 110 °C', color: st.trip ? '#ff5a4e' : '#fff' }] };
  if (t > 119.7 && t < 122.35) return { opacity: fade(t, 119.7, 122.35), title: 'OLD OIL', items: [{ k: 'OXIDATION', v: 'acid number ↑', color: '#ffb35c' }, { k: 'DEPOSITS', v: 'varnish', big: true, color: '#ff5a4e' }] };
  if (t > 122.7 && t < 129.1) return { opacity: fade(t, 122.7, 129.1), title: 'SEPARATOR ELEMENT', items: [{ k: 'PRESSURE DROP', v: `${st.sepDP.toFixed(2)} bar`, big: true, color: st.sepDirt > 0.5 ? '#ff5a4e' : '#fff' }, { k: 'OIL CARRY-OVER', v: st.carry > 0.5 ? 'rising' : 'low', color: st.carry > 0.5 ? '#ff5a4e' : '#6ff0b0' }, { k: 'ENERGY', v: '+0.7 % / 0.1 bar', color: '#ffb35c' }] };
  if (t > 129.4 && t < 134.6) return { opacity: fade(t, 129.4, 134.6), title: 'STUCK THERMOSTAT', items: [{ k: 'DISCHARGE', v: `${Math.round(st.dischargeT)} °C`, big: true, color: st.thermoCold > 0.5 ? '#4fc3ff' : st.thermoHot > 0.5 ? '#ff5a4e' : '#fff' }, { k: st.thermoHot > 0.5 ? 'TOO HOT' : 'TOO COLD', v: st.thermoHot > 0.5 ? 'oil oxidises' : 'water in the oil', color: '#ffb35c' }] };
  if (t > 135.0 && t < 141.8) return { opacity: fade(t, 135.0, 141.8), title: 'AIR NETWORK LEAKS', items: [{ k: 'AVERAGE PLANT', v: '≈ 20 %', big: true, color: '#ff5a4e' }, { k: 'WORST CASES', v: '≈ 30 %' }, { k: 'SHARE OF', v: 'all air made' }] };
  if (t > 142.7 && t < 146.7) return { opacity: fade(t, 142.7, 146.7), title: 'DISCHARGE TEMP · 10 WEEKS', items: [{ k: 'NORMAL BAND', v: '80–90 °C' }, { k: 'NOW', v: '97 °C', big: true, color: '#ff5a4e' }], spark: { values: TLOG, n: TLOG.length, lo: 78, hi: 100, color: '#ff5a4e', band: [80, 90], unit: '°' } };
  if (t > 147.0 && t < 150.8) return { opacity: fade(t, 147.0, 150.8), title: 'SEPARATOR ΔP · 10 WEEKS', items: [{ k: 'NEW ELEMENT', v: '0.2 bar' }, { k: 'NOW', v: '0.7 bar', big: true, color: '#ff5a4e' }], spark: { values: DPLOG, n: DPLOG.length, lo: 0, hi: 0.8, color: '#ff5a4e', band: [0.15, 0.35], unit: '' } };
  if (t > 151.1 && t < 155.5) return { opacity: fade(t, 151.1, 155.5), title: 'OIL TOP-UPS · EXAMPLE', items: [{ k: 'PER 1000 h', v: '1 → 4.2 L', big: true, color: '#ff5a4e' }, { k: 'CONDENSATE', v: 'oily', color: '#ffb35c' }], spark: { values: TOPUP, n: TOPUP.length, lo: 0, hi: 5, color: '#ffb35c', band: [0.6, 1.4], unit: '' } };
  if (t > 155.8 && t < 159.8) return { opacity: fade(t, 155.8, 159.8), title: 'LOADED TIME · SAME OUTPUT', items: [{ k: 'PRODUCTION', v: 'unchanged' }, { k: 'COMPRESSOR LOADED', v: '56 → 72 %', big: true, color: '#ff5a4e' }], spark: { values: LOADLOG, n: LOADLOG.length, lo: 50, hi: 76, color: '#ff5a4e', band: [53, 59], unit: '%' } };
  if (t > 174.3 && t < 178.3) return { opacity: fade(t, 174.3, 178.3), title: 'COMPRESSOR ROOM', items: [{ k: 'COOLER INTAKE AIR', v: '−5 °C' }, { k: 'ENERGY', v: '≈ −1.5 %', big: true, color: '#6ff0b0' }, { k: 'HOT EXHAUST', v: 'ducted outside' }] };
  if (t > 178.6 && t < 182.2) return { opacity: fade(t, 178.6, 182.2), title: 'LOAD / UNLOAD', items: [{ k: 'DEMAND', v: t > 179.8 ? 'drops' : 'normal' }, { k: 'INLET VALVE', v: st.load > 0.5 ? 'open' : 'closed', big: true, color: st.load > 0.5 ? '#fff' : '#6ff0b0' }, { k: 'MOTOR LOAD', v: st.load > 0.5 ? '≈ 100 %' : '≈ 25 %' }] };
  if (t > 185.4 && t < 188.0) return { opacity: fade(t, 185.4, 188.0), title: 'LEAK HUNT', items: [{ k: 'ULTRASONIC', v: t > 186.6 ? 'found' : 'listening…', big: true, color: t > 186.6 ? '#6ff0b0' : '#fff' }, { k: 'LEAK', v: st.leakFixed > 0.5 ? 'tagged · fixed ✓' : 'tagged', color: '#6ff0b0' }] };
  if (t > 188.3 && t < 191.1) return { opacity: fade(t, 188.3, 191.1), title: 'SET PRESSURE', items: [{ k: 'WAS', v: '7.5 bar' }, { k: 'NOW', v: `${st.pressure.toFixed(1)} bar`, big: true, color: '#6ff0b0' }, { k: 'ENERGY', v: st.pressure < 6.6 ? '≈ −7 %' : '…', color: '#6ff0b0' }] };
  return null;
}

export const CARDS = [
  { t0: 142.6, t1: 159.75, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Discharge temp above its band', t: 142.6 },
    { text: 'Rising ΔP: separator, filters', t: 146.9 },
    { text: 'Oil in condensate, more top-ups', t: 151.0 },
    { text: 'Loading more, same production', t: 155.7 },
  ] },
  { t0: 159.95, t1: 191.0, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Daily: temps, pressures, drains', t: 159.95, done: 163.2 },
    { text: 'Intake + oil filters', sub: 'on hours or pressure drop', t: 163.7, done: 167.9 },
    { text: 'Oil + separator on schedule', sub: 'oil analysis sets the interval', t: 168.5, done: 173.7 },
    { text: 'Clean coolers, ventilate', t: 174.1, done: 177.9 },
    { text: 'Inlet valve, belts, couplings', t: 178.4, done: 184.5 },
    { text: 'Hunt leaks, lower set pressure', t: 185.2, done: 190.4 },
  ] },
];
export const SHAKES = [{ t: 118.8, a: 0.08, d: 0.2 }];
export const FLASHES = [];
