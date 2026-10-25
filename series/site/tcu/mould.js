// Shared two-plate mould with drilled cooling circuits, scale crust layers, and a thermal heat-map section.
// Mould axis: opens along x (A half at x<0, B half at x>0), parting plane x = 0. Channels run vertically (y)
// in the z = 0 plane so the standard section cut shows them end to end. Local coords; place with `origin`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { castSurface, tubeSolid, rbox, mulberry, mix, csg, cylBetween, V3, buildLUT, worldPosVertex } from 'series/look';

export const MLD = {
  yTop: 2.4, yBot: -2.4, z: 1.9, ax0: -2.5, bx1: 2.3, chR: 0.12, cz: -0.25, // channels sit at z = cz; place the mould at z = -cz so the cut runs down their axes
  part: { x0: -1.0, x1: 0.0, hy: 1.3, hz: 1.0, wall: 0.18 },
  ch: { A1: -1.3, A2: -1.85, B1: 0.3, B2: 0.85 },
};
const NSEG = 4;

// GLSL: steel temperature from distance to the part (heat source) and to each channel (heat sinks)
const HEAT_DECL = `uniform float uThermal; uniform float uHeat; uniform float uBase; uniform vec4 uSeg[${NSEG}]; uniform float uW[${NSEG}]; uniform vec4 uPartBox; uniform vec3 uOrigin;
  vec3 thermalRamp(float t) {
    vec3 c0 = vec3(0.05, 0.08, 0.42), c1 = vec3(0.0, 0.5, 0.95), c2 = vec3(0.1, 0.85, 0.45), c3 = vec3(1.0, 0.85, 0.1), c4 = vec3(1.0, 0.22, 0.04);
    t = clamp(t, 0.0, 1.0) * 4.0;
    return t < 1.0 ? mix(c0, c1, t) : t < 2.0 ? mix(c1, c2, t - 1.0) : t < 3.0 ? mix(c2, c3, t - 2.0) : mix(c3, c4, t - 3.0);
  }
  float steelTemp(vec3 wp) {
    vec2 p = wp.xy - uOrigin.xy;
    vec2 q = abs(p - uPartBox.xy) - uPartBox.zw;
    float dPart = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    float T = uBase + uHeat * exp(-max(dPart, 0.0) / 0.6);
    for (int i = 0; i < ${NSEG}; i++) {
      vec2 a = uSeg[i].xy, b = uSeg[i].zw; vec2 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
      float d = length(pa - ba * h);
      T -= uW[i] * exp(-d / 0.42) * (0.18 + T) * 0.9;
    }
    return clamp(T, 0.0, 1.0);
  }`;

export function buildMould(ST, { origin = new V3(), fontFamily = 'sans-serif' } = {}) {
  const { M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  const g = new THREE.Group(); g.position.copy(origin); ST.scene.add(g);
  const P = MLD.part;
  const heatU = {
    uThermal: { value: 0 }, uHeat: { value: 0.8 }, uBase: { value: 0.12 },
    uSeg: { value: [MLD.ch.A1, MLD.ch.A2, MLD.ch.B1, MLD.ch.B2].map((x) => new THREE.Vector4(x, MLD.yBot, x, MLD.yTop)) },
    uW: { value: [1, 1, 1, 1] },
    uPartBox: { value: new THREE.Vector4((P.x0 + P.x1) / 2, 0, (P.x1 - P.x0) / 2, P.hy) },
    uOrigin: { value: origin.clone() },
  };
  const addHeat = (sh) => {
    Object.assign(sh.uniforms, heatU);
    if (!sh.vertexShader.includes('vWPos')) worldPosVertex(sh);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', HEAT_DECL + '\nvoid main() {');
    if (!sh.fragmentShader.includes('varying vec3 vWPos')) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;');
  };
  // steel plates: machined look, with a thermal-camera emissive when uThermal > 0
  const steel = castSurface(new THREE.MeshStandardMaterial({ color: 0x8a939c, roughness: 0.36, metalness: 0.8, clippingPlanes: clip, clipShadows: true }), {
    freq: 0.9, bump: 0.03, mottle: 0.1, key: 'mouldsteel',
    emissive: 'float Tst = steelTemp(vWPos); totalEmissiveRadiance = mix(totalEmissiveRadiance, thermalRamp(Tst) * 1.15, uThermal); diffuseColor.rgb *= 1.0 - 0.92 * uThermal;',
  });
  { const ob = steel.onBeforeCompile; steel.onBeforeCompile = (sh) => { ob(sh); addHeat(sh); }; }
  const cutHeat = new THREE.MeshBasicMaterial({ color: 0x59626b, side: THREE.BackSide, clippingPlanes: clip });
  cutHeat.onBeforeCompile = (sh) => {
    addHeat(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hl = fract((gl_FragCoord.x + gl_FragCoord.y) / 16.0);
      float hatch = mix(0.84, 1.0, smoothstep(0.42,0.5,hl)*(1.0-smoothstep(0.92,1.0,hl)));
      float Tc = steelTemp(vWPos);
      diffuseColor.rgb = mix(diffuseColor.rgb * hatch, thermalRamp(Tc) * mix(0.88, 1.0, hatch) * 1.1, uThermal);`);
  };
  cutHeat.customProgramCacheKey = () => 'cutHeat';
  const clampMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x3d454d, roughness: 0.45, metalness: 0.6, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.04, mottle: 0.12, key: 'mclamp' });

  // geometry
  const H = MLD.yTop - MLD.yBot, D = MLD.z * 2;
  const pocket = rbox(P.x1 - P.x0, P.hy * 2, P.hz * 2, 0.25).translate((P.x0 + P.x1) / 2 - 0.0, 0, 0);
  const coreG = rbox(P.x1 - P.x0 - P.wall + 0.3, (P.hy - P.wall) * 2, (P.hz - P.wall) * 2, 0.16).translate((P.x0 + P.wall + P.x1 + 0.3) / 2, 0, 0);
  const CZ = MLD.cz;
  const drill = (x, r = MLD.chR) => cylBetween([x, MLD.yBot - 0.3, CZ], [x, MLD.yTop + 0.3, CZ], r, 32);
  let aPlate = new THREE.BoxGeometry(-MLD.ax0, H, D).translate(MLD.ax0 / 2, 0, 0);
  aPlate = csg(aPlate, [['sub', pocket.clone().translate(0.0005, 0, 0)], ['sub', drill(MLD.ch.A1)], ['sub', drill(MLD.ch.A2)], ['sub', cylBetween([MLD.ax0 - 0.2, 0, 0], [P.x0 + 0.02, 0, 0], 0.09, 24)]]);
  let bPlate = new THREE.BoxGeometry(MLD.bx1, H, D).translate(MLD.bx1 / 2, 0, 0);
  bPlate = csg(bPlate, [['add', coreG], ['sub', drill(MLD.ch.B1)], ['sub', drill(MLD.ch.B2)]]);
  const aM = addSolid(aPlate, steel, cutHeat, g);
  const bM = addSolid(bPlate, steel, cutHeat, g);
  const aClamp = addSolid(csg(rbox(0.5, H + 1.0, D, 0.05).translate(MLD.ax0 - 0.25, 0, 0), [['sub', cylBetween([MLD.ax0 - 0.7, 0, 0], [MLD.ax0 + 0.1, 0, 0], 0.32, 32)]]), clampMat, M.cutDark, g);
  const bClamp = addSolid(rbox(0.5, H + 1.0, D, 0.05).translate(MLD.bx1 + 0.25, 0, 0), clampMat, M.cutDark, g);
  const bushing = addSolid(csg(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 32).rotateZ(Math.PI / 2).translate(MLD.ax0 - 0.2, 0, 0), [['sub', cylBetween([MLD.ax0 - 0.7, 0, 0], [MLD.ax0 + 0.3, 0, 0], 0.09, 24)]]), M.steel, M.cutSteel, g);
  // the moulded part (a cup-shaped housing), glows while hot
  const partU = { uPartHeat: { value: 0.6 } };
  const partMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, emissive: 0xff5a14, emissiveIntensity: 0.6, clippingPlanes: clip });
  const partCut = new THREE.MeshBasicMaterial({ color: 0xff8a3a, side: THREE.BackSide, clippingPlanes: clip });
  const part = addSolid(csg(pocket.clone(), [['sub', coreG.clone()]]), partMat, partCut, g);
  const sprue = addSolid(cylBetween([MLD.ax0 - 0.55, 0, 0], [P.x0 + 0.05, 0, 0], 0.085, 20), partMat, partCut, g);
  // guide pins
  for (const y of [-2.0, 2.0]) for (const z of [-1.5]) addSolid(cylBetween([-0.9, y, z], [1.2, y, z], 0.13, 20), M.chrome, M.cutSteel, g);

  // scale crust: 4 nested layers inside each channel, revealed as scale builds up
  const crustMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xd6c8a6, roughness: 0.95, clippingPlanes: clip }), { freq: 6, bump: 0.5, mottle: 0.3, key: 'crust' });
  const crustCut = M.cut.clone(); crustCut.clippingPlanes = clip; crustCut.color.set(0xcdb78c); crustCut.onBeforeCompile = M.cut.onBeforeCompile;
  const crust = {};
  for (const [name, x] of Object.entries(MLD.ch)) {
    crust[name] = [];
    for (let k = 0; k < 4; k++) {
      const r1 = MLD.chR * (1 - 0.14 * k) - 0.001, r0 = MLD.chR * (1 - 0.14 * (k + 1));
      const m = addSolid(tubeSolid(r0, r1, H, 40).translate(x, MLD.yBot, CZ), crustMat, crustCut, g, false);
      m.visible = false; crust[name].push(m);
    }
  }
  const setScale = (name, s) => crust[name].forEach((m, k) => { m.visible = s > (k + 0.5) / 4.6; });

  // fittings on top, jumper hoses underneath
  const fitMat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.32, clippingPlanes: clip });
  const fitAt = {};
  for (const [name, x] of Object.entries(MLD.ch)) {
    const f = addSolid(mergeGeometries([new THREE.CylinderGeometry(0.2, 0.2, 0.22, 6).translate(0, 0.11, 0), tubeSolid(0.09, 0.14, 0.45, 24).translate(0, 0.2, 0)].map((q) => { q = q.index ? q.toNonIndexed() : q; q.deleteAttribute('uv'); return q; })), fitMat, M.cutSteel, g);
    f.position.set(x, MLD.yTop, CZ);
    const fb = f.clone(); fb.rotation.z = Math.PI; fb.position.set(x, MLD.yBot, CZ); g.add(fb);
    fitAt[name] = { top: new V3(x, MLD.yTop + 0.65, CZ), bot: new V3(x, MLD.yBot - 0.65, CZ) };
  }
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.6 });
  const jumper = (a, b, sag = 0.6) => {
    const A = fitAt[a].bot, B = fitAt[b].bot;
    const c = new THREE.CubicBezierCurve3(A, A.clone().add(new V3(0, -sag, 0)), B.clone().add(new V3(0, -sag, 0)), B);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.11, 12), hoseMat); m.castShadow = shadows; g.add(m);
    return c;
  };
  const jA = jumper('A1', 'A2'), jB = jumper('B1', 'B2');

  // water paths through each circuit (local -> world later): in at the top of 1, down, jumper, up 2, out the top
  const R = mulberry(21);
  const circuitPath = (c1, c2, jc) => {
    const out = [];
    for (let j = 0; j < 10; j++) {
      const ox = (R() - 0.5) * 0.08, oz = CZ - Math.abs(R() - 0.5) * 0.07 - 0.01;
      const x1 = MLD.ch[c1], x2 = MLD.ch[c2];
      const pts = [new V3(x1 + ox, MLD.yTop + 0.6, oz), new V3(x1 + ox, MLD.yTop - 0.4, oz), new V3(x1 + ox, 0, oz), new V3(x1 + ox, MLD.yBot + 0.4, oz)];
      for (let k = 0; k <= 8; k++) { const p = jc.getPoint(k / 8); pts.push(new V3(p.x + ox, p.y, p.z + (oz - CZ))); }
      pts.push(new V3(x2 + ox, MLD.yBot + 0.4, oz), new V3(x2 + ox, 0, oz), new V3(x2 + ox, MLD.yTop - 0.4, oz), new V3(x2 + ox, MLD.yTop + 0.6, oz));
      out.push(pts.map((p) => p.add(origin)));
    }
    return out;
  };
  const paths = { A: circuitPath('A1', 'A2', jA), B: circuitPath('B1', 'B2', jB) };
  const world = (v) => v.clone().add(origin);
  const anchors = {
    part: world(new V3(-0.5, 0.9, 0.0)), cavity: world(new V3(-0.95, 0.5, 0.0)), core: world(new V3(-0.4, 0, 0)),
    A1: world(new V3(MLD.ch.A1, 1.2, CZ)), A2: world(new V3(MLD.ch.A2, -1.2, CZ)), B1: world(new V3(MLD.ch.B1, 1.2, CZ)), B2: world(new V3(MLD.ch.B2, -1.2, CZ)),
    aPlate: world(new V3(-1.6, 2.1, 0.0)), bPlate: world(new V3(1.4, 2.1, 0.0)),
    fitA1: world(fitAt.A1.top), fitA2: world(fitAt.A2.top), fitB1: world(fitAt.B1.top), fitB2: world(fitAt.B2.top),
  };
  return { g, heatU, partMat, partU, part, setScale, paths, fitAt: Object.fromEntries(Object.entries(fitAt).map(([k, v]) => [k, { top: world(v.top), bot: world(v.bot) }])), anchors, steel, cutHeat, aM, bM };
}
