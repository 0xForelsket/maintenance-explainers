// Oil-injected rotary screw compressor package in section: motor + coupling, air end with a helical male (4 lobes) /
// female (6 flutes) rotor pair, intake filter + inlet valve, oil injection, separator tank with coalescing element,
// minimum pressure valve, thermostatic valve, combined oil cooler / aftercooler with fan, oil filter, moisture
// separator + drain, controller screen. Macro rigs: the rotor pair at large scale, and the plant air network.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, makeClock } from 'series/look';
import { stateAt } from './story.js';

export const RIG = { rotors: new V3(40, 0, 0), net: new V3(60, 0, 0) };
const AE = { x0: -2.35, x1: -0.55, y0: -2.05, y1: -0.45, z: 0.55 };          // air end housing
const ROT = { x0: -2.2, len: 1.5, ym: -0.95, yf: -1.51, rmIn: 0.2, rmOut: 0.31, rfIn: 0.25, rfOut: 0.36, wrap: 5.2 };
const TANK = { x: 1.35, r: 0.55, y0: -2.15, y1: 0.45, sump: -1.45 };
const COOL = { x0: 2.85, x1: 4.2, oy0: -1.5, oy1: -0.05, ay0: 0.2, ay1: 1.6, z: 0.6 };
const OIL_PASS = [-1.32, -0.95, -0.55, -0.18], AIR_PASS = [1.42, 0.9, 0.38];
const TV = { x: 2.35, y: -1.85 }, OF = { x: 0.2, y0: 1.0, y1: 1.62 }, MS = { x: 4.62, y0: -0.6, y1: 0.08 };
const INJ = { x: -1.25 }, INL = { x: -1.95 };

// helical lobed rotor along +x (0..len): male = convex lobes, female = concave flutes. aS = axial 0..1, aD = depth 0 root..1 tip
function rotorGeo({ n, rIn, rOut, female, len, twist, nx = 80, nt = 200, p }) {
  const prof = (th) => { const c = Math.pow((1 + Math.cos(n * th)) / 2, p); return female ? rOut - (rOut - rIn) * c : rIn + (rOut - rIn) * c; };
  const pos = [], aS = [], aD = [], idx = [];
  for (let i = 0; i <= nx; i++) {
    const s = i / nx, x = s * len, tw = twist * s;
    for (let j = 0; j <= nt; j++) { const th = (j / nt) * Math.PI * 2, r = prof(th), a = th + tw; pos.push(x, Math.cos(a) * r, Math.sin(a) * r); aS.push(s); aD.push((r - rIn) / (rOut - rIn)); }
  }
  const W = nt + 1;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  // end caps
  for (const [i, s] of [[0, 0], [nx, 1]]) {
    const c = pos.length / 3; pos.push(s * len, 0, 0); aS.push(s); aD.push(0.5);
    for (let j = 0; j < nt; j++) { const a = i * W + j; if (s === 0) idx.push(c, a + 1, a); else idx.push(c, a, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// pleated filter media: open cylinder with a triangle-wave radius
function pleatGeo(r0, depth, h, n) {
  const g = new THREE.CylinderGeometry(r0, r0, h, n * 4, 1, true), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const f = (((a / (Math.PI * 2)) * n) % 1 + 1) % 1; const r = r0 + depth * Math.abs(f - 0.5) * 2; p.setXYZ(i, Math.cos(a) * r, p.getY(i), Math.sin(a) * r); }
  g.computeVertexNormals(); return g;
}

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.02, floorY: -2.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(3, 12, 10); ST.lights.key.target.position.set(0, 0, 0); ST.lights.key.intensity = 520; ST.lights.key.angle = 0.75;
  const cutOf = (hex) => { const m = M.cut.clone(); m.clippingPlanes = clip; m.color.set(hex); m.onBeforeCompile = M.cut.onBeforeCompile; return m; };
  const mesh = (g, m, parent = scene) => { const o = new THREE.Mesh(g, m); o.castShadow = shadows; o.receiveShadow = shadows; parent.add(o); return o; };
  const std = (color, roughness = 0.45, metalness = 0.5, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, clippingPlanes: clip, ...extra });
  const steelP = std(0x6f7880, 0.4, 0.6), steelCut = cutOf(0x7f8890);
  const pipe = (pts, r = 0.07, mat = steelP, cap = steelCut, bend = 0.12) => addSolid(pipeSolid(pts, r * 0.7, r, bend, 20), mat, cap);
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.6, metalness: 0.3 });
  const brass = M.brass.clone(); brass.clippingPlanes = clip; const brassCut = cutOf(0xc8a060);

  // ------------------------------------------------ package: skid, frame, back panel, top deck, front skin
  const frameM = new THREE.MeshStandardMaterial({ color: 0xd9dde1, roughness: 0.45, metalness: 0.3 });
  mesh(rbox(9.8, 0.4, 2.8, 0.04).translate(0, -2.4, 0), darkM);
  const postM = frameM.clone(); postM.clippingPlanes = clip;
  for (const x of [-4.8, 4.8]) for (const z of [-1.3, 1.3]) mesh(rbox(0.14, 4.4, 0.14, 0.02).translate(x, -0.1, z), z > 0 ? postM : frameM);
  mesh(new THREE.PlaneGeometry(9.5, 4.4).translate(0, -0.1, -1.32), new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.7, metalness: 0.2 }));
  const deck = csg(rbox(9.8, 0.12, 2.8, 0.03).translate(0, 2.12, 0), [['sub', cylBetween([3.55, 2.0, -0.75], [3.55, 2.3, -0.75], 0.5, 40)]]);
  mesh(deck, frameM);
  mesh(rbox(0.06, 4.4, 2.6, 0.02).translate(-4.8, -0.1, 0), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.5, metalness: 0.3, clippingPlanes: clip }));
  const skin = new THREE.Group(); scene.add(skin);
  const skinM = castSurface(new THREE.MeshStandardMaterial({ color: 0x2f5f8f, roughness: 0.5, metalness: 0.25, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.03, mottle: 0.08, key: 'scskin' });
  mesh(rbox(9.5, 4.2, 0.05, 0.02).translate(0, -0.15, 1.3), skinM, skin);
  mesh(rbox(0.05, 4.2, 2.6, 0.02).translate(4.8, -0.15, 0), skinM, skin);
  const louv = []; for (let k = 0; k < 12; k++) louv.push(new THREE.BoxGeometry(1.6, 0.05, 0.06).rotateX(0.5).translate(3.55, -0.6 + k * 0.12, 1.33));
  mesh(mergeGeometries(louv.map((g) => g.toNonIndexed())), new THREE.MeshStandardMaterial({ color: 0x1d3b5a, roughness: 0.5, metalness: 0.4, clippingPlanes: clip }), skin);
  const skinScreen = mesh(rbox(1.1, 0.62, 0.04, 0.02).translate(-3.6, 1.1, 1.33), new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.2, clippingPlanes: clip }), skin);
  mesh(rbox(0.5, 0.18, 0.03, 0.01).translate(-3.6, 0.55, 1.33), new THREE.MeshStandardMaterial({ color: 0xc0262b, roughness: 0.4, clippingPlanes: clip }), skin);

  // ------------------------------------------------ motor + coupling
  const motorM = castSurface(new THREE.MeshStandardMaterial({ color: 0x2e5f8a, roughness: 0.45, metalness: 0.4, clippingPlanes: clip, clipShadows: true }), { freq: 1.0, bump: 0.05, mottle: 0.1, key: 'scmotor' });
  addSolid(tubeSolid(0.48, 0.55, 1.25, 64).rotateZ(-Math.PI / 2).translate(-4.0, ROT.ym, 0), motorM, cutOf(0x3e6f9a));
  const ribs = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; ribs.push(new THREE.BoxGeometry(1.2, 0.06, 0.03).translate(0, 0.57, 0).rotateX(a).translate(-3.38, ROT.ym, 0).toNonIndexed()); }
  addSolid(mergeGeometries(ribs), motorM, cutOf(0x3e6f9a));
  addSolid(tubeSolid(0.26, 0.47, 0.85, 48).rotateZ(-Math.PI / 2).translate(-3.8, ROT.ym, 0), std(0x6a5a48, 0.6, 0.4), cutOf(0xb8733a));   // stator
  const motorRotG = new THREE.Group(); motorRotG.position.set(0, ROT.ym, 0); scene.add(motorRotG);
  addSolid(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 32).rotateZ(Math.PI / 2).translate(-3.38, 0, 0), std(0x7a838c, 0.4, 0.8), cutOf(0x8d969e), motorRotG);
  addSolid(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 16).rotateZ(Math.PI / 2).translate(-3.3, 0, 0), M.steel, M.cutSteel, motorRotG);
  addSolid(new THREE.CylinderGeometry(0.5, 0.5, 0.28, 48).rotateZ(Math.PI / 2).translate(-4.14, ROT.ym, 0), darkM.clone(), cutOf(0x3b4148));   // fan cowl
  mesh(rbox(0.36, 0.26, 0.3, 0.03).translate(-3.4, ROT.ym + 0.62, 0), new THREE.MeshStandardMaterial({ color: 0x2e5f8a, roughness: 0.45, metalness: 0.4 }));   // terminal box
  for (const x of [-3.9, -2.9]) mesh(rbox(0.3, 0.75, 1.0, 0.02).translate(x, -1.8, 0), darkM);
  // coupling: two hubs + elastomer spider (glint in the fix)
  const coupG = new THREE.Group(); coupG.position.set(0, ROT.ym, 0); scene.add(coupG);
  for (const x of [-2.62, -2.44]) addSolid(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 40).rotateZ(Math.PI / 2).translate(x, 0, 0), std(0x9aa3ad, 0.3, 0.85), cutOf(0xb0b8c0), coupG);
  addSolid(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 40).rotateZ(Math.PI / 2).translate(-2.53, 0, 0), std(0xe07a20, 0.6, 0.0), cutOf(0xf08a30), coupG);
  // shaft into the air end (male rotor)
  addSolid(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 16).rotateZ(Math.PI / 2).translate(-2.3, ROT.ym, 0), M.steel, M.cutSteel);

  // ------------------------------------------------ air end housing (bores for both rotors, inlet port on top, discharge low at the end)
  const aeM = castSurface(new THREE.MeshStandardMaterial({ color: 0x4b545c, roughness: 0.45, metalness: 0.5, clippingPlanes: clip, clipShadows: true }), { freq: 1.1, bump: 0.08, mottle: 0.16, key: 'scae' });
  const aeGeo = csg(rbox(AE.x1 - AE.x0, AE.y1 - AE.y0, 2 * AE.z, 0.06).translate((AE.x0 + AE.x1) / 2, (AE.y0 + AE.y1) / 2, 0), [
    ['sub', cylBetween([ROT.x0 - 0.05, ROT.ym, 0], [ROT.x0 + ROT.len + 0.05, ROT.ym, 0], ROT.rmOut + 0.015, 64)],
    ['sub', cylBetween([ROT.x0 - 0.05, ROT.yf, 0], [ROT.x0 + ROT.len + 0.05, ROT.yf, 0], ROT.rfOut + 0.015, 64)],
    ['sub', cylBetween([INL.x, ROT.ym, 0], [INL.x, AE.y1 + 0.1, 0], 0.17, 32)],
    ['sub', cylBetween([ROT.x0 + ROT.len - 0.1, -1.5, 0], [AE.x1 + 0.1, -1.5, 0], 0.13, 32)],
    ['sub', cylBetween([INJ.x, ROT.ym, 0], [INJ.x, AE.y1 + 0.1, 0], 0.045, 16)],
    ['sub', cylBetween([AE.x0 - 0.1, ROT.ym, 0], [ROT.x0, ROT.ym, 0], 0.08, 24)],
  ]);
  addSolid(aeGeo, aeM, cutOf(0x6a737c));
  for (const x of [AE.x0 + 0.08, AE.x1 - 0.08]) for (const y of [ROT.ym, ROT.yf]) addSolid(tubeSolid(0.075, 0.13, 0.08, 32).rotateZ(-Math.PI / 2).translate(x - 0.04, y, 0), std(0xc8ccd0, 0.25, 0.9), cutOf(0xd8dce0));   // bearings

  // ------------------------------------------------ rotors (unclipped: shown whole inside the cut housing)
  const RU = { uHeat: { value: 1 }, uVarnish: { value: 0 }, uOil: { value: 0 }, uDry: { value: 0 } };
  const rotorMat = (hex) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, metalness: 0.85 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, RU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aS; attribute float aD; varying float vS; varying float vD;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vS = aS; vD = aD;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHeat, uVarnish, uOil, uDry; varying float vS; varying float vD;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float groove = pow(1.0 - clamp(vD, 0.0, 1.0), 1.6);
          vec3 airC = mix(vec3(0.25, 0.55, 1.0), vec3(1.0, 0.42, 0.12), smoothstep(0.15, 1.0, vS));
          diffuseColor.rgb = mix(diffuseColor.rgb, airC, groove * 0.55 * uHeat);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.55, 0.12), uOil * 0.35 * (0.4 + 0.6 * groove));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.18, 0.05), uVarnish * 0.75);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += mix(vec3(0.1, 0.25, 0.6), vec3(0.9, 0.3, 0.06), smoothstep(0.15, 1.0, vS)) * groove * 0.45 * uHeat * (1.0 - 0.6 * uVarnish);
          totalEmissiveRadiance += vec3(1.6, 0.42, 0.06) * uDry * smoothstep(0.2, 1.0, vS) * (0.45 + 0.55 * groove);`);
    };
    return m;
  };
  const maleGeo = (sc = 1) => rotorGeo({ n: 4, rIn: ROT.rmIn * sc, rOut: ROT.rmOut * sc, female: false, len: ROT.len * sc, twist: ROT.wrap, p: 2.0 });
  const femaleGeo = (sc = 1) => rotorGeo({ n: 6, rIn: ROT.rfIn * sc, rOut: ROT.rfOut * sc, female: true, len: ROT.len * sc, twist: -ROT.wrap * 4 / 6, p: 1.3 });
  const maleM = rotorMat(0xb8c0c8), femaleM = rotorMat(0x98a2ac);
  const male = mesh(maleGeo(), maleM); male.position.set(ROT.x0, ROT.ym, 0);
  const female = mesh(femaleGeo(), femaleM); female.position.set(ROT.x0, ROT.yf, 0);
  for (const [y, r] of [[ROT.ym, 0.07], [ROT.yf, 0.07]]) mesh(new THREE.CylinderGeometry(r, r, ROT.len + 0.3, 16).rotateZ(Math.PI / 2).translate(ROT.x0 + ROT.len / 2, y, 0), M.zincNoClip);

  // ------------------------------------------------ intake: filter canister (pleated element) + inlet valve (poppet)
  const canM = std(0x3a4148, 0.5, 0.4), canCut = cutOf(0x4a525a);
  addSolid(tubeSolid(0.3, 0.34, 0.95, 48).translate(INL.x, 0.2, 0), canM, canCut);
  addSolid(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 48).translate(INL.x, 1.3, 0), canM, canCut);   // rain cap
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; addSolid(new THREE.BoxGeometry(0.03, 0.14, 0.03).translate(INL.x + Math.cos(a) * 0.32, 1.2, Math.sin(a) * 0.32), canM, canCut); }
  const dirtU = { intake: { value: 0 }, sep: { value: 0 }, oilf: { value: 0 } };
  const mediaMat = (key, base) => { const m = new THREE.MeshStandardMaterial({ color: base, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, clippingPlanes: clip }); m.onBeforeCompile = (sh) => { sh.uniforms.uDirt = dirtU[key]; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDirt;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.18, 0.13), uDirt * 0.85);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.14;'); }; return m; };
  const intakeEl = new THREE.Group(); scene.add(intakeEl);
  mesh(pleatGeo(0.2, 0.06, 0.82, 40).translate(INL.x, 0.68, 0), mediaMat('intake', 0xeee2c4), intakeEl);
  for (const y of [0.25, 1.1]) addSolid(tubeSolid(0.18, 0.28, 0.04, 40).translate(INL.x, y, 0), std(0x2a2d31, 0.8, 0), cutOf(0x3a3d41), intakeEl);
  addSolid(tubeSolid(0.15, 0.2, 0.62, 40).translate(INL.x, -0.45, 0), steelP, steelCut);   // valve body
  addSolid(tubeSolid(0.11, 0.17, 0.04, 40).translate(INL.x, -0.24, 0), brass, brassCut);   // seat
  const poppet = new THREE.Group(); scene.add(poppet);
  addSolid(new THREE.CylinderGeometry(0.15, 0.13, 0.05, 40).translate(INL.x, 0, 0), std(0xc8ccd0, 0.3, 0.9), cutOf(0xd8dce0), poppet);
  addSolid(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12).translate(INL.x, 0.25, 0), M.steel, M.cutSteel, poppet);
  addSolid(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 24).rotateZ(Math.PI / 2).translate(INL.x + 0.34, -0.05, 0), std(0x8a939d, 0.35, 0.8), cutOf(0x9aa3ad));   // actuator

  // ------------------------------------------------ discharge line → separator tank (sump, element, lid) → minimum pressure valve
  const hotM = std(0x6f7880, 0.4, 0.6, { emissive: 0xff3010, emissiveIntensity: 0 });
  pipe([[AE.x1 - 0.05, -1.5, 0], [0.45, -1.5, 0], [0.45, -0.75, 0], [TANK.x - TANK.r + 0.02, -0.75, 0]], 0.1, hotM);
  const tankM = castSurface(new THREE.MeshStandardMaterial({ color: 0x51606b, roughness: 0.45, metalness: 0.45, clippingPlanes: clip, clipShadows: true, emissive: 0xff3010, emissiveIntensity: 0 }), { freq: 0.9, bump: 0.05, mottle: 0.12, key: 'sctank' });
  const tankCut = cutOf(0x63727d);
  addSolid(tubeSolid(TANK.r - 0.05, TANK.r, TANK.y1 - TANK.y0, 64).translate(TANK.x, TANK.y0, 0), tankM, tankCut);
  addSolid(csg(new THREE.SphereGeometry(TANK.r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(TANK.x, TANK.y1, 0), [['sub', new THREE.SphereGeometry(TANK.r - 0.05, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(TANK.x, TANK.y1, 0)], ['sub', cylBetween([TANK.x, TANK.y1, 0], [TANK.x, TANK.y1 + 0.5, 0], 0.3, 40)]]), tankM, tankCut);
  addSolid(new THREE.CylinderGeometry(TANK.r, TANK.r, 0.06, 64).translate(TANK.x, TANK.y0 + 0.03, 0), tankM, tankCut);
  for (const x of [TANK.x - 0.35, TANK.x + 0.35]) mesh(rbox(0.12, 0.08, 0.5, 0.02).translate(x, TANK.y0 - 0.02, 0), darkM);
  const oilU = { uColor: { value: new THREE.Color(0xd08a20) } };
  const sumpM = new THREE.MeshStandardMaterial({ color: 0xd08a20, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82, clippingPlanes: clip, emissive: 0x3a2004, emissiveIntensity: 0.6 });
  const sump = mesh(new THREE.CylinderGeometry(TANK.r - 0.06, TANK.r - 0.06, 1, 48).translate(0, 0.5, 0), sumpM); sump.position.set(TANK.x, TANK.y0 + 0.06, 0);
  const sepG = new THREE.Group(); scene.add(sepG);   // lid + element: lifted out together in the fix
  addSolid(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 48).translate(TANK.x, 0.8, 0), steelP, steelCut, sepG);
  mesh(pleatGeo(0.24, 0.05, 1.1, 48).translate(TANK.x, 0.15, 0), mediaMat('sep', 0xf2ecd8), sepG);
  for (const y of [-0.42, 0.7]) addSolid(tubeSolid(0.2, 0.31, 0.05, 48).translate(TANK.x, y, 0), std(0x8a939d, 0.4, 0.8), cutOf(0x9aa3ad), sepG);
  // minimum pressure valve on the lid
  addSolid(rbox(0.24, 0.24, 0.24, 0.03).translate(TANK.x, 1.0, 0), brass, brassCut);
  addSolid(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 24).translate(TANK.x - 0.2, 1.0, 0).rotateZ(0), brass, brassCut);
  pipe([[TANK.x, 1.12, 0], [TANK.x, 1.42, 0], [COOL.x0 - 0.12, 1.42, 0]], 0.08, hotM);

  // ------------------------------------------------ oil circuit: thermostatic valve → cooler / bypass → riser → filter → injection
  addSolid(rbox(0.3, 0.3, 0.3, 0.04).translate(TV.x, TV.y, 0), brass, brassCut);
  addSolid(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 24).translate(TV.x, TV.y - 0.21, 0), brass, brassCut);
  const tvSpool = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 20).rotateZ(Math.PI / 2), std(0xd8dce0, 0.3, 0.9)); tvSpool.position.set(TV.x, TV.y, 0);
  const oilP = std(0x5a6168, 0.45, 0.55, { emissive: 0xff3010, emissiveIntensity: 0 }), oilCut = cutOf(0x6a7178);
  const opipe = (pts) => pipe(pts, 0.055, oilP, oilCut);
  opipe([[TANK.x + TANK.r - 0.08, -1.85, 0], [TV.x - 0.15, TV.y, 0]]);
  opipe([[TV.x + 0.15, TV.y, 0], [COOL.x0, TV.y, 0], [COOL.x0, COOL.oy0 + 0.05, 0]]);
  opipe([[TV.x, TV.y + 0.15, 0], [TV.x, 1.2, 0], [TV.x, 1.3, -0.3], [TV.x, 1.62, -0.3], [TV.x, 1.85, 0], [OF.x, 1.85, 0], [OF.x, 1.7, 0]]);
  opipe([[COOL.x0, OIL_PASS[3], 0], [TV.x, OIL_PASS[3], 0]]);
  opipe([[OF.x - 0.15, 1.72, 0], [-0.1, 1.72, 0], [-0.1, -0.25, 0], [INJ.x, -0.25, 0], [INJ.x, AE.y1 + 0.02, 0]]);
  // oil filter (spin-on canister under its head)
  addSolid(rbox(0.42, 0.18, 0.32, 0.03).translate(OF.x, OF.y1 + 0.09, 0), std(0x9aa3ad, 0.35, 0.8), cutOf(0xaab3bd));
  const oilFilterG = new THREE.Group(); scene.add(oilFilterG);
  addSolid(tubeSolid(0.15, 0.17, OF.y1 - OF.y0, 40).translate(OF.x, OF.y0, 0), std(0xe8e4da, 0.4, 0.2), cutOf(0xd8d4ca), oilFilterG);
  addSolid(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 40).translate(OF.x, OF.y0, 0), std(0xe8e4da, 0.4, 0.2), cutOf(0xd8d4ca), oilFilterG);
  mesh(pleatGeo(0.09, 0.04, 0.5, 28).translate(OF.x, (OF.y0 + OF.y1) / 2, 0), mediaMat('oilf', 0xf0e8d0), oilFilterG);

  // ------------------------------------------------ combined cooler: oil section (4 passes) under the aftercooler (3 passes), fan behind
  const coolG = new THREE.Group(); scene.add(coolG);
  const finU = { uDirt: { value: 0 } };
  const finM = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.35, metalness: 0.85, clippingPlanes: clip, side: THREE.DoubleSide });
  finM.onBeforeCompile = (sh) => { sh.uniforms.uDirt = finU.uDirt; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDirt;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.17, 0.09), uDirt * 0.92);').replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 1.0, uDirt);').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor *= 1.0 - 0.85 * uDirt;'); };
  const fins = []; for (let x = COOL.x0 + 0.08; x < COOL.x1 - 0.02; x += 0.07) for (const [y0, y1] of [[COOL.oy0, COOL.oy1], [COOL.ay0, COOL.ay1]]) fins.push(new THREE.BoxGeometry(0.006, y1 - y0, 2 * COOL.z).translate(x, (y0 + y1) / 2, 0).toNonIndexed());
  mesh(mergeGeometries(fins), finM, coolG);
  const alu = std(0xb8bec4, 0.35, 0.85), aluCut = cutOf(0xc8ced4);
  for (const y of [...OIL_PASS, ...AIR_PASS]) for (const z of [0, -0.35]) addSolid(cylBetween([COOL.x0, y, z], [COOL.x1, y, z], 0.055, 16), alu, aluCut, coolG);
  for (const [y0, y1] of [[COOL.oy0, COOL.oy1], [COOL.ay0, COOL.ay1]]) for (const x of [COOL.x0 - 0.06, COOL.x1 + 0.06]) addSolid(rbox(0.14, y1 - y0, 2 * COOL.z, 0.02).translate(x, (y0 + y1) / 2, 0), alu, aluCut, coolG);
  const fanG = new THREE.Group(); fanG.position.set(3.55, 0.05, -0.95); scene.add(fanG);
  mesh(tubeSolid(0.66, 0.7, 0.25, 64).rotateX(Math.PI / 2).translate(0, 0, -0.2), darkM, fanG);
  const fanBlades = new THREE.Group(); fanG.add(fanBlades);
  for (let k = 0; k < 7; k++) { const b = mesh(new THREE.BoxGeometry(0.58, 0.18, 0.02).translate(0.34, 0, 0).rotateX(0.4), new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.5 }), fanBlades); b.rotation.z = (k / 7) * Math.PI * 2; }
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 24).rotateX(Math.PI / 2), darkM, fanG);
  // exhaust duct (fitted in the fix: ventilation)
  const duct = new THREE.Group(); duct.position.set(3.55, 2.18, -0.75); scene.add(duct);
  const ductM = new THREE.MeshStandardMaterial({ color: 0x9aa1a9, roughness: 0.45, metalness: 0.7 });
  mesh(tubeSolid(0.5, 0.54, 1.0, 48), ductM, duct);
  mesh(new THREE.TorusGeometry(0.54, 0.03, 8, 48).rotateX(Math.PI / 2).translate(0, 1.0, 0), ductM, duct);

  // ------------------------------------------------ aftercooler outlet → moisture separator + drain → air out
  pipe([[COOL.x1 + 0.12, AIR_PASS[2], 0], [MS.x, AIR_PASS[2], 0], [MS.x, MS.y1, 0]], 0.08);
  const msM = std(0x8a939d, 0.4, 0.7), msCut = cutOf(0x9aa3ad);
  addSolid(tubeSolid(0.12, 0.16, MS.y1 - MS.y0, 40).translate(MS.x, MS.y0, 0), msM, msCut);
  addSolid(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 40).translate(MS.x, MS.y1, 0), msM, msCut);
  addSolid(new THREE.CylinderGeometry(0.16, 0.05, 0.12, 40).translate(MS.x, MS.y0 - 0.06, 0), msM, msCut);
  pipe([[MS.x + 0.15, MS.y1 - 0.18, 0], [5.35, MS.y1 - 0.18, 0]], 0.08);
  addSolid(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 32).rotateZ(Math.PI / 2).translate(5.35, MS.y1 - 0.18, 0), steelP, steelCut);
  const drainBox = mesh(rbox(0.2, 0.18, 0.18, 0.03).translate(MS.x, MS.y0 - 0.25, 0), new THREE.MeshStandardMaterial({ color: 0x2a6fb0, roughness: 0.4, metalness: 0.3 }));
  const drainLed = mesh(new THREE.SphereGeometry(0.022, 10, 8).translate(MS.x, MS.y0 - 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x103a10, toneMapped: false }));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(MS.x, MS.y0 - 0.34, 0), new V3(MS.x, -1.4, 0.05), new V3(MS.x - 0.05, -1.95, 0.1), new V3(MS.x - 0.1, -2.12, 0.1)]), 30, 0.025, 8), M.rubber));
  mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.12, 24).translate(MS.x - 0.1, -2.14, 0.1), M.zincNoClip);

  // ------------------------------------------------ controller screen + alarm beacon
  mesh(rbox(1.6, 1.25, 0.5, 0.03).translate(-3.65, 1.05, -1.0), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.5, metalness: 0.3 }));
  const hmiCv = document.createElement('canvas'); hmiCv.width = 512; hmiCv.height = 288;
  const hmiTex = new THREE.CanvasTexture(hmiCv); hmiTex.colorSpace = THREE.SRGBColorSpace; hmiTex.anisotropy = 8;
  const hmi = mesh(new THREE.PlaneGeometry(1.05, 0.59).translate(-3.65, 1.1, -0.74), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
  const hctx = hmiCv.getContext('2d'); let hmiKey = '';
  const drawHMI = (st) => {
    const alarm = st.trip ? 'TRIP · HIGH TEMP' : st.dischargeT > 100 ? 'WARNING · TEMP' : '';
    const key = `${st.pressure.toFixed(1)}|${Math.round(st.dischargeT)}|${st.load > 0.5 ? 1 : 0}|${alarm}|${st.running}`;
    if (key === hmiKey) return; hmiKey = key;
    const c = hctx; c.fillStyle = '#081018'; c.fillRect(0, 0, 512, 288);
    c.fillStyle = alarm ? (st.trip ? '#5a0d0a' : '#4a3208') : '#0d2a1c'; c.fillRect(0, 0, 512, 44);
    c.font = `700 26px ${fontFamily}`; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillStyle = alarm ? '#ffd2c8' : '#8ff0c0'; c.fillText(alarm || (st.load > 0.5 ? 'RUNNING · LOAD' : 'RUNNING · UNLOAD'), 18, 23);
    c.fillStyle = '#7f93a3'; c.font = `500 22px ${fontFamily}`; c.fillText('NET PRESSURE', 18, 78); c.fillText('DISCHARGE TEMP', 270, 78);
    c.fillStyle = '#ffffff'; c.font = `700 70px ${fontFamily}`; c.fillText(st.running ? st.pressure.toFixed(1) : '—', 18, 140); c.fillStyle = st.dischargeT > 100 ? '#ff6a50' : '#ffffff'; c.fillText(String(Math.round(st.dischargeT)), 270, 140);
    c.font = `500 26px ${fontFamily}`; c.fillStyle = '#9fb3c3'; c.fillText('bar', 150, 150); c.fillText('°C', 400, 150);
    c.fillStyle = '#1b2a36'; c.fillRect(18, 200, 476, 18); c.fillStyle = st.load > 0.5 ? '#4fc3ff' : '#ffb35c'; c.fillRect(18, 200, 476 * (st.running ? (st.load > 0.5 ? 0.86 : 0.25) : 0), 18);
    c.fillStyle = '#7f93a3'; c.font = `500 20px ${fontFamily}`; c.fillText('MOTOR LOAD', 18, 244);
    hmiTex.needsUpdate = true;
  };
  const beaconM = new THREE.MeshBasicMaterial({ color: 0x3a0a08, toneMapped: false });
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 20).translate(-4.3, 2.22, -0.9), darkM);
  const beacon = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 20).translate(-4.3, 2.35, -0.9), beaconM);
  const beaconL = new THREE.PointLight(0xff3020, 0, 4, 1.6); beaconL.position.set(-4.3, 2.4, -0.5); scene.add(beaconL);

  // ------------------------------------------------ flows
  const R = mulberry(7);
  const addMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const segLUT = (segs, jitter, samples = 300) => {
    const pts = [], marks = []; let len = 0, last = null;
    for (const [p, tag] of segs) { marks.push([len, tag]); for (const q of p) { const v = new V3(...q).add(new V3((R() - 0.5) * jitter, (R() - 0.5) * jitter, (R() - 0.5) * jitter * 0.5)); if (last) len += v.distanceTo(last); pts.push(v); last = v; } }
    const L = buildLUT(pts, () => 1, samples); L.marks = marks.map(([l, tag]) => [l / len, tag]); return L;
  };
  const tagCol = (COLS) => (L) => (p, u, w, c) => { let tag = L.marks[0][1], nxt = null; for (let i = 0; i < L.marks.length; i++) if (u >= L.marks[i][0]) { tag = L.marks[i][1]; nxt = L.marks[i + 1]; } const a = COLS[tag]; if (nxt) { const k = smooth(nxt[0] - 0.04, nxt[0], u); const b = COLS[nxt[1]]; c.setRGB(mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)); } else c.setRGB(a[0], a[1], a[2]); };
  // intake air: over the rim under the rain cap → through the element → valve → inlet port
  const INTAKE = []; for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); INTAKE.push(buildLUT([new V3(INL.x + ca * 0.9, 1.7 + R() * 0.25, sa * 0.5), new V3(INL.x + ca * 0.45, 1.24, sa * 0.3), new V3(INL.x + ca * 0.3, 1.05, sa * 0.2), new V3(INL.x + ca * 0.25, 0.7, sa * 0.12), new V3(INL.x + ca * 0.08, 0.5, sa * 0.05), new V3(INL.x + ca * 0.05, 0.0, 0), new V3(INL.x + ca * 0.1, -0.32, 0.02), new V3(INL.x + ca * 0.06, -0.62, 0.05)], () => 1, 160)); }
  const intakeS = new Streaks(scene, { paths: INTAKE, count: 70, material: addMat, seed: 11, speed: 1.2, radius: 0.013, lenMin: 0.06, lenMax: 0.12, colorFn: (p, u, w, c) => c.setRGB(0.55, 1.0, 1.9) });
  // compressed air + oil: discharge → tank (spiral down) → into the element → lid → MPV → aftercooler passes → separator → out
  const AIRP = [];
  for (let j = 0; j < 8; j++) {
    const spiral = []; const r0 = 0.44 - R() * 0.06, turns = 1.4; for (let i = 0; i <= 24; i++) { const f = i / 24, a = Math.PI + f * turns * Math.PI * 2; spiral.push([TANK.x + Math.cos(a) * r0, -0.75 - f * 0.55, Math.sin(a) * r0]); }
    const yIn = -0.2 + R() * 0.6, aIn = R() * Math.PI;
    const passes = []; AIR_PASS.forEach((y, k) => { const xa = k % 2 === 0 ? COOL.x0 + 0.05 : COOL.x1 - 0.05, xb = k % 2 === 0 ? COOL.x1 - 0.05 : COOL.x0 + 0.05; passes.push([xa, y, -0.02], [mix(xa, xb, 0.5), y, -0.02], [xb, y, -0.02]); });
    AIRP.push(segLUT([
      [[[ROT.x0 + ROT.len - 0.05, -1.5, 0.04], [AE.x1, -1.5, -0.02], [0.45, -1.5, -0.02], [0.45, -0.75, -0.02], [TANK.x - 0.48, -0.75, 0]], 'hot'],
      [spiral, 'tank'],
      [[[TANK.x + Math.cos(aIn) * 0.38, yIn, Math.sin(aIn) * 0.38], [TANK.x + Math.cos(aIn) * 0.2, yIn + 0.05, Math.sin(aIn) * 0.2], [TANK.x, yIn + 0.15, 0], [TANK.x, 0.8, -0.02], [TANK.x, 1.1, -0.02], [TANK.x, 1.42, -0.02], [COOL.x0 - 0.1, 1.42, -0.02]], 'sep'],
      [passes, 'cool'],
      [[[COOL.x1 + 0.12, AIR_PASS[2], -0.02], [MS.x, AIR_PASS[2], -0.02], [MS.x, MS.y1 - 0.05, -0.02], [MS.x + 0.15, MS.y1 - 0.18, -0.02], [5.4, MS.y1 - 0.18, -0.02]], 'out'],
    ], 0.03));
  }
  const AIRCOL = { hot: [1.9, 0.75, 0.35], tank: [1.8, 0.8, 0.4], sep: [1.6, 0.9, 0.55], cool: [0.8, 1.1, 1.5], out: [0.5, 1.1, 1.9] };
  const airCol = tagCol(AIRCOL);
  const airS = AIRP.map((L, j) => new Streaks(scene, { paths: [L], count: 26, material: addMat, seed: 30 + j, speed: 1.5, radius: 0.015, lenMin: 0.06, lenMax: 0.12, colorFn: airCol(L) }));
  // oil mist with the air (dots), dropping out in the tank; carry-over dots continue past the element
  const MIST = [], CARRY = [];
  for (let j = 0; j < 8; j++) {
    const spiral = []; const r0 = 0.42 - R() * 0.05; for (let i = 0; i <= 18; i++) { const f = i / 18, a = Math.PI + f * 1.1 * Math.PI * 2; spiral.push([TANK.x + Math.cos(a) * r0, -0.75 - f * 0.45, Math.sin(a) * r0]); }
    const end = spiral[spiral.length - 1];
    MIST.push(buildLUT([[ROT.x0 + ROT.len - 0.05, -1.5, 0.04], [AE.x1, -1.5, 0], [0.45, -1.5, 0], [0.45, -0.75, 0], [TANK.x - 0.46, -0.75, 0], ...spiral, [end[0] * 0.9 + TANK.x * 0.1, TANK.sump + 0.02, end[2] * 0.9]].map((q) => new V3(...q)), () => 1, 200));
    CARRY.push(buildLUT([[TANK.x + 0.1, -0.2 + R() * 0.5, 0.05], [TANK.x, 0.3, 0], [TANK.x, 0.8, 0], [TANK.x, 1.42, -0.02], [COOL.x0 - 0.1, 1.42, -0.02], [COOL.x1 - 0.05, AIR_PASS[0], -0.02], [COOL.x0 + 0.05, AIR_PASS[1], -0.02], [COOL.x1 - 0.05, AIR_PASS[2], -0.02], [MS.x, AIR_PASS[2], -0.02], [MS.x + 0.02, MS.y0 + 0.05, 0]].map((q) => new V3(...q)), () => 1, 200));
  }
  let oilRGB = [1.9, 1.05, 0.25];
  const oilDot = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const mistS = new Streaks(scene, { paths: MIST, count: 70, material: oilDot, dots: 'smooth', seed: 51, speed: 1.4, radius: 0.016, colorFn: () => {} });
  mistS.colorFn = (p, u, w, c) => c.setRGB(oilRGB[0], oilRGB[1], oilRGB[2]);
  const carryS = new Streaks(scene, { paths: CARRY, count: 50, material: oilDot, dots: 'smooth', seed: 52, speed: 1.4, radius: 0.016, colorFn: (p, u, w, c) => c.setRGB(oilRGB[0], oilRGB[1], oilRGB[2]) });
  // oil circuit: sump → TV → (cooler passes | bypass) → riser → filter → injection port
  const riser = [[TV.x, 0.0, -0.01], [TV.x, 1.2, -0.01], [TV.x, 1.3, -0.3], [TV.x, 1.62, -0.3], [TV.x, 1.85, -0.01], [1.2, 1.85, -0.01], [OF.x, 1.85, -0.01], [OF.x + 0.05, 1.5, -0.03], [OF.x + 0.08, OF.y0 + 0.1, -0.05], [OF.x, OF.y0 + 0.15, -0.02], [OF.x - 0.02, 1.6, -0.02], [-0.1, 1.72, -0.01], [-0.1, 0.8, -0.01], [-0.1, -0.25, -0.01], [-0.6, -0.25, -0.01], [INJ.x, -0.25, -0.01], [INJ.x, -0.55, 0]];
  const OILC = [], OILB = [];
  for (let j = 0; j < 6; j++) {
    const s0 = [[TANK.x - 0.2 + R() * 0.4, TANK.y0 + 0.15, -0.1 + R() * 0.2], [TANK.x + 0.3, -1.85, 0], [TANK.x + TANK.r, -1.85, -0.01], [TV.x, TV.y, -0.01]];
    const passes = []; OIL_PASS.forEach((y, k) => { const xa = k % 2 === 0 ? COOL.x0 + 0.05 : COOL.x1 - 0.05, xb = k % 2 === 0 ? COOL.x1 - 0.05 : COOL.x0 + 0.05; passes.push([xa, y, -0.02], [mix(xa, xb, 0.5), y, -0.02], [xb, y, -0.02]); });
    OILC.push(segLUT([[s0, 'hot'], [[[COOL.x0, TV.y, -0.01], [COOL.x0, COOL.oy0 + 0.1, -0.01], ...passes], 'cooler'], [[[TV.x + 0.05, OIL_PASS[3], -0.01], ...riser], 'cool']], 0.02));
    OILB.push(segLUT([[s0, 'hot'], [[[TV.x, TV.y + 0.2, -0.01], [TV.x, -0.6, -0.01], ...riser], 'byp']], 0.02));
  }
  const oilFactor = { hot: [1.0, 0.85, 0.75], cooler: [0.95, 0.95, 0.9], cool: [0.85, 1.0, 1.0], byp: [1.0, 0.85, 0.75] };
  const oilCol = (L) => (p, u, w, c) => { let tag = L.marks[0][1]; for (let i = 0; i < L.marks.length; i++) if (u >= L.marks[i][0]) tag = L.marks[i][1]; const f = oilFactor[tag]; c.setRGB(oilRGB[0] * f[0], oilRGB[1] * f[1], oilRGB[2] * f[2]); };
  const oilCS = OILC.map((L, j) => new Streaks(scene, { paths: [L], count: 22, material: addMat, seed: 60 + j, speed: 1.1, radius: 0.012, lenMin: 0.05, lenMax: 0.1, colorFn: oilCol(L) }));
  const oilBS = OILB.map((L, j) => new Streaks(scene, { paths: [L], count: 22, material: addMat, seed: 70 + j, speed: 1.1, radius: 0.012, lenMin: 0.05, lenMax: 0.1, colorFn: oilCol(L) }));
  // cooling air through the cooler into the fan, then up and out of the roof
  const CA = []; for (let j = 0; j < 24; j++) { const x = COOL.x0 + 0.1 + R() * (COOL.x1 - COOL.x0 - 0.2), y = COOL.oy0 + 0.1 + R() * (COOL.ay1 - COOL.oy0 - 0.2); CA.push(buildLUT([new V3(x + (R() - 0.5) * 0.3, y, 1.9), new V3(x, y, 0.65), new V3(x, y, -0.6), new V3(mix(x, 3.55, 0.6), mix(y, 0.05, 0.6), -0.95), new V3(3.55 + (x - 3.55) * 0.4, mix(y, 1.4, 0.7), -1.05), new V3(3.55 + (x - 3.55) * 0.5, 2.3, -0.85), new V3(3.55 + (x - 3.55) * 0.6 + (R() - 0.5) * 0.4, 3.3, -0.8)], () => 1, 140)); }
  const coolAir = new Streaks(scene, { paths: CA, count: 120, material: addMat, seed: 81, speed: 1.4, radius: 0.009, lenMin: 0.08, lenMax: 0.16, colorFn: (p, u, w, c) => { const k = smooth(0.3, 0.6, u); c.setRGB(mix(0.5, 0.95, k), mix(0.62, 0.72, k), mix(0.8, 0.55, k)); } });
  // pockets travelling along the front cusp of the rotor pair (shrinking, heating)
  const NP = 5;
  const pocketMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
  const makePockets = (n) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), pocketMat, n); m.frustumCulled = false; m.renderOrder = 7; m.setColorAt(0, new THREE.Color(1, 1, 1)); scene.add(m); return m; };
  const pockets = makePockets(NP);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
  const placePockets = (im, n, ph, vis, o, sc, zc) => {
    for (let i = 0; i < n; i++) {
      const u = (ph + i / n) % 1;
      const a = smooth(0, 0.06, u) * (1 - smooth(0.9, 1, u)) * vis;
      _p.set(o.x + mix(0.12, ROT.len - 0.08, u) * sc, o.y + (ROT.ym + ROT.yf) / 2 * sc, o.z + zc * sc);
      const r = mix(0.11, 0.04, smooth(0, 1, u)) * sc * (0.3 + 0.7 * a);
      _s.set(r * 1.6, r, r); _q.identity(); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
      _c.setRGB(mix(0.12, 1.5, smooth(0.1, 0.95, u)), mix(0.55, 0.32, smooth(0.1, 0.95, u)), mix(1.5, 0.06, smooth(0.1, 0.95, u))).multiplyScalar(a);
      im.setColorAt(i, _c);
    }
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  };
  // oil injection spray, condensate droplets, drain water, cooler cleaning spray, leak puffs
  const inject = new Puffs(scene, { count: 40, color: 0xffb030, opacity: 0, size: 0.16, additive: true });
  const condensate = new Streaks(scene, { paths: [buildLUT([new V3(MS.x - 0.06, MS.y1 - 0.1, 0.05), new V3(MS.x - 0.1, MS.y0 + 0.3, 0.06), new V3(MS.x, MS.y0 - 0.05, 0.05), new V3(MS.x, MS.y0 - 0.32, 0.05)], () => 1, 60), buildLUT([new V3(MS.x + 0.08, MS.y1 - 0.12, 0.04), new V3(MS.x + 0.1, MS.y0 + 0.25, 0.05), new V3(MS.x, MS.y0 - 0.05, 0.05), new V3(MS.x, MS.y0 - 0.32, 0.05)], () => 1, 60)], count: 18, material: addMat, dots: 'smooth', seed: 91, speed: 0.5, radius: 0.016, colorFn: (p, u, w, c) => c.setRGB(0.4, 0.9, 1.9) });
  const drainS = new Streaks(scene, { paths: [buildLUT([new V3(MS.x, MS.y0 - 0.36, 0.03), new V3(MS.x, -1.4, 0.08), new V3(MS.x - 0.05, -1.95, 0.12), new V3(MS.x - 0.1, -2.15, 0.12)], () => 1, 80)], count: 24, material: addMat, dots: 'smooth', seed: 92, speed: 1.6, radius: 0.02, colorFn: () => {} });
  let drainOil = 0;
  drainS.colorFn = (p, u, w, c) => c.setRGB(mix(0.4, 1.6, drainOil), mix(0.9, 0.9, drainOil), mix(1.9, 0.3, drainOil));
  const spray = new Puffs(scene, { count: 70, color: 0xdff4ff, opacity: 0, size: 0.3 });
  const heatHaze = new Puffs(scene, { count: 30, color: 0xff7040, opacity: 0, size: 0.4, additive: true });
  const glint = new THREE.PointLight(0xffffff, 0, 3, 1.6); scene.add(glint);
  const fluff = new Puffs(scene, { count: 110, color: 0x6a5236, opacity: 0, size: 0.32 });

  // ------------------------------------------------ rig 1: rotor pair at 2.2× (ghost housing, ports, pockets, oil spray)
  const RS = 2.2, RO = RIG.rotors.clone().add(new V3(-ROT.x0 * RS - ROT.len * RS / 2, -(ROT.ym + ROT.yf) / 2 * RS, 0));
  const rigMale = mesh(maleGeo(RS), maleM); rigMale.position.set(RO.x + ROT.x0 * RS, RO.y + ROT.ym * RS, 0);
  const rigFemale = mesh(femaleGeo(RS), femaleM); rigFemale.position.set(RO.x + ROT.x0 * RS, RO.y + ROT.yf * RS, 0);
  const ghostM = new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.BackSide });
  for (const [y, r] of [[ROT.ym, ROT.rmOut + 0.02], [ROT.yf, ROT.rfOut + 0.02]]) mesh(cylBetween([RO.x + (ROT.x0 - 0.04) * RS, RO.y + y * RS, 0], [RO.x + (ROT.x0 + ROT.len + 0.04) * RS, RO.y + y * RS, 0], r * RS, 64), ghostM);
  for (const [y, r] of [[ROT.ym, 0.07], [ROT.yf, 0.07]]) mesh(new THREE.CylinderGeometry(r * RS, r * RS, (ROT.len + 0.5) * RS, 16).rotateZ(Math.PI / 2).translate(RO.x + (ROT.x0 + ROT.len / 2) * RS, RO.y + y * RS, 0), M.zincNoClip);
  const portM = new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const portM2 = new THREE.MeshBasicMaterial({ color: 0xff7a40, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(0.17 * RS, 0.17 * RS, 0.8, 32, 1, true).translate(RO.x + INL.x * RS, RO.y + (ROT.ym + 0.32) * RS + 0.4, 0), portM);
  mesh(new THREE.CylinderGeometry(0.13 * RS, 0.13 * RS, 0.8, 32, 1, true).rotateZ(Math.PI / 2).translate(RO.x + (ROT.x0 + ROT.len) * RS + 0.4, RO.y - 1.5 * RS, 0), portM2);
  const rigPockets = makePockets(NP);
  const RIA = []; for (let j = 0; j < 8; j++) { const ox = (R() - 0.5) * 0.5, oz = (R() - 0.5) * 0.4; RIA.push(buildLUT([new V3(RO.x + INL.x * RS + ox, RO.y + 2.6, oz), new V3(RO.x + INL.x * RS + ox * 0.6, RO.y + (ROT.ym + 0.32) * RS + 0.1, oz * 0.6), new V3(RO.x + INL.x * RS + ox * 0.4, RO.y + (ROT.ym + 0.15) * RS, 0.55 + oz * 0.3)], () => 1, 60)); }
  const rigIntake = new Streaks(scene, { paths: RIA, count: 50, material: addMat, seed: 101, speed: 1.4, radius: 0.025, lenMin: 0.1, lenMax: 0.2, colorFn: (p, u, w, c) => c.setRGB(0.55, 1.0, 1.9) });
  const RDA = []; for (let j = 0; j < 8; j++) { const oy = (R() - 0.5) * 0.4, oz = (R() - 0.5) * 0.3; RDA.push(buildLUT([new V3(RO.x + (ROT.x0 + ROT.len - 0.1) * RS, RO.y - 1.5 * RS + oy * 0.5, 0.5 + oz), new V3(RO.x + (ROT.x0 + ROT.len) * RS + 0.3, RO.y - 1.5 * RS + oy * 0.4, oz * 0.5), new V3(RO.x + (ROT.x0 + ROT.len) * RS + 1.8, RO.y - 1.5 * RS + oy, oz)], () => 1, 60)); }
  const rigDisch = new Streaks(scene, { paths: RDA, count: 50, material: addMat, seed: 102, speed: 1.6, radius: 0.025, lenMin: 0.1, lenMax: 0.2, colorFn: (p, u, w, c) => c.setRGB(1.9, 0.6, 0.25) });
  const rigInject = new Puffs(scene, { count: 90, color: 0xffa020, opacity: 0, size: 0.9, additive: true });
  const RDR = []; for (let j = 0; j < 6; j++) { const ox = (R() - 0.5) * 1.4; RDR.push(buildLUT([new V3(RO.x + INJ.x * RS, RO.y + (ROT.ym + 0.38) * RS, 0.35), new V3(RO.x + INJ.x * RS + ox * 0.5, RO.y + (ROT.ym + 0.1) * RS, 0.55), new V3(RO.x + INJ.x * RS + ox, RO.y + ((ROT.ym + ROT.yf) / 2) * RS, 0.75)], () => 1, 40)); }
  const rigDrops = new Streaks(scene, { paths: RDR, count: 60, material: addMat, dots: 'smooth', seed: 103, speed: 1.2, radius: 0.035, colorFn: (p, u, w, c) => c.setRGB(1.9, 1.0, 0.2) });
  const rigNozzle = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 16).translate(RO.x + INJ.x * RS, RO.y + (ROT.ym + 0.38) * RS + 0.25, 0.35), std(0xb08a4a, 0.3, 1.0, { clippingPlanes: [] }));

  // ------------------------------------------------ rig 2: plant air network with leaks + ultrasonic detector
  const NO = RIG.net;
  const brassNC = M.brass.clone(); brassNC.clippingPlanes = [];
  const netM = new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.35, metalness: 0.55 });
  const netPipe = (pts, r = 0.09) => mesh(pipeSolid(pts.map((q) => q.map((v, i) => v + NO.getComponent(i))), r * 0.75, r, 0.1, 20), netM);
  netPipe([[-4.8, 1.6, 0], [4.8, 1.6, 0]], 0.12);
  for (const x of [-3, 0, 3]) {
    netPipe([[x, 1.6, 0], [x, 1.95, 0], [x + 0.35, 1.95, 0], [x + 0.35, -0.6, 0]], 0.06);
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 20).translate(NO.x + x + 0.35, NO.y + 0.4, NO.z), brassNC);
    mesh(rbox(0.3, 0.5, 0.25, 0.04).translate(NO.x + x + 0.35, NO.y - 0.2, NO.z), new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.5, metalness: 0.3 }));
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 20).translate(NO.x + x + 0.35, NO.y - 0.6, NO.z), M.zincNoClip);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(x + 0.35, -0.75, 0), new V3(x + 0.3, -1.5, 0.3), new V3(x - 0.2, -1.9, 0.5), new V3(x - 0.9, -1.7, 0.4)].map((v) => v.add(NO))), 40, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.5 })));
  }
  mesh(new THREE.SphereGeometry(0.13, 16, 12).translate(NO.x + 0.0, NO.y + 1.6, NO.z), brassNC);
  const NETAIR = []; for (let j = 0; j < 6; j++) NETAIR.push(buildLUT([new V3(-4.8, 1.6, 0), new V3(4.8, 1.6, 0)].map((v) => v.add(NO).add(new V3(0, (R() - 0.5) * 0.08, (R() - 0.5) * 0.08))), () => 1, 80));
  const netAir = new Streaks(scene, { paths: NETAIR, count: 60, material: addMat, seed: 111, speed: 1.6, radius: 0.02, lenMin: 0.1, lenMax: 0.2, colorFn: (p, u, w, c) => c.setRGB(0.5, 1.0, 1.9) });
  const LEAKS = [NO.clone().add(new V3(-3 + 0.35, -0.72, 0.05)), NO.clone().add(new V3(0.0, 1.6, 0.12)), NO.clone().add(new V3(3 + 0.1, -1.72, 0.45))];
  const leakPuffs = new Puffs(scene, { count: 120, color: 0xeaf4ff, opacity: 0, size: 0.6 });
  const det = new THREE.Group(); scene.add(det);
  mesh(rbox(0.18, 0.32, 0.12, 0.03).translate(0, -0.16, 0), new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.5 }), det);
  mesh(rbox(0.5, 0.16, 0.14, 0.04).translate(0.12, 0.04, 0), new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.5 }), det);
  mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.34, 24).rotateZ(Math.PI / 2).translate(-0.3, 0.04, 0), darkM, det);
  const detLed = mesh(new THREE.BoxGeometry(0.14, 0.07, 0.01).translate(0.18, 0.06, 0.075), new THREE.MeshBasicMaterial({ color: 0x103a10, toneMapped: false }), det);
  const tag = mesh(new THREE.BoxGeometry(0.22, 0.3, 0.01).translate(0, -0.2, 0), new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.6 })); tag.position.copy(LEAKS[0]).add(new V3(0.18, -0.05, 0.12)); tag.rotation.z = 0.2;
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 30, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: RIG.rotors, pos: RIG.rotors.clone().add(new V3(2, 6, 7)) }, { c: RIG.net, pos: RIG.net.clone().add(new V3(-2, 6, 8)) }];

  // ------------------------------------------------ clocks (integrated rates: smooth stops, never backwards)
  const spin = (q, x) => (1 - smooth(118.75, 119.25, x) * (x < 119.45 ? 1 : 0));
  const rotClock = makeClock((x) => 6.0 * spin(stateAt(x), x), 197, 0.01);
  const flowClock = makeClock((x) => { const q = stateAt(x); return spin(q, x) * (0.25 + 0.75 * q.load) * (1 - 0.3 * q.filterDirt); }, 197, 0.02);
  const fanClock = makeClock((x) => 7 * spin(stateAt(x), x), 197, 0.02);
  const coolClock = makeClock((x) => { const q = stateAt(x); return spin(q, x) * (1 - 0.5 * q.coolerDirt) * (1 - 0.6 * q.spray); }, 197, 0.02);

  // ------------------------------------------------ update
  const amber = [1.9, 1.05, 0.25], aged = [1.0, 0.45, 0.1], milkyC = [1.7, 1.5, 1.15], burntC = [0.8, 0.28, 0.06];
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 2.0, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    skin.visible = cut < 0.999;
    const sp = spin(st, t), ang = rotClock(t), fl = flowClock(t);
    // rotors: female turns at 4/6 of the male speed, opposite direction
    male.rotation.x = -ang; female.rotation.x = ang * 4 / 6;
    rigMale.rotation.x = -ang * 0.5; rigFemale.rotation.x = ang * 0.5 * 4 / 6;
    motorRotG.rotation.x = -ang; coupG.rotation.x = -ang;
    fanBlades.rotation.z = fanClock(t);
    // compression heat in the grooves, oil film, varnish
    RU.uHeat.value = (0.25 + 0.75 * st.load) * sp; RU.uDry.value = st.dry; RU.uOil.value = (0.5 + 0.5 * smooth(51.2, 52.4, t)) * (1 - st.dry); RU.uVarnish.value = st.oilAge;
    // oil colour: fresh amber → aged/varnished, milky (water), burnt
    for (let k = 0; k < 3; k++) { let v = mix(amber[k], aged[k], st.oilAge); v = mix(v, milkyC[k], st.milky); v = mix(v, burntC[k], st.burnt); oilRGB[k] = v; }
    sumpM.color.setRGB(oilRGB[0] / 2.2, oilRGB[1] / 2.2, oilRGB[2] / 2.2); sumpM.emissive.setRGB(oilRGB[0] * 0.08, oilRGB[1] * 0.05, oilRGB[2] * 0.02);
    sump.scale.y = (TANK.sump - TANK.y0 - 0.06) * (1 - 0.85 * st.oilChange);
    // inlet valve poppet (open when loaded), TV spool
    poppet.position.y = -0.36 + 0.1 * (1 - st.load) - 0.0;
    tvSpool.position.x = TV.x + mix(-0.06, 0.06, st.toCooler);
    // filters / separator: dirt and maintenance swaps
    dirtU.intake.value = st.filterDirt; dirtU.sep.value = 0.15 + 0.85 * st.sepDirt; dirtU.oilf.value = 0.3 * st.oilAge * (t < 166.5 ? 1 : 0);
    intakeEl.position.set(0.9 * smooth(0.5, 1, st.swapIntake), 1.3 * smooth(0, 0.5, st.swapIntake), 0);
    oilFilterG.position.set(0.6 * smooth(0.5, 1, st.swapOilFilter), -0.8 * smooth(0, 0.5, st.swapOilFilter), 0.4 * st.swapOilFilter);
    sepG.position.set(0, 1.7 * st.swapSep, 0);
    finU.uDirt.value = st.coolerDirt;
    duct.visible = t > 175.4; duct.scale.y = Math.max(0.001, smooth(175.4, 176.4, t));
    // heat: discharge line / tank glow as the temperature climbs; beacon on trip
    const glow = smooth(92, 110, st.dischargeT);
    hotM.emissiveIntensity = 0.5 * glow; tankM.emissiveIntensity = 0.12 * glow; oilP.emissiveIntensity = 0.25 * smooth(95, 110, st.oilT + 20);
    beaconM.color.setHex(st.trip ? (Math.sin(t * 14) > 0 ? 0xff2a1a : 0x6a1008) : 0x3a0a08); beaconL.intensity = st.trip ? 3 * (0.5 + 0.5 * Math.sin(t * 14)) : 0;
    drawHMI(st);
    drainLed.material.color.setHex(st.drain ? 0x30ff60 : 0x103a10);
    // flows
    const vis = sp;
    intakeS.update({ tau: fl, vis: vis * (0.15 + 0.85 * st.load) * (1 - 0.4 * st.filterDirt), camPos: cam });
    airS.forEach((s) => s.update({ tau: fl, vis: vis * (0.3 + 0.7 * st.load), camPos: cam }));
    mistS.update({ tau: fl, vis: vis * 0.8, camPos: cam });
    carryS.update({ tau: fl, vis: vis * st.carry, camPos: cam });
    oilCS.forEach((s) => s.update({ tau: fl, vis: vis * st.toCooler, camPos: cam }));
    oilBS.forEach((s) => s.update({ tau: fl, vis: vis * (1 - st.toCooler), camPos: cam }));
    coolAir.update({ tau: coolClock(t), vis: (0.25 + 0.75 * sp) * (1 - 0.5 * st.coolerDirt), camPos: cam });
    placePockets(pockets, NP, (ang / (Math.PI * 2)) * 1.2 % 1, sp * (0.25 + 0.75 * st.load), new V3(ROT.x0, 0, 0), 1, 0.33);
    condensate.update({ tau: t, vis: sp * 0.6, camPos: cam });
    drainOil = st.carry > 0.5 && t > 150 ? 1 : 0;
    drainS.update({ tau: t, vis: st.drain, camPos: cam });
    inject.mat.uniforms.uOpacity.value = 0.55 * sp * (0.5 + 0.5 * smooth(51.2, 52.4, t)) * (1 - st.dry);
    inject.update((i, s, o) => { const age = (t * 2.2 + s[0]) % 1; o.p.set(INJ.x + (s[1] - 0.5) * 0.5 * age, AE.y1 - 0.1 - age * 0.32, 0.05 + s[2] * 0.25 * age); o.size = 0.05 + age * 0.12; o.alpha = smooth(0, 0.1, age) * (1 - age); });
    spray.mat.uniforms.uOpacity.value = 0.5 * st.spray;
    spray.update((i, s, o) => { const age = (t * 1.8 + s[0]) % 1, x = mix(COOL.x0, COOL.x1, smooth(174.4, 177.2, t)) + (s[1] - 0.5) * 0.5; o.p.set(x + 0.2 * age, mix(COOL.oy0, COOL.ay1, s[2]) - 0.2 * age, 1.6 - age * 1.1); o.size = 0.1 + age * 0.3; o.alpha = smooth(0, 0.15, age) * (1 - age); });
    fluff.mat.uniforms.uOpacity.value = 0.85 * st.coolerDirt;
    fluff.update((i, s, o) => { o.p.set(mix(COOL.x0, COOL.x1, s[0]), mix(COOL.oy0, COOL.ay1, s[1]), 0.03 + s[2] * 0.08); o.size = 0.45 + s[3] * 0.5; o.alpha = 0.5 + 0.5 * s[4]; });
    heatHaze.mat.uniforms.uOpacity.value = 0.25 * glow;
    heatHaze.update((i, s, o) => { const age = (t * 0.5 + s[0]) % 1; o.p.set(mix(-0.4, 1.6, s[1]), mix(-1.3, 1.4, s[2]) + age * 0.6, 0.2 + s[3] * 0.4); o.size = 0.2 + age * 0.4; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    glint.intensity = st.glint ? 5 : 0; glint.position.set(-2.53, ROT.ym + 0.35, 0.6);
    // rig 1
    const nearR = cam && cam.distanceTo(RIG.rotors) < 18, nearN = cam && cam.distanceTo(RIG.net) < 20;
    placePockets(rigPockets, NP, ((ang * 0.5) / (Math.PI * 2)) * 1.2 % 1, nearR ? sp * (0.25 + 0.75 * st.load) : 0, new V3(RO.x + ROT.x0 * RS, RO.y, 0), RS, 0.33);
    rigIntake.update({ tau: fl * 0.6, vis: nearR ? 0.9 * st.load : 0, camPos: null });
    rigDisch.update({ tau: fl * 0.6, vis: nearR ? 0.9 * st.load : 0, camPos: null });
    rigInject.mat.uniforms.uOpacity.value = nearR ? 0.85 * smooth(51.0, 52.2, t) * (1 - st.dry) : 0;
    rigInject.update((i, s, o) => { const age = (t * 1.6 + s[0]) % 1; o.p.set(RO.x + INJ.x * RS + (s[1] - 0.5) * 1.6 * age, RO.y + (ROT.ym + 0.3) * RS - age * 0.9, 0.3 + s[2] * 0.6 * age); o.size = 0.15 + age * 0.35; o.alpha = smooth(0, 0.1, age) * (1 - age); });
    rigNozzle.visible = nearR;
    rigDrops.update({ tau: t, vis: nearR ? smooth(51.0, 52.2, t) * (1 - st.dry) : 0, camPos: null });
    // rig 2
    netAir.update({ tau: t, vis: nearN ? 1 : 0, camPos: null });
    leakPuffs.mat.uniforms.uOpacity.value = nearN ? 0.55 : 0;
    leakPuffs.update((i, s, o) => { const k = i % 3, L = LEAKS[k]; const on = st.leaks * (k === 0 ? 1 - st.leakFixed : 1); const age = (t * 1.3 + s[0]) % 1; o.p.set(L.x + (s[1] - 0.5) * 0.15 + age * 0.5 * (k === 1 ? 0 : 1), L.y + age * 0.35 * (k === 1 ? 1 : 0.4), L.z + age * 0.4); o.size = 0.06 + age * 0.3; o.alpha = on * smooth(0, 0.1, age) * (1 - age); });
    det.visible = st.detector > 0.01 && nearN; { const k = smooth(185.4, 186.6, t); det.position.copy(LEAKS[0]).add(new V3(mix(1.4, 0.55, k), mix(0.9, 0.35, k), 0.6)); det.rotation.z = -0.3; detLed.material.color.setHex(k > 0.9 ? (t < 187.0 ? (Math.sin(t * 30) > 0 ? 0xff3020 : 0x401010) : 0x30ff60) : 0x20a040); }
    tag.visible = t > 186.6 && t < 190.6;
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 20);
    rigL.visible = !!rs; rigL.intensity = rs ? 140 : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    motor: new V3(-3.6, ROT.ym + 0.45, 0.3), coupling: new V3(-2.53, ROT.ym + 0.2, 0.15), airEnd: new V3(-0.9, -0.55, 0.3), male: new V3(-1.6, ROT.ym + 0.25, 0.2), female: new V3(-1.1, ROT.yf - 0.3, 0.25),
    inletValve: new V3(INL.x + 0.2, -0.2, 0.1), intakeFilter: new V3(INL.x + 0.3, 0.9, 0.1), inletPort: new V3(INL.x, -0.62, 0.2), injection: new V3(INJ.x, -0.55, 0.15), discharge: new V3(0.45, -1.2, 0.1), mesh: new V3(-1.45, (ROT.ym + ROT.yf) / 2, 0.3),
    tank: new V3(TANK.x + 0.4, -1.0, 0.2), element: new V3(TANK.x + 0.25, 0.25, 0.05), sump: new V3(TANK.x + 0.2, -1.75, 0.1), mpv: new V3(TANK.x + 0.12, 1.05, 0.12), lid: new V3(TANK.x, 0.82, 0.2),
    thermoValve: new V3(TV.x, TV.y + 0.1, 0.15), oilCooler: new V3(3.5, -0.75, 0.05), afterCooler: new V3(3.5, 0.9, 0.05), fan: new V3(3.1, 0.6, -0.9), oilFilter: new V3(OF.x + 0.15, 1.25, 0.12), riser: new V3(TV.x, 0.4, 0.05),
    moistSep: new V3(MS.x + 0.15, -0.25, 0.1), drain: new V3(MS.x, MS.y0 - 0.25, 0.1), airOut: new V3(5.3, MS.y1 - 0.18, 0.1), hmi: new V3(-3.65, 1.1, -0.72), beacon: new V3(-4.3, 2.4, -0.9), duct: new V3(3.55, 2.9, -0.5), heatOut: new V3(3.55, 2.6, -0.8),
    rigMale: new V3(RO.x + (ROT.x0 + 0.5) * RS, RO.y + (ROT.ym + 0.28) * RS, 0.3), rigFemale: new V3(RO.x + (ROT.x0 + 0.9) * RS, RO.y + (ROT.yf - 0.33) * RS, 0.4), rigInlet: new V3(RO.x + INL.x * RS, RO.y + (ROT.ym + 0.32) * RS + 0.3, 0), rigOutlet: new V3(RO.x + (ROT.x0 + ROT.len) * RS + 0.5, RO.y - 1.5 * RS, 0),
    rigPocketIn: new V3(RO.x + (ROT.x0 + 0.25) * RS, RO.y + (ROT.ym + ROT.yf) / 2 * RS, 0.3 * RS), rigPocketOut: new V3(RO.x + (ROT.x0 + ROT.len - 0.2) * RS, RO.y + (ROT.ym + ROT.yf) / 2 * RS, 0.3 * RS), rigOil: new V3(RO.x + INJ.x * RS, RO.y + (ROT.ym + 0.3) * RS, 0.4),
    pocketIn: new V3(ROT.x0 + 0.15, (ROT.ym + ROT.yf) / 2, 0.36), pocketOut: new V3(ROT.x0 + ROT.len - 0.15, (ROT.ym + ROT.yf) / 2, 0.36), swirl: new V3(TANK.x - 0.35, -0.95, 0.25),
    rigMesh: new V3(RO.x + (ROT.x0 + 0.75) * RS, RO.y + (ROT.ym + ROT.yf) / 2 * RS, 0.33 * RS), rigBearing: new V3(RO.x + (ROT.x0 + ROT.len + 0.2) * RS, RO.y + ROT.ym * RS, 0.1),
    netLeak1: LEAKS[0].clone(), netLeak2: LEAKS[1].clone(), netLeak3: LEAKS[2].clone(), netHeader: NO.clone().add(new V3(-1.6, 1.6, 0.1)), detector: LEAKS[0].clone().add(new V3(0.55, 0.35, 0.6)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
