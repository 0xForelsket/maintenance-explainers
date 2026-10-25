// Desiccant resin dryer: drying hopper on the machine throat, dryer cabinet with twin desiccant towers,
// plus macro rigs for wet pellets and the defects wet resin causes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, worldPosVertex } from 'series/look';
import { stateAt, LEVEL_FULL } from './story.js';

export const RIG = { pel: new V3(40, 0, 0), part: new V3(60, 0, 0) };
const HOP = { r: 1.1, y0: 1.0, y1: 4.2, throat: 0.22, iy: 1.75 };
const DRY = { x0: -6.4, x1: -3.2, y0: -2.6, y1: 1.5, z: 0.9 };
const TWR = { A: -5.55, B: -4.75, r: 0.3, y0: -1.4, y1: 0.6 };
const XF = -3.8;   // return column: filter, cooler, blower

// granular bed: procedural pellets/beads on cut faces (xy) or top faces (xz), tinted by moisture
function bedMat({ clip, cell = 9, base = 0xe6dcc4, wet = 0x3f86d8, side = THREE.BackSide, plane = 'xy', lit = false }) {
  const U = { uCell: { value: cell }, uScroll: { value: 0 }, uWet: { value: 0.5 }, uWetAdd: { value: 0 }, uY0: { value: 0 }, uY1: { value: 4 }, uFlip: { value: 0 }, uGlow: { value: 0 },
    uFreshY: { value: 99 }, uOld: { value: 0 }, uBase: { value: new THREE.Color(base) }, uWetCol: { value: new THREE.Color(wet) } };
  const m = lit ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side, clippingPlanes: clip }) : new THREE.MeshBasicMaterial({ color: 0xffffff, side, clippingPlanes: clip });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    worldPosVertex(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform float uCell, uScroll, uWet, uWetAdd, uY0, uY1, uFlip, uGlow, uFreshY, uOld; uniform vec3 uBase, uWetCol;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 gp = ${plane === 'xy' ? 'vWPos.xy' : 'vWPos.xz'} * uCell + vec2(0.0, uScroll);
      vec2 id = floor(gp); vec2 f = fract(gp) - 0.5;
      float h = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
      vec2 jit = vec2(fract(h * 13.1), fract(h * 7.7)) - 0.5;
      float d = length(f - jit * 0.16);
      float pel = smoothstep(0.45, 0.37, d);
      float shade = 0.5 + 0.5 * (1.0 - d * 1.7) + 0.08 * (h - 0.5);
      float g = smoothstep(uY0, uY1, vWPos.y); g = mix(g, 1.0 - g, uFlip);
      float fresh = step(uFreshY, vWPos.y);
      float m = clamp(uWet * g + uWetAdd, 0.0, 1.0) * (1.0 - fresh);
      vec3 bc = mix(uBase, vec3(0.62, 0.52, 0.36), uOld * (1.0 - fresh));
      vec3 pc = mix(bc, uWetCol, m * 0.85) * shade;
      pc = mix(pc, vec3(1.0, 0.40, 0.08) * (0.7 + 0.8 * shade), uGlow * 0.85 * (1.0 - fresh));
      pc = mix(pc, vec3(0.97, 0.96, 0.92) * (0.75 + 0.35 * shade), fresh);
      diffuseColor.rgb = mix(vec3(0.035, 0.03, 0.03), pc, pel);`);
  };
  m.customProgramCacheKey = () => `bed${cell}${plane}${lit}${side}`;
  m.U = U;
  return m;
}

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.024, floorY: -2.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-4, 11, 12); ST.lights.key.target.position.set(-2.4, 1.0, 0); ST.lights.key.intensity = 560; ST.lights.key.angle = 0.75;
  const stainless = castSurface(new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: 0.28, metalness: 0.9, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.02, mottle: 0.08, key: 'ss' });
  const cutSS = M.cutSteel;
  const wool = M.cut.clone(); wool.clippingPlanes = clip; wool.color.set(0xd9b35a); wool.onBeforeCompile = M.cut.onBeforeCompile;
  const pp = (pts, r = 0.09, bend = 0.1) => addSolid(pipeSolid(pts, r, r + 0.035, bend, 24), M.pipe, M.cutDark);

  // ------------------------------------------------ machine: base, barrel stub, feed throat
  const base = new THREE.Mesh(rbox(7.6, 1.05, 3.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x2f4c6a, roughness: 0.5, metalness: 0.3 })); base.position.set(2.2, -2.08, -0.4); base.receiveShadow = shadows; scene.add(base);
  addSolid(cylBetween([-1.2, -1.0, 0], [5.2, -1.0, 0], 0.55, 48), M.steel, M.cutSteel);
  addSolid(csg(rbox(1.4, 0.7, 1.4, 0.06).translate(0, -0.3, 0), [['sub', cylBetween([0, -0.8, 0], [0, 0.2, 0], HOP.throat, 32)]]), M.machined, M.cutDark);
  // ------------------------------------------------ drying hopper: cone + insulated cylinder, lid, outlet, inlet tube + diffuser cone
  addSolid(csg(new THREE.CylinderGeometry(HOP.r + 0.04, HOP.throat + 0.04, 1.0, 72).translate(0, 0.5, 0), [['sub', new THREE.CylinderGeometry(HOP.r, HOP.throat, 1.02, 72).translate(0, 0.5, 0)]]), stainless, cutSS);
  addSolid(tubeSolid(HOP.r, HOP.r + 0.04, HOP.y1 - HOP.y0, 72).translate(0, HOP.y0, 0), stainless, cutSS);
  addSolid(tubeSolid(HOP.r + 0.04, HOP.r + 0.2, HOP.y1 - HOP.y0 - 0.1, 72).translate(0, HOP.y0 + 0.05, 0), new THREE.MeshStandardMaterial({ color: 0xd9b35a, roughness: 0.9, clippingPlanes: clip }), wool);
  addSolid(tubeSolid(HOP.r + 0.2, HOP.r + 0.24, HOP.y1 - HOP.y0, 72).translate(0, HOP.y0, 0), stainless, cutSS);
  addSolid(csg(new THREE.CylinderGeometry(HOP.r + 0.3, HOP.r + 0.3, 0.14, 72).translate(0, HOP.y1 + 0.07, 0), [['sub', cylBetween([0, HOP.y1 - 0.1, 0], [0, HOP.y1 + 0.3, 0], 0.17, 32)]]), stainless, cutSS);
  addSolid(pipeSolid([[0, HOP.y1 + 0.1, 0], [0, 4.85, 0], [-0.6, 4.85, 0]], 0.17, 0.22, 0.25, 32), stainless, cutSS);
  addSolid(pipeSolid([[-HOP.r - 0.65, HOP.iy, 0], [0, HOP.iy, 0], [0, 1.36, 0]], 0.13, 0.17, 0.18, 32), stainless, cutSS);
  addSolid(csg(new THREE.ConeGeometry(0.62, 0.44, 56).translate(0, 1.2, 0), [['sub', new THREE.ConeGeometry(0.57, 0.44, 56).translate(0, 1.15, 0)], ['sub', cylBetween([0, 1.2, 0], [0, 1.6, 0], 0.13, 32)]]), stainless, cutSS);
  const lvl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16).rotateZ(Math.PI / 2), M.zinc); lvl.position.set(HOP.r + 0.3, 3.55, -0.25); scene.add(lvl);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x6ff0b0, toneMapped: false }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), ledMat); led.position.set(HOP.r + 0.57, 3.55, -0.25); scene.add(led);
  // pellet bed (cone + scaled cylinder) with a lit top surface
  const bedCap = bedMat({ clip, cell: 9 }), bedTop = bedMat({ clip, cell: 9, side: THREE.FrontSide, plane: 'xz', lit: true });
  const bedCone = new THREE.Mesh(new THREE.CylinderGeometry(HOP.r - 0.02, HOP.throat - 0.01, HOP.y0 - 0.02, 64).translate(0, (HOP.y0 + 0.02) / 2, 0), bedCap);
  bedCone.renderOrder = -1; scene.add(bedCone); ST.cutMeshes.push(bedCone);
  const bedCyl = new THREE.Group(); bedCyl.position.y = HOP.y0; scene.add(bedCyl);
  const bedCylM = new THREE.Mesh(new THREE.CylinderGeometry(HOP.r - 0.02, HOP.r - 0.02, 1, 72).translate(0, 0.5, 0), bedCap); bedCylM.renderOrder = -1; bedCyl.add(bedCylM); ST.cutMeshes.push(bedCylM);
  const bedSurf = new THREE.Mesh(new THREE.CircleGeometry(HOP.r - 0.03, 72).rotateX(-Math.PI / 2), bedTop); scene.add(bedSurf);

  // ------------------------------------------------ dryer cabinet
  const cabPaint = castSurface(new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.45, metalness: 0.2, clippingPlanes: clip, clipShadows: true }), { freq: 0.9, bump: 0.04, mottle: 0.08, key: 'dcab' });
  const cutPaint = M.cut.clone(); cutPaint.clippingPlanes = clip; cutPaint.color.set(0x8a9096); cutPaint.onBeforeCompile = M.cut.onBeforeCompile;
  const DW = DRY.x1 - DRY.x0, DH = DRY.y1 - DRY.y0, DX = (DRY.x0 + DRY.x1) / 2, DY = (DRY.y0 + DRY.y1) / 2;
  addSolid(csg(rbox(DW, DH, DRY.z * 2, 0.06).translate(DX, DY, 0), [['sub', new THREE.BoxGeometry(DW - 0.12, DH - 0.12, DRY.z * 2 - 0.12).translate(DX, DY, 0)]]), cabPaint, cutPaint);
  const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.14, DH - 0.14), new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.75, metalness: 0.2 })); backPanel.position.set(DX, DY, -DRY.z + 0.07); scene.add(backPanel);
  // front-face details (vanish in section): door seam, louvres, brand stripe
  { const dk = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.6, clippingPlanes: clip }), blu = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4, metalness: 0.2, clippingPlanes: clip });
    const g = [new THREE.BoxGeometry(0.02, DH - 0.5, 0.02).translate(-4.55, DY - 0.1, DRY.z), new THREE.BoxGeometry(0.06, 0.4, 0.04).translate(-4.68, DY + 0.2, DRY.z + 0.02)];
    for (let k = 0; k < 8; k++) g.push(new THREE.BoxGeometry(0.9, 0.035, 0.02).translate(-3.85, -2.2 + k * 0.1, DRY.z));
    for (let k = 0; k < 8; k++) g.push(new THREE.BoxGeometry(0.9, 0.035, 0.02).translate(-5.75, -2.2 + k * 0.1, DRY.z));
    scene.add(new THREE.Mesh(mergeGeometries(g.map((x) => x.toNonIndexed())), dk));
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(DW - 0.1, 0.14, 0.02).translate(DX, DRY.y1 - 0.28, DRY.z), blu)); }
  // desiccant towers
  const towers = {};
  for (const k of ['A', 'B']) {
    const x = TWR[k];
    addSolid(tubeSolid(TWR.r, TWR.r + 0.04, TWR.y1 - TWR.y0, 48).translate(x, TWR.y0, 0), stainless, cutSS);
    for (const y of [TWR.y0 - 0.1, TWR.y1]) addSolid(csg(new THREE.CylinderGeometry(TWR.r + 0.06, TWR.r + 0.06, 0.1, 48).translate(x, y + 0.05, 0), [['sub', cylBetween([x, y - 0.1, 0], [x, y + 0.2, 0], 0.09, 24)]]), stainless, cutSS);
    const cap = bedMat({ clip, cell: 17, base: 0xbfb291, wet: 0x2a62c8 }); cap.U.uY0.value = TWR.y0; cap.U.uY1.value = TWR.y1;
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(TWR.r - 0.005, TWR.r - 0.005, TWR.y1 - TWR.y0 - 0.02, 48).translate(x, (TWR.y0 + TWR.y1) / 2, 0), cap); bed.renderOrder = -1; scene.add(bed); ST.cutMeshes.push(bed);
    towers[k] = { cap, x };
  }
  // process heater (top) and regen heater (bottom-left)
  const heatMat = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.5, metalness: 0.6, emissive: 0xff4a10, emissiveIntensity: 0, clippingPlanes: clip });
  addSolid(tubeSolid(0.15, 0.18, 1.5, 40).rotateZ(-Math.PI / 2).translate(-5.85, 0.95, 0), stainless, cutSS);
  const coil = (x0, x1, y, r, turns, tr) => { const pts = []; for (let i = 0; i <= turns * 14; i++) { const f = i / (turns * 14), a = f * turns * 6.283; pts.push(new V3(x0 + f * (x1 - x0), y + Math.cos(a) * r, Math.sin(a) * r)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 28, tr, 6); };
  scene.add(new THREE.Mesh(coil(-5.75, -4.45, 0.95, 0.09, 9, 0.018), heatMat));
  const regenMat = heatMat.clone(); regenMat.clippingPlanes = clip;
  addSolid(tubeSolid(0.1, 0.13, 0.8, 32).rotateZ(-Math.PI / 2).translate(-6.3, -2.36, 0), stainless, cutSS);
  scene.add(new THREE.Mesh(coil(-6.22, -5.58, -2.36, 0.055, 5, 0.014), regenMat));
  // return filter cartridge (pull-out), cooler, blower
  const filtG = new THREE.Group(); scene.add(filtG);
  const filtMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9, clippingPlanes: clip }), { freq: 8, bump: 0.6, mottle: 0.2, key: 'dfilt' });
  const filtCut = M.cut.clone(); filtCut.clippingPlanes = clip; filtCut.color.set(0xcfc4a4); filtCut.onBeforeCompile = M.cut.onBeforeCompile;
  const capMat = M.zinc.clone();
  const filtSolids = [];
  { const g = []; for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; g.push(new THREE.BoxGeometry(0.05, 0.66, 0.11).translate(0.19, 0, 0).rotateY(a)); }
    filtSolids.push(addSolid(mergeGeometries(g).translate(XF, 0.37, 0), filtMat, filtCut, filtG)); }
  filtSolids.push(addSolid(tubeSolid(0.12, 0.27, 0.06, 32).translate(XF, 0.7, 0), capMat, M.cutSteel, filtG));
  filtSolids.push(addSolid(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 32).translate(XF, 0.02, 0), capMat, M.cutSteel, filtG));
  const coolerG = []; for (let k = 0; k < 10; k++) coolerG.push(new THREE.BoxGeometry(0.7, 0.02, 0.7).translate(XF, -0.92 + k * 0.058, 0));
  coolerG.push(cylBetween([XF - 0.4, -0.78, 0.2], [XF + 0.4, -0.78, 0.2], 0.03, 12), cylBetween([XF - 0.4, -0.5, -0.2], [XF + 0.4, -0.5, -0.2], 0.03, 12));
  addSolid(mergeGeometries(coolerG.map((g) => (g.index ? g.toNonIndexed() : g))), new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.4, metalness: 0.9, clippingPlanes: clip }), M.cut);
  addSolid(csg(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 40).rotateX(Math.PI / 2).translate(XF, -1.4, 0), [['sub', new THREE.CylinderGeometry(0.34, 0.34, 0.22, 32).rotateX(Math.PI / 2).translate(XF, -1.4, 0)]]), M.machined, M.cutSteel);
  const imp = new THREE.Mesh(mergeGeometries([0, 1, 2, 3, 4, 5].map((k) => new THREE.BoxGeometry(0.56, 0.05, 0.16).rotateZ((k * Math.PI) / 6).toNonIndexed())), new THREE.MeshStandardMaterial({ color: 0x5d646b, roughness: 0.45, metalness: 0.7, clippingPlanes: clip }));
  imp.position.set(XF, -1.4, 0); scene.add(imp);
  pp([[XF, -1.8, 0], [XF, -2.05, 0], [TWR.A, -2.05, 0], [TWR.A, TWR.y0 - 0.12, 0]]);
  pp([[TWR.B, -2.05, 0], [TWR.B, TWR.y0 - 0.12, 0]]);
  pp([[TWR.A, TWR.y1 + 0.06, 0], [TWR.A, 0.8, 0]]); pp([[TWR.B, TWR.y1 + 0.06, 0], [TWR.B, 0.8, 0]]);
  pp([[-4.38, 0.95, 0], [-4.2, 0.95, 0], [-4.2, 1.95, 0]]);
  pp([[XF, 1.95, 0], [XF, 0.76, 0]]);
  pp([[-6.75, -2.36, 0], [-6.32, -2.36, 0]], 0.06);
  pp([[-6.12, 0.8, 0], [-6.12, 1.95, 0]], 0.07);
  // console on top: dew point + drying temperature
  const consoleM = new THREE.Mesh(rbox(1.45, 0.98, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.5 }));
  consoleM.position.set(DX - 0.1, DRY.y1 + 0.48, 0.6); consoleM.rotation.x = -0.42; scene.add(consoleM);
  const cv = document.createElement('canvas'); cv.width = 448; cv.height = 296; const cx = cv.getContext('2d');
  const dTex = new THREE.CanvasTexture(cv); dTex.colorSpace = THREE.SRGBColorSpace;
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.33, 0.88), new THREE.MeshBasicMaterial({ map: dTex, toneMapped: false })); disp.position.z = 0.065; consoleM.add(disp);
  let lastKey = '';
  const draw = (st) => {
    const key = `${Math.round(st.dew)}`; if (key === lastKey) return; lastKey = key;
    cx.fillStyle = '#05090c'; cx.fillRect(0, 0, 448, 296); cx.textBaseline = 'top';
    cx.font = `700 28px ${fontFamily}`; cx.fillStyle = '#9fb4c4'; cx.fillText('DEW POINT', 26, 16);
    const bad = st.dew > -30;
    cx.font = `800 112px ${fontFamily}`; cx.fillStyle = bad ? '#ff5a4e' : '#6ff0b0'; cx.fillText(`${Math.round(st.dew)}°C`, 20, 52);
    cx.fillStyle = '#26323c'; cx.fillRect(20, 190, 408, 3);
    cx.font = `700 28px ${fontFamily}`; cx.fillStyle = '#9fb4c4'; cx.fillText('DRYING', 26, 220);
    cx.fillStyle = '#ffb35c'; cx.font = `800 56px ${fontFamily}`; cx.fillText('120 °C', 200, 208);
    dTex.needsUpdate = true;
  };
  // hoses
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7 });
  const hc = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, 'centripetal');
  const supplyC = hc([[-4.2, 1.95, 0], [-4.05, 2.5, 0.1], [-3.0, 2.5, 0.25], [-2.25, 1.9, 0.12], [-1.75, HOP.iy, 0]]);
  const returnC = hc([[-0.6, 4.85, 0], [-1.6, 5.05, -0.3], [-3.0, 4.6, -0.5], [-3.75, 3.4, -0.35], [-3.8, 2.55, -0.1], [XF, 2.0, 0]]);
  for (const c of [supplyC, returnC]) { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 100, 0.17, 14), hoseMat); m.castShadow = shadows; scene.add(m); }
  const clampS = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 32).rotateY(Math.PI / 2), M.zincNoClip); clampS.position.set(-1.68, HOP.iy, 0); scene.add(clampS);
  const clampR = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 8, 32).rotateX(Math.PI / 2), M.zincNoClip); clampR.position.set(XF, 2.06, 0); scene.add(clampR);
  const leakAt = new V3(XF, 2.06, 0);

  // ------------------------------------------------ rig: pellets in open air soaking up moisture
  const P0 = RIG.pel, R = mulberry(17);
  const PEL_N = 700;
  const pelMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.32, metalness: 0.05 });
  const pels = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.06, 3, 8), pelMat, PEL_N); pels.castShadow = shadows;
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(1, 1, 1);
    for (let i = 0; i < PEL_N; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * 1.5, h = 0.75 * (1 - (r / 1.5) ** 1.6) * R() ** 0.3; q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)); m.compose(new V3(Math.cos(a) * r, h - 0.45, Math.sin(a) * r * 0.7).add(P0), q, s); pels.setMatrixAt(i, m); } }
  scene.add(pels);
  const tray = new THREE.Mesh(rbox(3.6, 0.12, 2.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.4, metalness: 0.7 })); tray.position.copy(P0).add(new V3(0, -0.56, 0)); tray.receiveShadow = shadows; scene.add(tray);
  const HUM = []; for (let j = 0; j < 40; j++) { const a = R() * 6.283, r = 0.3 + R() * 1.0; HUM.push(buildLUT([new V3(Math.cos(a) * (r + 1.6), 1.7 + R() * 1.2, Math.sin(a) * r).add(P0), new V3(Math.cos(a) * (r + 0.6), 0.9 + R() * 0.4, Math.sin(a) * r * 0.8).add(P0), new V3(Math.cos(a) * r * 0.6, 0.05 + R() * 0.2, Math.sin(a) * r * 0.5).add(P0)], () => 1, 40)); }
  const humid = new Streaks(scene, { paths: HUM, count: 160, material: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fc8ff).multiplyScalar(1.4) }), dots: 'smooth', radius: 0.024, seed: 18, speed: 0.4 });
  // rig: moulded clear part with splay, bubbles and a crack
  const Q0 = RIG.part;
  const partG = new THREE.Group(); partG.position.copy(Q0); scene.add(partG);
  const partMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.62, depthWrite: false });
  const partM = new THREE.Mesh(rbox(3.0, 0.28, 1.8, 0.08), partMat); partM.renderOrder = 4; partG.add(partM);
  const splayTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d'); x.clearRect(0, 0, 512, 320);
    const r = mulberry(3); x.lineCap = 'round';
    for (let k = 0; k < 150; k++) { const a = (r() - 0.5) * 1.3, l = 60 + r() * 280, x0 = 30 + r() * 30, y0 = 160 + (r() - 0.5) * 40; x.strokeStyle = `rgba(240,244,248,${0.3 + r() * 0.55})`; x.lineWidth = 1 + r() * 2.5; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l * 1.5, y0 + Math.sin(a) * l * 0.55); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const splayMat = new THREE.MeshBasicMaterial({ map: splayTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const splay = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.7).rotateX(-Math.PI / 2), splayMat); splay.position.y = 0.143; splay.renderOrder = 6; partG.add(splay);
  const gate = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.2, 16).rotateZ(Math.PI / 2), partMat); gate.position.set(-1.6, 0, 0); partG.add(gate);
  const bubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0, depthWrite: false });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), bubMat, 26);
  { const m = new THREE.Matrix4(); for (let i = 0; i < 26; i++) { const s = 0.025 + R() * 0.05; m.compose(new V3((R() - 0.3) * 2.2, (R() - 0.5) * 0.12, (R() - 0.5) * 1.4), new THREE.Quaternion(), new V3(s, s, s)); bubbles.setMatrixAt(i, m); } }
  bubbles.renderOrder = 5; partG.add(bubbles);
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0, depthWrite: false });
  const crackPts = []; { let x = 0.3, z = -0.85; for (let k = 0; k <= 12; k++) { crackPts.push(new V3(x, 0.146, z)); x += 0.06 + (R() - 0.5) * 0.12; z += 0.14; } }
  const crackM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPts), 40, 0.012, 4), crackMat); crackM.renderOrder = 7; partG.add(crackM);
  const plinth = new THREE.Mesh(rbox(4.0, 0.25, 2.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.2 })); plinth.position.copy(Q0).add(new V3(0, -0.28, 0)); plinth.receiveShadow = shadows; scene.add(plinth);
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: P0, pos: P0.clone().add(new V3(1.5, 4.5, 5)) }, { c: Q0, pos: Q0.clone().add(new V3(-1.5, 5, 4)) }];

  // ------------------------------------------------ air paths
  const along = (c, n, off, u0 = 0, u1 = 1) => { const a = []; for (let k = 0; k <= n; k++) a.push(c.getPointAt(u0 + (u1 - u0) * (k / n)).clone().add(off())); return a; };
  const off = () => new V3((R() - 0.5) * 0.12, (R() - 0.5) * 0.12, -0.03);
  const BED = [], RET = [], PROC = { A: [], B: [] }, REGEN = { A: [], B: [] }, LEAK = [];
  for (let j = 0; j < 24; j++) {
    const a = Math.PI + (j / 23 - 0.5) * 2.9 + (R() - 0.5) * 0.1, sz = (r) => Math.min(-0.02, -Math.abs(Math.sin(a)) * r);
    const pts = [new V3(0, 1.3, -0.02), new V3(Math.cos(a) * 0.4, 1.06, sz(0.4)), new V3(Math.cos(a) * 0.66, 1.0, sz(0.66))];
    let x = pts[2].x, z = pts[2].z;
    for (let k = 1; k <= 11; k++) { const y = 1.0 + (k / 11) * (LEVEL_FULL - 1.0); x = Math.max(-1.0, Math.min(1.0, x * 1.05 + (R() - 0.5) * 0.22)); z = Math.max(-1.0, Math.min(-0.03, z * 1.03 + (R() - 0.5) * 0.2)); pts.push(new V3(x, y, z)); }
    pts.push(new V3(x * 0.4, HOP.y1 - 0.1, -0.06), new V3(0, HOP.y1 + 0.3, -0.04), new V3(0, 4.78, -0.04), new V3(-0.6, 4.85, -0.03));
    BED.push(buildLUT(pts, () => 0.6, 160));
    RET.push(buildLUT([...along(returnC, 30, off), new V3(XF + (R() - 0.5) * 0.1, 1.5, -0.03), new V3(XF + (R() - 0.5) * 0.1, 0.8, -0.03), new V3(XF + 0.12 + R() * 0.1, 0.4, -0.06), new V3(XF + (R() - 0.5) * 0.3, -0.05, -0.05),
      new V3(XF + (R() - 0.5) * 0.4, -0.62, -0.05), new V3(XF + (R() - 0.5) * 0.2, -1.1, -0.03), new V3(XF, -1.4, -0.03), new V3(XF, -1.85, -0.03), new V3(XF - 0.05, -2.05, -0.03)], () => 1, 180));
    for (const k of ['A', 'B']) {
      const x = TWR[k], o = (R() - 0.5) * 0.4;
      PROC[k].push(buildLUT([new V3(XF - 0.1, -2.05, -0.03), new V3(x, -2.05, -0.03), new V3(x + o * 0.3, TWR.y0, -0.05), new V3(x + o * 0.5, (TWR.y0 + TWR.y1) / 2, -0.08), new V3(x + o * 0.3, TWR.y1, -0.05), new V3(x, 0.8, -0.03), new V3(x + 0.1, 0.95, -0.03), new V3(-4.38, 0.95, -0.03), new V3(-4.2, 1.1, -0.03), new V3(-4.2, 1.8, -0.03),
        ...along(supplyC, 20, off, 0.05, 1), new V3(-0.8, HOP.iy, -0.03), new V3(-0.1, HOP.iy, -0.03), new V3(0, 1.4, -0.03)], () => 1, 220));
      REGEN[k].push(buildLUT([new V3(-7.1, -2.36, -0.03), new V3(-6.3, -2.36, -0.03), new V3(-5.6, -2.36, -0.03), new V3(x, -2.25, -0.03), new V3(x + o * 0.3, TWR.y0, -0.05), new V3(x + o * 0.5, (TWR.y0 + TWR.y1) / 2, -0.08), new V3(x, TWR.y1 + 0.1, -0.03), new V3(x - 0.2, 0.72, -0.03), new V3(-6.12, 0.85, -0.03), new V3(-6.12, 1.95, -0.03), new V3(-6.12, 2.7, -0.03)], () => 1, 120));
    }
    const th = R() * Math.PI;   // front half of the joint: in view whatever the cut
    LEAK.push(buildLUT([leakAt.clone().add(new V3(Math.cos(th) * (0.9 + R() * 0.8), 0.3 + R() * 0.8, 0.5 + R() * 0.8)), leakAt.clone().add(new V3(Math.cos(th) * 0.35, 0.08, Math.sin(th) * 0.3 + 0.1)), leakAt.clone().add(new V3(Math.cos(th) * 0.19, 0, Math.sin(th) * 0.19))], () => 1, 30));
  }
  const addMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const BLUE = [0.5, 1.2, 1.9], WHITE = [1.45, 1.45, 1.45], ORANGE = [1.8, 1.0, 0.45];
  const mix3 = (c, a, b, k) => c.setRGB(mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k));
  const procCol = (p, u, w, c) => { if (p.y < 0.75) mix3(c, BLUE, WHITE, smooth(TWR.y0, TWR.y1, p.y)); else mix3(c, WHITE, ORANGE, smooth(-5.8, -4.6, p.x)); };
  const bedAir = new Streaks(scene, { paths: BED, count: 260, material: addMat, seed: 1, speed: 1.1, radius: 0.014, lenMin: 0.08, lenMax: 0.12, colorFn: (p, u, w, c) => mix3(c, ORANGE, BLUE, smooth(1.3, 4.0, p.y)) });
  const moist = new Streaks(scene, { paths: BED, count: 150, material: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fb8ff).multiplyScalar(1.5), clippingPlanes: clip }), dots: 'smooth', radius: 0.022, seed: 2, speed: 1.1 });
  const ret = new Streaks(scene, { paths: RET, count: 280, material: addMat, seed: 3, speed: 2.2, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: (p, u, w, c) => c.setRGB(...BLUE) });
  const proc = { A: new Streaks(scene, { paths: PROC.A, count: 260, material: addMat, seed: 4, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: procCol }),
    B: new Streaks(scene, { paths: PROC.B, count: 260, material: addMat, seed: 5, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: procCol }) };
  const regCol = (p, u, w, c) => (p.y < TWR.y0 ? c.setRGB(1.9, 0.7, 0.3) : mix3(c, [1.9, 0.7, 0.3], [0.9, 1.3, 1.8], smooth(TWR.y0, TWR.y1 + 0.2, p.y)));
  const regen = { A: new Streaks(scene, { paths: REGEN.A, count: 150, material: addMat, seed: 6, speed: 1.5, radius: 0.014, lenMin: 0.08, lenMax: 0.12, colorFn: regCol }),
    B: new Streaks(scene, { paths: REGEN.B, count: 150, material: addMat, seed: 7, speed: 1.5, radius: 0.014, lenMin: 0.08, lenMax: 0.12, colorFn: regCol }) };
  const leakS = new Streaks(scene, { paths: LEAK, count: 90, material: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4fa8f0) }), dots: 'smooth', radius: 0.018, seed: 8, speed: 0.9 });
  const steam = new Puffs(scene, { count: 50, color: 0xe6eef4, opacity: 0, size: 0.45 });
  const dust = new Puffs(scene, { count: 50, color: 0x9a8a6a, opacity: 0, size: 0.4 });
  const pulse = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));

  // ------------------------------------------------ update
  let filtClipped = true;
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 3.0, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    // pellet bed: level + moisture (wet at the top where fresh pellets arrive)
    const L = st.level;
    bedCyl.scale.y = L - HOP.y0; bedSurf.position.y = L + 0.002;
    for (const m of [bedCap, bedTop]) { m.U.uY0.value = 1.0; m.U.uY1.value = L + 0.4; m.U.uWet.value = 0.65; m.U.uWetAdd.value = 0.45 * st.saturation; }
    bedCap.U.uScroll.value = t * 0.05;
    ledMat.color.setHex(L > 3.4 ? 0x6ff0b0 : 0xff5a4e);
    // towers: process bed has a wet front at the bottom, regen bed glows while it bakes the water out
    const procK = st.towerA === 'process' ? 'A' : 'B', regK = procK === 'A' ? 'B' : 'A';
    const pc = towers[procK].cap.U, rc = towers[regK].cap.U;
    pc.uWet.value = 0.85; pc.uWetAdd.value = 0.1 + 0.55 * st.saturation; pc.uGlow.value = 0; pc.uFlip.value = 1;
    rc.uGlow.value = (1 - st.regenDead) * (0.75 + 0.15 * Math.sin(t * 2)); rc.uWet.value = 0.25 + 0.5 * st.regenDead; rc.uWetAdd.value = 0.45 * st.regenDead; rc.uFlip.value = 0;
    towers.A.cap.U.uFreshY.value = st.fresh > 0.001 ? mix(TWR.y1 + 0.05, TWR.y0 - 0.05, st.fresh) : 99;
    towers.A.cap.U.uOld.value = 0.55 * smooth(44.6, 47.0, t);
    heatMat.emissiveIntensity = 1.5 + 0.3 * Math.sin(t * 3);
    regenMat.emissiveIntensity = 1.8 * (1 - st.regenDead);
    imp.rotation.z = -t * 16 * st.airflow;
    filtMat.color.setHex(0xe8e2d0).lerp(new THREE.Color(0x4a3a26), st.filterDirt);
    filtG.position.set(0.5 * st.filterOut, 0.9 * st.filterOut, 1.3 * st.filterOut);
    const wantClip = st.filterOut < 0.02;
    if (wantClip !== filtClipped) { filtClipped = wantClip; for (const m of [filtMat, capMat]) { m.clippingPlanes = wantClip ? clip : []; m.needsUpdate = true; } }
    for (const s of filtSolids) s.children.forEach((c) => (c.visible = wantClip && cut > 0.0001));
    clampR.scale.setScalar(1.18 - 0.18 * st.clamp);
    draw(st);
    // defects rig
    const dfx = opts.defects != null ? opts.defects : st.defects;
    splayMat.opacity = 0.95 * dfx; bubMat.opacity = 0.8 * dfx; crackMat.opacity = 0.95 * smooth(0.5, 1, dfx);
    pelMat.color.setHex(0xe6dcc4).lerp(new THREE.Color(0xa8c4d8), 0.55 * smooth(0.6, 4.8, t) * st.moistAir);
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 16);
    rigL.visible = !!rs; rigL.intensity = rs ? 110 : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    // flows
    const af = st.airflow;
    bedAir.update({ tau: t * af, vis: af, camPos: cam });
    moist.update({ tau: t * af, vis: 0.45 + 0.4 * st.saturation, camPos: cam });
    ret.update({ tau: t * af, vis: af, camPos: cam });
    proc.A.update({ tau: t * af, vis: procK === 'A' ? af : 0, camPos: cam }); proc.B.update({ tau: t * af, vis: procK === 'B' ? af : 0, camPos: cam });
    regen.A.update({ tau: t, vis: regK === 'A' ? 1 - st.regenDead : 0, camPos: cam }); regen.B.update({ tau: t, vis: regK === 'B' ? 1 - st.regenDead : 0, camPos: cam });
    leakS.update({ tau: t, vis: st.leak, camPos: null });
    humid.update({ tau: t, vis: cam && cam.distanceTo(P0) < 16 ? st.moistAir : 0, camPos: null });
    steam.mat.uniforms.uOpacity.value = 0.32 * (1 - st.regenDead);
    steam.update((i, s, o) => { const age = ((t * 0.6 + s[0]) % 1); o.p.set(-6.12 + (s[1] - 0.5) * 0.5 * age, 2.05 + age * 1.6, (s[2] - 0.5) * 0.5 * age); o.size = 0.2 + age * 0.8; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    dust.mat.uniforms.uOpacity.value = 0.5 * pulse(66.9, 67.0, 67.7, 67.9, t);
    dust.update((i, s, o) => { const age = ((t * 1.3 + s[0]) % 1); const fp = filtG.position; o.p.set(XF + fp.x + (s[1] - 0.5) * 1.2 * age, 0.4 + fp.y + age * 0.6, fp.z + (s[2] - 0.5) * age + 0.3); o.size = 0.15 + age * 0.6; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    hopper: new V3(HOP.r + 0.24, 3.4, 0.2), pellets: new V3(0.45, 3.1, -0.2), diffuser: new V3(0.45, 1.1, -0.1), inlet: new V3(-1.5, HOP.iy, 0.1), outlet: new V3(-0.3, 4.9, 0),
    returnHose: returnC.getPointAt(0.3), supplyHose: supplyC.getPointAt(0.5), filter: new V3(XF + 0.2, 0.5, 0), cooler: new V3(XF + 0.3, -0.62, 0), blower: new V3(XF + 0.3, -1.4, 0),
    towerA: new V3(TWR.A, 0.1, 0), towerB: new V3(TWR.B, -0.4, 0), heater: new V3(-5.1, 1.0, 0), regenHeater: new V3(-5.9, -2.3, 0), display: new V3(DX - 0.45, DRY.y1 + 0.75, 0.55),
    level: new V3(HOP.r + 0.57, 3.55, -0.25), leak: leakAt.clone(), clampS: clampS.position.clone(), vent: new V3(-6.12, 2.3, 0), cabinet: new V3(DRY.x0 + 0.3, DRY.y1, 0.6),
    pelRig: P0.clone().add(new V3(0.2, 0.35, 0.2)), splay: Q0.clone().add(new V3(-0.6, 0.15, 0.2)), bubbles: Q0.clone().add(new V3(0.7, 0.05, -0.3)), crackPart: Q0.clone().add(new V3(0.6, 0.15, 0.1)), part: Q0.clone().add(new V3(0, 0.15, 0)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
