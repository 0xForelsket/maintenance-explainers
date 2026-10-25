// Y-strainer scene: geometry, materials, water + debris simulation. Everything is a pure function of t.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { G, legPoint, ductPoint, inletPoint } from './geom.js';
import { T, stateAt } from './timeline.js';
import { MESH } from './meshdata.js';

const V3 = THREE.Vector3;
const D = new V3(...G.D), NN = new V3(...G.N), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1), X = new V3(1, 0, 0);
const v3 = (a) => new V3(a[0], a[1], a[2]);
const lp = (s, r, th) => v3(legPoint(s, r, th));
const FLOOR_Y = -7.2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- mesh data
async function unpack(b64) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  const h = new Float32Array(buf, 0, 8);
  const nv = h[0], ni = h[1];
  const bmin = [h[2], h[3], h[4]], bmax = [h[5], h[6], h[7]];
  let off = 32;
  const q = new Uint16Array(buf, off, nv * 3); off += nv * 6;
  const nn = new Int8Array(buf, off, nv * 3); off += nv * 3;
  off += (4 - (off % 4)) % 4;
  const idx = new Uint32Array(buf.slice(off, off + ni * 4)); off += ni * 4;
  const inner = new Uint8Array(buf.slice(off, off + nv));
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) {
    const a = i % 3;
    pos[i] = bmin[a] + (q[i] / 65535) * (bmax[a] - bmin[a]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(nn), 3, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  if (inner.length === nv) g.setAttribute('aInner', new THREE.BufferAttribute(inner, 1, true));
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------- geometry helpers
function flipGeo(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
// closed thick-walled tube along +Y from 0..len
function tubeSolid(rIn, rOut, len, segs = 64, groups = false) {
  const o = new THREE.CylinderGeometry(rOut, rOut, len, segs, 1, true).translate(0, len / 2, 0);
  const i = flipGeo(new THREE.CylinderGeometry(rIn, rIn, len, segs, 1, true)).translate(0, len / 2, 0);
  const b = new THREE.RingGeometry(rIn, rOut, segs, 1).rotateX(Math.PI / 2);
  const t = new THREE.RingGeometry(rIn, rOut, segs, 1).rotateX(-Math.PI / 2).translate(0, len, 0);
  return mergeGeometries([o, i, b, t], groups);
}
// flat plate with bore + bolt holes, extruded along +Z from 0..depth
function plateGeo(R, rBore, pcd, rBolt, n, depth, angOff = Math.PI / n) {
  const s = new THREE.Shape();
  s.absarc(0, 0, R, 0, Math.PI * 2, false);
  if (rBore > 0) { const h = new THREE.Path(); h.absarc(0, 0, rBore, 0, Math.PI * 2, true); s.holes.push(h); }
  for (let k = 0; k < n; k++) {
    const a = angOff + (k * 2 * Math.PI) / n;
    const h = new THREE.Path(); h.absarc(pcd * Math.cos(a), pcd * Math.sin(a), rBolt, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const bt = 0.022;
  let g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, curveSegments: 96 });
  g.translate(0, 0, bt);
  g = toCreasedNormals(g, Math.PI / 5);
  return g;
}
const qAlign = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());

// ---------------------------------------------------------------- shader snippets
// tileable noise texture: RG = height gradient, B = fine height, A = low-frequency mottle
let NOISE_TEX = null;
function noiseTexture() {
  if (NOISE_TEX) return NOISE_TEX;
  const S = 256, r = mulberry(99);
  const layer = (cells) => { const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = r(); return { g, cells }; };
  const sample = (L, x, y) => {
    const c = L.cells, fx = (x / S) * c, fy = (y / S) * c;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const at = (a, b) => L.g[((a % c) + c) % c + (((b % c) + c) % c) * c];
    return (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
  };
  const L1 = layer(24), L2 = layer(48), L3 = layer(96), Lm = layer(6), Lm2 = layer(12);
  const h = new Float32Array(S * S), m = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    h[x + y * S] = 0.5 * sample(L1, x, y) + 0.3 * sample(L2, x, y) + 0.2 * sample(L3, x, y);
    m[x + y * S] = 0.65 * sample(Lm, x, y) + 0.35 * sample(Lm2, x, y);
  }
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = x + y * S;
    const gx = (h[((x + 1) % S) + y * S] - h[((x - 1 + S) % S) + y * S]) * 0.5 * 24;
    const gy = (h[x + ((y + 1) % S) * S] - h[x + ((y - 1 + S) % S) * S]) * 0.5 * 24;
    data[i * 4] = Math.max(0, Math.min(255, 128 + gx * 127));
    data[i * 4 + 1] = Math.max(0, Math.min(255, 128 + gy * 127));
    data[i * 4 + 2] = Math.round(h[i] * 255);
    data[i * 4 + 3] = Math.round(m[i] * 255);
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  NOISE_TEX = t;
  return t;
}
function worldPosVertex(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vWPos = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;
      #else
        vWPos = (modelMatrix * vec4(transformed,1.0)).xyz;
      #endif`);
}
// cast / painted surface: triplanar sand-cast grain + low-frequency mottling
function castSurface(mat, { freq = 0.9, bump = 0.22, mottle = 0.2, grime = 0.0 } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFreq = { value: freq };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uNoiseTex = { value: noiseTexture() };
    worldPosVertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform float uFreq; uniform float uBump; uniform sampler2D uNoiseTex;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float nLow = texture2D(uNoiseTex, vWPos.xy*0.045 + vWPos.zx*0.031).a;
        diffuseColor.rgb *= mix(1.0-${mottle.toFixed(3)}, 1.0+${(mottle * 0.5).toFixed(3)}, nLow);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.72,0.58,0.45), ${grime.toFixed(3)}*smoothstep(0.45,0.75,texture2D(uNoiseTex, vWPos.xz*0.11+vWPos.y*0.07+0.3).a));`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          vec3 wN = normalize(inverseTransformDirection(normal, viewMatrix));
          vec3 bw = pow(abs(wN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec3 P = vWPos * uFreq;
          vec4 sx = texture2D(uNoiseTex, P.yz), sy = texture2D(uNoiseTex, P.xz), sz = texture2D(uNoiseTex, P.xy);
          vec3 g = vec3(0.0, sx.r*2.0-1.0, sx.g*2.0-1.0)*bw.x + vec3(sy.r*2.0-1.0, 0.0, sy.g*2.0-1.0)*bw.y + vec3(sz.r*2.0-1.0, sz.g*2.0-1.0, 0.0)*bw.z;
          float hgt = sx.b*bw.x + sy.b*bw.y + sz.b*bw.z;
          vec3 gv = (viewMatrix * vec4(g, 0.0)).xyz;
          normal = normalize(normal - uBump * (gv - dot(gv, normal) * normal));
          roughnessFactor *= mix(0.82, 1.16, hgt);
        }`);
  };
  mat.customProgramCacheKey = () => `cast${freq}${bump}${mottle}${grime}`;
  return mat;
}

// ---------------------------------------------------------------- build
export async function buildStrainer(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090d);
  scene.fog = new THREE.FogExp2(0x06090d, 0.022);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  renderer.localClippingEnabled = true;

  const clipPlane = new THREE.Plane(new V3(0, 0, -1), 100);
  const clip = [clipPlane];
  const shadows = quality !== 'low';

  // ------------------------------------------------ materials
  const M = {};
  M.cast = castSurface(new THREE.MeshStandardMaterial({ color: 0x343b44, roughness: 0.5, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 0.95, bump: 0.16, mottle: 0.22 });
  M.machined = castSurface(new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.4, metalness: 0.45, clippingPlanes: clip, clipShadows: true }), { freq: 0.6, bump: 0.04, mottle: 0.12 });
  M.pipe = castSurface(new THREE.MeshStandardMaterial({ color: 0x4e5862, roughness: 0.42, metalness: 0.42, clippingPlanes: clip, clipShadows: true }), { freq: 0.5, bump: 0.05, mottle: 0.14 });
  M.pipeInside = castSurface(new THREE.MeshStandardMaterial({ color: 0x5c4b3a, roughness: 0.85, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 1.6, bump: 0.3, mottle: 0.45, grime: 0.7 });
  M.zinc = new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 1, roughness: 0.46, clippingPlanes: clip, clipShadows: true });
  M.zincNoClip = new THREE.MeshStandardMaterial({ color: 0x9aa1a9, metalness: 1, roughness: 0.4 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.32, clippingPlanes: clip, clipShadows: true });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.12, clippingPlanes: clip, clipShadows: true });
  M.gasket = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9, clippingPlanes: clip, clipShadows: true });
  M.lever = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  M.support = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.7, metalness: 0.5 });
  M.floor = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.55, metalness: 0.0 });
  // section faces: back-face trick, flat colour with fine diagonal hatch
  M.cut = new THREE.MeshBasicMaterial({ color: 0xa44c26, side: THREE.BackSide, clippingPlanes: clip });
  M.cut.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hl = fract((gl_FragCoord.x + gl_FragCoord.y) / 16.0);
      diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.42,0.5,hl)*(1.0-smoothstep(0.92,1.0,hl)));`);
  };
  M.cutSteel = M.cut.clone(); M.cutSteel.clippingPlanes = clip; M.cutSteel.color.set(0x9aa3ad); M.cutSteel.onBeforeCompile = M.cut.onBeforeCompile;
  M.fluid = new THREE.MeshBasicMaterial({ color: 0x1aa6d6, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false, clippingPlanes: clip });

  // screen: perforated stainless with per-hole fouling
  const screenU = { uFoul: { value: 0 }, uPitch: { value: 0.078 } };
  M.screen = new THREE.MeshStandardMaterial({ color: 0xaeb6bf, metalness: 1, roughness: 0.4, envMapIntensity: 0.55, side: THREE.DoubleSide, clippingPlanes: clip, clipShadows: true, alphaHash: true });
  M.screen.defines = { USE_UV: '' };
  M.screen.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, screenU);
    worldPosVertex(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; uniform float uFoul; uniform float uPitch;
        float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 P = vec2(vUv.x * ${(2 * Math.PI * G.SCREEN_R).toFixed(4)}, vUv.y * ${(G.SCREEN_S1 - G.SCREEN_S0).toFixed(4)}) / uPitch;
        vec2 rr = vec2(1.0, 1.7320508); vec2 hv = rr*0.5;
        vec2 a = mod(P, rr) - hv; vec2 b = mod(P - hv, rr) - hv;
        vec2 gg = dot(a,a) < dot(b,b) ? a : b;
        vec2 cid = floor((P - gg) * 2.0 + 0.5);
        float d = length(gg);
        float aa = max(fwidth(d) * 0.9, 0.0001);
        float holeR = 0.34;
        float hole = 1.0 - smoothstep(holeR - aa, holeR + aa, d);
        float far = smoothstep(0.18, 0.45, aa);
        hole = mix(hole, 0.42, far);
        float sAx = dot(vWPos, vec3(${G.D[0].toFixed(6)}, ${G.D[1].toFixed(6)}, 0.0));
        float bias = mix(0.55, 1.35, smoothstep(${G.SCREEN_S0.toFixed(2)}, ${G.SCREEN_S1.toFixed(2)}, sAx));
        float fouled = step(hh(cid), uFoul * bias);
        float rim = smoothstep(${(G.SCREEN_S0 + 0.06).toFixed(3)}, ${(G.SCREEN_S0 + 0.1).toFixed(3)}, sAx) * (1.0 - smoothstep(${(G.SCREEN_S1 - 0.1).toFixed(3)}, ${(G.SCREEN_S1 - 0.06).toFixed(3)}, sAx));
        hole *= rim;
        float holeOpen = hole * (1.0 - fouled * (1.0 - far*0.5));
        vec3 rust = vec3(0.30, 0.15, 0.07);
        diffuseColor.rgb = mix(diffuseColor.rgb, rust, clamp(uFoul*bias*0.55 + fouled*hole*0.9, 0.0, 0.92));
        diffuseColor.a = 1.0 - holeOpen;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.9, clamp(uFoul*bias*0.8, 0.0, 1.0));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.2, clamp(uFoul*bias*0.8, 0.0, 1.0));`);
  };
  M.screen.customProgramCacheKey = () => 'screen1';

  M.water = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fe6ff).multiplyScalar(1.55), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });
  M.jet = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xa8ecff).multiplyScalar(0.55), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  M.rust = new THREE.MeshStandardMaterial({ color: 0x7a3518, roughness: 0.92, metalness: 0.1, flatShading: true, clippingPlanes: clip });
  M.scale = new THREE.MeshStandardMaterial({ color: 0xd6cfbf, roughness: 0.85, metalness: 0.0, flatShading: true, clippingPlanes: clip });
  M.sand = new THREE.MeshStandardMaterial({ color: 0xb39463, roughness: 0.95, flatShading: true, clippingPlanes: clip });
  M.rustHero = castSurface(new THREE.MeshStandardMaterial({ color: 0x6a2c12, roughness: 0.95, metalness: 0.15, clippingPlanes: clip }), { freq: 9, bump: 0.55, mottle: 0.5, grime: 0.6 });

  const cutMeshes = [];
  const addSolid = (geo, mat, cutMat = M.cut, parent = scene, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast && shadows; m.receiveShadow = shadows;
    parent.add(m);
    if (cutMat) {
      const c = new THREE.Mesh(geo, cutMat);
      c.renderOrder = -1;
      m.add(c);
      cutMeshes.push(c);
    }
    return m;
  };

  // ------------------------------------------------ cast body (SDF mesh)
  const bodyGeo = await unpack(MESH.body);
  // inside vs outside surfaces: split material by vertex "insideness" — use groups on normals pointing toward axes is overkill;
  // instead blend via a second pass: outside paint on everything, inner rough grime added by world-pos test in shader.
  const bodyMat = M.cast.clone(); bodyMat.clippingPlanes = clip;
  bodyMat.onBeforeCompile = (shader) => {
    M.cast.onBeforeCompile(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aInner; varying float vInner;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInner = aInner;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInner;')
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float inner = smoothstep(0.2, 0.8, vInner);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13,0.10,0.075) * (0.7 + 0.6*nLow), inner * 0.92);
      roughnessFactor = mix(roughnessFactor, 0.9, inner);
      metalnessFactor = mix(metalnessFactor, 0.12, inner);`);
  };
  bodyMat.customProgramCacheKey = () => 'body2';
  const body = addSolid(bodyGeo, bodyMat);

  const fluidGeo = await unpack(MESH.fluid);
  const fluidGroup = new THREE.Group();
  scene.add(fluidGroup);
  const fluidBody = new THREE.Mesh(fluidGeo, M.fluid); fluidBody.renderOrder = 5; fluidGroup.add(fluidBody);
  for (const sgn of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.985, 0.985, G.PIPE_X1 - 3.55, 64, 1, false).rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(g, M.fluid); m.position.x = sgn * (3.55 + (G.PIPE_X1 - 3.55) / 2); m.renderOrder = 5; fluidGroup.add(m);
  }

  // ------------------------------------------------ flanges, pipes, bolts
  const mainFl = plateGeo(G.FL_R, G.R_BORE, G.BOLT_PCD, G.BOLT_R + 0.02, G.N_BOLTS, G.FL_T);
  const mateFl = plateGeo(G.FL_R, G.R_BORE + 0.12, G.BOLT_PCD, G.BOLT_R + 0.02, G.N_BOLTS, 0.32);
  const hub = tubeSolid(G.PIPE_R_OUT, 1.42, 0.45, 72);
  const pipe = tubeSolid(G.R_BORE, G.PIPE_R_OUT, G.PIPE_X1 - G.PIPE_X0, 96, true);
  const pipeMats = [M.pipe, M.pipeInside, M.pipe, M.pipe];
  const gasket = tubeSolid(G.R_BORE + 0.02, 1.75, 0.04, 72);
  const boltShank = new THREE.CylinderGeometry(G.BOLT_R, G.BOLT_R, 1.0, 16).toNonIndexed();
  const nut = toCreasedNormals(new THREE.CylinderGeometry(0.22, 0.22, 0.17, 6), 0.5);
  const boltGeo = mergeGeometries([boltShank, nut.clone().translate(0, -0.42, 0), nut.clone().translate(0, 0.42, 0)]);
  const bolts = [];
  for (const sgn of [-1, 1]) {
    const qx = qAlign(Z, new V3(sgn, 0, 0));
    const f1 = addSolid(mainFl, M.machined); f1.quaternion.copy(qx); f1.position.x = sgn * G.X_BODY;
    const gk = addSolid(gasket, M.gasket); gk.quaternion.copy(qAlign(Y, new V3(sgn, 0, 0))); gk.position.x = sgn * (G.X_BODY + G.FL_T);
    const f2 = addSolid(mateFl, M.pipe); f2.quaternion.copy(qx); f2.position.x = sgn * (G.X_BODY + G.FL_T + 0.04);
    const hb = addSolid(hub, M.pipe); hb.quaternion.copy(qAlign(Y, new V3(sgn, 0, 0))); hb.position.x = sgn * (G.X_BODY + G.FL_T + 0.36);
    const pp = addSolid(pipe, pipeMats); pp.quaternion.copy(qAlign(Y, new V3(sgn, 0, 0))); pp.position.x = sgn * G.PIPE_X0;
    for (let k = 0; k < G.N_BOLTS; k++) {
      const a = Math.PI / G.N_BOLTS + (k * 2 * Math.PI) / G.N_BOLTS;
      const m = new THREE.Matrix4().compose(
        new V3(sgn * (G.X_BODY + 0.37), G.BOLT_PCD * Math.sin(a), G.BOLT_PCD * Math.cos(a)),
        qAlign(Y, X), new V3(1, 1, 1));
      bolts.push(m);
    }
  }

  // leg flange (cast) + cover + bolts
  const qD = qAlign(Z, D);
  const legFl = addSolid(plateGeo(G.LEGFL_R, G.LEG_R_IN, G.LEGFL_PCD, G.BOLT_R + 0.02, 8, G.LEGFL_T), M.machined);
  legFl.quaternion.copy(qD); legFl.position.copy(lp(G.LEG_END));
  const cover = addSolid(plateGeo(G.LEGFL_R, G.NIPPLE_R_IN, G.LEGFL_PCD, G.BOLT_R + 0.02, 8, G.COVER_T), M.machined);
  cover.quaternion.copy(qD); cover.position.copy(lp(G.COVER_S));
  // stainless boss on cover
  const qDY = qAlign(Y, D);
  const placeY = (geo, mat, s, cutMat = M.cut) => { const m = addSolid(geo, mat, cutMat); m.quaternion.copy(qDY); m.position.copy(lp(s)); return m; };
  placeY(tubeSolid(G.NIPPLE_R_IN, 0.52, 0.16, 48), M.machined, G.COVER_S + G.COVER_T);
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * 2 * Math.PI) / 8;
    // local plate coords: x,y in plate -> world via qD
    const off = new V3(G.LEGFL_PCD * Math.cos(a), G.LEGFL_PCD * Math.sin(a), 0).applyQuaternion(qD);
    const c = lp(G.LEG_END + 0.33).add(off);
    bolts.push(new THREE.Matrix4().compose(c, qDY, new V3(1, 1, 1)));
  }
  const boltMesh = new THREE.InstancedMesh(boltGeo, M.zinc, bolts.length);
  bolts.forEach((m, i) => boltMesh.setMatrixAt(i, m));
  boltMesh.castShadow = shadows; scene.add(boltMesh);
  const boltCut = new THREE.InstancedMesh(boltGeo, M.cutSteel, bolts.length);
  bolts.forEach((m, i) => boltCut.setMatrixAt(i, m));
  scene.add(boltCut); cutMeshes.push(boltCut);

  // ------------------------------------------------ screen
  const scrLen = G.SCREEN_S1 - G.SCREEN_S0;
  const screenGeo = new THREE.CylinderGeometry(G.SCREEN_R, G.SCREEN_R, scrLen, 160, 24, true);
  const screen = new THREE.Mesh(screenGeo, M.screen);
  screen.quaternion.copy(qDY); screen.position.copy(lp(G.SCREEN_S0 + scrLen / 2));
  screen.castShadow = shadows; screen.receiveShadow = shadows;
  scene.add(screen);
  placeY(tubeSolid(G.SCREEN_R - 0.05, G.SCREEN_R + 0.05, 0.12, 96), M.chrome, G.SCREEN_S0 - 0.02, M.cutSteel);
  placeY(tubeSolid(G.SCREEN_R - 0.05, G.SCREEN_R + 0.05, 0.1, 96), M.chrome, G.SCREEN_S1 - 0.1, M.cutSteel);

  // ------------------------------------------------ blowdown: nipple, ball valve, outlet
  const sCov = G.COVER_S + G.COVER_T + 0.16;
  placeY(tubeSolid(G.NIPPLE_R_IN, G.NIPPLE_R_OUT, 5.6 - sCov, 48), M.brass, sCov);
  const hexEnd = (s) => placeY(toCreasedNormals(tubeSolid(G.NIPPLE_R_IN, 0.44, 0.22, 6), 0.4), M.brass, s);
  hexEnd(5.6); hexEnd(6.5);
  placeY(tubeSolid(0.44, 0.58, 0.68, 64), M.brass, 5.82);
  placeY(tubeSolid(G.NIPPLE_R_IN, G.NIPPLE_R_OUT, G.NOZZLE_S - 6.72, 48), M.brass, 6.72);
  // ball with bore (bore along local Y)
  const ballR = 0.42, yb = Math.sqrt(ballR * ballR - G.NIPPLE_R_IN * G.NIPPLE_R_IN), th0 = Math.acos(yb / ballR);
  const ballGeo = mergeGeometries([
    new THREE.SphereGeometry(ballR, 64, 32, 0, Math.PI * 2, th0, Math.PI - 2 * th0),
    flipGeo(new THREE.CylinderGeometry(G.NIPPLE_R_IN, G.NIPPLE_R_IN, 2 * yb, 48, 1, true)),
  ]);
  const ballPivot = new THREE.Group(); ballPivot.position.copy(lp(G.VALVE_S)); scene.add(ballPivot);
  addSolid(ballGeo, M.chrome, M.cutSteel, ballPivot);
  // stem + lever (not clipped: sits in front of the section)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 20).rotateX(Math.PI / 2).translate(0, 0, 0.78), M.zincNoClip);
  stem.castShadow = shadows;
  const leverPivot = new THREE.Group(); leverPivot.position.copy(lp(G.VALVE_S)); scene.add(leverPivot);
  leverPivot.add(stem);
  const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.25, 0.05).translate(0, 0.55, 1.09), M.zincNoClip);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.62, 6, 16).translate(0, 0.86, 1.09), M.lever);
  const leverNut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 6).rotateX(Math.PI / 2).translate(0, 0, 1.15), M.zincNoClip);
  [leverArm, grip, leverNut].forEach((m) => { m.castShadow = shadows; leverPivot.add(m); });
  const valveAngle = (open) => -Math.PI / 4 - open * Math.PI / 2;

  // ------------------------------------------------ gauges
  const gauges = [];
  function makeGauge(name, x) {
    const g = new THREE.Group();
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const ctx = cv.getContext('2d');
    const drawDial = () => {
      ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, 512, 512);
      const grd = ctx.createRadialGradient(256, 230, 40, 256, 256, 256); grd.addColorStop(0, 'rgba(255,255,255,0.0)'); grd.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 512);
      ctx.translate(256, 256);
      for (let v = 0; v <= 100; v++) {
        const a = (-135 + (v / 100) * 270) * Math.PI / 180;
        const major = v % 10 === 0, mid = v % 5 === 0;
        const r0 = major ? 168 : mid ? 182 : 190, r1 = 204;
        ctx.strokeStyle = v >= 80 ? '#c3262b' : '#1a1c1f'; ctx.lineWidth = major ? 6 : mid ? 3.5 : 2;
        ctx.beginPath(); ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); ctx.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1); ctx.stroke();
        if (major) {
          ctx.fillStyle = '#1a1c1f'; ctx.font = `600 34px ${fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(v / 10), Math.sin(a) * 136, -Math.cos(a) * 136);
        }
      }
      ctx.fillStyle = '#1a1c1f'; ctx.font = `700 40px ${fontFamily}`; ctx.fillText(name, 0, 62);
      ctx.font = `500 26px ${fontFamily}`; ctx.fillStyle = '#5a5e64'; ctx.fillText('bar', 0, 104);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      tex.needsUpdate = true;
    };
    drawDial();
    const R = 0.8;
    const caseGeo = new THREE.CylinderGeometry(R, R, 0.34, 64).rotateX(Math.PI / 2);
    const cs = new THREE.Mesh(caseGeo, new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.6, roughness: 0.35 })); cs.castShadow = shadows; g.add(cs);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.055, 16, 96), M.zincNoClip); bezel.position.z = 0.17; g.add(bezel);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.07, 64), new THREE.MeshStandardMaterial({ map: tex, color: 0x9c9c9c, roughness: 0.75, envMapIntensity: 0.4 })); face.position.z = 0.172; g.add(face);
    // dial geometry is drawn at 204/256 of the canvas half-width -> map to face radius
    const needlePivot = new THREE.Group(); needlePivot.position.z = 0.2; g.add(needlePivot);
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xc3262b, roughness: 0.4, emissive: 0x330000 });
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.012).translate(0, 0.22, 0), needleMat); needlePivot.add(nd);
    const hubm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24).rotateX(Math.PI / 2), M.zincNoClip); hubm.position.z = 0.21; g.add(hubm);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(R - 0.03, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false }));
    glass.position.z = 0.235; g.add(glass);
    // stem down to pipe
    const stemG = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 20), M.zincNoClip); stemG.position.y = -R - 0.55; g.add(stemG);
    const hexG = new THREE.Mesh(toCreasedNormals(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 6), 0.4), M.zincNoClip); hexG.position.y = -R - 0.35; g.add(hexG);
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.25, 24), M.pipe); boss.position.y = -R - 1.08; g.add(boss);
    g.position.set(x, G.PIPE_R_OUT + 1.2 + R, -0.0);
    scene.add(g);
    const gauge = { group: g, needle: needlePivot, set: (bar) => { needlePivot.rotation.z = -((-135 + (bar / 10) * 270) * Math.PI) / 180; } };
    gauges.push(gauge);
    return gauge;
  }
  const gaugeP1 = makeGauge('P1', -G.GAUGE_X);
  const gaugeP2 = makeGauge('P2', G.GAUGE_X);

  // ------------------------------------------------ supports, floor, dust
  for (const sx of [-13.5, 13.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, -1.25 - FLOOR_Y, 0.5), M.support);
    post.position.set(sx, (FLOOR_Y + -1.25) / 2, 0); post.castShadow = shadows; post.receiveShadow = shadows; scene.add(post);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.4), M.support); saddle.position.set(sx, -1.22, 0); saddle.castShadow = shadows; scene.add(saddle);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), M.support); base.position.set(sx, FLOOR_Y + 0.06, 0); base.receiveShadow = shadows; scene.add(base);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; floor.receiveShadow = shadows; scene.add(floor);
  // drain grate under the blowdown outlet
  const grate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 2.6), new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.8, roughness: 0.4 }));
  grate.position.set(7.3, FLOOR_Y + 0.02, 0); grate.receiveShadow = shadows; scene.add(grate);

  const dustN = 420, dustR = mulberry(77);
  const dustPos = new Float32Array(dustN * 3), dustSeed = [];
  for (let i = 0; i < dustN; i++) dustSeed.push([dustR() * 40 - 20, dustR() * 16 - 8, dustR() * 22 - 8, dustR(), dustR()]);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dcv = document.createElement('canvas'); dcv.width = dcv.height = 64;
  { const c = dcv.getContext('2d'); const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(dcv), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xa9c4d6 }));
  scene.add(dust);

  // ------------------------------------------------ lights
  const key = new THREE.SpotLight(0xffd7b0, 900, 80, 0.62, 0.75, 1.6);
  key.position.set(-9, 13, 16); key.target.position.set(0.8, -1.8, 0);
  key.castShadow = shadows; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 8; key.shadow.camera.far = 50;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7cc6ff, 2.4); rim.position.set(9, 6, -12); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x9fb9ff, 0.8); rim2.position.set(-12, -2, -8); scene.add(rim2);
  const fill = new THREE.HemisphereLight(0x8fa6bf, 0x0a0806, 0.35); scene.add(fill);
  const headlamp = new THREE.PointLight(0xdfe9ff, 0, 14, 1.6); scene.add(headlamp);
  const jetLight = new THREE.PointLight(0x9fe8ff, 0, 9, 2); jetLight.position.copy(lp(G.NOZZLE_S + 0.6)); scene.add(jetLight);
  const sectionLight = new THREE.PointLight(0xffe2c4, 0, 12, 1.8); sectionLight.position.set(0.4, -2.0, 5.5); scene.add(sectionLight);

  // ------------------------------------------------ water streamlines
  function buildLUT(points, speedFn, samples = 420) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    const pts = curve.getSpacedPoints(samples);
    const n = pts.length;
    const pos = new Float32Array(n * 3), tan = new Float32Array(n * 3), spd = new Float32Array(n), time = new Float32Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      pos.set([pts[i].x, pts[i].y, pts[i].z], i * 3);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const t = new V3().subVectors(b, a).normalize();
      tan.set([t.x, t.y, t.z], i * 3);
      spd[i] = speedFn(pts[i]);
      if (i > 0) acc += pts[i].distanceTo(pts[i - 1]) / ((spd[i] + spd[i - 1]) / 2);
      time[i] = acc;
    }
    return { pos, tan, spd, time, total: acc, n };
  }
  function sampleLUT(L, tt, out, outTan) {
    // tt in [0,total]
    let lo = 0, hi = L.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L.time[mid] < tt) lo = mid; else hi = mid; }
    const f = (tt - L.time[lo]) / Math.max(1e-6, L.time[hi] - L.time[lo]);
    out.set(
      L.pos[lo * 3] + (L.pos[hi * 3] - L.pos[lo * 3]) * f,
      L.pos[lo * 3 + 1] + (L.pos[hi * 3 + 1] - L.pos[lo * 3 + 1]) * f,
      L.pos[lo * 3 + 2] + (L.pos[hi * 3 + 2] - L.pos[lo * 3 + 2]) * f);
    if (outTan) outTan.set(L.tan[lo * 3], L.tan[lo * 3 + 1], L.tan[lo * 3 + 2]);
    return L.spd[lo];
  }
  const legRadial = (p) => { const q = p.clone(); const s = q.dot(D); return { s, r: q.sub(D.clone().multiplyScalar(s)).length() }; };
  const flowSpeed = (p) => {
    const { s, r } = legRadial(p);
    if (s > 1.4 && r < 1.5 && p.x > -0.5) return 0.48;
    if (p.x > -2.0 && p.x < 2.4 && p.y < 1.3) return 0.72;
    return 1.0;
  };
  const R = mulberry(1234);
  const PATHS = [];
  const NP = 64;
  for (let j = 0; j < NP; j++) {
    const r = 0.88 * Math.sqrt(R());
    // bias toward the visible half (z<0 => sin(th)<0) without leaving the front empty for interior shots
    let th = R() * Math.PI * 2;
    if (R() < 0.35) th = Math.PI + R() * Math.PI;
    const sExit = 1.75 + R() * 3.0;
    const r2 = 0.85 * Math.sqrt(R()), th2 = th + (R() - 0.5) * 0.6;
    const pts = [];
    for (const x of [-24, -16, -9, -4.5]) pts.push(v3(inletPoint(x, r, th)));
    for (const u of [0, 0.3, 0.6, 0.85, 1.0]) pts.push(v3(ductPoint(u, r * 0.92, th)));
    for (let s = 1.9; s < sExit - 0.5; s += 0.7) pts.push(lp(s, r * 0.85, th));
    pts.push(lp(sExit - 0.32, Math.max(0.55, r * 0.9), th));
    pts.push(lp(sExit, 1.03, th));
    pts.push(lp(sExit - 0.12, 1.25, th));
    for (let s = sExit - 0.8; s > 0.75; s -= 0.8) pts.push(lp(s, 1.25, th));
    pts.push(lp(0.6, 1.25, th));
    const c = Math.cos(th), sgnz = Math.sin(th) < 0 ? -1 : 1;
    const around = clamp01((0.3 - c) / 1.3);
    const mid = new V3().lerpVectors(lp(0.0, 1.45, th), new V3(0.4, 0.15, sgnz * 1.35), around);
    pts.push(mid);
    pts.push(new V3(1.6, 0.25 + 0.5 * r2 * Math.cos(th2), 0.75 * r2 * Math.sin(th2)));
    for (const x of [3.0, 6, 12, 24]) pts.push(v3(inletPoint(x, r2, th2)));
    PATHS.push(buildLUT(pts, flowSpeed, 520));
  }
  const NW = quality === 'low' ? 700 : 1100;
  const streakGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 8, 1, true).translate(0, -0.5, 0);
  const water = new THREE.InstancedMesh(streakGeo, M.water, NW);
  water.frustumCulled = false; water.renderOrder = 6; scene.add(water);
  const WP = [];
  for (let i = 0; i < NW; i++) WP.push({ path: i % NP, phase: R(), vis: R(), w: 0.7 + R() * 0.6, sp: 0.88 + R() * 0.24 });

  // blowdown jet streaks
  const NJ = 460;
  const jet = new THREE.InstancedMesh(streakGeo, M.jet, NJ);
  jet.frustumCulled = false; jet.renderOrder = 7; scene.add(jet);
  const JP = [];
  for (let i = 0; i < NJ; i++) JP.push({ phase: R(), a: R() * Math.PI * 2, sp: R(), w: 0.6 + R() * 0.9, life: 0.7 + R() * 0.5 });
  const jetInside = buildLUT([lp(3.2, 0.2, 0), lp(4.2, 0.12, 0), lp(4.95, 0.05, 0), lp(5.6, 0, 0), lp(6.3, 0, 0), lp(G.NOZZLE_S, 0, 0)], () => 1, 120);
  const NOZ = lp(G.NOZZLE_S);

  // ------------------------------------------------ debris
  const debrisGeo = {
    rust: (() => { const g = new THREE.IcosahedronGeometry(1, 1); jitter(g, 0.28, 11); g.scale(1, 0.32, 0.8); return g; })(),
    scale: (() => { const g = new THREE.DodecahedronGeometry(1, 0); jitter(g, 0.3, 12); g.scale(0.9, 0.48, 0.7); return g; })(),
    sand: (() => { const g = new THREE.IcosahedronGeometry(1, 0); jitter(g, 0.22, 13); return g; })(),
  };
  function jitter(g, amt, seed) {
    const r = mulberry(seed); const p = g.attributes.position;
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!map.has(k)) map.set(k, 1 + (r() - 0.5) * 2 * amt);
      const f = map.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.computeVertexNormals();
  }
  const TYPES = ['rust', 'scale', 'sand'];
  const typeMat = { rust: M.rust, scale: M.scale, sand: M.sand };
  const typeSize = { rust: [0.08, 0.15], scale: [0.065, 0.11], sand: [0.03, 0.055] };
  const DR = mulberry(4321);
  const DEB = [];
  // spawn schedule (time, count)
  const schedule = [[11.2, 16.6, 7], [19.7, 25.8, 22], [25.8, 28.4, 86], [28.4, 33.2, 34]];
  for (const [a, b, n] of schedule) for (let i = 0; i < n; i++) {
    const u = (i + DR()) / n;
    DEB.push({ ts: a + (b - a) * u });
  }
  let pileSlot = 0;
  DEB.forEach((d, k) => {
    d.type = TYPES[k % 7 < 3 ? 0 : k % 7 < 5 ? 1 : 2];
    const [s0, s1] = typeSize[d.type];
    d.size = s0 + DR() * (s1 - s0);
    d.axis = new V3(DR() - 0.5, DR() - 0.5, DR() - 0.5).normalize();
    d.w = (DR() < 0.5 ? -1 : 1) * (3 + DR() * 6);
    d.q0 = new THREE.Quaternion().setFromAxisAngle(new V3(DR() - 0.5, DR() - 0.5, DR() - 0.5).normalize(), DR() * 6.28);
    d.pile = DR() < 0.62;
    const r = 0.6 * Math.sqrt(DR()), th = DR() * Math.PI * 2;
    if (d.pile) {
      const j = pileSlot++;
      const layer = Math.floor(j / 10), m = j % 10;
      d.slotTh = Math.PI + 0.15 + (m / 9 - 0.5) * 2.0 + (DR() - 0.5) * 0.25;
      d.slotS = G.SCREEN_S1 - 0.1 - layer * 0.11 - DR() * 0.08;
      d.slotR = G.SCREEN_R - 0.05 - d.size * 0.5 - (layer % 2) * 0.05 - Math.max(0, 1 - Math.abs(m / 9 - 0.5) * 2) * layer * 0.035;
      d.hitS = 2.3 + DR() * 2.0; d.hitTh = d.slotTh + (DR() - 0.5) * 0.9;
    } else {
      d.hitS = 1.8 + DR() * 2.9; d.hitTh = Math.PI + (DR() - 0.35) * 3.4;
    }
    const pts = [v3(inletPoint(-10, r, th)), v3(inletPoint(-5, r, th))];
    for (const u of [0, 0.35, 0.7, 1.0]) pts.push(v3(ductPoint(u, r * 0.85, th)));
    pts.push(lp(Math.min(d.hitS - 0.5, 2.0), r * 0.5, th));
    pts.push(lp(d.hitS - 0.35, 0.5, d.hitTh));
    pts.push(lp(d.hitS, G.SCREEN_R - 0.06 - d.size * 0.4, d.hitTh));
    d.lut = buildLUT(pts, () => 1, 160);
    d.v = 4.4 + DR() * 1.2;
    d.tHit = d.ts + d.lut.total / d.v;
    d.slide = 0.9 + DR() * 0.8;
    d.ejectDelay = 0.12 + DR() * 0.55 + (d.pile ? 0 : 0.45 + (G.SCREEN_S1 - d.hitS) * 0.12);
    d.ejV = new V3().copy(D).multiplyScalar(6.5 + DR() * 3).add(new V3(DR() - 0.5, DR() * 0.6, DR() - 0.5).multiplyScalar(2.2));
  });
  const debrisMesh = {};
  for (const ty of TYPES) {
    const n = DEB.filter((d) => d.type === ty).length;
    const m = new THREE.InstancedMesh(debrisGeo[ty], typeMat[ty], n);
    m.frustumCulled = false; m.castShadow = false; m.receiveShadow = shadows;
    scene.add(m); debrisMesh[ty] = m;
  }

  // heroes: rust flake, scale chip, sand grain
  const heroGeo = {
    rust: (() => {
      const g = new THREE.IcosahedronGeometry(1, 4); const p = g.attributes.position; const r = mulberry(21);
      const k = [0, 1, 2, 3, 4, 5].map(() => [r() * 6.28, r() * 6.28, r() * 6.28, 2 + r() * 5]);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        let f = 1; for (const [a, b, c, w] of k) f += 0.07 * Math.sin(w * x + a) * Math.sin(w * y + b) * Math.sin(w * z + c) * (4 / w);
        p.setXYZ(i, x * f, y * f, z * f);
      }
      g.computeVertexNormals(); g.scale(1, 0.26, 0.78); return g;
    })(),
    scale: debrisGeo.scale, sand: debrisGeo.sand,
  };
  const HERO = [
    { type: 'rust', size: 0.24, mat: M.rustHero, hitS: 2.95, hitTh: 1.5 * Math.PI + 0.32, tIn: 16.95 },
    { type: 'scale', size: 0.15, mat: M.scale, hitS: 3.45, hitTh: 1.5 * Math.PI - 0.38, tIn: 17.45 },
    { type: 'sand', size: 0.075, mat: M.sand, hitS: 3.9, hitTh: 1.5 * Math.PI + 0.05, tIn: 17.95 },
  ];
  HERO.forEach((h, i) => {
    h.mesh = new THREE.Mesh(heroGeo[h.type], h.mat); h.mesh.scale.setScalar(h.size); scene.add(h.mesh);
    h.tHit = T.heroImpact[i];
    h.hit = lp(h.hitS, G.SCREEN_R - 0.05 - h.size * 0.35, h.hitTh);
    h.lut = buildLUT([lp(1.0, 0.1, 0), lp(1.6, 0.15, h.hitTh), lp(h.hitS - 0.6, 0.45, h.hitTh), h.hit], () => 1, 80);
    h.slotS = G.SCREEN_S1 - 0.55 - i * 0.12; h.slotTh = Math.PI + 0.55 + i * 0.25; h.slotR = G.SCREEN_R - 0.08 - h.size * 0.4;
    h.ejV = new V3().copy(D).multiplyScalar(8.2).add(new V3(0.4 - i * 0.4, 0.8, -0.6 + i * 0.5));
    h.q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 + i, 1.2 * i, 0.3));
  });

  // ------------------------------------------------ per-frame update
  const _c = new THREE.Color(), _p = new V3(), _t = new V3(), _q = new THREE.Quaternion(), _s = new V3(), _m = new THREE.Matrix4();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  function wallPoint(s, r, th, out) { const p = legPoint(s, r, th); return out.set(p[0], p[1], p[2]); }
  const tEject0 = T.valveOpen[0] + 0.32;
  // position after ejection begins: internal path to nozzle then ballistic, lands and skids on the floor
  function ejectPos(start, v0, size, te, out) {
    const tInside = 0.28;
    if (te < tInside) {
      const u = te / tInside;
      const hole = lp(G.COVER_S - 0.05, 0.05, 0);
      if (u < 0.45) return out.lerpVectors(start, hole, u / 0.45);
      sampleLUT(jetInside, jetInside.total * (0.55 + 0.45 * (u - 0.45) / 0.55), out); return out;
    }
    const tb = te - tInside;
    const gY = -15;
    // solve landing time
    const y0 = NOZ.y, yF = FLOOR_Y + size * 0.4;
    const disc = v0.y * v0.y - 2 * gY * (y0 - yF);
    const tLand = (-v0.y - Math.sqrt(Math.max(0, disc))) / gY;
    if (tb < tLand) return out.set(NOZ.x + v0.x * tb, y0 + v0.y * tb + 0.5 * gY * tb * tb, NOZ.z + v0.z * tb);
    const k = 3.5, dt = tb - tLand, f = (1 - Math.exp(-k * dt)) / k * 0.35;
    return out.set(NOZ.x + v0.x * (tLand + f), yF, NOZ.z + v0.z * (tLand + f));
  }

  function debrisPose(d, t, outP, outQ) {
    if (t < d.ts) return false;
    // phase 1: travel with flow
    const tt = (t - d.ts) * d.v;
    let rest = null;
    if (tt < d.lut.total) {
      sampleLUT(d.lut, tt, outP);
      outQ.setFromAxisAngle(d.axis, d.w * (t - d.ts)).premultiply(d.q0);
      return true;
    }
    // phase 2: stuck or slide into pile
    const tAfter = t - d.tHit;
    const qRest = _q.setFromAxisAngle(d.axis, d.w * (d.tHit - d.ts) * 0.9).premultiply(d.q0);
    if (d.pile) {
      const u = smooth(0, 1, tAfter / d.slide);
      const uu = u * u;
      const s = d.hitS + (d.slotS - d.hitS) * uu;
      const th = d.hitTh + (d.slotTh - d.hitTh) * u;
      const r = (G.SCREEN_R - 0.06 - d.size * 0.4) + (d.slotR - (G.SCREEN_R - 0.06 - d.size * 0.4)) * u;
      wallPoint(s, r, th, outP);
      outQ.copy(qRest);
      if (u < 1) outQ.multiply(new THREE.Quaternion().setFromAxisAngle(d.axis, 2.5 * uu));
    } else {
      wallPoint(d.hitS, G.SCREEN_R - 0.06 - d.size * 0.4, d.hitTh, outP);
      outQ.copy(qRest);
    }
    // phase 3: blowdown
    const te = t - (tEject0 + d.ejectDelay);
    if (te > 0 && t > d.tHit) {
      rest = outP.clone();
      ejectPos(rest, d.ejV, d.size, te, outP);
      outQ.multiply(new THREE.Quaternion().setFromAxisAngle(d.axis, 9 * Math.min(te, 1.4)));
    }
    return true;
  }

  function heroPose(h, i, t, outP, outQ) {
    // S1: the rust flake drifting through the inlet pipe (camera follows it)
    if (i === 0 && t < 4.75) {
      const u = t / 4.75;
      const x = -12.4 + 4.6 * (1 - Math.pow(1 - u, 1.6)) + 3.4 * smooth(3.85, 4.75, t);
      outP.set(x, -0.08 + 0.12 * Math.sin(t * 1.3), 0.05 * Math.sin(t * 0.9 + 1));
      outQ.setFromEuler(new THREE.Euler(t * 0.9 + 0.3, t * 0.55, t * 0.35));
      return true;
    }
    const tStart = h.tHit - 0.5;
    if (t < tStart) return false;
    if (t < h.tHit) {
      const u = (t - tStart) / 0.5;
      const e = 1 - Math.pow(1 - u, 2.2);
      sampleLUT(h.lut, h.lut.total * e, outP);
      outQ.setFromEuler(new THREE.Euler(2 * t + i, 1.4 * t, 0.6 * t)).premultiply(h.q0);
      return true;
    }
    const qRest = new THREE.Quaternion().setFromEuler(new THREE.Euler(2 * h.tHit + i, 1.4 * h.tHit, 0.6 * h.tHit)).premultiply(h.q0);
    const slideStart = 20.2 + i * 0.35;
    const u = smooth(slideStart, slideStart + 1.4, t);
    const s = h.hitS + (h.slotS - h.hitS) * u * u;
    const th = h.hitTh + (h.slotTh - h.hitTh) * u;
    const r0 = G.SCREEN_R - 0.05 - h.size * 0.35;
    wallPoint(s, r0 + (h.slotR - r0) * u, th, outP);
    outQ.copy(qRest);
    const te = t - (tEject0 + 0.15 + i * 0.12);
    if (te > 0) { const rest = outP.clone(); ejectPos(rest, h.ejV, h.size, te, outP); outQ.multiply(new THREE.Quaternion().setFromAxisAngle(Z, 7 * Math.min(te, 1.4))); }
    return true;
  }

  const state = { cutOverride: null };
  function update(t, opts = {}) {
    const st = stateAt(t);
    const cut = opts.cut != null ? opts.cut : st.cut;
    // section plane sweeps from in front of everything to z = 0
    clipPlane.constant = cut <= 0.0001 ? 100 : 2.7 * (1 - cut);
    const cutOn = cut > 0.0001;
    cutMeshes.forEach((m) => (m.visible = cutOn));
    fluidGroup.visible = cutOn;
    M.fluid.opacity = 0.11 * cut;
    sectionLight.intensity = cutOn ? 2.2 * cut : 0;
    screenU.uFoul.value = st.clog;
    gaugeP1.set(st.p1); gaugeP2.set(st.p2);
    const va = valveAngle(st.valve);
    ballPivot.rotation.z = va; leverPivot.rotation.z = va;

    // water
    const flowVis = st.flow;
    const camPos = opts.camPos || null;
    for (let i = 0; i < NW; i++) {
      const w = WP[i], L = PATHS[w.path];
      if (w.vis > 0.12 + 0.88 * flowVis) { water.setMatrixAt(i, hidden); continue; }
      const tt = ((w.phase * L.total + st.tau * 3.6 * w.sp) % L.total + L.total) % L.total;
      const sp = sampleLUT(L, tt, _p, _t);
      const length = 0.07 + 0.3 * sp * (0.55 + 0.45 * st.flow);
      _q.setFromUnitVectors(Y, _t);
      let fade = 1;
      let wz = 1;
      if (camPos) { const dc = _p.distanceTo(camPos); fade = smooth(0.5, 2.6, dc); wz = Math.min(1, Math.max(0.38, dc / 8)); }
      _s.set(w.w * wz * (0.55 + 0.45 * fade), length, w.w * wz * (0.55 + 0.45 * fade));
      _m.compose(_p, _q, _s);
      water.setMatrixAt(i, _m);
      _c.setScalar(fade * (0.75 + 0.5 * w.vis));
      water.setColorAt(i, _c);
    }
    water.instanceMatrix.needsUpdate = true;
    if (water.instanceColor) water.instanceColor.needsUpdate = true;

    // jet
    const jv = st.valve;
    jetLight.intensity = 0;
    for (let i = 0; i < NJ; i++) {
      const j = JP[i];
      if (jv < 0.12 || j.sp > jv * 1.1) { jet.setMatrixAt(i, hidden); continue; }
      const age = ((t * 1.0 + j.phase * j.life) % j.life);
      const tInside = 0.12;
      let len = 0.4;
      if (age < tInside) {
        sampleLUT(jetInside, jetInside.total * (age / tInside), _p, _t);
      } else {
        const tb = age - tInside;
        const perp = new V3(Math.cos(j.a), 0.4 * Math.sin(j.a * 2.0), Math.sin(j.a)).multiplyScalar(0.6 + j.sp * 2.2);
        const v0 = new V3().copy(D).multiplyScalar(9 + 3 * j.sp).add(perp).multiplyScalar(0.55 + 0.45 * jv);
        _p.set(NOZ.x + v0.x * tb, NOZ.y + v0.y * tb - 7.5 * tb * tb, NOZ.z + v0.z * tb);
        _t.set(v0.x, v0.y - 15 * tb, v0.z).normalize();
        if (_p.y < FLOOR_Y) { jet.setMatrixAt(i, hidden); continue; }
        len = 0.35 + 0.25 * j.sp;
      }
      _q.setFromUnitVectors(Y, _t);
      _s.set(j.w * 2.6, len, j.w * 2.6);
      _m.compose(_p, _q, _s);
      jet.setMatrixAt(i, _m);
    }
    jet.instanceMatrix.needsUpdate = true;
    jetLight.intensity = 1.5 * jv;

    // debris
    const counters = { rust: 0, scale: 0, sand: 0 };
    for (const d of DEB) {
      const m = debrisMesh[d.type];
      const idx = counters[d.type]++;
      if (!debrisPose(d, t, _p, _q)) { m.setMatrixAt(idx, hidden); continue; }
      _s.setScalar(d.size);
      _m.compose(_p, _q, _s);
      m.setMatrixAt(idx, _m);
    }
    for (const ty of TYPES) debrisMesh[ty].instanceMatrix.needsUpdate = true;
    HERO.forEach((h, i) => {
      const ok = heroPose(h, i, t, _p, _q);
      h.mesh.visible = ok;
      if (ok) { h.mesh.position.copy(_p); h.mesh.quaternion.copy(_q); }
    });

    // dust drift
    for (let i = 0; i < dustN; i++) {
      const s = dustSeed[i];
      dustPos[i * 3] = s[0] + Math.sin(t * 0.13 + s[3] * 9) * 0.6 + t * 0.05;
      dustPos[i * 3 + 1] = s[1] + Math.sin(t * 0.21 + s[4] * 7) * 0.4;
      dustPos[i * 3 + 2] = s[2] + Math.cos(t * 0.17 + s[3] * 5) * 0.5;
    }
    dustGeo.attributes.position.needsUpdate = true;
    return st;
  }

  const anchors = {
    inlet: new V3(-2.9, 0.45, -0.3),
    outlet: new V3(4.8, 0.0, 0),
    screen: lp(3.2, G.SCREEN_R, 0),
    screenBack: lp(3.0, G.SCREEN_R, 1.5 * Math.PI),
    pocket: lp(4.55, 0.45, Math.PI),
    valve: lp(G.VALVE_S, 0.0, 0).add(new V3(0, 0, 1.1)),
    nozzle: NOZ.clone(),
    p1: new V3(-G.GAUGE_X, G.PIPE_R_OUT + 2.0, 0.25),
    p2: new V3(G.GAUGE_X, G.PIPE_R_OUT + 2.0, 0.25),
    cover: lp(G.COVER_S + 0.15, 1.8, 0),
    duct: v3(ductPoint(0.55, 1.06, 0)),
  };

  return {
    scene, update, anchors, heroes: HERO, lights: { key, rim, headlamp, jetLight, sectionLight, fill },
    clipPlane, materials: M, legPoint: lp, debris: DEB,
  };
}
