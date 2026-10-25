// General-purpose compressed air filter with float drain, plus the line upstream and a valve + cylinder downstream.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createStage, castSurface, tubeSolid, pipeSolid, rbox, flipGeo, qAlign, mulberry, smooth, clamp01, mix, plateGeo,
  buildLUT, Streaks, Puffs, SHARED, V3, X, Y, Z, csg, cylBetween, makeGauge,
} from 'series/look';
import { stateAt } from './story.js';

export const DIM = { portY: 2.55, bowlR: 1.08, bowlTop: 1.45, bowlBot: -2.6, elR: 0.62, elRin: 0.43, elTop: 1.0, elBot: -1.05, baffleY: -1.95, levelBase: -2.6, levelSpan: 2.25 };
const D = DIM;

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.03, floorY: -6.0, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-7, 9, 11); ST.lights.key.target.position.set(0.5, 0.3, 0); ST.lights.key.intensity = 520;

  // ------------------------------------------------ materials
  const alu = castSurface(new THREE.MeshStandardMaterial({ color: 0x8e979f, roughness: 0.38, metalness: 0.8, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.03, mottle: 0.1, key: 'alu' });
  const blackPlastic = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.55, clippingPlanes: clip, clipShadows: true });
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.FrontSide, clippingPlanes: clip });
  const cutClear = M.cut.clone(); cutClear.clippingPlanes = clip; cutClear.color.set(0x6f93a6); cutClear.onBeforeCompile = M.cut.onBeforeCompile;
  const elU = { uDirt: { value: 0.15 } };
  const elementMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xc8a46a, roughness: 0.9, metalness: 0.2, clippingPlanes: clip, clipShadows: true }), {
    freq: 9, bump: 0.7, mottle: 0.25, key: 'elem', uniforms: elU,
    extra: 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13,0.1,0.07)*(0.7+0.6*nLow), clamp(uDirt*smoothstep(0.2,0.8,texture2D(uNoiseTex, vWPos.xy*0.9+vWPos.z*0.4).a + uDirt*0.5), 0.0, 0.95));',
  });
  const cutEl = M.cut.clone(); cutEl.clippingPlanes = clip; cutEl.color.set(0x9a7a48); cutEl.onBeforeCompile = M.cut.onBeforeCompile;
  const floatMat = new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 0.5, clippingPlanes: clip, clipShadows: true });
  const waterFront = new THREE.MeshStandardMaterial({ color: 0x2d9fd0, roughness: 0.1, transparent: true, opacity: 0.38, depthWrite: false, clippingPlanes: clip });
  const waterBack = new THREE.MeshBasicMaterial({ color: 0x2a8fc0, transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false, clippingPlanes: clip });

  // ------------------------------------------------ head (machined aluminium with real passages)
  const py = D.portY;
  let head = rbox(3.6, 1.7, 2.8, 0.14); head.translate(0, 2.45, 0);
  const ring = csg(new THREE.CylinderGeometry(1.0, 1.0, 0.72, 64).translate(0, 1.95, 0), [['sub', new THREE.CylinderGeometry(0.6, 0.6, 0.9, 64).translate(0, 1.95, 0)]], 0);
  head = csg(head, [
    ['sub', cylBetween([-2.0, py, 0], [-0.8, py, 0], 0.42)],
    ['sub', cylBetween([-1.05, 1.55, 0], [-1.05, py + 0.25, 0], 0.3)],
    ['sub', ring],
    ['sub', cylBetween([0, 1.5, 0], [0, py + 0.2, 0], 0.42)],
    ['sub', cylBetween([0, py, 0], [2.0, py, 0], 0.42)],
  ]);
  const headM = addSolid(head, alu);
  // collar + bowl + guard
  const collar = addSolid(csg(tubeSolid(1.18, 1.46, 0.46, 96).translate(0, 1.2, 0), [], Math.PI / 5), alu);
  const bowl = new THREE.Mesh(mergeGeometries([tubeSolid(D.bowlR, 1.18, D.bowlTop - D.bowlBot, 96).translate(0, D.bowlBot, 0), plateGeo(1.18, 0.2, 0, 0, 0, 0.3).rotateX(Math.PI / 2).translate(0, D.bowlBot, 0)].map((g) => { g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv'); return g; })), bowlMat);
  bowl.renderOrder = 9; scene.add(bowl);
  const bowlCut = new THREE.Mesh(bowl.geometry, cutClear); bowlCut.renderOrder = -1; bowl.add(bowlCut); ST.cutMeshes.push(bowlCut);
  const guardG = csg(tubeSolid(1.24, 1.34, 4.2, 96).translate(0, -3.0, 0), [['sub', new THREE.BoxGeometry(0.9, 3.2, 1.0).translate(0, -1.0, 1.25)], ['sub', new THREE.BoxGeometry(0.9, 3.2, 1.0).translate(0, -1.0, -1.25)]], Math.PI / 5);
  const anod = castSurface(new THREE.MeshStandardMaterial({ color: 0x3b4148, roughness: 0.55, metalness: 0.6, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.03, mottle: 0.12, key: 'anod' });
  const guard = addSolid(guardG, anod);
  // MAX line printed on the bowl (visible through the sight window)
  const maxLine = new THREE.Mesh(new THREE.TorusGeometry(1.185, 0.016, 8, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd33a2c, clippingPlanes: clip }));
  maxLine.position.y = -1.75; scene.add(maxLine);
  // deflector vanes + centre tube
  addSolid(tubeSolid(D.elRin, 0.62, 0.55, 64).translate(0, 1.0, 0), blackPlastic);
  {
    const g = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = new THREE.BoxGeometry(0.42, 0.3, 0.035); b.rotateX(0.65); b.translate(0.84, 0, 0); b.rotateY(a); b.translate(0, 1.32, 0);
      g.push(b);
    }
    addSolid(mergeGeometries(g), blackPlastic);
  }
  // element (sintered), end cap, stud
  const elem = addSolid(tubeSolid(D.elRin, D.elR, D.elTop - D.elBot, 96).translate(0, D.elBot, 0), elementMat, cutEl);
  const endCap = addSolid(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 64).translate(0, D.elBot - 0.06, 0), blackPlastic);
  const stud = addSolid(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 16).translate(0, D.elBot - 0.5, 0), M.zinc, M.cutSteel);
  // baffle (quiet-zone separator)
  const baffle = addSolid(new THREE.CylinderGeometry(0.3, 0.97, 0.22, 64).translate(0, D.baffleY, 0), blackPlastic);
  // float drain: cage, float, needle, body, nozzle, test button
  {
    const g = [];
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.push(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8).translate(Math.cos(a) * 0.42, -2.3, Math.sin(a) * 0.42)); }
    g.push(new THREE.TorusGeometry(0.42, 0.03, 8, 48).rotateX(Math.PI / 2).translate(0, -1.99, 0));
    addSolid(mergeGeometries(g), blackPlastic, null);
  }
  const floatG = new THREE.Group(); scene.add(floatG);
  addSolid(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 48), floatMat, M.cut, floatG);
  addSolid(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 12).translate(0, -0.3, 0), M.zinc, M.cutSteel, floatG);
  const drainBody = addSolid(csg(new THREE.CylinderGeometry(0.26, 0.26, 0.55, 48).translate(0, D.bowlBot - 0.55, 0), [['sub', new THREE.CylinderGeometry(0.07, 0.07, 1.0, 16).translate(0, D.bowlBot - 0.55, 0)]], 0.6), M.brass);
  const nozzle = addSolid(tubeSolid(0.05, 0.09, 0.4, 24).translate(0, D.bowlBot - 1.2, 0), M.brass);
  const testBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 24).rotateZ(Math.PI / 2), M.red);
  scene.add(testBtn);
  // water in the bowl (scaled by level)
  const water = new THREE.Group(); water.position.y = D.levelBase; scene.add(water);
  const wGeo = new THREE.CylinderGeometry(D.bowlR - 0.012, D.bowlR - 0.012, 1, 96).translate(0, 0.5, 0);
  const wF = new THREE.Mesh(wGeo, waterFront); wF.renderOrder = 7; water.add(wF);
  const wB = new THREE.Mesh(wGeo, waterBack); wB.renderOrder = 6; water.add(wB);
  // sludge around the float
  const sludgeGeo = new THREE.TorusGeometry(0.62, 0.22, 16, 64); { const p = sludgeGeo.attributes.position; const r = mulberry(4); for (let i = 0; i < p.count; i++) { const f = 1 + (r() - 0.5) * 0.5; p.setXYZ(i, p.getX(i) * (1 + (f - 1) * 0.2), p.getY(i) * f, p.getZ(i) * (1 + (f - 1) * 0.2)); } sludgeGeo.computeVertexNormals(); }
  sludgeGeo.rotateX(Math.PI / 2);
  const sludge = new THREE.Mesh(sludgeGeo, new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 1, clippingPlanes: clip }));
  sludge.position.y = D.bowlBot + 0.12; scene.add(sludge);

  // ------------------------------------------------ pipework, gauges, upstream valve, downstream valve + cylinder
  const pipeR = 0.4, pipeRi = 0.31;
  addSolid(pipeSolid([[-10.5, py, 0], [-1.8, py, 0]], pipeRi, pipeR, 0.5, 48), M.pipe);
  addSolid(pipeSolid([[1.8, py, 0], [6.3, py, 0]], pipeRi, pipeR, 0.5, 48), M.pipe);
  for (const x of [-2.05, 2.05]) addSolid(toCreasedNormals(tubeSolid(pipeRi, 0.5, 0.4, 6), 0.4).rotateZ(Math.PI / 2).translate(x + 0.2, py, 0), M.brass);
  // ΔP gauge on the head
  const dpG = makeGauge({ name: 'ΔP', unit: 'bar', max: 1, redFrom: 0.7, R: 0.55, fontFamily, M, shadows });
  dpG.group.position.set(0, 4.25, 0.15); scene.add(dpG.group);
  const dpStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 16), M.zincNoClip); dpStem.position.set(0, 3.5, 0.0); scene.add(dpStem);
  // inlet pressure gauge
  const pInG = makeGauge({ name: 'P', unit: 'bar', max: 10, redFrom: 0.9, R: 0.55, fontFamily, M, shadows });
  pInG.group.position.set(-3.6, py + 1.5, 0.15); scene.add(pInG.group);
  const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 16), M.zincNoClip); pStem.position.set(-3.6, py + 0.75, 0); scene.add(pStem);
  // upstream shut-off ball valve
  const sv = addSolid(csg(new THREE.SphereGeometry(0.55, 48, 24), [['sub', cylBetween([-1, 0, 0], [1, 0, 0], 0.31)]], 0.7), M.brass); sv.position.set(-6.0, py, 0);
  const svLever = new THREE.Group(); svLever.position.set(-6.0, py, 0); scene.add(svLever);
  svLever.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12).rotateX(Math.PI / 2).translate(0, 0, 0.62), M.zincNoClip));
  svLever.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.05).translate(0.65, 0, 0.88), M.zincNoClip));
  svLever.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.7, 6, 12).rotateZ(Math.PI / 2).translate(1.05, 0, 0.88), M.red));
  // downstream: solenoid valve block, muffler, cylinder
  const vb = addSolid(rbox(1.2, 1.3, 1.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x2c4f7a, roughness: 0.45, metalness: 0.3, clippingPlanes: clip })); vb.position.set(6.9, py, 0);
  const coil = addSolid(rbox(0.8, 0.9, 0.9, 0.06), blackPlastic); coil.position.set(6.9, py + 1.05, 0);
  const muff = addSolid(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 24).rotateZ(Math.PI / 2).translate(7.8, py - 0.3, 0), new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.9, clippingPlanes: clip }));
  addSolid(pipeSolid([[6.9, py - 0.65, 0], [6.9, 0.85, 0], [6.25, 0.85, 0], [6.25, 0.25, 0]], 0.1, 0.15, 0.25, 24), M.pipe);
  const barrel = addSolid(tubeSolid(0.5, 0.58, 4.4, 64).rotateZ(-Math.PI / 2).translate(5.9, -0.25, 0), alu);
  for (const x of [5.75, 10.45]) addSolid(rbox(0.3, 1.35, 1.35, 0.06).translate(x, -0.25, 0), alu);
  const piston = new THREE.Group(); scene.add(piston);
  addSolid(new THREE.CylinderGeometry(0.49, 0.49, 0.3, 48).rotateZ(Math.PI / 2), blackPlastic, M.cut, piston);
  addSolid(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 24).rotateZ(Math.PI / 2).translate(2.3, 0, 0), M.chrome, M.cutSteel, piston);
  // stand
  for (const x of [-8.0, 4.2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, py + 6.0 - 0.45, 0.4), M.support); s.position.set(x, (py - 0.45 - 6.0) / 2, -0.6); s.castShadow = shadows; scene.add(s); }

  // ------------------------------------------------ particle paths
  const R = mulberry(77);
  const airCol = new THREE.Color(0xc6d8e6).multiplyScalar(0.95), cleanCol = new THREE.Color(0x9fe8ff).multiplyScalar(1.2);
  const helix = (r, a0, yTop, yBot, turns, n = 10) => { const pts = []; for (let k = 0; k <= n; k++) { const f = k / n; const a = a0 + f * turns * Math.PI * 2; pts.push(new V3(Math.cos(a) * r, mix(yTop, yBot, f), Math.sin(a) * r)); } return pts; };
  const inletPts = (o) => [new V3(-11, py, 0).add(o), new V3(-6.0, py, 0).add(o), new V3(-1.4, py, 0).add(o.clone().multiplyScalar(0.6)), new V3(-1.05, py - 0.2, 0), new V3(-1.0, 1.8, 0.05)];
  const AIR = [], DROP = [], DIRT = [], CARRY = [];
  for (let j = 0; j < 46; j++) {
    const o = new V3(0, R() - 0.5, R() - 0.5).multiplyScalar(0.42);
    const a0 = Math.PI + (R() - 0.5) * 0.4, yExit = mix(D.elTop - 0.15, D.elBot + 0.15, R());
    const pts = [...inletPts(o), ...helix(0.84, a0, 1.45, yExit, 0.6 + 0.6 * R(), 8)];
    const last = pts[pts.length - 1]; const ang = Math.atan2(last.z, last.x);
    pts.push(new V3(Math.cos(ang) * 0.5, yExit, Math.sin(ang) * 0.5), new V3(Math.cos(ang) * 0.2, yExit + 0.3, Math.sin(ang) * 0.2), new V3(0, D.elTop + 0.2, 0), new V3(0.05, py - 0.1, 0), new V3(1.0, py, 0).add(o.clone().multiplyScalar(0.6)), new V3(6.3, py, 0).add(o));
    AIR.push(buildLUT(pts, (p) => (p.y < 1.5 && Math.abs(p.x) < 1.2 ? 0.45 : 1), 300));
    // droplets: flung to the wall, run down, into the quiet zone
    const dpts = [...inletPts(o), ...helix(mix(0.85, 1.02, R()), a0, 1.45, 0.9, 0.4, 4)];
    const dl = dpts[dpts.length - 1]; const da = Math.atan2(dl.z, dl.x);
    dpts.push(...helix(1.03, da, 0.8, D.baffleY + 0.05, 0.25 + 0.2 * R(), 8).slice(1));
    const fa = da + 0.5; dpts.push(new V3(Math.cos(fa) * 0.95, D.baffleY - 0.25, Math.sin(fa) * 0.95), new V3(Math.cos(fa) * 0.75, -2.35, Math.sin(fa) * 0.75));
    DROP.push(buildLUT(dpts, (p) => (p.y < 1.0 && Math.abs(p.x) < 1.2 ? 0.22 : 1), 300));
    // fine dirt: swirl then stick on the element skin
    const fpts = [...inletPts(o), ...helix(0.8, a0, 1.45, yExit, 0.5, 6)];
    const fl = fpts[fpts.length - 1]; const fang = Math.atan2(fl.z, fl.x);
    fpts.push(new V3(Math.cos(fang) * 0.645, yExit, Math.sin(fang) * 0.645));
    DIRT.push(buildLUT(fpts, (p) => (Math.abs(p.x) < 1.2 && p.y < 1.5 ? 0.4 : 1), 200));
    // carry-over: picked up from the flooded bowl and sent downstream
    const ca = R() * Math.PI * 2;
    const cpts = [new V3(Math.cos(ca) * 0.9, -1.2, Math.sin(ca) * 0.9), ...helix(0.8, ca, -1.0, mix(-0.8, 0.6, R()), 0.5, 5)];
    const cl = cpts[cpts.length - 1]; const cang = Math.atan2(cl.z, cl.x);
    cpts.push(new V3(Math.cos(cang) * 0.3, cl.y + 0.2, Math.sin(cang) * 0.3), new V3(0, D.elTop + 0.2, 0), new V3(0.05, py - 0.1, 0), new V3(2.0, py, 0).add(o.clone().multiplyScalar(0.5)), new V3(6.5, py, 0).add(o.clone().multiplyScalar(0.5)),
      new V3(6.9, py - 0.4, 0), new V3(6.9, 0.85, 0), new V3(6.25, 0.85, 0), new V3(6.25, 0.2, 0), new V3(mix(6.3, 8.5, R()), -0.62, mix(-0.3, -0.05, R())));
    CARRY.push(buildLUT(cpts, (p) => (p.x > 6 ? 0.5 : 1), 260));
  }
  const air = new Streaks(scene, { paths: AIR, count: 620, material: M.streak, seed: 1, speed: 2.6, radius: 0.016, lenMin: 0.1, lenMax: 0.22, colorFn: (p, u, w, c) => {
    // dusty/wet before the element, clean after
    const k = smooth(0.62, 0.72, u); c.copy(airC2(p)).lerp(cleanCol, k);
  } });
  function airC2() { return airCol; }
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x2f9fe0, emissive: 0x0b3f66, roughness: 0.1, metalness: 0, clippingPlanes: clip });
  const oilMat = new THREE.MeshStandardMaterial({ color: 0xd99a2b, emissive: 0x3a2200, roughness: 0.15, clippingPlanes: clip });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a3518, roughness: 0.9, clippingPlanes: clip });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 1, clippingPlanes: clip });
  const drops = new Streaks(scene, { paths: DROP, count: 260, material: dropMat, dots: true, radius: 0.04, seed: 2, speed: 2.0 });
  const oil = new Streaks(scene, { paths: DROP, count: 70, material: oilMat, dots: true, radius: 0.032, seed: 3, speed: 2.0 });
  const rust = new Streaks(scene, { paths: DROP, count: 60, material: rustMat, dots: true, radius: 0.03, seed: 4, speed: 2.0 });
  const dirt = new Streaks(scene, { paths: DIRT, count: 160, material: dirtMat, dots: true, radius: 0.018, seed: 5, speed: 2.0 });
  const carry = new Streaks(scene, { paths: CARRY, count: 260, material: dropMat, dots: true, radius: 0.04, seed: 6, speed: 1.8 });
  // condensation forming on the inlet pipe wall
  const COND = [];
  for (let j = 0; j < 40; j++) { const a = R() * Math.PI * 2, x0 = mix(-10, -2.4, R()); COND.push(buildLUT([new V3(x0, py + Math.sin(a) * 0.29, Math.cos(a) * 0.29 * -1), new V3(x0 + 0.6, py + Math.sin(a) * 0.29 - 0.02, -Math.abs(Math.cos(a) * 0.29))], () => 1, 10)); }
  const cond = new Streaks(scene, { paths: COND, count: 160, material: dropMat, dots: true, radius: 0.028, seed: 7, speed: 0.05 });
  // drain stream
  const DUMP = [];
  for (let j = 0; j < 10; j++) { const o = new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.08); DUMP.push(buildLUT([new V3(0, -2.3, 0).add(o), new V3(0, D.bowlBot - 0.6, 0).add(o), new V3(0, D.bowlBot - 1.45, 0).add(o), new V3(o.x * 6, -5.9, o.z * 6)], () => 1, 40)); }
  const dumpS = new Streaks(scene, { paths: DUMP, count: 120, material: M.streak, seed: 8, speed: 3.6, radius: 0.012, colorFn: (p, u, w, c) => c.setRGB(0.4, 1.0, 1.4) });
  // puffs: test-button spit, muffler spit, depressurise hiss
  const spit = new Puffs(scene, { count: 70, color: 0xdcecf5, opacity: 0.0, size: 0.4 });
  const muffMist = new Puffs(scene, { count: 70, color: 0xcfe2ee, opacity: 0.0, size: 0.4 });
  const hiss = new Puffs(scene, { count: 60, color: 0xe0eaf0, opacity: 0.0, size: 0.5 });

  // ------------------------------------------------ update
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    const range = opts.cutRange || [1.7, 0];
    ST.setCut(cut, range[0], range[1]);
    ST.lights.sectionLight.intensity = 0;
    elU.uDirt.value = st.dirt;
    dpG.set(st.dp); pInG.set(st.pIn);
    // water level, float, drain
    const lvl = st.level;
    const h = Math.max(0.001, lvl * D.levelSpan);
    water.scale.y = h; water.visible = h > 0.01;
    const floatLift = st.stuck > 0.5 ? 0.0 : clamp01((lvl - 0.24) / 0.12) * 0.22;
    floatG.position.set(0, -2.32 + floatLift + st.dump * 0.05, 0);
    sludge.visible = st.sludge > 0.01; sludge.scale.setScalar(0.4 + 0.6 * st.sludge);
    testBtn.position.set(0.3 - 0.07 * st.testBtn, D.bowlBot - 0.5, 0);
    svLever.rotation.y = -Math.PI / 2 * st.shutoff;
    // bowl twist-off
    const tw = st.bowlOpen;
    for (const m of [bowl, guard, water, floatG, maxLine, baffle, sludge]) { m.rotation.y = tw * 0.9; }
    const drop = tw * 0.12;
    bowl.position.y = -drop; guard.position.y = -drop; water.position.y = D.levelBase - drop; maxLine.position.y = -1.75 - drop;
    // cylinder strokes
    const strokeT = (t * 0.55) % 1; const stroke = strokeT < 0.5 ? smooth(0, 0.18, strokeT) : 1 - smooth(0.5, 0.68, strokeT);
    piston.position.set(6.2 + stroke * 2.6, -0.25, 0);
    // particles
    const cam = opts.camPos || null;
    air.update({ tau: t * (st.pIn / 7) * (1 - 0.3 * st.clog), camPos: cam, vis: opts.air ?? 1 });
    drops.update({ tau: t, camPos: cam, vis: 0.15 + 0.85 * st.condense });
    oil.update({ tau: t, camPos: cam, vis: 0.1 + 0.9 * st.condense });
    rust.update({ tau: t, camPos: cam, vis: 0.1 + 0.9 * st.condense });
    dirt.update({ tau: t, camPos: cam });
    carry.update({ tau: t, camPos: cam, vis: st.carry });
    cond.update({ tau: t, camPos: cam, vis: st.condense });
    dumpS.update({ tau: t, camPos: cam, vis: st.dump });
    spit.mat.uniforms.uOpacity.value = 0.32 * st.testBtn;
    spit.update((i, s, o) => { const age = ((t / 0.7 + s[0]) % 1); o.p.set((s[1] - 0.5) * 0.6 * age, D.bowlBot - 1.45 - age * 1.4, (s[2] - 0.5) * 0.6 * age); o.size = 0.25 + age; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.5, 1, age)); });
    const mm = st.carry * (strokeT > 0.48 && strokeT < 0.7 ? 1 : 0.15);
    muffMist.mat.uniforms.uOpacity.value = 0.3 * mm;
    muffMist.update((i, s, o) => { const age = ((t / 0.8 + s[0]) % 1); o.p.set(8.1 + age * 1.6, py - 0.3 + (s[1] - 0.5) * 0.5 * age, (s[2] - 0.5) * 0.5 * age); o.size = 0.2 + age * 0.9; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.5, 1, age)); });
    const hs = smooth(67.6, 67.9, t) * (1 - smooth(68.6, 69.0, t));
    hiss.mat.uniforms.uOpacity.value = 0.28 * hs;
    hiss.update((i, s, o) => { const age = ((t / 0.6 + s[0]) % 1); o.p.set(0.0 + (s[1] - 0.5) * 0.6 * age, D.bowlBot - 1.45 - age * 1.2, (s[2] - 0.5) * 0.4 * age); o.size = 0.25 + age; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.5, 1, age)); });
    ST.updateDust(t);
    return { ...st, cut };
  }

  const anchors = {
    head: new V3(0, 2.6, 0), inlet: new V3(-3.0, py, 0), outlet: new V3(3.0, py, 0), deflector: new V3(-0.85, 1.32, -0.2), bowl: new V3(-1.05, 0.2, -0.25),
    element: new V3(0.62, 0.1, -0.1), elementTop: new V3(0, D.elTop + 0.3, 0), baffle: new V3(0.8, D.baffleY, -0.1), quiet: new V3(0.55, -2.3, -0.2),
    float: new V3(0.3, -2.3, 0), drain: new V3(0, D.bowlBot - 1.3, 0), testBtn: new V3(0.38, D.bowlBot - 0.5, 0), maxLine: new V3(0.0, -1.75, 1.18),
    dpGauge: new V3(0, 4.25, 0.4), pGauge: new V3(-3.6, py + 1.5, 0.4), valve: new V3(-6.0, py, 0.9), cylinder: new V3(8.0, -0.25, -0.1), muffler: new V3(8.1, py - 0.3, 0),
    water: new V3(-2.6, py - 0.15, -0.1), oil: new V3(-1.9, py + 0.05, -0.1), rust: new V3(-3.4, py - 0.1, -0.1), carry: new V3(4.0, py, 0),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
