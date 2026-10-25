// Tampo (pad) printing: sealed ink cup on an etched cliché, silicone pad on a shuttle, curved part in a fixture.
// Macro rigs: a section through the cliché etch (ink fill, wipe, tack, pick-up) and the ink layer vs a hair.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, tubeSolid, rbox, mulberry, smooth, mix, Puffs, SHARED, V3, csg, cylBetween, worldPosVertex } from 'series/look';
import { stateAt, GEO } from './story.js';

export const RIG = { etch: new V3(40, 0, 0), hair: new V3(80, 0, 0) };
const G = GEO, PR = 0.62, PH = 0.85, IMG = { w: 1.0, d: 0.5 };
const padProfile = (u) => PR * Math.pow(1 - Math.pow(1 - u, 1.6), 0.55);

// ---------------------------------------------------------------- textures: logo (sharp / blurred) + defect masks
function logoCanvas(fontFamily, blur = 0) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.clearRect(0, 0, 512, 256); if (blur) x.filter = `blur(${blur}px)`;
  x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  x.lineWidth = 20; x.beginPath(); x.arc(112, 128, 66, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(112, 128, 24, 0, Math.PI * 2); x.fill();
  x.lineWidth = 9; x.beginPath(); x.ellipse(112, 128, 104, 30, -0.45, 0, Math.PI * 2); x.stroke();
  x.font = `800 96px ${fontFamily}`; x.textBaseline = 'middle'; x.fillText('ORBIT', 212, 136);
  return c;
}
function maskCanvas(draw) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#000'; x.strokeStyle = '#000'; draw(x, mulberry(11)); return c;
}
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; return t; };

const DECAL_U = (T) => ({ uLogo: { value: T.logo }, uLogoB: { value: T.blur }, uHolesT: { value: T.holes }, uPatchT: { value: T.patch }, uFishT: { value: T.fish } });
const DECAL_GLSL = `
  uniform sampler2D uLogo, uLogoB, uHolesT, uPatchT, uFishT;
  vec2 decalUV(vec2 lxz) { return vec2(lxz.x / ${IMG.w.toFixed(2)} + 0.5, 0.5 - lxz.y / ${IMG.d.toFixed(2)}); }
  float inRect(vec2 uv) { return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0); }`;

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.024, floorY: -4.5, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(3, 11, 10); ST.lights.key.target.position.set(0, -1, 0); ST.lights.key.intensity = 400; ST.lights.key.angle = 0.8;
  const T = {
    logo: tex(logoCanvas(fontFamily)), blur: tex(logoCanvas(fontFamily, 9)),
    holes: tex(maskCanvas((x, R) => { for (let k = 0; k < 16; k++) { x.beginPath(); x.arc(40 + R() * 440, 30 + R() * 200, 5 + R() * 9, 0, 6.283); x.fill(); } x.lineWidth = 6; x.lineCap = 'round'; for (let k = 0; k < 3; k++) { x.beginPath(); const a = 60 + R() * 380, b = 50 + R() * 160; x.moveTo(a, b); x.quadraticCurveTo(a + 30, b - 30 + R() * 60, a + 70 + R() * 40, b + (R() - 0.5) * 50); x.stroke(); } })),
    patch: tex(maskCanvas((x, R) => { x.filter = 'blur(10px)'; for (let k = 0; k < 26; k++) { x.globalAlpha = 0.5 + R() * 0.5; x.beginPath(); x.ellipse(R() * 512, R() * 256, 20 + R() * 50, 12 + R() * 34, R() * 3, 0, 6.283); x.fill(); } })),
    fish: tex(maskCanvas((x, R) => { for (let k = 0; k < 22; k++) { x.beginPath(); x.arc(30 + R() * 460, 25 + R() * 210, 7 + R() * 16, 0, 6.283); x.fill(); } })),
  };
  const inkWhite = new THREE.Color(0xdcdcd6);

  // ---------------------------------------------------------------- machine body
  const paint = new THREE.MeshStandardMaterial({ color: 0x3b5f86, roughness: 0.48, metalness: 0.3 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xa9b1b9, roughness: 0.35, metalness: 0.85 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.55, metalness: 0.4 });
  const mesh = (g, m, p, cast = true) => { const o = new THREE.Mesh(g, m); if (p) o.position.set(...p); o.castShadow = cast && shadows; o.receiveShadow = shadows; scene.add(o); return o; };
  mesh(rbox(9.8, 2.5, 4.2, 0.08), paint, [-0.6, -3.25, 0]);
  mesh(rbox(10.0, 0.12, 4.4, 0.03), alu, [-0.6, -1.96, 0]);
  mesh(rbox(1.3, 5.5, 1.0, 0.06), paint, [0.2, 0.85, -1.7]);
  mesh(rbox(7.4, 0.5, 0.6, 0.05), paint, [0.2, 3.3, -1.0]);
  mesh(rbox(7.2, 0.08, 0.1, 0.02), alu, [0.2, 3.3, -0.68]);
  // cliché holder + plate (etched image, ink, haze from a worn ring)
  mesh(rbox(3.4, 0.9, 2.4, 0.05), darkM, [-2.6, -1.45, 0]);
  const clU = { ...DECAL_U(T), uXC: { value: G.xC }, uTopY: { value: G.CL_Y }, uEtchInk: { value: 0 }, uTacky: { value: 0 }, uHaze: { value: 0 }, uSweep: { value: -9 } };
  const clMat = new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.32, metalness: 0.85 });
  clMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, clU); worldPosVertex(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform float uXC, uTopY, uEtchInk, uTacky, uHaze, uSweep; ${DECAL_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 lp = vWPos - vec3(uXC, 0.0, 0.0);
      float top = step(uTopY - 0.004, vWPos.y);
      vec2 uv = decalUV(lp.xz);
      float e = texture2D(uLogo, uv).a * inRect(uv) * top;
      vec3 inkC = mix(vec3(0.95, 0.95, 0.92), vec3(0.74, 0.74, 0.70), uTacky);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.1, 0.11, 0.12), inkC, uEtchInk), e);
      float band = top * step(abs(lp.z), 0.56) * step(-1.95, lp.x) * step(lp.x, 0.6);
      float sl = step(0.88, fract(lp.z * 17.0 + 0.2)) * step(0.4, fract(sin(floor(lp.z * 17.0) * 57.3) * 913.1));
      float film = band * uHaze * (0.28 + 0.5 * sl);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.86, 0.83), film);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, mix(0.75, mix(0.12, 0.7, uTacky), uEtchInk), e);
      roughnessFactor = mix(roughnessFactor, 0.6, film);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, 0.0, clamp(e * uEtchInk + film, 0.0, 1.0));`);
  };
  mesh(rbox(2.8, 0.06, 1.6, 0.01), clMat, [-2.6, G.CL_Y - 0.03, 0]);
  // sealed ink cup: ceramic ring, body, lid with gasket, ink inside (shown in section)
  const cupG = new THREE.Group(); scene.add(cupG);
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.3, metalness: 0.0, clippingPlanes: clip });
  const steelC = new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: 0.28, metalness: 0.9, clippingPlanes: clip });
  const inkMat = new THREE.MeshStandardMaterial({ color: inkWhite, roughness: 0.15, metalness: 0.0, clippingPlanes: clip });
  const inkCut = M.cut.clone(); inkCut.clippingPlanes = clip; inkCut.color.set(0xdedcd4); inkCut.onBeforeCompile = M.cut.onBeforeCompile;
  addSolid(tubeSolid(0.5, 0.58, 0.07, 64), ceramic, M.cutSteel, cupG);
  addSolid(tubeSolid(0.52, 0.6, 0.5, 64).translate(0, 0.07, 0), steelC, M.cutSteel, cupG);
  addSolid(new THREE.CylinderGeometry(0.64, 0.64, 0.08, 64).translate(0, 0.61, 0), steelC, M.cutSteel, cupG);
  const gasketMat = new THREE.MeshStandardMaterial({ color: 0xd8641e, roughness: 0.5, emissive: 0xff7a2a, emissiveIntensity: 0, clippingPlanes: clip });
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 8, 64).rotateX(Math.PI / 2), gasketMat); gasket.position.y = 0.575; cupG.add(gasket);
  addSolid(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 48).translate(0, 0.17, 0), inkMat, inkCut, cupG);
  const chips = new THREE.Group(); cupG.add(chips);
  for (const a of [0.4, 2.1, 3.7, 5.2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.8, clippingPlanes: clip })); c.position.set(Math.cos(a) * 0.58, 0.015, Math.sin(a) * 0.58); c.rotation.y = -a; chips.add(c); }
  // cup actuator
  mesh(cylBetween([-5.5, -0.7, 0], [-4.35, -0.7, 0], 0.17, 24), alu, null);
  const chromeM = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.14 });
  const cupRod = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 16).rotateZ(Math.PI / 2).translate(0.5, 0, 0), chromeM, [-4.35, -0.7, 0]);
  mesh(rbox(0.3, 0.5, 0.5, 0.03), darkM, [-4.25, -0.95, 0]);
  // pad shuttle: carriage, pneumatic cylinder, rod, holder plate, silicone pad
  const carG = new THREE.Group(); scene.add(carG);
  const addTo = (g, geo, m, p) => { const o = new THREE.Mesh(geo, m); if (p) o.position.set(...p); o.castShadow = shadows; o.receiveShadow = shadows; g.add(o); return o; };
  addTo(carG, rbox(1.0, 0.9, 0.8, 0.05), paint, [0, 3.3, -0.45]);
  addTo(carG, rbox(0.8, 0.3, 0.7, 0.03), alu, [0, 3.15, -0.1]);
  addTo(carG, cylBetween([0, 1.95, 0], [0, 3.05, 0], 0.27, 32), alu, null);
  addTo(carG, new THREE.CylinderGeometry(0.3, 0.3, 0.08, 32).translate(0, 1.95, 0), darkM, null);
  const rod = addTo(carG, new THREE.CylinderGeometry(0.07, 0.07, 1, 16).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.14 }), [0, 1.95, 0]);
  const holder = addTo(carG, rbox(1.4, 0.14, 1.4, 0.03), alu, null);
  const padG = new THREE.Group(); carG.add(padG);
  const padU = { ...DECAL_U(T), uSurf: { value: -9 }, uKx: { value: 0 }, uKz: { value: 0 }, uPadInk: { value: 0 }, uCut: { value: 0 }, uGlow: { value: 0 } };
  const padMat = new THREE.MeshStandardMaterial({ color: 0xe8998a, roughness: 0.55, metalness: 0.0 });
  padMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, padU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal; uniform float uSurf, uKx, uKz;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocal = transformed;
        { float comp = max(0.0, uSurf);
          transformed.xz *= 1.0 + 0.45 * comp * exp(-transformed.y / 0.28);
          float ys = uSurf - uKx * transformed.x * transformed.x - uKz * transformed.z * transformed.z;
          transformed.y = max(transformed.y, ys); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vLocal; uniform float uPadInk, uCut, uGlow; ${DECAL_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 uv = decalUV(vLocal.xz);
      float a = texture2D(uLogo, uv).a * inRect(uv) * smoothstep(0.34, 0.16, vLocal.y) * uPadInk;
      a *= mix(1.0, texture2D(uPatchT, uv).r, step(uPadInk, 0.95));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.94, 0.9), a);
      float slit = uCut * smoothstep(0.03, 0.012, abs(vLocal.x - 0.16 - 0.25 * vLocal.y)) * step(0.0, vLocal.z) * step(0.04, vLocal.y) * step(vLocal.y, 0.5);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.05, 0.04), slit);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1.0, 0.75, 0.65) * uGlow * 0.35;`);
  };
  padMat.customProgramCacheKey = () => 'tampoPad';
  const padPts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; padPts.push(new THREE.Vector2(Math.max(0.0005, padProfile(u)), PH * u)); } padPts.push(new THREE.Vector2(0.0005, PH));
  const pad = new THREE.Mesh(new THREE.LatheGeometry(padPts, 96), padMat); pad.castShadow = shadows; padG.add(pad);
  addTo(padG, rbox(1.3, 0.1, 1.3, 0.03), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.7 }), [0, PH + 0.03, 0]);
  // lint + dust on the pad (on its undeformed surface near the apex)
  const surfAt = (rho) => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (padProfile(m) < rho) lo = m; else hi = m; } return PH * lo; };
  const lintG = new THREE.Group(); padG.add(lintG);
  const lintMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.9 });
  const RL = mulberry(5);
  for (let k = 0; k < 4; k++) {
    const pts = []; let a = RL() * 6.283, r = 0.05 + RL() * 0.2;
    for (let i = 0; i < 8; i++) { const rr = r + i * 0.025, aa = a + i * 0.12 * (RL() - 0.3); pts.push(new V3(Math.cos(aa) * rr, surfAt(rr) - 0.006, Math.sin(aa) * rr)); }
    lintG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 5), lintMat));
  }
  for (let k = 0; k < 14; k++) { const a = RL() * 6.283, r = 0.03 + RL() * 0.3; const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.009 + RL() * 0.012, 0), new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9 })); d.position.set(Math.cos(a) * r, surfAt(r) - 0.004, Math.sin(a) * r); lintG.add(d); }
  // tape station (pad cleaning) between the cliché and the part
  mesh(rbox(1.6, 0.5, 1.6, 0.04), darkM, [G.xT, G.TP_Y - 0.25, 0.2]);
  const tapeStMat = new THREE.MeshStandardMaterial({ color: 0xe6d496, roughness: 0.3, transparent: true, opacity: 0.7 });
  mesh(new THREE.BoxGeometry(1.4, 0.008, 1.3), tapeStMat, [G.xT, G.TP_Y + 0.004, 0.2], false);
  const tapeSpecks = new THREE.Group(); scene.add(tapeSpecks);
  for (let k = 0; k < 16; k++) { const a = RL() * 6.283, r = RL() * 0.3; const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012 + RL() * 0.012, 0), k < 4 ? lintMat : new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9 })); d.position.set(G.xT + Math.cos(a) * r, G.TP_Y + 0.01, Math.sin(a) * r); tapeSpecks.add(d); }

  // ---------------------------------------------------------------- part + fixture
  const P = G.part, partC = new V3(G.xP, P.y, 0);
  mesh(rbox(2.6, 0.7, 1.9, 0.04), darkM, [G.xP, -1.55, 0]);
  mesh(rbox(2.25, 0.06, 1.6, 0.02), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7 }), [G.xP, -1.2, 0]);
  const screws = [];
  for (const sx of [G.xP - 0.8, G.xP + 0.8]) {
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24).rotateX(Math.PI / 2), alu, [sx, -1.55, 0.965]);
    const s = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 1, roughness: 0.35 }), [sx, -1.55, 1.03]);
    screws.push(s);
  }
  const partU = { ...DECAL_U(T), uCenter: { value: partC }, uPrint: { value: 1 }, uBlur: { value: 0 }, uHoles: { value: 0 }, uFade: { value: 0 }, uFish: { value: 0 }, uSmudge: { value: 0 },
    uHaze: { value: 0 }, uStreak: { value: 0 }, uPeel: { value: 0 }, uPeelBad: { value: 0 }, uOil: { value: 0 }, uClothX: { value: -9 } };
  const partMat = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.42, metalness: 0.05 });
  partMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, partU); worldPosVertex(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform vec3 uCenter; uniform float uPrint, uBlur, uHoles, uFade, uFish, uSmudge, uHaze, uStreak, uPeel, uPeelBad, uOil, uClothX; ${DECAL_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 lp = vWPos - uCenter;
      vec2 uv = decalUV(lp.xz); float ir = inRect(uv);
      float a = mix(texture2D(uLogo, uv).a, texture2D(uLogoB, uv).a, uBlur) * ir;
      a *= mix(1.0, texture2D(uHolesT, uv).r, uHoles);
      a *= mix(1.0, texture2D(uPatchT, uv).r, uFade) * (1.0 - 0.35 * uFade);
      a *= mix(1.0, texture2D(uFishT, uv).r, uFish);
      vec2 uvs = uv - vec2(0.05, -0.03);
      a = max(a, texture2D(uLogoB, uvs).a * inRect(uvs) * 0.5 * uSmudge);
      float patchM = smoothstep(1.0, 0.8, length(lp.xz / vec2(0.78, 0.5)));
      float sl = step(0.9, fract(lp.z * 21.0 + 0.3 * sin(lp.x * 3.0))) * step(0.5, fract(sin(floor(lp.z * 21.0) * 91.7) * 437.5));
      a = max(a, patchM * (uHaze * 0.2 + uStreak * sl * 0.6));
      float under = step(abs(lp.z), 0.22) * step(-0.95, lp.x) * step(lp.x, 0.95);
      float peeled = under * step(mix(0.95, -0.95, uPeel), lp.x);
      float rip = 0.7 + 0.3 * step(0.5, fract(sin(dot(floor(lp.xz * 40.0), vec2(12.9, 78.2))) * 43758.5));
      a *= 1.0 - uPeelBad * peeled * rip;
      a = clamp(a * uPrint, 0.0, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.8, 0.77), a);
      float blot = smoothstep(0.1, 0.7, 0.5 + 0.5 * sin(lp.x * 4.1 + sin(lp.z * 5.3) * 1.7) * sin(lp.z * 3.7 + 1.3 + lp.x * 1.1));
      float oilM = uOil * step(uClothX, lp.x) * (0.35 + 0.65 * blot);
      vec3 irid = 0.5 + 0.5 * cos(6.283 * (vec3(0.0, 0.33, 0.67) + lp.x * 1.7 + lp.z * 2.3 + sin(lp.x * 5.0 + lp.z * 7.0) * 0.4));
      diffuseColor.rgb += oilM * irid * 0.06;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.55, a); roughnessFactor = mix(roughnessFactor, 0.08, oilM);`);
  };
  partMat.customProgramCacheKey = () => 'tampoPart';
  const part = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), partMat); part.scale.set(P.a, P.b, P.c); part.position.copy(partC); part.castShadow = shadows; part.receiveShadow = shadows; scene.add(part);
  const ellY = (x, z) => P.b * Math.sqrt(Math.max(0, 1 - (x * x) / (P.a * P.a) - (z * z) / (P.c * P.c)));
  // tape-test strip (CPU-peeled along x), carrying removed ink when adhesion is bad
  const TN = 60, tapeGeo = new THREE.BufferGeometry();
  const tPos = new Float32Array((TN + 1) * 2 * 3), tRest = new Float32Array((TN + 1) * 2 * 2), tIdx = [];
  for (let i = 0; i <= TN; i++) for (let j = 0; j < 2; j++) { const k = i * 2 + j; tRest[k * 2] = -0.95 + 1.9 * (i / TN); tRest[k * 2 + 1] = j ? 0.22 : -0.22; }
  for (let i = 0; i < TN; i++) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tapeGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tapeGeo.setAttribute('rest', new THREE.BufferAttribute(tRest, 2)); tapeGeo.setIndex(tIdx);
  const tapeU = { ...DECAL_U(T), uBad: { value: 0 } };
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xe9d9a0, roughness: 0.3, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false });
  tapeMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, tapeU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 rest; varying vec2 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = rest;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vRest; uniform float uBad; ${DECAL_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 uv = decalUV(vRest); float a = texture2D(uLogo, uv).a * inRect(uv) * uBad * 0.9;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), a); diffuseColor.a = mix(diffuseColor.a, 1.0, a);`);
  };
  const tape = new THREE.Mesh(tapeGeo, tapeMat); tape.renderOrder = 5; scene.add(tape);
  const tapeTab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.004, 0.44), new THREE.MeshStandardMaterial({ color: 0xd8c27a, roughness: 0.4 })); scene.add(tapeTab);
  const layTape = (peel) => {
    const fx = mix(0.95, -0.95, peel), dir = new V3(-0.55, 0.835, 0);
    const F = new V3(fx, ellY(fx, 0) + 0.008, 0);
    for (let i = 0; i <= TN; i++) for (let j = 0; j < 2; j++) {
      const k = i * 2 + j, x = tRest[k * 2], z = tRest[k * 2 + 1];
      let p;
      if (x <= fx) p = new V3(x, ellY(x, z) + 0.008, z);
      else { const s = x - fx; p = new V3(F.x + dir.x * s, F.y + dir.y * s, z); }
      tPos[k * 3] = p.x + partC.x; tPos[k * 3 + 1] = p.y + partC.y; tPos[k * 3 + 2] = p.z + partC.z;
    }
    tapeGeo.attributes.position.needsUpdate = true; tapeGeo.computeVertexNormals(); tapeGeo.computeBoundingSphere();
    const e = TN * 2; tapeTab.position.set(tPos[e * 3] - 0.0, tPos[e * 3 + 1], 0); tapeTab.rotation.z = peel > 0.01 ? Math.atan2(dir.y, dir.x) : 0;
  };
  // wiping cloth
  const cloth = mesh(rbox(0.5, 0.14, 0.46, 0.06), new THREE.MeshStandardMaterial({ color: 0xdfe8f0, roughness: 0.95 }), null);
  // viscosity check: cup on a stand, draining into a beaker
  const VX = -4.45, VZ = 1.55;
  mesh(cylBetween([VX - 0.55, -1.9, VZ], [VX - 0.55, 0.35, VZ], 0.03, 12), alu, null);
  mesh(cylBetween([VX - 0.55, 0.25, VZ], [VX - 0.3, 0.25, VZ], 0.025, 12), alu, null);
  mesh(new THREE.TorusGeometry(0.31, 0.025, 8, 32).rotateX(Math.PI / 2), alu, [VX, 0.25, VZ]);
  mesh(csg(new THREE.ConeGeometry(0.3, 0.5, 32).rotateX(Math.PI).translate(VX, 0.0, VZ), [['sub', new THREE.ConeGeometry(0.27, 0.48, 32).rotateX(Math.PI).translate(VX, 0.03, VZ)]]), new THREE.MeshStandardMaterial({ color: 0xb4bcc4, metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }), null);
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe6f0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.62, 32, 1, true), glass, [VX, -1.59, VZ], false).renderOrder = 6;
  const beakInk = mesh(new THREE.CylinderGeometry(0.26, 0.26, 1, 32).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: inkWhite, roughness: 0.2 }), [VX, -1.9, VZ], false);
  const streamMat = new THREE.MeshStandardMaterial({ color: inkWhite, roughness: 0.15 });
  const stream = mesh(new THREE.CylinderGeometry(0.016, 0.02, 1, 10).translate(0, -0.5, 0), streamMat, [VX, -0.25, VZ], false);
  // inspection light
  const sweepL = new THREE.PointLight(0xffffff, 0, 3.0, 1.6); scene.add(sweepL);

  // ---------------------------------------------------------------- rig: section through the cliché etch
  const E0 = RIG.etch;
  const rigSteel = new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.32, metalness: 0.85 });
  const GX = [-0.85, 0, 0.85], GW = 0.45, GD = 0.3;
  const blockGeo = csg(rbox(6.0, 1.2, 1.4, 0.03).translate(0, -0.6, 0), GX.map((x) => ['sub', new THREE.BoxGeometry(GW, GD * 2, 1.6).translate(x, 0, 0)]));
  const block = new THREE.Mesh(blockGeo, rigSteel); block.position.copy(E0); block.receiveShadow = shadows; scene.add(block);
  const rigInk = new THREE.Color(0xc9c9c2), rigInkMat = new THREE.MeshStandardMaterial({ color: rigInk, roughness: 0.12, metalness: 0.0 });
  const grooveInk = GX.map((x) => {
    const res = new THREE.Mesh(new THREE.BoxGeometry(GW - 0.004, 0.035, 1.38), rigInkMat); res.position.copy(E0).add(new V3(x, -GD + 0.0175, 0)); scene.add(res);
    const main = new THREE.Mesh(new THREE.BoxGeometry(GW - 0.004, GD - 0.035, 1.38), rigInkMat); scene.add(main);
    return { x, res, main };
  });
  const blade = new THREE.Mesh(csg(rbox(0.3, 1.5, 1.42, 0.02).translate(0, 0.75, 0), [['sub', new THREE.BoxGeometry(0.3, 0.3, 1.6).rotateZ(Math.PI / 4).translate(-0.21, 0.0, 0)]]), new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.3 }));
  scene.add(blade);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.38).translate(0.5, 0.25, 0), new THREE.MeshStandardMaterial({ color: rigInk, roughness: 0.1 })); scene.add(pool);
  const RR = 20, rigPadShape = new THREE.Shape();
  rigPadShape.moveTo(-3.3, 2.2); for (let i = 0; i <= 60; i++) { const x = -3.3 + 6.6 * (i / 60); rigPadShape.lineTo(x, RR - Math.sqrt(RR * RR - x * x)); } rigPadShape.lineTo(3.3, 2.2); rigPadShape.lineTo(-3.3, 2.2);
  const rigPadGeo = new THREE.ExtrudeGeometry(rigPadShape, { depth: 1.3, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.65);
  const rigPadU = { uSurf: { value: -9 }, uKx: { value: 0 }, uKz: { value: 0 } };
  const rigPadMat = new THREE.MeshStandardMaterial({ color: 0xe8998a, roughness: 0.55 });
  rigPadMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, rigPadU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSurf, uKx, uKz;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y = max(transformed.y, uSurf);');
  };
  const rigPad = new THREE.Mesh(rigPadGeo, rigPadMat); scene.add(rigPad);
  const padBot = (x) => RR - Math.sqrt(RR * RR - x * x);
  const wisps = new Puffs(scene, { count: 60, color: 0xdfe6ec, opacity: 0, size: 0.5 });
  // rig: ink layer vs a hair, at 1 unit = 100 µm
  const H0 = RIG.hair;
  mesh(rbox(6.0, 1.6, 2.2, 0.03), new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.45 }), [H0.x, H0.y - 0.8, H0.z]);
  mesh(rbox(4.0, 0.1, 2.2, 0.02), new THREE.MeshStandardMaterial({ color: 0xb8b8b2, roughness: 0.5 }), [H0.x - 0.4, H0.y + 0.05, H0.z]);
  mesh(cylBetween([H0.x + 0.9, H0.y + 0.45, H0.z - 1.6], [H0.x + 0.9, H0.y + 0.45, H0.z + 1.6], 0.35, 48), new THREE.MeshStandardMaterial({ color: 0x5b3b22, roughness: 0.42, metalness: 0.05 }), null);
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: E0, pos: E0.clone().add(new V3(1.5, 5, 5)) }, { c: H0, pos: H0.clone().add(new V3(-1.5, 5, 4.5)) }];

  // ---------------------------------------------------------------- update
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 0;
    ST.setCut(cut, 2.0, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    // shuttle + pad
    carG.position.x = st.padX;
    padG.position.y = st.padY;
    const yH = st.padY + PH + 0.08 + 0.14;
    holder.position.y = yH - 0.07;
    rod.scale.y = Math.max(0.01, 1.95 - yH);
    let surfY = -9, kx = 0, kz = 0;
    if (Math.abs(st.padX - G.xC) < 0.05) surfY = G.CL_Y;
    else if (Math.abs(st.padX - G.xP) < 0.05) { surfY = G.PART_Y; kx = P.b / (2 * P.a * P.a); kz = P.b / (2 * P.c * P.c); }
    else if (Math.abs(st.padX - G.xT) < 0.05) surfY = G.TP_Y;
    padU.uSurf.value = surfY - st.padY; padU.uKx.value = kx; padU.uKz.value = kz;
    padU.uPadInk.value = st.padInk; padU.uCut.value = st.padCut; padU.uGlow.value = st.newPad;
    lintG.visible = st.lint > 0.5 && padU.uSurf.value < 0;
    tapeSpecks.visible = t > 63.25 && t < 64.4;
    // cup + cliché
    cupG.position.set(st.cupX, G.CL_Y, 0);
    cupRod.scale.x = Math.max(0.01, st.cupX - 0.6 - -4.35);
    chips.visible = st.ringWorn > 0.5;
    gasketMat.emissiveIntensity = 1.2 * st.seal;
    clU.uEtchInk.value = st.etchInk; clU.uTacky.value = st.tacky; clU.uHaze.value = st.clHaze;
    sweepL.intensity = st.sweep > 0 && st.sweep < 1 ? 3.5 : 0; sweepL.position.set(mix(-4.0, -1.2, st.sweep), G.CL_Y + 0.5, 0.4);
    if (t > 72.6 && t < 74.4) { sweepL.intensity = 5; sweepL.distance = 4; sweepL.position.set(G.xP, -1.1, 2.2); } else sweepL.distance = 3;
    // part print
    Object.assign(partU.uPrint, { value: st.print }); partU.uBlur.value = st.blur; partU.uHoles.value = st.holes; partU.uFade.value = st.fade; partU.uFish.value = st.fish;
    partU.uSmudge.value = st.smudge; partU.uHaze.value = st.haze; partU.uStreak.value = st.streak; partU.uPeel.value = st.peel; partU.uPeelBad.value = st.peelBad;
    partU.uOil.value = st.oil; partU.uClothX.value = st.cloth > 0.5 ? st.clothX : -9;
    tape.visible = tapeTab.visible = st.tape > 0.5; if (tape.visible) layTape(st.peel); tapeU.uBad.value = st.peelBad;
    cloth.visible = st.cloth > 0.5; if (cloth.visible) { const cx = Math.max(-0.95, Math.min(0.95, st.clothX)); cloth.position.set(partC.x + cx, partC.y + ellY(cx, 0) + 0.06, 0); cloth.rotation.z = -Math.atan2(-P.b * cx / (P.a * P.a), Math.max(0.05, ellY(cx, 0) / P.b)) * 0.9; }
    screws.forEach((s) => (s.rotation.z = st.screw));
    // viscosity cup
    const bs = 0.12 + 0.12 * smooth(66.7, 68.5, t); beakInk.scale.y = bs;
    stream.visible = st.visc > 0.02; stream.scale.y = Math.max(0.01, st.visc * (1.65 - bs)); stream.scale.x = stream.scale.z = 1 - 0.4 * smooth(67.8, 68.6, t);
    // rig: etch section
    const rp = st.rigPadY;
    rigPad.position.set(E0.x, E0.y + rp, E0.z); rigPadU.uSurf.value = -rp; rigPad.visible = rp < 3.9;
    for (const g of grooveInk) {
      const vis = st.rigFill > 0.5;
      g.res.visible = vis && st.rigLifted > 0.5; g.main.visible = vis;
      const topY = st.rigLifted > 0.5 ? Math.max(0, rp + padBot(g.x)) : 0;
      g.main.position.set(E0.x + g.x, E0.y + topY - (GD - 0.035) / 2, E0.z);
      if (st.rigLifted < 0.5) g.main.scale.y = GD / (GD - 0.035), g.main.position.y = E0.y - GD / 2; else g.main.scale.y = 1;
    }
    rigInkMat.roughness = mix(0.12, 0.75, st.rigTacky); rigInkMat.color.copy(rigInk).multiplyScalar(1 - 0.2 * st.rigTacky);
    const bw = t >= 17.0 && t < 19.4;
    blade.visible = bw; blade.position.set(E0.x + st.rigBlade, E0.y, E0.z);
    const L = 3.5 - (st.rigBlade + 0.15); pool.visible = bw && L > 0.01; pool.scale.x = Math.max(0.01, L); pool.position.set(E0.x + st.rigBlade + 0.15, E0.y, E0.z);
    wisps.mat.uniforms.uOpacity.value = 0.32 * (t > 19.3 && t < 22.8 ? smooth(19.4, 20.4, t) * (1 - smooth(21.8, 22.6, t)) : 0);
    wisps.update((i, s, o) => { const age = ((t * 0.5 + s[0]) % 1); const gx = GX[i % 3]; o.p.set(E0.x + gx + (s[1] - 0.5) * 0.45 + (s[3] - 0.5) * 0.4 * age, E0.y + 0.05 + age * 1.6, E0.z + (s[2] - 0.5) * 1.0); o.size = 0.15 + age * 0.6; o.alpha = smooth(0, 0.25, age) * (1 - age); });
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 16);
    rigL.visible = !!rs; rigL.intensity = rs ? (rs.c === H0 ? 32 : 45) : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    cliche: new V3(-1.35, G.CL_Y, 0.6), image: new V3(G.xC - 0.3, G.CL_Y, 0.1), cup: new V3(G.cupAway + 0.55, G.CL_Y + 0.4, 0.3), get cupNow() { return cupG.position.clone().add(new V3(0.55, 0.4, 0.3)); },
    ring: new V3(G.cupAway + 0.55, G.CL_Y + 0.04, 0.2), get gasketNow() { return cupG.position.clone().add(new V3(0.6, 0.58, 0.2)); },
    get pad() { return new V3(carG.position.x + 0.5, padG.position.y + 0.3, 0.2); }, get padTip() { return new V3(carG.position.x + 0.08, padG.position.y + 0.02, 0.1); },
    part: new V3(G.xP + 0.6, G.PART_Y - 0.1, 0.4), print: new V3(G.xP + 0.15, G.PART_Y + 0.01, 0.05), fixture: new V3(G.xP + 0.8, -1.55, 1.05), tapeStation: new V3(G.xT + 0.5, G.TP_Y, 0.6),
    cylinder: new V3(G.xC + 0.25, 2.5, 0.1), visc: new V3(VX + 0.25, 0.1, VZ), stream: new V3(VX, -0.9, VZ),
    groove: E0.clone().add(new V3(0, -0.15, 0.7)), blade: E0.clone().add(new V3(0, 0.8, 0.7)), etchSurf: E0.clone().add(new V3(-2.6, 0, 0.7)), rigPad: E0.clone().add(new V3(1.0, 1.2, 0.7)),
    ink10: H0.clone().add(new V3(-1.6, 0.1, 1.1)), hair: H0.clone().add(new V3(0.9, 0.8, 0.9)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
