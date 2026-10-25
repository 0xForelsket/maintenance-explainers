// Two-plate cold-runner mould, 4 cavities — preventive maintenance. 16:9 deep dive rendered in Blender (3D) with the
// HTML overlay on top. Shots, labels, panels, HUD and cards; times follow timeline.json (Emma).
// Camera keys and anchors are three.js coordinates (Y up); the section plane z = 0 faces the camera.
import { stateAt, OPEN, FILL } from './story.js';
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fade = (t, a, b) => ss(a, a + 0.4, t) * (1 - ss(b - 0.35, b, t));
const fmt = (n) => Math.round(n).toLocaleString('en-GB');

export const TOTAL = 217.6;
export const CAPTION_MODE = 'chunk';     // whole caption chunk at once, no per-word pop-in
export const TITLE = { big: 'MOULD MAINTENANCE', sub: 'a two-plate mould, step by step', t0: 11.3, t1: 14.2 };
export const END = { big: 'MOULD MAINTENANCE', a: 'Clean vents. Free pins.', b: 'Good parts.', t0: 214.35 };
export const CHAPTERS = [
  { t: 14.3, label: 'HOW IT WORKS', sub: 'Plates, flow, cooling and ejection' },
  { t: 98.9, label: 'WHAT GOES WRONG', sub: 'Vents, cooling, guides, pins and seals' },
  { t: 153.0, label: 'WARNING SIGNS', sub: 'What the parts and the press tell you' },
  { t: 167.05, label: 'THE FIX', sub: 'Maintenance planned by shot count' },
];
const k2 = (id, t0, t1, p0, g0, p1, g1, extra = {}) => ({ id, t0, t1, keys: [[0, p0, g0, extra.fov || 36], [1, p1, g1, extra.fov || 36]], ez: 'lin', ...extra });
const O = OPEN;
export const SHOTS = [
  // hook: the defective shot on the inspection plinth, then the machine
  k2('S1', 0, 4.05, [1.9, -1.15, 9.9], [0, -2.45, 7.0], [1.35, -1.4, 9.35], [0, -2.47, 7.0], { fov: 32 }),
  k2('S2', 4.05, 7.25, [6.2, 2.6, 13.8], [0.4, -0.3, 0], [5.0, 2.1, 12.4], [0.4, -0.3, 0], { shift: -0.12 }),
  k2('S3', 7.25, 11.35, [3.6, 1.5, 12.8], [0.4, -0.1, 0], [1.1, 1.0, 11.2], [0.4, -0.1, 0]),
  k2('S4', 11.35, 14.3, [0.7, 0.9, 12.4], [0.4, -0.1, 0], [0.6, 0.8, 11.8], [0.4, -0.1, 0]),
  // how it works
  k2('S5', 14.3, 21.6, [0.5, 0.6, 11.2], [0.4, -0.1, 0], [0.4, 0.5, 10.3], [0.4, -0.1, 0], { shift: 0.15 }),
  k2('S6', 21.6, 28.65, [-0.95, 0.75, 4.3], [-1.25, 0.15, 0], [-1.3, 0.5, 3.7], [-1.2, 0.05, 0], { shift: -0.1 }),
  k2('S7', 28.65, 37.0, [0.45, 1.35, 3.7], [0.35, 1.05, 0], [0.3, 1.2, 3.3], [0.2, 1.0, 0]),
  k2('S8', 37.0, 41.85, [0.55, 1.95, 1.7], [0.25, 1.45, -1.45], [0.3, 1.8, 1.15], [0.2, 1.45, -1.45]),
  k2('S9', 41.85, 49.2, [0.0, 0.3, 7.6], [-0.2, 0.0, 0], [-0.1, 0.25, 6.9], [-0.2, 0.0, 0], { shift: -0.1 }),
  k2('S10', 49.2, 53.05, [-0.05, 1.1, 2.1], [-0.1, 1.07, 0], [-0.08, 1.12, 1.8], [-0.1, 1.07, 0]),
  k2('S11', 53.05, 61.85, [0.12, 1.42, 0.75], [0.0, 1.42, 0], [0.08, 1.45, 0.6], [0.0, 1.43, 0], { shift: 0.15 }),
  k2('S12', 61.85, 65.2, [-0.05, 1.0, 4.2], [-0.05, 1.0, 0], [-0.1, 0.95, 3.8], [-0.05, 1.0, 0], { shift: -0.1 }),
  k2('S13', 65.2, 68.3, [-0.25, 2.15, 1.5], [-0.36, 1.95, 0], [-0.32, 1.55, 1.1], [-0.32, 1.42, 0]),
  k2('S14', 68.3, 73.35, [0.1, 0.6, 5.0], [-0.05, 0.6, 0], [0.05, 0.55, 4.6], [-0.05, 0.6, 0], { shift: 0.15 }),
  k2('S15', 73.35, 79.3, [0.6, 0.5, 6.5], [0.4, 0.3, 0], [0.9, 0.45, 6.2], [0.8, 0.3, 0]),
  k2('S16', 79.3, 84.5, [2.4, 0.9, 3.6], [2.5, 0.4, 0], [2.5, 0.8, 3.2], [2.5, 0.4, 0]),
  k2('S17', 84.5, 88.3, [1.0, 0.9, 3.4], [1.0, 0.6, 0], [0.9, 0.7, 3.1], [1.0, 0.3, 0]),
  k2('S18', 88.3, 93.75, [1.8, 0.9, 4.6], [1.8, 0.6, -0.4], [1.6, 0.8, 4.2], [1.4, 0.5, -0.4]),
  k2('S19', 93.75, 98.9, [0.9, 1.0, 9.5], [0.6, -0.3, 0], [0.7, 0.8, 8.8], [0.6, -0.3, 0], { shift: -0.12 }),
  // what goes wrong
  k2('S20', 98.9, 101.8, [0.4, 0.4, 8.0], [0.1, 0.2, 0], [0.3, 0.4, 7.4], [0.1, 0.2, 0]),
  k2('S21', 101.8, 104.55, [0.14, 1.44, 0.7], [0.0, 1.42, 0], [0.1, 1.45, 0.58], [0.0, 1.43, 0]),
  k2('S22', 104.55, 109.3, [0.0, 1.15, 2.0], [-0.1, 1.12, 0], [-0.02, 1.18, 1.7], [-0.1, 1.12, 0], { shift: -0.1 }),
  k2('S23', 109.3, 112.0, [-0.02, 1.32, 0.85], [-0.06, 1.3, 0], [-0.03, 1.33, 0.75], [-0.06, 1.3, 0]),
  k2('S24', 112.0, 117.0, [0.0, 1.1, 2.2], [-0.1, 1.08, 0], [-0.03, 1.12, 1.9], [-0.1, 1.08, 0], { shift: -0.1 }),
  k2('S25', 117.0, 120.3, [-0.25, 1.62, 0.8], [-0.36, 1.62, 0], [-0.3, 1.6, 0.65], [-0.36, 1.62, 0]),
  k2('S26', 120.3, 125.8, [0.2, 0.3, 6.0], [0.0, 0.3, 0], [0.15, 0.3, 5.5], [0.0, 0.3, 0], { shift: -0.12 }),
  k2('S27', 125.8, 129.8, [0.35, 1.75, 0.0], [0.1, 1.45, -1.45], [0.25, 1.65, -0.35], [0.1, 1.45, -1.45]),
  k2('S28', 129.8, 133.95, [0.15, 1.38, 0.95], [0.0, 1.35, 0], [0.1, 1.38, 0.8], [0.0, 1.35, 0]),
  k2('S29', 133.95, 138.4, [1.4, 1.0, 3.0], [1.0, 0.9, 0], [1.3, 0.95, 2.7], [1.0, 0.9, 0]),
  k2('S30', 138.4, 141.35, [0.8, 1.38, 0.6], [-0.12, 1.05, 0.0], [0.72, 1.33, 0.52], [-0.12, 1.05, 0.0], { fov: 42 }),
  k2('S31', 141.35, 145.5, [0.05, 1.5, 1.0], [-0.2, 1.42, 0], [0.0, 1.48, 0.85], [-0.2, 1.42, 0]),
  k2('S32', 145.5, 152.95, [0.2, 0.65, 0.85], [1.2, 0.2, -0.2], [0.28, 0.6, 0.75], [1.2, 0.2, -0.2], { fov: 50, shift: -0.1 }),
  // warning signs (card on the left)
  k2('S33', 152.95, 156.7, [-1.2, -1.3, 9.8], [0.1, -2.45, 7.0], [-0.8, -1.45, 9.4], [0.1, -2.45, 7.0], { fov: 32, shift: 0.12 }),
  k2('S34', 156.7, 160.0, [1.3, 0.9, 3.1], [1.0, 0.85, 0], [1.25, 0.85, 2.8], [1.0, 0.85, 0], { shift: 0.12 }),
  k2('S35', 160.0, 161.85, [0.72, 1.58, 0.62], [0.0, 1.42, -0.05], [0.66, 1.55, 0.55], [0.0, 1.42, -0.05], { fov: 42, shift: 0.12 }),
  k2('S36', 161.85, 164.4, [0.1, 0.2, 6.0], [-0.1, 0.1, 0], [0.1, 0.2, 5.6], [-0.1, 0.1, 0]),
  k2('S37', 164.4, 167.05, [0.5, 0.4, 8.6], [0.3, 0.0, 0], [0.4, 0.4, 7.9], [0.3, 0.0, 0]),
  // the fix (checklist card on the left)
  k2('S38', 167.05, 171.15, [0.5, -0.9, 3.3], [-0.25, -1.2, 1.9], [0.3, -1.0, 2.9], [-0.25, -1.2, 1.9]),
  k2('S39a', 171.15, 176.1, [0.26, 1.5, 0.95], [0.0, 1.46, 0], [0.2, 1.5, 0.8], [0.0, 1.47, 0], { shift: 0.12 }),
  k2('S39b', 176.1, 178.3, [0.95, 1.8, 0.1], [0.3, 1.45, -1.45], [0.85, 1.72, -0.2], [0.3, 1.45, -1.45], { shift: 0.12 }),
  k2('S40', 178.3, 184.9, [1.9, 0.8, 5.2], [1.6, 0.3, 0], [1.9, 0.7, 4.6], [1.6, 0.3, 0], { shift: 0.12 }),
  k2('S41', 184.9, 186.6, [0.12, 1.43, 0.72], [0.0, 1.42, 0], [0.1, 1.44, 0.62], [0.0, 1.42, 0], { shift: 0.12 }),
  k2('S42', 186.6, 191.1, [0.0, 0.9, 4.3], [-0.05, 0.9, 0], [-0.05, 0.85, 3.9], [-0.05, 0.9, 0]),
  k2('S43', 191.1, 198.6, [1.0, 1.0, 12.0], [1.0, 0.0, 0], [1.0, 0.9, 11.0], [1.0, 0.0, 0]),
  k2('S44', 198.6, 201.3, [0.0, 0.9, 4.4], [-0.05, 0.9, 0], [-0.05, 0.9, 4.0], [-0.05, 0.9, 0], { shift: 0.12 }),
  k2('S45', 201.3, 205.35, [0.55, 1.0, 2.9], [0.2, 0.45, 0.0], [0.45, 0.9, 2.6], [0.15, 0.4, 0.0], { fov: 40, shift: 0.12 }),
  k2('S46', 205.35, 210.9, [0.3, 1.0, 3.1], [-0.35, 0.85, 1.8], [0.1, 0.92, 2.7], [-0.35, 0.85, 1.8], { fov: 30 }),
  k2('S47', 210.9, 214.3, [1.6, -1.25, 9.8], [0, -2.45, 7.0], [1.2, -1.45, 9.3], [0, -2.47, 7.0], { fov: 32 }),
  k2('S48', 214.3, 219, [0.8, 0.6, 12.5], [0.4, -0.2, 0], [3.8, 2.4, 16.0], [0.4, 0, 0], { ez: 'ease' }),
];
const UNCUT = new Set(['S1', 'S2', 'S30', 'S32', 'S33', 'S35', 'S38', 'S45', 'S46', 'S47']);
// cut: 0 off … 1 fully in (the plane sweeps in from the camera side); cutZ: where the plane sits (three z)
export function sceneOpts(t, shot) {
  if (UNCUT.has(shot.id)) return { cut: 0, cutZ: 0 };
  switch (shot.id) {
    case 'S3': return { cut: ss(9.3, 11.0, t), cutZ: 0 };
    case 'S8': case 'S27': case 'S39b': return { cut: 1, cutZ: -1.45 };
    case 'S48': return { cut: 1 - ss(214.8, 216.2, t), cutZ: 0 };
    default: return { cut: 1, cutZ: 0 };
  }
}
export function frame(t, st, ctx) {
  let exposure = 1;
  if (ctx.shot.id === 'S4') exposure = 0.4 + 0.25 * ss(11.35, 12.0, t) + 0.35 * ss(13.7, 14.25, t);   // dim under the title
  return { exposure };
}

// anchors come from anchors.json (written by the Blender build); 'shot:' anchors ride on the moving shot
export const LABELS = [
  { text: 'FLASH', anchor: 'shotFlash', t0: 0.5, t1: 4.0, dx: -130, dy: -60, tone: 'bad' },
  { text: 'BURN MARK', anchor: 'shotBurn', t0: 0.9, t1: 4.0, dx: -60, dy: -150, tone: 'bad' },
  { text: 'SHORT SHOT', anchor: 'shotShort', t0: 1.65, t1: 4.0, dx: 140, dy: 60, tone: 'bad' },
  { text: 'DRAG MARKS', sub: 'parts that stick', anchor: 'shotDrag', t0: 2.45, t1: 4.0, dx: -120, dy: 90, tone: 'bad' },
  { text: 'THE MOULD', anchor: 'mouldFront', t0: 6.25, t1: 7.2, dx: -120, dy: -120, tone: 'warn' },
  { text: 'TWO-PLATE MOULD', anchor: 'partingTop', t0: 15.1, t1: 21.5, dx: 90, dy: -110 },
  { text: 'COLD RUNNER', anchor: 'runner', t0: 15.85, t1: 21.5, dx: 120, dy: -60 },
  { text: '4 CAVITIES', sub: '2 cut by the section', anchor: 'cavBot', t0: 17.0, t1: 21.5, dx: 120, dy: 70 },
  { text: 'FIXED PLATEN', anchor: 'fixedPlaten', t0: 19.3, t1: 21.5, dx: -110, dy: -70 },
  { text: 'MOVING PLATEN', anchor: 'movingPlaten', t0: 19.85, t1: 21.5, dx: 110, dy: -70 },
  { text: 'FIXED HALF', anchor: 'fixedHalf', t0: 22.2, t1: 28.6, dx: 90, dy: -100 },
  { text: 'LOCATING RING', sub: 'centres the mould', anchor: 'locRing', t0: 23.15, t1: 28.6, dx: -130, dy: -90 },
  { text: 'NOZZLE', anchor: 'nozzle', t0: 26.55, t1: 28.6, dx: -110, dy: 90 },
  { text: 'SPRUE BUSHING', anchor: 'bushing', t0: 27.8, t1: 28.6, dx: 90, dy: 100 },
  { text: 'CAVITY PLATE', sub: 'A side · fixed half', anchor: 'cavPlate', t0: 29.1, t1: 36.9, dx: -120, dy: -100 },
  { text: 'OUTSIDE OF THE PART', anchor: 'cavSurf', t0: 30.35, t1: 31.9, dx: -140, dy: 90 },
  { text: 'CORE PLATE', sub: 'B side · moving half', anchor: 'corePlate', t0: 32.3, t1: 36.9, dx: 110, dy: -100 },
  { text: 'INSIDE OF THE PART', anchor: 'coreSurf', t0: 34.2, t1: 35.4, dx: 120, dy: 90 },
  { text: 'PARTING LINE', anchor: 'partingTop', t0: 35.95, t1: 36.9, dx: 60, dy: -130 },
  { text: 'GUIDE PILLAR', anchor: 'pillar', t0: 37.4, t1: 41.8, dx: -130, dy: -90 },
  { text: 'BUSH', anchor: 'bush', t0: 38.05, t1: 41.8, dx: 110, dy: -90 },
  { text: 'MELT', anchor: 'nozzle', t0: 43.95, t1: 49.1, dx: -100, dy: -90, tone: 'warn' },
  { text: 'SPRUE', anchor: 'sprue', t0: 44.9, t1: 49.1, dx: -60, dy: 110 },
  { text: 'RUNNER', anchor: 'runner', t0: 45.5, t1: 49.1, dx: 110, dy: -40 },
  { text: 'GATE', anchor: 'gateTop', t0: 46.9, t1: 49.1, dx: 120, dy: 60 },
  { text: 'AIR', sub: 'has to get out', anchor: 'airTop', t0: 49.55, t1: 53.0, dx: 120, dy: -90 },
  { text: 'MELT FRONT', anchor: 'frontTop', t0: 52.0, t1: 53.0, dx: 120, dy: 90, tone: 'warn' },
  { text: 'VENT', sub: 'drawn ~40× deeper', anchor: 'ventTop', t0: 54.15, t1: 61.8, dx: 130, dy: -90 },
  { text: 'AIR GETS OUT', anchor: 'ventOut', t0: 59.65, t1: 61.8, dx: 120, dy: 60 },
  { text: 'PLASTIC FREEZES OFF', anchor: 'ventLand', t0: 61.0, t1: 61.8, dx: -140, dy: 100, tone: 'warn' },
  { text: 'COOLING CHANNELS', anchor: 'chanA', t0: 62.9, t1: 65.15, dx: -130, dy: -80 },
  { text: 'WATER IN', anchor: 'chanB', t0: 63.3, t1: 65.15, dx: 110, dy: -80 },
  { text: 'FITTINGS', anchor: 'fitA', t0: 66.15, t1: 68.25, dx: 110, dy: -80 },
  { text: 'O-RINGS', anchor: 'oringA', t0: 67.5, t1: 68.25, dx: 120, dy: 70 },
  { text: 'HEAT OUT', sub: 'into the water', anchor: 'chanA', t0: 69.2, t1: 73.3, dx: 120, dy: -90, tone: 'warn' },
  { text: 'PARTS STAY ON THE CORES', anchor: 'partTop', t0: 75.4, t1: 79.25, dx: 100, dy: -110 },
  { text: 'SPRUE PULLER', anchor: 'puller', t0: 77.15, t1: 79.25, dx: 120, dy: 80 },
  { text: 'SPACER BLOCKS', anchor: 'spacer', t0: 81.3, t1: 84.45, dx: 100, dy: -90 },
  { text: 'EJECTOR PLATES', sub: 'retainer + ejector plate', anchor: 'ejPlates', t0: 82.5, t1: 84.45, dx: 120, dy: 80 },
  { text: 'KNOCKOUT ROD', sub: 'from the machine', anchor: 'koRod', t0: 83.45, t1: 84.45, dx: 90, dy: -80 },
  { text: 'EJECTOR PINS', anchor: 'pinTop', t0: 84.7, t1: 88.25, dx: 100, dy: -100 },
  { text: 'PARTS DROP', anchor: 'partDrop', t0: 87.45, t1: 88.25, dx: -120, dy: 80 },
  { text: 'RETURN PINS', anchor: 'retPin', t0: 88.85, t1: 93.7, dx: 110, dy: -90 },
  { text: 'SPRINGS', anchor: 'spring', t0: 89.35, t1: 93.7, dx: 120, dy: 80 },
  { text: 'RESIDUE', sub: 'gas + additives', anchor: 'ventLand', t0: 102.4, t1: 104.5, dx: 130, dy: -90, tone: 'bad' },
  { text: 'VENT BLOCKED', anchor: 'ventTop', t0: 105.3, t1: 109.25, dx: 120, dy: -90, tone: 'bad' },
  { text: 'TRAPPED AIR', anchor: 'airPocket', t0: 105.8, t1: 109.25, dx: -140, dy: -80, tone: 'bad' },
  { text: 'DIESELING', anchor: 'airPocket', t0: 109.7, t1: 111.95, dx: -130, dy: -90, tone: 'bad' },
  { text: 'BURN MARK', anchor: 'burnTop', t0: 111.2, t1: 111.95, dx: 120, dy: 80, tone: 'bad' },
  { text: 'AIR POCKET', anchor: 'airPocket', t0: 113.0, t1: 116.95, dx: -130, dy: -90, tone: 'bad' },
  { text: 'SHORT SHOT', anchor: 'shortTop', t0: 116.1, t1: 116.95, dx: 120, dy: 90, tone: 'bad' },
  { text: 'SCALE + RUST', anchor: 'chanA', t0: 117.7, t1: 120.25, dx: 120, dy: -90, tone: 'bad' },
  { text: 'LESS FLOW', anchor: 'chanA', t0: 121.2, t1: 125.75, dx: -120, dy: -90, tone: 'bad' },
  { text: 'HOT SPOT', anchor: 'hotSpot', t0: 121.9, t1: 125.75, dx: 120, dy: -110, tone: 'bad' },
  { text: 'WORN PILLAR', anchor: 'pillar', t0: 126.2, t1: 129.75, dx: -130, dy: -90, tone: 'bad' },
  { text: 'WORN BUSH', anchor: 'bush', t0: 126.95, t1: 129.75, dx: 120, dy: -90, tone: 'bad' },
  { text: 'OUT OF LINE', anchor: 'partingPillar', t0: 129.3, t1: 129.75, dx: 120, dy: 90, tone: 'bad' },
  { text: 'DAMAGED PARTING LINE', anchor: 'damage', t0: 130.9, t1: 133.9, dx: 120, dy: -100, tone: 'bad' },
  { text: 'FLASH', anchor: 'flashTop', t0: 133.4, t1: 133.9, dx: -110, dy: 90, tone: 'bad' },
  { text: 'GALLED PIN', anchor: 'pinTop', t0: 135.05, t1: 138.35, dx: 110, dy: -100, tone: 'bad' },
  { text: 'BROKEN PIN', anchor: 'pinBroken', t0: 136.2, t1: 138.35, dx: 120, dy: 90, tone: 'bad' },
  { text: 'HUNG UP ON THE CORE', anchor: 'partTop', t0: 137.4, t1: 138.35, dx: -150, dy: -100, tone: 'bad' },
  { text: 'PLATE-OUT', sub: 'residue on the cavity', anchor: 'plateout', t0: 139.0, t1: 141.3, dx: -140, dy: -90, tone: 'bad' },
  { text: 'HARDENED O-RING', anchor: 'oringA', t0: 141.6, t1: 145.45, dx: -140, dy: -90, tone: 'bad' },
  { text: 'WATER', anchor: 'seep', t0: 143.3, t1: 145.45, dx: 110, dy: -90, tone: 'bad' },
  { text: 'ON THE PARTING LINE', anchor: 'drops', t0: 144.6, t1: 145.45, dx: 110, dy: 90, tone: 'bad' },
  { text: 'CONDENSATION', anchor: 'condense', t0: 149.7, t1: 152.9, dx: -130, dy: -100, tone: 'bad' },
  { text: 'RUST', anchor: 'rust', t0: 151.8, t1: 152.9, dx: 120, dy: 90, tone: 'bad' },
  { text: 'FLASH', anchor: 'shotFlash', t0: 154.3, t1: 156.65, dx: -130, dy: -60, tone: 'bad' },
  { text: 'BURN MARK', anchor: 'shotBurn', t0: 154.65, t1: 156.65, dx: -60, dy: -150, tone: 'bad' },
  { text: 'SHORT SHOT', anchor: 'shotShort', t0: 155.7, t1: 156.65, dx: 140, dy: 60, tone: 'bad' },
  { text: 'DRAG MARKS', anchor: 'partTop', t0: 157.85, t1: 159.95, dx: 110, dy: -100, tone: 'bad' },
  { text: 'WATER AT THE PARTING LINE', anchor: 'drops', t0: 160.1, t1: 161.8, dx: 110, dy: -100, tone: 'bad' },
  { text: 'SHOT COUNTER', anchor: 'counter', t0: 168.75, t1: 171.1, dx: -60, dy: -130 },
  { text: 'VENTS CLEAN', anchor: 'ventLand', t0: 174.5, t1: 176.05, dx: 130, dy: -90 },
  { text: 'NO LEAKS', anchor: 'oringA', t0: 175.4, t1: 176.05, dx: -140, dy: 90 },
  { text: 'GUIDE PILLAR GREASED', anchor: 'pillar', t0: 176.9, t1: 178.25, dx: 110, dy: -100 },
  { text: 'EJECTOR HALF OPEN', anchor: 'ejPlates', t0: 180.4, t1: 184.85, dx: 110, dy: -110 },
  { text: 'PINS CLEANED + OILED', anchor: 'pinTop', t0: 183.3, t1: 184.85, dx: 110, dy: 90 },
  { text: 'SPRINGS CHECKED', anchor: 'spring', t0: 184.45, t1: 184.85, dx: 110, dy: -80 },
  { text: 'VENT DEPTH ✓', anchor: 'ventTop', t0: 185.7, t1: 186.55, dx: 120, dy: -90 },
  { text: 'DESCALED', anchor: 'chanA', t0: 187.3, t1: 191.05, dx: -130, dy: -90 },
  { text: 'NEW O-RINGS', anchor: 'oringA', t0: 190.25, t1: 191.05, dx: 120, dy: 70 },
  { text: 'FULL STRIP-DOWN', anchor: 'stripTop', t0: 192.5, t1: 198.55, dx: 80, dy: -110 },
  { text: 'BLOWN DRY', anchor: 'chanA', t0: 200.85, t1: 201.25, dx: -120, dy: -90 },
  { text: 'RUST PREVENTIVE', anchor: 'partingFace', t0: 202.95, t1: 205.3, dx: 120, dy: -100 },
  { text: 'STORED CLOSED', anchor: 'mouldFront', t0: 204.3, t1: 205.3, dx: -130, dy: 90 },
  { text: 'TOOL NAMEPLATE', sub: 'customer-owned tooling', anchor: 'nameplate', t0: 206.4, t1: 210.85, dx: -160, dy: 190 },
  { text: 'FIRST-OFF PARTS ✓', anchor: 'shotTopTable', t0: 212.95, t1: 214.25, dx: 120, dy: -100 },
];

// ---------------------------------------------------------------- panels (left / right)
const tb = (rows) => `<div class="tb">${rows.map(([k, v, c, o]) => `<span style="opacity:${o ?? 1}">${k}</span><b style="color:${c || '#fff'};opacity:${o ?? 1}">${v}</b>`).join('')}</div>`;
const on = (t, a) => (t > a ? 1 : 0.2);
// the parting face seen straight on: four cavities fed from one sprue; the section plane is the vertical line
function layoutSVG(t) {
  const W = 548, H = 300, cx = 274, cy = 150, s = 62;            // 1 unit (100 mm) = 62 px
  const cav = [[0, -1.05], [0, 1.05], [-1.05, 0], [1.05, 0]];
  const cut = t > 17.0;
  let g = `<g>`;
  g += `<rect x="${cx - 2.2 * s}" y="${cy - 2.2 * s * 0.62}" width="${4.4 * s}" height="${4.4 * s * 0.62}" rx="10" fill="rgba(160,170,180,0.06)" stroke="rgba(255,255,255,0.25)"/>`;
  const S2 = 0.62;                                                  // squash vertically to fit the panel
  const Q = (u, v) => [cx + u * s, cy + v * s * S2];
  for (const [u, v] of cav) {
    const [x, y] = Q(u, v);
    g += `<ellipse cx="${x}" cy="${y}" rx="${0.31 * s}" ry="${0.31 * s * S2}" fill="rgba(255,179,92,0.25)" stroke="#ffb35c" stroke-width="2"/>`;
    const [gx, gy] = Q(u * 0.7, v * 0.7);
    g += `<line x1="${cx}" y1="${cy}" x2="${gx}" y2="${gy}" stroke="#ffb35c" stroke-width="5" stroke-linecap="round"/>`;
    const [vx, vy] = Q(u * 1.32, v * 1.32), [vx2, vy2] = Q(u * 1.62, v * 1.62);
    g += `<line x1="${vx}" y1="${vy}" x2="${vx2}" y2="${vy2}" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 3" opacity="0.8"/>`;
  }
  g += `<circle cx="${cx}" cy="${cy}" r="9" fill="#ffb35c"/>`;
  g += `<line x1="${cx}" y1="${cy - 2.35 * s * S2}" x2="${cx}" y2="${cy + 2.35 * s * S2}" stroke="#ff8f7a" stroke-width="2.5" stroke-dasharray="9 6" opacity="${cut ? 1 : 0.25}"/>`;
  g += `</g>`;
  return `<svg width="${W}" height="${H}" style="display:block">${g}
    <text x="${cx + 12}" y="${cy - 2.15 * s * S2}" fill="#ff8f7a" font-size="15" opacity="${cut ? 1 : 0.3}">section</text>
    <text x="${cx + 16}" y="${cy + 22}" fill="#ffb35c" font-size="15">sprue</text>
    <text x="${Q(1.05, 0)[0] - 40}" y="${Q(1.05, 0)[1] + 40}" fill="#ffb35c" font-size="15">cavity</text>
    <text x="${Q(1.62, 0)[0] - 10}" y="${Q(1.62, 0)[1] - 10}" fill="#fff" font-size="15" opacity="0.85">vent</text>
  </svg>`;
}
function cycleSVG(t) {
  const parts = [['Close + clamp', 1.5, '#8fa2b0'], ['Inject', 1, '#ffb35c'], ['Hold', 3, '#ff8a5c'], ['Cool', 11, '#4fc3ff'], ['Open + eject', 3.5, '#6ff0b0']];
  let x = 0; const sc = 548 / 20;
  const bar = parts.map(([k, v, c], i) => { const r = `<rect x="${(x * sc).toFixed(1)}" y="0" width="${(v * sc - 2).toFixed(1)}" height="46" rx="4" fill="${c}" opacity="${t > 69.8 + i * 0.35 ? 1 : 0.15}"/>`; x += v; return r; }).join('');
  return `<svg width="548" height="56" style="display:block">${bar}</svg>` + tb(parts.map(([k, v, c]) => [k, `${v} s`, c])) ;
}
export function panel(t, st) {
  if (t > 16.2 && t < 21.5) return { opacity: fade(t, 16.2, 21.5), side: 'left', title: 'THE PARTING FACE · 4 CAVITIES', html: layoutSVG(t) + `<div class="note">One sprue feeds four cavities through the runners and gates. The section in this video cuts through the top and bottom cavities.</div>` };
  if (t > 55.2 && t < 61.8) return { opacity: fade(t, 55.2, 61.8), side: 'left', title: 'TYPICAL VENT DEPTHS', html: tb([['PA, POM', '0.01–0.02 mm', '#8fe9ff'], ['PP, PE', '0.02–0.03 mm', '#8fe9ff'], ['ABS', '0.025–0.04 mm', '#8fe9ff'], ['PC, PMMA', '0.03–0.05 mm', '#8fe9ff'], ['Vent land', '≈ 1–3 mm long', '#fff'], ['Then a relief', '0.5–1 mm deep', '#fff']]) + `<div class="note">Typical values. Runny resins need shallower vents. Check the resin supplier's data and your toolmaker's spec. Vents here are drawn about 40× deeper than real.</div>` };
  if (t > 69.6 && t < 73.3) return { opacity: fade(t, 69.6, 73.3), side: 'left', title: 'ONE CYCLE · EXAMPLE', html: cycleSVG(t) + `<div class="note">An example 20 s cycle. Cooling is usually the biggest share.</div>` };
  if (t > 167.4 && t < 171.05) return { opacity: fade(t, 167.4, 171.05), side: 'right', w: 560, title: 'PM LEVELS · EXAMPLE', color: '#6ff0b0', html: tb([['1 · On the press', 'every shift', '#6ff0b0', on(t, 167.7)], ['2 · Periodic', 'e.g. every 50,000 shots', '#6ff0b0', on(t, 168.4)], ['3 · Full strip-down', 'e.g. 250,000 shots / yearly', '#6ff0b0', on(t, 169.1)]]) + `<div class="note">Example intervals. Set yours from the tool owner's spec, the resin and your defect history.</div>` };
  if (t > 194.4 && t < 198.5) return { opacity: fade(t, 194.4, 198.5), side: 'right', w: 560, title: 'MOULD HISTORY CARD · EXAMPLE', color: '#6ff0b0', html: tb([['Shot count', fmt(st.shots), '#fff'], ['Work', 'full strip-down', '#fff'], ['Replaced', 'O-rings, 2 pins, springs', '#fff'], ['Vents', 'cleaned · 0.03 mm ✓', '#6ff0b0'], ['Pillars + bushes', 'renewed ✓', '#6ff0b0'], ['First-off parts', 'approved ✓', '#6ff0b0', on(t, 197.3)]]) + `<div class="note">Illustrative. Every service, with the shot count, so wear trends show up.</div>` };
  if (t > 205.6 && t < 210.8) return { opacity: fade(t, 205.6, 210.8), side: 'right', w: 560, title: 'CUSTOMER-OWNED TOOLING', color: '#6ff0b0', html: tb([['Maintenance', "to the owner's spec", '#6ff0b0', on(t, 205.9)], ['Modifications', 'only with approval', '#ffb35c', on(t, 208.3)], ['Records', 'history card + shots', '#6ff0b0', on(t, 209.0)]]) + `<div class="note">The mould often belongs to the customer, not the moulder. Repairs that change the steel need their sign-off.</div>` };
  return null;
}

// ---------------------------------------------------------------- HUD (right-hand readouts)
const CT = [20.0, 20.0, 20.2, 20.3, 20.6, 21.0, 21.4, 22.0, 22.6, 23.3, 24.0, 24.6];
export function hud(t, st) {
  if (t > 4.2 && t < 7.2) return { opacity: fade(t, 4.2, 7.2), title: 'PROCESS SETTINGS', items: [{ k: 'MELT TEMP', v: '230 °C' }, { k: 'HOLD PRESSURE', v: '600 bar' }, { k: 'VS LAST MONTH', v: 'unchanged', big: true, color: '#6ff0b0' }] };
  if (t > 26.3 && t < 28.6) return { opacity: fade(t, 26.3, 28.6), title: 'NOZZLE SEAL · TYPICAL', items: [{ k: 'NOZZLE TIP R', v: '< seat R', color: '#8fe9ff' }, { k: 'NOZZLE ORIFICE', v: '< sprue Ø', color: '#8fe9ff' }] };
  if (t > 42.2 && t < 44.5) return { opacity: fade(t, 42.2, 44.5), title: 'CLAMP · EXAMPLE', items: [{ k: 'CLAMP FORCE', v: `${Math.round(80 * st.clamp)} t`, big: true, color: '#8fe9ff' }, { k: 'MOULD', v: 'closed' }] };
  if (t > 44.6 && t < 49.1) return { opacity: fade(t, 44.6, 49.1), title: 'INJECTION · SLOWED DOWN', items: [{ k: 'MELT (ABS)', v: '230 °C', color: '#ffb35c' }, { k: 'REAL FILL TIME', v: '≈ 1 s', big: true, color: '#ffb35c' }] };
  if (t > 61.9 && t < 65.1) return { opacity: fade(t, 61.9, 65.1), title: 'COOLING WATER · EXAMPLE', items: [{ k: 'SUPPLY', v: '25 °C', color: '#4fc3ff' }, { k: 'RETURN', v: '28 °C', color: '#ffb35c' }, { k: 'FLOW / CIRCUIT', v: '8 L/min', big: true, color: '#8fe9ff' }] };
  if (t > 94.3 && t < 98.8) return { opacity: fade(t, 94.3, 98.8), title: 'ONE YEAR · EXAMPLE', items: [{ k: 'CYCLE TIME', v: '20 s' }, { k: 'RUNNING', v: '2 shifts · 250 days' }, { k: 'SHOTS / YEAR', v: '≈ 720,000', big: true, color: '#8fe9ff' }] };
  if (t > 104.8 && t < 109.2) return { opacity: fade(t, 104.8, 109.2), title: 'TRAPPED AIR', items: [{ k: 'VENT', v: 'blocked', color: '#ff5a4e' }, { k: 'AIR TEMP', v: st.diesel > 0.3 || t > 108.4 ? '> 300 °C' : `${Math.round(25 + 260 * st.airGlow)} °C`, big: true, color: st.airGlow > 0.4 ? '#ff5a4e' : '#ffb35c' }] };
  if (t > 112.3 && t < 116.9) { const f = clamp01((st.fillTop - FILL.gate) / (FILL.full - FILL.gate)); return { opacity: fade(t, 112.3, 116.9), title: 'SHORT SHOT', items: [{ k: 'TOP CAVITY', v: `${Math.round(100 * f)} % full`, big: true, color: f < 0.9 && t > 114 ? '#ff5a4e' : '#ffb35c' }, { k: 'TRAPPED AIR', v: "can't escape", color: '#ff5a4e' }] }; }
  if (t > 120.4 && t < 125.7) return { opacity: fade(t, 120.4, 125.7), title: 'TOP CIRCUIT · SCALED', items: [{ k: 'FLOW', v: `${(8 * st.flowA).toFixed(1)} L/min`, big: true, color: st.flowA < 0.6 ? '#ff5a4e' : '#fff' }, { k: 'CAVITY STEEL', v: st.thermalScaled > 0.5 ? '+12 °C' : '…', color: '#ff5a4e' }, { k: 'CYCLE TIME', v: t > 123.8 ? '20 → 26 s' : '20 s', color: t > 123.8 ? '#ff5a4e' : '#fff' }] };
  if (t > 146.0 && t < 152.8) return { opacity: fade(t, 146.0, 152.8), title: 'IDLE, CHILLED MOULD', items: [{ k: 'MOULD STEEL', v: '10 °C', color: '#4fc3ff' }, { k: 'AIR', v: '30 °C · 75 % RH' }, { k: 'DEW POINT', v: '≈ 25 °C', big: true, color: '#ff5a4e' }] };
  if (t > 157.0 && t < 159.9) return { opacity: fade(t, 157.0, 159.9), title: 'EJECTION', items: [{ k: 'PARTS', v: 'sticking', color: '#ff5a4e' }, { k: 'SOUND', v: 'squeal, knock', big: true, color: '#ffb35c' }] };
  if (t > 162.0 && t < 164.3) return { opacity: fade(t, 162.0, 164.3), title: 'CAVITY TEMPS · EXAMPLE', items: [{ k: 'CAVITY 1 (TOP)', v: '62 °C', big: true, color: '#ff5a4e' }, { k: 'CAVITY 2', v: '51 °C' }, { k: 'CAVITY 3', v: '52 °C' }, { k: 'CAVITY 4', v: '51 °C' }] };
  if (t > 164.5 && t < 167.0) return { opacity: fade(t, 164.5, 167.0), title: 'CYCLE TIME · 12 WEEKS', items: [{ k: 'SET', v: '20.0 s' }, { k: 'NOW', v: '24.6 s', big: true, color: '#ff5a4e' }], spark: { values: CT, n: Math.max(1, Math.round(CT.length * ss(164.6, 166.2, t))), lo: 19, hi: 25.5, color: '#ff5a4e', band: [19.6, 20.6], unit: ' s' } };
  if (t > 185.0 && t < 186.55) return { opacity: fade(t, 185.0, 186.55), title: 'VENT DEPTH · CHECK', items: [{ k: 'MEASURED', v: '0.03 mm', big: true, color: '#6ff0b0' }, { k: 'SPEC (ABS, EXAMPLE)', v: '0.025–0.04' }] };
  if (t > 187.3 && t < 191.0) { const c1 = (8 * st.flowA).toFixed(1); return { opacity: fade(t, 187.3, 191.0), title: 'FLOW TEST · EXAMPLE', items: [{ k: 'CIRCUIT 1', v: `${c1} L/min ${st.flowA > 0.95 ? '✓' : ''}`, big: true, color: st.flowA > 0.95 ? '#6ff0b0' : '#ffb35c' }, { k: 'CIRCUIT 2', v: '8.1 L/min ✓', color: '#6ff0b0' }, { k: 'CIRCUIT 3', v: '7.9 L/min ✓', color: '#6ff0b0' }, { k: 'CIRCUIT 4', v: '8.0 L/min ✓', color: '#6ff0b0' }] }; }
  if (t > 211.0 && t < 214.2) return { opacity: fade(t, 211.0, 214.2), title: 'FIRST-OFF CHECK', items: [{ k: 'FULL FILL', v: '✓', color: '#6ff0b0' }, { k: 'FLASH, BURNS', v: 'none ✓', color: '#6ff0b0' }, { k: 'DIMENSIONS', v: 'in spec ✓', big: true, color: '#6ff0b0' }] };
  return null;
}
// time-lapse counter (top centre)
export function counter(t, st) {
  if (t > 99.1 && t < 101.75) return { opacity: fade(t, 99.1, 101.75), k: 'SHOTS SINCE LAST SERVICE', v: fmt(st.sinceService), total: 10, n: Math.round(10 * ss(99.2, 101.6, t)) };
  return null;
}

export const CARDS = [
  { t0: 153.1, t1: 166.95, kind: 'warn', title: 'WARNING SIGNS', items: [
    { text: 'Flash, burn marks, short shots', t: 153.2 },
    { text: 'Sticking parts, drag marks', t: 156.8 },
    { text: 'Noisy ejection', t: 158.5 },
    { text: 'Water at the parting line', t: 160.05 },
    { text: 'Uneven cavity temperatures', t: 161.9 },
    { text: 'Cycle time creeping up', t: 164.45 },
  ] },
  { t0: 167.1, t1: 214.2, kind: 'fix', title: 'THE FIX', items: [
    { text: 'Plan by shot count', sub: 'not just by the calendar', t: 167.1, done: 170.4 },
    { text: 'Every shift, on the press', sub: 'vents + parting line · leaks · guide pins', t: 171.2, done: 177.9 },
    { text: 'Periodic: open the ejector half', sub: 'pins · springs · vent depths', t: 178.35, done: 186.1 },
    { text: 'Descale + flow-test circuits', sub: 'new O-rings', t: 186.65, done: 190.6 },
    { text: 'Full strip-down, logged', sub: 'history card + shot count', t: 191.15, done: 198.2 },
    { text: 'Store dry, protected, closed', t: 198.7, done: 204.7 },
    { text: "Owner's spec · first-off check", t: 205.45, done: 213.6 },
  ] },
];
export const SHAKES = [{ t: 108.3, a: 0.04, d: 0.18 }, { t: 135.9, a: 0.03, d: 0.15 }];
export const FLASHES = [{ t: 108.25, a: 0.1, d: 0.12 }];
