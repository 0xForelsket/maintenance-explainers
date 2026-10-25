// Hot runner mould in section: heated sprue, manifold floating in an air gap, two nozzles (thermal gate left,
// valve gate right), cavities and cores, wiring to a junction box. Macro rig: cold-runner shot vs hot-runner shot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, rbox, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, worldPosVertex } from 'series/look';
import { stateAt } from './story.js';

export const RIG = { runner: new V3(40, 0, 0) };
const Y = { cTop: 3.3, cBot: 2.7, mpBot: 0.9, pocket: 1.05, aBot: -0.5, bBot: -1.9 };
const MAN = { x: 2.9, yb: 1.45, yt: 2.05, z: 0.5, ch: 1.75, r: 0.11, drop: 2.17 };
const NZ = { x: 2.2, headTop: 1.37, headR: 0.42, bodyR: 0.26, bore: 0.085, tipY: 0.25, gate: 0.1 };
const CUP = { r: 0.75, rin: 0.6, top: 0.1, bot: -0.5, inTop: -0.05 };
const PX = [-NZ.x, NZ.x];

// blue → cyan → green → yellow → red → white
export function cmap(x, c = new THREE.Color()) {
  const s = [[0, 0.08, 0.18, 0.75], [0.25, 0.0, 0.7, 0.9], [0.45, 0.1, 0.85, 0.3], [0.65, 1.0, 0.85, 0.1], [0.85, 1.0, 0.22, 0.05], [1.0, 1.0, 0.95, 0.85]];
  x = Math.min(1, Math.max(0, x));
  for (let i = 0; i < s.length - 1; i++) if (x <= s[i + 1][0]) { const k = (x - s[i][0]) / (s[i + 1][0] - s[i][0]); return c.setRGB(mix(s[i][1], s[i + 1][1], k), mix(s[i][2], s[i + 1][2], k), mix(s[i][3], s[i + 1][3], k)); }
  return c.setRGB(1, 0.95, 0.85);
}
const tNorm = (deg) => (deg - 20) / 260;

const placed = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.02, floorY: -3.4, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(4, 12, 11); ST.lights.key.target.position.set(0, 0.6, 0); ST.lights.key.intensity = 520; ST.lights.key.angle = 0.7;
  const cutOf = (hex) => { const m = M.cut.clone(); m.clippingPlanes = clip; m.color.set(hex); m.onBeforeCompile = M.cut.onBeforeCompile; m.userData.base = new THREE.Color(hex); return m; };
  const steelOf = (hex, rough = 0.38, metal = 0.75, key = '') => castSurface(new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, clippingPlanes: clip, clipShadows: true, emissive: 0x000000 }), { freq: 0.9, bump: 0.03, mottle: 0.1, key });
  // thermal bookkeeping: every solid registers its exterior + cap material and a temperature getter
  const TH = [];
  const solid = (geo, ext, cap, parent, temp) => { const m = addSolid(geo, ext, cap, parent); TH.push({ ext, cap, temp }); return m; };

  // ------------------------------------------------ mould plates
  const plateSteel = steelOf(0x6f7880, 0.42, 0.7, 'hrp'), plateCut = cutOf(0x6c757e);
  const aSteel = steelOf(0x7a838c, 0.36, 0.75, 'hra'), aCut = cutOf(0x7f8891);
  const bSteel = steelOf(0x5f6870, 0.42, 0.7, 'hrb'), bCut = cutOf(0x5d666e);
  const W = 8.8, D = 3.6;
  const hot = new THREE.Group(); scene.add(hot);       // fixed half (clamp, manifold plate, A plate)
  const clampG = new THREE.Group(), manPlateG = new THREE.Group(); hot.add(clampG, manPlateG);
  const manG = new THREE.Group(); hot.add(manG);
  const bSide = new THREE.Group(); scene.add(bSide);
  const plateT = (base) => (st) => base + (st.plates ? 0 : 0);
  // clamp plate with sprue hole, valve actuator bore, locating ring
  solid(csg(rbox(W, Y.cTop - Y.cBot, D, 0.04).translate(0, (Y.cTop + Y.cBot) / 2, 0), [['sub', cylBetween([0, 2.6, 0], [0, 3.4, 0], 0.3, 40)], ['sub', cylBetween([NZ.x, 2.62, 0], [NZ.x, 3.12, 0], 0.36, 40)]]), plateSteel, plateCut, clampG, () => 45);
  solid(tubeSolid(0.36, 0.95, 0.15, 64).translate(0, Y.cTop, 0), M.machined, cutOf(0x5b636b), clampG, () => 40);
  const piston = new THREE.Group(); clampG.add(piston);
  solid(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 40).translate(NZ.x, 2.9, 0), steelOf(0xb0b8c0, 0.3, 0.9), cutOf(0xc0c7ce), piston, () => 60);
  // manifold plate with pocket (air gap), nozzle holes and a wiring channel to the side
  solid(csg(rbox(W, Y.cBot - Y.mpBot, D, 0.04).translate(0, (Y.cBot + Y.mpBot) / 2, 0), [
    ['sub', new THREE.BoxGeometry(6.8, Y.cBot - Y.pocket + 0.1, 1.7).translate(0, (Y.cBot + Y.pocket) / 2 + 0.05, 0)],
    ['sub', cylBetween([-NZ.x, 0.8, 0], [-NZ.x, 1.1, 0], 0.33, 40)], ['sub', cylBetween([NZ.x, 0.8, 0], [NZ.x, 1.1, 0], 0.33, 40)],
    ['sub', new THREE.BoxGeometry(1.3, 0.26, 0.36).translate(3.95, 1.33, -0.25)]]), plateSteel, plateCut, manPlateG, () => 48);
  // A plate: cavities, nozzle wells, gates, cooling channels
  const aGeo = csg(rbox(W, Y.mpBot - Y.aBot, D, 0.04).translate(0, (Y.mpBot + Y.aBot) / 2, 0), [
    ...PX.map((x) => ['sub', new THREE.CylinderGeometry(CUP.r, CUP.r, CUP.top - CUP.bot + 0.02, 64).translate(x, (CUP.top + CUP.bot) / 2 - 0.01, 0)]),
    ...PX.map((x) => ['sub', cylBetween([x, NZ.tipY - 0.02, 0], [x, 1.0, 0], 0.32, 40)]),
    ...PX.map((x) => ['sub', new THREE.ConeGeometry(0.32, 0.17, 40).rotateX(Math.PI).translate(x, NZ.tipY - 0.085 - 0.02, 0)]),
    ...PX.map((x) => ['sub', cylBetween([x, CUP.top - 0.02, 0], [x, NZ.tipY, 0], 0.05, 20)]),
    ...[-3.4, -1.0, 1.0, 3.4].map((x) => ['sub', cylBetween([x, 0.38, -2], [x, 0.38, 2], 0.13, 24)])]);
  solid(aGeo, aSteel, aCut, hot, () => 50);
  const waterMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3fb8ff).multiplyScalar(1.2), clippingPlanes: clip });
  for (const x of [-3.4, -1.0, 1.0, 3.4]) hot.add(new THREE.Mesh(cylBetween([x, 0.38, -1.8], [x, 0.38, 1.8], 0.12, 20), waterMat));
  // B plate with cores, and a clamp plate below
  solid(csg(rbox(W, Y.aBot - Y.bBot, D, 0.04).translate(0, (Y.aBot + Y.bBot) / 2, 0), PX.map((x) => ['add', new THREE.CylinderGeometry(CUP.rin, CUP.rin, CUP.inTop - Y.aBot + 0.02, 48).translate(x, (CUP.inTop + Y.aBot) / 2 + 0.01, 0)])), bSteel, bCut, bSide, () => 46);
  for (const x of [-3.9, 3.9]) solid(rbox(0.7, 0.7, D, 0.03).translate(x, -2.25, 0), bSteel, bCut, bSide, () => 40);
  solid(rbox(W, 0.6, D, 0.04).translate(0, -2.9, 0), bSteel, bCut, bSide, () => 38);

  // ------------------------------------------------ manifold (floats in the pocket), locator, spacers, heaters, TC
  const manSteel = steelOf(0xa7aeb6, 0.3, 0.85, 'hrm'), manCut = cutOf(0xb9c1c9);
  const chPts = [[0, MAN.yt + 0.02, 0], [0, MAN.ch, 0], [-MAN.drop, MAN.ch, 0], [MAN.drop, MAN.ch, 0]];
  const manGeo = csg(rbox(2 * MAN.x, MAN.yt - MAN.yb, 2 * MAN.z, 0.05).translate(0, (MAN.yt + MAN.yb) / 2, 0), [
    ['sub', cylBetween([0, MAN.yt + 0.05, 0], [0, MAN.ch, 0], MAN.r, 32)], ['sub', cylBetween([-MAN.drop - MAN.r, MAN.ch, 0], [MAN.drop + MAN.r, MAN.ch, 0], MAN.r, 32)],
    ['sub', cylBetween([-MAN.drop, MAN.ch, 0], [-MAN.drop, MAN.yb - 0.05, 0], MAN.r * 0.9, 32)], ['sub', cylBetween([MAN.drop, MAN.ch, 0], [MAN.drop, MAN.yb - 0.05, 0], MAN.r * 0.9, 32)],
    ['sub', cylBetween([NZ.x * 0.99, MAN.yt + 0.05, 0], [NZ.x * 0.99, MAN.yb - 0.05, 0], 0.065, 24)],
    ...[-1, 1].flatMap((s) => [['sub', new THREE.BoxGeometry(5.5, 0.06, 0.09).translate(0, MAN.yt - 0.025, s * 0.32)], ['sub', new THREE.BoxGeometry(5.5, 0.06, 0.09).translate(0, MAN.yb + 0.025, s * 0.32)]]),
    ['sub', cylBetween([1.0, MAN.ch, -0.6], [1.0, MAN.ch, -0.12], 0.035, 12)]]);
  const manG2 = new THREE.Group(); manG.add(manG2);
  solid(manGeo, manSteel, manCut, manG2, (st) => 30 + 205 * st.manHeat);
  const meltMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 0.9, roughness: 0.4, clippingPlanes: clip });
  const meltCut = cutOf(0xff8a2a); meltCut.userData.melt = true;
  const meltGeo = mergeGeometries([cylBetween([0, MAN.yt + 0.05, 0], [0, MAN.ch, 0], MAN.r * 0.97, 24), cylBetween([-MAN.drop - MAN.r * 0.9, MAN.ch, 0], [MAN.drop + MAN.r * 0.9, MAN.ch, 0], MAN.r * 0.97, 24),
    cylBetween([-MAN.drop, MAN.ch, 0], [-MAN.drop, MAN.yb, 0], MAN.r * 0.87, 24), cylBetween([MAN.drop, MAN.ch, 0], [MAN.drop, MAN.yb, 0], MAN.r * 0.87, 24)].map((g) => g.toNonIndexed()));
  addSolid(meltGeo, meltMat, meltCut, manG2);
  // heater elements in the grooves (top + bottom loops)
  const heatMatOf = () => new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.5, metalness: 0.6, emissive: 0xff4a10, emissiveIntensity: 0, clippingPlanes: clip });
  const manHeatMat = heatMatOf();
  const loop = (y) => { const p = []; for (let k = 0; k <= 12; k++) p.push(new V3(-2.6 + 5.2 * k / 12, y, 0.32)); for (let k = 1; k < 8; k++) { const a = Math.PI / 2 - Math.PI * k / 8; p.push(new V3(2.6 + Math.cos(a) * 0.32 * 0.6, y, Math.sin(a) * 0.32)); } for (let k = 0; k <= 12; k++) p.push(new V3(2.6 - 5.2 * k / 12, y, -0.32)); for (let k = 1; k < 8; k++) { const a = -Math.PI / 2 - Math.PI * k / 8; p.push(new V3(-2.6 + Math.cos(a) * 0.32 * 0.6, y, Math.sin(a) * 0.32)); } return new THREE.CatmullRomCurve3(p, true); };
  for (const y of [MAN.yt - 0.025, MAN.yb + 0.025]) manG2.add(new THREE.Mesh(new THREE.TubeGeometry(loop(y), 200, 0.03, 8, true), manHeatMat));
  const tcMat = new THREE.MeshStandardMaterial({ color: 0xc8b46a, roughness: 0.4, metalness: 0.7, clippingPlanes: clip });
  manG2.add(new THREE.Mesh(cylBetween([1.0, MAN.ch, -1.3], [1.0, MAN.ch, -0.14], 0.03, 12), tcMat));
  // locator + spacers: the only contacts with the mould
  const tiMat = steelOf(0x6c6f78, 0.45, 0.6), tiCut = cutOf(0x7d8088);
  solid(new THREE.CylinderGeometry(0.2, 0.2, MAN.yb - Y.pocket, 32).translate(0, (MAN.yb + Y.pocket) / 2, 0), tiMat, tiCut, hot, () => 120);
  for (const x of [-1.3, 1.3]) solid(new THREE.CylinderGeometry(0.2, 0.24, Y.cBot - MAN.yt, 32).translate(x, (Y.cBot + MAN.yt) / 2, 0), tiMat, tiCut, hot, () => 110);

  // ------------------------------------------------ sprue bushing + machine nozzle
  const sprueSteel = steelOf(0xa0a8b0, 0.32, 0.85), sprueCut = cutOf(0xbfc6cd);
  solid(tubeSolid(0.09, 0.27, Y.cTop + 0.15 - MAN.yt, 48).translate(0, MAN.yt, 0), sprueSteel, sprueCut, hot, (st) => 30 + 205 * st.heat);
  addSolid(cylBetween([0, MAN.yt, 0], [0, Y.cTop + 0.15, 0], 0.085, 20), meltMat, meltCut, hot);
  const coil = (x, y0, y1, r, turns, tr) => { const pts = []; const n = turns * 16; for (let i = 0; i <= n; i++) { const f = i / n, a = f * turns * 6.283; pts.push(new V3(x + Math.cos(a) * r, y0 + f * (y1 - y0), Math.sin(a) * r)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, tr, 6); };
  const sprueHeat = heatMatOf();
  hot.add(new THREE.Mesh(coil(0, 2.2, 3.15, 0.3, 9, 0.026), sprueHeat));
  const mach = new THREE.Group(); scene.add(mach);
  addSolid(csg(new THREE.CylinderGeometry(0.42, 0.12, 0.9, 40).translate(0, Y.cTop + 0.15 + 0.45, 0), [['sub', cylBetween([0, Y.cTop + 0.1, 0], [0, Y.cTop + 1.2, 0], 0.07, 16)]]), M.steel, M.cutSteel, mach);
  addSolid(cylBetween([0, Y.cTop + 1.05, 0], [0, Y.cTop + 3.5, 0], 0.62, 48), M.steel, M.cutSteel, mach);
  addSolid(cylBetween([0, Y.cTop + 0.2, 0], [0, Y.cTop + 1.1, 0], 0.065, 16), meltMat, meltCut, mach);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5, metalness: 0.6, clippingPlanes: clip });
  for (const y of [Y.cTop + 1.4, Y.cTop + 2.2, Y.cTop + 3.0]) addSolid(cylBetween([0, y, 0], [0, y + 0.5, 0], 0.68, 48), bandMat, cutOf(0x7a5a32), mach);

  // ------------------------------------------------ nozzles (left: thermal gate, right: valve gate)
  const noz = PX.map((x, i) => {
    const g = new THREE.Group(); hot.add(g);
    const steel = steelOf(0xb3bac2, 0.3, 0.85, 'hrn' + i), cut = cutOf(0xc8ced5);
    const body = csg(new THREE.CylinderGeometry(NZ.headR, NZ.headR, NZ.headTop - Y.pocket, 48).translate(x, (NZ.headTop + Y.pocket) / 2, 0), [['add', cylBetween([x, NZ.tipY + 0.1, 0], [x, Y.pocket + 0.01, 0], NZ.bodyR, 48)],
      ['add', new THREE.CylinderGeometry(NZ.bodyR, 0.11, 0.16, 48).translate(x, NZ.tipY + 0.02, 0)], ['sub', cylBetween([x, NZ.tipY - 0.1, 0], [x, NZ.headTop + 0.05, 0], NZ.bore, 24)]]);
    solid(body, steel, cut, g, (st) => i === 0 ? (st.deadL ? 60 : 30 + 205 * st.nozHeat + (st.crossed ? 45 : 0)) : 30 + 205 * st.nozHeat + 70 * st.overR - (st.crossed ? 120 : 0));
    const mm = meltMat.clone(), mc = meltCut.clone(); mc.onBeforeCompile = M.cut.onBeforeCompile;
    const meltCol = addSolid(cylBetween([x, NZ.tipY - 0.06, 0], [x, NZ.headTop + 0.02, 0], NZ.bore * 0.95, 20), mm, mc, g);
    const tm = meltMat.clone(), tcap = meltCut.clone(); tcap.onBeforeCompile = M.cut.onBeforeCompile;
    addSolid(new THREE.ConeGeometry(0.29, 0.13, 32).rotateX(Math.PI).translate(x, CUP.top + 0.075, 0), tm, tcap, g);
    if (i === 0) addSolid(new THREE.ConeGeometry(0.075, 0.2, 24).rotateX(Math.PI).translate(x, NZ.tipY - 0.07, 0), steelOf(0xd8a850, 0.3, 0.9), cutOf(0xd8b060), g);   // torpedo tip
    const hm = heatMatOf();
    g.add(new THREE.Mesh(coil(x, 0.42, 1.0, 0.285, 8, 0.024), hm));
    const tcG = new THREE.Group(); g.add(tcG);
    tcG.add(new THREE.Mesh(cylBetween([x + (i ? 0.29 : -0.29), 0.36, -0.06], [x + (i ? 0.29 : -0.29), 1.36, -0.06], 0.02, 10), tcMat));
    return { g, x, steel, hm, mm, mc, tcG, meltCol, tm, tcap };
  });
  // valve pin (right nozzle) through a bushing in the manifold
  const pinMat = steelOf(0xd8dde2, 0.18, 1.0);
  const pinG = new THREE.Group(); hot.add(pinG);
  addSolid(cylBetween([NZ.x, CUP.top + 0.005, 0], [NZ.x, 2.9, 0], 0.05, 20), pinMat, cutOf(0xe0e4e8), pinG);
  const depMat = new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.9, transparent: true, opacity: 0, clippingPlanes: clip });
  for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016 + 0.006 * (k % 3), 6, 20).rotateX(Math.PI / 2), depMat); d.position.set(NZ.x, 0.32 + k * 0.17, 0); pinG.add(d); }

  // ------------------------------------------------ parts (cups), filled from the gate down
  const partU = PX.map(() => ({ uFillY: { value: 9 }, uHot: { value: 1 } }));
  const partMat = (i, cap) => {
    const m = cap ? new THREE.MeshBasicMaterial({ color: 0x3a4048, side: THREE.BackSide, clippingPlanes: clip }) : new THREE.MeshStandardMaterial({ color: 0x2f353c, roughness: 0.45, metalness: 0.05, clippingPlanes: clip });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, partU[i]); worldPosVertex(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform float uFillY, uHot;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vWPos.y < uFillY) discard;
          diffuseColor.rgb = mix(diffuseColor.rgb, ${cap ? 'vec3(1.0, 0.55, 0.15)' : 'vec3(1.0, 0.45, 0.1)'}, uHot);`);
      if (!cap) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.35, 0.05) * uHot * 0.8;');
    };
    m.customProgramCacheKey = () => 'cup' + i + cap;
    return m;
  };
  const cupGeo = (x) => csg(new THREE.CylinderGeometry(CUP.r - 0.005, CUP.r - 0.005, CUP.top - CUP.bot - 0.005, 64).translate(x, (CUP.top + CUP.bot) / 2, 0), [['sub', new THREE.CylinderGeometry(CUP.rin + 0.005, CUP.rin + 0.005, CUP.inTop - CUP.bot + 0.02, 48).translate(x, (CUP.inTop + CUP.bot) / 2 - 0.01, 0)]]);
  const parts = PX.map((x, i) => { const g = new THREE.Group(); scene.add(g); const m = addSolid(cupGeo(x), partMat(i, false), partMat(i, true), g); return { g, m }; });
  // gate vestige nubs (long gate marks)
  const nubMat = new THREE.MeshStandardMaterial({ color: 0x6a737c, roughness: 0.45, clippingPlanes: clip });
  const nubs = PX.map((x, i) => { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, 0.3, 12).translate(x, CUP.top + 0.15, 0), nubMat); parts[i].g.add(n); return n; });
  // drool string (left gate) + frozen plug (right gate) + valve-pin drip
  const droolMat = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a00, emissiveIntensity: 0.8, roughness: 0.4 });
  const drool = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 1, 10).translate(0, -0.5, 0), droolMat); scene.add(drool);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), droolMat); scene.add(drip);
  const plug = new THREE.Group(); hot.add(plug);
  const frozenMat = new THREE.MeshStandardMaterial({ color: 0x3a4652, roughness: 0.8, clippingPlanes: clip });
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 16).translate(NZ.x, CUP.top + 0.06, 0), frozenMat), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.09, 24).rotateX(Math.PI).translate(NZ.x, CUP.top + 0.09, 0), frozenMat));
  const gapMark = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1, 0.84), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe9ff).multiplyScalar(1.4), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip })); gapMark.position.x = -NZ.x; hot.add(gapMark);

  // ------------------------------------------------ wiring, junction box, zone tags, meter
  const jb = new THREE.Group(); hot.add(jb);
  jb.add(placed(new THREE.Mesh(rbox(0.5, 0.9, 1.3, 0.05), new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.5, metalness: 0.4 })), 4.65, 1.4, 0));
  for (let k = 0; k < 5; k++) jb.add(placed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16).rotateZ(Math.PI / 2), M.brass), 4.95, 1.62 - k * 0.11, 0.35));
  const wireMats = [0xd8342a, 0xe8e8e0, 0xd8342a, 0x202020, 0xd8b030].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, clippingPlanes: clip }));
  const wires = [];
  const wire = (pts, m) => { const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), 60, 0.022, 6), m); hot.add(w); wires.push(w); return w; };
  for (const [i, x] of PX.entries()) {
    const s = i ? 1 : -1;
    wire([[x + s * 0.3, 1.0, -0.12], [x + s * 0.35, 1.42, -0.3], [x * 0.6, 1.25, -0.6], [3.3, 1.3, -0.3], [4.4, 1.33, -0.25]], wireMats[i ? 2 : 0]);
    wire([[x + s * 0.29, 1.36, -0.06], [x + s * 0.42, 1.5, -0.35], [x * 0.6, 1.2, -0.66], [3.3, 1.36, -0.2], [4.4, 1.36, -0.2]], wireMats[4]);
  }
  wire([[2.7, 1.75, -0.35], [3.2, 1.6, -0.5], [3.6, 1.35, -0.3], [4.4, 1.3, -0.3]], wireMats[3]);
  const tagTex = (txt) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#f4e27a'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#111'; x.font = `800 40px ${fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tags = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: tagTex(z), transparent: true, opacity: 0, side: THREE.DoubleSide })); m.position.set(5.2, 1.62 - k * 0.11, 0.42); jb.add(m); return m; });
  const meterG = new THREE.Group(); scene.add(meterG);
  meterG.add(placed(new THREE.Mesh(rbox(0.5, 0.8, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.5 })), 5.9, 0.9, 1.0));
  const mcv = document.createElement('canvas'); mcv.width = 128; mcv.height = 64; const mcx = mcv.getContext('2d'); const mTex = new THREE.CanvasTexture(mcv);
  const mScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.19), new THREE.MeshBasicMaterial({ map: mTex, toneMapped: false })); mScreen.position.set(5.9, 1.12, 1.065); meterG.add(mScreen);
  for (const [k, c] of [[0, 0xd8342a], [1, 0x202020]]) meterG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(5.8 + k * 0.2, 0.55, 1.0), new V3(5.6 + k * 0.1, 0.2, 1.2), new V3(5.3, 0.9, 0.9), new V3(5.02, 1.62 - k * 0.11, 0.4)]), 40, 0.018, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })));
  let mLast = '';
  const meterDraw = (txt) => { if (txt === mLast) return; mLast = txt; mcx.fillStyle = '#c8d4c0'; mcx.fillRect(0, 0, 128, 64); mcx.fillStyle = '#111'; mcx.font = `700 34px ${fontFamily}`; mcx.textAlign = 'center'; mcx.textBaseline = 'middle'; mcx.fillText(txt, 64, 34); mTex.needsUpdate = true; };

  // ------------------------------------------------ leak blobs, weep line, effects
  const leakMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5000, emissiveIntensity: 0.8, roughness: 0.5, clippingPlanes: clip });
  const R = mulberry(9);
  const blobs = [];
  const addBlob = (p, sc, d) => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), leakMat); b.userData = { p, s: sc, d }; hot.add(b); blobs.push(b); };
  for (let k = 0; k < 8; k++) { const a = Math.PI + (k / 7) * Math.PI; addBlob(new V3(-NZ.x + Math.cos(a) * 0.44, 1.3 + R() * 0.08, Math.min(-0.03, Math.sin(a) * 0.44)), new V3(0.1 + R() * 0.06, 0.07, 0.1 + R() * 0.06), R() * 0.15); }
  for (let k = 0; k < 22; k++) { const a = Math.PI + R() * Math.PI, r = 0.5 + R() * 0.9, sy = 0.045 + R() * 0.05; addBlob(new V3(-NZ.x + Math.cos(a) * r, Y.pocket + sy * 0.7, Math.min(-0.05, Math.sin(a) * r * 0.75)), new V3(0.14 + R() * 0.18, sy, 0.12 + R() * 0.15), 0.12 + (r - 0.5) / 0.9 * 0.55); }
  for (let k = 0; k < 8; k++) addBlob(new V3(-1.6 + k * 0.28, 1.22 + R() * 0.06, -0.62 + R() * 0.08), new V3(0.09 + R() * 0.05, 0.05 + R() * 0.02, 0.07), 0.55 + k * 0.05);
  const weepMat = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a00, emissiveIntensity: 0.6, roughness: 0.4 });
  const weep = new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.04).translate(0.5, 0, 0), weepMat); weep.position.set(-3.6, Y.mpBot, D / 2 + 0.01); scene.add(weep);
  const weepDrops = []; for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), weepMat); d.userData.x = -3.4 + k * 1.2 + R() * 0.3; scene.add(d); weepDrops.push(d); }
  const moist = []; for (let k = 0; k < 18; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.9, clippingPlanes: clip })); const a = R() * Math.PI * 2, y = 0.45 + R() * 0.5; d.position.set(-NZ.x + Math.cos(a) * 0.31, y, Math.sin(a) * 0.31); hot.add(d); moist.push(d); }
  const sparks = new Puffs(scene, { count: 60, color: 0xffd27a, opacity: 0, size: 0.4, additive: true });
  const steam = new Puffs(scene, { count: 60, color: 0xdfe8ef, opacity: 0, size: 0.5 });
  const smoke = new Puffs(scene, { count: 40, color: 0x4a3a30, opacity: 0, size: 0.4 });
  const flash = new THREE.PointLight(0xffd090, 0, 4, 1.6); flash.position.set(-NZ.x, 0.7, 0.6); scene.add(flash);
  const glint = new THREE.PointLight(0xffffff, 0, 3, 1.6); scene.add(glint);

  // ------------------------------------------------ melt flow streaks
  const RR = mulberry(4);
  const flowPaths = PX.map((x, i) => {
    const s = Math.sign(x), out = [];
    for (let j = 0; j < 10; j++) {
      const o = () => (RR() - 0.5) * 0.08;
      out.push(buildLUT([new V3(o(), Y.cTop + 1.1, -0.02), new V3(o(), Y.cTop, -0.02), new V3(o(), MAN.yt, -0.02), new V3(o() * 0.5, MAN.ch + 0.03, -0.03), new V3(s * 0.6, MAN.ch + o(), -0.03), new V3(s * (MAN.drop - 0.3), MAN.ch + o(), -0.03),
        new V3(x + o() * 0.4, MAN.ch - 0.05, -0.02), new V3(x + o() * 0.5, MAN.yb, -0.02), new V3(x + o() * 0.5, 0.8, -0.02), new V3(x + o() * 0.5, NZ.tipY, -0.02), new V3(x, CUP.top + 0.02, -0.02), new V3(x + o() * 6, CUP.top - 0.08, -0.05)], () => 1, 160));
    }
    return out;
  });
  const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });
  const flow = flowPaths.map((P, i) => new Streaks(scene, { paths: P, count: 120, material: flowMat, seed: 11 + i, speed: 2.4, radius: 0.016, lenMin: 0.06, lenMax: 0.14, colorFn: (p, u, w, c) => c.setRGB(1.9, 1.15, 0.35) }));
  const squirt = new Streaks(scene, { paths: [0, 1, 2, 3, 4, 5].map((k) => { const a = -Math.PI * (0.15 + k * 0.14); return buildLUT([new V3(-NZ.x, MAN.yb - 0.02, -0.02), new V3(-NZ.x + Math.cos(a) * 0.5, MAN.yb - 0.03, Math.sin(a) * 0.4), new V3(-NZ.x + Math.cos(a) * 1.0, Y.pocket + 0.1, Math.sin(a) * 0.7)], () => 1, 40); }), count: 60, material: flowMat, seed: 3, speed: 1.6, radius: 0.02, dots: 'smooth', colorFn: (p, u, w, c) => c.setRGB(1.9, 1.0, 0.3) });

  // ------------------------------------------------ rig: cold-runner shot vs hot-runner shot
  const R0 = RIG.runner;
  const plas = new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.4, metalness: 0.05 });
  const runU = { uRed: { value: 0 } };
  const runMat = new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.4, metalness: 0.05 });
  runMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, runU); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRed;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.95, 0.12, 0.08) * uRed * 0.8;'); };
  const cup0 = csg(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 64), [['sub', new THREE.CylinderGeometry(0.6, 0.6, 0.47, 48).translate(0, -0.08, 0)]]);
  const coldG = new THREE.Group(); coldG.position.copy(R0).add(new V3(-2.4, 0, 0)); scene.add(coldG);
  for (const x of [-1.25, 1.25]) { const c = new THREE.Mesh(cup0, plas); c.position.set(x, 0, 0); c.castShadow = shadows; coldG.add(c); }
  const runGeo = mergeGeometries([new THREE.CylinderGeometry(0.1, 0.16, 1.4, 24).translate(0, 1.0, 0), cylBetween([-1.25, 0.32, 0], [1.25, 0.32, 0], 0.1, 20), new THREE.SphereGeometry(0.16, 16, 12).translate(0, 0.32, 0)].map((g) => g.toNonIndexed()));
  const runner = new THREE.Mesh(runGeo, runMat); runner.castShadow = shadows; coldG.add(runner);
  const hotG = new THREE.Group(); hotG.position.copy(R0).add(new V3(2.4, 0, 0)); scene.add(hotG);
  for (const x of [-1.25, 1.25]) { const c = new THREE.Mesh(cup0, plas); c.position.set(x, 0, 0); c.castShadow = shadows; hotG.add(c); }
  const rigPlinth = new THREE.Mesh(rbox(9, 0.2, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.6, metalness: 0.2 })); rigPlinth.position.copy(R0).add(new V3(0, -0.42, 0)); rigPlinth.receiveShadow = shadows; scene.add(rigPlinth);
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);

  // ------------------------------------------------ update
  const tmpC = new THREE.Color();
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 2.2, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null, thermal = opts.thermal || 0;
    // exploded strip-down + mould opening
    const ex = st.explode;
    clampG.position.y = 1.9 * ex; manPlateG.position.y = 0.95 * ex; manG.position.y = 1.25 * ex;
    noz.forEach((n) => (n.g.position.y = 0.9 * ex)); pinG.position.y = 1.0 * ex + 0.2 * st.pinOpen + 0.85 * st.pinLift; piston.position.y = 1.9 * ex + 0.2 * st.pinOpen;
    jb.position.y = 0.95 * ex;
    const open = Math.max(st.open, st.gateOpen, ex * 0.7, st.vestige ? smooth(165.0, 165.6, t) : 0) * 1.1 + (t > 150.6 && t < 154.2 ? 0.9 * smooth(150.6, 151.4, t) * (1 - smooth(153.6, 154.2, t)) : 0);
    bSide.position.y = -open;
    // thermal growth: manifold grows in thickness (closing the nozzle gap) and in length (drops line up)
    const g = st.expand;
    manG2.scale.set(1 + 0.0138 * g, 1 + 0.14 * g, 1); manG2.position.y = -MAN.yt * 0.14 * g;   // anchored at the top face
    // heater glow
    manHeatMat.emissiveIntensity = 1.6 * st.manHeat; sprueHeat.emissiveIntensity = 1.6 * st.heat;
    noz.forEach((n, i) => {
      let h = st.nozHeat;
      if (i === 0) h = st.deadL ? 0 : h * (st.crossed ? 1.6 : 1);
      else h = h * (1 + 0.9 * st.overR) * (st.crossed ? 0.25 : 1);
      n.hm.emissiveIntensity = 1.6 * h; n.hm.emissive.setHex(h > 1.3 ? 0xffd08a : 0xff4a10);
      const burnt = i === 1 ? st.burnt : 0;
      n.mm.color.setHex(0xff7a1a).lerp(tmpC.setHex(0x2a1a0e), burnt); n.mm.emissiveIntensity = 0.9 * (1 - burnt);
      n.mc.color.setHex(0xff8a2a).lerp(tmpC.setHex(0x3a2412), burnt);
    });
    noz[1].tcG.position.y = 0.4 * st.tcOut;
    // thermal view: recolour exteriors and caps by temperature
    for (const s of TH) {
      const T = s.temp(st);
      if (thermal > 0) { cmap(tNorm(T), tmpC); s.cap.color.copy(s.cap.userData.base).lerp(tmpC, thermal); s.ext.emissive.copy(tmpC).multiplyScalar(0.55 * thermal); }
      else { s.cap.color.copy(s.cap.userData.base); s.ext.emissive.setRGB(0, 0, 0); }
    }
    waterMat.color.setHex(0x3fb8ff).multiplyScalar(1.2);
    // parts: fill from the gate down, then cool; ride on the B side, hop off on eject
    parts.forEach((p, i) => {
      const lim = i === 1 && st.shortShot ? 0.55 : 1;
      const f = Math.min(st.fill, lim);
      const e = st.eject; p.g.position.y = -open + 0.35 * Math.sin(e * Math.PI * 0.5) - 2.6 * e * e; p.g.position.z = 1.1 * e; p.g.rotation.x = 0.0;
      partU[i].uFillY.value = CUP.top + 0.02 - f * (CUP.top - CUP.bot + 0.04) + p.g.position.y;
      partU[i].uHot.value = 1 - st.cool * 0.92;
      p.g.visible = !st.gone;
      nubs[i].visible = !!st.vestige || (i === 0 && st.drool > 0.01);
    });
    // drool (left gate) between gate and part, pin drip (right gate), frozen plug
    const dl = st.drool, pd = st.pinLeak * (t > 150.6 ? 1 : 0);
    drool.visible = dl > 0.01 && open > 0.05;
    if (drool.visible) { const top = CUP.top - 0.01, bot = CUP.top - open + 0.05; drool.position.set(-NZ.x, top, 0); drool.scale.set(1, Math.max(0.01, (top - bot) * dl), 1); }
    drip.visible = pd > 0.01; drip.position.set(NZ.x, CUP.top - 0.06 - 0.1 * Math.sin(t * 3) ** 2, 0); drip.scale.setScalar(0.6 + 0.6 * pd);
    plug.visible = st.freeze > 0.01;
    noz.forEach((n, i) => { const f = i === 1 ? st.freeze : 0; n.tm.color.setHex(0xff7a1a).lerp(tmpC.setHex(0x3a4652), f); n.tm.emissiveIntensity = 0.9 * (1 - f); n.tcap.color.setHex(0xff8a2a).lerp(tmpC.setHex(0x46525e), f); });
    const manBot = MAN.yt - (MAN.yt - MAN.yb) * (1 + 0.14 * g), gap = manBot - NZ.headTop;
    gapMark.visible = gap > 0.004 && t > 83 && t < 112.3; gapMark.scale.y = Math.max(0.001, gap); gapMark.position.y = NZ.headTop + gap / 2;
    const wear = st.pinWear > 0.01;
    if (noz[1].mm.transparent !== wear) { noz[1].mm.transparent = wear; noz[1].mm.opacity = wear ? 0.3 : 1; noz[1].mm.depthWrite = !wear; noz[1].mm.needsUpdate = true; }
    noz[1].meltCol.children.forEach((c) => (c.visible = !wear && cut > 0.0001));
    depMat.opacity = 0.95 * st.pinWear * (1 - st.clean);
    // leak + wiring + effects
    blobs.forEach((b) => { const k = smooth(b.userData.d, b.userData.d + 0.5, st.leak); b.visible = k > 0.01; b.position.copy(b.userData.p); b.scale.copy(b.userData.s).multiplyScalar(k); });
    leakMat.color.setHex(0xff7a1a).lerp(tmpC.setHex(0x3a2a20), st.leakCool); leakMat.emissiveIntensity = 0.8 * (1 - st.leakCool);
    wires.forEach((w, k) => (w.material.emissive?.setHex(st.wireBreak > 0.5 && (k % 2 === 0) ? 0x401000 : 0x000000)));
    squirt.update({ tau: t, vis: smooth(106.0, 106.4, t) * (1 - smooth(108.6, 109.2, t)), camPos: null });
    sparks.mat.uniforms.uOpacity.value = st.shortL > 0 ? 0.95 * st.shortL : 0.8 * (st.wireBreak > 0 && st.wireBreak < 1 ? 1 : 0);
    sparks.update((i, s, o) => {
      if (st.shortL > 0) { const age = (t * 2.2 + s[0]) % 1; o.p.set(-NZ.x + (s[1] - 0.5) * 0.4 + (s[3] - 0.5) * age * 1.2, 0.7 + (s[2] - 0.5) * 0.4 + age * 0.4 - age * age * 0.9, 0.35 + s[4] * 0.3); o.size = 0.1 * (1 - age); o.alpha = 1 - age; }
      else { const k = Math.floor(s[0] * 5), age = (t * 3 + s[1]) % 1; o.p.set(-1.3 + k * 1.15 + (s[2] - 0.5) * 0.2, 1.25 + (s[3] - 0.5) * 0.15 + age * 0.2, -0.55); o.size = 0.08 * (1 - age); o.alpha = (1 - age); }
    });
    flash.intensity = 30 * st.shortL * (0.6 + 0.4 * Math.sin(t * 60));
    moist.forEach((d) => (d.visible = st.moist > 0.02)); moist.forEach((d) => d.scale.setScalar(st.moist));
    steam.mat.uniforms.uOpacity.value = 0.35 * st.soft;
    steam.update((i, s, o) => { const age = (t * 0.45 + s[0]) % 1, src = s[1] < 0.5 ? new V3(PX[s[1] < 0.25 ? 0 : 1], 0.75, 0.3) : new V3((s[2] - 0.5) * 5, MAN.yt + 0.1, 0.3); o.p.set(src.x + (s[3] - 0.5) * 0.4, src.y + age * 1.1, src.z + (s[4] - 0.5) * 0.3); o.size = 0.15 + age * 0.5; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    smoke.mat.uniforms.uOpacity.value = 0.4 * st.burnt;
    smoke.update((i, s, o) => { const age = (t * 0.5 + s[0]) % 1; o.p.set(NZ.x + (s[1] - 0.5) * 0.3, 1.0 + age * 1.2, 0.2 + (s[2] - 0.5) * 0.3); o.size = 0.15 + age * 0.4; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    weep.visible = st.weep > 0.01; weep.scale.x = 7.2 * st.weep;
    weepDrops.forEach((d, k) => { const on = st.weep > 0.05 && d.userData.x < -3.6 + 7.2 * st.weep; d.visible = on; const age = (t * 0.4 + k * 0.37) % 1; d.position.set(d.userData.x, Y.mpBot - 0.04 - age * 0.25, D / 2 + 0.03); d.scale.setScalar(on ? 0.6 + 0.6 * age : 0.01); });
    tags.forEach((m) => (m.material.opacity = st.tags));
    meterG.visible = st.meter > 0.01; meterG.position.y = (1 - st.meter) * -0.4;
    if (meterG.visible) meterDraw(t < 192.8 ? '21.8Ω' : '22.1Ω');
    glint.intensity = st.pinLift > 0.5 ? 6 * smooth(202.4, 203.0, t) * (1 - smooth(203.6, 204.2, t)) : 0; glint.position.set(NZ.x + 0.4, 1.5, 0.6);
    // flow
    const fv = st.flow * (st.explode > 0.01 ? 0 : 1);
    flow.forEach((f, i) => f.update({ tau: t * (0.5 + st.flow), vis: fv * (i === 1 && st.shortShot ? 0.4 : 1), camPos: cam }));
    // rig
    runU.uRed.value = smooth(16.2, 16.9, t);
    const nearRig = cam && cam.distanceTo(R0) < 18;
    rigL.visible = !!nearRig; rigL.intensity = nearRig ? 150 : 0;
    if (nearRig) { rigL.position.copy(R0).add(new V3(1, 6, 5)); rigL.target.position.copy(R0); rigL.target.updateMatrixWorld(); }
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    sprue: new V3(0.27, 2.6, 0.05), machNoz: new V3(0.45, 4.1, 0.1), pinLow: new V3(NZ.x + 0.06, 0.75, 0.05), manifold: new V3(-1.6, MAN.yt, 0.1), channel: new V3(-1.2, MAN.ch, 0), nozzleL: new V3(-NZ.x - 0.3, 0.7, 0.1), nozzleR: new V3(NZ.x + 0.3, 0.7, 0.1),
    heaterL: new V3(-NZ.x - 0.29, 0.6, 0.12), heaterR: new V3(NZ.x + 0.29, 0.6, 0.12), manHeater: new V3(-2.0, MAN.yt, -0.32), tcMan: new V3(1.0, MAN.ch, -0.2), get tcR() { return new V3(NZ.x + 0.29, 1.36 + noz[1].tcG.position.y, -0.06); },
    gateL: new V3(-NZ.x, CUP.top + 0.02, 0.05), gateR: new V3(NZ.x, CUP.top + 0.02, 0.05), tipL: new V3(-NZ.x, NZ.tipY - 0.05, 0.02), pin: new V3(NZ.x + 0.05, 1.9, 0.05), piston: new V3(NZ.x + 0.3, 2.9, 0.05),
    get partL() { return new V3(-NZ.x + 0.5, CUP.top - 0.2 - bSide.position.y * -1, 0.3); }, get partR() { return new V3(NZ.x + 0.5, CUP.top - 0.2 + bSide.position.y, 0.3); },
    cooling: new V3(-1.0, 0.38, 0.1), airGap: new V3(-3.2, 1.7, 0.1), locator: new V3(0.2, 1.2, 0.05), spacer: new V3(1.5, 2.4, 0.05), gapL: new V3(-NZ.x + 0.42, 1.43, 0.05),
    leak: new V3(-NZ.x + 0.7, 1.12, -0.3), wires: new V3(1.5, 1.27, -0.6), jbox: new V3(4.9, 1.85, 0.3), meter: new V3(5.9, 1.25, 1.06), tags: new V3(5.2, 1.4, 0.45), weep: new V3(0.5, Y.mpBot, D / 2),
    aPlate: new V3(-3.8, 0.2, D / 2), bPlate: new V3(-3.8, -1.2, D / 2), clamp: new V3(-3.8, 3.0, D / 2),
    cold: R0.clone().add(new V3(-2.4, 1.2, 0)), coldRunner: R0.clone().add(new V3(-2.4, 0.4, 0.15)), hotShot: R0.clone().add(new V3(2.4, 0.3, 0.6)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
