// Hydraulic return-line filter on a power-unit tank, plus macro rigs: gear pump, spool valve, oil sample.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, clamp01, mix, plateGeo,
  buildLUT, Streaks, Puffs, SHARED, V3, X, Y, Z, csg, cylBetween, makeGauge,
} from 'series/look';
import { stateAt } from './story.js';

export const RIG = { pump: new V3(40, 0, 0), valve: new V3(60, 0, 0), bottle: new V3(80, 0, 0) };
const EL = { ro: 0.8, ri: 0.48, N: 36, y0: -3.3, y1: -0.15, core: 0.44 };

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.028, floorY: -4.3, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-6, 10, 12); ST.lights.key.target.position.set(-0.6, -0.6, 0); ST.lights.key.intensity = 520; ST.lights.key.angle = 0.7;

  // stepped section for the element: remove only the front-top quarter (z > cut AND y > slice)
  const slicePlane = new THREE.Plane(new V3(0, -1, 0), 0.05);
  const sclip = [ST.clipPlane, slicePlane];
  const stepMat = (m) => { m.clippingPlanes = sclip; m.clipIntersection = true; m.clipShadows = true; return m; };
  const stepCut = (color) => { const c = M.cut.clone(); c.color.set(color); c.onBeforeCompile = M.cut.onBeforeCompile; c.clippingPlanes = sclip; c.clipIntersection = true; return c; };

  // ------------------------------------------------ materials
  const paint = castSurface(new THREE.MeshStandardMaterial({ color: 0x2e5d8a, roughness: 0.5, metalness: 0.25, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.05, mottle: 0.12, key: 'paint' });
  const alu = castSurface(new THREE.MeshStandardMaterial({ color: 0x8e979f, roughness: 0.38, metalness: 0.8, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.03, mottle: 0.1, key: 'alu' });
  const cutAlu = M.cut.clone(); cutAlu.clippingPlanes = clip; cutAlu.color.set(0x7d8791); cutAlu.onBeforeCompile = M.cut.onBeforeCompile;
  const elU = { uDirt: { value: 0.1 } };
  const mediaMat = stepMat(castSurface(new THREE.MeshStandardMaterial({ color: 0xe6dcc2, roughness: 0.92, metalness: 0.0 }), {
    freq: 7, bump: 0.25, mottle: 0.18, key: 'media', uniforms: elU,
    extra: 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2,0.16,0.11)*(0.7+0.6*nLow), clamp(uDirt*(0.55+0.45*smoothstep(0.1,0.9,texture2D(uNoiseTex, vWPos.xy*1.3+vWPos.z*0.5).a)) * (0.75 + 0.25*smoothstep(-0.2,-3.3,vWPos.y)), 0.0, 0.9));',
  }));
  const cutMedia = stepCut(0xcbb682);
  const capMat = stepMat(new THREE.MeshStandardMaterial({ color: 0x9aa3ac, roughness: 0.35, metalness: 0.85 }));
  const cutCap = stepCut(0x8c959f);
  const springMat = stepMat(new THREE.MeshStandardMaterial({ color: 0xc8ced6, roughness: 0.3, metalness: 0.9 }));
  const poppetMat = stepMat(new THREE.MeshStandardMaterial({ color: 0xd8a24a, roughness: 0.3, metalness: 0.9 }));
  const cutPoppet = stepCut(0xc9893a);
  const oilBack = new THREE.MeshBasicMaterial({ color: 0xc98a1c, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false, clippingPlanes: clip });

  // ------------------------------------------------ tank (cut) with oil
  const TK = { x0: -6.0, x1: 2.4, y0: -4.2, y1: 0.0, z: 2.2, w: 0.12 };
  const tankW = TK.x1 - TK.x0, tankC = (TK.x0 + TK.x1) / 2;
  let tankG = csg(new THREE.BoxGeometry(tankW, TK.y1 - TK.y0, TK.z * 2).translate(tankC, (TK.y0 + TK.y1) / 2, 0), [
    ['sub', new THREE.BoxGeometry(tankW - 2 * TK.w, TK.y1 - TK.y0 - 2 * TK.w, TK.z * 2 - 2 * TK.w).translate(tankC, (TK.y0 + TK.y1) / 2, 0)],
    ['sub', new THREE.CylinderGeometry(1.09, 1.09, 1, 64).translate(0, 0, 0)],
    ['sub', new THREE.CylinderGeometry(0.2, 0.2, 1, 24).translate(-3.7, 0, 0)],
  ], 0);
  addSolid(tankG, paint);
  const oilBody = new THREE.Mesh(new THREE.BoxGeometry(tankW - 0.3, 3.1, TK.z * 2 - 0.3).translate(tankC, -2.6, 0), oilBack); oilBody.renderOrder = 2; scene.add(oilBody); ST.fluids.push(oilBody);
  const oilTopMat = new THREE.MeshStandardMaterial({ color: 0x8a5a12, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false, clippingPlanes: clip });
  const oilTop = new THREE.Mesh(new THREE.PlaneGeometry(tankW - 0.25, TK.z * 2 - 0.25, 1, 1).rotateX(-Math.PI / 2).translate(tankC, -1.05, 0), oilTopMat); oilTop.renderOrder = 3; scene.add(oilTop); ST.fluids.push(oilTop);
  // feet
  for (const x of [TK.x0 + 0.4, TK.x1 - 0.4]) for (const z of [-1.8, 1.8]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.35), M.support); f.position.set(x, -4.26, z); scene.add(f); }

  // ------------------------------------------------ filter head, cover, bowl
  const lid = new THREE.Group(); scene.add(lid);
  let head = rbox(2.7, 1.05, 2.7, 0.12); head.translate(0, 0.52, 0);
  head = csg(head, [
    ['sub', new THREE.CylinderGeometry(0.98, 0.98, 1.4, 64).translate(0, 0.45, 0)],
    ['sub', cylBetween([-1.6, 0.5, 0], [-0.7, 0.5, 0], 0.27)],
  ]);
  addSolid(head, alu, cutAlu);
  addSolid(plateGeo(1.25, 0, 1.05, 0.06, 8, 0.24).rotateX(-Math.PI / 2).translate(0, 1.04, 0), alu, cutAlu, lid);
  {
    const g = []; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * 2 * Math.PI) / 8; g.push(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 6).translate(Math.cos(a) * 1.05, 1.36, Math.sin(a) * 1.05)); }
    addSolid(mergeGeometries(g), M.zinc, M.cutSteel, lid);
  }
  // ΔP indicator on the cover
  const dpG = makeGauge({ name: 'ΔP', unit: 'bar', max: 4, redFrom: 0.62, R: 0.5, fontFamily, M, shadows });
  dpG.group.position.set(0.0, 2.0, 0.1); dpG.group.rotation.x = -0.14; lid.add(dpG.group);
  const dpStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16), M.zincNoClip); dpStem.position.set(0, 1.6, 0.0); lid.add(dpStem);
  // bowl hanging into the tank, with outlet spigot
  addSolid(tubeSolid(1.0, 1.08, 3.62, 96).translate(0, -3.52, 0), M.steel, M.cutSteel);
  addSolid(tubeSolid(0.36, 1.08, 0.12, 96).translate(0, -3.64, 0), M.steel, M.cutSteel);
  addSolid(tubeSolid(0.36, 0.43, 0.45, 64).translate(0, -4.05, 0), M.steel, M.cutSteel);
  const bowlOil = new THREE.Mesh(new THREE.CylinderGeometry(0.99, 0.99, 4.4, 48).translate(0, -1.6, 0), oilBack); bowlOil.renderOrder = 2; scene.add(bowlOil); ST.fluids.push(bowlOil);

  // ------------------------------------------------ element (pleated media, caps, core, bypass valve)
  const elG = new THREE.Group(); scene.add(elG);
  const pleatGeo = () => {
    const parts = [], th = 0.022, H = EL.y1 - EL.y0;
    const at = (r, a) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    for (let k = 0; k < EL.N; k++) {
      const ao = (k / EL.N) * Math.PI * 2, ai = ((k + 0.5) / EL.N) * Math.PI * 2, ao2 = ((k + 1) / EL.N) * Math.PI * 2;
      for (const [A, B] of [[at(EL.ro, ao), at(EL.ri, ai)], [at(EL.ri, ai), at(EL.ro, ao2)]]) {
        const d = B.clone().sub(A), L = d.length() + th;
        const b = new THREE.BoxGeometry(L, H, th);
        b.rotateY(Math.atan2(-d.y, d.x)); b.translate((A.x + B.x) / 2, (EL.y0 + EL.y1) / 2, (A.y + B.y) / 2);
        parts.push(b);
      }
    }
    return mergeGeometries(parts);
  };
  addSolid(pleatGeo(), mediaMat, cutMedia, elG);
  addSolid(tubeSolid(0.22, 0.86, 0.1, 96).translate(0, EL.y1, 0), capMat, cutCap, elG);
  addSolid(tubeSolid(0.34, 0.86, 0.1, 96).translate(0, EL.y0 - 0.1, 0), capMat, cutCap, elG);
  addSolid(tubeSolid(0.34, 0.4, 0.3, 48).translate(0, EL.y0 - 0.38, 0), capMat, cutCap, elG);
  // perforated core
  const holeTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 512); x.fillStyle = '#000';
    for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(16 + i * 32 + (j % 2) * 16, 16 + j * 32, 10, 0, Math.PI * 2); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 5); return t;
  })();
  const coreMat = stepMat(new THREE.MeshStandardMaterial({ color: 0x8d969f, roughness: 0.4, metalness: 0.8, alphaMap: holeTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(EL.core, EL.core, EL.y1 - EL.y0, 48, 1, true).translate(0, (EL.y0 + EL.y1) / 2, 0), coreMat);
  core.castShadow = shadows; elG.add(core);
  // bypass: poppet under the top-cap seat, spring below it, retainer bar
  const poppet = new THREE.Group(); elG.add(poppet);
  addSolid(new THREE.CylinderGeometry(0.29, 0.29, 0.07, 48).translate(0, -0.035, 0), poppetMat, cutPoppet, poppet);
  addSolid(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 48).translate(0, 0.03, 0), poppetMat, cutPoppet, poppet);
  addSolid(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 16).translate(0, -0.3, 0), springMat, cutCap, poppet);
  poppet.position.y = EL.y1 - 0.02;
  const springBase = EL.y1 - 0.95;
  const springMesh = (() => {
    const pts = []; const n = 7, r = 0.17;
    for (let i = 0; i <= n * 24; i++) { const f = i / (n * 24); const a = f * n * Math.PI * 2; pts.push(new V3(Math.cos(a) * r, f, Math.sin(a) * r)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 24, 0.028, 8, false);
    const m = new THREE.Mesh(g, springMat); m.castShadow = shadows; m.position.y = springBase; elG.add(m); return m;
  })();
  addSolid(new THREE.BoxGeometry(0.86, 0.06, 0.12).translate(0, springBase - 0.03, 0), capMat, cutCap, elG);
  // seal (O-ring) at the top cap rim
  const oringMat = stepMat(new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, emissive: 0x00e0ff, emissiveIntensity: 0 }));
  const oring = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.04, 12, 96).rotateX(Math.PI / 2).translate(0, EL.y1 + 0.05, 0), oringMat); elG.add(oring);
  // trapped dirt on the outside of the pleats
  const R = mulberry(5);
  const TRAP_N = 900;
  const trapMat = stepMat(new THREE.MeshStandardMaterial({ color: 0x2f261c, roughness: 1 }));
  const trapped = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.017, 0), trapMat, TRAP_N);
  const trapRank = [];
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3();
    for (let i = 0; i < TRAP_N; i++) {
      const k = Math.floor(R() * EL.N), ao = (k / EL.N) * Math.PI * 2, ai = ((k + 0.5) / EL.N) * Math.PI * 2, ao2 = ((k + 1) / EL.N) * Math.PI * 2;
      const A = new V3(Math.cos(ao) * EL.ro, 0, Math.sin(ao) * EL.ro), B = new V3(Math.cos(ai) * EL.ri, 0, Math.sin(ai) * EL.ri), C = new V3(Math.cos(ao2) * EL.ro, 0, Math.sin(ao2) * EL.ro);
      const sAlong = R() * 0.85, p = A.clone().lerp(B, sAlong);
      const d = B.clone().sub(A); let n = new V3(-d.z, 0, d.x).normalize(); if (n.dot(C.clone().sub(A)) < 0) n.negate();
      p.addScaledVector(n, 0.02); p.y = mix(EL.y0 + 0.05, EL.y1 - 0.08, Math.pow(R(), 0.8));
      s.setScalar(0.7 + R() * 0.9); q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6));
      m.compose(p, q, s); trapped.setMatrixAt(i, m); trapRank.push(R());
    }
  }
  const trapBase = []; for (let i = 0; i < TRAP_N; i++) { const m = new THREE.Matrix4(); trapped.getMatrixAt(i, m); trapBase.push(m); }
  trapped.frustumCulled = false; elG.add(trapped);

  // ------------------------------------------------ power unit: pump, motor, manifold, actuators
  const hpu = new THREE.Group(); scene.add(hpu);
  const motorMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.5, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 1, bump: 0.05, mottle: 0.1, key: 'motor' });
  {
    const fins = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; fins.push(new THREE.BoxGeometry(1.3, 0.06, 0.16).translate(0, 0.62, 0).rotateX(a)); }
    const motor = mergeGeometries([new THREE.CylinderGeometry(0.6, 0.6, 1.5, 48).rotateZ(Math.PI / 2), ...fins.map((g) => g.toNonIndexed())].map((g) => { g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
    const mm = addSolid(motor, motorMat, null, hpu); mm.position.set(-5.2, 0.78, 0);
    const bell = addSolid(new THREE.CylinderGeometry(0.42, 0.55, 0.5, 48).rotateZ(Math.PI / 2), alu, null, hpu); bell.position.set(-4.2, 0.78, 0);
    const foot = addSolid(rbox(1.6, 0.18, 1.1, 0.04), M.machined, null, hpu); foot.position.set(-5.2, 0.09, 0);
  }
  const pumpBody = addSolid(rbox(0.75, 0.8, 0.85, 0.08), alu, cutAlu, hpu); pumpBody.position.set(-3.7, 0.78, 0);
  addSolid(pipeSolid([[-3.7, 0.38, 0], [-3.7, -3.2, 0]], 0.13, 0.18, 0.3, 24), M.pipe, M.cutDark, hpu);
  const strainer = addSolid(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 32).translate(-3.7, -3.5, 0), new THREE.MeshStandardMaterial({ color: 0x6b7077, roughness: 0.6, metalness: 0.6, clippingPlanes: clip, wireframe: false }), M.cutDark, hpu);
  addSolid(pipeSolid([[-3.7, 1.15, 0], [-3.7, 3.82, 0]], 0.14, 0.2, 0.3, 24), M.pipe, M.cutDark);
  // manifold + solenoid valves
  const mani = addSolid(rbox(3.4, 0.8, 1.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 0.45, metalness: 0.6, clippingPlanes: clip }), cutAlu); mani.position.set(-2.6, 4.22, 0);
  const VX = [-3.6, -2.6, -1.6];
  for (const x of VX) {
    const v = addSolid(rbox(0.6, 0.42, 0.7, 0.05), new THREE.MeshStandardMaterial({ color: 0x2b4e7a, roughness: 0.45, metalness: 0.3, clippingPlanes: clip }), M.cut); v.position.set(x, 4.83, 0);
    const c = addSolid(rbox(0.36, 0.36, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, clippingPlanes: clip }), M.cutDark); c.position.set(x, 5.2, 0);
  }
  // return line: manifold -> down -> filter head inlet
  addSolid(pipeSolid([[-1.8, 3.82, 0], [-1.8, 0.5, 0], [-1.1, 0.5, 0]], 0.2, 0.27, 0.45, 32), M.pipe, M.cutDark);
  // actuators: clamp, injection, ejectors
  const ACT = [{ y: 9.2, r: 0.5, name: 'clamp', stroke: 1.4, ph: 0.0 }, { y: 7.75, r: 0.4, name: 'injection', stroke: 1.1, ph: 0.33 }, { y: 6.45, r: 0.3, name: 'ejectors', stroke: 0.7, ph: 0.66 }];
  const cylMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x8f2f2a, roughness: 0.45, metalness: 0.35 }), { freq: 1, bump: 0.04, mottle: 0.1, key: 'cylpaint' });
  const rods = [];
  ACT.forEach((a, k) => {
    const g = new THREE.Group(); g.position.set(0, a.y, -0.2); scene.add(g);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(a.r, a.r, 4.0, 48).rotateZ(Math.PI / 2).translate(-2.4, 0, 0), cylMat); b.castShadow = shadows; b.receiveShadow = shadows; g.add(b);
    for (const x of [-4.45, -0.35]) { const c = new THREE.Mesh(rbox(0.3, a.r * 2.4, a.r * 2.4, 0.05), M.machined.clone()); c.material.clippingPlanes = []; c.position.x = x; c.castShadow = shadows; g.add(c); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(a.r * 0.4, a.r * 0.4, 3.0, 24).rotateZ(Math.PI / 2).translate(1.5 - 0.6, 0, 0), M.zincNoClip); rod.castShadow = shadows; g.add(rod);
    const load = new THREE.Mesh(rbox(0.5, a.r * 3.0, a.r * 3.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.5, metalness: 0.5 })); load.position.x = 2.4; rod.add(load);
    rods.push({ rod, a });
    // feed pipe from its valve, routed behind the cylinders
    const x = VX[k];
    const p = new THREE.Mesh(pipeSolid([[x, 5.38, -0.2], [x, 5.7, -0.95], [x, a.y, -0.95], [x, a.y, -0.2 - a.r * 0.6]], 0.08, 0.12, 0.25, 16), M.pipe.clone()); p.material.clippingPlanes = []; p.castShadow = shadows; scene.add(p);
  });

  // ------------------------------------------------ macro rig: gear pump (unclipped, cover off)
  const rigSpots = [];
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigLight = (pos, tgt) => rigSpots.push({ pos, tgt });
  const P0 = RIG.pump;
  const pumpRig = new THREE.Group(); pumpRig.position.copy(P0); scene.add(pumpRig);
  const rigSteel = new THREE.MeshStandardMaterial({ color: 0xb4bcc5, roughness: 0.3, metalness: 0.9 });
  const rigCast = new THREE.MeshStandardMaterial({ color: 0x4f5862, roughness: 0.5, metalness: 0.6 });
  const GR = { c: 0.56, tip: 0.6, root: 0.44, N: 10 };
  {
    const s = new THREE.Shape(); s.moveTo(-1.7, -1.45); s.lineTo(1.7, -1.45); s.lineTo(1.7, 1.45); s.lineTo(-1.7, 1.45); s.lineTo(-1.7, -1.45);
    const h = new THREE.Path(); const rC = GR.tip + 0.03, pw = 0.24, yL = Math.sqrt(rC * rC - (GR.c - pw) ** 2), as = Math.atan2(yL, GR.c - pw);
    h.moveTo(-pw, 1.25); h.lineTo(-pw, yL);
    for (let i = 0; i <= 64; i++) { const a = mix(as, 2 * Math.PI - as, i / 64); h.lineTo(-GR.c + Math.cos(a) * rC, Math.sin(a) * rC); }
    h.lineTo(-pw, -1.25); h.lineTo(pw, -1.25); h.lineTo(pw, -yL);
    for (let i = 0; i <= 64; i++) { const a = mix(as - Math.PI, Math.PI - as, i / 64); h.lineTo(GR.c + Math.cos(a) * rC, Math.sin(a) * rC); }
    h.lineTo(pw, 1.25); h.lineTo(-pw, 1.25);
    s.holes.push(h);
    const hg = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false, curveSegments: 4 }); hg.translate(0, 0, -0.35);
    const hm = new THREE.Mesh(hg, rigCast); hm.castShadow = shadows; hm.receiveShadow = shadows; pumpRig.add(hm);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.9, 0.2).translate(0, 0, -0.45), rigCast); back.receiveShadow = shadows; pumpRig.add(back);
  }
  const gearGeo = (() => {
    const s = new THREE.Shape(); const n = GR.N;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, p = Math.PI * 2 / n;
      const pts = [[GR.root, a0], [GR.root, a0 + p * 0.18], [GR.tip, a0 + p * 0.33], [GR.tip, a0 + p * 0.62], [GR.root, a0 + p * 0.78]];
      pts.forEach(([r, a], i) => { const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k === 0 && i === 0) s.moveTo(x, y); else s.lineTo(x, y); });
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.13, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 1, curveSegments: 3 }); g.translate(0, 0, -0.3);
    return toCreasedNormals(g, Math.PI / 6);
  })();
  const gears = [-1, 1].map((sx) => {
    const g = new THREE.Mesh(gearGeo, rigSteel); g.position.set(sx * GR.c, 0, 0); g.castShadow = shadows; g.receiveShadow = shadows; pumpRig.add(g);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 24).rotateX(Math.PI / 2), rigSteel); sh.position.set(sx * GR.c, 0, 0); pumpRig.add(sh);
    return g;
  });
  rigLight(P0.clone().add(new V3(2.5, 3.5, 7)), P0.clone());
  // oil + particles carried around the outside of both gears, inlet at the bottom, outlet at the top
  const PG = [];
  for (let j = 0; j < 24; j++) {
    const sx = j % 2 ? 1 : -1, r = mix(0.5, 0.58, R()), dz = (R() - 0.5) * 0.5;
    const pts = [new V3((R() - 0.5) * 0.3, -1.2, dz)];
    for (let i = 0; i <= 14; i++) { const f = i / 14; const a = sx > 0 ? mix(-Math.PI * 0.62, Math.PI * 0.62, f) : mix(-Math.PI * 0.38, -Math.PI * 1.62, f); pts.push(new V3(sx * GR.c + Math.cos(a) * r, Math.sin(a) * r, dz)); }
    pts.push(new V3((R() - 0.5) * 0.3, 1.2, dz));
    PG.push(buildLUT(pts.map((p) => p.add(P0)), () => 1, 120));
  }
  const pumpOil = new Streaks(scene, { paths: PG, count: 160, material: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), seed: 11, speed: 1.0, radius: 0.012, lenMin: 0.08, lenMax: 0.05, colorFn: (p, u, w, c) => c.setRGB(1.5, 0.95, 0.3) });
  const grit = new Streaks(scene, { paths: PG, count: 70, material: new THREE.MeshBasicMaterial({ color: 0xe8e8e8 }), dots: true, radius: 0.022, seed: 12, speed: 1.0 });
  const sparkPuffs = new Puffs(scene, { count: 60, color: 0xffd28a, opacity: 0.0, size: 0.18, additive: true });

  // ------------------------------------------------ macro rig: spool valve (sectioned)
  const V0 = RIG.valve;
  const valveRig = new THREE.Group(); valveRig.position.copy(V0); scene.add(valveRig);
  const vbody = csg(rbox(4.6, 2.0, 1.9, 0.08), [
    ['sub', cylBetween([-2.6, 0, 0], [2.6, 0, 0], 0.45, 64)],
    ...[-0.95, 0, 0.95].map((x) => ['sub', cylBetween([x, -1.2, 0], [x, 0, 0], 0.2, 32)]),
    ...[-1.8, 1.8].map((x) => ['sub', cylBetween([x, 1.2, 0], [x, 0, 0], 0.2, 32)]),
  ]);
  addSolid(vbody, M.cast, M.cut, valveRig);
  const spoolG = new THREE.Group(); valveRig.add(spoolG);
  {
    const prof = []; const land = 0.43, groove = 0.24;
    const segs = [[-2.3, 0.2], [-1.62, 0.2], [-1.6, land], [-1.15, land], [-1.13, groove], [-0.4, groove], [-0.38, land], [0.38, land], [0.4, groove], [1.13, groove], [1.15, land], [1.6, land], [1.62, 0.2], [2.3, 0.2]];
    prof.push(new THREE.Vector2(0, -2.3)); segs.forEach(([x, r]) => prof.push(new THREE.Vector2(r, x))); prof.push(new THREE.Vector2(0, 2.3));
    const g = new THREE.LatheGeometry(prof, 64).rotateZ(-Math.PI / 2);
    addSolid(toCreasedNormals(g, 0.5), M.steel, M.cutSteel, spoolG);
  }
  const vOil = new THREE.Mesh(new THREE.CylinderGeometry(0.449, 0.449, 4.8, 48).rotateZ(Math.PI / 2), oilBack.clone()); vOil.material.opacity = 0.2; vOil.renderOrder = 2; valveRig.add(vOil);
  const wedge = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.4, metalness: 0.6, emissive: 0x222222, clippingPlanes: clip }));
  wedge.position.set(0.52, 0.425, -0.06); valveRig.add(wedge);
  rigLight(V0.clone().add(new V3(-2.0, 3.5, 7)), V0.clone());
  // specks drifting in the grooves and the land clearance
  const VP = [];
  for (let j = 0; j < 30; j++) {
    const a = mix(Math.PI * 0.08, Math.PI * 0.92, R()), r = mix(0.27, 0.445, Math.pow(R(), 0.6)), x0 = mix(-2.3, 2.3, R());
    const pts = []; for (let i = 0; i <= 6; i++) { const f = i / 6; pts.push(new V3(x0 + mix(-0.4, 0.4, f), Math.sin(a + f * 0.3) * r, -Math.abs(Math.cos(a + f * 0.3)) * r * 0.35 - 0.02).add(V0)); }
    VP.push(buildLUT(pts, () => 1, 40));
  }
  const specks = new Streaks(scene, { paths: VP, count: 120, material: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4dc).multiplyScalar(1.6), clippingPlanes: clip }), dots: true, radius: 0.017, seed: 13, speed: 0.12 });

  // ------------------------------------------------ macro rig: oil sample bottle on a light box
  const B0 = RIG.bottle;
  const bottleRig = new THREE.Group(); bottleRig.position.copy(B0); scene.add(bottleRig);
  const box = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 6.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1dc).multiplyScalar(0.3) })); box.position.set(0, 1.0, -1.6); bottleRig.add(box);
  const plinth = new THREE.Mesh(rbox(2.2, 0.3, 1.6, 0.06), new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.5, metalness: 0.4 })); plinth.position.set(0, -0.62, -0.2); plinth.receiveShadow = shadows; bottleRig.add(plinth);
  const bProf = [[0, -0.47], [0.4, -0.47], [0.44, -0.43], [0.45, 0.6], [0.4, 0.78], [0.22, 0.86], [0.22, 1.0]].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(bProf, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.05, clearcoat: 1, depthWrite: false }));
  glass.renderOrder = 9; bottleRig.add(glass);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.22, 32).translate(0, 1.08, 0), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 })); bottleRig.add(cap);
  const sampleMat = new THREE.MeshBasicMaterial({ color: 0xc27a12, transparent: true, opacity: 0.9, depthWrite: false });
  const sample = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 48).translate(0, 0.05, 0), sampleMat); sample.renderOrder = 7; bottleRig.add(sample);
  const SB = [];
  for (let j = 0; j < 40; j++) { const a = R() * Math.PI * 2, r = 0.36 * Math.sqrt(R()), y0 = mix(-0.4, 0.5, R()); const pts = []; for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push(new V3(Math.cos(a + f * 2) * r, y0 - 0.15 * f, Math.sin(a + f * 2) * r).add(B0)); } SB.push(buildLUT(pts, () => 1, 40)); }
  const sampleSpecks = new Streaks(scene, { paths: SB, count: 260, material: new THREE.MeshBasicMaterial({ color: 0x140e08, transparent: true, opacity: 0.95, depthWrite: false }), dots: true, radius: 0.014, seed: 14, speed: 0.08, renderOrder: 8 });
  rigLight(B0.clone().add(new V3(2.0, 3.0, 6)), B0.clone());

  // ------------------------------------------------ particle paths (main unit)
  const streakMat = stepMat(M.streak.clone());
  const oilCol = new THREE.Color(1.55, 0.98, 0.32), presCol = new THREE.Color(1.9, 0.75, 0.25);
  const inlet = (o) => [new V3(-1.8, 3.7, 0).add(o), new V3(-1.8, 1.0, 0).add(o), new V3(-1.62, 0.56, 0).add(o.clone().multiplyScalar(0.7)), new V3(-1.1, 0.5, o.z * 0.6), new V3(-0.75, 0.45, o.z * 0.6)];
  const toTank = () => { const x = mix(-5.0, 1.8, R()); return [new V3(0, -3.6, 0), new V3((R() - 0.5) * 0.3, -4.0, -0.1 - R() * 0.3), new V3(mix(-1.0, 1.0, R()), -3.8, -0.4 - R() * 0.6), new V3(x, mix(-3.7, -1.6, R()), -0.3 - R() * 1.6)]; };
  const FILT = [], DIRT = [], BYP = [], PRES = [];
  for (let j = 0; j < 44; j++) {
    const o = new V3(0, 0, (R() - 0.5) * 0.3);
    const a = R() * Math.PI * 2, rA = mix(0.86, 0.96, R()), yIn = mix(EL.y0 + 0.2, EL.y1 - 0.25, R());
    const ring = (r, y, aa = a) => new V3(Math.cos(aa) * r, y, Math.sin(aa) * r);
    const pre = [...inlet(o), ring(0.7, 0.25), ring(rA, -0.1), ring(rA, mix(-0.4, yIn, 0.5), a + 0.2), ring(rA, yIn, a + 0.3)];
    FILT.push(buildLUT([...pre, ring(0.62, yIn, a + 0.3), ring(0.3, yIn - 0.05, a + 0.3), ring(0.15, yIn - 0.4, a + 0.3), new V3(0, EL.y0 - 0.2, 0), ...toTank()], (p) => (Math.hypot(p.x, p.z) < 1.0 && p.y < 0.6 && p.y > -3.5 ? 0.45 : 1), 300));
    DIRT.push(buildLUT([...pre, ring(0.79, yIn, a + 0.3)], (p) => (Math.hypot(p.x, p.z) < 1.0 && p.y < 0.6 ? 0.45 : 1), 200));
    // bypass: over the top, through the poppet seat, down the core
    const ob = new V3((R() - 0.5) * 0.25, 0, (R() - 0.5) * 0.25);
    const sx = mix(-3.9, -3.5, R());
    BYP.push(buildLUT([...inlet(o), new V3(-0.4, 0.3, o.z * 0.5), new V3(0, 0.05, 0).add(ob), new V3(0, -0.2, 0).add(ob.clone().multiplyScalar(0.5)), ring(0.34, -0.45), ring(0.25, -1.2), new V3(0, EL.y0 - 0.2, 0), new V3(0, -3.95, -0.1),
      new V3(-1.2, -3.7, -0.4), new V3(-3.0, -3.6, -0.3), new V3(sx, -3.5, (R() - 0.5) * 0.3), new V3(-3.7, -2.8, 0), new V3(-3.7, 0.1, 0), new V3(-3.7, 0.7, 0)], (p) => (p.y > -0.5 && Math.abs(p.x) < 0.5 ? 0.5 : 1), 300));
  }
  for (let j = 0; j < 24; j++) {
    const k = j % 3, o = new V3((R() - 0.5) * 0.14, 0, (R() - 0.5) * 0.14);
    PRES.push(buildLUT([new V3(-3.7, 0.9, 0).add(o), new V3(-3.7, 3.9, 0).add(o), new V3(VX[k], 4.3, 0).add(o), new V3(VX[k], 5.4, -0.2), new V3(VX[k], 5.7, -0.95), new V3(VX[k], ACT[k].y, -0.95), new V3(VX[k] + 0.4, ACT[k].y, -0.2)], () => 1, 200));
  }
  const filt = new Streaks(scene, { paths: FILT, count: 520, material: streakMat, seed: 1, speed: 1.5, radius: 0.016, lenMin: 0.08, lenMax: 0.18, colorFn: (p, u, w, c) => c.copy(oilCol) });
  const pres = new Streaks(scene, { paths: PRES, count: 220, material: M.streak, seed: 2, speed: 2.4, radius: 0.016, lenMin: 0.1, lenMax: 0.22, colorFn: (p, u, w, c) => c.copy(presCol) });
  const gritMat = stepMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2efe8).multiplyScalar(1.15) }));
  const dirt = new Streaks(scene, { paths: DIRT, count: 220, material: gritMat, dots: true, radius: 0.02, seed: 3, speed: 1.5 });
  const byp = new Streaks(scene, { paths: BYP, count: 300, material: streakMat, seed: 4, speed: 1.6, radius: 0.016, lenMin: 0.08, lenMax: 0.18, colorFn: (p, u, w, c) => c.setRGB(1.7, 0.7, 0.3) });
  const bypGrit = new Streaks(scene, { paths: BYP, count: 200, material: gritMat, dots: true, radius: 0.022, seed: 5, speed: 1.6 });

  // ------------------------------------------------ update
  const tmpM = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    const range = opts.cutRange || [3.0, 0];
    ST.setCut(cut, range[0], range[1]);
    slicePlane.constant = opts.slice ?? st.sliceY;
    oilBack.opacity = 0.12 * cut; oilTopMat.opacity = 0.55 * cut;
    ST.lights.sectionLight.intensity = 0;
    // element dirt + trapped particles
    elU.uDirt.value = st.load * 0.95;
    const shown = clamp01((st.load - 0.08) / 0.92);
    for (let i = 0; i < TRAP_N; i++) trapped.setMatrixAt(i, trapRank[i] < shown ? trapBase[i] : zero);
    trapped.instanceMatrix.needsUpdate = true;
    // bypass poppet + spring
    const open = st.bypass * 0.2;
    poppet.position.y = EL.y1 - 0.02 - open;
    const sTop = poppet.position.y - 0.07;
    springMesh.scale.y = Math.max(0.1, sTop - springBase);
    oringMat.emissiveIntensity = 1.6 * st.oring;
    dpG.set(st.dp);
    // element change
    lid.position.set(-3.2 * st.lidSide, 1.2 * st.lidUp, 0);
    elG.position.set(5.2 * st.elSide, 4.9 * st.elUp, 0);
    // actuators cycling
    rods.forEach(({ rod, a }) => { const ph = ((t * 0.32 + a.ph) % 1); rod.position.x = a.stroke * (ph < 0.5 ? smooth(0.05, 0.3, ph) : 1 - smooth(0.55, 0.8, ph)); });
    // noisy pump
    hpu.position.set(0.012 * Math.sin(t * 97) * st.noisy, 0.012 * Math.sin(t * 131 + 1) * st.noisy, 0);
    // macro rigs
    const cam = opts.camPos || null;
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.tgt) < 14);
    rigL.intensity = rs ? (rs === rigSpots[2] ? 45 : 110) : 0; rigL.visible = !!rs;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.tgt); rigL.target.updateMatrixWorld(); }
    const rot = t * 2.2;
    gears[0].rotation.z = -rot + 0.55 * (Math.PI * 2 / GR.N); gears[1].rotation.z = rot;
    spoolG.position.x = st.spool;
    wedge.visible = st.wedge > 0.5;
    sampleMat.color.setRGB(0.95, 0.55, 0.08).lerp(new THREE.Color(0.2, 0.12, 0.04), st.sampleDirt * 0.85);
    sampleMat.opacity = 0.86;
    // flows
    const fl = st.flow;
    filt.update({ tau: t * fl, vis: fl * (1 - 0.6 * st.bypass), camPos: cam });
    dirt.update({ tau: t * fl, vis: fl * (st.t < 33 ? 0.35 : 0.8) * (1 - st.bypass), camPos: cam });
    byp.update({ tau: t * fl, vis: st.bypass * fl, camPos: cam });
    bypGrit.update({ tau: t * fl, vis: st.bypass * fl, camPos: cam });
    pres.update({ tau: t * fl, vis: fl, camPos: cam });
    const near = (p) => cam && cam.distanceTo(p) < 14;
    pumpOil.update({ tau: rot * 0.25, vis: near(P0) ? 1 : 0, camPos: cam });
    grit.update({ tau: rot * 0.25, vis: near(P0) ? 0.7 : 0, camPos: cam });
    sparkPuffs.mat.uniforms.uOpacity.value = 0.9 * st.sparks;
    sparkPuffs.update((i, s, o) => {
      const sx = s[0] < 0.5 ? -1 : 1, age = ((t * 3.1 + s[1]) % 1);
      const a = sx > 0 ? mix(-0.4, 0.9, s[2]) : Math.PI - mix(-0.4, 0.9, s[2]);
      o.p.set(P0.x + sx * GR.c + Math.cos(a) * 0.62, P0.y + Math.sin(a) * 0.62, 0.32 + s[3] * 0.05); o.size = 0.06 + 0.12 * (1 - age); o.alpha = (s[4] > 0.5 ? 1 : 0) * (1 - age) * (age < 0.5 ? 1 : 0);
    });
    specks.update({ tau: t, vis: near(V0) ? 1 : 0, camPos: null });
    sampleSpecks.update({ tau: t, vis: near(B0) ? 0.08 + 0.92 * st.sampleDirt : 0, camPos: null });
    ST.updateDust(t);
    return { ...st, cut };
  }

  const anchors = {
    get gauge() { return new V3(lid.position.x, 2.3 + lid.position.y, 0.3); },
    get element() { return new V3(elG.position.x + 0.62, -2.4 + elG.position.y, 0.5); },
    get pleats() { return new V3(0.35, -1.38, 0.5); },
    get core() { return new V3(0.0, -2.0, -0.2); },
    get bypass() { return new V3(0.24 + elG.position.x, poppet.position.y + elG.position.y - 0.02, -0.05); },
    get spring() { return new V3(0.16, -0.75, -0.05); },
    get oring() { return new V3(0.86 + elG.position.x, EL.y1 + 0.06 + elG.position.y, 0.05); },
    get trapped() { return new V3(0.55, -2.7, 0.55); },
    get cover() { return new V3(lid.position.x + 0.9, 1.3 + lid.position.y, 0.4); },
    clamp: new V3(0.6, ACT[0].y + 0.5, -0.2), injection: new V3(0.6, ACT[1].y + 0.45, -0.2), ejectors: new V3(0.6, ACT[2].y + 0.35, -0.2),
    pump: new V3(-3.7, 1.2, 0.3), motor: new V3(-5.2, 1.4, 0.3), tank: new V3(1.8, -1.6, -1.0), manifold: new V3(-2.6, 5.4, 0.2),
    returnLine: new V3(-1.8, 2.2, 0.2), filter: new V3(0.9, 1.0, 0.6), inlet: new V3(-1.0, 0.5, -0.1), outlet: new V3(0.0, -3.9, -0.1), suction: new V3(-3.7, -3.2, 0.0),
    gearTeeth: new V3(P0.x + GR.c + 0.62, P0.y + 0.15, 0.3), gearWear: new V3(P0.x - GR.c - 0.6, P0.y + 0.3, 0.3),
    spoolLand: new V3(V0.x - 0.38, V0.y + 0.43, 0.0), jam: new V3(V0.x + 0.52, V0.y + 0.43, 0.0),
    bottle: new V3(B0.x + 0.3, B0.y + 0.4, 0.3),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
