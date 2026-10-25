// Shared injection unit for the moulding-machine episodes: barrel, screw with flights, check ring, heater bands,
// thermocouples, nozzle, hopper, optional mould. Axis along +x, centred on y = z = 0.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { castSurface, tubeSolid, rbox, flipGeo, qAlign, mulberry, smooth, clamp01, mix, csg, cylBetween, V3, X, Y, Z, SHARED } from 'series/look';

export const INJ = {
  bore: 0.52, barrelR: 1.0, x0: -9.6, x1: 5.0, headX1: 5.8, nozX1: 7.0, throat: [-8.4, -7.6],
  screwR: 0.5, tipFwd: 4.72, stroke: 2.2, zones: [-5.6, -3.0, -0.4, 2.2], zoneW: 2.1,
};
const I = INJ;

// geometry of one helical flight, extruded along a helix around +x
function flightGeo(xStart, len, pitch, rIn, rOut, thick) {
  const turns = len / pitch, steps = Math.ceil(turns * 40);
  const pts = [];
  for (let i = 0; i <= steps; i++) { const f = i / steps, a = f * turns * Math.PI * 2; pts.push(new V3(xStart + f * len, Math.cos(a) * (rIn + rOut) / 2, Math.sin(a) * (rIn + rOut) / 2)); }
  const path = new THREE.CatmullRomCurve3(pts);
  const s = new THREE.Shape(); const h = (rOut - rIn) / 2, w = thick / 2;
  s.moveTo(-h, -w); s.lineTo(h, -w); s.lineTo(h, w); s.lineTo(-h, w); s.lineTo(-h, -w);
  const g = new THREE.ExtrudeGeometry(s, { steps, bevelEnabled: false, extrudePath: path });
  return toCreasedNormals(g, 0.6);
}

export function buildInjection(ST, { mould = false, heaters = true, tcs = true, fontFamily = 'sans-serif' } = {}) {
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  const steel = castSurface(new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.32, metalness: 0.85, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.02, mottle: 0.1, key: 'injsteel' });
  const screwMat = castSurface(new THREE.MeshStandardMaterial({ color: 0xa3abb3, roughness: 0.22, metalness: 0.95, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.01, mottle: 0.08, key: 'screw' });
  const ringU = { uWear: { value: 0 } };
  const ringMat = castSurface(new THREE.MeshStandardMaterial({ color: 0x9fbcd3, roughness: 0.2, metalness: 1.0, clippingPlanes: clip, clipShadows: true }), {
    freq: 3, bump: 0.02, mottle: 0.08, key: 'ring', uniforms: ringU,
    extra: 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32,0.27,0.22)*(0.6+0.8*nLow), uWear*0.8*smoothstep(0.3,0.7,texture2D(uNoiseTex, vWPos.xz*3.0+vWPos.y*2.0).b));',
  });
  const cutSteel = M.cutSteel;
  const cutBar = M.cut.clone(); cutBar.clippingPlanes = clip; cutBar.color.set(0x4c555e); cutBar.onBeforeCompile = M.cut.onBeforeCompile;
  const bandU = [];

  // ---------------- barrel (with thermocouple wells), head, nozzle, feed throat, hopper
  let barrel = tubeSolid(I.bore, I.barrelR, I.x1 - I.x0, 96).rotateZ(-Math.PI / 2).translate(I.x0, 0, 0);
  const tcX = I.zones.map((z) => z + I.zoneW / 2 + 0.25);
  if (tcs) barrel = csg(barrel, tcX.map((x) => ['sub', cylBetween([x, 0.62, 0], [x, 1.2, 0], 0.11, 24)]), Math.PI / 6);
  // feed opening into the bore
  barrel = csg(barrel, [['sub', new THREE.BoxGeometry(0.8, 1.2, 0.7).translate((I.throat[0] + I.throat[1]) / 2, 0.6, 0)]], Math.PI / 6);
  const barrelM = addSolid(barrel, steel, cutBar);
  const headG = csg(new THREE.CylinderGeometry(I.barrelR, 0.78, I.headX1 - I.x1, 64).rotateZ(-Math.PI / 2).translate((I.x1 + I.headX1) / 2, 0, 0), [
    ['sub', new THREE.CylinderGeometry(I.bore, 0.16, I.headX1 - I.x1 + 0.02, 48).rotateZ(-Math.PI / 2).translate((I.x1 + I.headX1) / 2, 0, 0)],
  ], Math.PI / 6);
  const head = addSolid(headG, steel, cutBar);
  const nozG = csg(new THREE.CylinderGeometry(0.5, 0.28, I.nozX1 - I.headX1, 48).rotateZ(-Math.PI / 2).translate((I.headX1 + I.nozX1) / 2, 0, 0), [
    ['add', new THREE.SphereGeometry(0.3, 32, 16).translate(I.nozX1 - 0.05, 0, 0)],
    ['sub', cylBetween([I.headX1 - 0.1, 0, 0], [I.nozX1 + 0.5, 0, 0], 0.12, 24)],
  ], Math.PI / 6);
  const nozzleGroup = new THREE.Group(); scene.add(nozzleGroup);
  const nozzle = addSolid(nozG, steel, cutBar, nozzleGroup);
  head.removeFromParent(); nozzleGroup.add(head);
  // nozzle heater band
  addSolid(tubeSolid(0.52, 0.68, 0.7, 48).rotateZ(-Math.PI / 2).translate(I.headX1 + 0.15, 0, 0), M.machined, cutBar, nozzleGroup);
  const feed = addSolid(csg(rbox(1.8, 2.6, 2.6, 0.08).translate((I.throat[0] + I.throat[1]) / 2, 0.15, 0), [
    ['sub', cylBetween([I.throat[0] - 1.5, 0, 0], [I.throat[1] + 1.5, 0, 0], I.barrelR - 0.005, 64)],
    ['sub', new THREE.BoxGeometry(0.8, 2.0, 0.7).translate((I.throat[0] + I.throat[1]) / 2, 1.0, 0)],
  ], Math.PI / 6), M.machined, cutBar);
  const hopperG = csg(new THREE.CylinderGeometry(1.7, 0.42, 2.4, 48).translate((I.throat[0] + I.throat[1]) / 2, 2.65, 0), [
    ['add', new THREE.CylinderGeometry(1.7, 1.7, 1.4, 48).translate((I.throat[0] + I.throat[1]) / 2, 4.55, 0)],
    ['sub', new THREE.CylinderGeometry(1.62, 0.34, 2.42, 48).translate((I.throat[0] + I.throat[1]) / 2, 2.65, 0)],
    ['sub', new THREE.CylinderGeometry(1.62, 1.62, 1.6, 48).translate((I.throat[0] + I.throat[1]) / 2, 4.6, 0)],
  ], Math.PI / 6);
  const hopper = addSolid(hopperG, M.cast, cutBar);

  // ---------------- screw (rotates + slides), check ring assembly
  const screw = new THREE.Group(); scene.add(screw);       // slides along x
  const spin = new THREE.Group(); screw.add(spin);          // rotates about x
  const tipX = 0; // local: tip point at x = 0
  const seatX = -1.75, shankX0 = -1.55, tipBase = -0.8;
  const flightX0 = I.x0 - I.tipFwd + 0.2, flightX1 = seatX - 0.02;
  // root: lathe of the root radius profile (feed -> compression -> metering)
  const L = flightX1 - flightX0;
  const prof = [];
  const rootAt = (f) => (f < 0.45 ? 0.3 : f < 0.72 ? mix(0.3, 0.41, (f - 0.45) / 0.27) : 0.41);
  prof.push(new THREE.Vector2(0.0, 0)); for (let i = 0; i <= 40; i++) { const f = i / 40; prof.push(new THREE.Vector2(rootAt(f), f * L)); } prof.push(new THREE.Vector2(0.0, L));
  const rootG = new THREE.LatheGeometry(prof, 64).rotateZ(-Math.PI / 2).translate(flightX0, 0, 0);
  addSolid(rootG, screwMat, cutSteel, spin);
  addSolid(flightGeo(flightX0 + 0.2, L - 0.25, 1.0, 0.29, I.screwR, 0.14), screwMat, cutSteel, spin);
  // seat (front shoulder of the screw), shank, fluted tip
  const seat = addSolid(tubeSolid(0.0001, 0.48, 0.2, 64).rotateZ(-Math.PI / 2).translate(seatX, 0, 0), screwMat, cutSteel, spin);
  addSolid(new THREE.CylinderGeometry(0.26, 0.26, tipBase - seatX, 32).rotateZ(-Math.PI / 2).translate((seatX + tipBase) / 2, 0, 0), screwMat, cutSteel, spin);
  let tipG = new THREE.CylinderGeometry(0.0, 0.46, -tipBase, 48).rotateZ(-Math.PI / 2).translate(tipBase / 2, 0, 0);
  tipG = csg(tipG, [0, 1, 2, 3].map((k) => ['sub', new THREE.BoxGeometry(1.0, 0.12, 0.6).translate(-0.4, 0.42, 0).rotateX((k * Math.PI) / 2 + 0.6)]), Math.PI / 6);
  addSolid(tipG, screwMat, cutSteel, spin);
  // the check ring (slides between the seat and the tip)
  const ring = new THREE.Group(); spin.add(ring);
  const cutRing = M.cut.clone(); cutRing.clippingPlanes = clip; cutRing.color.set(0x5f9fcf); cutRing.onBeforeCompile = M.cut.onBeforeCompile;
  addSolid(tubeSolid(0.3, 0.505, 0.45, 64).rotateZ(-Math.PI / 2), ringMat, cutRing, ring);
  const RING_CLOSED = shankX0, RING_OPEN = tipBase - 0.45;

  // ---------------- melt: reservoir in front of the screw + material in the channels
  const meltU = { uFill: { value: 1 } };
  const meltMat = new THREE.MeshStandardMaterial({ color: 0x5a1a04, emissive: 0xff6a1a, emissiveIntensity: 0.8, roughness: 0.4, transparent: true, opacity: 0.85, clippingPlanes: clip });
  const meltCut = new THREE.MeshBasicMaterial({ color: 0xff8a3a, side: THREE.BackSide, clippingPlanes: clip, transparent: true, opacity: 0.92 });
  const reservoir = new THREE.Group(); scene.add(reservoir);
  const resGeo = new THREE.CylinderGeometry(I.bore - 0.006, I.bore - 0.006, 1, 64).rotateZ(-Math.PI / 2).translate(0.5, 0, 0);
  const resM = new THREE.Mesh(resGeo, meltMat); reservoir.add(resM); const resC = new THREE.Mesh(resGeo, meltCut); resC.renderOrder = -1; reservoir.add(resC); ST.cutMeshes.push(resC);
  const channelMelt = new THREE.Mesh(tubeSolid(0.3, I.bore - 0.008, 1, 64).rotateZ(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a2006, emissive: 0xff5a10, emissiveIntensity: 0.35, roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false, clippingPlanes: clip }));
  scene.add(channelMelt);

  // ---------------- heater bands (one per zone): sheath, mica, ribbon coil, clamp lugs, terminal box
  const bands = [];
  if (heaters) {
    I.zones.forEach((zx, k) => {
      const g = new THREE.Group(); g.position.x = zx; scene.add(g);
      const u = { uOn: { value: 0 }, uHot: { value: 0 } };
      const sheath = castSurface(new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.45, metalness: 0.75, clippingPlanes: clip, clipShadows: true }), {
        freq: 1.5, bump: 0.03, mottle: 0.2, grime: 0.3, key: 'sheath' + k, uniforms: u,
        emissive: 'totalEmissiveRadiance += vec3(1.0, 0.25, 0.05) * uHot * 1.8;',
      });
      const mica = new THREE.MeshStandardMaterial({ color: 0xd8cfae, roughness: 0.8, clippingPlanes: clip });
      const coilMat = new THREE.MeshStandardMaterial({ color: 0x5a3020, emissive: 0xff4a10, emissiveIntensity: 0, roughness: 0.5, clippingPlanes: clip });
      const W = I.zoneW;
      const outer = addSolid(tubeSolid(1.16, 1.22, W, 96).rotateZ(-Math.PI / 2), sheath, M.cutSteel, g);
      const inner = addSolid(tubeSolid(1.005, 1.04, W, 96).rotateZ(-Math.PI / 2), sheath, M.cutSteel, g);
      const micaM = addSolid(tubeSolid(1.04, 1.16, W, 96).rotateZ(-Math.PI / 2), mica, null, g);
      const micaCut = M.cut.clone(); micaCut.clippingPlanes = clip; micaCut.color.set(0xcdbf94); micaCut.onBeforeCompile = M.cut.onBeforeCompile;
      micaM.add(new THREE.Mesh(micaM.geometry, micaCut)); ST.cutMeshes.push(micaM.children[0]); micaM.children[0].renderOrder = -1;
      // resistance ribbon coiled inside the mica
      const coil = addSolid(flightGeo(0.12, W - 0.24, 0.16, 1.07, 1.13, 0.06), coilMat, null, g);
      // clamp lugs underneath + bolt
      const lug = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(W * 0.8, 0.5, 0.08).translate(W / 2, -1.42, 0.12), new THREE.BoxGeometry(W * 0.8, 0.5, 0.08).translate(W / 2, -1.42, -0.12), new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12).rotateX(Math.PI / 2).translate(W / 2, -1.5, 0)]), M.zinc);
      lug.castShadow = shadows; g.add(lug);
      // terminal box on the back side (so the section keeps it)
      const tb = addSolid(rbox(0.7, 0.45, 0.42, 0.04), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, clippingPlanes: clip }), M.cut, g); tb.position.set(W / 2, 0.35, -1.38);
      const term = new THREE.Mesh(mergeGeometries([new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12).translate(W / 2 - 0.16, 0.65, -1.38), new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12).translate(W / 2 + 0.16, 0.65, -1.38)]), M.brass);
      g.add(term);
      bands.push({ g, u, sheath, coilMat, outer, inner, micaM, coil, tb, x: zx });
      bandU.push(u);
    });
  }
  // ---------------- thermocouples: sheath, two wires, bead, bayonet cap, lead
  const tcList = [];
  if (tcs) tcX.forEach((x, k) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
    const sh = addSolid(tubeSolid(0.055, 0.08, 1.2, 24).translate(0, 0.62, 0), M.steel, M.cutSteel, g);
    const wireA = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.18, 8).translate(-0.022, 1.22, 0), new THREE.MeshStandardMaterial({ color: 0xc8332b, roughness: 0.5, clippingPlanes: clip }));
    const wireB = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.18, 8).translate(0.022, 1.22, 0), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5, clippingPlanes: clip }));
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.3, emissive: 0xff7a20, emissiveIntensity: 0, clippingPlanes: clip });
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8).translate(0, 0.645, 0), beadMat);
    g.add(wireA, wireB, bead);
    const cap = addSolid(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 24).translate(0, 1.95, 0), M.zinc, M.cutSteel, g);
    const spring = new THREE.Mesh(flightGeo(0, 0.5, 0.07, 0.085, 0.11, 0.025).rotateZ(Math.PI / 2).translate(0, 1.32, 0), M.zinc); g.add(spring);
    const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 2.1, 0), new V3(0, 2.6, -0.1), new V3(0.4, 3.0, -0.8), new V3(0.8, 3.1, -2.5)]), 32, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0x3a6fb0, roughness: 0.6 }));
    g.add(lead);
    tcList.push({ g, bead, beadMat, x });
  });

  // ---------------- optional mould (stationary platen + cavity with flow-front fill)
  let mouldParts = null;
  if (mould) {
    const mx0 = I.nozX1 + 0.12;
    const plate = addSolid(csg(rbox(1.2, 7.0, 6.0, 0.08).translate(mx0 + 0.6, 0, 0), [['sub', cylBetween([mx0 - 0.1, 0, 0], [mx0 + 1.4, 0, 0], 0.13, 24)], ['sub', new THREE.SphereGeometry(0.31, 24, 12).translate(mx0 - 0.02, 0, 0)]], Math.PI / 6), M.machined, cutBar);
    const cav = addSolid(csg(rbox(1.6, 7.0, 6.0, 0.08).translate(mx0 + 2.0, 0, 0), [['sub', new THREE.BoxGeometry(0.5, 4.6, 3.6).translate(mx0 + 1.45, 0, 0)]], Math.PI / 6), steel, cutBar);
    const back = addSolid(rbox(1.6, 7.0, 6.0, 0.08).translate(mx0 + 3.6, 0, 0), M.machined, cutBar);
    const fillU = { uFill: { value: 0 }, uShort: { value: 0 } };
    const partMat = new THREE.MeshStandardMaterial({ color: 0x6a1d06, emissive: 0xff6a1a, emissiveIntensity: 0.7, roughness: 0.45, clippingPlanes: clip });
    partMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, fillU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vP; uniform float uFill;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float rr = length(vP.yz / vec2(2.3, 1.8)); if (rr > uFill * 1.45) discard;');
    };
    const partCut = new THREE.MeshBasicMaterial({ color: 0xff8a3a, side: THREE.BackSide, clippingPlanes: clip });
    partCut.onBeforeCompile = partMat.onBeforeCompile;
    const part = addSolid(new THREE.BoxGeometry(0.48, 4.58, 3.58, 1, 24, 24), partMat, partCut); part.position.set(mx0 + 1.45, 0, 0);
    mouldParts = { plate, cav, back, part, fillU, x0: mx0 };
  }

  // ---------------- state helpers
  const api = { cutBar,
    screw, spin, ring, bands, tcs: tcList, mould: mouldParts, nozzleGroup, ringU, reservoir, channelMelt, barrel: barrelM,
    // screw position: 0 = fully forward. ringOpen 0..1. rot in radians.
    set({ pos = 0, rot = 0, ringOpen = 0, cushion = 0.25, melt = 1 }) {
      const xTip = I.tipFwd + pos;
      screw.position.x = xTip; spin.rotation.x = rot;
      ring.position.x = mix(RING_CLOSED, RING_OPEN, ringOpen);
      // reservoir fills the bore from the tip to the barrel head
      const front = I.x1 + 0.02, back = xTip - 0.05;
      reservoir.position.x = back; reservoir.scale.x = Math.max(0.001, (front - back) * melt);
      reservoir.visible = melt > 0.01;
      // melt in the channels (compression + metering zones)
      const c0 = xTip + flightX0 + L * 0.48, c1 = xTip + seatX;
      channelMelt.position.x = c0; channelMelt.scale.x = c1 - c0;
    },
    tipX: () => screw.position.x,
    flight: { x0: flightX0, x1: flightX1, L },
    RING_CLOSED, RING_OPEN, seatX, tipBase,
  };
  return api;
}
