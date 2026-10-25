// Hydraulic hose: a flexing machine hose, a layered cutaway, a damage rig, and a bend/twist rig.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createStage, castSurface, tubeSolid, rbox, mulberry, smooth, clamp01, mix, buildLUT, Streaks, Puffs, SHARED, V3, makeGauge, cylBetween, csg,
} from 'series/look';
import { stateAt } from './story.js';

export const RIG = { layers: new V3(40, 0, 0), dmg: new V3(60, 0, 0), twist: new V3(80, 0, 0) };
const HR = { bore: 0.19, tube: 0.27, wire: 0.3, cover: 0.345 };

// a hose surface that follows any curve, rebuilt every frame (parallel-transport frames + optional twist)
class FlexHose {
  constructor(parent, { radius, segs = 110, radial = 24, material, shadows = true }) {
    this.r = radius; this.segs = segs; this.radial = radial;
    const nv = (segs + 1) * (radial + 1);
    this.posA = new Float32Array(nv * 3); this.nrmA = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2), idx = [];
    for (let i = 0; i <= segs; i++) for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; uv[k * 2] = i / segs; uv[k * 2 + 1] = j / radial; }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.posA, 3)); g.setAttribute('normal', new THREE.BufferAttribute(this.nrmA, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.geo = g; this.mesh = new THREE.Mesh(g, material); this.mesh.frustumCulled = false; this.mesh.castShadow = shadows; this.mesh.receiveShadow = shadows; parent.add(this.mesh);
    this.P = []; this.N = []; this.B = []; this.T = [];
    for (let i = 0; i <= segs; i++) { this.P.push(new V3()); this.N.push(new V3()); this.B.push(new V3()); this.T.push(new V3()); }
  }
  update(curve, { twist = 0, radiusFn = null } = {}) {
    const { segs, radial, P, N, B, T } = this;
    for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, P[i]); curve.getTangentAt(i / segs, T[i]); }
    const up = Math.abs(T[0].z) < 0.9 ? new V3(0, 0, 1) : new V3(0, 1, 0);
    N[0].crossVectors(T[0], up).normalize();
    for (let i = 1; i <= segs; i++) { N[i].copy(N[i - 1]).addScaledVector(T[i], -N[i - 1].dot(T[i])).normalize(); }
    for (let i = 0; i <= segs; i++) B[i].crossVectors(T[i], N[i]);
    const d = new V3();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, r = this.r * (radiusFn ? radiusFn(u) : 1);
      for (let j = 0; j <= radial; j++) {
        const ph = (j / radial) * Math.PI * 2 + twist * u;
        d.copy(N[i]).multiplyScalar(Math.cos(ph)).addScaledVector(B[i], Math.sin(ph));
        const k = (i * (radial + 1) + j) * 3;
        this.posA[k] = P[i].x + d.x * r; this.posA[k + 1] = P[i].y + d.y * r; this.posA[k + 2] = P[i].z + d.z * r;
        this.nrmA[k] = d.x; this.nrmA[k + 1] = d.y; this.nrmA[k + 2] = d.z;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true;
  }
  // point inside the hose at length u, radial offset (rr, angle)
  inside(u, rr, ang, out) {
    const f = clamp01(u) * this.segs, i = Math.min(this.segs - 1, Math.floor(f)), w = f - i;
    out.lerpVectors(this.P[i], this.P[i + 1], w);
    return out.addScaledVector(this.N[i], Math.cos(ang) * rr).addScaledVector(this.B[i], Math.sin(ang) * rr);
  }
}

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.026, floorY: -3.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-6, 9, 12); ST.lights.key.target.position.set(0, -0.5, 0); ST.lights.key.intensity = 520;

  // ------------------------------------------------ materials
  const coverTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#18191c'; x.fillRect(0, 0, 1024, 128);
    x.fillStyle = '#d8d4c4'; x.font = `600 15px ${fontFamily}`; x.textBaseline = 'middle';
    for (let k = 0; k < 2; k++) x.fillText('EN 853 2SN · DN12 · 210 bar', 30 + k * 512, 30);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  })();
  const flexMat = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.62, metalness: 0.0, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const rubber = (key) => castSurface(new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.65, clippingPlanes: clip, clipShadows: true }), { freq: 2.5, bump: 0.12, mottle: 0.15, key });
  const cutRubber = M.cut.clone(); cutRubber.clippingPlanes = clip; cutRubber.color.set(0x5b5f67); cutRubber.onBeforeCompile = M.cut.onBeforeCompile;
  const cutWire = M.cut.clone(); cutWire.clippingPlanes = clip; cutWire.color.set(0xb7c0c9); cutWire.onBeforeCompile = M.cut.onBeforeCompile;
  const braidU = { uRust: { value: 0 }, uSpot: { value: new V3(RIG.dmg.x - 2.5, 0.28, 0.2) } };
  const braidMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xc4ccd4, roughness: 0.3, metalness: 0.9, clippingPlanes: clip, clipShadows: true }), {
    freq: 3, bump: 0.02, mottle: 0.05, key: 'braid', uniforms: braidU,
    extra: `{ float a = atan(vWPos.z, vWPos.y); float s1 = sin(vWPos.x*22.0 + a*7.0); float s2 = sin(vWPos.x*22.0 - a*7.0);
      float w = (vWPos.x*22.0 + a*7.0); float over = step(0.0, sin(w*0.5));
      float lines = smoothstep(0.0, 0.5, abs(mix(s1, s2, over)));
      diffuseColor.rgb *= 0.45 + 0.55*lines;
      float rd = length(vWPos - uSpot);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42,0.17,0.06)*(0.6+0.8*nLow), uRust*smoothstep(0.6, 0.15, rd)); }`,
  });

  // ------------------------------------------------ machine: manifold, moving carriage, flexing hose
  const mach = new THREE.Group(); scene.add(mach);
  const mani = new THREE.Mesh(rbox(2.0, 2.6, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 0.45, metalness: 0.6 })); mani.position.set(-4.6, 0.3, 0); mani.castShadow = shadows; mach.add(mani);
  const valveC = new THREE.Mesh(rbox(0.9, 0.8, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x2b4e7a, roughness: 0.45, metalness: 0.3 })); valveC.position.set(-4.6, 2.0, 0); mach.add(valveC);
  const fittingGeo = (() => {
    const parts = [
      new THREE.CylinderGeometry(0.42, 0.42, 0.35, 6).rotateZ(Math.PI / 2).translate(0.18, 0, 0),
      new THREE.CylinderGeometry(0.43, 0.43, 0.9, 40).rotateZ(Math.PI / 2).translate(0.8, 0, 0),
    ];
    for (let k = 0; k < 4; k++) parts.push(new THREE.TorusGeometry(0.43, 0.025, 8, 40).rotateY(Math.PI / 2).translate(0.5 + k * 0.2, 0, 0));
    return mergeGeometries(parts.map((g) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; }));
  })();
  const zincM = new THREE.MeshStandardMaterial({ color: 0xa7adb3, roughness: 0.35, metalness: 0.95 });
  const fitA = new THREE.Mesh(fittingGeo, zincM); fitA.position.set(-3.6, 0.5, 0); fitA.castShadow = shadows; mach.add(fitA);
  const carriage = new THREE.Group(); mach.add(carriage);
  const cblock = new THREE.Mesh(rbox(1.8, 2.0, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x3b4a5a, roughness: 0.5, metalness: 0.5 })); cblock.position.set(0.9, 0.2, 0); cblock.castShadow = shadows; carriage.add(cblock);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 40).rotateZ(Math.PI / 2).translate(2.9, 0.6, 0), new THREE.MeshStandardMaterial({ color: 0x8f2f2a, roughness: 0.45, metalness: 0.3 })); cyl.castShadow = shadows; carriage.add(cyl);
  const fitB = new THREE.Mesh(fittingGeo, zincM); fitB.rotation.y = Math.PI; fitB.position.set(0.0, 0.5, 0); carriage.add(fitB);
  for (const z of [-0.6, 0.6]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.18, 0.22), M.zincNoClip); rail.position.set(3.6, -0.9, z); mach.add(rail); }
  const base = new THREE.Mesh(rbox(14, 0.5, 3.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.55, metalness: 0.3 })); base.position.set(0.5, -3.35, -0.2); base.receiveShadow = shadows; mach.add(base);
  const flex = new FlexHose(scene, { radius: HR.cover, material: flexMat, shadows });
  const flexLen = 6.6;
  const P0 = new V3(-2.4, 0.5, 0), cv = new THREE.CubicBezierCurve3(new V3(), new V3(), new V3(), new V3());
  const solveHose = (xc) => {
    const P1 = new V3(xc - 1.2, 0.5, 0);
    let lo = 0, hi = 8;
    for (let it = 0; it < 14; it++) {
      const s = (lo + hi) / 2; const k = 0.42 * P0.distanceTo(P1) + 0.15 * s;
      cv.v0.copy(P0); cv.v1.copy(P0).add(new V3(k, -s, 0.0)); cv.v2.copy(P1).add(new V3(-k, -s, 0.0)); cv.v3.copy(P1);
      cv.updateArcLengths(); if (cv.getLength() < flexLen) lo = s; else hi = s;
    }
    cv.updateArcLengths();
    return cv;
  };
  // oil + pressure pulses inside the flexing hose (x-ray view)
  const flowN = 140, flowMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 6, 1, true).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), flowN);
  flowMesh.frustumCulled = false; flowMesh.renderOrder = 6; scene.add(flowMesh);
  const flowSeed = []; { const r = mulberry(4); for (let i = 0; i < flowN; i++) flowSeed.push([r(), r() * 0.14, r() * Math.PI * 2, 0.8 + 0.4 * r()]); }
  flowMesh.setColorAt(0, new THREE.Color());

  // ------------------------------------------------ layered cutaway (rig L), with crimped fitting
  const L0 = RIG.layers;
  const lay = new THREE.Group(); lay.position.copy(L0); scene.add(lay);
  const rx = (g, x0) => g.rotateZ(-Math.PI / 2).translate(x0, 0, 0);
  addSolid(rx(tubeSolid(HR.bore, HR.tube, 6.4, 64), -3.4), rubber('tube'), cutRubber, lay);
  addSolid(rx(tubeSolid(HR.tube, HR.wire, 4.6, 64), -3.4), braidMat, cutWire, lay);
  addSolid(rx(tubeSolid(HR.wire, HR.cover, 2.6, 64), -3.4), rubber('cover'), cutRubber, lay);
  // fitting: stem with barbs inside the bore, crimped ferrule outside, hex nut
  const fitMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xb9bfc5, roughness: 0.3, metalness: 0.95, clippingPlanes: clip, clipShadows: true }), { freq: 1.5, bump: 0.02, mottle: 0.08, key: 'fit' });
  let stem = rx(tubeSolid(0.11, HR.bore, 2.2, 48), -4.6);
  addSolid(stem, fitMat, M.cutSteel, lay);
  for (let k = 0; k < 4; k++) addSolid(rx(tubeSolid(0.12, HR.bore + 0.035, 0.08, 48), -3.2 + k * 0.22), fitMat, M.cutSteel, lay);
  let ferrule = csg(rx(tubeSolid(HR.cover - 0.005, 0.45, 1.25, 64), -3.55), [], 0.5);
  addSolid(ferrule, fitMat, M.cutSteel, lay);
  for (let k = 0; k < 5; k++) addSolid(rx(tubeSolid(0.44, 0.47, 0.06, 64), -3.4 + k * 0.24), fitMat, M.cutSteel, lay);
  addSolid(csg(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 6).rotateZ(Math.PI / 2).translate(-4.15, 0, 0), [['sub', cylBetween([-4.6, 0, 0], [-3.6, 0, 0], 0.13, 32)]], 0.5), fitMat, M.cutSteel, lay);
  const OILP = [];
  { const r = mulberry(8); for (let j = 0; j < 20; j++) { const a = r() * Math.PI * 2, rr = 0.15 * Math.sqrt(r()); OILP.push(buildLUT([new V3(-4.6, Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6 - 0.02), new V3(-3.0, Math.cos(a) * rr, -Math.abs(Math.sin(a) * rr) - 0.01), new V3(3.0, Math.cos(a) * rr, -Math.abs(Math.sin(a) * rr) - 0.01)].map((p) => p.add(L0)), () => 1, 60)); } }
  const layOil = new Streaks(scene, { paths: OILP, count: 160, material: M.streak, seed: 3, speed: 1.6, radius: 0.012, lenMin: 0.1, lenMax: 0.12, colorFn: (p, u, w, c) => c.setRGB(1.6, 1.0, 0.3) });

  // ------------------------------------------------ damage rig (D): straight hose between two blocks, bracket edge, gauge, lock
  const D0 = RIG.dmg;
  const dmg = new THREE.Group(); dmg.position.copy(D0); scene.add(dmg);
  const dU = {
    uWear: { value: 0 }, uCrack: { value: 0 }, uWet: { value: 0 }, uTear: { value: 0 },
    uSpot: braidU.uSpot, uTearAt: { value: new V3(D0.x + 0.6, 0.25, 0.25) }, uFit: { value: D0.x + 3.6 },
  };
  const dCover = castSurface(new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.6, clippingPlanes: clip, clipShadows: true }), {
    freq: 2.5, bump: 0.12, mottle: 0.15, key: 'dcover', uniforms: dU,
    extra: `{ float rd = length((vWPos - uSpot) * vec3(1.0, 1.25, 1.25));
      if (rd < uWear * 0.34) discard;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32,0.31,0.3), 0.7*smoothstep(0.62, 0.3, rd) * uWear);
      float td = length((vWPos - uTearAt) * vec3(0.8, 1.6, 1.6)); if (td < uTear * 0.3) discard;
      float c1 = texture2D(uNoiseTex, vec2(vWPos.x*0.9, atan(vWPos.z, vWPos.y)*0.6)).b;
      float crackLine = 1.0 - smoothstep(0.0, 0.035, abs(c1 - 0.5));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3,0.29,0.28), uCrack * 0.18);
      diffuseColor.rgb *= 1.0 - 0.85 * uCrack * crackLine;
      float wetA = uWet * smoothstep(uFit - 1.4, uFit - 0.2, vWPos.x);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32,0.2,0.05), 0.55*wetA*(0.5+0.5*nLow)); }`,
  });
  const hoseD = new THREE.Group(); dmg.add(hoseD);
  addSolid(rx(tubeSolid(HR.tube, HR.wire, 7.2, 96), -3.6), braidMat, cutWire, hoseD);
  const dCoverMesh = addSolid(rx(tubeSolid(HR.wire + 0.002, HR.cover, 7.2, 96), -3.6), dCover, cutRubber, hoseD);
  const bulgeM = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), dCover); bulgeM.position.set(0.6, 0, 0); hoseD.add(bulgeM);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(fittingGeo, zincM); f.position.set(s * 4.65, 0, 0); if (s > 0) f.rotation.y = Math.PI; f.castShadow = shadows; dmg.add(f);
    const b = new THREE.Mesh(rbox(1.2, 1.6, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 0.45, metalness: 0.6 })); b.position.set(s * 5.25, 0, 0); b.castShadow = shadows; dmg.add(b);
  }
  // bracket with a sharp edge pressing on the hose (front, low)
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.55), new THREE.MeshStandardMaterial({ color: 0x6d747b, roughness: 0.45, metalness: 0.7 }));
  bracket.position.set(-2.5, 0.9, 0.08); bracket.castShadow = shadows; dmg.add(bracket);
  const bracketFoot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.9), bracket.material); bracketFoot.position.set(-2.5, 1.5, -0.1); dmg.add(bracketFoot);
  // spiral guard (fix) that slides over the rub point
  const guardG = (() => {
    const pts = []; const n = 9, len = 1.4;
    for (let i = 0; i <= n * 30; i++) { const f = i / (n * 30), a = f * n * Math.PI * 2; pts.push(new V3(-len / 2 + f * len, Math.cos(a) * 0.4, Math.sin(a) * 0.4)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 30, 0.06, 8, false);
  })();
  const guard = new THREE.Mesh(guardG, new THREE.MeshStandardMaterial({ color: 0xe8a21a, roughness: 0.55 })); guard.castShadow = shadows; dmg.add(guard);
  // broken wire strand
  const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-2.55, 0.22, 0.2), new V3(-2.45, 0.26, 0.34), new V3(-2.3, 0.2, 0.5), new V3(-2.18, 0.06, 0.6)]), 16, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.5, metalness: 0.8 }));
  dmg.add(strand);
  // cardboard (leak test)
  const cardTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#b08850'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(80,55,25,0.35)'; for (let i = 0; i < 256; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cardG = new THREE.Group(); dmg.add(cardG);
  const cardM = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.04), new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 })); cardG.add(cardM);
  const stain = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), new THREE.MeshStandardMaterial({ color: 0x3a2208, roughness: 0.3, transparent: true, opacity: 0.0, depthWrite: false }));
  stain.position.z = -0.025; stain.rotation.y = Math.PI; cardG.add(stain);
  // pressure gauge + lockable ball valve on the left block
  const pG = makeGauge({ name: 'P', unit: 'bar', max: 300, redFrom: 0.85, R: 0.5, fontFamily, M, shadows });
  pG.group.position.set(-5.25, 1.45, 0.3); dmg.add(pG.group);
  const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), M.zincNoClip); pStem.position.set(-5.25, 0.95, 0); dmg.add(pStem);
  const vpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 24).rotateZ(Math.PI / 2), zincM); vpipe.position.set(-6.8, 0, 0); dmg.add(vpipe);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.32 })); ball.position.set(-6.8, 0, 0); dmg.add(ball);
  const leverG = new THREE.Group(); leverG.position.set(-6.8, 0.42, 0); dmg.add(leverG);
  const redM = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, roughness: 0.42, clearcoat: 0.6 });
  leverG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12).translate(0, 0.1, 0), M.zincNoClip));
  const leverBar = new THREE.Mesh(rbox(1.4, 0.12, 0.16, 0.05), redM); leverBar.position.set(0.55, 0.22, 0); leverG.add(leverBar);
  const lockG = new THREE.Group(); dmg.add(lockG);
  { const body = new THREE.Mesh(rbox(0.3, 0.34, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.4 })); body.position.set(0, -0.2, 0); lockG.add(body);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 10, 24, Math.PI), M.zincNoClip); lockG.add(sh); }

  // ------------------------------------------------ twist / tight-bend rig (T)
  const T0 = RIG.twist;
  const tw = new THREE.Group(); tw.position.copy(T0); scene.add(tw);
  const tblock = new THREE.Mesh(rbox(1.4, 1.6, 1.6, 0.06), new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 0.45, metalness: 0.6 })); tblock.position.set(-3.0, 0.6, 0); tblock.castShadow = shadows; tw.add(tblock);
  const tfit = new THREE.Mesh(fittingGeo, zincM); tfit.position.set(-2.3, 0.6, 0); tfit.castShadow = shadows; tw.add(tfit);
  const twTex = coverTex.clone(); twTex.needsUpdate = true; twTex.repeat.set(2.2, 1);
  const twMat = new THREE.MeshStandardMaterial({ map: twTex, roughness: 0.62 });
  const twHose = new FlexHose(scene, { radius: HR.cover, material: twMat, shadows });
  const twCurve = (fix) => {
    const a = mix(0.05, 1.2, fix), r = mix(0.38, 1.6, fix);
    const pts = []; const x0 = T0.x - 1.2, y0 = T0.y + 0.6;
    pts.push(new V3(x0, y0, 0), new V3(x0 + a * 0.5 + 0.001, y0, 0), new V3(x0 + a, y0, 0));
    for (let k = 1; k <= 8; k++) { const th = (k / 8) * Math.PI / 2; pts.push(new V3(x0 + a + Math.sin(th) * r, y0 - (1 - Math.cos(th)) * r, 0)); }
    const xe = x0 + a + r, ye = y0 - r;
    pts.push(new V3(xe, ye - 0.8, 0), new V3(xe, -3.5, 0));
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  };

  // ------------------------------------------------ jets, drops, spray, rig light
  const jetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const JET = []; { const r = mulberry(12); for (let j = 0; j < 14; j++) { const s = new V3(D0.x + 2.0, 0.22, 0.25), d = new V3(0.15 + (r() - 0.5) * 0.04, 0.55 + (r() - 0.5) * 0.04, 0.82 + (r() - 0.5) * 0.04).normalize(); JET.push(buildLUT([s, s.clone().addScaledVector(d, 1.2), s.clone().addScaledVector(d, 2.6).add(new V3(0, -0.15, 0))], () => 1, 30)); } }
  const jet = new Streaks(scene, { paths: JET, count: 90, material: jetMat, seed: 5, speed: 7.0, radius: 0.008, lenMin: 0.25, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(1.6, 1.15, 0.5) });
  const JETS = JET.map((L, j) => { const s0 = new V3(L.pos[0], L.pos[1], L.pos[2]), s1 = new V3(L.pos[3 * 15], L.pos[3 * 15 + 1], L.pos[3 * 15 + 2]); const d = s1.sub(s0).normalize(); return buildLUT([s0, s0.clone().addScaledVector(d, 0.8), s0.clone().addScaledVector(d, 1.5)], () => 1, 20); });
  const jetShort = new Streaks(scene, { paths: JETS, count: 70, material: jetMat, seed: 15, speed: 6.0, radius: 0.008, lenMin: 0.22, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(1.6, 1.15, 0.5) });
  const mist = new Puffs(scene, { count: 80, color: 0xe0b060, opacity: 0, size: 0.35 });
  const DROP = []; { const r = mulberry(13); for (let j = 0; j < 8; j++) { const x = D0.x + 3.75 + (r() - 0.5) * 0.3, z = 0.3 + r() * 0.15; DROP.push(buildLUT([new V3(x, -0.38, z), new V3(x, -0.42, z), new V3(x, -2.0, z)], (p) => (p.y > -0.43 ? 0.05 : 1), 30)); } }
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x9a6510, roughness: 0.05, emissive: 0x2a1600, transparent: true, opacity: 0.85 });
  const drops = new Streaks(scene, { paths: DROP, count: 18, material: dropMat, dots: 'smooth', radius: 0.022, seed: 6, speed: 0.9 });
  const burstS = (() => {
    const P = []; const r = mulberry(14);
    for (let j = 0; j < 30; j++) { const a = r() * Math.PI * 2, s = new V3(D0.x + 0.6, 0.3, 0.25), d = new V3((r() - 0.5) * 1.2, 0.6 + r(), 0.5 + r()).normalize(); P.push(buildLUT([s, s.clone().addScaledVector(d, 1.5), s.clone().addScaledVector(d, 3.2).add(new V3(0, -0.8, 0))], () => 1, 30)); }
    return new Streaks(scene, { paths: P, count: 200, material: jetMat, seed: 7, speed: 5.0, radius: 0.02, lenMin: 0.3, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(1.6, 1.0, 0.35) });
  })();
  const burstMist = new Puffs(scene, { count: 90, color: 0xd09a40, opacity: 0, size: 0.8 });
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 26, 0.65, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: L0, pos: L0.clone().add(new V3(1.5, 4, 7)) }, { c: D0, pos: D0.clone().add(new V3(-1.0, 4.5, 8)) }, { c: T0, pos: T0.clone().add(new V3(1.0, 2.5, 6.5)) }];

  // ------------------------------------------------ update
  const tmp = new V3(), tmp2 = new V3(), q = new THREE.Quaternion(), mtx = new THREE.Matrix4(), sc = new V3(), col = new THREE.Color();
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 0;
    ST.setCut(cut, 2.0, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    // machine hose
    const xc = 2.4 + 1.8 * st.travel;
    carriage.position.x = xc; // fitting B sits at the carriage origin
    const curve = solveHose(xc);
    const pc = ((t * 1.25) % 1);
    flex.update(curve, { radiusFn: (u) => 1 + 0.07 * st.pulses * Math.exp(-(((u - pc) / 0.05) ** 2)) });
    flexMat.opacity = 1 - 0.72 * (opts.xray ?? 0); flexMat.depthWrite = flexMat.opacity > 0.9; flexMat.side = flexMat.opacity > 0.99 ? THREE.FrontSide : THREE.DoubleSide;
    coverTex.repeat.set(flexLen / 3.2, 1);
    const fv = (opts.xray ?? 0);
    for (let i = 0; i < flowN; i++) {
      const s = flowSeed[i];
      if (fv < 0.01 || s[0] > 0.999) { flowMesh.setMatrixAt(i, mtx.makeScale(0, 0, 0)); continue; }
      const u = (s[0] + t * 0.22 * s[3]) % 1;
      flex.inside(u, s[1], s[2], tmp); flex.inside(Math.min(1, u + 0.012), s[1], s[2], tmp2);
      const dir = tmp2.clone().sub(tmp); const len = Math.max(0.01, dir.length()); dir.normalize();
      q.setFromUnitVectors(new V3(0, 1, 0), dir.negate()); sc.set(1, Math.min(0.25, len * 3.0), 1);
      mtx.compose(tmp2, q, sc); flowMesh.setMatrixAt(i, mtx);
      const pz = Math.exp(-(((u - pc) / 0.06) ** 2)) * st.pulses;
      flowMesh.setColorAt(i, col.setRGB(1.5 + pz, 0.95 + 0.3 * pz, 0.3).multiplyScalar(fv * smooth(0, 0.05, u) * (1 - smooth(0.95, 1, u))));
    }
    flowMesh.instanceMatrix.needsUpdate = true; flowMesh.instanceColor.needsUpdate = true;
    // layered rig oil
    layOil.update({ tau: t, vis: cam && cam.distanceTo(L0) < 16 ? 1 : 0, camPos: cam });
    // damage rig
    dU.uWear.value = st.wear; dU.uCrack.value = st.crack; dU.uWet.value = st.wet; dU.uTear.value = st.burst;
    braidU.uRust.value = st.rust;
    strand.visible = st.snap > 0.5;
    const bR = HR.cover * (1 + 0.38 * st.bulge);
    bulgeM.scale.set(0.75 * (0.6 + 0.4 * st.bulge), bR, bR); bulgeM.visible = st.bulge > 0.01;
    hoseD.position.set(0, 0.012 * Math.sin(t * 43) * st.rub + 0.04 * Math.sin(t * 31) * st.burst, 0.01 * Math.sin(t * 37) * st.rub + 0.05 * Math.sin(t * 27) * st.burst);
    guard.visible = st.guard > 0.01; guard.position.set(mix(-0.4, -2.5, st.guard), 0, 0);
    cardG.visible = st.card > 0.01; cardG.position.set(2.15, 1.25, 1.55 + 1.2 * (1 - st.card)); cardG.rotation.set(-0.55, 0.12, 0);
    stain.material.opacity = 0.85 * st.stain; stain.scale.setScalar(0.3 + 0.7 * st.stain); stain.position.set(-0.05, -0.12, 0.025); stain.rotation.y = 0;
    pG.set(st.pressure);
    leverG.rotation.y = -Math.PI / 2 * st.lever;
    lockG.visible = st.padlock > 0.01; lockG.position.set(-6.8, 0.6 - 0.3 * (1 - st.padlock), 1.0);
    // twist rig
    const fix = st.fixBend;
    twHose.update(twCurve(fix), { twist: mix(Math.PI * 2.4, 0, fix) });
    // jets / drops / spray
    const nearD = cam && cam.distanceTo(D0) < 18;
    const carded = st.card > 0.5 ? 1 : 0;
    jet.update({ tau: t, vis: st.jet * (nearD ? 1 : 0) * (1 - carded), camPos: null });
    jetShort.update({ tau: t, vis: st.jet * (nearD ? 1 : 0) * carded, camPos: null });
    mist.mat.uniforms.uOpacity.value = 0.25 * st.jet * (1 - 0.8 * carded);
    mist.update((i, s, o) => { const age = ((t * 1.4 + s[0]) % 1); o.p.set(D0.x + 2.0 + 0.4 * age + (s[1] - 0.5) * age, 0.4 + 1.4 * age, 0.4 + 2.0 * age + (s[2] - 0.5) * age); o.size = 0.15 + age * 0.6; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    drops.update({ tau: t, vis: st.weep * (nearD ? 1 : 0), camPos: null });
    burstS.update({ tau: t, vis: st.burst, camPos: null });
    burstMist.mat.uniforms.uOpacity.value = 0.35 * st.burst;
    burstMist.update((i, s, o) => { const age = ((t * 0.9 + s[0]) % 1); o.p.set(D0.x + 0.6 + (s[1] - 0.5) * 2.5 * age, 0.3 + 1.8 * age * s[2], 0.3 + 2.2 * age * s[3]); o.size = 0.3 + age * 1.4; o.alpha = smooth(0, 0.1, age) * (1 - age); });
    // rig light follows the camera's rig
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 18);
    rigL.visible = !!rs; rigL.intensity = rs ? (rs.c === T0 ? 260 : rs.c === D0 ? 40 : 70) : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    get hose() { return flex.inside(0.5, 0, 0, new V3()).add(new V3(0, -0.35, 0.2)); },
    get hoseTop() { return flex.inside(0.2, 0, 0, new V3()).add(new V3(0, 0.0, 0.3)); },
    get carriage() { return new V3(carriage.position.x + 0.9, 1.3, 0.6); },
    manifold: new V3(-4.6, 1.6, 0.6), fitA: new V3(-3.0, 0.9, 0.3),
    tube: L0.clone().add(new V3(2.2, 0.27, 0.0)), wire: L0.clone().add(new V3(0.4, 0.3, 0.0)), cover: L0.clone().add(new V3(-1.4, 0.345, 0.0)), bore: L0.clone().add(new V3(1.5, 0.0, -0.05)),
    ferrule: L0.clone().add(new V3(-3.0, 0.47, 0.0)), stem: L0.clone().add(new V3(-2.9, 0.13, 0.0)), nut: L0.clone().add(new V3(-4.15, 0.55, 0.0)),
    rub: D0.clone().add(new V3(-2.5, 0.3, 0.25)), wire2: D0.clone().add(new V3(-2.42, 0.26, 0.24)), strand: D0.clone().add(new V3(-2.2, 0.06, 0.6)), crack: D0.clone().add(new V3(-0.6, 0.3, 0.2)),
    bulge: D0.clone().add(new V3(0.6, 0.45, 0.2)), jet: D0.clone().add(new V3(2.0, 0.3, 0.3)), fitWet: D0.clone().add(new V3(3.9, -0.3, 0.4)), card: D0.clone().add(new V3(2.0, 1.4, 1.5)),
    guard: D0.clone().add(new V3(-2.5, 0.45, 0.2)), gauge: D0.clone().add(new V3(-5.25, 1.8, 0.4)), lock: D0.clone().add(new V3(-6.8, 0.5, 0.6)),
    get bend() { return twHose.inside(0.16, 0.36, Math.PI / 2, new V3()); }, get lay() { return twHose.inside(0.72, 0.36, Math.PI / 2, new V3()); },
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
