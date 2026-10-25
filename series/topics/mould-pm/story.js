// Two-plate cold-runner mould, 4 cavities — preventive maintenance. Story state as pure functions of t (Emma, 217.6 s).
// three.js coordinates (Y up): mould axis X (fixed half at -X, moving half at +X), parting plane x = 0, the section
// plane z = 0 faces the camera (+Z). Units of 100 mm. The Blender build converts (x, y, z) -> (x, -z, y).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss(a, b, x) * (1 - ss(c, d, x));
const win = (a, b, x) => (x >= a && x < b ? 1 : 0);
// piecewise linear through [t, v] keys (flat outside)
const plin = (t, K) => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const [t0, v0] = K[i - 1], [t1, v1] = K[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); } return K[K.length - 1][1]; };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 2.2);

export const OPEN = 1.2, STROKE = 0.36, G = 98.1;            // open stroke, ejector stroke, gravity (units/s²)
export const FILL = { sprue: 1.015, gate: 1.76, full: 2.4, short: 2.18, burn: 2.37 };
export const TABLE = [0, -2.6, 7.0];                         // inspection plinth top (the shot lies on it, cups up)
export const SHOTS0 = 1248316;                               // shot counter before the first cycle (illustrative)

export const CHAPTERS = [
  { id: 'layout', label: 'Mould & machine', t: 14.3, cut: 1 },
  { id: 'fixed', label: 'Fixed half', t: 21.6, cut: 1 },
  { id: 'halves', label: 'Cavity, core, guides', t: 28.65, cut: 1 },
  { id: 'fill', label: 'Filling & venting', t: 41.85, cut: 1 },
  { id: 'cooling', label: 'Cooling', t: 61.85, cut: 1 },
  { id: 'eject', label: 'Opening & ejection', t: 73.35, cut: 1 },
  { id: 'vents', label: 'Vents & cooling faults', t: 98.9, cut: 1 },
  { id: 'wear', label: 'Guides, pins, O-rings', t: 125.8, cut: 1 },
  { id: 'fix', label: 'The fix', t: 167.05, cut: 1 },
];

// one fast production cycle starting at c (S19): inject, cool, open, eject, drop, close
function fastCycle(t, c) {
  const u = t - c;
  return {
    fill: FILL.full * ss(0, 0.35, u), heat: 1 - 0.85 * ss(0.4, 1.4, u),
    open: OPEN * ss(1.3, 1.65, u) * (1 - ss(2.15, 2.5, u)), eject: STROKE * ss(1.65, 1.85, u) * (1 - ss(1.95, 2.15, u)),
    rel: c + 1.85, vis: u < 2.3, g: 40,
  };
}

export function stateAt(t) {
  // ---------------------------------------------------------------- mould motion
  let open = 0, eject = 0, misalign = 0, explode = 0, strip = 0;
  // how it works: open to show cavity and core, guides close it, clamp, inject, cool, open, eject, return, close
  if (t >= 28.65 && t < 41.85) open = 0.9 * ss(28.9, 30.9, t) - 0.35 * ss(35.0, 36.6, t) - 0.55 * ss(37.3, 41.3, t);
  if (t >= 73.35 && t < 93.75) open = OPEN * ss(74.0, 77.6, t) * (1 - ss(91.9, 93.6, t));
  if (t >= 79.3 && t < 93.75) eject = STROKE * ss(83.3, 86.0, t) * (1 - ss(89.6, 91.3, t));
  let fc = null;
  if (t >= 93.75 && t < 98.9) { fc = fastCycle(t, t < 96.5 ? 94.0 : 96.5); open = fc.open; eject = fc.eject; }
  // pillars worn: the moving half sags out of line
  if (t >= 125.8 && t < 133.95) misalign = -0.025 * ss(128.3, 129.5, t);
  // galled / broken pins: parts hang up
  if (t >= 133.95 && t < 138.4) { open = OPEN; eject = STROKE * ss(134.6, 136.2, t); }
  if (t >= 138.4 && t < 152.95) open = OPEN;
  if (t >= 156.7 && t < 161.85) { open = OPEN; if (t < 160.0) eject = 0.3 * ss(157.0, 158.8, t); }
  if (t >= 171.15 && t < 178.3) open = OPEN;
  if (t >= 178.3 && t < 186.6) explode = ss(179.8, 181.4, t);
  if (t >= 191.1 && t < 198.6) strip = ss(192.3, 193.9, t) * (1 - ss(196.8, 198.3, t));
  if (t >= 201.3 && t < 205.35) open = 0.8 * (1 - ss(203.4, 204.4, t));

  // ---------------------------------------------------------------- the shot (sprue + runners + 4 parts)
  // fill: melt-front distance along the flow (sprue → runner → gate → cavity); fillTop: the top cavity's own front
  let fill = 0, fillTop = null, heat = 0, shotVis = 0, table = 0, rel = -1, g = 10, hang = 0, onB = 1;
  let burn = 0, short = 0, flashTop = 0, flashBot = 0, drag = 0, airGlow = 0, diesel = 0;
  const defects = () => { table = 1; shotVis = 1; fill = FILL.full; fillTop = FILL.short; burn = 1; short = 1; flashBot = 1; drag = 1; };
  if (t < 4.05 || (t >= 152.95 && t < 156.7)) defects();
  if (t >= 210.9 && t < 214.3) { table = 1; shotVis = 1; fill = FILL.full; }
  if (t >= 41.85 && t < 93.75) {              // cycle 1
    fill = plin(t, [[43.9, 0], [44.9, FILL.sprue], [46.9, FILL.gate], [53.1, 2.22], [60.5, FILL.full]]);
    heat = t < 43.9 ? 0 : 1 - 0.92 * ss(64.0, 73.5, t);
    shotVis = t >= 43.9 && t < 88.8 ? 1 : 0; rel = 86.6;            // drop shown slowed down (g = 10 units/s²)
  }
  if (fc) { fill = fc.fill; heat = fc.heat; shotVis = fc.vis ? 1 : 0; rel = fc.rel; g = fc.g; }
  if (t >= 104.55 && t < 112.0) {             // blocked vent: trapped air diesels, burn mark
    fill = plin(t, [[104.6, 0], [105.25, FILL.gate], [106.4, FILL.full]]);
    fillTop = t < 105.3 ? Math.min(fill, FILL.gate) : FILL.gate + (FILL.burn - FILL.gate) * easeOut((t - 105.3) / 3.0);
    heat = t < 104.6 ? 0 : 1 - 0.5 * ss(109.5, 112, t); shotVis = t >= 104.6 ? 1 : 0;
    airGlow = ss(106.6, 108.25, t) * (1 - ss(108.6, 109.4, t)); diesel = pulse(108.15, 108.3, 108.5, 109.1, t);
    burn = ss(108.25, 108.7, t);
  }
  if (t >= 112.0 && t < 117.0) {              // short shot: the air pocket holds the melt back
    fill = plin(t, [[112.05, 0], [112.7, FILL.gate], [113.6, FILL.full]]);
    fillTop = t < 112.75 ? Math.min(fill, FILL.gate) : FILL.gate + (FILL.short - FILL.gate) * easeOut((t - 112.75) / 2.2);
    heat = t < 112.05 ? 0 : 1 - 0.4 * ss(115, 117, t); shotVis = t >= 112.05 ? 1 : 0; short = 1;
    airGlow = 0.35 * ss(113.6, 114.8, t);
  }
  if (t >= 117.0 && t < 129.8) { fill = FILL.full; heat = 0.55; shotVis = 1; }
  if (t >= 129.8 && t < 133.95) {             // flash at the damaged, misaligned parting line
    fill = plin(t, [[130.95, 0], [131.3, FILL.sprue], [131.55, FILL.gate], [131.85, FILL.full]]);
    heat = t < 130.95 ? 0 : 1; shotVis = t >= 130.95 ? 1 : 0; flashTop = ss(131.75, 133.2, t);
  }
  if ((t >= 133.95 && t < 138.4) || (t >= 156.7 && t < 160.0)) {   // pushed off, hangs up on the core
    fill = FILL.full; heat = 0.3; shotVis = 1; hang = t < 140 ? ss(135.6, 136.5, t) : ss(158.3, 159.2, t);
    drag = t >= 156.7 ? 1 : 0;
  }
  if (t >= 161.85 && t < 167.05) { fill = FILL.full; heat = t < 164.4 ? 0.6 : 0.3; shotVis = 1; }
  if (t >= 205.35 && t < 210.9) { fill = FILL.full; heat = 0.4; shotVis = 0; }
  if (fillTop === null) fillTop = fill;

  // shot pose: rides on the cores (B side) once open; pushed by the pins; then falls clear, or hangs up
  let sx = 0, sy = 0, sz = 0, spin = 0, tilt = 0;
  if (table) { [sx, sy, sz] = TABLE; tilt = -Math.PI / 2; spin = 0.35; }
  else {
    sx = open - eject * (hang ? 0.78 : 1);
    if (rel > 0 && t > rel) { const u = t - rel; sy = Math.max(-14, -0.5 * g * u * u); tilt = -1.6 * u; spin = 0.9 * u; sx += 0.2 * u; }
    if (hang) { tilt = -0.14 * hang; sy = -0.06 * hang; }
  }

  // ---------------------------------------------------------------- pins
  const gall = ss(134.4, 135.2, t) * (1 - ss(182.1, 182.9, t));
  const broken = t >= 135.9 && t < 183.0 ? 1 : 0;
  const snap = pulse(135.85, 135.92, 136.0, 136.5, t);
  const stick = (t >= 133.95 && t < 138.4 ? 0.2 * ss(135.0, 135.9, t) : 0) + (t >= 156.7 && t < 160.0 ? 0.16 * ss(157.6, 158.4, t) : 0);
  const lube = ss(182.6, 183.6, t) * (1 - ss(186.5, 186.6, t));
  const springHi = pulse(184.2, 184.45, 184.8, 185.0, t);

  // ---------------------------------------------------------------- vents, cooling, seals
  const ventDirt = Math.max(0.3 * ss(99.2, 101.6, t), ss(101.9, 104.4, t)) * (1 - ss(173.3, 174.8, t));
  const scale = ss(117.4, 119.4, t) * (1 - ss(187.0, 187.9, t));
  const flowA = 1 - 0.65 * ss(120.3, 121.3, t) * (1 - ss(187.5, 188.3, t));
  const blow = ss(199.5, 200.0, t) * (1 - ss(205.3, 205.35, t));
  const waterOn = 1 - ss(200.0, 200.9, t) * (1 - ss(205.3, 205.35, t));
  const oring = ss(141.55, 142.3, t) * (1 - ss(189.9, 190.4, t));
  const leak = ss(142.6, 144.6, t) * (1 - ss(189.9, 190.4, t));
  const drops = ss(144.0, 145.1, t) * (1 - ss(175.2, 176.0, t));
  const newOring = pulse(189.9, 190.2, 190.7, 191.1, t);
  const thermal = pulse(68.4, 69.0, 72.9, 73.35, t) + pulse(120.6, 121.2, 125.5, 125.8, t) + pulse(161.85, 162.0, 164.2, 164.4, t);
  const thermalScaled = t < 161.0 ? ss(121.4, 122.4, t) : 1;
  const plateout = ss(138.8, 140.4, t) * (1 - ss(173.3, 174.8, t));
  const damage = ss(130.5, 131.2, t) * (1 - ss(193.4, 193.6, t));
  const pillarWear = ss(126.0, 127.4, t) * (1 - ss(193.4, 193.6, t));
  const grease = ss(176.6, 177.6, t);
  const cold = pulse(145.7, 146.6, 152.7, 152.95, t);
  const condense = ss(148.7, 150.9, t) * (1 - ss(152.9, 152.95, t));
  const rust = ss(151.3, 152.5, t) * (1 - ss(152.9, 152.95, t));
  const spray = 0;                                            // shown as the protective sheen (protect), not particles
  const protect = ss(202.0, 203.0, t) * (1 - ss(205.3, 205.35, t));
  const machine = t >= 178.3 && t < 205.35 ? 0 : 1;
  const clamp = t < 42.0 ? 0 : ss(42.3, 43.0, t);

  // surface highlights (how it works): cavity = outside of the part, core = inside
  const hiCavity = pulse(30.1, 30.5, 31.3, 31.8, t), hiCore = pulse(34.0, 34.4, 35.0, 35.4, t);

  // flow streak visibility: melt (behind the front), air (ahead of it), water seep
  const meltVis = (fill > 0.01 && fill < FILL.full - 0.005) || (fillTop > 0.01 && fillTop < FILL.burn + 0.02 && heat > 0.9 && t > 104 && t < 117) ? 1 : 0;
  const airVis = t >= 46.0 && t < 61.0 ? 1 : (t >= 105.0 && t < 109.0) || (t >= 112.6 && t < 116.9) ? 1 : 0;
  const ventOpen = t >= 101.9 && t < 117 ? 0 : 1;

  // shot counter: one per cycle; a time-lapse of wear between services
  const cycles = (t >= 43.9 ? 1 : 0) + (t >= 94.0 ? 1 : 0) + (t >= 96.5 ? 1 : 0);
  const lapse = Math.round(250000 * ss(99.2, 101.6, t));
  const later = (t >= 104.6 ? 1 : 0) + (t >= 112.05 ? 1 : 0) + (t >= 130.95 ? 1 : 0);
  const shots = SHOTS0 + cycles + lapse + later + (t >= 167.05 ? Math.round(1800 * ss(167.3, 170.6, t)) : 0);
  const sinceService = cycles + lapse + later + (t >= 167.05 ? Math.round(1800 * ss(167.3, 170.6, t)) : 0);

  return {
    t, open, eject, misalign, explode, strip,
    fill, fillTop, heat, shotVis, table, hang, burn, short, flashTop, flashBot, drag, airGlow, diesel, onB,
    shot: { x: sx, y: sy, z: sz, spin, tilt },
    gall, broken, snap, stick, lube, springHi,
    ventDirt, ventOpen, scale, flowA, blow, waterOn, oring, leak, drops, newOring,
    thermal: clamp01(thermal), thermalScaled, plateout, damage, pillarWear, grease, cold, condense, rust, spray, protect,
    machine, clamp, hiCavity, hiCore, meltVis, airVis, shots, sinceService,
    springLen: springLen(eject, explode, strip),
    warn: ss(153.0, 153.5, t) * (1 - ss(166.6, 167.05, t)),
  };
}

// Rigid groups ("rigs") and their offsets from rest, in three coordinates. Shared by the Blender keyframes and the
// overlay's label anchors, so both always agree.
export const RIGS = ['fixed', 'a', 'ains', 'b', 'bins', 'support', 'spacer', 'ejector', 'pin1', 'mcp', 'platen', 'rod'];
export function rigOffset(name, st) {
  const m = st.misalign, o = st.open;
  const ej = o - st.eject + 0.75 * st.explode + 1.7 * st.strip;
  switch (name) {
    case 'fixed': return [-1.2 * st.strip, 0, 0];
    case 'a': return [-0.55 * st.strip, 0, 0];
    case 'ains': return [-0.55 * st.strip + 0.3 * st.strip, 0, 0];
    case 'b': return [o + 0.35 * st.strip, m, 0];
    case 'bins': return [o + 0.35 * st.strip - 0.3 * st.strip, m, 0];
    case 'support': return [o + 0.8 * st.strip, m, 0];
    case 'spacer': return [o + 1.25 * st.strip, m, 0];
    case 'ejector': return [ej, m, 0];
    case 'pin1': return [ej + st.stick, m, 0];
    case 'mcp': return [o + 1.4 * st.explode + 2.4 * st.strip, m, 0];
    case 'platen': return [o, 0, 0];
    case 'rod': return [o - st.eject, 0, 0];
    default: return [0, 0, 0];
  }
}
// return-pin springs: seat in the support plate (x 0.80) to the retainer plate face (x 1.40); never longer than free
export const SPRING = { seat: 0.8, face: 1.4, free: 0.62 };
export function springLen(eject, explode, strip) {
  const gap = (SPRING.face - eject + 0.75 * explode + 1.7 * strip) - (SPRING.seat + 0.8 * strip);
  return Math.min(gap, SPRING.free);
}
// a point given in the shot's own coordinates (= mould coordinates at rest) → world, for labels on the moving shot
export function shotPoint(st, p) {
  const { x, y, z, spin, tilt } = st.shot;
  const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), st2 = Math.sin(tilt);
  const p1 = [p[0], p[1] * cs - p[2] * sn, p[1] * sn + p[2] * cs];        // spin about X
  const p2 = [p1[0] * ct - p1[1] * st2, p1[0] * st2 + p1[1] * ct, p1[2]]; // tilt about Z
  return [p2[0] + x, p2[1] + y, p2[2] + z];
}
