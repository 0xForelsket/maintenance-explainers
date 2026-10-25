// Shared look + toolkit for the "How it works" maintenance series.
// Same visual identity as the Y-strainer piece: dark void, orange section cut, cyan water.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';

export const V3 = THREE.Vector3;
export const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lin = (a, b, x) => clamp01((x - a) / (b - a));
export const mix = (a, b, t) => a + (b - a) * t;
export const qAlign = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- geometry helpers
export function flipGeo(g) {
  if (g.index) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  } else {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
  }
  const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
// closed thick-walled tube along +Y from 0..len
export function tubeSolid(rIn, rOut, len, segs = 64, groups = false) {
  const o = new THREE.CylinderGeometry(rOut, rOut, len, segs, 1, true).translate(0, len / 2, 0);
  const i = flipGeo(new THREE.CylinderGeometry(rIn, rIn, len, segs, 1, true)).translate(0, len / 2, 0);
  const b = new THREE.RingGeometry(rIn, rOut, segs, 1).rotateX(Math.PI / 2);
  const t = new THREE.RingGeometry(rIn, rOut, segs, 1).rotateX(-Math.PI / 2).translate(0, len, 0);
  return mergeGeometries([o, i, b, t], groups);
}
// flat plate with optional bore + bolt holes, extruded along +Z from 0..depth
export function plateGeo(R, rBore, pcd, rBolt, n, depth, angOff = Math.PI / Math.max(1, n)) {
  const s = new THREE.Shape();
  s.absarc(0, 0, R, 0, Math.PI * 2, false);
  if (rBore > 0) { const h = new THREE.Path(); h.absarc(0, 0, rBore, 0, Math.PI * 2, true); s.holes.push(h); }
  for (let k = 0; k < n; k++) {
    const a = angOff + (k * 2 * Math.PI) / n;
    const h = new THREE.Path(); h.absarc(pcd * Math.cos(a), pcd * Math.sin(a), rBolt, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const bt = Math.min(0.022, depth * 0.2);
  let g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, curveSegments: 72 });
  g.translate(0, 0, bt);
  return toCreasedNormals(g, Math.PI / 5);
}
// rounded box (closed) — bevelled extrude of a rounded rectangle, centred
export function rbox(w, h, d, r = 0.04) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.absarc(x + W, y, r, -Math.PI / 2, 0); s.lineTo(x + W + r, y + H);
  s.absarc(x + W, y + H, r, 0, Math.PI / 2); s.lineTo(x, y + H + r); s.absarc(x, y + H, r, Math.PI / 2, Math.PI);
  s.lineTo(x - r, y); s.absarc(x, y, r, Math.PI, Math.PI * 1.5);
  const bt = Math.min(r, d * 0.25);
  let g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: 0, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -d / 2 + bt);
  return toCreasedNormals(g, Math.PI / 5);
}
// closed hollow pipe along a polyline with rounded bends
export function pipeSolid(points, rIn, rOut, bend = 0.6, radial = 40) {
  const P = points.map((p) => (p.isVector3 ? p : new V3(...p)));
  const path = new THREE.CurvePath();
  let prev = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    if (!c) { path.add(new THREE.LineCurve3(prev, b.clone())); break; }
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r = Math.min(bend, d1.length() * 0.45, d2.length() * 0.45);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(r)), p2 = b.clone().add(d2.normalize().multiplyScalar(r));
    path.add(new THREE.LineCurve3(prev, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    prev = p2;
  }
  // straight runs get one segment, bends get 12 — keeps long pipes cheap
  const parts = [];
  for (const c of path.curves) {
    const seg = c.isLineCurve3 ? 1 : 12;
    parts.push(new THREE.TubeGeometry(c, seg, rOut, radial, false));
    parts.push(flipGeo(new THREE.TubeGeometry(c, seg, rIn, radial, false)));
  }
  const t0 = path.getTangentAt(0), t1 = path.getTangentAt(1);
  const ring = (pt, tan, sgn) => {
    const g = new THREE.RingGeometry(rIn, rOut, radial, 1);
    g.applyQuaternion(qAlign(Z, tan.clone().multiplyScalar(sgn))); g.translate(pt.x, pt.y, pt.z);
    return g;
  };
  const strip = (g) => { g.deleteAttribute('uv'); return g; };
  return mergeGeometries([...parts.map(strip), strip(ring(path.getPointAt(0), t0, -1)), strip(ring(path.getPointAt(1), t1, 1))]);
}

// ---------------------------------------------------------------- surface shaders
let NOISE_TEX = null;
export function noiseTexture() {
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
export function worldPosVertex(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vWPos = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;
      #else
        vWPos = (modelMatrix * vec4(transformed,1.0)).xyz;
      #endif`);
}
// shared uniforms any surface can opt into (e.g. algae growth, scale crust, glow)
export const SHARED = { uAlgae: { value: 0 }, uAlgaeY: { value: -3 }, uTime: { value: 0 } };
// triplanar grain + low-frequency mottling; optional algae, extra fragment code via `extra`
export function castSurface(mat, { freq = 0.9, bump = 0.2, mottle = 0.2, grime = 0, algae = 0, key = '', extra = '', emissive = '', uniforms = null } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFreq = { value: freq };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uNoiseTex = { value: noiseTexture() };
    Object.assign(shader.uniforms, SHARED);
    if (uniforms) Object.assign(shader.uniforms, uniforms);
    worldPosVertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform float uFreq; uniform float uBump; uniform sampler2D uNoiseTex; uniform float uAlgae; uniform float uAlgaeY; uniform float uTime;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float nLow = texture2D(uNoiseTex, vWPos.xy*0.045 + vWPos.zx*0.031).a;
        diffuseColor.rgb *= mix(1.0-${mottle.toFixed(3)}, 1.0+${(mottle * 0.5).toFixed(3)}, nLow);
        ${grime > 0 ? `diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.72,0.58,0.45), ${grime.toFixed(3)}*smoothstep(0.45,0.75,texture2D(uNoiseTex, vWPos.xz*0.11+vWPos.y*0.07+0.3).a));` : ''}
        ${algae > 0 ? `float algaeAmt = ${algae.toFixed(3)} * uAlgae * smoothstep(0.35, 0.75, texture2D(uNoiseTex, vWPos.xz*0.21 + vWPos.y*0.13).a + 0.25*(1.0 - smoothstep(uAlgaeY - 2.5, uAlgaeY + 0.5, vWPos.y)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.25, 0.07) * (0.6 + 0.8*nLow), clamp(algaeAmt, 0.0, 0.92));` : 'float algaeAmt = 0.0;'}
        ${extra}`)
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
          ${algae > 0 ? 'roughnessFactor = mix(roughnessFactor, 0.95, clamp(algaeAmt, 0.0, 1.0));' : ''}
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${emissive}`);
    if (uniforms) shader.fragmentShader = shader.fragmentShader.replace('uniform float uTime;', 'uniform float uTime;\n' + Object.keys(uniforms).map((k) => `uniform ${typeof uniforms[k].value === 'number' ? 'float' : uniforms[k].value.isVector3 ? 'vec3' : uniforms[k].value.isColor ? 'vec3' : 'float'} ${k};`).join('\n'));
  };
  mat.customProgramCacheKey = () => `cast${freq}${bump}${mottle}${grime}${algae}${key}`;
  return mat;
}

// ---------------------------------------------------------------- stage
export function createStage(renderer, { quality = 'high', fog = 0.022, floorY = -7.2, envIntensity = 0.42, floor = true, dust = true, fontFamily = 'sans-serif' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090d);
  scene.fog = new THREE.FogExp2(0x06090d, fog);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = envIntensity;
  renderer.localClippingEnabled = true;
  const clipPlane = new THREE.Plane(new V3(0, 0, -1), 100);
  const clip = [clipPlane];
  const shadows = quality !== 'low';

  const M = {};
  M.cast = castSurface(new THREE.MeshStandardMaterial({ color: 0x343b44, roughness: 0.5, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 0.95, bump: 0.16, mottle: 0.22 });
  M.machined = castSurface(new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.4, metalness: 0.45, clippingPlanes: clip, clipShadows: true }), { freq: 0.6, bump: 0.04, mottle: 0.12 });
  M.steel = castSurface(new THREE.MeshStandardMaterial({ color: 0x8a939d, roughness: 0.32, metalness: 0.85, clippingPlanes: clip, clipShadows: true }), { freq: 0.7, bump: 0.03, mottle: 0.1, key: 'steel' });
  M.pipe = castSurface(new THREE.MeshStandardMaterial({ color: 0x4e5862, roughness: 0.42, metalness: 0.42, clippingPlanes: clip, clipShadows: true }), { freq: 0.5, bump: 0.05, mottle: 0.14 });
  M.pipeInside = castSurface(new THREE.MeshStandardMaterial({ color: 0x5c4b3a, roughness: 0.85, metalness: 0.3, clippingPlanes: clip, clipShadows: true }), { freq: 1.6, bump: 0.3, mottle: 0.45, grime: 0.7 });
  M.zinc = new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 1, roughness: 0.46, clippingPlanes: clip, clipShadows: true });
  M.zincNoClip = new THREE.MeshStandardMaterial({ color: 0x9aa1a9, metalness: 1, roughness: 0.4 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.32, clippingPlanes: clip, clipShadows: true });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.14, clippingPlanes: clip, clipShadows: true });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.88, clippingPlanes: clip, clipShadows: true });
  M.red = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  M.redClip = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25, clippingPlanes: clip, clipShadows: true });
  M.support = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.7, metalness: 0.5 });
  M.floor = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.55, metalness: 0.0 });
  M.cut = new THREE.MeshBasicMaterial({ color: 0xa44c26, side: THREE.BackSide, clippingPlanes: clip });
  M.cut.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hl = fract((gl_FragCoord.x + gl_FragCoord.y) / 16.0);
      diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.42,0.5,hl)*(1.0-smoothstep(0.92,1.0,hl)));`);
  };
  M.cutSteel = M.cut.clone(); M.cutSteel.clippingPlanes = clip; M.cutSteel.color.set(0x9aa3ad); M.cutSteel.onBeforeCompile = M.cut.onBeforeCompile;
  M.cutDark = M.cut.clone(); M.cutDark.clippingPlanes = clip; M.cutDark.color.set(0x3b4148); M.cutDark.onBeforeCompile = M.cut.onBeforeCompile;
  M.fluid = new THREE.MeshBasicMaterial({ color: 0x1aa6d6, transparent: true, opacity: 0.11, side: THREE.BackSide, depthWrite: false, clippingPlanes: clip });
  M.water = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fe6ff).multiplyScalar(1.55), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });
  M.hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa36b).multiplyScalar(1.5), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });
  M.streak = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: clip });

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
  const fluids = [];
  const setCut = (cut, from = 2.7, to = 0) => {
    clipPlane.constant = cut <= 0.0001 ? 100 : from + (to - from) * cut;
    const on = cut > 0.0001;
    cutMeshes.forEach((m) => (m.visible = on));
    fluids.forEach((m) => (m.visible = on));
    M.fluid.opacity = 0.11 * cut;
    return on;
  };

  let floorMesh = null;
  if (floor) {
    floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.floor);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.y = floorY; floorMesh.receiveShadow = shadows; scene.add(floorMesh);
  }
  // drifting dust motes
  let dustUpdate = () => {};
  if (dust) {
    const dustN = 420, dustR = mulberry(77);
    const dustPos = new Float32Array(dustN * 3), dustSeed = [];
    for (let i = 0; i < dustN; i++) dustSeed.push([dustR() * 44 - 22, dustR() * 20 - 8, dustR() * 24 - 8, dustR(), dustR()]);
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.07, map: softDot(), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xa9c4d6 }));
    scene.add(dust);
    dustUpdate = (t) => {
      for (let i = 0; i < dustN; i++) {
        const s = dustSeed[i];
        dustPos[i * 3] = s[0] + Math.sin(t * 0.13 + s[3] * 9) * 0.6 + t * 0.04;
        dustPos[i * 3 + 1] = s[1] + Math.sin(t * 0.21 + s[4] * 7) * 0.4;
        dustPos[i * 3 + 2] = s[2] + Math.cos(t * 0.17 + s[3] * 5) * 0.5;
      }
      dustGeo.attributes.position.needsUpdate = true;
    };
  }
  // lights
  const key = new THREE.SpotLight(0xffd7b0, 900, 90, 0.62, 0.75, 1.6);
  key.position.set(-9, 13, 16); key.target.position.set(0.8, -1.8, 0);
  key.castShadow = shadows; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 6; key.shadow.camera.far = 60;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7cc6ff, 2.4); rim.position.set(9, 6, -12); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x9fb9ff, 0.8); rim2.position.set(-12, -2, -8); scene.add(rim2);
  const fill = new THREE.HemisphereLight(0x8fa6bf, 0x0a0806, 0.35); scene.add(fill);
  const headlamp = new THREE.PointLight(0xdfe9ff, 0, 14, 1.6); scene.add(headlamp);
  const accent = new THREE.PointLight(0x9fe8ff, 0, 9, 2); scene.add(accent);
  const sectionLight = new THREE.PointLight(0xffe2c4, 0, 12, 1.8); sectionLight.position.set(0.4, -2.0, 5.5); scene.add(sectionLight);

  // Software rendering: image-based lighting is the most expensive per-pixel term, so give it only to
  // metals / clear-coated / glassy surfaces and lift the ambient fill for everything else.
  const finalizeEnv = (selective) => {
    if (!selective) return;
    scene.environment = null;
    scene.traverse((o) => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        if (!m.isMeshStandardMaterial) continue;
        if (m.metalness >= 0.3 || m.clearcoat > 0 || m.transparent) { m.envMap = envTex; m.envMapIntensity = (m.envMapIntensity ?? 1) * envIntensity; }
        m.needsUpdate = true;
      }
    });
    fill.intensity += 0.55;
  };
  return {
    finalizeEnv, envTex,
    scene, M, clip, clipPlane, shadows, addSolid, cutMeshes, fluids, setCut, floor: floorMesh,
    lights: { key, rim, rim2, fill, headlamp, accent, sectionLight }, updateDust: dustUpdate, fontFamily,
  };
}

let SOFT = null;
export function softDot() {
  if (SOFT) return SOFT;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  SOFT = new THREE.CanvasTexture(c);
  return SOFT;
}

// ---------------------------------------------------------------- paths
export function buildLUT(points, speedFn = () => 1, samples = 400, type = 'centripetal') {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new V3(...p))), false, type, 0.5);
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
    if (i > 0) acc += pts[i].distanceTo(pts[i - 1]) / Math.max(0.05, (spd[i] + spd[i - 1]) / 2);
    time[i] = acc;
  }
  return { pos, tan, spd, time, total: acc, n };
}
export function sampleLUT(L, tt, out, outTan) {
  let lo = 0, hi = L.n - 1;
  tt = Math.max(0, Math.min(L.total, tt));
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L.time[mid] < tt) lo = mid; else hi = mid; }
  const f = (tt - L.time[lo]) / Math.max(1e-6, L.time[hi] - L.time[lo]);
  out.set(
    L.pos[lo * 3] + (L.pos[hi * 3] - L.pos[lo * 3]) * f,
    L.pos[lo * 3 + 1] + (L.pos[hi * 3 + 1] - L.pos[lo * 3 + 1]) * f,
    L.pos[lo * 3 + 2] + (L.pos[hi * 3 + 2] - L.pos[lo * 3 + 2]) * f);
  if (outTan) outTan.set(L.tan[lo * 3], L.tan[lo * 3 + 1], L.tan[lo * 3 + 2]);
  return L.spd[lo];
}

// Instanced glowing streaks (or dots) that flow along LUT paths.
// Each particle: path index, phase, visibility rank, width, speed factor.
export class Streaks {
  constructor(scene, { paths, count, material, radius = 0.014, dots = false, speed = 3.6, seed = 1, renderOrder = 6, colorFn = null, lenMin = 0.07, lenMax = 0.3 }) {
    this.paths = paths; this.count = count; this.speed = speed; this.dots = dots; this.colorFn = colorFn;
    this.lenMin = lenMin; this.lenMax = lenMax;
    const geo = dots ? new THREE.IcosahedronGeometry(radius, dots === 'smooth' ? 1 : 0) : new THREE.CylinderGeometry(radius, radius, 1, 8, 1, true).translate(0, -0.5, 0);
    this.mesh = new THREE.InstancedMesh(geo, material, count);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = renderOrder;
    scene.add(this.mesh);
    const R = mulberry(seed);
    this.P = [];
    for (let i = 0; i < count; i++) this.P.push({ path: i % paths.length, phase: R(), vis: R(), w: 0.7 + R() * 0.6, sp: 0.88 + R() * 0.24 });
    this._p = new V3(); this._t = new V3(); this._q = new THREE.Quaternion(); this._s = new V3(); this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this.hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  }
  // tau: flow clock (seconds of flow); vis: fraction visible; camPos: fade near camera
  update({ tau, vis = 1, camPos = null, lenScale = 1, widthScale = 1, brightness = 1, filter = null }) {
    const { _p, _t, _q, _s, _m, _c } = this;
    for (let i = 0; i < this.count; i++) {
      const w = this.P[i], L = this.paths[w.path];
      if (w.vis > vis || (filter && !filter(w, i))) { this.mesh.setMatrixAt(i, this.hidden); continue; }
      const tt = ((w.phase * L.total + tau * this.speed * w.sp) % L.total + L.total) % L.total;
      const sp = sampleLUT(L, tt, _p, _t);
      let fade = 1, wz = 1;
      if (camPos) { const dc = _p.distanceTo(camPos); fade = smooth(0.5, 2.6, dc); wz = Math.min(1, Math.max(0.38, dc / 8)); }
      // fade in/out at the path ends
      const u = tt / L.total; fade *= smooth(0, 0.03, u) * (1 - smooth(0.97, 1, u));
      if (this.dots) {
        _q.identity(); _s.setScalar(w.w * widthScale * (0.6 + 0.4 * fade));
      } else {
        _q.setFromUnitVectors(Y, _t);
        const length = (this.lenMin + this.lenMax * sp) * lenScale;
        _s.set(w.w * wz * widthScale * (0.55 + 0.45 * fade), length, w.w * wz * widthScale * (0.55 + 0.45 * fade));
      }
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      if (this.colorFn) this.colorFn(_p, u, w, _c); else _c.setRGB(1, 1, 1);
      _c.multiplyScalar(fade * brightness * (0.75 + 0.5 * w.vis));
      this.mesh.setColorAt(i, _c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// Soft sprite puffs (vapour, mist, spray). Pure function of t.
export class Puffs {
  constructor(scene, { count = 200, color = 0xdfeaf2, opacity = 0.18, size = 1.0, additive = false, clip = null }) {
    this.count = count;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3); this.size = new Float32Array(count); this.alpha = new Float32Array(count);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: softDot() }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uScale: { value: 600 * size } },
      vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vA * uOpacity); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.points = new THREE.Points(geo, mat); this.points.frustumCulled = false; this.points.renderOrder = 8;
    scene.add(this.points);
    const R = mulberry(31);
    this.seed = []; for (let i = 0; i < count; i++) this.seed.push([R(), R(), R(), R(), R()]);
  }
  // fn(i, seed, out:{p:V3, size, alpha}) sets each puff
  update(fn) {
    const o = { p: new V3(), size: 0, alpha: 0 };
    for (let i = 0; i < this.count; i++) {
      o.size = 0; o.alpha = 0; fn(i, this.seed[i], o);
      this.pos[i * 3] = o.p.x; this.pos[i * 3 + 1] = o.p.y; this.pos[i * 3 + 2] = o.p.z;
      this.size[i] = o.size; this.alpha[i] = o.alpha;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true; this.geo.attributes.aAlpha.needsUpdate = true;
  }
}

// Dial gauge facing +Z. set(value) moves the needle.
export function makeGauge({ name = 'P', unit = 'bar', max = 10, redFrom = 0.8, R = 0.8, fontFamily = 'sans-serif', shadows = true, M }) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, 512, 512);
  const grd = ctx.createRadialGradient(256, 230, 40, 256, 256, 256); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  for (let v = 0; v <= 100; v++) {
    const a = (-135 + (v / 100) * 270) * Math.PI / 180;
    const major = v % 10 === 0, mid = v % 5 === 0;
    const r0 = major ? 168 : mid ? 182 : 190, r1 = 204;
    ctx.strokeStyle = v >= redFrom * 100 ? '#c3262b' : '#1a1c1f'; ctx.lineWidth = major ? 6 : mid ? 3.5 : 2;
    ctx.beginPath(); ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); ctx.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1); ctx.stroke();
    if (major) {
      ctx.fillStyle = '#1a1c1f'; ctx.font = `600 34px ${fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const val = (v / 100) * max; ctx.fillText(Number.isInteger(val) ? String(val) : val.toFixed(1), Math.sin(a) * 136, -Math.cos(a) * 136);
    }
  }
  ctx.fillStyle = '#1a1c1f'; ctx.font = `700 40px ${fontFamily}`; ctx.fillText(name, 0, 62);
  ctx.font = `500 26px ${fontFamily}`; ctx.fillStyle = '#5a5e64'; ctx.fillText(unit, 0, 104);
  ctx.setTransform(1, 0, 0, 1, 0, 0); tex.needsUpdate = true;
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.34, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.6, roughness: 0.35 })); cs.castShadow = shadows; g.add(cs);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.055, 16, 96), M.zincNoClip); bezel.position.z = 0.17; g.add(bezel);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.07, 64), new THREE.MeshStandardMaterial({ map: tex, color: 0x9c9c9c, roughness: 0.75, envMapIntensity: 0.4 })); face.position.z = 0.172; g.add(face);
  const needlePivot = new THREE.Group(); needlePivot.position.z = 0.2; g.add(needlePivot);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.035 * R / 0.8, 0.62 * R / 0.8, 0.012).translate(0, 0.22 * R / 0.8, 0), new THREE.MeshStandardMaterial({ color: 0xc3262b, roughness: 0.4, emissive: 0x330000 })); needlePivot.add(nd);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24).rotateX(Math.PI / 2), M.zincNoClip); hub.position.z = 0.21; g.add(hub);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(R - 0.03, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false })); glass.position.z = 0.235; g.add(glass);
  return { group: g, set: (v) => { needlePivot.rotation.z = -((-135 + clamp01(v / max) * 270) * Math.PI) / 180; } };
}

// Flow clock: integral of a flow-rate function so particles slow smoothly
export function makeClock(rateFn, tMax = 120, dt = 0.01) {
  const T = [0]; const n = Math.ceil(tMax / dt);
  for (let i = 1; i <= n; i++) T.push(T[i - 1] + rateFn((i - 0.5) * dt) * dt);
  return (t) => {
    if (t <= 0) return t;
    const f = t / dt, i = Math.floor(f);
    if (i >= T.length - 1) return T[T.length - 1] + (t - (T.length - 1) * dt);
    return T[i] + (T[i + 1] - T[i]) * (f - i);
  };
}

// Constructive solid geometry on closed meshes: csg(base, [['sub', geo], ['add', geo], ['int', geo]])
export function csg(base, ops, smoothAngle = Math.PI / 6) {
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']; ev.useGroups = false;
  const prep = (g) => { g = g.index ? g.toNonIndexed() : g.clone(); if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); if (!g.attributes.normal) g.computeVertexNormals(); return g; };
  let a = new Brush(prep(base)); a.updateMatrixWorld();
  for (const [op, geo] of ops) {
    const b = new Brush(prep(geo)); b.updateMatrixWorld();
    a = ev.evaluate(a, b, op === 'sub' ? SUBTRACTION : op === 'int' ? INTERSECTION : ADDITION);
  }
  let g = a.geometry;
  return smoothAngle ? toCreasedNormals(g, smoothAngle) : g;
}
// cylinder along an axis between two points (closed), handy for CSG bores
export function cylBetween(a, b, r, segs = 48) {
  const A = a.isVector3 ? a : new V3(...a), B = b.isVector3 ? b : new V3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, len, segs);
  g.applyQuaternion(qAlign(Y, B.clone().sub(A)));
  const m = A.clone().add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z);
  return g;
}
