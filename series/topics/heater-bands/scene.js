// Heater bands + thermocouples on the injection barrel, with controller, isolator and test meters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, rbox, castSurface } from 'series/look';
import { buildInjection, INJ } from 'series/inj';
import { stateAt, SV } from './story.js';

export const RIG = { iso: new V3(40, 0, 0) };
const W = INJ.zoneW;
export const ZX = INJ.zones.map((z) => z + W / 2);           // band centres
export const TCX = INJ.zones.map((z) => z + W / 2 + 0.25);   // thermocouple x

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.024, floorY: -4.2, fontFamily });
  const { scene, M, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(-5, 10, 13); ST.lights.key.target.position.set(-0.5, 0.5, 0); ST.lights.key.intensity = 520; ST.lights.key.angle = 0.75;
  const U = buildInjection(ST, { mould: false, heaters: true, tcs: true, fontFamily });
  const frame = new THREE.Mesh(rbox(19, 1.4, 3.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.55, metalness: 0.3 }));
  frame.position.set(-1.5, -3.4, -0.4); frame.receiveShadow = shadows; scene.add(frame);
  for (const x of [-7.5, 1.5]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 1.2), M.support); s.position.set(x, -1.9, 0); s.castShadow = shadows; scene.add(s); }

  // ------------------------------------------------ power leads from each band's terminals (back side)
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.7 });
  const cookedMat = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.9, emissive: 0xff5a10, emissiveIntensity: 0 });
  const leads = [];
  INJ.zones.forEach((zx, k) => {
    for (const s of [-1, 1]) {
      const x = zx + W / 2 + s * 0.16;
      const pts = [new V3(x, 0.72, -1.38), new V3(x, 1.25, -1.5), new V3(x + 0.05 * s, 1.7, -2.1), new V3(x + 0.3, 2.05, -2.7), new V3(x + 0.9, 2.15, -3.2)];
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 8), cableMat); m.castShadow = shadows; scene.add(m);
      if (k === 2) { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, 3)), 12, 0.05, 8), cookedMat); scene.add(c); }
      leads.push({ k, s, curve });
    }
  });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 0.8), M.support); tray.position.set(-1.0, 2.1, -3.4); scene.add(tray);

  // ------------------------------------------------ temperature controller with a live display
  const ctrlG = new THREE.Group(); ctrlG.position.set(0.7, 4.3, -2.6); scene.add(ctrlG);
  const ctrlBox = new THREE.Mesh(rbox(3.0, 1.7, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.45, metalness: 0.4 })); ctrlBox.castShadow = shadows; ctrlG.add(ctrlBox);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 240;
  const ctx = cv.getContext('2d');
  const scrTex = new THREE.CanvasTexture(cv); scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.22), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  screen.position.z = 0.36; ctrlG.add(screen);
  let lastKey = '';
  const drawScreen = (c, pwr) => {
    const key = [c.zone, c.pv.toFixed(1), c.sv, c.out, c.alarm, pwr > 0.5].join('|');
    if (key === lastKey) return; lastKey = key;
    ctx.fillStyle = c.alarm ? '#2a0606' : '#05090c'; ctx.fillRect(0, 0, 512, 240);
    if (pwr < 0.5) { ctx.fillStyle = '#1a1d20'; ctx.fillRect(0, 0, 512, 240); scrTex.needsUpdate = true; return; }
    ctx.font = `700 34px ${fontFamily}`; ctx.fillStyle = '#9fb4c4'; ctx.textBaseline = 'top';
    ctx.fillText(c.zone, 22, 18); ctx.fillText('PV', 128, 18); ctx.fillText('SV', 372, 18);
    ctx.font = `700 88px ${fontFamily}`; ctx.fillStyle = c.alarm ? '#ff5a4e' : '#ff9a3c'; ctx.fillText(c.pv.toFixed(1), 120, 52);
    ctx.font = `700 52px ${fontFamily}`; ctx.fillStyle = '#6ff0b0'; ctx.fillText(String(c.sv), 368, 62);
    ctx.font = `700 30px ${fontFamily}`; ctx.fillStyle = '#9fb4c4'; ctx.fillText('OUT', 22, 178);
    ctx.fillStyle = '#1b2733'; ctx.fillRect(100, 182, 300, 30);
    ctx.fillStyle = c.out >= 100 ? '#ff5a4e' : '#ffb35c'; ctx.fillRect(100, 182, 3 * c.out, 30);
    ctx.fillStyle = '#e8eef3'; ctx.fillText(`${c.out}%`, 412, 178);
    scrTex.needsUpdate = true;
  };
  // thermocouple leads run up into the controller
  INJ.zones.forEach((zx, k) => {
    const x = TCX[k];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(x + 0.8, 3.1, -2.5), new V3(x + 0.8, 3.3, -2.9), new V3(mix(x + 0.8, 0.7, 0.6), 3.4, -3.0), new V3(0.7 + (k - 1.5) * 0.4, 3.45, -2.6)]), 20, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x3a6fb0, roughness: 0.6 }));
    scene.add(m);
  });

  // ------------------------------------------------ melt flow along the screw (rides with the screw)
  const R = mulberry(9);
  const F = U.flight;
  const helix = (x0, x1, r, a0, pitch = 1.0, n = 40) => { const pts = []; for (let k = 0; k <= n; k++) { const f = k / n, x = mix(x0, x1, f), a = a0 + ((x - x0) / pitch) * Math.PI * 2; pts.push(new V3(x, Math.cos(a) * r, Math.sin(a) * r)); } return pts; };
  const FWD = [];
  for (let j = 0; j < 26; j++) FWD.push(buildLUT(helix(F.x0 + F.L * 0.2, U.seatX - 0.15, mix(0.36, 0.48, R()), R() * Math.PI * 2, 1.0, 36), () => 1, 160));
  const meltS = new Streaks(scene, { paths: FWD, count: 300, material: M.streak, seed: 1, speed: 1.0, radius: 0.016, lenMin: 0.06, lenMax: 0.1, colorFn: (p, u, w, c) => c.setRGB(1.2 + 0.8 * u, 0.55 + 0.2 * u, 0.25) });
  U.screw.add(meltS.mesh);

  // ------------------------------------------------ thermocouple "voltage": charges moving round the two wires
  const tx = TCX[2];
  const EL = [];
  for (let j = 0; j < 6; j++) EL.push(buildLUT([new V3(tx - 0.022, 0.66, -0.004), new V3(tx - 0.022, 1.25, -0.004), new V3(tx - 0.022, 1.84, -0.004)], () => 1, 30));
  const chargeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe9ff).multiplyScalar(1.8), clippingPlanes: clip });
  const charges = new Streaks(scene, { paths: EL, count: 40, material: chargeMat, dots: true, radius: 0.01, seed: 2, speed: 0.6 });

  // ------------------------------------------------ sparks + smoke
  const burnSpark = new Puffs(scene, { count: 70, color: 0xffc070, opacity: 0, size: 0.14, additive: true });
  const arcSpark = new Puffs(scene, { count: 60, color: 0xbfe6ff, opacity: 0, size: 0.16, additive: true });
  const smoke = new Puffs(scene, { count: 50, color: 0x8a8f96, opacity: 0, size: 0.6 });
  const heatHaze = new Puffs(scene, { count: 60, color: 0xff7a3a, opacity: 0, size: 0.6, additive: true });

  // ------------------------------------------------ test meters
  const meterTex = (txt, sub) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#b9c7a8'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#14180f'; x.font = `700 64px ${fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 58);
    x.font = `600 22px ${fontFamily}`; x.fillText(sub, 128, 108);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2b51c, roughness: 0.5 });
  const meterBody = (txt, sub) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(rbox(0.8, 1.3, 0.26, 0.08), yellow); b.castShadow = shadows; g.add(b);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: meterTex(txt, sub), toneMapped: false })); d.position.set(0, 0.32, 0.14); g.add(d);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.5 })); knob.position.set(0, -0.22, 0.15); g.add(knob);
    return g;
  };
  const b0 = INJ.zones[0];
  const probeG = new THREE.Group(); scene.add(probeG);
  const ohm = meterBody('44.1', 'OHMS'); ohm.position.set(b0 + W / 2 - 1.35, 1.55, -2.5); ohm.rotation.y = 2.22; probeG.add(ohm);
  for (const [s, col] of [[-1, 0xd02a2a], [1, 0x18191c]]) {
    const tip = new V3(b0 + W / 2 + s * 0.16, 0.76, -1.38), top = tip.clone().add(new V3(s * 0.12, 0.7, -0.45));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, tip.distanceTo(top), 12), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
    rod.position.copy(tip).add(top).multiplyScalar(0.5); rod.quaternion.setFromUnitVectors(new V3(0, 1, 0), top.clone().sub(tip).normalize()); probeG.add(rod);
    const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, top.clone().add(new V3(0, 0.3, -0.4)), ohm.position.clone().add(new V3(s * 0.2, -0.7, 0.1))]), 16, 0.018, 6), rod.material); probeG.add(lead);
  }
  const clampG = new THREE.Group(); scene.add(clampG);
  {
    const lead = leads.find((l) => l.k === 0 && l.s === 1);
    const p = lead.curve.getPointAt(0.42), tan = lead.curve.getTangentAt(0.42);
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 40), yellow); jaw.position.copy(p); jaw.quaternion.setFromUnitVectors(new V3(0, 0, 1), tan); clampG.add(jaw);
    const body = meterBody('5.2', 'AMPS'); body.scale.setScalar(0.7); body.position.copy(p).add(new V3(-0.75, 0.15, -0.15)); body.rotation.y = -2.76; clampG.add(body);
    const a = p.clone().add(new V3(-0.18, 0.02, -0.05)), b = body.position.clone().add(new V3(0.12, -0.3, 0)), neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, a.distanceTo(b), 10), yellow);
    neck.position.copy(a).add(b).multiplyScalar(0.5); neck.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); clampG.add(neck);
  }

  // ------------------------------------------------ isolator with lockout (macro rig)
  const I0 = RIG.iso;
  const isoG = new THREE.Group(); isoG.position.copy(I0); scene.add(isoG);
  const cab = new THREE.Mesh(rbox(3.4, 4.4, 1.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x8b9298, roughness: 0.5, metalness: 0.4 })); cab.position.set(0, 0.2, -0.72); cab.receiveShadow = shadows; isoG.add(cab);
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#f2c21c'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#111'; x.font = `800 40px ${fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('ON', 128, 34); x.fillText('OFF', 214, 128); x.font = `700 20px ${fontFamily}`; x.fillText('MAIN ISOLATOR', 128, 232);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.05), [M.zincNoClip, M.zincNoClip, M.zincNoClip, M.zincNoClip, new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.6 }), M.zincNoClip]);
  plate.position.set(0, 0.7, -0.1); isoG.add(plate);
  const handle = new THREE.Group(); handle.position.set(0, 0.7, 0.0); isoG.add(handle);
  const redM = new THREE.MeshPhysicalMaterial({ color: 0xd2232a, roughness: 0.4, clearcoat: 0.6 });
  handle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 32).rotateX(Math.PI / 2).translate(0, 0, 0.06), redM));
  const bar = new THREE.Mesh(rbox(0.22, 0.95, 0.16, 0.06), redM); bar.position.set(0, 0.35, 0.14); handle.add(bar);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.04), M.zincNoClip); tab.position.set(0, -0.4, 0.02); isoG.add(tab); tab.position.y = 0.7 - 0.4;
  const lockG = new THREE.Group(); isoG.add(lockG);
  {
    const body = new THREE.Mesh(rbox(0.34, 0.38, 0.16, 0.05), new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.4, metalness: 0.2 })); body.position.set(0, -0.12, 0.1); lockG.add(body);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 10, 24, Math.PI), M.zincNoClip); sh.position.set(0, 0.07, 0.1); lockG.add(sh);
    const tc = document.createElement('canvas'); tc.width = 128; tc.height = 200; const x = tc.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 200); x.fillStyle = '#c8202a'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#fff'; x.font = `800 28px ${fontFamily}`; x.textAlign = 'center'; x.fillText('DANGER', 64, 44);
    x.fillStyle = '#111'; x.font = `800 22px ${fontFamily}`; x.fillText('LOCKED', 64, 104); x.fillText('OUT', 64, 132); x.font = `600 14px ${fontFamily}`; x.fillText('DO NOT OPERATE', 64, 172);
    const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.66), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.8, side: THREE.DoubleSide })); tag.position.set(0.05, -0.68, 0.16); tag.rotation.z = 0.08; lockG.add(tag);
  }
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); rigL.position.copy(I0).add(new V3(2.5, 3.5, 7)); rigL.target.position.copy(I0); scene.add(rigL, rigL.target);

  // ------------------------------------------------ update
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    const range = opts.cutRange || [3.2, 0];
    ST.setCut(cut, range[0], range[1]);
    ST.lights.sectionLight.intensity = 0;
    U.set({ pos: -1.0, rot: t * 1.3, ringOpen: 1 });
    U.channelMelt.material.emissiveIntensity = 0.35 + 0.5 * (opts.shear ?? 0);
    U.channelMelt.material.opacity = 0.3 + 0.2 * (opts.shear ?? 0);
    // bands
    U.bands.forEach((b, k) => {
      b.coilMat.emissiveIntensity = 2.2 * st.glow[k] * st.pwr;
      const base = 0.07 + 0.9 * (opts.thermal ?? 0);
      b.u.uHot.value = (st.sheathHot[k] + (k === 1 ? base * (1 - st.dead1) : k === 2 ? base * (1 - st.fail2) : base)) * st.pwr;
      const sc = k === 2 ? 1 + 0.08 * st.loose2 : 1;
      b.g.scale.set(1, sc, sc);
    });
    U.tcs.forEach((c, k) => {
      c.g.position.y = k === 3 ? 0.45 * st.tcOut3 : 0;
      c.beadMat.emissiveIntensity = k === 2 ? 1.6 * st.tcHeat * (t > 19.8 && t < 24.8 ? 1 : 0.15) : 0;
    });
    cookedMat.color.setHex(0x17181b).lerp(new THREE.Color(0x6a4224), st.cooked);
    cookedMat.emissiveIntensity = 2.0 * st.arc * (Math.sin(t * 61) > 0.2 ? 1 : 0.2);
    drawScreen(st.ctrl, st.pwr);
    // test gear
    probeG.visible = st.probes > 0.01; probeG.position.y = 0.6 * (1 - st.probes);
    clampG.visible = st.clamp > 0.01; clampG.position.y = 0.6 * (1 - st.clamp);
    // isolator
    handle.rotation.z = -Math.PI / 2 * st.isolate;
    lockG.visible = st.padlock > 0.01; lockG.position.set(0.0, 0.3 - 0.5 * (1 - st.padlock), 0.0);
    const cam = opts.camPos || null;
    const nearIso = cam && cam.distanceTo(I0) < 14;
    rigL.intensity = nearIso ? 45 : 0; rigL.visible = !!nearIso;
    // particles
    meltS.update({ tau: t * 0.8, vis: opts.shear ?? 0.5, camPos: cam ? cam.clone().sub(U.screw.position) : null });
    charges.update({ tau: t * (0.2 + 1.6 * st.tcHeat), vis: (t > 20.0 && t < 24.8 ? 1 : 0) * (0.15 + 0.85 * st.tcHeat), camPos: null });
    const bx = ZX[1];
    burnSpark.mat.uniforms.uOpacity.value = 1.0 * (smooth(36.0, 36.15, t) * (1 - smooth(36.5, 36.9, t)));
    burnSpark.update((i, s, o) => { const age = ((t * 2.2 + s[0]) % 1); o.p.set(bx - 0.4 + s[1] * 0.3 + (s[2] - 0.5) * age * 1.2, 1.12 + age * (0.4 + s[3] * 0.8) - age * age * 1.1, -0.05 - s[4] * 0.2); o.size = 0.05 + 0.08 * (1 - age); o.alpha = 1 - age; });
    const tx2 = INJ.zones[2] + W / 2;
    arcSpark.mat.uniforms.uOpacity.value = st.arc * (Math.sin(t * 47) > 0 ? 1 : 0.3);
    arcSpark.update((i, s, o) => { const age = ((t * 3.3 + s[0]) % 1); o.p.set(tx2 + 0.16 + (s[1] - 0.5) * 0.5 * age, 0.78 + age * 0.3 * s[2], -1.38 + (s[3] - 0.5) * 0.5 * age); o.size = 0.04 + 0.1 * (1 - age); o.alpha = 1 - age; });
    smoke.mat.uniforms.uOpacity.value = 0.35 * smooth(42.4, 43.0, t) * (1 - smooth(44.4, 45.0, t));
    smoke.update((i, s, o) => { const age = ((t * 0.5 + s[0]) % 1); o.p.set(tx2 + (s[1] - 0.5) * 0.4 + age * 0.3, 0.8 + age * 1.8, -1.45 + (s[2] - 0.5) * 0.4); o.size = 0.3 + age * 0.9; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    const hz = Math.max(st.hot2, st.hot3);
    const hx = st.hot2 > st.hot3 ? ZX[2] : ZX[3];
    heatHaze.mat.uniforms.uOpacity.value = 0.12 * hz * st.pwr;
    heatHaze.update((i, s, o) => { const age = ((t * 0.6 + s[0]) % 1); o.p.set(hx + (s[1] - 0.5) * W, 1.25 + age * 1.4, (s[2] - 0.5) * 1.6); o.size = 0.4 + age * 0.6; o.alpha = smooth(0, 0.3, age) * (1 - age); });
    ST.updateDust(t);
    return { ...st, cut };
  }
  const tc = (k, dy = 0) => new V3(TCX[k], dy, 0);
  const anchors = {
    feed: new V3((INJ.throat[0] + INJ.throat[1]) / 2, 1.6, 0), nozzle: new V3(6.5, 0.4, 0),
    z1: new V3(ZX[0], 1.25, 0), z2: new V3(ZX[1], 1.25, 0), z3: new V3(ZX[2], 1.25, 0), z4: new V3(ZX[3], 1.25, 0),
    band3: new V3(ZX[2] - 0.6, 1.2, -0.05), coil3: new V3(ZX[2] - 0.35, 1.1, -0.02), clamp3: new V3(ZX[2], -1.55, 0.1),
    tc3cap: tc(2, 2.0), tc3wires: new V3(TCX[2] + 0.02, 1.35, 0), tc3bead: tc(2, 0.645),
    gap3: new V3(ZX[2] - 0.5, 1.03, -0.02), terminal3: new V3(ZX[2] + 0.16, 0.8, -1.38), lead3: new V3(ZX[2] + 0.2, 1.3, -1.6),
    get tc4bead() { return new V3(TCX[3], 0.645 + U.tcs[3].g.position.y, 0); }, tc4well: tc(3, 0.66),
    band2: new V3(ZX[1], 1.25, 0.1), band4: new V3(ZX[3] - 0.5, 1.25, 0.0), screw: new V3(-3.0, 0.48, 0), channel: new V3(-1.8, 0.42, -0.1),
    controller: new V3(0.7, 5.2, -2.3), screen: new V3(0.7, 4.3, -2.2),
    probes: new V3(ZX[0], 1.3, -1.7), clampMeter: new V3(ZX[0] + 0.4, 1.55, -2.0),
    isoHandle: new V3(I0.x + 0.4, I0.y + 0.8, 0.2), padlock: new V3(I0.x, I0.y + 0.15, 0.2),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST, U };
}
