// Shared geometry for the Y-strainer: dimensions, axes and signed distance functions.
// Units: 1 = pipe bore radius. Flow runs along +X. Section plane is z = 0, camera on +z.

const S2 = Math.SQRT1_2;
export const G = {
  R_BORE: 1.0,
  R_NECK: 1.3,
  X_BODY: 3.2,          // body neck ends (flange starts)
  FL_T: 0.35,           // flange thickness
  FL_R: 2.4,            // flange outer radius
  BOLT_PCD: 1.95,       // bolt circle radius
  BOLT_R: 0.12,
  N_BOLTS: 8,
  D: [S2, -S2, 0],      // leg (screen) axis direction
  N: [S2, S2, 0],       // in-plane normal to leg axis
  J: [0, 0, 0],         // where leg axis meets main axis
  LEG_R_OUT: 1.72,
  LEG_R_IN: 1.42,
  LEG_END: 4.62,        // end of cast leg (leg flange starts)
  LEGFL_T: 0.33,
  LEGFL_R: 2.3,
  LEGFL_PCD: 1.9,
  COVER_S: 4.95,        // cover inner face
  COVER_T: 0.3,
  BULB_C: [0.1, -0.25, 0],
  BULB_OUT: [2.0, 1.8, 1.75],
  BULB_IN: [1.72, 1.52, 1.48],
  DUCT_P0: [-2.6, 0, 0],
  DUCT_SEAT_S: 1.3,     // bezier end (on leg axis)
  DUCT_END_S: 1.45,     // duct wall ends here (screen seat)
  DUCT_R_IN: 1.0,
  DUCT_R_OUT: 1.12,
  SCREEN_R: 1.03,
  SCREEN_S0: 1.45,
  SCREEN_S1: 4.95,
  PIPE_R_OUT: 1.14,
  PIPE_X0: 3.9,         // mating flange outer face
  PIPE_X1: 22,
  NIPPLE_R_IN: 0.22,
  NIPPLE_R_OUT: 0.31,
  VALVE_S: 6.05,        // ball valve centre along leg axis
  NOZZLE_S: 7.0,        // blowdown outlet
  GAUGE_X: 5.5,         // gauges at +-GAUGE_X
};

// ---- small vector helpers (arrays) ----
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Point on/around the leg axis: s along axis, radius r, angle th (th=0 -> +N, th=pi/2 -> +Z, 3pi/2 -> -Z (visible half))
export function legPoint(s, r = 0, th = 0) {
  const c = Math.cos(th), si = Math.sin(th);
  return [
    G.J[0] + s * G.D[0] + r * c * G.N[0],
    G.J[1] + s * G.D[1] + r * c * G.N[1],
    G.J[2] + r * si,
  ];
}

// Duct centreline: quadratic bezier from P0 (on main axis) via J to the seat on the leg axis
export const DUCT_P2 = legPoint(G.DUCT_SEAT_S);
export function ductBezier(u) {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return [
    a * G.DUCT_P0[0] + b * G.J[0] + c * DUCT_P2[0],
    a * G.DUCT_P0[1] + b * G.J[1] + c * DUCT_P2[1],
    0,
  ];
}
export function ductTangent(u) {
  const t = [
    2 * (1 - u) * (G.J[0] - G.DUCT_P0[0]) + 2 * u * (DUCT_P2[0] - G.J[0]),
    2 * (1 - u) * (G.J[1] - G.DUCT_P0[1]) + 2 * u * (DUCT_P2[1] - G.J[1]),
    0,
  ];
  return norm(t);
}
// frame offset around duct centreline: th=0 -> in-plane normal (left of travel), pi/2 -> +Z
export function ductPoint(u, r = 0, th = 0) {
  const p = ductBezier(u), t = ductTangent(u);
  const n = [-t[1], t[0], 0];
  const c = Math.cos(th), s = Math.sin(th);
  return [p[0] + r * c * n[0], p[1] + r * c * n[1], r * s];
}
// straight inlet run, same frame convention (n = +Y for travel along +X)
export function inletPoint(x, r = 0, th = 0) {
  return [x, r * Math.cos(th), r * Math.sin(th)];
}

// ---------------- SDF ----------------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function cappedCyl(p, o, u, s0, s1, r) {
  const q = sub(p, o);
  const s = dot(q, u);
  const radial = len(sub(q, mul(u, s)));
  const dr = radial - r;
  const sc = (s0 + s1) / 2, hh = (s1 - s0) / 2;
  const ds = Math.abs(s - sc) - hh;
  const a = Math.max(dr, 0), b = Math.max(ds, 0);
  return Math.min(Math.max(dr, ds), 0) + Math.hypot(a, b);
}
function ellipsoid(p, c, r) {
  const q = sub(p, c);
  const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  const k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
  return k0 * (k0 - 1) / (k1 || 1e-6);
}
function segDist(p, a, b) {
  const pa = sub(p, a), ba = sub(b, a);
  const h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1);
  return len(sub(pa, mul(ba, h)));
}
function polyDist(p, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(p, pts[i], pts[i + 1]));
  return d;
}

const BEND = [];
for (let i = 0; i <= 24; i++) BEND.push(ductBezier(i / 24));
const DUCT_IN_LINE = [[-8, 0, 0], ...BEND, legPoint(G.DUCT_SEAT_S + 1.0)];
const X = [1, 0, 0];

export function sdfParts(p) {
  const neck = cappedCyl(p, [0, 0, 0], X, -G.X_BODY, G.X_BODY, G.R_NECK);
  const bulbO = ellipsoid(p, G.BULB_C, G.BULB_OUT);
  const legO = cappedCyl(p, G.J, G.D, -0.4, G.LEG_END, G.LEG_R_OUT);
  const outer = smin(smin(neck, bulbO, 0.7), legO, 0.55);

  const bore = cappedCyl(p, [0, 0, 0], X, -8, 8, G.R_BORE);
  const bulbI = ellipsoid(p, G.BULB_C, G.BULB_IN);
  const legI = cappedCyl(p, G.J, G.D, 0.25, G.LEG_END + 1.0, G.LEG_R_IN);
  const cavity = smin(smin(bore, bulbI, 0.35), legI, 0.4);

  const sAx = dot(sub(p, G.J), G.D);
  const dBend = polyDist(p, BEND);
  let ductOuter = dBend - G.DUCT_R_OUT;
  ductOuter = Math.max(ductOuter, sAx - G.DUCT_END_S, -p[0] - 2.9);
  const ductInner = polyDist(p, DUCT_IN_LINE) - G.DUCT_R_IN;
  const ductWall = Math.max(ductOuter, -ductInner);
  return { outer, cavity, ductInner, ductWall, sAx };
}

export function sdfBody(p) {
  const { outer, cavity, ductInner, ductWall } = sdfParts(p);
  let d = Math.max(outer, -cavity);
  d = Math.min(d, ductWall);
  d = Math.max(d, -ductInner);
  return d;
}

export function sdfFluid(p) {
  const { cavity, ductInner, ductWall, sAx } = sdfParts(p);
  let d = Math.max(Math.min(cavity, ductInner), -ductWall) + 0.012;
  d = Math.max(d, Math.abs(p[0]) - 3.62 * (p[1] > -1.2 ? 1 : 10)); // close main run ends
  d = Math.max(d, sAx - (G.COVER_S - 0.012));
  return d;
}
