// Mould temperature controller (TCU) beside a moulding machine, piped to a mould with cooling circuits.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, clamp01, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, makeGauge } from 'series/look';
import { buildMould, MLD } from 'series/mould';
import { stateAt, SET } from './story.js';

export const TC = new V3(-7.2, -3.0, 0);   // TCU cabinet centre (x, y of the middle)
const HP = { x: -7.2, y0: -3.3, y1: -2.1, r: 0.28 };   // heater canister
const VP = new V3(-7.95, -2.3, 0);                       // cooling valve
const PP = new V3(-6.75, -3.9, 0);                       // pump volute centre
const SP = new V3(-6.35, -3.9, 0);                       // return-line strainer

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.026, floorY: -4.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-8, 10, 12); ST.lights.key.target.position.set(-3.5, -1.0, 0); ST.lights.key.intensity = 560; ST.lights.key.angle = 0.75;
  const MO = buildMould(ST, { origin: new V3(0, 0, -MLD.cz), fontFamily });

  // ------------------------------------------------ machine context: platens, tie bars, base
  const paint = castSurface(new THREE.MeshStandardMaterial({ color: 0x2f4c6a, roughness: 0.5, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.05, mottle: 0.12, key: 'mpaint' });
  const cutPaint = M.cut.clone(); cutPaint.clippingPlanes = clip; cutPaint.color.set(0x4f5a66); cutPaint.onBeforeCompile = M.cut.onBeforeCompile;
  addSolid(csg(rbox(0.8, 7.2, 6.0, 0.08).translate(-3.4, 0, 0), [['sub', cylBetween([-4, 0, 0], [-2.8, 0, 0], 0.5, 32)]]), paint, cutPaint);
  addSolid(rbox(0.8, 7.2, 6.0, 0.08).translate(3.2, 0, 0), paint, cutPaint);
  for (const y of [-3.0, 3.0]) for (const z of [-2.4, 2.4]) addSolid(cylBetween([-4.0, y, z], [5.6, y, z], 0.24, 24), M.chrome, M.cutSteel);
  const base = new THREE.Mesh(rbox(11.0, 1.0, 5.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.55, metalness: 0.3 })); base.position.set(0.6, -4.1, -0.6); base.receiveShadow = shadows; scene.add(base);

  // ------------------------------------------------ TCU cabinet (hollow, cut open by the section)
  const cabPaint = castSurface(new THREE.MeshStandardMaterial({ color: 0x3a5f86, roughness: 0.45, metalness: 0.35, clippingPlanes: clip, clipShadows: true }), { freq: 0.9, bump: 0.04, mottle: 0.1, key: 'cab' });
  const CW = 2.4, CH = 3.0, CD = 2.0;
  addSolid(csg(rbox(CW, CH, CD, 0.06).translate(TC.x, TC.y, 0), [['sub', new THREE.BoxGeometry(CW - 0.12, CH - 0.12, CD - 0.12).translate(TC.x, TC.y, 0)]]), cabPaint, cutPaint);
  for (const x of [TC.x - 0.95, TC.x + 0.95]) for (const z of [-0.75, 0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16).rotateX(Math.PI / 2), M.rubber); w.position.set(x, TC.y - CH / 2 - 0.1, z); scene.add(w); }
  // console with display + pressure gauge (never clipped so they stay readable in section)
  const consoleM = new THREE.Mesh(rbox(1.6, 0.5, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.5 }));
  consoleM.position.set(TC.x - 0.3, TC.y + CH / 2 + 0.22, 0.62); consoleM.rotation.x = -0.55; scene.add(consoleM);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
  const cx = cv.getContext('2d'); const dispTex = new THREE.CanvasTexture(cv); dispTex.colorSpace = THREE.SRGBColorSpace;
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.45), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false })); disp.position.set(0, 0, 0.065); consoleM.add(disp);
  let lastKey = '';
  const draw = (st) => {
    let mode = 'run'; if (st.alarm > 0.5) mode = 'alarm'; else if (st.otTest > 0.5) mode = 'ot'; else if (st.cool > 0.05) mode = 'cool';
    const key = [mode, st.water.toFixed(1), st.heater, st.valve].join('|'); if (key === lastKey) return; lastKey = key;
    cx.fillStyle = mode === 'alarm' ? '#3a0707' : '#05090c'; cx.fillRect(0, 0, 512, 160);
    cx.textBaseline = 'top'; cx.font = `700 26px ${fontFamily}`; cx.fillStyle = '#9fb4c4';
    if (mode === 'alarm') { cx.fillStyle = '#ff5a4e'; cx.font = `800 46px ${fontFamily}`; cx.fillText('ALARM', 24, 22); cx.font = `700 34px ${fontFamily}`; cx.fillText('LOW PRESSURE', 24, 88); }
    else if (mode === 'ot') { cx.fillStyle = '#6ff0b0'; cx.font = `800 40px ${fontFamily}`; cx.fillText('OVER-TEMP TEST', 24, 22); cx.font = `700 34px ${fontFamily}`; cx.fillText('CUT-OUT OK ✓', 24, 88); }
    else {
      cx.fillText(mode === 'cool' ? 'COOLING DOWN' : 'WATER OUT', 24, 14); cx.fillText(`SET ${SET.toFixed(1)}`, 330, 14);
      cx.font = `700 78px ${fontFamily}`; cx.fillStyle = Math.abs(st.water - SET) > 3 && mode !== 'cool' ? '#ff5a4e' : '#ffb35c'; cx.fillText(`${st.water.toFixed(1)}°`, 20, 50);
      cx.font = `700 26px ${fontFamily}`; cx.fillStyle = st.heater ? '#ff8a3c' : '#33404c'; cx.fillText('HEAT', 340, 64);
      cx.fillStyle = st.valve ? '#6fd8ff' : '#33404c'; cx.fillText('COOL', 340, 104);
    }
    dispTex.needsUpdate = true;
  };
  const gauge = makeGauge({ name: 'P', unit: 'bar', max: 10, redFrom: 0.8, R: 0.32, fontFamily, M, shadows });
  gauge.group.position.set(TC.x + 0.75, TC.y + CH / 2 + 0.36, -0.45); gauge.group.rotation.x = -0.35; scene.add(gauge.group);

  // ------------------------------------------------ internals: pump, heater, cooling valve, sensor, strainer, piping
  const machined = M.machined;
  const pumpG = new THREE.Group(); scene.add(pumpG);
  addSolid(new THREE.CylinderGeometry(0.33, 0.33, 0.9, 40).rotateZ(Math.PI / 2).translate(PP.x - 0.7, PP.y, 0), castSurface(new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.5, metalness: 0.3, clippingPlanes: clip }), { freq: 1, bump: 0.05, mottle: 0.1, key: 'tmotor' }), M.cut, pumpG);
  addSolid(csg(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 48).rotateZ(Math.PI / 2).translate(PP.x, PP.y, 0), [['sub', new THREE.CylinderGeometry(0.3, 0.3, 0.2, 40).rotateZ(Math.PI / 2).translate(PP.x, PP.y, 0)]]), machined, M.cutSteel, pumpG);
  const impeller = new THREE.Mesh(mergeGeometries([0, 1, 2, 3, 4, 5].map((k) => new THREE.BoxGeometry(0.16, 0.52, 0.04).translate(0, 0.0, 0).rotateX((k * Math.PI) / 6).toNonIndexed())), new THREE.MeshStandardMaterial({ color: 0x6d757d, roughness: 0.45, metalness: 0.7, clippingPlanes: clip }));
  impeller.position.copy(PP); scene.add(impeller);
  // heater canister + coil + crust layers
  const canMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.85, clippingPlanes: clip, clipShadows: true });
  addSolid(tubeSolid(HP.r - 0.03, HP.r, HP.y1 - HP.y0, 48).translate(HP.x, HP.y0, 0), canMat, M.cutSteel);
  for (const y of [HP.y0 - 0.04, HP.y1 - 0.02]) addSolid(new THREE.CylinderGeometry(HP.r + 0.02, HP.r + 0.02, 0.06, 48).translate(HP.x, y + 0.03, 0), canMat, M.cutSteel);
  const coilPts = (r) => { const pts = []; for (let i = 0; i <= 160; i++) { const f = i / 160, a = f * 6 * Math.PI * 2; pts.push(new V3(HP.x + Math.cos(a) * r, mix(HP.y0 + 0.12, HP.y1 - 0.12, f), Math.sin(a) * r)); } return new THREE.CatmullRomCurve3(pts); };
  const coilCurve = coilPts(0.15);
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.5, metalness: 0.6, emissive: 0xff4a10, emissiveIntensity: 0, clippingPlanes: clip });
  const coil = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 320, 0.028, 8), coilMat); coil.castShadow = shadows; scene.add(coil);
  const crustMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xdccfae, roughness: 0.95, clippingPlanes: clip }), { freq: 9, bump: 0.6, mottle: 0.3, key: 'hcrust' });
  const crusts = [0.042, 0.056, 0.07].map((r) => { const m = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 320, r, 8), crustMat); m.visible = false; scene.add(m); return m; });
  // cooling solenoid valve: body with bore, plunger, coil
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.32, clippingPlanes: clip, clipShadows: true });
  addSolid(csg(rbox(0.46, 0.38, 0.38, 0.04).translate(VP.x, VP.y, 0), [['sub', cylBetween([VP.x, VP.y - 0.1, 0], [VP.x, VP.y + 0.3, 0], 0.08, 24)], ['sub', cylBetween([VP.x - 0.3, VP.y, 0], [VP.x + 0.3, VP.y, 0], 0.07, 24)]]), brass, M.cut);
  const coilV = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, emissive: 0x3fa8ff, emissiveIntensity: 0, clippingPlanes: clip });
  addSolid(csg(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 32).translate(VP.x, VP.y + 0.37, 0), [['sub', new THREE.CylinderGeometry(0.085, 0.085, 0.5, 24).translate(VP.x, VP.y + 0.37, 0)]]), coilV, M.cutDark);
  const plunger = addSolid(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 24).translate(VP.x, VP.y + 0.12, 0), M.steel, M.cutSteel);
  const dirt = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 1 })); dirt.position.set(VP.x + 0.05, VP.y - 0.02, -0.03); scene.add(dirt);
  // sensor probe in the supply line
  const sensor = addSolid(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12).translate(-6.45, -1.6, 0), M.steel, M.cutSteel);
  addSolid(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 6).translate(-6.45, -1.33, 0), M.zinc, M.cutSteel);
  // piping (cut in section)
  const pr = 0.075, pR = 0.11;
  const pipe = (pts) => addSolid(pipeSolid(pts, pr, pR, 0.14, 24), M.pipe, M.cutDark);
  pipe([[PP.x, PP.y + 0.42, 0], [PP.x, -3.38, 0], [HP.x, -3.38, 0], [HP.x, HP.y0 - 0.05, 0]]);
  pipe([[HP.x, HP.y1 + 0.02, 0], [HP.x, -1.8, 0], [-6.0, -1.8, 0]]);
  pipe([[-6.0, -3.9, 0], [PP.x + 0.17, -3.9, 0]]);
  pipe([[-8.42, VP.y, 0], [VP.x - 0.24, VP.y, 0]]);
  pipe([[VP.x + 0.23, VP.y, 0], [VP.x + 0.35, VP.y, 0], [VP.x + 0.35, -3.38, 0], [HP.x - 0.1, -3.38, 0]]);
  pipe([[-6.2, -3.9, 0], [-6.2, -4.25, 0], [-5.98, -4.25, 0]]);
  // return-line Y-strainer (cap + screen slide out for cleaning)
  addSolid(csg(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 32).rotateZ(Math.PI / 2).translate(SP.x, SP.y, 0), [['add', cylBetween([SP.x, SP.y, 0], [SP.x - 0.2, SP.y - 0.2, 0], 0.12, 24)], ['sub', cylBetween([SP.x - 0.25, SP.y, 0], [SP.x + 0.25, SP.y, 0], 0.08, 24)], ['sub', cylBetween([SP.x + 0.04, SP.y + 0.04, 0], [SP.x - 0.24, SP.y - 0.24, 0], 0.09, 24)]]), brass, M.cut);
  const strainG = new THREE.Group(); scene.add(strainG);
  const scrMat = new THREE.MeshStandardMaterial({ color: 0x8c949b, roughness: 0.5, metalness: 0.8, wireframe: false });
  scrMat.clippingPlanes = clip;
  const screenM = new THREE.Mesh(cylBetween([SP.x + 0.02, SP.y + 0.02, 0], [SP.x - 0.2, SP.y - 0.2, 0], 0.07, 16), scrMat); strainG.add(screenM);
  const capM = new THREE.Mesh(cylBetween([SP.x - 0.2, SP.y - 0.2, 0], [SP.x - 0.27, SP.y - 0.27, 0], 0.15, 6), M.zinc); strainG.add(capM);
  // drips + puddle under the pump seal
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f86ad, roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.62, depthWrite: false, emissive: 0x061822 }));
  puddle.position.set(PP.x - 0.2, -4.595, 1.35); puddle.renderOrder = 2; scene.add(puddle);

  // ------------------------------------------------ hoses: TCU <-> mould (series through both halves), tower lines
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.62 });
  const hoseCurve = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, 'centripetal');
  const fa = MO.fitAt;
  const supplyC = hoseCurve([[-5.95, -1.8, 0], [-5.2, -1.75, -0.2], [-4.5, -0.4, -0.7], [-4.2, 3.4, -0.8], [-3.2, 4.5, -0.5], [-2.2, 4.1, -0.15], [fa.A2.top.x, fa.A2.top.y + 0.45, 0], [fa.A2.top.x, fa.A2.top.y, 0]]);
  const seriesC = new THREE.CubicBezierCurve3(fa.A1.top.clone(), fa.A1.top.clone().add(new V3(0, 0.75, 0)), fa.B1.top.clone().add(new V3(0, 0.75, 0)), fa.B1.top.clone());
  const returnC = hoseCurve([[fa.B2.top.x, fa.B2.top.y, 0], [fa.B2.top.x, fa.B2.top.y + 0.55, -0.2], [-0.2, 5.0, -1.3], [-3.0, 4.9, -1.7], [-4.7, 1.0, -1.6], [-5.3, -3.2, -1.0], [-5.6, -3.9, -0.2], [-5.95, -3.9, 0]]);
  const towerInC = hoseCurve([[-8.45, VP.y, 0], [-9.3, VP.y, -0.2], [-10.2, -1.2, -1.2], [-11.5, 0.5, -2.5]]);
  const towerOutC = hoseCurve([[-5.95, -4.25, 0], [-5.5, -4.4, -0.4], [-5.6, -4.48, -1.6], [-9.0, -4.48, -2.8], [-12, -4.48, -3.2]]);
  const hoses = [supplyC, seriesC, returnC, towerInC, towerOutC].map((c, i) => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 120, 0.12, 14), hoseMat); m.castShadow = shadows; scene.add(m); return m; });
  // crack in the supply hose (steam + drip) and an inspection ring that sweeps along the hoses
  const crackAt = supplyC.getPointAt(0.42);
  const steam = new Puffs(scene, { count: 50, color: 0xe6eef4, opacity: 0, size: 0.4 });
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe9ff).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sweepRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 32), ringMat); scene.add(sweepRing);

  // ------------------------------------------------ water paths
  const R = mulberry(41);
  const rev = (arr) => arr.slice().reverse();
  const LOOP = [], TIN = [], TOUT = [];
  for (let j = 0; j < 10; j++) {
    const o = () => (R() - 0.5) * 0.08;
    const pts = [];
    pts.push(new V3(PP.x + o(), PP.y + 0.3, -0.03), new V3(PP.x + o(), -3.38, -0.03), new V3(HP.x + 0.12, -3.38, -0.03), new V3(HP.x + 0.21, HP.y0 + 0.1, -0.06 - R() * 0.1), new V3(HP.x - 0.2, mix(HP.y0, HP.y1, 0.5), -0.05 - R() * 0.1), new V3(HP.x + 0.21, HP.y1 - 0.1, -0.06), new V3(HP.x, -1.8, -0.03), new V3(-6.45, -1.8, -0.03), new V3(-6.0, -1.8, -0.03));
    for (let k = 0; k <= 30; k++) pts.push(supplyC.getPointAt(k / 30).clone().add(new V3(o(), o(), -0.02)));
    pts.push(...rev(MO.paths.A[j]));
    for (let k = 0; k <= 10; k++) pts.push(seriesC.getPoint(k / 10).clone().add(new V3(o(), o(), -0.02)));
    pts.push(...MO.paths.B[j]);
    for (let k = 0; k <= 36; k++) pts.push(returnC.getPointAt(k / 36).clone().add(new V3(o(), o(), -0.02)));
    pts.push(new V3(-6.35, -3.9 + o() * 0.5, -0.03), new V3(PP.x + 0.12, -3.9, -0.03), new V3(PP.x, -3.9, -0.03), new V3(PP.x, PP.y + 0.3, -0.03));
    LOOP.push(buildLUT(pts, (p) => (p.x > -3.0 ? 0.55 : 1), 900));
    TIN.push(buildLUT([new V3(-10.2, -1.2, -1.2), new V3(-9.3, VP.y, -0.2), new V3(-8.45, VP.y, -0.03), new V3(VP.x, VP.y, -0.03), new V3(VP.x + 0.35, VP.y - 0.2, -0.03), new V3(VP.x + 0.35, -3.38, -0.03), new V3(HP.x - 0.1, -3.38, -0.03), new V3(HP.x, HP.y0 + 0.2, -0.05)], () => 1, 120));
    TOUT.push(buildLUT([new V3(-6.6, -3.9, -0.03), new V3(-6.2, -3.95, -0.03), new V3(-6.2, -4.25, -0.03), new V3(-5.95, -4.25, -0.03), new V3(-5.5, -4.4, -0.4), new V3(-5.6, -4.48, -1.6), new V3(-8.5, -4.48, -2.7)], () => 1, 120));
  }
  // per-path segment markers so colour can follow temperature: cool out of the unit, warming through the mould
  const loopColor = (p, u, w, c) => { const k = smooth(-2.0, 1.2, p.x) * (p.y > -1.0 || p.x > -3.0 ? 1 : 0.6); c.setRGB(mix(0.45, 1.8, k), mix(1.25, 0.85, k), mix(1.8, 0.35, k)); };
  const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const loop = new Streaks(scene, { paths: LOOP, count: 640, material: flowMat, seed: 1, speed: 2.2, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: loopColor });
  const tin = new Streaks(scene, { paths: TIN, count: 160, material: flowMat, seed: 2, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: (p, u, w, c) => c.setRGB(0.35, 1.1, 2.0) });
  const tout = new Streaks(scene, { paths: TOUT, count: 120, material: flowMat, seed: 3, speed: 2.0, radius: 0.016, lenMin: 0.08, lenMax: 0.14, colorFn: (p, u, w, c) => c.setRGB(1.6, 0.8, 0.3) });
  // dissolved minerals in the heater water + drips from the pump seal
  const MIN = []; for (let j = 0; j < 20; j++) { const a = R() * 6.28, r = 0.06 + 0.17 * R(); MIN.push(buildLUT([new V3(HP.x + Math.cos(a) * r, HP.y0 + 0.1, -Math.abs(Math.sin(a)) * r), new V3(HP.x + Math.cos(a + 1) * r, HP.y1 - 0.1, -Math.abs(Math.sin(a + 1)) * r)], () => 1, 30)); }
  const minerals = new Streaks(scene, { paths: MIN, count: 90, material: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2e6cc).multiplyScalar(1.05), clippingPlanes: clip }), dots: true, radius: 0.0065, seed: 4, speed: 0.25 });
  const DR = []; for (let j = 0; j < 6; j++) { const z = 0.1 + R() * 0.25; DR.push(buildLUT([new V3(PP.x - 0.25, PP.y - 0.3, z), new V3(PP.x - 0.25, PP.y - 0.34, z), new V3(PP.x - 0.25, -4.58, z)], (p) => (p.y > PP.y - 0.35 ? 0.06 : 1), 30)); }
  const drips = new Streaks(scene, { paths: DR, count: 14, material: new THREE.MeshStandardMaterial({ color: 0x6fb6d8, roughness: 0.05, transparent: true, opacity: 0.8 }), dots: 'smooth', radius: 0.02, seed: 5, speed: 1.0 });
  const spark = new Puffs(scene, { count: 40, color: 0xffc070, opacity: 0, size: 0.12, additive: true });

  // ------------------------------------------------ update
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 3.4, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    // mould heat field
    const H = MO.heatU;
    H.uThermal.value = opts.thermal ?? 0;
    H.uHeat.value = 0.5 + 0.32 * st.partHeat;
    H.uBase.value = clamp01(0.1 + (st.water - SET) * 0.035 + 0.05);
    const wv = (0.75 + 0.25 * (st.water < SET ? 1.2 : 1)) * (1 - 0.7 * st.mouldScale);
    H.uW.value = [wv, wv, wv, wv];
    MO.partMat.emissiveIntensity = 0.25 + 1.1 * st.partHeat;
    for (const c of ['A1', 'A2', 'B1', 'B2']) MO.setScale(c, st.mouldScale);
    // unit internals
    impeller.rotation.x = t * 14;
    const hotEl = 1 + 0.9 * st.heaterScale;
    coilMat.emissiveIntensity = (st.heater ? 1.8 * hotEl : 0.0) * (1 - st.burnt);
    coilMat.color.setHex(st.burnt > 0.5 ? 0x2a1a14 : 0x6a4a3a);
    crusts.forEach((m, k) => { m.visible = st.heaterScale > (k + 0.5) / 3.4; });
    const open = st.valve;
    plunger.position.y = 0.1 * open;
    coilV.emissiveIntensity = (st.valve || st.stuckShut > 0.5 ? 1.2 : 0) * (st.stuckShut > 0.5 ? (Math.sin(t * 9) > 0 ? 1 : 0.4) : 1);
    dirt.visible = st.stuckShut > 0.01 || st.stuckOpen > 0.01;
    dirt.position.y = st.stuckOpen > 0.5 ? VP.y + 0.08 : VP.y - 0.02;
    gauge.set(st.pressure);
    draw(st);
    // strainer pulled for cleaning
    const k = st.strainer; strainG.position.set(-0.55 * k, -0.55 * k, 0.9 * k);
    scrMat.color.setHex(0x8c949b).lerp(new THREE.Color(0x4a3420), 1 - st.strainerClean);
    // leaks
    puddle.visible = st.puddle > 0.01; puddle.scale.set(0.2 + 1.0 * st.puddle, 1, 0.15 + 0.55 * st.puddle);
    steam.mat.uniforms.uOpacity.value = 0.35 * st.crack;
    steam.update((i, s, o) => { const age = ((t * 0.9 + s[0]) % 1); o.p.set(crackAt.x + (s[1] - 0.5) * 0.4 * age, crackAt.y + 0.1 + age * 1.3, crackAt.z + 0.15 + (s[2] - 0.5) * 0.4 * age); o.size = 0.15 + age * 0.7; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    // inspection sweep ring along the supply hose
    ringMat.opacity = 0.9 * (st.sweep > 0.01 && st.sweep < 0.99 ? 1 : 0);
    if (ringMat.opacity > 0) { const u = st.sweep; const p = supplyC.getPointAt(u), tg = supplyC.getTangentAt(u); sweepRing.position.copy(p); sweepRing.quaternion.setFromUnitVectors(new V3(0, 0, 1), tg); }
    // water
    const flow = 1 - 0.5 * st.cool;
    loop.update({ tau: t * flow, vis: 1, camPos: cam });
    tin.update({ tau: t, vis: open, camPos: cam });
    tout.update({ tau: t, vis: open, camPos: cam });
    minerals.update({ tau: t, vis: cam && cam.distanceTo(new V3(HP.x, -2.7, 0)) < 3.5 ? (t > 39.0 && t < 47 ? 1 : 0.15) : 0, camPos: null });
    drips.update({ tau: t, vis: st.drip, camPos: null });
    spark.mat.uniforms.uOpacity.value = smooth(45.15, 45.3, t) * (1 - smooth(45.6, 46.0, t));
    spark.update((i, s, o) => { const age = ((t * 2.6 + s[0]) % 1); o.p.set(HP.x + (s[1] - 0.5) * 0.3, mix(HP.y0, HP.y1, s[2]) + age * 0.3, -0.05 + (s[3] - 0.5) * 0.1); o.size = 0.04 + 0.08 * (1 - age); o.alpha = 1 - age; });
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    ...MO.anchors,
    cabinet: new V3(TC.x + 0.6, TC.y + 1.6, 1.0), display: new V3(TC.x - 0.3, TC.y + 1.85, 0.75), gauge: new V3(TC.x + 0.75, TC.y + 1.95, -0.2),
    pump: new V3(PP.x - 0.4, PP.y + 0.35, 0), heater: new V3(HP.x + 0.28, -2.5, 0), coil: new V3(HP.x + 0.15, -2.3, -0.02), valve: new V3(VP.x, VP.y + 0.55, 0), plunger: new V3(VP.x + 0.08, VP.y + 0.05, 0),
    sensor: new V3(-6.45, -1.75, 0), strainer: new V3(SP.x - 0.25, SP.y - 0.25, 0.3), seal: new V3(PP.x - 0.25, PP.y - 0.2, 0.2), puddle: new V3(PP.x - 0.1, -4.58, 1.6),
    supplyPort: new V3(-5.9, -1.8, 0.1), returnPort: new V3(-5.9, -3.9, 0.1), towerIn: new V3(-8.8, VP.y, 0.1), towerOut: new V3(-5.7, -4.3, 0.2),
    supplyHose: supplyC.getPointAt(0.55), returnHose: returnC.getPointAt(0.45), crack: crackAt.clone(),
    get sweep() { return sweepRing.position.clone(); },
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
