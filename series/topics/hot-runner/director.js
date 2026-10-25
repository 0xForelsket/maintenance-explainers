// Hot runner — 16:9 deep dive. Shots, labels, panels, HUD and cards; times follow timeline.json (Emma).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.35, b, t));

export const TOTAL = 209.05;
export const TITLE = { big: 'HOT RUNNER', sub: 'manifold · nozzles · gates', t0: 11.6, t1: 13.65 };
export const END = { big: 'HOT RUNNER', a: 'Keep it hot.', b: 'Keep it sealed.', t0: 206.5 };
export const CHAPTERS = [
  { t: 21.2, label: 'HOW IT WORKS', sub: 'Sprue, manifold, nozzles and gates' },
  { t: 101.05, label: 'WHAT GOES WRONG', sub: 'Leaks, heaters, thermocouples and gates' },
  { t: 154.3, label: 'WARNING SIGNS', sub: 'What the controller and the parts tell you' },
  { t: 173.05, label: 'THE FIX', sub: 'Start-up, logging and inspection' },
];
const R = [40, 0, 0];
const at = (o, d) => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
const k2 = (id, t0, t1, p0, g0, p1, g1, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, extra.fov || 36], [1, p1, g1, extra.fov || 36]], ez: 'lin', ...extra });
export const SHOTS = [
  k2('S1', 0, 4.0, [-0.9, 0.62, 3.7], [-2.2, 0.15, 0], [-1.25, 0.5, 3.2], [-2.2, 0.15, 0]),
  k2('S2', 4.0, 8.0, [0.5, 1.0, 12.8], [0, 0.1, 0], [0.3, 0.9, 11.6], [0, 0.1, 0]),
  k2('S3', 8.0, 11.6, [2.7, 2.7, 6.6], [0.4, 1.6, 0], [2.2, 2.45, 6.0], [0.4, 1.6, 0]),
  k2('S4', 11.6, 13.7, [7.8, 3.8, 10.8], [0, 0.6, 0], [6.8, 3.2, 9.6], [0, 0.6, 0]),
  k2('S5', 13.7, 21.1, at(R, [0, 4.2, 8.2]), at(R, [0, 0.1, 0]), at(R, [0, 3.7, 7.3]), at(R, [0, 0.1, 0])),
  { id: 'S6', t0: 21.1, t1: 30.1, keys: [[0, [0.9, 3.7, 4.8], [0, 2.7, 0], 36], [1, [0.7, 2.3, 6.4], [-0.6, 1.7, 0], 36]], ez: 'ease' },
  k2('S7', 30.1, 37.9, [-0.4, 3.0, 5.6], [0, 1.7, 0], [0.5, 2.7, 6.3], [0, 1.7, 0]),
  { id: 'S8', t0: 37.9, t1: 43.4, keys: [[0, [-0.9, 1.7, 4.3], [-2.2, 1.2, 0], 36], [1, [-1.15, 0.55, 3.9], [-2.2, 0.3, 0], 36]], ez: 'ease' },
  k2('S9', 43.4, 52.5, [1.7, 1.7, 9.8], [0.5, 1.2, 0], [1.5, 1.55, 9.1], [0.5, 1.2, 0], { shift: 0.15 }),
  k2('S10', 52.5, 61.1, [-1.3, 0.55, 2.7], [-2.2, 0.25, 0], [-1.45, 0.48, 2.35], [-2.2, 0.25, 0]),
  k2('S11a', 61.1, 65.6, [-1.35, 0.5, 2.5], [-2.2, 0.22, 0], [-1.5, 0.45, 2.2], [-2.2, 0.22, 0]),
  k2('S11b', 65.6, 71.1, [3.7, 1.7, 5.6], [2.2, 1.5, 0], [3.5, 1.6, 5.1], [2.2, 1.5, 0]),
  k2('S12', 71.1, 78.5, [0.6, 1.9, 8.8], [0, 1.6, 0], [0.4, 1.7, 8.0], [0, 1.6, 0]),
  k2('S13', 78.5, 90.6, [-1.15, 1.62, 2.5], [-2.15, 1.4, 0], [-1.3, 1.57, 2.2], [-2.15, 1.4, 0], { shift: -0.14 }),
  k2('S14', 90.6, 101.0, [0.9, 1.7, 9.6], [0.2, 1.2, 0], [0.8, 1.6, 9.0], [0.2, 1.2, 0], { shift: 0.16 }),
  k2('S15', 101.0, 103.8, [-0.4, 1.4, 13.2], [0, 0.6, 0], [-0.2, 1.3, 12.2], [0, 0.6, 0]),
  k2('S16', 103.8, 112.2, [-1.0, 1.95, 3.1], [-2.15, 1.25, -0.2], [-1.2, 1.75, 2.7], [-2.15, 1.25, -0.2], { shift: -0.12 }),
  k2('S17a', 112.2, 116.6, [0.9, 1.85, 3.8], [-0.6, 1.25, -0.5], [0.7, 1.75, 3.4], [-0.6, 1.25, -0.5], { shift: -0.12 }),
  k2('S17b', 116.6, 120.6, [3.2, 2.6, 14.2], [0, 1.1, 0], [2.7, 2.3, 13.0], [0, 1.1, 0]),
  k2('S18', 120.6, 128.1, [-1.05, 0.95, 2.7], [-2.2, 0.7, 0], [-1.25, 0.85, 2.35], [-2.2, 0.7, 0], { shift: 0.14 }),
  k2('S19', 128.1, 135.4, [3.5, 1.25, 3.3], [2.3, 1.0, 0], [3.3, 1.15, 3.0], [2.3, 1.0, 0], { shift: -0.12 }),
  k2('S20', 135.4, 141.2, [1.0, 1.1, 7.9], [0.4, 0.9, 0], [0.9, 1.0, 7.4], [0.4, 0.9, 0], { shift: 0.15 }),
  k2('S21a', 141.2, 145.2, [-0.6, -0.15, 4.6], [-1.8, -0.4, 0], [-0.75, -0.2, 4.2], [-1.8, -0.4, 0]),
  k2('S21b', 145.2, 148.1, [3.3, 0.45, 3.1], [2.2, -0.15, 0], [3.15, 0.4, 2.8], [2.2, -0.15, 0]),
  k2('S22', 148.1, 154.3, [3.1, 0.95, 2.6], [2.2, 0.45, 0], [3.0, 0.75, 2.4], [2.2, 0.3, 0]),
  k2('S23', 154.3, 161.2, [0.2, 1.3, 9.6], [-0.3, 0.9, 0], [0.1, 1.2, 9.0], [-0.3, 0.9, 0], { shift: 0.04 }),
  k2('S24', 161.2, 164.9, [0.4, 0.9, 6.6], [0, 0.6, 0], [0.3, 0.85, 6.1], [0, 0.6, 0], { shift: 0.04 }),
  k2('S25', 164.9, 168.7, [0.6, -0.25, 5.9], [0.2, -0.75, 0], [0.5, -0.3, 5.4], [0.2, -0.75, 0], { shift: 0.12 }),
  k2('S26', 168.7, 173.0, [-0.6, 1.2, 7.4], [-0.4, 0.8, 1.8], [-0.5, 1.15, 6.8], [-0.4, 0.8, 1.8], { shift: 0.12 }),
  k2('S27', 173.0, 179.8, [0.4, 1.6, 11.2], [0, 1.1, 0], [0.3, 1.5, 10.6], [0, 1.1, 0]),
  k2('S28', 179.8, 184.4, [-0.4, 1.45, 4.8], [-1.6, 1.0, 0], [-0.6, 1.4, 4.4], [-1.6, 1.0, 0], { shift: 0.1 }),
  k2('S29', 184.4, 189.3, [1.6, 0.6, 11.6], [0, -0.1, 0], [1.4, 0.55, 10.8], [0, -0.1, 0]),
  k2('S30', 189.3, 196.4, [7.0, 1.95, 4.8], [5.4, 1.2, 0.6], [6.8, 1.85, 4.4], [5.4, 1.2, 0.6], { shift: 0.04 }),
  k2('S31', 196.4, 200.9, [6.0, 1.75, 2.6], [5.1, 1.4, 0.4], [5.85, 1.7, 2.35], [5.1, 1.4, 0.4], { shift: 0.1 }),
  k2('S32', 200.9, 206.4, [3.4, 1.9, 4.8], [2.2, 1.6, 0], [3.25, 1.85, 4.4], [2.2, 1.6, 0], { shift: 0.1 }),
  k2('S33', 206.4, 212, [0.4, 1.2, 11.0], [0, 0.6, 0], [1.6, 2.2, 15.5], [0, 0.8, 0], { ez: 'ease' }),
];

export function sceneOpts(t, shot) {
  switch (shot.id) {
    case 'S4': return { cut: 0 };
    case 'S10': case 'S12': case 'S14': case 'S27': return { cut: 1, thermal: 1 };
    case 'S13': return { cut: 1, thermal: ss(83.7, 84.4, t) };
    case 'S20': return { cut: 1, thermal: ss(136.0, 136.8, t) };
    case 'S26': return { cut: 0 };
    case 'S29': return { cut: 0, thermal: 1 };
    case 'S33': return { cut: 1 - ss(207.0, 208.4, t) };
    default: return { cut: 1 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S4') exposure = 0.35 + 0.65 * ss(11.6, 12.3, t);
  return { exposure };
}

export const LABELS = [
  { text: 'MOLTEN TO THE GATE', anchor: 'tipL', t0: 1.0, t1: 3.95, dx: 90, dy: -170 },
  { text: 'PARTS ONLY', sub: 'no runner, no regrind', anchor: 'partL', t0: 4.45, t1: 5.55, dx: -120, dy: 150 },
  { text: 'HEATED MANIFOLD', anchor: 'manifold', t0: 8.6, t1: 11.55, dx: -80, dy: -150 },
  { text: 'COLD RUNNER', sub: '2 parts + a runner', anchor: 'cold', t0: 14.4, t1: 21.0, dx: -80, dy: -150 },
  { text: 'RUNNER → REGRIND', anchor: 'coldRunner', t0: 16.8, t1: 21.0, dx: 100, dy: 140, tone: 'bad' },
  { text: 'HOT RUNNER', sub: 'just the parts', anchor: 'hotShot', t0: 18.2, t1: 21.0, dx: 100, dy: -150 },
  { text: 'MACHINE NOZZLE', anchor: 'machNoz', t0: 23.4, t1: 26.0, dx: 110, dy: -60 },
  { text: 'HEATED SPRUE', anchor: 'sprue', t0: 24.8, t1: 28.0, dx: 120, dy: 40 },
  { text: 'MANIFOLD', sub: 'steel block, drilled channels', anchor: 'manifold', t0: 27.4, t1: 30.05, dx: -90, dy: -130 },
  { text: 'HEATER', anchor: 'manHeater', t0: 30.8, t1: 34.2, dx: -90, dy: -120 },
  { text: 'EQUAL SPLIT', sub: 'same pressure, same temperature', anchor: 'channel', t0: 33.6, t1: 37.85, dx: 90, dy: -140 },
  { text: 'HEATED NOZZLE', anchor: 'nozzleL', t0: 38.6, t1: 41.6, dx: 110, dy: -60 },
  { text: 'GATE', anchor: 'gateL', t0: 41.0, t1: 43.35, dx: 120, dy: 60 },
  { text: 'THERMOCOUPLE', anchor: 'tcMan', t0: 44.4, t1: 48.0, dx: 90, dy: -130 },
  { text: 'ZONE 4', sub: 'heater + thermocouple', anchor: 'heaterL', t0: 47.6, t1: 52.45, dx: 90, dy: 120 },
  { text: 'HOT MELT', anchor: 'tipL', t0: 53.6, t1: 57.4, dx: -110, dy: -120 },
  { text: 'COOLED STEEL', anchor: 'cooling', t0: 56.6, t1: 61.05, dx: 90, dy: 110 },
  { text: 'THERMAL GATE', sub: 'a plug freezes at the tip', anchor: 'gateL', t0: 61.6, t1: 65.55, dx: 110, dy: 90 },
  { text: 'VALVE PIN', anchor: 'pin', t0: 66.0, t1: 71.05, dx: 110, dy: -60 },
  { text: 'AIR PISTON', anchor: 'piston', t0: 67.4, t1: 71.05, dx: 110, dy: -50 },
  { text: 'AIR GAP', sub: 'insulates the manifold', anchor: 'airGap', t0: 71.8, t1: 78.45, dx: -90, dy: -130 },
  { text: 'CENTRE LOCATOR', anchor: 'locator', t0: 73.4, t1: 78.45, dx: 90, dy: 130 },
  { text: 'SPACERS', anchor: 'spacer', t0: 74.6, t1: 78.45, dx: 90, dy: -110 },
  { text: 'COLD: GAP', anchor: 'gapL', t0: 84.4, t1: 87.6, dx: 110, dy: -110, tone: 'warn' },
  { text: 'HOT: SEALED', anchor: 'gapL', t0: 88.6, t1: 90.55, dx: 110, dy: -110 },
  { text: 'NOT SOAKED: GAP OPEN', anchor: 'gapL', t0: 104.4, t1: 106.5, dx: 120, dy: -110, tone: 'warn' },
  { text: 'LEAK', sub: 'melt floods the plate', anchor: 'leak', t0: 107.0, t1: 112.15, dx: 120, dy: 110, tone: 'bad' },
  { text: 'WIRES ENCASED', anchor: 'wires', t0: 112.8, t1: 116.55, dx: 90, dy: 120, tone: 'bad' },
  { text: 'STRIP-DOWN', sub: 'can take days', anchor: 'manifold', t0: 117.4, t1: 120.55, dx: -100, dy: -120, tone: 'bad' },
  { text: 'MOISTURE', anchor: 'heaterL', t0: 121.4, t1: 124.8, dx: -110, dy: -100, tone: 'warn' },
  { text: 'SHORT', sub: 'zone dead', anchor: 'heaterL', t0: 125.0, t1: 128.05, dx: -110, dy: -100, tone: 'bad' },
  { text: 'TC OUT OF ITS POCKET', anchor: 'tcR', t0: 129.4, t1: 135.35, dx: 110, dy: -100, tone: 'bad' },
  { text: 'OVERHEATING', sub: 'burns the plastic', anchor: 'nozzleR', t0: 131.6, t1: 135.35, dx: 110, dy: 110, tone: 'bad' },
  { text: 'TOO HOT', anchor: 'nozzleL', t0: 136.6, t1: 141.15, dx: -110, dy: -100, tone: 'bad' },
  { text: 'TOO COLD', anchor: 'nozzleR', t0: 137.4, t1: 141.15, dx: 110, dy: -100, tone: 'warn' },
  { text: 'DROOL + STRINGS', sub: 'gate too hot', anchor: 'gateL', t0: 142.4, t1: 145.15, dx: 120, dy: -90, tone: 'bad' },
  { text: 'FROZEN GATE', sub: 'too cold', anchor: 'gateR', t0: 145.6, t1: 148.05, dx: 110, dy: -110, tone: 'bad' },
  { text: 'SHORT SHOT', anchor: 'partR', t0: 146.4, t1: 148.05, dx: 110, dy: 110, tone: 'bad' },
  { text: 'DEPOSITS ON THE PIN', anchor: 'pinLow', t0: 149.2, t1: 154.25, dx: 110, dy: -110, tone: 'bad' },
  { text: "GATE WON'T SHUT", anchor: 'gateR', t0: 151.4, t1: 154.25, dx: 110, dy: 90, tone: 'bad' },
  { text: 'LONG GATE MARKS', anchor: 'partL', t0: 165.6, t1: 168.65, dx: -100, dy: -120, tone: 'bad' },
  { text: 'SHORT CAVITY', anchor: 'partR', t0: 166.6, t1: 168.65, dx: 100, dy: 110, tone: 'bad' },
  { text: 'PLASTIC WEEPING', sub: 'parting line', anchor: 'weep', t0: 169.6, t1: 172.95, dx: 100, dy: -120, tone: 'bad' },
  { text: 'DRYING OUT', anchor: 'heaterL', t0: 180.6, t1: 184.35, dx: 110, dy: -100 },
  { text: 'LABEL EVERY ZONE', anchor: 'tags', t0: 197.0, t1: 200.85, dx: -110, dy: -110 },
  { text: 'INSPECT THE VALVE PIN', anchor: 'pin', t0: 201.6, t1: 206.35, dx: 110, dy: -80 },
];

// ---------------------------------------------------------------- panels (diagram / spec cards)
const row = (cells, cols) => `<div style="display:grid;grid-template-columns:${cols};gap:6px 14px;align-items:baseline;font:500 20px/1.25 Inter,sans-serif;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.07)">${cells.join('')}</div>`;
const mono = (v, c = '#fff', w = 700) => `<span style="font:${w} 20px/1.25 'JetBrains Mono',monospace;color:${c};text-align:right">${v}</span>`;
const bar = (v, c) => `<span style="display:block;height:8px;border-radius:4px;background:rgba(255,255,255,0.1)"><i style="display:block;height:8px;border-radius:4px;width:${(clamp01(v) * 100).toFixed(0)}%;background:${c}"></i></span>`;
const ZN = ['Z1 · sprue', 'Z2 · manifold L', 'Z3 · manifold R', 'Z4 · nozzle 1', 'Z5 · nozzle 2'];
function zoneTable(t, opt = {}) {
  const set = [230, 235, 235, 240, 240];
  const head = row([`<span style="color:#a9bccb;font-size:16px;letter-spacing:.12em">ZONE</span>`, `<span style="color:#a9bccb;font-size:16px;text-align:right">SET</span>`, `<span style="color:#a9bccb;font-size:16px;text-align:right">ACTUAL</span>`, `<span style="color:#a9bccb;font-size:16px">POWER</span>`], '1.5fr 0.7fr 0.9fr 1fr');
  const rows = ZN.map((z, i) => {
    let act = set[i] + Math.sin(t * 1.3 + i * 2) * 0.4, pw = [0.32, 0.36, 0.34, 0.38, 0.35][i] + Math.sin(t * 0.9 + i) * 0.02, col = '#6ff0b0', note = '';
    if (opt.short && i === 3) { act = 240 - 160 * opt.short; pw = 0; col = '#ff5a4e'; note = 'SHORT'; }
    if (opt.alarm && i === 1) { note = 'HEATER OPEN'; col = '#ff5a4e'; pw = 0; act = 180; }
    if (opt.alarm && i === 3) { note = 'TC OPEN'; col = '#ff5a4e'; act = NaN; }
    if (opt.crossed && i === 3) { act = 240 + 52 * opt.crossed; col = '#ff5a4e'; }
    if (opt.crossed && i === 4) { act = 240 - 75 * opt.crossed; col = '#ffb35c'; }
    const a = Number.isNaN(act) ? '—' : `${act.toFixed(0)}°`;
    return row([`<span>${z}</span>`, mono(set[i] + '°', '#a9bccb', 500), mono(note || a, col), bar(pw, col)], '1.5fr 0.7fr 0.9fr 1fr');
  });
  return head + rows.join('') + (opt.note ? `<div class="note">${opt.note}</div>` : '');
}
function heatChart(clock, opt = {}) {
  const W = 548, H = 250, x = (m) => 44 + (m / 45) * (W - 60), y = (T) => H - 34 - (T / 260) * (H - 60);
  const curve = (f) => { let d = ''; for (let m = 0; m <= 45; m += 0.5) d += `${m ? 'L' : 'M'}${x(m).toFixed(1)},${y(f(m)).toFixed(1)}`; return d; };
  const nz = (m) => 235 * (1 - Math.exp(-m / 0.9)), mf = (m) => 235 * (1 - Math.exp(-m / 9.5)) * Math.min(1, m / 30 + 0.2);
  const g = (m, T) => Math.min(1, m / T);
  const gx = (m) => `<line x1="${x(m)}" y1="${y(0)}" x2="${x(m)}" y2="${y(260)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 6"/>`;
  return `<svg width="${W}" height="${H}" style="display:block">
    ${[0, 15, 30, 45].map((m) => `${gx(m)}<text x="${x(m)}" y="${H - 10}" fill="#8fa2b0" font-size="16" text-anchor="middle">${m} min</text>`).join('')}
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(45)}" y2="${y(0)}" stroke="rgba(255,255,255,0.25)"/>
    <path d="${curve(nz)}" fill="none" stroke="#ffb35c" stroke-width="3.5"/>
    <path d="${curve(mf)}" fill="none" stroke="#ff5a4e" stroke-width="3.5"/>
    <rect x="${x(3)}" y="${y(250)}" width="${x(18) - x(3)}" height="10" rx="5" fill="rgba(255,179,92,0.35)"/><text x="${x(3) + 6}" y="${y(250) - 6}" fill="#ffb35c" font-size="15">nozzle still growing</text>
    <rect x="${x(30)}" y="${y(250) + 18}" width="${x(42) - x(30)}" height="10" rx="5" fill="rgba(255,90,78,0.35)"/><text x="${x(30) - 2}" y="${y(250) + 12}" fill="#ff8a7a" font-size="15">manifold soak</text>
    <text x="${x(5)}" y="${y(nz(5)) + 22}" fill="#ffb35c" font-size="16">nozzle</text><text x="${x(19)}" y="${y(mf(19)) + 24}" fill="#ff8a7a" font-size="16">manifold</text>
    ${opt.ready ? `<text x="${x(43)}" y="${y(120)}" fill="#6ff0b0" font-size="17" text-anchor="end">first shot →</text>` : ''}
    <line x1="${x(clock)}" y1="${y(0)}" x2="${x(clock)}" y2="${y(260)}" stroke="#8fe9ff" stroke-width="2.5"/>
    <circle cx="${x(clock)}" cy="${y(nz(clock))}" r="6" fill="#ffb35c"/><circle cx="${x(clock)}" cy="${y(mf(clock))}" r="6" fill="#ff5a4e"/>
  </svg>`;
}
export function panel(t, st) {
  if (t > 43.8 && t < 52.45) return { opacity: fade(t, 43.8, 52.45), side: 'left', title: 'ZONE CONTROLLER', html: zoneTable(t, { note: 'Each zone pairs one heater with one thermocouple. The controller adjusts power to hold the set point.' }) };
  if (t > 84.2 && t < 90.55) return { opacity: fade(t, 84.2, 90.55), side: 'right', w: 560, title: 'THERMAL GROWTH', html: `<div class="tb"><span>Steel grows about</span><b>12 µm / m·°C</b><span>300 mm manifold, +200 °C</span><b>≈ 0.7 mm</b><span>Gap when cold</span><b style="color:${st.expand > 0.95 ? '#6ff0b0' : '#ffb35c'}">${st.expand > 0.95 ? 'closed · preloaded' : 'open'}</b></div><div class="note">The manifold is clamped between spacers and nozzles, so its growth becomes the sealing force.</div>` };
  if (t > 91.0 && t < 100.95) return { opacity: fade(t, 91.0, 100.95), side: 'left', title: 'HEAT-UP · TYPICAL', html: heatChart(st.clock, { ready: st.clock > 40 }) + `<div class="note">At temperature is not the same as sealed. Ask your hot runner supplier for the soak time.</div>` };
  if (t > 121.0 && t < 128.05) return { opacity: fade(t, 121.0, 128.05), side: 'left', title: 'ZONE CONTROLLER', color: '#ff8f7a', html: zoneTable(t, { short: ss(125.0, 125.4, t) }) };
  if (t > 113.0 && t < 116.55) return { opacity: fade(t, 113.0, 116.55), side: 'right', w: 520, title: 'ALARMS', color: '#ff5a4e', html: zoneTable(t, { alarm: ss(114.2, 114.8, t) > 0.5 }) };
  if (t > 135.8 && t < 141.15) return { opacity: fade(t, 135.8, 141.15), side: 'left', title: 'WIRED THE WRONG WAY ROUND', color: '#ff8f7a', html: zoneTable(t, { crossed: ss(136.4, 137.6, t), note: 'Zone 4 heats nozzle 2 but reads nozzle 1, and the other way round: one runs away hot, the other drifts cold.' }) };
  if (t > 173.4 && t < 179.75) {
    const step = t < 175.4 ? 0 : t < 177.6 ? 1 : t < 178.6 ? 2 : 3;
    const steps = ['Manifold zones on first', 'Nozzles on, near manifold set point', 'Soak: let everything grow', 'First shot'];
    return { opacity: fade(t, 173.4, 179.75), side: 'right', w: 520, title: 'START-UP ORDER', color: '#6ff0b0', html: steps.map((s, i) => `<div style="display:flex;gap:12px;align-items:center;padding:7px 0;font:600 21px/1.3 Inter,sans-serif;opacity:${i <= step ? 1 : 0.35}"><span style="width:30px;height:30px;border-radius:7px;display:grid;place-items:center;font:700 17px 'JetBrains Mono',monospace;background:${i < step ? '#6ff0b0' : 'rgba(111,240,176,0.15)'};color:${i < step ? '#06110c' : '#6ff0b0'};border:1.5px solid rgba(111,240,176,0.6)">${i < step ? '✓' : i + 1}</span>${s}</div>`).join('') };
  }
  return null;
}

// ---------------------------------------------------------------- HUD (right-hand readouts)
const Z5 = [241, 236, 247, 233, 249, 231, 246, 234, 248, 232];
export function hud(t, st) {
  if (t > 91.0 && t < 100.95) return { opacity: fade(t, 91.0, 100.95), title: 'TIME-LAPSE', items: [{ k: 'SINCE SWITCH-ON', v: `${st.clock.toFixed(0)} min`, big: true }, { k: 'NOZZLE', v: st.clock < 3 ? 'heating' : st.clock < 18 ? 'hot · growing' : 'sealed', color: st.clock < 18 ? '#ffb35c' : '#6ff0b0' }, { k: 'MANIFOLD', v: st.clock < 30 ? 'heating' : st.clock < 40 ? 'soaking' : 'ready', color: st.clock < 40 ? '#ffb35c' : '#6ff0b0' }] };
  if (t > 101.6 && t < 112.15) return { opacity: fade(t, 101.6, 112.15), title: 'COLD START', items: [{ k: 'SINCE SWITCH-ON', v: '8 min', big: true, color: '#ffb35c' }, { k: 'ZONES AT SET POINT', v: t > 106 ? 'yes' : 'almost', color: '#6ff0b0' }, { k: 'FULLY SOAKED', v: 'no', color: '#ff5a4e' }] };
  if (t > 128.6 && t < 135.35) return { opacity: fade(t, 128.6, 135.35), title: 'ZONE 5 · NOZZLE 2', items: [{ k: 'CONTROLLER READS', v: `${(240 - 12 * st.tcOut).toFixed(0)} °C`, color: '#6ff0b0' }, { k: 'REAL TEMPERATURE', v: `${(240 + 75 * st.overR).toFixed(0)} °C`, big: true, color: '#ff5a4e' }, { k: 'POWER', v: `${(35 + 65 * st.tcOut).toFixed(0)} %`, color: st.tcOut > 0.5 ? '#ff5a4e' : '#fff' }] };
  if (t > 154.6 && t < 161.15) return { opacity: fade(t, 154.6, 161.15), title: 'ZONE POWER', items: ZN.map((z, i) => ({ k: z.toUpperCase(), v: `${[31, 36, 34, 78, 33][i]} %`, color: i === 3 ? '#ff5a4e' : '#6ff0b0', big: i === 3 })) };
  if (t > 161.4 && t < 164.85) return { opacity: fade(t, 161.4, 164.85), title: 'ZONE 5 · LAST 10 MIN', items: [{ k: 'SET POINT', v: '240 °C' }, { k: 'SWING', v: '± 9 °C', color: '#ff5a4e', big: true }], spark: { values: Z5, n: Z5.length, lo: 225, hi: 255, color: '#ff5a4e', band: [238, 242], unit: '°' } };
  if (t > 180.0 && t < 184.35) { const p = 0.15 + 0.85 * ss(180.4, 183.6, t); return { opacity: fade(t, 180.0, 184.35), title: 'SOFT START', items: [{ k: 'HEATER POWER', v: `${(p * 100).toFixed(0)} %`, big: true }, { k: 'MOISTURE', v: p < 0.8 ? 'driving off' : 'dry', color: p < 0.8 ? '#ffb35c' : '#6ff0b0' }], bar: { k: 'RAMP', v: p, text: `${(p * 100).toFixed(0)} %`, color: '#6ff0b0' } }; }
  if (t > 184.8 && t < 189.25) return { opacity: fade(t, 184.8, 189.25), title: 'PLATE TEMPERATURES', items: [{ k: 'A PLATE', v: '51 °C' }, { k: 'B PLATE', v: '49 °C' }, { k: 'DIFFERENCE', v: '2 °C ✓', big: true, color: '#6ff0b0' }] };
  if (t > 189.8 && t < 196.35) { const done = Math.floor(ss(190.0, 195.4, t) * 5.99); return { opacity: fade(t, 189.8, 196.35), title: 'HEATER RESISTANCE · Ω', items: ZN.map((z, i) => ({ k: z.toUpperCase(), v: i < done ? `${[24.1, 18.6, 18.4, 21.8, 22.1][i].toFixed(1)}  ✓` : '—', color: i < done ? '#6ff0b0' : '#5f6d78' })) }; }
  return null;
}

export const CARDS = [
  { t0: 154.4, t1: 172.9, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'A zone drawing more power', sub: 'often a leak', t: 154.6 },
    { text: "Zones that won't settle", t: 161.3 },
    { text: 'Long gate marks, strings, a short cavity', t: 165.0 },
    { text: 'Plastic weeping from the mould', t: 168.8 },
  ] },
  { t0: 173.15, t1: 206.2, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Manifold first, then nozzles', sub: 'full soak before the first shot', t: 173.2, done: 179.4 },
    { text: 'Soft start for damp heaters', t: 179.9, done: 183.9 },
    { text: 'Plates within a few degrees', t: 184.5, done: 188.9 },
    { text: 'Log heater Ω and TC readings', t: 189.4, done: 195.9 },
    { text: 'Label zones, check the wiring', t: 196.5, done: 200.4 },
    { text: 'Inspect gates and valve pins', t: 201.0, done: 205.8 },
  ] },
];
export const SHAKES = [{ t: 125.0, a: 0.25, d: 0.18 }];
export const FLASHES = [{ t: 125.0, a: 0.35, d: 0.12 }];
