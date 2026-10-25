// Air-cooled water chiller — 16:9 deep dive. Shots, labels, panels, HUD and cards; times follow timeline.json (Emma).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.35, b, t));

export const TOTAL = 198.65;
export const TITLE = { big: 'WATER CHILLER', sub: 'the refrigeration cycle, step by step', t0: 13.0, t1: 15.25 };
export const END = { big: 'WATER CHILLER', a: 'Clean coils.', b: 'Cold water.', t0: 195.85 };
export const CHAPTERS = [
  { t: 15.35, label: 'HOW IT WORKS', sub: 'Evaporator, compressor, condenser, expansion valve' },
  { t: 103.85, label: 'WHAT GOES WRONG', sub: 'Fouling, leaks and low water flow' },
  { t: 145.6, label: 'WARNING SIGNS', sub: 'What the gauges and the pipework tell you' },
  { t: 163.9, label: 'THE FIX', sub: 'Logging, cleaning and checks' },
];
const P = [40, 0, 0], F = [60, 0, 0], S = [80, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, extra.fov || 36], [1, p1, g1, extra.fov || 36]], ez: 'lin', ...extra });
const WIDE = [[0.8, 0.9, 13.6], [0, -0.1, 0], [0.6, 0.8, 12.6], [0, -0.1, 0]];
export const SHOTS = [
  k2('S1', 0, 7.6, [7.6, 2.4, 11.6], [0, -0.2, 0], [6.6, 2.0, 10.4], [0, -0.2, 0]),
  k2('S2', 7.6, 13.0, [4.4, 1.6, 12.6], [0, -0.2, 0], [2.6, 1.1, 12.2], [0, -0.2, 0]),
  k2('S3', 13.0, 15.3, [2.2, 1.0, 12.4], [0, -0.2, 0], [1.6, 0.9, 11.8], [0, -0.2, 0]),
  k2('S4', 15.3, 21.5, ...WIDE),
  k2('S5', 21.5, 28.4, [0.9, 0.9, 13.0], [0, -0.1, 0], [0.7, 0.8, 12.2], [0, -0.1, 0], { shift: 0.15 }),
  k2('S6', 28.4, 38.2, [0.9, -0.8, 3.9], [-0.1, -1.25, 0], [0.7, -0.9, 3.5], [-0.1, -1.25, 0], { shift: 0.15 }),
  k2('S7', 38.2, 46.6, at(P, [1.6, 1.2, 6.0]), at(P, [0, 0, 0]), at(P, [1.3, 1.0, 5.4]), at(P, [0, 0, 0]), { shift: 0.15 }),
  k2('S8a', 46.6, 50.4, [-0.9, -0.85, 3.8], [-1.9, -1.25, 0], [-1.1, -0.9, 3.4], [-1.9, -1.25, 0], { shift: 0.15 }),
  k2('S8b', 50.4, 54.5, at(S, [0, 6.2, 2.2]), at(S, [0, 0, 0]), at(S, [0, 5.6, 1.9]), at(S, [0, 0, 0]), { shift: 0.15 }),
  k2('S9a', 54.5, 58.6, [1.9, 2.6, 6.6], [1.7, 1.1, 0], [1.8, 2.4, 6.0], [1.7, 1.1, 0], { shift: 0.15 }),
  k2('S9b', 58.6, 63.0, at(F, [1.6, 0.6, 7.0]), at(F, [0, 0, 0]), at(F, [1.3, 0.5, 6.3]), at(F, [0, 0, 0]), { shift: 0.15 }),
  k2('S10', 63.0, 71.4, [1.7, -0.7, 3.2], [0.85, -1.1, 0], [1.55, -0.8, 2.9], [0.85, -1.1, 0], { shift: 0.15 }),
  k2('S11', 71.4, 79.3, [0.5, 0.35, 3.3], [-0.3, -0.25, 0], [0.35, 0.3, 3.0], [-0.3, -0.25, 0], { shift: 0.15 }),
  k2('S12', 79.3, 89.7, [-2.0, 1.2, 4.2], [-2.75, 0.75, 0.3], [-2.1, 1.1, 3.8], [-2.75, 0.75, 0.3], { shift: 0.16 }),
  k2('S13', 89.7, 95.2, [1.8, 1.8, 7.8], [1.6, 0.9, 0], [1.7, 1.7, 7.2], [1.6, 0.9, 0], { shift: 0.15 }),
  k2('S14', 95.2, 103.6, [3.4, 3.6, 9.6], [1.4, 1.4, 0], [3.0, 3.4, 9.0], [1.4, 1.4, 0], { shift: 0.15 }),
  k2('S15', 103.6, 107.1, [0.4, 0.8, 14.4], [0, -0.1, 0], [0.3, 0.7, 13.4], [0, -0.1, 0]),
  k2('S16a', 107.1, 111.6, at(F, [1.4, -0.4, 7.0]), at(F, [0, -0.6, 0]), at(F, [1.2, -0.45, 6.3]), at(F, [0, -0.6, 0]), { shift: -0.14 }),
  k2('S16b', 111.6, 116.3, [2.2, 0.0, 5.6], [1.7, 0.9, 0], [2.0, -0.05, 5.1], [1.7, 0.9, 0], { shift: -0.14 }),
  k2('S17', 116.3, 121.5, [-0.6, 1.25, 3.0], [-1.4, 0.6, 0], [-0.75, 1.2, 2.7], [-1.4, 0.6, 0], { shift: -0.14 }),
  k2('S18', 121.5, 130.0, at(P, [1.3, 0.9, 5.4]), at(P, [-0.5, 0, 0]), at(P, [1.1, 0.8, 4.9]), at(P, [-0.5, 0, 0]), { shift: -0.14 }),
  k2('S19a', 130.0, 134.0, [3.3, -0.6, 2.6], [2.7, -1.05, 0], [3.15, -0.65, 2.35], [2.7, -1.05, 0], { shift: -0.12 }),
  k2('S19b', 134.0, 138.0, [0.3, -0.3, 6.6], [-0.8, -1.0, 0], [0.2, -0.35, 6.0], [-0.8, -1.0, 0], { shift: -0.14 }),
  k2('S20a', 138.0, 141.0, [-2.9, 0.1, 2.4], [-3.55, -0.6, WZ()], [-3.0, 0.05, 2.15], [-3.55, -0.6, WZ()], { shift: -0.12 }),
  k2('S20b', 141.0, 145.5, at(P, [1.0, 0.6, 5.0]), at(P, [-0.6, 0.2, 0]), at(P, [0.85, 0.5, 4.5]), at(P, [-0.6, 0.2, 0])),
  k2('S21', 145.5, 150.0, [-3.6, -1.2, 3.4], [-4.0, -1.6, -0.6], [-3.7, -1.25, 3.1], [-4.0, -1.6, -0.6], { shift: -0.02 }),
  k2('S22', 150.0, 154.7, [-2.2, 1.15, 3.9], [-2.9, 0.75, 0.3], [-2.3, 1.1, 3.6], [-2.9, 0.75, 0.3], { shift: 0.02 }),
  k2('S23', 154.7, 158.3, at(P, [0.9, 0.8, 5.6]), at(P, [-0.4, 0, 0]), at(P, [0.8, 0.7, 5.2]), at(P, [-0.4, 0, 0]), { shift: 0.02 }),
  k2('S24a', 158.3, 160.3, [2.75, -0.65, 1.6], [2.2, -0.9, 0.1], [2.65, -0.7, 1.45], [2.2, -0.9, 0.1], { shift: 0.1 }),
  k2('S24b', 160.3, 163.8, [1.3, 0.3, 6.0], [1.3, -0.8, 0], [1.5, 0.1, 5.6], [1.4, -0.8, 0], { shift: 0.1 }),
  k2('S25', 163.8, 168.7, [0.6, 0.8, 12.2], [0, -0.1, 0], [0.5, 0.75, 11.6], [0, -0.1, 0]),
  k2('S26a', 168.7, 171.6, at(F, [1.2, -0.4, 7.2]), at(F, [0, -0.6, 0]), at(F, [1.0, -0.45, 6.6]), at(F, [0, -0.6, 0]), { shift: 0.12 }),
  k2('S26b', 171.6, 174.8, [2.4, 0.3, 6.8], [1.7, 0.9, 0], [2.2, 0.25, 6.2], [1.7, 0.9, 0], { shift: 0.12 }),
  k2('S27', 174.8, 178.6, [-2.6, 0.0, 2.8], [-3.4, -0.75, -0.2], [-2.7, -0.05, 2.5], [-3.4, -0.75, -0.2], { shift: 0.12 }),
  { id: 'S28', t0: 178.6, t1: 184.6, keys: [[0, [1.6, 2.8, 5.6], [1.2, 1.9, 0], 36], [0.4, [0.2, 0.2, 4.4], [-1.6, -1.0, 0], 36], [1, [-0.4, -1.3, 3.6], [-1.75, -1.85, 0.3], 36]], ez: 'ease', shift: 0.12 },
  k2('S29', 184.6, 190.9, [3.0, -0.9, 3.4], [2.4, -1.4, 0.3], [3.1, -0.95, 3.1], [3.0, -1.5, 0.3], { shift: 0.12 }),
  k2('S30', 190.9, 195.8, [-2.4, 0.2, 2.8], [-2.9, -0.4, WZ()], [-2.5, 0.15, 2.5], [-2.9, -0.4, WZ()], { shift: 0.12 }),
  k2('S31', 195.8, 201, [0.8, 0.9, 12.6], [0, -0.1, 0], [3.6, 2.4, 15.6], [0, 0, 0], { ez: 'ease' }),
];
function WZ() { return -0.75; }

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S1': return { cut: 0 };
    case 'S2': return { cut: ss(8.8, 11.6, t) };
    case 'S14': return { cut: 1 };
    case 'S31': return { cut: 1 - ss(196.4, 197.8, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S3') exposure = 0.4 + 0.6 * ss(13.0, 13.6, t);
  return { exposure };
}

export const LABELS = [
  { text: 'CONDENSER FANS', anchor: 'fans', t0: 2.4, t1: 7.5, dx: -90, dy: -110 },
  { text: 'HEAT IN', sub: 'from the process water', anchor: 'evapW', t0: 16.4, t1: 21.4, dx: -120, dy: 120 },
  { text: 'HEAT OUT', sub: 'into the outside air', anchor: 'heatOut', t0: 18.2, t1: 21.4, dx: 110, dy: -60 },
  { text: 'EVAPORATOR', anchor: 'evaporator', t0: 23.6, t1: 28.35, dx: 110, dy: 120 },
  { text: 'COMPRESSOR', anchor: 'compressor', t0: 24.6, t1: 28.35, dx: -110, dy: 120 },
  { text: 'CONDENSER', anchor: 'coil', t0: 25.6, t1: 28.35, dx: 110, dy: -110 },
  { text: 'EXPANSION VALVE', anchor: 'txv', t0: 26.6, t1: 28.35, dx: 110, dy: 60 },
  { text: 'WARM WATER IN', sub: '12 °C', anchor: 'evapW', t0: 31.0, t1: 38.15, dx: -110, dy: -110 },
  { text: 'COLD REFRIGERANT', sub: 'low pressure', anchor: 'evapR', t0: 34.6, t1: 38.15, dx: 110, dy: 100 },
  { text: 'WATER', anchor: 'rigWater', t0: 38.8, t1: 46.55, dx: -100, dy: -110 },
  { text: 'REFRIGERANT BOILS', anchor: 'rigRef', t0: 39.4, t1: 46.55, dx: 110, dy: 120 },
  { text: 'SCROLL SET', anchor: 'scroll', t0: 47.4, t1: 50.35, dx: 110, dy: -90 },
  { text: 'MOTOR', anchor: 'motor', t0: 48.2, t1: 50.35, dx: 110, dy: 80 },
  { text: 'VAPOUR IN', anchor: 'scrollOuter', t0: 50.8, t1: 54.45, dx: -100, dy: -100 },
  { text: 'HOT, HIGH PRESSURE', anchor: 'scrollCentre', t0: 51.8, t1: 54.45, dx: 110, dy: 100, tone: 'warn' },
  { text: 'FANS', anchor: 'fans', t0: 55.4, t1: 58.55, dx: -90, dy: -90 },
  { text: 'FINNED COIL', anchor: 'coil', t0: 56.2, t1: 58.55, dx: 110, dy: 110 },
  { text: 'HEAT TO THE AIR', anchor: 'rigFins', t0: 59.2, t1: 62.95, dx: -100, dy: -110 },
  { text: 'CONDENSING', sub: 'vapour → liquid', anchor: 'rigTube', t0: 60.4, t1: 62.95, dx: 110, dy: 110 },
  { text: 'EXPANSION VALVE', anchor: 'txv', t0: 63.6, t1: 71.35, dx: 110, dy: -90 },
  { text: 'LIQUID IN', anchor: 'drier', t0: 64.6, t1: 68.0, dx: 90, dy: 100 },
  { text: 'COLD MIX OUT', anchor: 'evapR', t0: 66.4, t1: 71.35, dx: -110, dy: 90 },
  { text: 'SENSING BULB', anchor: 'bulb', t0: 72.0, t1: 79.25, dx: -100, dy: -110 },
  { text: 'SUCTION LINE', anchor: 'suction', t0: 73.6, t1: 79.25, dx: 110, dy: -90 },
  { text: 'LOW SIDE', anchor: 'gLow', t0: 80.6, t1: 89.65, dx: -90, dy: -90 },
  { text: 'HIGH SIDE', anchor: 'gHigh', t0: 82.6, t1: 89.65, dx: 90, dy: -90 },
  { text: 'HEAT OUT', anchor: 'heatOut', t0: 96.4, t1: 103.55, dx: 110, dy: 60 },
  { text: 'DUST + FLUFF', anchor: 'rigDust', t0: 108.0, t1: 111.55, dx: -100, dy: 110, tone: 'bad' },
  { text: 'CLOGGED FINS', anchor: 'dust', t0: 112.2, t1: 116.25, dx: -100, dy: 110, tone: 'bad' },
  { text: 'HP SWITCH TRIPPED', anchor: 'hpSwitch', t0: 117.6, t1: 121.45, dx: 110, dy: -90, tone: 'bad' },
  { text: 'SCALE', sub: 'water side', anchor: 'rigScale', t0: 123.0, t1: 129.95, dx: -100, dy: -110, tone: 'bad' },
  { text: 'OIL STAIN', sub: 'leak at a joint', anchor: 'stain', t0: 130.8, t1: 133.95, dx: 100, dy: 90, tone: 'bad' },
  { text: 'BUBBLES', anchor: 'sightGlass', t0: 131.6, t1: 133.95, dx: -100, dy: -90, tone: 'bad' },
  { text: 'STARVED EVAPORATOR', anchor: 'evaporator', t0: 134.6, t1: 137.95, dx: 110, dy: 110, tone: 'bad' },
  { text: 'RUNNING HOT', anchor: 'compressor', t0: 135.6, t1: 137.95, dx: -110, dy: -100, tone: 'bad' },
  { text: 'BLOCKED STRAINER', anchor: 'strainer', t0: 138.6, t1: 140.95, dx: 110, dy: 100, tone: 'bad' },
  { text: 'ICE', anchor: 'rigIce', t0: 141.6, t1: 145.45, dx: 110, dy: -110, tone: 'bad' },
  { text: 'SPLIT', anchor: 'rigCrack', t0: 143.8, t1: 145.45, dx: -110, dy: 110, tone: 'bad' },
  { text: 'TO MOULDS', anchor: 'waterOut', t0: 146.0, t1: 149.95, dx: 110, dy: -90 },
  { text: 'SIGHT GLASS', anchor: 'sightGlass', t0: 158.6, t1: 160.25, dx: -110, dy: -90, tone: 'bad' },
  { text: 'FROST', anchor: 'suction', t0: 160.6, t1: 163.75, dx: 90, dy: -110, tone: 'bad' },
  { text: 'OIL STAIN', anchor: 'stain', t0: 161.8, t1: 163.75, dx: -90, dy: 100, tone: 'bad' },
  { text: 'CLEAN THE COIL', anchor: 'rigDust', t0: 169.0, t1: 171.55, dx: -100, dy: 110 },
  { text: 'CLEAN STRAINER', anchor: 'strainer', t0: 175.4, t1: 178.55, dx: 110, dy: 100 },
  { text: 'FANS', anchor: 'fans', t0: 179.0, t1: 180.8, dx: -100, dy: -90 },
  { text: 'CONNECTIONS', anchor: 'tbox', t0: 181.0, t1: 182.6, dx: -100, dy: -90 },
  { text: 'OIL LEVEL', anchor: 'oilGlass', t0: 182.8, t1: 184.55, dx: 100, dy: -80 },
  { text: 'LEAK DETECTOR', anchor: 'stain', t0: 185.6, t1: 190.85, dx: 110, dy: -100 },
  { text: 'FLOW SWITCH', anchor: 'flowSwitch', t0: 191.4, t1: 195.75, dx: 110, dy: -90 },
];

// ---------------------------------------------------------------- cycle diagram (pressure vs heat content)
function cycleSVG(t, st, opt = {}) {
  const W = 548, H = 300, X = (h) => 50 + h * (W - 80), Y = (p) => H - 40 - p * (H - 80);
  let dome = ''; for (let i = 0; i <= 40; i++) { const a = i / 40; const h = 0.12 + 0.6 * a, p = 0.98 * Math.sin(Math.PI * a) ** 0.6; dome += `${i ? 'L' : 'M'}${X(h).toFixed(1)},${Y(p).toFixed(1)}`; }
  const hi = 0.66, lo = 0.2;   // pressures of the condensing / evaporating lines
  const p1 = [0.76, lo], p2 = [0.9, hi], p3 = [0.2, hi], p4 = [0.2, lo];
  const segs = [[p4, p1, 0, '#4fc3ff'], [p1, p2, 1, '#ffb35c'], [p2, p3, 2, '#ff5a4e'], [p3, p4, 3, '#b9f0ff']];
  const lineFor = ([a, b, k, c]) => `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" stroke="${c}" stroke-width="${st.step === k || opt.all ? 6 : 3}" opacity="${st.step === k || opt.all || st.step < 0 ? 1 : 0.35}" stroke-linecap="round"/>`;
  const ph = (t * 0.12) % 1, k = st.step >= 0 && !opt.all ? st.step : Math.floor(ph * 4), f = st.step >= 0 && !opt.all ? (t * 0.4) % 1 : ph * 4 - k, [a, b] = segs[k];
  const dot = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const names = ['EVAPORATOR', 'COMPRESSOR', 'CONDENSER', 'EXPANSION'];
  return `<svg width="${W}" height="${H}" style="display:block">
    <path d="${dome}" fill="rgba(143,233,255,0.06)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    <text x="${X(0.02)}" y="${Y(0.82)}" fill="#8fa2b0" font-size="15">liquid</text><text x="${X(0.43)}" y="${Y(0.34)}" fill="#8fa2b0" font-size="15">boiling mix</text><text x="${X(0.8)}" y="${Y(0.92)}" fill="#8fa2b0" font-size="15">vapour</text>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(0)}" stroke="rgba(255,255,255,0.25)"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(1)}" stroke="rgba(255,255,255,0.25)"/>
    <text x="${X(1)}" y="${Y(0) + 26}" fill="#8fa2b0" font-size="15" text-anchor="end">heat content →</text><text x="${X(0) - 8}" y="${Y(1)}" fill="#8fa2b0" font-size="15" text-anchor="end" transform="rotate(-90 ${X(0) - 26} ${Y(1)})">pressure →</text>
    ${segs.map(lineFor).join('')}
    ${opt.gauges ? `<text x="${X(0.95)}" y="${Y(hi) - 10}" fill="#ff8a7a" font-size="16" text-anchor="end">high side ≈ ${st.cond.toFixed(0)} °C</text><text x="${X(0.95)}" y="${Y(lo) + 24}" fill="#4fc3ff" font-size="16" text-anchor="end">low side ≈ ${st.evap.toFixed(0)} °C</text>` : ''}
    ${st.step >= 0 ? `<text x="${X(0.5)}" y="24" fill="#fff" font-size="18" font-weight="700" text-anchor="middle">${names[st.step]}</text>` : ''}
    <circle cx="${X(dot[0])}" cy="${Y(dot[1])}" r="8" fill="#fff"/>
  </svg>`;
}
const tb = (rows) => `<div class="tb">${rows.map(([k, v, c]) => `<span>${k}</span><b style="color:${c || '#fff'}">${v}</b>`).join('')}</div>`;
export function panel(t, st) {
  if (t > 22.0 && t < 79.25) return { opacity: fade(t, 22.0, 79.25), side: 'left', title: 'THE REFRIGERATION CYCLE', html: cycleSVG(t, st) + `<div class="note">The same refrigerant goes round and round. It soaks up heat as it boils at low pressure, and gives it away as it condenses at high pressure.</div>` };
  if (t > 79.8 && t < 89.65) return { opacity: fade(t, 79.8, 89.65), side: 'left', title: 'READING THE GAUGES', html: cycleSVG(t, st, { gauges: true, all: true }) + tb([['Low side (boiling)', `${st.evap.toFixed(0)} °C`, '#4fc3ff'], ['High side (condensing)', `${st.cond.toFixed(0)} °C`, '#ff8a7a'], ['Lift: work for the compressor', `${(st.cond - st.evap).toFixed(0)} K`]]) };
  if (t > 90.0 && t < 95.15) {
    const bars = [[40, 0.9], [45, 1.0], [50, 1.12], [55, 1.26], [60, 1.42]];
    return { opacity: fade(t, 90.0, 95.15), side: 'left', title: 'CONDENSING TEMPERATURE VS POWER', html: `<svg width="548" height="230" style="display:block">${bars.map(([c, p], i) => `<rect x="${40 + i * 100}" y="${200 - p * 120}" width="62" height="${p * 120}" rx="6" fill="${c <= 45 ? '#6ff0b0' : c <= 50 ? '#ffb35c' : '#ff5a4e'}" opacity="${t > 90.6 + i * 0.5 ? 1 : 0.15}"/><text x="${71 + i * 100}" y="222" fill="#a9bccb" font-size="16" text-anchor="middle">${c} °C</text><text x="${71 + i * 100}" y="${190 - p * 120}" fill="#fff" font-size="16" text-anchor="middle">${Math.round(p * 100)}</text>`).join('')}</svg><div class="note">Compressor power for the same cooling, illustrative (45 °C = 100). Every extra degree adds a few percent; check your unit's data.</div>` };
  }
  if (t > 99.4 && t < 103.55) return { opacity: fade(t, 99.4, 103.55), side: 'left', title: 'AIR-COOLED VS WATER-COOLED', html: tb([['Air-cooled', 'fans + finned coil', '#8fe9ff'], ['Rejects heat to', 'the air around it'], ['Water-cooled', 'condenser + tower', '#ffb35c'], ['Rejects heat to', 'a cooling tower']]) + `<div class="note">Water-cooled units condense colder and use less power, but need the tower water kept clean.</div>` };
  if (t > 164.2 && t < 168.65) return { opacity: fade(t, 164.2, 168.65), side: 'right', w: 560, title: 'SHIFT LOG', color: '#6ff0b0', html: `<div style="display:grid;grid-template-columns:repeat(6,auto);gap:6px 14px;font:500 18px/1.3 'JetBrains Mono',monospace;color:#cfd8df"><span style="color:#8fa2b0">SHIFT</span><span style="color:#8fa2b0">LOW</span><span style="color:#8fa2b0">HIGH</span><span style="color:#8fa2b0">IN</span><span style="color:#8fa2b0">OUT</span><span style="color:#8fa2b0">APPR</span>${[['A', 3, 45, 12.0, 7.0, 3.0], ['B', 3, 46, 12.1, 7.1, 3.1], ['C', 2, 49, 12.4, 7.6, 3.8], ['A', 1, 52, 12.8, 8.2, 4.6]].map((r, i) => r.map((v, j) => `<span style="color:${i === 3 && j > 1 ? '#ffb35c' : '#cfd8df'};opacity:${t > 164.6 + i * 0.6 ? 1 : 0.15}">${typeof v === 'number' ? (j >= 3 ? v.toFixed(1) : v) : v}</span>`).join('')).join('')}</div><div class="note">One line per shift. The trend gives fouling away weeks before a trip.</div>` };
  return null;
}

// ---------------------------------------------------------------- HUD (right-hand readouts)
const OUTLOG = [7.0, 7.0, 7.1, 7.0, 7.3, 7.6, 7.9, 8.4, 8.8, 9.3];
const APPLOG = [3.0, 3.0, 3.1, 3.3, 3.5, 3.9, 4.3, 4.8, 5.3, 6.0];
export function hud(t, st) {
  if (t > 0.8 && t < 7.5) return { opacity: fade(t, 0.8, 7.5), title: 'WATER TO THE MOULD', items: [{ k: 'COOLING TOWER', v: '≈ 30 °C', color: '#ffb35c' }, { k: '', v: 'limited by the weather' }, { k: 'CHILLER', v: '7 °C', big: true, color: '#4fc3ff' }, { k: '', v: 'any day, set point' }] };
  if (t > 40.4 && t < 46.55) return { opacity: fade(t, 40.4, 46.55), title: 'EVAPORATOR', items: [{ k: 'WATER IN', v: '12 °C', color: '#6ff0b0' }, { k: 'WATER OUT', v: '7 °C', big: true, color: '#4fc3ff' }, { k: 'REFRIGERANT BOILS AT', v: '≈ 3 °C' }] };
  if (t > 51.0 && t < 54.45) return { opacity: fade(t, 51.0, 54.45), title: 'COMPRESSION', items: [{ k: 'SUCTION VAPOUR', v: '≈ 9 °C', color: '#4fc3ff' }, { k: 'DISCHARGE GAS', v: '≈ 75 °C', big: true, color: '#ff5a4e' }, { k: 'OUTSIDE AIR', v: '32 °C' }] };
  if (t > 73.0 && t < 79.25) return { opacity: fade(t, 73.0, 79.25), title: 'SUPERHEAT', items: [{ k: 'SUCTION LINE', v: '9 °C' }, { k: 'BOILING (LOW SIDE)', v: '3 °C' }, { k: 'SUPERHEAT', v: `${st.superheat.toFixed(0)} K`, big: true, color: '#6ff0b0' }] };
  if (t > 112.0 && t < 116.25) return { opacity: fade(t, 112.0, 116.25), title: 'FOULED CONDENSER', items: [{ k: 'AIRFLOW', v: `${Math.round(100 - 60 * st.foulCond)} %`, color: '#ffb35c' }, { k: 'CONDENSING', v: `${st.cond.toFixed(0)} °C`, big: true, color: '#ff5a4e' }, { k: 'POWER', v: `+${Math.round(3 * (st.cond - 45))} %`, color: '#ff5a4e' }] };
  if (t > 117.6 && t < 121.45) return { opacity: fade(t, 117.6, 121.45), title: 'ALARM', items: [{ k: 'HIGH PRESSURE TRIP', v: '15:42', big: true, color: '#ff5a4e' }, { k: 'OUTSIDE AIR', v: '35 °C' }, { k: 'CHILLED WATER', v: `${st.waterOut.toFixed(1)} °C ↑`, color: '#ffb35c' }] };
  if (t > 124.0 && t < 129.95) return { opacity: fade(t, 124.0, 129.95), title: 'APPROACH', items: [{ k: 'WATER OUT', v: `${st.waterOut.toFixed(1)} °C` }, { k: 'REFRIGERANT BOILS AT', v: `${st.evap.toFixed(1)} °C` }, { k: 'APPROACH', v: `${(st.waterOut - st.evap).toFixed(1)} K`, big: true, color: st.foulEvap > 0.5 ? '#ff5a4e' : '#6ff0b0' }] };
  if (t > 134.2 && t < 137.95) return { opacity: fade(t, 134.2, 137.95), title: 'LOW CHARGE', items: [{ k: 'SUPERHEAT', v: `${st.superheat.toFixed(0)} K`, big: true, color: '#ff5a4e' }, { k: 'CAPACITY', v: `${Math.round(100 * st.capacity)} %`, color: '#ffb35c' }, { k: 'COMPRESSOR', v: 'hot', color: '#ff5a4e' }] };
  if (t > 138.4 && t < 140.95) return { opacity: fade(t, 138.4, 140.95), title: 'WATER FLOW', items: [{ k: 'FLOW', v: `${Math.round(100 * st.waterFlow)} %`, big: true, color: '#ff5a4e' }, { k: 'BOILING TEMP', v: `${st.evap.toFixed(1)} °C`, color: '#ffb35c' }] };
  if (t > 146.0 && t < 149.95) return { opacity: fade(t, 146.0, 149.95), title: 'CHILLED WATER OUT · 10 DAYS', items: [{ k: 'SET POINT', v: '7.0 °C' }, { k: 'TODAY', v: '9.3 °C', big: true, color: '#ff5a4e' }], spark: { values: OUTLOG, n: OUTLOG.length, lo: 6, hi: 10, color: '#ffb35c', band: [6.6, 7.4], unit: '°' } };
  if (t > 150.4 && t < 154.65) return { opacity: fade(t, 150.4, 154.65), title: 'HEAD PRESSURE', items: [{ k: 'OUTSIDE AIR', v: '26 °C' }, { k: 'EXPECTED CONDENSING', v: '≈ 39 °C' }, { k: 'ACTUAL', v: '52 °C', big: true, color: '#ff5a4e' }] };
  if (t > 155.0 && t < 158.25) return { opacity: fade(t, 155.0, 158.25), title: 'APPROACH · 10 WEEKS', items: [{ k: 'BASELINE', v: '3.0 K' }, { k: 'NOW', v: '6.0 K', big: true, color: '#ff5a4e' }], spark: { values: APPLOG, n: APPLOG.length, lo: 2, hi: 7, color: '#ff5a4e', band: [2.6, 3.4], unit: ' K' } };
  if (t > 191.4 && t < 195.75) return { opacity: fade(t, 191.4, 195.75), title: 'PROTECTION TESTS', items: [{ k: 'FLOW SWITCH', v: t > 192.8 ? 'trips ✓' : 'testing…', color: t > 192.8 ? '#6ff0b0' : '#fff' }, { k: 'FREEZE STAT', v: t > 194.0 ? 'trips ✓' : 'testing…', color: t > 194.0 ? '#6ff0b0' : '#fff' }] };
  return null;
}

export const CARDS = [
  { t0: 145.7, t1: 163.75, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Chilled water above set point', sub: 'at full load', t: 145.8 },
    { text: 'High head pressure on a mild day', t: 150.1 },
    { text: 'Approach creeping up', sub: 'against your baseline', t: 154.9 },
    { text: 'Bubbles, frost, oil stains', t: 158.5 },
  ] },
  { t0: 164.0, t1: 195.6, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Log pressures, temps, approach', sub: 'every shift', t: 164.0, done: 168.3 },
    { text: 'Clean the condenser coils', t: 168.9, done: 174.3 },
    { text: 'Treat + filter water, clean strainers', t: 175.0, done: 178.2 },
    { text: 'Fans, connections, compressor oil', t: 178.8, done: 184.2 },
    { text: 'Leak test by a technician', sub: 'never top up blind', t: 184.9, done: 190.4 },
    { text: 'Test flow switch + freeze stat', t: 191.1, done: 195.0 },
  ] },
];
export const SHAKES = [{ t: 117.5, a: 0.12, d: 0.2 }];
export const FLASHES = [];
