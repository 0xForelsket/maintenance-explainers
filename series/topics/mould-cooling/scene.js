// Mould cooling circuits: mould in the machine with a flow-meter manifold, plus macro rigs
// (bubbler + baffle core insert, turbulent vs laminar channel, warped part) and a descaling cart.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, clamp01, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, makeGauge } from 'series/look';
import { buildMould, MLD } from 'series/mould';
import { stateAt, NOM } from './story.js';

const ss_ = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (a, b, c, d, x) => ss_(a, b, x) * (1 - ss_(c, d, x));
export const RIG = { core: new V3(40, 0, 0), chan: new V3(60, 0, 0), part: new V3(80, 0, 0) };
const MF = { xA: -6.2, xB: -5.4, z: -0.8, y0: 0.4, y1: 2.3, ret: 2.6, sup: 3.25 };

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.026, floorY: -4.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-6, 10, 12); ST.lights.key.target.position.set(-2.0, 0.0, 0); ST.lights.key.intensity = 560; ST.lights.key.angle = 0.75;
  const MO = buildMould(ST, { origin: new V3(0, 0, -MLD.cz), fontFamily });

  // ------------------------------------------------ machine context
  const paint = castSurface(new THREE.MeshStandardMaterial({ color: 0x2f4c6a, roughness: 0.5, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.05, mottle: 0.12, key: 'mpaint' });
  const cutPaint = M.cut.clone(); cutPaint.clippingPlanes = clip; cutPaint.color.set(0x4f5a66); cutPaint.onBeforeCompile = M.cut.onBeforeCompile;
  addSolid(csg(rbox(0.8, 7.2, 6.0, 0.08).translate(-3.4, 0, 0), [['sub', cylBetween([-4, 0, 0], [-2.8, 0, 0], 0.5, 32)]]), paint, cutPaint);
  addSolid(rbox(0.8, 7.2, 6.0, 0.08).translate(3.2, 0, 0), paint, cutPaint);
  for (const y of [-3.0, 3.0]) for (const z of [-2.4, 2.4]) addSolid(cylBetween([-4.0, y, z], [5.6, y, z], 0.24, 24), M.chrome, M.cutSteel);
  const base = new THREE.Mesh(rbox(11.0, 1.0, 5.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.55, metalness: 0.3 })); base.position.set(0.6, -4.1, -0.6); base.receiveShadow = shadows; scene.add(base);

  // ------------------------------------------------ flow-meter manifold (behind the cut so the glass stays whole)
  const zinc = new THREE.MeshStandardMaterial({ color: 0xa7adb3, roughness: 0.35, metalness: 0.95 });
  const bar = (y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.0, 24).rotateZ(Math.PI / 2), zinc); m.position.set((MF.xA + MF.xB) / 2, y, MF.z); m.castShadow = shadows; scene.add(m); };
  bar(MF.ret); bar(MF.sup);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.4, 0.12), M.support); stand.position.set(-6.9, -0.8, MF.z - 0.3); scene.add(stand);
  const glass = new THREE.MeshStandardMaterial({ color: 0xd8eef8, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.22, depthWrite: false });
  const floatMat = new THREE.MeshStandardMaterial({ color: 0xff5a2a, roughness: 0.35, emissive: 0x3a0a00 });
  const scaleTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#e8ecef'; x.fillRect(0, 0, 64, 512); x.fillStyle = '#1a1c1f'; x.font = `700 20px ${fontFamily}`; x.textAlign = 'right';
    for (let v = 0; v <= 16; v += 1) { const y = 492 - (v / 16) * 472; x.fillRect(v % 4 === 0 ? 34 : 46, y - 1.5, v % 4 === 0 ? 30 : 18, 3); if (v % 4 === 0) x.fillText(String(v), 30, y + 7); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const floats = {};
  for (const [k, x] of [['A', MF.xA], ['B', MF.xB]]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, MF.y1 - MF.y0, 32, 1, true).translate(x, (MF.y0 + MF.y1) / 2, MF.z), glass); tube.renderOrder = 9; scene.add(tube);
    for (const y of [MF.y0 - 0.06, MF.y1 + 0.06]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 24), zinc); c.position.set(x, y, MF.z); scene.add(c); }
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.14, 24), floatMat); f.position.set(x, MF.y0, MF.z); scene.add(f); floats[k] = f;
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.16, MF.y1 - MF.y0), new THREE.MeshBasicMaterial({ map: scaleTex, toneMapped: false })); sc.position.set(x + 0.26, (MF.y0 + MF.y1) / 2, MF.z + 0.02); scene.add(sc);
  }
  // hoses: supply bar -> A1/B1 tops; A2/B2 tops -> meter bottoms
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.62 });
  const hc = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new V3(...p))), false, 'centripetal');
  const fa = MO.fitAt;
  const supA = hc([[MF.xA, MF.sup + 0.15, MF.z], [MF.xA, MF.sup + 0.7, MF.z], [-4.6, 4.5, -0.6], [-2.8, 4.6, -0.3], [fa.A1.top.x, fa.A1.top.y + 0.5, 0], fa.A1.top]);
  const supB = hc([[MF.xB, MF.sup + 0.15, MF.z], [MF.xB, MF.sup + 0.9, MF.z], [-4.0, 4.9, -0.9], [-1.0, 4.9, -0.6], [fa.B1.top.x, fa.B1.top.y + 0.5, 0], fa.B1.top]);
  const retA = hc([fa.A2.top, [fa.A2.top.x, fa.A2.top.y + 0.6, -0.1], [-3.0, 4.2, -1.2], [-4.5, 3.4, -1.3], [-4.7, 0.2, -1.1], [MF.xA + 0.2, -0.1, MF.z], [MF.xA, MF.y0 - 0.15, MF.z]]);
  const retB = hc([fa.B2.top, [fa.B2.top.x, fa.B2.top.y + 0.75, -0.3], [-1.6, 5.2, -1.6], [-4.2, 4.0, -1.7], [-4.4, -0.2, -1.4], [MF.xB + 0.2, -0.25, MF.z], [MF.xB, MF.y0 - 0.15, MF.z]]);
  for (const c of [supA, supB, retA, retB]) { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 100, 0.11, 12), hoseMat); m.castShadow = shadows; scene.add(m); }
  // circuit tags (IN / OUT) shown at the end
  const tagTex = (txt, col) => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 256, 96); x.fillStyle = '#0b0e12'; x.font = `800 52px ${fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 50); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tags = [['A IN', fa.A1, '#6fd8ff'], ['A OUT', fa.A2, '#ffb35c'], ['B IN', fa.B1, '#6fd8ff'], ['B OUT', fa.B2, '#ffb35c']].map(([txt, f, col], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: tagTex(txt, col), transparent: true, opacity: 0, toneMapped: false }));
    m.position.copy(f.top).add(new V3(i % 2 ? -0.05 : 0.05, 0.55 + (i % 2) * 0.28, 0.25)); scene.add(m); return m;
  });
  // leaking O-ring at the A-circuit bottom fitting, pressure-test gauge on top of B
  const oring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 32).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, emissive: 0x00e0ff, emissiveIntensity: 0 }));
  oring.position.copy(fa.A2.bot).add(new V3(0, 0.42, 0.0)); scene.add(oring);
  const tgauge = makeGauge({ name: 'TEST', unit: 'bar', max: 10, redFrom: 0.9, R: 0.36, fontFamily, M, shadows });
  tgauge.group.position.copy(fa.B2.top).add(new V3(0.6, 1.0, 0.3)); scene.add(tgauge.group);
  const tgStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 12), M.zincNoClip); tgStem.position.copy(fa.B2.top).add(new V3(0.6, 0.55, 0.0)); scene.add(tgStem);
  // descaling cart on the floor (hooked up during the fix)
  const cartG = new THREE.Group(); cartG.position.set(-1.0, -4.6, 3.2); scene.add(cartG);
  { const body = new THREE.Mesh(rbox(1.8, 1.1, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x2e7d5b, roughness: 0.5, metalness: 0.2 })); body.position.y = 0.75; body.castShadow = shadows; cartG.add(body);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 32), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.6 })); tank.position.set(-0.35, 1.75, 0); cartG.add(tank);
    const lt = document.createElement('canvas'); lt.width = 256; lt.height = 64; const x = lt.getContext('2d'); x.fillStyle = '#f2c21c'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#111'; x.font = `800 36px ${fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DESCALER', 128, 34);
    const ltex = new THREE.CanvasTexture(lt); ltex.colorSpace = THREE.SRGBColorSpace;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: ltex, toneMapped: false })); lab.position.set(0.0, 0.85, 0.51); cartG.add(lab);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16).rotateX(Math.PI / 2), M.rubber); w.position.set(sx, 0.12, sz); cartG.add(w); }
  }
  const cartHoseA = new THREE.Mesh(new THREE.TubeGeometry(hc([[-1.4, -2.7, 3.2], [-1.6, -1.0, 2.0], [-1.0, -2.6, 0.6], [fa.B2.bot.x, fa.B2.bot.y - 0.2, 0.1]]), 60, 0.07, 10), new THREE.MeshStandardMaterial({ color: 0x2e7d5b, roughness: 0.6 }));
  scene.add(cartHoseA);

  // ------------------------------------------------ rig 1: core insert with a bubbler and a baffle (sectioned)
  const C0 = RIG.core;
  const coreRig = new THREE.Group(); coreRig.position.copy(C0); scene.add(coreRig);
  const steelR = castSurface(new THREE.MeshStandardMaterial({ color: 0x8a939c, roughness: 0.36, metalness: 0.8, clippingPlanes: clip, clipShadows: true }), { freq: 0.9, bump: 0.03, mottle: 0.1, key: 'rigsteel' });
  const coreG = csg(rbox(3.4, 3.6, 1.8, 0.3).translate(0, 0, 0), [
    ['sub', cylBetween([-0.75, -2.2, 0], [-0.75, 1.15, 0], 0.22, 32)], ['sub', cylBetween([0.75, -2.2, 0], [0.75, 1.15, 0], 0.22, 32)],
  ]);
  addSolid(coreG, steelR, M.cutSteel, coreRig);
  const capPart = new THREE.Mesh(csg(rbox(3.8, 0.5, 2.2, 0.2).translate(0, 1.95, 0), [['sub', rbox(3.42, 0.5, 1.82, 0.2).translate(0, 1.6, 0)]]), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, emissive: 0xff5a14, emissiveIntensity: 0.8, clippingPlanes: clip }));
  coreRig.add(capPart);
  addSolid(tubeSolid(0.055, 0.075, 3.2, 24).translate(-0.75, -2.3, 0), M.brass, M.cut, coreRig);
  addSolid(new THREE.BoxGeometry(0.035, 2.95, 0.42).translate(0.75, -0.7, 0), M.brass, M.cut, coreRig);
  const plug = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshStandardMaterial({ color: 0x9a4a1e, roughness: 1, emissive: 0x2a0a00, clippingPlanes: clip, side: THREE.DoubleSide })); plug.position.set(0.75, 0.95, -0.02); plug.scale.set(1.2, 0.9, 1); coreRig.add(plug);
  const RB = mulberry(5), CORE_B = [], CORE_F = [];
  for (let j = 0; j < 8; j++) {
    const o = (RB() - 0.5) * 0.04, z = -0.02 - RB() * 0.08, s = RB() > 0.5 ? 1 : -1;
    CORE_B.push(buildLUT([[-0.75 + o, -2.6, z], [-0.75 + o, 0.9, z], [-0.75 + s * 0.12, 1.08, z], [-0.75 + s * 0.15, 0.6, z], [-0.75 + s * 0.15, -2.4, z]].map((p) => new V3(...p).add(C0)), () => 1, 60));
    CORE_F.push(buildLUT([[0.62 + o, -2.6, z], [0.62 + o, 0.9, z], [0.75, 1.1, z], [0.88 + o, 0.9, z], [0.88 + o, -2.6, z]].map((p) => new V3(...p).add(C0)), () => 1, 60));
  }
  const coolMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });
  const bub = new Streaks(scene, { paths: CORE_B, count: 80, material: coolMat, seed: 6, speed: 1.4, radius: 0.014, lenMin: 0.08, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(mix(0.5, 1.7, u), mix(1.3, 0.85, u), mix(1.9, 0.4, u)) });
  const baf = new Streaks(scene, { paths: CORE_F, count: 80, material: coolMat, seed: 7, speed: 1.4, radius: 0.014, lenMin: 0.08, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(mix(0.5, 1.7, u), mix(1.3, 0.85, u), mix(1.9, 0.4, u)) });

  // ------------------------------------------------ rig 2: turbulent vs laminar channel (sectioned block)
  const H0 = RIG.chan;
  const chRig = new THREE.Group(); chRig.position.copy(H0); scene.add(chRig);
  const CR = 0.3;
  addSolid(csg(new THREE.BoxGeometry(4.4, 2.8, 1.6), [['sub', cylBetween([-2.4, 0.7, 0], [2.4, 0.7, 0], CR, 48)], ['sub', cylBetween([-2.4, -0.7, 0], [2.4, -0.7, 0], CR, 48)]]), steelR, M.cutSteel, chRig);
  const wallMatT = new THREE.MeshBasicMaterial({ color: 0x2f8fff, side: THREE.BackSide, clippingPlanes: clip });
  const wallMatL = new THREE.MeshBasicMaterial({ color: 0xff6a1a, side: THREE.BackSide, clippingPlanes: clip });
  const wallT = new THREE.Mesh(cylBetween([-2.2, 0.7, 0], [2.2, 0.7, 0], CR - 0.006, 48), wallMatT); wallT.renderOrder = 1; chRig.add(wallT);
  const wallL = new THREE.Mesh(cylBetween([-2.2, -0.7, 0], [2.2, -0.7, 0], CR - 0.006, 48), wallMatL); wallL.renderOrder = 1; chRig.add(wallL);
  const crustMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xd6c8a6, roughness: 0.95, clippingPlanes: clip }), { freq: 6, bump: 0.5, mottle: 0.3, key: 'crust2' });
  const crustCut = M.cut.clone(); crustCut.clippingPlanes = clip; crustCut.color.set(0xcdb78c); crustCut.onBeforeCompile = M.cut.onBeforeCompile;
  const chCrust = [0, 1, 2].map((k) => { const r1 = CR * (1 - 0.13 * k) - 0.002, r0 = CR * (1 - 0.13 * (k + 1)); const m = addSolid(tubeSolid(r0, r1, 4.4, 48).rotateZ(-Math.PI / 2).translate(-2.2, 0.7, 0), crustMat, crustCut, chRig, false); m.visible = false; return m; });
  const RT = mulberry(9), TURB = [], LAM = [];
  for (let j = 0; j < 30; j++) {
    const pts = []; let y = (RT() - 0.5) * 0.4, z = -RT() * 0.25 - 0.02;
    for (let i = 0; i <= 40; i++) { const x = -2.3 + (i / 40) * 4.6; y = Math.max(-0.24, Math.min(0.24, y + (RT() - 0.5) * 0.16)); z = Math.max(-0.24, Math.min(-0.02, z + (RT() - 0.5) * 0.1)); pts.push(new V3(x, 0.7 + y, z).add(H0)); }
    TURB.push(buildLUT(pts, () => 1, 120));
  }
  const lamR = [];
  for (let j = 0; j < 14; j++) { const r = (j / 13) * 0.26, sgn = j % 2 ? 1 : -1; lamR.push(r); LAM.push(buildLUT([new V3(-2.3, -0.7 + sgn * r, -0.03).add(H0), new V3(2.3, -0.7 + sgn * r, -0.03).add(H0)], () => Math.max(0.08, 1 - (r / CR) ** 2), 20)); }
  const turb = new Streaks(scene, { paths: TURB, count: 150, material: coolMat, seed: 10, speed: 2.4, radius: 0.016, lenMin: 0.1, lenMax: 0.12, colorFn: (p, u, w, c) => c.setRGB(0.55, 1.4, 2.0) });
  const lam = new Streaks(scene, { paths: LAM, count: 70, material: coolMat, seed: 11, speed: 0.55, radius: 0.016, lenMin: 0.06, lenMax: 0.4, colorFn: (p, u, w, c) => c.setRGB(0.55, 1.2, 1.8) });

  // ------------------------------------------------ rig 3: the moulded part, warping with sink marks
  const P0 = RIG.part;
  const partGeo = csg(rbox(3.0, 0.9, 1.9, 0.22), [['sub', rbox(2.7, 0.9, 1.6, 0.16).translate(0, -0.17, 0)]]);
  const basePos = partGeo.attributes.position.array.slice();
  const partM = new THREE.Mesh(partGeo, new THREE.MeshStandardMaterial({ color: 0x6b7178, roughness: 0.4, metalness: 0.0 }));
  partM.position.copy(P0).add(new V3(0, 0.2, 0)); partM.castShadow = shadows; scene.add(partM);
  const sinkMat = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.15, transparent: true, opacity: 0, depthWrite: false });
  const sinks = [[-0.7, 0.2], [0.4, -0.35], [0.9, 0.3]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24).rotateX(-Math.PI / 2), sinkMat); m.position.set(x, 0.451, z); partM.add(m); return m; });
  const plinth = new THREE.Mesh(rbox(4.0, 0.25, 2.8, 0.05), new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.5, metalness: 0.4 })); plinth.position.copy(P0).add(new V3(0, -0.45, 0)); plinth.receiveShadow = shadows; scene.add(plinth);
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: C0, pos: C0.clone().add(new V3(1.5, 4, 7)) }, { c: H0, pos: H0.clone().add(new V3(-1.5, 4, 7)) }, { c: P0, pos: P0.clone().add(new V3(2.0, 4.5, 5)) }];

  // ------------------------------------------------ water through the two circuits (supply hose -> mould -> return hose -> meter)
  const R = mulberry(31);
  const along = (c, n, off) => { const a = []; for (let k = 0; k <= n; k++) a.push(c.getPointAt(k / n).clone().add(off())); return a; };
  const PATHS = { A: [], B: [] };
  for (const [k, sup, ret, mx] of [['A', supA, retA, MF.xA], ['B', supB, retB, MF.xB]]) {
    for (let j = 0; j < 10; j++) {
      const off = () => new V3((R() - 0.5) * 0.06, (R() - 0.5) * 0.06, -0.02);
      const pts = [new V3(mx, MF.sup, MF.z), ...along(sup, 30, off), ...MO.paths[k][j], ...along(ret, 36, off), new V3(mx, MF.y0, MF.z - 0.02), new V3(mx, MF.y1, MF.z - 0.02), new V3(mx, MF.ret, MF.z)];
      PATHS[k].push(buildLUT(pts, (p) => (p.x > -3 && p.y < 2.5 ? 0.7 : 1), 700));
    }
  }
  const flowColor = (stage) => (p, u, w, c) => {
    if (stage === 1) return c.setRGB(0.5, 1.8, 0.6);
    if (stage === 2) return c.setRGB(1.4, 0.6, 1.8);
    if (stage === 3) return c.setRGB(0.8, 1.6, 1.9);
    if (stage === 4) return c.setRGB(1.7, 1.7, 1.7);
    const k = smooth(0.35, 0.62, u); return c.setRGB(mix(0.45, 1.8, k), mix(1.25, 0.85, k), mix(1.8, 0.35, k));
  };
  const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const fA = new Streaks(scene, { paths: PATHS.A, count: 330, material: flowMat, seed: 1, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: flowColor(0) });
  const fB = new Streaks(scene, { paths: PATHS.B, count: 330, material: flowMat, seed: 2, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: flowColor(0) });
  // minerals in the incoming water (disappear once the water is treated)
  const minMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2e6cc).multiplyScalar(1.1) });
  const minA = new Streaks(scene, { paths: PATHS.A, count: 90, material: minMat, dots: true, radius: 0.012, seed: 3, speed: 2.0 });
  // O-ring drips
  const DR = []; for (let j = 0; j < 5; j++) { const z = 0.15 + R() * 0.2; const b = fa.A2.bot; DR.push(buildLUT([new V3(b.x + 0.15, b.y + 0.35, z), new V3(b.x + 0.15, b.y + 0.32, z), new V3(b.x + 0.15, -4.58, z)], (p) => (p.y > b.y + 0.3 ? 0.06 : 1), 30)); }
  const drips = new Streaks(scene, { paths: DR, count: 12, material: new THREE.MeshStandardMaterial({ color: 0x6fb6d8, roughness: 0.05, transparent: true, opacity: 0.8 }), dots: 'smooth', radius: 0.015, seed: 4, speed: 1.0 });
  const airPuff = new Puffs(scene, { count: 50, color: 0xe6eef4, opacity: 0, size: 0.4 });

  // ------------------------------------------------ update
  const pos = partGeo.attributes.position;
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 3.4, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    const H = MO.heatU;
    H.uThermal.value = opts.thermal ?? 0;
    H.uHeat.value = 0.5 + 0.32 * st.partHeat;
    H.uBase.value = 0.12;
    const wA = (st.flowA / NOM) * (1 - 0.6 * st.scaleA), wB = (st.flowB / NOM) * (1 - 0.6 * st.scaleB);
    H.uW.value = [wA, wA, wB, wB];
    MO.partMat.emissiveIntensity = 0.25 + 1.1 * st.partHeat;
    MO.setScale('A1', st.scaleA); MO.setScale('A2', st.scaleA); MO.setScale('B1', st.scaleB); MO.setScale('B2', st.scaleB);
    floats.A.position.y = MF.y0 + 0.08 + (st.flowA / 16) * (MF.y1 - MF.y0 - 0.16);
    floats.B.position.y = MF.y0 + 0.08 + (st.flowB / 16) * (MF.y1 - MF.y0 - 0.16);
    tags.forEach((m) => (m.material.opacity = st.tags));
    oring.material.emissiveIntensity = 1.4 * pulse(76.6, 76.9, 77.7, 78.0, t);
    tgauge.set(st.ptest > 0.01 ? st.ptestP : 0);
    cartG.visible = st.cart > 0.01; cartHoseA.visible = st.cart > 0.5;
    // macro rigs
    capPart.material.emissiveIntensity = 0.35 + 0.5 * st.partHeat + 1.0 * st.baffleBlock;
    plug.visible = st.baffleBlock > 0.05; plug.scale.setScalar(0.4 + 0.6 * st.baffleBlock).multiply(new V3(1.2, 0.9, 1));
    chCrust.forEach((m, k) => { m.visible = st.chScale > (k + 0.5) / 3.2; });
    wallMatT.color.setHex(0x2f8fff).lerp(new THREE.Color(0xff6a1a), st.chScale * 0.85);
    const warpK = st.warp * 0.38;
    for (let i = 0; i < pos.count; i++) { const x = basePos[i * 3], y = basePos[i * 3 + 1]; pos.setY(i, y + warpK * (x / 1.5) * (x / 1.5) - warpK * 0.5); }
    pos.needsUpdate = true; partGeo.computeVertexNormals();
    sinkMat.opacity = 0.9 * st.sink; sinks.forEach((m) => { m.position.y = 0.451 + warpK * ((m.position.x / 1.5) ** 2) - warpK * 0.5; });
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 16);
    rigL.visible = !!rs; rigL.intensity = rs ? 110 : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    // flows
    const stage = st.flushStage;
    fA.colorFn = flowColor(0); fB.colorFn = flowColor(stage);
    fA.update({ tau: t * (st.flowA / NOM), vis: 1, camPos: cam });
    fB.update({ tau: t * (st.flowB / NOM) * (stage ? 1.3 : 1), vis: stage === 4 ? 0.5 : 1, camPos: cam, widthScale: stage === 4 ? 0.7 : 1 });
    minA.update({ tau: t * (st.flowA / NOM), vis: (t > 63.5 && t < 66.2 ? 0.5 * (1 - st.treat) : 0), camPos: cam });
    const nearC = cam && cam.distanceTo(C0) < 16, nearH = cam && cam.distanceTo(H0) < 16;
    bub.update({ tau: t, vis: nearC ? 1 : 0, camPos: null });
    baf.update({ tau: t, vis: nearC ? 1 - st.baffleBlock : 0, camPos: null });
    turb.update({ tau: t * (1 - 0.55 * st.chScale), vis: nearH ? 1 : 0, camPos: null, widthScale: 1 - 0.3 * st.chScale });
    lam.update({ tau: t, vis: nearH ? 1 : 0, camPos: null });
    drips.update({ tau: t, vis: st.oringLeak, camPos: null });
    airPuff.mat.uniforms.uOpacity.value = stage === 4 ? 0.35 : 0;
    airPuff.update((i, s, o) => { const age = ((t * 1.2 + s[0]) % 1); const b = fa.B2.top; o.p.set(b.x + 0.3 + age * 1.0, b.y + 0.4 + age * 0.8 * s[1], 0.3 + (s[2] - 0.5) * age); o.size = 0.15 + age * 0.7; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    ...MO.anchors,
    meterA: new V3(MF.xA - 0.2, MF.y1 - 0.2, MF.z), meterB: new V3(MF.xB + 0.15, MF.y0 + 0.3, MF.z), get floatB() { return floats.B.position.clone(); }, get floatA() { return floats.A.position.clone(); },
    manifold: new V3((MF.xA + MF.xB) / 2, MF.sup + 0.2, MF.z), supply: supA.getPointAt(0.3), oring: oring.position.clone(), gaugeT: tgauge.group.position.clone(), cart: new V3(-1.0, -2.6, 3.6),
    bubbler: C0.clone().add(new V3(-0.75, 0.2, 0)), baffle: C0.clone().add(new V3(0.75, -0.2, 0)), coreTop: C0.clone().add(new V3(0, 1.95, 0.3)), plug: C0.clone().add(new V3(0.75, 1.0, 0)),
    turb: H0.clone().add(new V3(-0.8, 0.7 + 0.3, 0)), lam: H0.clone().add(new V3(0.6, -0.7 - 0.3, 0)), crust: H0.clone().add(new V3(0.4, 0.7 + 0.28, 0)),
    partTop: P0.clone().add(new V3(0.6, 0.7, 0.3)), sink: P0.clone().add(new V3(0.4, 0.65, -0.35)),
    tagA: fa.A1.top.clone().add(new V3(0.05, 0.55, 0.25)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
