// Check ring episode: injection unit + mould. Pure function of t.
import * as THREE from 'three';
import { createStage, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, X, Y, Z, rbox } from 'series/look';
import { buildInjection, INJ } from 'series/inj';
import { stateAt } from './story.js';

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.022, floorY: -4.2, fontFamily });
  const { scene, M, clip } = ST;
  ST.lights.key.position.set(-6, 10, 14); ST.lights.key.target.position.set(0, 0, 0); ST.lights.key.intensity = 700;
  ST.lights.key.angle = 0.75;
  const U = buildInjection(ST, { mould: true, heaters: true, tcs: false, fontFamily });
  // machine frame under the injection unit
  const frame = new THREE.Mesh(rbox(19, 1.4, 3.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.55, metalness: 0.3 }));
  frame.position.set(-1.5, -3.4, -0.4); frame.receiveShadow = ST.shadows; scene.add(frame);
  for (const x of [-7.5, 1.5]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 1.2), M.support); s.position.set(x, -1.9, 0); s.castShadow = ST.shadows; scene.add(s); }

  // ---------------------------------------------------------------- particles
  const R = mulberry(9);
  const meltCol = new THREE.Color(0xffa04a).multiplyScalar(1.6), hotCol = new THREE.Color(0xff6a2a).multiplyScalar(1.5);
  const helix = (x0, x1, r, a0, pitch = 1.0, n = 40) => { const pts = []; for (let k = 0; k <= n; k++) { const f = k / n, x = mix(x0, x1, f), a = a0 + ((x - x0) / pitch) * Math.PI * 2; pts.push(new V3(x, Math.cos(a) * r, Math.sin(a) * r)); } return pts; };
  const F = U.flight;
  // forward flow through the open ring (screw-local coordinates; the mesh rides on the screw)
  const FWD = [], BACK = [], GLASS = [];
  for (let j = 0; j < 28; j++) {
    const a0 = R() * Math.PI * 2, r = mix(0.36, 0.48, R()), aEnd = a0 + R();
    const pts = helix(F.x0 + F.L * 0.55, U.seatX - 0.15, r, a0, 1.0, 30);
    const ae = Math.atan2(pts[pts.length - 1].z, pts[pts.length - 1].y);
    const rr = (x, rad) => new V3(x, Math.cos(ae) * rad, Math.sin(ae) * rad);
    pts.push(rr(-1.62, 0.4), rr(-1.45, 0.285), rr(-1.0, 0.285), rr(-0.55, 0.36), rr(-0.15, 0.3), rr(0.35, 0.22), rr(0.9, 0.16));
    FWD.push(buildLUT(pts, (p) => (p.x > -1.7 && p.x < -0.4 ? 0.6 : 1), 200));
    // leak path for a worn ring
    BACK.push(buildLUT([rr(0.6, 0.2), rr(0.1, 0.28), rr(-0.55, 0.36), rr(-1.0, 0.285), rr(-1.5, 0.3), rr(-1.75, 0.42), rr(-2.4, 0.46), rr(-3.4, 0.46)], () => 1, 80));
    GLASS.push(buildLUT(helix(-5.5, -1.9, r, a0, 1.0, 20), () => 1, 80));
  }
  const fwd = new Streaks(scene, { paths: FWD, count: 300, material: M.streak, seed: 1, speed: 1.4, radius: 0.016, lenMin: 0.06, lenMax: 0.1, colorFn: (p, u, w, c) => c.copy(meltCol) });
  U.screw.add(fwd.mesh);
  const back = new Streaks(scene, { paths: BACK, count: 140, material: M.streak, seed: 2, speed: 1.6, radius: 0.02, lenMin: 0.1, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(2.0, 0.35, 0.25) });
  U.screw.add(back.mesh);
  const glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeaf6ff).multiplyScalar(1.2), clippingPlanes: clip });
  const glass = new Streaks(scene, { paths: GLASS, count: 160, material: glassMat, seed: 3, speed: 0.9, radius: 0.008, lenMin: 0.16, lenMax: 0.0 });
  U.screw.add(glass.mesh);
  // pellets: hopper -> throat -> feed zone
  const PEL = [];
  const thx = (INJ.throat[0] + INJ.throat[1]) / 2;
  for (let j = 0; j < 30; j++) {
    const a0 = R() * Math.PI * 2, r = mix(0.33, 0.48, R());
    const p0 = new V3(thx + (R() - 0.5) * 2.2, 4.8, (R() - 0.5) * 2.2), p1 = new V3(thx + (R() - 0.5) * 0.5, 2.0, (R() - 0.5) * 0.4), p2 = new V3(thx + (R() - 0.5) * 0.5, 0.7, (R() - 0.5) * 0.4);
    const h = helix(thx + 0.2, -3.6, r, a0, 1.0, 24);
    PEL.push(buildLUT([p0, p1, p2, ...h], (p) => (p.y > 0.6 ? 0.35 : 1), 160));
  }
  const pelletMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.5, clippingPlanes: clip });
  const pellets = new Streaks(scene, { paths: PEL, count: 420, material: pelletMat, dots: true, radius: 0.055, seed: 4, speed: 0.55 });
  // injection: reservoir -> nozzle -> sprue -> spread through the cavity
  const mx0 = U.mould.x0;
  const INJP = [];
  for (let j = 0; j < 30; j++) {
    const o = new V3(0, R() - 0.5, R() - 0.5).multiplyScalar(0.6);
    const a = R() * Math.PI * 2, rr = Math.sqrt(R());
    INJP.push(buildLUT([new V3(2.8, o.y, o.z), new V3(4.6, o.y * 0.8, o.z * 0.8), new V3(5.6, o.y * 0.15, o.z * 0.15), new V3(6.6, 0, 0), new V3(mx0 + 1.0, 0, 0), new V3(mx0 + 1.45, Math.cos(a) * 0.6 * rr, Math.sin(a) * 0.5 * rr), new V3(mx0 + 1.45, Math.cos(a) * 2.1 * rr, Math.sin(a) * 1.65 * rr)], (p) => (p.x > 5.4 && p.x < 7.1 ? 2.2 : 1), 120));
  }
  const injS = new Streaks(scene, { paths: INJP, count: 260, material: M.streak, seed: 5, speed: 2.4, radius: 0.02, lenMin: 0.1, lenMax: 0.15, colorFn: (p, u, w, c) => c.copy(hotCol) });

  // ---------------------------------------------------------------- update
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    const range = opts.cutRange || [3.2, 0];
    ST.setCut(cut, range[0], range[1]);
    ST.lights.sectionLight.intensity = 0;
    U.set({ pos: st.pos, rot: st.rot, ringOpen: st.ringOpen });
    U.ringU.uWear.value = st.wear;
    U.nozzleGroup.position.x = st.nozzleOff * 3.2;
    U.mould.fillU.uFill.value = st.fill;
    U.mould.part.visible = st.fill > 0.005;
    // heater bands glow gently (they are on, holding temperature)
    U.bands.forEach((b, k) => { b.coilMat.emissiveIntensity = 0.6 + 0.4 * Math.max(0, Math.sin(t * 1.3 + k * 1.7)); b.u.uHot.value = 0; });
    const cam = opts.camPos || null;
    const camLocal = cam ? cam.clone().sub(U.screw.position) : null;
    fwd.update({ tau: t * 1.0, vis: st.recovering * st.ringOpen, camPos: camLocal });
    back.update({ tau: t, vis: st.leak, camPos: camLocal });
    glass.update({ tau: t, vis: st.glass * 0.9, camPos: camLocal });
    pellets.update({ tau: st.rot / 2.6 * 1.0 + t * 0.15, vis: 0.85, camPos: cam });
    injS.update({ tau: t, vis: st.injecting * (st.fill < 0.98 ? 1 : 0), camPos: cam });
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    get ring() { return new V3(U.screw.position.x + U.ring.position.x + 0.22, 0.5, -0.05); },
    get seat() { return new V3(U.screw.position.x + U.seatX + 0.1, 0.42, -0.05); },
    get gap() { return new V3(U.screw.position.x + U.ring.position.x - 0.1, 0.3, -0.05); },
    get tip() { return new V3(U.screw.position.x - 0.3, 0.3, -0.05); },
    get cushion() { return new V3((U.screw.position.x + INJ.x1) / 2 + 0.1, 0.0, -0.1); },
    get screw() { return new V3(U.screw.position.x - 5.0, 0.48, 0); },
    nozzle: new V3(6.4, 0.3, 0), mould: new V3(mx0 + 1.45, 1.2, -0.1), barrel: new V3(-2.0, 1.0, 0), hopper: new V3(thx, 3.6, 0),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST, U };
}
