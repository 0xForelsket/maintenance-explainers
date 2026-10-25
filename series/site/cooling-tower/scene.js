// Open induced-draft counterflow cooling tower + the mould it serves. Pure function of t.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createStage, castSurface, tubeSolid, pipeSolid, rbox, flipGeo, qAlign, mulberry, smooth, clamp01, mix,
  buildLUT, sampleLUT, Streaks, Puffs, SHARED, V3, X, Y, Z, noiseTexture,
} from 'series/look';
import { stateAt } from './story.js';

export const DIM = {
  TX: 3.0, TZ: 3.0, yBasinBot: -6.65, yBasinTop: -5.0, yWater: -5.35, yLouverTop: -2.9,
  yFillBot: -2.6, yFillTop: 0.2, yHeader: 0.95, yElimBot: 1.45, yDeck: 3.0, yStackTop: 4.95, yFan: 3.55,
  mould: [-13.5, -4.3, 0], chY: -3.75, chR: 0.22, mouldX0: -15.1, mouldX1: -11.9,
};
const D = DIM;

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.014, floorY: -7.2, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  SHARED.uAlgaeY.value = D.yWater + 1.6;

  // ------------------------------------------------ materials
  const frp = castSurface(new THREE.MeshStandardMaterial({ color: 0x2c3742, roughness: 0.55, metalness: 0.05, clippingPlanes: clip, clipShadows: true }), { freq: 0.7, bump: 0.05, mottle: 0.25, algae: 0.55, key: 'frp' });
  const concrete = castSurface(new THREE.MeshStandardMaterial({ color: 0x55585b, roughness: 0.9, clippingPlanes: clip, clipShadows: true }), { freq: 1.4, bump: 0.32, mottle: 0.35, grime: 0.4, algae: 1.0, key: 'conc' });
  const fillMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x2b3237, roughness: 0.42, metalness: 0.1, side: THREE.DoubleSide, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.04, mottle: 0.2, algae: 1.1, key: 'fill' });
  const louverMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x38424d, roughness: 0.6, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.05, mottle: 0.3, algae: 1.4, key: 'louv' });
  const elimMat = new THREE.MeshStandardMaterial({ color: 0x3a434c, roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: clip, clipShadows: true });
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x8f99a3, metalness: 0.6, roughness: 0.32 });
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x1f4f8f, roughness: 0.5, clippingPlanes: clip, clipShadows: true });
  const vesselMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x5d6873, roughness: 0.4, metalness: 0.5, clippingPlanes: clip, clipShadows: true }), { freq: 0.6, bump: 0.03, mottle: 0.12, key: 'vessel' });
  const cutPale = M.cut.clone(); cutPale.clippingPlanes = clip; cutPale.color.set(0xcdb88f); cutPale.onBeforeCompile = M.cut.onBeforeCompile;

  // ------------------------------------------------ basin + piers
  const W2 = 2 * D.TX, Z2 = 2 * D.TZ;
  const bh = D.yBasinTop - D.yBasinBot;
  const slab = addSolid(new THREE.BoxGeometry(W2 + 0.4, 0.25, Z2 + 0.4), concrete); slab.position.set(0, D.yBasinBot + 0.125, 0);
  for (const [sx, sz, w, d] of [[-1, 0, 0.2, Z2 + 0.4], [1, 0, 0.2, Z2 + 0.4], [0, -1, W2 + 0.4, 0.2], [0, 1, W2 + 0.4, 0.2]]) {
    const m = addSolid(new THREE.BoxGeometry(w, bh, d), concrete);
    m.position.set(sx * (D.TX + 0.1), D.yBasinBot + bh / 2, sz * (D.TZ + 0.1));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = addSolid(new THREE.BoxGeometry(0.7, D.yBasinBot + 7.2, 0.7), concrete); p.position.set(sx * 2.4, (-7.2 + D.yBasinBot) / 2, sz * 2.4);
  }
  // water body (section shows it), surface, sludge
  const waterU = { uDirt: { value: 0 }, uAlg: { value: 0 } };
  const waterBodyMat = new THREE.MeshBasicMaterial({ color: 0x1a8fb8, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false, clippingPlanes: clip });
  const waterBody = new THREE.Mesh(new THREE.BoxGeometry(W2 - 0.03, D.yWater - (D.yBasinBot + 0.25), Z2 - 0.03), waterBodyMat);
  waterBody.position.set(0, (D.yWater + D.yBasinBot + 0.25) / 2, 0); waterBody.renderOrder = 5; scene.add(waterBody); ST.fluids.push(waterBody);
  const surfMat = new THREE.MeshStandardMaterial({ color: 0x0d3a48, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.72, clippingPlanes: clip, envMapIntensity: 1.3 });
  surfMat.onBeforeCompile = (sh) => {
    sh.uniforms.uNoiseTex = { value: noiseTexture() }; sh.uniforms.uTime = SHARED.uTime; Object.assign(sh.uniforms, waterU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform sampler2D uNoiseTex; uniform float uTime; uniform float uDirt; uniform float uAlg;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16,0.14,0.08), uDirt*0.65);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08,0.2,0.05), uAlg*0.6);
        diffuseColor.a = mix(diffuseColor.a, 0.93, max(uDirt, uAlg)*0.8);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        { vec2 q = vWPos.xz;
          vec4 a = texture2D(uNoiseTex, q*0.35 + vec2(uTime*0.031, uTime*0.017));
          vec4 b = texture2D(uNoiseTex, q*0.9 - vec2(uTime*0.05, -uTime*0.04));
          vec3 g = vec3((a.r+b.r-1.0), 0.0, (a.g+b.g-1.0));
          vec3 gv = (viewMatrix*vec4(g,0.0)).xyz; normal = normalize(normal - 0.35*(gv - dot(gv,normal)*normal)); }`);
  };
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(W2 - 0.02, Z2 - 0.02, 1, 1).rotateX(-Math.PI / 2), surfMat);
  surf.position.y = D.yWater; surf.renderOrder = 4; scene.add(surf);
  const sludgeGeo = new THREE.PlaneGeometry(W2 - 0.1, Z2 - 0.1, 60, 60).rotateX(-Math.PI / 2);
  { const p = sludgeGeo.attributes.position; const r = mulberry(5);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.06 * (Math.sin(x * 2.1 + 1) * Math.cos(z * 1.7) + 1) + 0.04 * r()); }
    sludgeGeo.computeVertexNormals(); }
  const sludgeMat = new THREE.MeshStandardMaterial({ color: 0x2a2014, roughness: 1, transparent: true, opacity: 0, clippingPlanes: clip });
  const sludge = new THREE.Mesh(sludgeGeo, sludgeMat); sludge.position.y = D.yBasinBot + 0.26; scene.add(sludge);

  // ------------------------------------------------ casing, posts, louvers, deck, stack
  const wallH = D.yDeck - D.yLouverTop;
  const ribs = (len, n, axis) => {
    const g = [];
    for (let i = 0; i <= n; i++) {
      const b = new THREE.BoxGeometry(axis === 'z' ? 0.06 : 0.12, wallH, axis === 'z' ? 0.12 : 0.06);
      b.translate(axis === 'z' ? 0 : -len / 2 + (i * len) / n, 0, axis === 'z' ? -len / 2 + (i * len) / n : 0);
      g.push(b);
    }
    return g;
  };
  for (const sx of [-1, 1]) {
    const geo = mergeGeometries([new THREE.BoxGeometry(0.08, wallH, Z2 + 0.08), ...ribs(Z2, 6, 'z').map((b) => b.translate(sx * 0.07, 0, 0))]);
    const w = addSolid(geo, frp); w.position.set(sx * (D.TX + 0.04), D.yLouverTop + wallH / 2, 0);
  }
  for (const sz of [-1, 1]) {
    const geo = mergeGeometries([new THREE.BoxGeometry(W2 + 0.16, wallH, 0.08), ...ribs(W2, 6, 'x').map((b) => b.translate(0, 0, sz * 0.07))]);
    const w = addSolid(geo, frp); w.position.set(0, D.yLouverTop + wallH / 2, sz * (D.TZ + 0.04));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = addSolid(new THREE.BoxGeometry(0.24, D.yDeck - D.yBasinTop + 0.1, 0.24), M.zinc, M.cutSteel); p.position.set(sx * (D.TX + 0.12), (D.yDeck + D.yBasinTop) / 2, sz * (D.TZ + 0.12));
  }
  // louvres on all four sides of the air inlet
  {
    const n = 7, step = (D.yLouverTop - D.yBasinTop) / n;
    for (const side of ['x-', 'x+', 'z-', 'z+']) {
      const g = [];
      for (let i = 0; i < n; i++) {
        const along = side[0] === 'x' ? Z2 : W2;
        const b = new THREE.BoxGeometry(0.42, 0.035, along);
        b.rotateZ(-0.75);
        if (side[0] === 'z') b.rotateY(Math.PI / 2);
        b.translate(0, D.yBasinTop + step * (i + 0.6), 0);
        g.push(b);
      }
      const geo = mergeGeometries(g);
      const m = addSolid(geo, louverMat, M.cutDark);
      const s = side[1] === '-' ? -1 : 1;
      if (side[0] === 'x') m.position.x = s * (D.TX + 0.05); else m.position.z = s * (D.TZ + 0.05);
      if (side === 'x-' || side === 'z+') m.rotation.y = Math.PI;
    }
  }
  // fan deck with opening
  {
    const s = new THREE.Shape(); const hw = D.TX + 0.25, hz = D.TZ + 0.25;
    s.moveTo(-hw, -hz); s.lineTo(hw, -hz); s.lineTo(hw, hz); s.lineTo(-hw, hz); s.lineTo(-hw, -hz);
    const h = new THREE.Path(); h.absarc(0, 0, 2.3, 0, Math.PI * 2, true); s.holes.push(h);
    let g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false, curveSegments: 96 });
    g.rotateX(-Math.PI / 2); g = toCreasedNormals(g, 0.6);
    const deck = addSolid(g, frp); deck.position.y = D.yDeck;
  }
  const stackH = D.yStackTop - D.yDeck - 0.16;
  const stack = addSolid(tubeSolid(2.26, 2.34, stackH, 128), frp); stack.position.y = D.yDeck + 0.16;
  const rimG = new THREE.TorusGeometry(2.34, 0.06, 12, 128).rotateX(Math.PI / 2);
  const rimTop = addSolid(rimG, frp); rimTop.position.y = D.yStackTop;
  // handrail
  {
    const g = []; const hw = D.TX + 0.1, hz = D.TZ + 0.1, top = D.yDeck + 1.05;
    for (const [x0, z0, x1, z1] of [[-hw, -hz, hw, -hz], [hw, -hz, hw, hz], [hw, hz, -hw, hz], [-hw, hz, -hw, -hz]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      for (const y of [top, top - 0.5]) { const c = new THREE.CylinderGeometry(0.035, 0.035, len, 10).rotateZ(Math.PI / 2).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2); g.push(c); }
      for (let i = 0; i <= 4; i++) { const f = i / 4; g.push(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 10).translate(x0 + (x1 - x0) * f, D.yDeck + 0.16 + 0.52, z0 + (z1 - z0) * f)); }
    }
    const rail = new THREE.Mesh(mergeGeometries(g), M.zinc); rail.castShadow = shadows; scene.add(rail);
  }
  // ladder on the +x side
  {
    const g = []; const x = D.TX + 0.55;
    for (const z of [-0.3, 0.3]) g.push(new THREE.CylinderGeometry(0.035, 0.035, D.yDeck + 1.2 + 7.2, 10).translate(x, (D.yDeck + 1.2 - 7.2) / 2, z - 1.6));
    for (let y = -6.8; y < D.yDeck + 1.0; y += 0.42) g.push(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8).rotateX(Math.PI / 2).translate(x, y, -1.6));
    const lad = new THREE.Mesh(mergeGeometries(g), M.zinc); lad.castShadow = shadows; scene.add(lad);
  }

  // ------------------------------------------------ fill pack (corrugated PVC sheets in xy planes)
  const fillH = D.yFillTop - D.yFillBot;
  const sheetGeo = new THREE.PlaneGeometry(W2 - 0.12, fillH, 72, 30);
  { const p = sheetGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const u = (x * Math.cos(0.52) + y * Math.sin(0.52)) / 0.34;
      p.setZ(i, 0.045 * Math.sin(u * Math.PI * 2) + 0.012 * Math.sin(y * 9.0));
    }
    sheetGeo.computeVertexNormals(); }
  const SHEETS = [];
  for (let z = -D.TZ + 0.15; z < D.TZ - 0.1; z += 0.19) SHEETS.push(z);
  const fill = new THREE.InstancedMesh(sheetGeo, fillMat, SHEETS.length);
  // front-most sheets first so depth testing rejects the hidden ones early
  const ORDER = SHEETS.filter((z) => z < 0.25).sort((a, b) => b - a).concat(SHEETS.filter((z) => z >= 0.25));
  ORDER.forEach((z, i) => {
    const m = new THREE.Matrix4().compose(new V3(0, (D.yFillBot + D.yFillTop) / 2, z), new THREE.Quaternion().setFromAxisAngle(Y, i % 2 ? Math.PI : 0), new V3(1, 1, 1));
    fill.setMatrixAt(i, m);
  });
  fill.castShadow = false; fill.receiveShadow = shadows; scene.add(fill);
  // sheets behind the front three are only ever seen at their top and bottom edges: draw just those bands
  const band = (y0, y1) => { const g = sheetGeo.clone(); const p = g.attributes.position; const idx = g.index.array; const keep = [];
    for (let i = 0; i < idx.length; i += 3) { const ym = (p.getY(idx[i]) + p.getY(idx[i + 1]) + p.getY(idx[i + 2])) / 3; if (ym > y0 && ym < y1) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
    g.setIndex(keep); return g; };
  const edgeGeo = mergeGeometries([band(fillH / 2 - 0.35, 99), band(-99, -fillH / 2 + 0.35)]);
  const fillEdges = new THREE.InstancedMesh(edgeGeo, fillMat, SHEETS.length);
  ORDER.slice(1).forEach((z, i) => fillEdges.setMatrixAt(i, new THREE.Matrix4().compose(new V3(0, (D.yFillBot + D.yFillTop) / 2, z), new THREE.Quaternion().setFromAxisAngle(Y, i % 2 ? Math.PI : 0), new V3(1, 1, 1))));
  fillEdges.receiveShadow = shadows; scene.add(fillEdges);
  const frontSheetZ = SHEETS.filter((z) => z < 0).pop();
  const nBack = SHEETS.filter((z) => z < 0.25).length;
  // fill support beams
  for (const z of [-2.2, -0.75, 0.75, 2.2]) { const b = addSolid(new THREE.BoxGeometry(W2, 0.14, 0.12), M.zinc, M.cutSteel); b.position.set(0, D.yFillBot - 0.08, z); }

  // ------------------------------------------------ distribution: laterals + nozzles
  const LAT_X = [-2.25, -0.75, 0.75, 2.25], NOZ_Z = [-2.25, -0.75, 0.75, 2.25];
  for (const x of LAT_X) {
    const t = addSolid(tubeSolid(0.085, 0.115, Z2 - 0.2, 40), M.pipe); t.quaternion.copy(qAlign(Y, Z)); t.position.set(x, D.yHeader, -D.TZ + 0.1);
  }
  {
    const g = [];
    for (const x of LAT_X) for (const z of NOZ_Z) {
      g.push(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 16).translate(x, D.yHeader - 0.17, z));
      g.push(new THREE.ConeGeometry(0.11, 0.07, 20).rotateX(Math.PI).translate(x, D.yHeader - 0.29, z));
    }
    addSolid(mergeGeometries(g), M.zinc, M.cutSteel);
  }
  // drift eliminators: chevron blades along z
  {
    const s = new THREE.Shape();
    const pts = [[0, 0], [0.09, 0.12], [0, 0.24], [0.09, 0.36], [0, 0.48]];
    const th = 0.018;
    s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
    for (const p of pts.slice().reverse()) s.lineTo(p[0] + th, p[1]);
    let g = new THREE.ExtrudeGeometry(s, { depth: D.TZ + 0.1, bevelEnabled: false });
    g.translate(0, 0, -D.TZ + 0.05); g = toCreasedNormals(g, 0.5);
    const n = 34, mats = [];
    for (let i = 0; i < n; i++) mats.push(new THREE.Matrix4().makeTranslation(-D.TX + 0.12 + (i * (W2 - 0.3)) / (n - 1), D.yElimBot, 0));
    const el = new THREE.InstancedMesh(g, elimMat, n); mats.forEach((m, i) => el.setMatrixAt(i, m)); el.receiveShadow = shadows; scene.add(el);
    const elc = new THREE.InstancedMesh(g, M.cutDark, n); mats.forEach((m, i) => elc.setMatrixAt(i, m)); elc.renderOrder = -1; scene.add(elc); ST.cutMeshes.push(elc);
  }
  // fan + drive (not clipped: it sits inside the stack and spins)
  const fan = new THREE.Group(); fan.position.y = D.yFan; scene.add(fan);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.34, 32), fanMat));
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.035, 0.44).translate(0.3 + 0.9, 0, 0), fanMat);
    const piv = new THREE.Group(); piv.rotation.y = (i * Math.PI * 2) / 6; b.rotation.x = 0.38; piv.add(b); fan.add(piv);
    b.castShadow = shadows;
  }
  const bridge = addSolid(new THREE.BoxGeometry(4.6, 0.22, 0.3), M.zinc, M.cutSteel); bridge.position.set(0, D.yFan + 0.95, 0);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 32), new THREE.MeshStandardMaterial({ color: 0x24527f, roughness: 0.45, metalness: 0.4 }));
  motor.position.set(0, D.yFan + 1.55, 0); motor.castShadow = shadows; scene.add(motor);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 16), M.zincNoClip); shaft.position.set(0, D.yFan + 0.6, 0); scene.add(shaft);

  // ------------------------------------------------ pipework
  const P = (pts) => pts.map((p) => new V3(...p));
  const RET = P([[D.mouldX0, D.chY, 0], [-16.3, D.chY, 0], [-16.3, -6.85, 0], [-16.3, -6.85, -4.2], [4.3, -6.85, -4.2], [4.3, -6.85, 0], [4.3, D.yHeader, 0], [-2.85, D.yHeader, 0]]);
  const SUC = P([[-D.TX - 0.12, -6.0, 0], [-5.0, -6.0, 0]]);
  const DIS = P([[-5.6, -5.45, 0], [-5.6, D.chY, 0], [D.mouldX1, D.chY, 0]]);
  addSolid(pipeSolid(RET, 0.22, 0.27, 0.55, 40), M.pipe);
  addSolid(pipeSolid(SUC, 0.22, 0.27, 0.4, 40), M.pipe);
  addSolid(pipeSolid(DIS, 0.22, 0.27, 0.55, 40), M.pipe);
  // pump
  const volute = addSolid(tubeSolid(0.25, 0.62, 0.56, 48), M.cast); volute.quaternion.copy(qAlign(Y, Z)); volute.position.set(-5.6, -6.0, -0.28);
  const pmot = addSolid(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 32).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x24527f, roughness: 0.45, metalness: 0.4, clippingPlanes: clip })); pmot.position.set(-5.6, -6.0, -0.95);
  const pbase = addSolid(new THREE.BoxGeometry(1.4, 0.35, 2.0), M.support); pbase.position.set(-5.6, -7.02, -0.5);
  // bleed-off line with valve (lever stays unclipped in front)
  const BLEED = P([[-5.6, -4.7, 0], [-6.9, -4.7, 0], [-6.9, -7.1, 0]]);
  addSolid(pipeSolid(BLEED, 0.07, 0.1, 0.3, 24), M.pipe);
  const bv = addSolid(new THREE.SphereGeometry(0.2, 32, 16), M.brass); bv.position.set(-6.9, -5.7, 0);
  const bleedLever = new THREE.Group(); bleedLever.position.set(-6.9, -5.7, 0); scene.add(bleedLever);
  bleedLever.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 12).rotateX(Math.PI / 2).translate(0, 0, 0.22), M.zincNoClip));
  const lev = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.04).translate(0, 0.33, 0.42), M.zincNoClip); bleedLever.add(lev);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.36, 6, 12).translate(0, 0.52, 0.42), M.red); bleedLever.add(grip);
  const drain = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.8, roughness: 0.4 })); drain.position.set(-6.9, -7.18, 0); scene.add(drain);
  // make-up line with float valve
  const MKP = P([[-4.9, -7.1, -1.6], [-4.9, -4.75, -1.6], [-2.35, -4.75, -1.6]]);
  addSolid(pipeSolid(MKP, 0.06, 0.085, 0.3, 24), M.pipe);
  const fv = addSolid(new THREE.BoxGeometry(0.3, 0.2, 0.2), M.brass); fv.position.set(-2.25, -4.75, -1.6);
  const floatArm = new THREE.Group(); floatArm.position.set(-2.15, -4.75, -1.6); scene.add(floatArm);
  floatArm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8).rotateZ(Math.PI / 2).translate(0.4, 0, 0), M.zinc));
  const floatBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), new THREE.MeshStandardMaterial({ color: 0xc8501e, roughness: 0.45, metalness: 0.0, clippingPlanes: clip }));
  floatBall.position.set(0.85, 0, 0); floatArm.add(floatBall);
  // chemical dosing
  const drum = addSolid(new THREE.CylinderGeometry(0.5, 0.5, 1.3, 40), drumMat); drum.position.set(-4.4, -6.55, -2.5);
  const dpump = addSolid(rbox(0.5, 0.35, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8dade, roughness: 0.4, clippingPlanes: clip })); dpump.position.set(-4.4, -5.72, -2.5);
  const DOSE = P([[-4.4, -5.55, -2.5], [-4.4, -4.72, -2.5], [-2.65, -4.72, -2.5], [-2.65, -5.05, -2.5]]);
  addSolid(pipeSolid(DOSE, 0.02, 0.035, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xe8e1c8, roughness: 0.5, clippingPlanes: clip }));
  // side-stream filter
  const vessel = addSolid(mergeGeometries([new THREE.CylinderGeometry(0.5, 0.5, 1.7, 40, 1, true).toNonIndexed(), new THREE.SphereGeometry(0.5, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.85, 0).toNonIndexed(), new THREE.SphereGeometry(0.5, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.85, 0).toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; })), vesselMat);
  vessel.position.set(5.5, -5.9, -2.0);
  const FIN = P([[D.TX + 0.12, -6.15, -2.0], [5.0, -6.15, -2.0]]);
  const FOUT = P([[5.5, -4.6, -2.0], [5.5, -4.45, -2.0], [2.6, -4.45, -2.0], [2.6, -5.05, -2.0]]);
  addSolid(pipeSolid(FIN, 0.07, 0.1, 0.3, 24), M.pipe);
  addSolid(pipeSolid(FOUT, 0.07, 0.1, 0.3, 24), M.pipe);
  // conductivity probe + controller
  const probe = addSolid(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.4, clippingPlanes: clip })); probe.position.set(1.6, -5.25, -2.4);
  const ctl = addSolid(rbox(0.9, 0.7, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.45, clippingPlanes: clip })); ctl.position.set(1.6, -4.15, -2.95);
  const dispCv = document.createElement('canvas'); dispCv.width = 256; dispCv.height = 128;
  const dispTex = new THREE.CanvasTexture(dispCv); dispTex.colorSpace = THREE.SRGBColorSpace;
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }));
  disp.position.set(1.6, -4.1, -2.79); scene.add(disp);
  let lastDisp = '';
  const drawDisp = (cond, alarm) => {
    const txt = `${Math.round(cond)}`;
    if (txt + alarm === lastDisp) return; lastDisp = txt + alarm;
    const c = dispCv.getContext('2d');
    c.fillStyle = alarm ? '#3a0a08' : '#04140d'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = alarm ? '#ff6a55' : '#6ff0b0'; c.font = `700 64px ${fontFamily}`; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(txt, 200, 60); c.font = `600 22px ${fontFamily}`; c.fillText('µS', 244, 72);
    c.textAlign = 'left'; c.font = `600 18px ${fontFamily}`; c.fillText(alarm ? 'HIGH' : 'OK', 14, 112);
    dispTex.needsUpdate = true;
  };

  // ------------------------------------------------ the mould
  const heatU = { uHeat: { value: 0.4 }, uCool: { value: 1 } };
  const heatGLSL = `
    float dP = length((vWPos - vec3(${D.mould[0].toFixed(2)}, ${D.mould[1].toFixed(2)}, 0.0)) / vec3(2.3, 1.45, 1.5));
    float heat = uHeat * exp(-dP*dP*1.2);
    float dC = length(vWPos.yz - vec2(${D.chY.toFixed(2)}, 0.0));
    float dZ = min(length(vWPos.xy - vec2(${(D.mould[0] - 0.8).toFixed(2)}, ${(D.mould[1] - 0.6).toFixed(2)})), length(vWPos.xy - vec2(${(D.mould[0] + 0.8).toFixed(2)}, ${(D.mould[1] - 0.6).toFixed(2)})));
    heat *= 1.0 - 0.4 * uCool * (exp(-dC*dC*4.0) + exp(-dZ*dZ*4.0));
    heat = clamp(heat, 0.0, 1.0);
    vec3 hc = mix(vec3(0.0), vec3(0.55, 0.04, 0.0), smoothstep(0.08, 0.45, heat));
    hc = mix(hc, vec3(1.0, 0.42, 0.06), smoothstep(0.45, 0.9, heat));`;
  const mouldMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x6d757d, roughness: 0.36, metalness: 0.75, envMapIntensity: 0.55, clippingPlanes: clip, clipShadows: true }), {
    freq: 0.7, bump: 0.02, mottle: 0.1, key: 'mould', uniforms: heatU, emissive: heatGLSL + '\n totalEmissiveRadiance += hc * 2.2;',
  });
  const mouldCut = new THREE.MeshBasicMaterial({ color: 0x5b636b, side: THREE.BackSide, clippingPlanes: clip });
  mouldCut.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, heatU);
    worldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform float uHeat; uniform float uCool;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hl = fract((gl_FragCoord.x + gl_FragCoord.y) / 16.0);
        diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.42,0.5,hl)*(1.0-smoothstep(0.92,1.0,hl)));
        ${heatGLSL}
        diffuseColor.rgb = mix(diffuseColor.rgb, hc*1.4 + diffuseColor.rgb*0.25, smoothstep(0.05, 0.3, heat));`);
  };
  function worldPos(sh) {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix*vec4(transformed,1.0)).xyz;');
  }
  const mouldW = D.mouldX1 - D.mouldX0;
  const half = (y0, y1, hole) => {
    const s = new THREE.Shape(); const hz = 1.3;
    s.moveTo(-hz, y0); s.lineTo(hz, y0); s.lineTo(hz, y1); s.lineTo(-hz, y1); s.lineTo(-hz, y0);
    if (hole) { const h = new THREE.Path(); h.absarc(0, D.chY, D.chR, 0, Math.PI * 2, true); s.holes.push(h); }
    let g = new THREE.ExtrudeGeometry(s, { depth: mouldW, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 48 });
    g.translate(0, 0, -mouldW / 2); g.rotateY(Math.PI / 2); g = toCreasedNormals(g, 0.6);
    return g;
  };
  const mTop = addSolid(half(D.mould[1], D.mould[1] + 1.35, true), mouldMat, mouldCut); mTop.position.x = D.mould[0];
  const ZCH = [D.mould[0] - 0.8, D.mould[0] + 0.8], zchY = D.mould[1] - 0.6;
  const botGeo = (() => {
    const s2 = new THREE.Shape(); const x0 = -mouldW / 2, x1 = mouldW / 2, y0 = -1.35, y1 = -0.005;
    s2.moveTo(x0, y0); s2.lineTo(x1, y0); s2.lineTo(x1, y1); s2.lineTo(x0, y1); s2.lineTo(x0, y0);
    for (const cx of ZCH) { const h = new THREE.Path(); h.absarc(cx - D.mould[0], -0.6, D.chR, 0, Math.PI * 2, true); s2.holes.push(h); }
    let g = new THREE.ExtrudeGeometry(s2, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 48 });
    g.translate(0, D.mould[1], -1.3); return toCreasedNormals(g, 0.6);
  })();
  const mBot = addSolid(botGeo, mouldMat, mouldCut); mBot.position.x = D.mould[0];
  const clampT = addSolid(new THREE.BoxGeometry(mouldW + 0.6, 0.35, 3.0), M.machined); clampT.position.set(D.mould[0], D.mould[1] + 1.55, 0);
  const clampB = addSolid(new THREE.BoxGeometry(mouldW + 0.6, 0.35, 3.0), M.machined); clampB.position.set(D.mould[0], D.mould[1] - 1.55, 0);
  const partMat = new THREE.MeshStandardMaterial({ color: 0x401206, emissive: 0xff5a14, emissiveIntensity: 0.9, roughness: 0.5, clippingPlanes: clip });
  const partCut = new THREE.MeshBasicMaterial({ color: 0xff7a2a, side: THREE.BackSide, clippingPlanes: clip });
  const part = addSolid(rbox(1.9, 0.24, 1.3, 0.1), partMat, partCut); part.position.set(D.mould[0], D.mould[1], 0);
  // scale crust inside the channel
  const crustMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xc9b896, roughness: 0.95, envMapIntensity: 0.4, clippingPlanes: clip }), { freq: 3.5, bump: 0.6, mottle: 0.4, grime: 0.3, key: 'crust' });
  const crust = new THREE.Group(); crust.position.set(D.mould[0], D.chY, 0); crust.quaternion.copy(qAlign(Y, X)); scene.add(crust);
  const crustOuter = new THREE.Mesh(new THREE.CylinderGeometry(D.chR - 0.004, D.chR - 0.004, mouldW - 0.02, 48, 1, true), crustMat); crust.add(crustOuter);
  const crustInner = new THREE.Mesh(flipGeo(new THREE.CylinderGeometry(1, 1, mouldW - 0.02, 48, 1, true)), crustMat); crust.add(crustInner);
  const crustCut = new THREE.Mesh(crustOuter.geometry, cutPale); crustCut.renderOrder = -1; crust.add(crustCut);
  const crustCut2 = new THREE.Mesh(crustInner.geometry, cutPale); crustCut2.renderOrder = -1; crustInner.add(crustCut2);
  const zCrusts = ZCH.map((cx) => {
    const g = new THREE.Group(); g.position.set(cx, zchY, 0); g.quaternion.copy(qAlign(Y, Z)); scene.add(g);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(D.chR - 0.004, D.chR - 0.004, 2.58, 64, 1, true), crustMat); g.add(o);
    const i = new THREE.Mesh(flipGeo(new THREE.CylinderGeometry(1, 1, 2.58, 64, 1, true)), crustMat); g.add(i);
    const c1 = new THREE.Mesh(o.geometry, cutPale); c1.renderOrder = -1; o.add(c1);
    const c2 = new THREE.Mesh(i.geometry, cutPale); c2.renderOrder = -1; i.add(c2);
    return { g, i };
  });
  const moldLight = new THREE.SpotLight(0xffe0c8, 150, 30, 0.6, 0.7, 1.6);
  moldLight.position.set(-10.5, 1.5, 9); moldLight.target.position.set(D.mould[0], D.mould[1], 0); scene.add(moldLight, moldLight.target);

  // ------------------------------------------------ particle systems
  const R = mulberry(2024);
  const cold = new THREE.Color(0x6fe6ff).multiplyScalar(1.5), warm = new THREE.Color(0xffa36b).multiplyScalar(1.45), airC = new THREE.Color(0xb9c8d6).multiplyScalar(0.85);
  const tmpC = new THREE.Color();
  // main loop: basin -> pump -> mould -> return -> riser -> header -> lateral -> nozzle -> spray onto fill
  const LOOP = [];
  const visNoz = [];
  for (const x of LAT_X) for (const z of NOZ_Z) if (z < 0) visNoz.push([x, z]);
  for (let j = 0; j < 40; j++) {
    const o = new V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.24);
    const oc = o.clone().multiplyScalar(0.3);
    const [nx, nz] = visNoz[j % visNoz.length];
    const pts = [
      new V3(mix(-2.2, 2.0, R()), -5.8, mix(-2.4, -0.2, R())), new V3(-2.4, -6.0, 0).add(o), new V3(-4.9, -6.0, 0).add(o),
      new V3(-5.6, -6.0, 0).add(o.clone().multiplyScalar(0.6)), new V3(-5.6, -5.3, 0).add(o), new V3(-5.6, D.chY, 0).add(o), new V3(-9, D.chY, 0).add(o),
      new V3(D.mouldX1 + 0.2, D.chY, 0).add(oc), new V3(D.mould[0], D.chY, 0).add(oc), new V3(D.mouldX0 - 0.2, D.chY, 0).add(oc),
      new V3(-16.3, D.chY, 0).add(o), new V3(-16.3, -6.85, 0).add(o), new V3(-16.3, -6.85, -4.2).add(o), new V3(4.3, -6.85, -4.2).add(o),
      new V3(4.3, -6.85, 0).add(o), new V3(4.3, D.yHeader, 0).add(o), new V3(nx, D.yHeader, 0).add(oc), new V3(nx, D.yHeader, nz).add(oc.clone().setY(0)),
      new V3(nx, D.yHeader - 0.3, nz),
    ];
    const a = R() * Math.PI * 2, rr = 0.25 + 0.5 * Math.sqrt(R());
    pts.push(new V3(nx + Math.cos(a) * rr * 0.55, D.yHeader - 0.45, nz + Math.sin(a) * rr * 0.55));
    pts.push(new V3(nx + Math.cos(a) * rr, D.yFillTop + 0.02, Math.min(-0.03, nz + Math.sin(a) * rr)));
    const L = buildLUT(pts, (p) => (p.y < D.yWater && Math.abs(p.x) < D.TX ? 0.25 : p.y < D.yHeader - 0.25 && Math.abs(p.x) < D.TX ? 0.7 : 1), 700, 'catmullrom');
    // where along the path the water leaves the mould (colour switch)
    let uM = 0.5; for (let i = 0; i < L.n; i++) if (L.pos[i * 3] < D.mouldX0 - 0.1) { uM = L.time[i] / L.total; break; }
    L.uM = uM; LOOP.push(L);
  }
  const loop = new Streaks(scene, { paths: LOOP, count: 900, material: M.streak, seed: 3, speed: 3.4, colorFn: (p, u, w, c) => {
    const L = LOOP[w.path]; const k = smooth(L.uM - 0.06, L.uM, u);
    c.copy(cold).lerp(warm, k);
  } });
  // spray cones from the visible nozzles
  const SPRAY = [];
  for (const [nx, nz] of visNoz) for (let j = 0; j < 14; j++) {
    const a = (j / 14) * Math.PI * 2 + R() * 0.3, rr = 0.55 + 0.35 * R();
    const p0 = new V3(nx, D.yHeader - 0.3, nz);
    const p1 = new V3(nx + Math.cos(a) * rr * 0.45, D.yHeader - 0.42, nz + Math.sin(a) * rr * 0.45);
    const p2 = new V3(nx + Math.cos(a) * rr, D.yFillTop + 0.03, Math.min(-0.03, nz + Math.sin(a) * rr));
    SPRAY.push(buildLUT([p0, p1, p2], () => 1, 30));
  }
  const spray = new Streaks(scene, { paths: SPRAY, count: 520, material: M.streak, seed: 41, speed: 1.6, radius: 0.011, lenMin: 0.08, lenMax: 0.08, colorFn: (p, u, w, c) => c.copy(warm).multiplyScalar(0.9) });
  // film running down the face of the front fill sheet
  const FILM = [];
  for (let j = 0; j < 46; j++) {
    const x = mix(-2.8, 2.8, (j + R()) / 46), zz = frontSheetZ + 0.085 + R() * 0.02, ph = R() * 6, amp = 0.05 + 0.05 * R();
    const pts = []; for (let k = 0; k <= 10; k++) { const y = D.yFillTop - (k / 10) * fillH; pts.push(new V3(x + amp * Math.sin(k * 1.3 + ph), y, zz)); }
    FILM.push(buildLUT(pts, () => 1, 120));
  }
  const film = new Streaks(scene, { paths: FILM, count: 420, material: M.streak, seed: 5, speed: 0.75, radius: 0.014, lenMin: 0.09, lenMax: 0.12, colorFn: (p, u, w, c) => c.copy(warm).lerp(cold, smooth(0.15, 0.95, u)) });
  // rain zone under the fill
  const RAIN = [];
  for (let j = 0; j < 60; j++) { const x = mix(-2.8, 2.8, R()), z = mix(-2.8, -0.05, Math.pow(R(), 0.6)); RAIN.push(buildLUT([new V3(x, D.yFillBot - 0.1, z), new V3(x + 0.02, (D.yFillBot + D.yWater) / 2, z), new V3(x + 0.03, D.yWater + 0.02, z)], () => 1, 40)); }
  const rain = new Streaks(scene, { paths: RAIN, count: 260, material: M.streak, seed: 6, speed: 4.5, radius: 0.011, lenMin: 0.18, lenMax: 0.1, colorFn: (p, u, w, c) => c.copy(cold) });
  // basin drift to outlet + minerals riding along
  const BAS = [];
  for (let j = 0; j < 40; j++) { const x = mix(-2.6, 2.6, R()), z = mix(-2.7, -0.05, R()), y = mix(D.yWater - 0.1, D.yBasinBot + 0.4, R()); BAS.push(buildLUT([new V3(x, y, z), new V3((x - 2.5) / 2, (y - 6.0) / 2, z * 0.6), new V3(-2.75, -6.0, 0)], () => 1, 60)); }
  const basin = new Streaks(scene, { paths: BAS, count: 120, material: M.streak, seed: 7, speed: 0.55, radius: 0.012, lenMin: 0.05, lenMax: 0.08, colorFn: (p, u, w, c) => c.copy(cold).multiplyScalar(0.7) });
  const mineralMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, emissive: 0x6f6b62, roughness: 0.6, clippingPlanes: clip });
  const minerals = new Streaks(scene, { paths: BAS, count: 600, material: mineralMat, dots: true, radius: 0.022, seed: 8, speed: 0.22 });
  const mineralsLoop = new Streaks(scene, { paths: LOOP, count: 300, material: mineralMat, dots: true, radius: 0.018, seed: 9, speed: 3.4 });
  // air: in through the louvres, up through rain zone + fill + eliminators, out through the fan
  const AIR = [];
  for (let j = 0; j < 44; j++) {
    const sx = j % 2 ? 1 : -1, y = mix(D.yBasinTop + 0.25, D.yLouverTop - 0.2, R()), z = j < 30 ? mix(-0.18, -0.02, R()) : mix(-2.6, -0.3, R());
    const xin = sx * mix(0.6, 2.4, R());
    const pts = [new V3(sx * 4.6, y - 0.4, z), new V3(sx * 3.4, y, z), new V3(sx * 2.4, y + 0.05, z), new V3(xin, D.yLouverTop + 0.2, z), new V3(xin * 0.95, D.yFillBot + 0.3, z),
      new V3(xin * 0.9, D.yFillTop, z), new V3(xin * 0.85, D.yElimBot + 0.6, z), new V3(xin * 0.7, D.yFan - 0.3, z * 0.8), new V3(xin * 0.65, D.yFan + 0.4, z * 0.8), new V3(xin * 0.6, D.yStackTop + 0.4, z * 0.7), new V3(xin * 0.7, D.yStackTop + 2.4, z * 0.8)];
    AIR.push(buildLUT(pts, (p) => (p.y > D.yDeck ? 2.2 : 1), 260));
  }
  const air = new Streaks(scene, { paths: AIR, count: 420, material: M.streak, seed: 10, speed: 2.4, radius: 0.012, lenMin: 0.2, lenMax: 0.15, colorFn: (p, u, w, c) => {
    // air warms and picks up moisture as it rises
    const k = smooth(D.yFillBot, D.yElimBot, p.y); c.copy(airC).lerp(new THREE.Color(0xd6e4ee).multiplyScalar(1.05), k);
  } });
  // dust carried in with the air, dropping into the water
  const DUST = [];
  for (let j = 0; j < 24; j++) {
    const sx = j % 2 ? 1 : -1, y = mix(D.yBasinTop + 0.3, D.yLouverTop - 0.3, R()), z = mix(-2.6, -0.05, R());
    DUST.push(buildLUT([new V3(sx * 5.5, y + 0.3, z), new V3(sx * 3.4, y, z), new V3(sx * 2.2, y - 0.4, z), new V3(sx * mix(0.5, 1.8, R()), D.yWater + 0.02, z)], () => 1, 60));
  }
  const dustMat = new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 1, clippingPlanes: clip });
  const dust = new Streaks(scene, { paths: DUST, count: 160, material: dustMat, dots: true, radius: 0.03, seed: 11, speed: 1.6 });
  // bleed, make-up, side-stream filter, dosing
  const bleedPaths = [], mkPaths = [], filtPaths = [], dosePaths = [];
  for (let j = 0; j < 8; j++) {
    const o = new V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.07);
    bleedPaths.push(buildLUT([new V3(-5.6, -4.7, 0).add(o), new V3(-6.9, -4.7, 0).add(o), new V3(-6.9, -5.7, 0).add(o), new V3(-6.9, -7.1, 0).add(o), new V3(-6.9 + (R() - 0.5) * 0.6, -7.18, (R() - 0.5) * 0.6)], () => 1, 80));
    mkPaths.push(buildLUT([new V3(-4.9, -7.0, -1.6).add(o), new V3(-4.9, -4.75, -1.6).add(o), new V3(-2.3, -4.75, -1.6).add(o), new V3(-2.1, -4.95, -1.6 + (R() - 0.5) * 0.2), new V3(-2.0, D.yWater, -1.6 + (R() - 0.5) * 0.3)], () => 1, 80));
    filtPaths.push(buildLUT([new V3(2.4, -6.1, -2.0), new V3(D.TX, -6.15, -2.0).add(o), new V3(5.0, -6.15, -2.0).add(o), new V3(5.5, -6.0, -2.0).add(o.clone().multiplyScalar(4)), new V3(5.5, -4.6, -2.0).add(o), new V3(5.5, -4.45, -2.0).add(o), new V3(2.6, -4.45, -2.0).add(o), new V3(2.6, -5.1, -2.0).add(o), new V3(2.6, D.yWater - 0.1, -2.0)], () => 1, 120));
    dosePaths.push(buildLUT([new V3(-2.65, -5.07, -2.5), new V3(-2.65, (D.yWater - 5.07) / 2, -2.5), new V3(-2.65, D.yWater, -2.5)], () => 1, 20));
  }
  const bleedS = new Streaks(scene, { paths: bleedPaths, count: 70, material: M.streak, seed: 12, speed: 3.0, radius: 0.01, colorFn: (p, u, w, c) => c.copy(cold) });
  const mkS = new Streaks(scene, { paths: mkPaths, count: 70, material: M.streak, seed: 13, speed: 3.0, radius: 0.01, colorFn: (p, u, w, c) => c.setRGB(0.9, 1.2, 1.5) });
  const filtS = new Streaks(scene, { paths: filtPaths, count: 90, material: M.streak, seed: 14, speed: 2.4, radius: 0.012, colorFn: (p, u, w, c) => c.copy(cold) });
  const doseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd9b6ff).multiplyScalar(1.6), clippingPlanes: clip });
  const doseS = new Streaks(scene, { paths: dosePaths, count: 10, material: doseMat, dots: true, radius: 0.035, seed: 15, speed: 0.6 });
  const ZP = [];
  for (const cx of ZCH) for (let j = 0; j < 10; j++) { const a = R() * 6.28, r = 0.075 * Math.sqrt(R()); ZP.push(buildLUT([new V3(cx + Math.cos(a) * r, zchY + Math.sin(a) * r, -1.4), new V3(cx + Math.cos(a) * r, zchY + Math.sin(a) * r, 0.2)], () => 1, 20)); }
  const zflow = new Streaks(scene, { paths: ZP, count: 90, material: M.streak, seed: 44, speed: 1.2, radius: 0.012, lenMin: 0.12, lenMax: 0.1, colorFn: (p, u, w, c) => c.copy(cold) });
  // vapour plume, evaporation wisps, spray mist
  const plume = new Puffs(scene, { count: 170, color: 0xdde6ee, opacity: 0.16, size: 1.0 });
  const wisps = new Puffs(scene, { count: 120, color: 0xe6f2fa, opacity: 0.0, size: 0.45 });
  const mist = new Puffs(scene, { count: 80, color: 0xcfe9f5, opacity: 0.07, size: 0.6 });

  // ------------------------------------------------ update
  const _q = new THREE.Quaternion();
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    SHARED.uAlgae.value = st.algae;
    const cut = opts.cut != null ? opts.cut : (st.cut ?? 1);
    const range = opts.cutRange || [3.4, 0];
    ST.setCut(cut, range[0], range[1]);
    // the fill is only visible in section: skip the hidden sheets (big vertex saving)
    fill.count = cut > 0.0001 ? 1 : 0; fillEdges.count = cut > 0.0001 ? nBack - 1 : 0;
    waterBodyMat.opacity = 0.22 * cut;
    waterBodyMat.color.setRGB(mix(0.1, 0.22, st.dirt), mix(0.56, 0.3, Math.max(st.dirt, st.algae * 0.7)), mix(0.72, 0.18, Math.max(st.dirt, st.algae)));
    waterU.uDirt.value = st.dirt; waterU.uAlg.value = st.algae;
    sludgeMat.opacity = 0.9 * st.dirt;
    ST.lights.sectionLight.intensity = 0;
    moldLight.visible = !opts.camPos || opts.camPos.x < -7.5;
    // fan
    fan.rotation.y = -t * 2.4;
    // valves
    bleedLever.rotation.z = -Math.PI / 2 * (1 - st.bleed);
    floatArm.rotation.z = -0.18 * st.makeup;
    // heat + scale
    heatU.uHeat.value = 0.5 + 0.55 * st.scale;
    heatU.uCool.value = 1 - 0.85 * st.scale;
    const th = 0.13 * st.scale;
    crust.visible = th > 0.002;
    crustInner.scale.set(D.chR - 0.004 - th, 1, D.chR - 0.004 - th);
    for (const z of zCrusts) { z.g.visible = th > 0.002; z.i.scale.set(D.chR - 0.004 - th, 1, D.chR - 0.004 - th); }
    partMat.emissiveIntensity = 0.8 + 0.6 * st.scale;
    drawDisp(st.cond, st.cond > 1600);
    // particles
    const cam = opts.camPos || null;
    loop.update({ tau: t, camPos: cam });
    film.update({ tau: t, camPos: cam });
    spray.update({ tau: t, camPos: cam });
    zflow.update({ tau: t, camPos: cam });
    rain.update({ tau: t, camPos: cam });
    basin.update({ tau: t, camPos: cam });
    minerals.update({ tau: t, vis: 0.04 + 0.96 * Math.pow(st.minerals, 1.4), camPos: cam });
    mineralsLoop.update({ tau: t, vis: 0.6 * Math.pow(st.minerals, 1.6), camPos: cam });
    air.update({ tau: t, camPos: cam, vis: opts.air ?? 1 });
    dust.update({ tau: t, vis: 0.06 + 0.94 * st.dustAir, camPos: cam });
    bleedS.update({ tau: t, vis: st.bleed, camPos: cam });
    mkS.update({ tau: t, vis: st.makeup, camPos: cam });
    filtS.update({ tau: t, vis: st.filter, camPos: cam });
    doseS.update({ tau: t, vis: st.dosing, camPos: cam });
    plume.update((i, s, o) => {
      const life = 7, age = ((t / life + s[0]) % 1);
      const r = 1.9 * Math.sqrt(s[1]), a = s[2] * Math.PI * 2;
      const y = D.yStackTop + 0.2 + age * 7.5;
      o.p.set(Math.cos(a) * r * (1 + age * 0.9) + age * age * 2.2, y, Math.sin(a) * r * (1 + age * 0.9));
      o.size = 1.4 + age * 4.5 + s[3];
      o.alpha = smooth(0, 0.12, age) * (1 - smooth(0.45, 1, age)) * (0.6 + 0.4 * s[4]);
    });
    wisps.mat.uniforms.uOpacity.value = 0.22 * st.evap;
    wisps.update((i, s, o) => {
      const life = 3.2, age = ((t / life + s[0]) % 1);
      o.p.set(mix(-2.7, 2.7, s[1]) + Math.sin(t + s[2] * 6) * 0.1, mix(D.yFillBot, D.yFillTop, s[2]) + age * 1.4, frontSheetZ + 0.12 + s[3] * 0.15);
      o.size = 0.5 + age * 1.0; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.5, 1, age));
    });
    mist.update((i, s, o) => {
      const [nx, nz] = visNoz[i % visNoz.length]; const age = ((t / 1.6 + s[0]) % 1);
      o.p.set(nx + (s[1] - 0.5) * 1.2 * age, D.yHeader - 0.35 - age * 0.6, nz + (s[2] - 0.5) * 1.0 * age);
      o.size = 0.4 + age * 0.8; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.6, 1, age));
    });
    ST.updateDust(t);
    return { ...st, cut };
  }

  const anchors = {
    mould: new V3(...D.mould), channel: new V3(D.mould[0], D.chY, 0), part: new V3(D.mould[0], D.mould[1], 0.0),
    riser: new V3(4.3, -2.2, 0), header: new V3(0.0, D.yHeader, 0), nozzle: new V3(-0.75, D.yHeader - 0.3, -0.75),
    fill: new V3(0.4, -1.2, frontSheetZ + 0.05), louver: new V3(-D.TX - 0.05, -4.0, -0.8), fan: new V3(1.1, D.yFan, 0), stackTop: new V3(0, D.yStackTop + 0.5, 0),
    elim: new V3(-1.2, D.yElimBot + 0.25, 0), basin: new V3(0.6, D.yWater - 0.3, -0.6), outlet: new V3(-D.TX, -6.0, 0), pump: new V3(-5.6, -6.0, 0),
    probe: new V3(1.6, -5.4, -2.4), controller: new V3(1.6, -4.1, -2.79), bleed: new V3(-6.9, -5.7, 0.3), makeup: new V3(-1.3, -5.3, -1.6),
    dosing: new V3(-4.4, -5.7, -2.5), filter: new V3(5.5, -5.6, -1.5), crust: new V3(D.mould[0] + 0.8 + 0.14, D.mould[1] - 0.6 + 0.14, 0), zch: new V3(D.mould[0], D.mould[1] - 0.6, 0), evap: new V3(-0.6, -0.6, frontSheetZ + 0.2),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
