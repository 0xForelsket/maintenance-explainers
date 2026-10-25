// Air-cooled water chiller in section: scroll compressor, finned condenser coil with fans on top, brazed-plate
// evaporator, expansion valve with its bulb, sight glass, gauges, chilled-water loop with strainer, flow switch and pump.
// Macro rigs: plate exchanger channels, condenser fins, scroll set (top view).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStage, castSurface, tubeSolid, pipeSolid, rbox, mulberry, smooth, mix, buildLUT, Streaks, Puffs, SHARED, V3, csg, cylBetween, makeGauge, makeClock } from 'series/look';
import { stateAt } from './story.js';

export const RIG = { plates: new V3(40, 0, 0), fins: new V3(60, 0, 0), scroll: new V3(80, 0, 0) };
const placed = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const COMP = { x: -1.9, y0: -2.2, y1: -0.75, r: 0.5 };
const COIL = { x0: -0.5, x1: 3.9, y0: 0.95, y1: 1.45, z: 1.0 };
const EVAP = { x0: -0.35, x1: 0.15, y0: -1.95, y1: -0.6, z: 0.4 };
const TXV = { x: 0.8, y: -1.1 };
const SG = { x: 2.2, y: -0.9 };
const WZ = -0.75;   // water pipes run behind the refrigerant circuit

export async function build(renderer, { quality = 'high', fontFamily = 'sans-serif' } = {}) {
  const ST = createStage(renderer, { quality, fog: 0.02, floorY: -2.6, fontFamily });
  const { scene, M, addSolid, clip } = ST;
  const shadows = ST.shadows;
  ST.lights.key.position.set(3, 12, 10); ST.lights.key.target.position.set(0, 0, 0); ST.lights.key.intensity = 520; ST.lights.key.angle = 0.75;
  const cutOf = (hex) => { const m = M.cut.clone(); m.clippingPlanes = clip; m.color.set(hex); m.onBeforeCompile = M.cut.onBeforeCompile; return m; };
  const mesh = (g, m, parent = scene) => { const o = new THREE.Mesh(g, m); o.castShadow = shadows; o.receiveShadow = shadows; parent.add(o); return o; };
  const copper = new THREE.MeshStandardMaterial({ color: 0xb8734a, roughness: 0.35, metalness: 0.9, clippingPlanes: clip });
  const copperCut = cutOf(0xc88a5a);
  const pipe = (pts, r = 0.07, mat = copper, cap = copperCut, bend = 0.12) => addSolid(pipeSolid(pts, r * 0.7, r, bend, 20), mat, cap);
  const insul = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.9, clippingPlanes: clip }), insulCut = cutOf(0x2c3034);
  const ipipe = (pts, r = 0.11) => addSolid(pipeSolid(pts, r * 0.55, r, 0.14, 20), insul, insulCut);

  // ------------------------------------------------ cabinet frame, skid, back panel, top deck with fan openings
  const frameM = new THREE.MeshStandardMaterial({ color: 0xd9dde1, roughness: 0.45, metalness: 0.3 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.6, metalness: 0.3 });
  mesh(rbox(8.8, 0.4, 2.8, 0.04).translate(0, -2.4, 0), darkM);
  for (const x of [-4.25, 4.25]) for (const z of [-1.3, 1.3]) mesh(rbox(0.14, 4.2, 0.14, 0.02).translate(x, -0.1, z), frameM);
  mesh(new THREE.PlaneGeometry(8.4, 4.2).translate(0, -0.1, -1.32), new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.7, metalness: 0.2 }));
  const deck = csg(rbox(8.8, 0.12, 2.8, 0.03).translate(0, 2.02, 0), [[0.6, 0], [2.8, 0]].map(([x]) => ['sub', cylBetween([x, 1.9, 0], [x, 2.2, 0], 0.86, 48)]));
  mesh(deck, frameM);
  const sidePanel = mesh(rbox(0.06, 4.2, 2.6, 0.02).translate(-4.25, -0.1, 0), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.5, metalness: 0.3, clippingPlanes: clip }));
  // front skin (only in exterior shots): louvred panel that the section cut removes
  const skin = new THREE.Group(); scene.add(skin);
  const skinM = castSurface(new THREE.MeshStandardMaterial({ color: 0xd2d6da, roughness: 0.5, metalness: 0.25, clippingPlanes: clip, clipShadows: true }), { freq: 0.8, bump: 0.03, mottle: 0.08, key: 'chskin' });
  mesh(rbox(8.4, 2.6, 0.05, 0.02).translate(0, -0.9, 1.3), skinM, skin);
  const louv = []; for (let k = 0; k < 9; k++) louv.push(new THREE.BoxGeometry(4.4, 0.05, 0.06).rotateX(0.5).translate(1.7, 0.95 + k * 0.055, 1.32));
  mesh(mergeGeometries(louv.map((g) => g.toNonIndexed())), new THREE.MeshStandardMaterial({ color: 0x8f969c, roughness: 0.5, metalness: 0.4, clippingPlanes: clip }), skin);
  mesh(rbox(1.4, 0.5, 0.03, 0.02).translate(-3.1, 0.1, 1.33), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4, clippingPlanes: clip }), skin);

  // ------------------------------------------------ scroll compressor (section shows motor + scroll set)
  const compM = castSurface(new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.4, metalness: 0.5, clippingPlanes: clip, clipShadows: true, emissive: 0x000000 }), { freq: 1.0, bump: 0.05, mottle: 0.12, key: 'chcomp' });
  const compCut = cutOf(0x5a636c);
  addSolid(tubeSolid(COMP.r - 0.04, COMP.r, COMP.y1 - COMP.y0, 64).translate(COMP.x, COMP.y0, 0), compM, compCut);
  addSolid(csg(new THREE.SphereGeometry(COMP.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1).translate(COMP.x, COMP.y1, 0), [['sub', new THREE.SphereGeometry(COMP.r - 0.04, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.72, 1).translate(COMP.x, COMP.y1, 0)]]), compM, compCut);
  addSolid(new THREE.CylinderGeometry(COMP.r, COMP.r, 0.04, 64).translate(COMP.x, COMP.y0 + 0.02, 0), compM, compCut);
  const stator = csg(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 48).translate(COMP.x, -1.75, 0), [['sub', new THREE.CylinderGeometry(0.22, 0.22, 0.7, 32).translate(COMP.x, -1.75, 0)]]);
  addSolid(stator, new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.5, metalness: 0.6, clippingPlanes: clip }), cutOf(0x6f7a84));
  const windMat = new THREE.MeshStandardMaterial({ color: 0xb8733a, roughness: 0.4, metalness: 0.8, clippingPlanes: clip });
  for (const y of [-2.12, -1.38]) addSolid(tubeSolid(0.22, 0.4, 0.1, 48).translate(COMP.x, y, 0), windMat, cutOf(0xc8844a));
  const rotorG = new THREE.Group(); rotorG.position.set(COMP.x, 0, 0); scene.add(rotorG);
  addSolid(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 32).translate(0, -1.75, 0), new THREE.MeshStandardMaterial({ color: 0x7a838c, roughness: 0.4, metalness: 0.8, clippingPlanes: clip }), cutOf(0x8d969e), rotorG);
  addSolid(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16).translate(0, -1.55, 0), M.steel, M.cutSteel, rotorG);
  // scroll set: fixed + orbiting involutes (section shows the interleaved walls)
  const involute = (rot, n = 120) => { const pts = []; for (let i = 0; i <= n; i++) { const a = 0.6 + (i / n) * 3.4 * Math.PI; const r = 0.03 * a; pts.push(new V3(Math.cos(a + rot) * r, 0, Math.sin(a + rot) * r)); } return pts; };
  const wallGeo = (pts, h, w) => { const g = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a); const box = new THREE.BoxGeometry(d.length() + 0.004, h, w); box.rotateY(-Math.atan2(d.z, d.x)); const m = a.clone().add(b).multiplyScalar(0.5); box.translate(m.x, h / 2, m.z); g.push(box.toNonIndexed()); } return mergeGeometries(g); };
  const scrollM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 0.85, clippingPlanes: clip }), scrollCut = cutOf(0xb0b8c0);
  addSolid(mergeGeometries([wallGeo(involute(0), 0.16, 0.03), new THREE.CylinderGeometry(0.44, 0.44, 0.05, 48).translate(0, 0.185, 0).toNonIndexed()]).translate(COMP.x, -1.0, 0), scrollM, scrollCut);
  const orbG = new THREE.Group(); orbG.position.set(COMP.x, -1.0, 0); scene.add(orbG);
  addSolid(mergeGeometries([wallGeo(involute(Math.PI), 0.16, 0.03), new THREE.CylinderGeometry(0.44, 0.44, 0.05, 48).translate(0, -0.025, 0).toNonIndexed()]), new THREE.MeshStandardMaterial({ color: 0xc0c7ce, roughness: 0.3, metalness: 0.85, clippingPlanes: clip }), cutOf(0xd0d6dc), orbG);
  const tbox = mesh(rbox(0.3, 0.25, 0.2, 0.03).translate(COMP.x - 0.45, -1.2, 0.35), darkM);
  const oilGlass = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24).rotateX(Math.PI / 2).translate(COMP.x + 0.12, -2.0, COMP.r + 0.01), new THREE.MeshStandardMaterial({ color: 0xe0b040, roughness: 0.1, metalness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.5 }));

  // ------------------------------------------------ condenser coil (tubes along x, fins in yz planes) + dust + fans
  const coilG = new THREE.Group(); scene.add(coilG);
  const finM = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.35, metalness: 0.85, clippingPlanes: clip, side: THREE.DoubleSide });
  const fins = []; for (let x = COIL.x0 + 0.05; x < COIL.x1; x += 0.085) fins.push(new THREE.BoxGeometry(0.008, COIL.y1 - COIL.y0, 2 * COIL.z).translate(x, (COIL.y0 + COIL.y1) / 2, 0).toNonIndexed());
  mesh(mergeGeometries(fins), finM, coilG);
  const tubeRows = [];
  for (const [k, y] of [COIL.y0 + 0.1, (COIL.y0 + COIL.y1) / 2, COIL.y1 - 0.1].entries()) for (let j = 0; j < 5; j++) { const z = -0.8 + j * 0.4 + (k % 2) * 0.2 - 0.1; if (Math.abs(z) > 0.92) continue; tubeRows.push([y, z]); addSolid(cylBetween([COIL.x0, y, z], [COIL.x1, y, z], 0.035, 16), copper, copperCut, coilG); }
  for (const x of [COIL.x0 - 0.05, COIL.x1 + 0.05]) addSolid(cylBetween([x, COIL.y0 - 0.02, 0], [x, COIL.y1 + 0.02, 0], 0.09, 24), copper, copperCut, coilG);
  const dustM = castSurface(new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1.0, clippingPlanes: clip }), { freq: 9, bump: 1.4, mottle: 0.5, key: 'chdust' });
  const dust = mesh(new THREE.BoxGeometry(COIL.x1 - COIL.x0, 1, 2 * COIL.z).translate((COIL.x0 + COIL.x1) / 2, -0.5, 0), dustM, coilG);
  const fans = [0.6, 2.8].map((x) => {
    const g = new THREE.Group(); g.position.set(x, 1.82, 0); scene.add(g);
    mesh(tubeSolid(0.84, 0.88, 0.3, 64).translate(0, -0.15, 0), darkM, g);
    const blades = new THREE.Group(); g.add(blades);
    for (let k = 0; k < 5; k++) { const b = mesh(new THREE.BoxGeometry(0.72, 0.02, 0.22).translate(0.42, 0, 0).rotateX(0.35), new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.5 }), blades); b.rotation.y = (k / 5) * Math.PI * 2; }
    mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.3, 24).translate(0, -0.25, 0), darkM, g);
    const guard = []; guard.push(new THREE.TorusGeometry(0.86, 0.015, 6, 64).rotateX(Math.PI / 2).translate(0, 0.32, 0)); for (const r of [0.3, 0.6]) guard.push(new THREE.TorusGeometry(r, 0.012, 6, 48).rotateX(Math.PI / 2).translate(0, 0.32, 0));
    for (let k = 0; k < 8; k++) guard.push(new THREE.BoxGeometry(1.72, 0.015, 0.015).rotateY((k / 8) * Math.PI).translate(0, 0.32, 0));
    mesh(mergeGeometries(guard.map((q) => q.toNonIndexed())), M.zincNoClip, g);
    return { g, blades };
  });

  // ------------------------------------------------ evaporator (brazed plate) — plates show as stripes in section
  const evapM = castSurface(new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: 0.28, metalness: 0.9, clippingPlanes: clip, clipShadows: true }), { freq: 1.2, bump: 0.02, mottle: 0.08, key: 'chev' });
  addSolid(csg(rbox(EVAP.x1 - EVAP.x0, EVAP.y1 - EVAP.y0, 2 * EVAP.z, 0.03).translate((EVAP.x0 + EVAP.x1) / 2, (EVAP.y0 + EVAP.y1) / 2, 0), [['sub', new THREE.BoxGeometry(EVAP.x1 - EVAP.x0 - 0.06, EVAP.y1 - EVAP.y0 - 0.12, 2 * EVAP.z - 0.06).translate((EVAP.x0 + EVAP.x1) / 2, (EVAP.y0 + EVAP.y1) / 2, 0)]]), evapM, cutOf(0xc0c7ce));
  const chanU = { uFoul: { value: 0 }, uIce: { value: 0 } };
  const chanMat = (water) => { const m = new THREE.MeshBasicMaterial({ color: water ? 0x2f7fd0 : 0x7fd8ff, clippingPlanes: clip }); if (water) m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, chanU); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFoul, uIce;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.28, 0.12), uFoul * 0.7); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), uIce);'); }; return m; };
  const nCh = 6, cw = (EVAP.x1 - EVAP.x0 - 0.06) / nCh;
  for (let k = 0; k < nCh; k++) {
    const x = EVAP.x0 + 0.03 + cw * (k + 0.5);
    scene.add(placed(new THREE.Mesh(new THREE.BoxGeometry(cw * 0.62, EVAP.y1 - EVAP.y0 - 0.14, 2 * EVAP.z - 0.08), chanMat(k % 2 === 0)), x, (EVAP.y0 + EVAP.y1) / 2, 0));
  }
  const evapIce = new Puffs(scene, { count: 40, color: 0xf0f8ff, opacity: 0, size: 0.35 });
  const crackM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-0.2, -0.75, EVAP.z + 0.01), new V3(-0.12, -1.0, EVAP.z + 0.01), new V3(-0.22, -1.2, EVAP.z + 0.01), new V3(-0.1, -1.45, EVAP.z + 0.01)]), 30, 0.012, 4), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0 }));
  scene.add(crackM);

  // ------------------------------------------------ refrigerant circuit
  pipe([[COMP.x, COMP.y1 + 0.3, 0], [COMP.x, 0.55, 0], [-0.62, 0.55, 0], [-0.62, COIL.y0 + 0.2, 0], [COIL.x0 - 0.05, COIL.y0 + 0.2, 0]], 0.07);           // discharge
  pipe([[COIL.x1 + 0.05, COIL.y0, 0], [COIL.x1 + 0.05, -0.15, 0], [3.5, -0.15, 0], [3.5, -0.4, 0]], 0.055);                                               // liquid from coil
  addSolid(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 32).translate(3.5, -0.9, 0), new THREE.MeshStandardMaterial({ color: 0x6f7a84, roughness: 0.4, metalness: 0.7, clippingPlanes: clip }), cutOf(0x8a949e));   // receiver
  pipe([[3.5, -1.4, 0], [3.5, -1.55, 0], [3.25, -1.55, 0], [3.25, -0.9, 0], [3.1, -0.9, 0]], 0.05);
  addSolid(cylBetween([2.62, -0.9, 0], [3.1, -0.9, 0], 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x3a6fa0, roughness: 0.4, metalness: 0.4, clippingPlanes: clip }), cutOf(0x4a7fb0));    // filter drier
  pipe([[2.62, -0.9, 0], [TXV.x, -0.9, 0], [TXV.x, TXV.y + 0.12, 0]], 0.05);
  // sight glass
  const sgM = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.3, metalness: 0.6 });
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 24).rotateX(Math.PI / 2).translate(SG.x, SG.y, 0.06), sgM);
  const sgGlass = mesh(new THREE.CircleGeometry(0.075, 32).translate(SG.x, SG.y, 0.135), new THREE.MeshStandardMaterial({ color: 0xbfe8a0, emissive: 0x335522, emissiveIntensity: 0.8, roughness: 0.05, metalness: 0.1 }));
  const sgBub = []; for (let k = 0; k < 8; k++) { const b = mesh(new THREE.SphereGeometry(0.012 + 0.008 * (k % 3), 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.9 })); b.userData.o = k / 8; sgBub.push(b); }
  // expansion valve with power head + capillary to the sensing bulb on the suction line
  const brass = M.brass.clone(); brass.clippingPlanes = clip;
  addSolid(rbox(0.22, 0.24, 0.22, 0.03).translate(TXV.x, TXV.y, 0), brass, cutOf(0xc8a060));
  addSolid(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 32).translate(TXV.x, TXV.y + 0.2, 0), brass, cutOf(0xc8a060));
  pipe([[TXV.x, TXV.y - 0.12, 0], [TXV.x, EVAP.y0 + 0.2, 0], [EVAP.x1 + 0.02, EVAP.y0 + 0.2, 0]], 0.05);
  const bulbX = -0.5;
  ipipe([[EVAP.x1 + 0.02, EVAP.y1 - 0.15, 0], [0.45, EVAP.y1 - 0.15, 0], [0.45, -0.25, 0], [-1.15, -0.25, 0], [-1.15, -1.5, 0], [COMP.x + COMP.r - 0.02, -1.5, 0]], 0.1);      // suction (insulated)
  addSolid(cylBetween([bulbX - 0.15, -0.12, 0], [bulbX + 0.15, -0.12, 0], 0.035, 16), brass, cutOf(0xc8a060));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(bulbX + 0.15, -0.12, 0), new V3(0.2, 0.0, 0.1), new V3(0.6, -0.2, 0.15), new V3(TXV.x, TXV.y + 0.25, 0.05)]), 40, 0.01, 6), brass));
  const frostM = castSurface(new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.9, transparent: true, opacity: 0, clippingPlanes: clip }), { freq: 14, bump: 1.2, mottle: 0.4, key: 'chfrost' });
  const frost = mesh(cylBetween([-1.15, -0.25, 0], [0.45, -0.25, 0], 0.13, 24), frostM);
  const stainM = new THREE.MeshBasicMaterial({ color: 0x2a1a08, transparent: true, opacity: 0, depthWrite: false });
  const stain = mesh(new THREE.CircleGeometry(0.14, 24).translate(3.25, -1.2, 0.06), stainM);
  // high-pressure switch on the discharge line, service ports, gauges
  mesh(rbox(0.2, 0.26, 0.16, 0.03).translate(-1.35, 0.72, 0), darkM);
  const hpLed = mesh(new THREE.SphereGeometry(0.035, 12, 8).translate(-1.35, 0.78, 0.09), new THREE.MeshBasicMaterial({ color: 0x3a0a08, toneMapped: false }));
  const gLow = makeGauge({ name: 'LOW', unit: '°C sat', max: 20, redFrom: 0.95, R: 0.38, fontFamily, shadows, M }), gHigh = makeGauge({ name: 'HIGH', unit: '°C sat', max: 70, redFrom: 0.86, R: 0.38, fontFamily, shadows, M });
  gLow.group.position.set(-3.35, 0.75, 0.3); gHigh.group.position.set(-2.45, 0.75, 0.3); scene.add(gLow.group, gHigh.group);
  for (const [a, b] of [[[-3.35, 0.37, 0.25], [-1.15, -0.55, 0]], [[-2.45, 0.37, 0.25], [COMP.x, 0.35, 0]]]) scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(...a), new V3(a[0], a[1] - 0.3, 0.2), new V3((a[0] + b[0]) / 2, b[1] - 0.2, 0.15), new V3(...b)]), 40, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0x3060c0, roughness: 0.5 })));

  // ------------------------------------------------ chilled-water loop: in (from moulds) → strainer → flow switch → evaporator → pump → out
  const steelP = new THREE.MeshStandardMaterial({ color: 0x6f7880, roughness: 0.4, metalness: 0.6, clippingPlanes: clip }), steelCut = cutOf(0x7f8890);
  const wpipe = (pts) => addSolid(pipeSolid(pts, 0.08, 0.11, 0.14, 20), steelP, steelCut);
  wpipe([[-4.7, -0.45, WZ], [-0.6, -0.45, WZ], [-0.6, EVAP.y1 - 0.15, -0.2], [EVAP.x0 - 0.02, EVAP.y1 - 0.15, -0.2]]);
  wpipe([[EVAP.x0 - 0.02, EVAP.y0 + 0.2, -0.2], [-0.6, EVAP.y0 + 0.2, -0.2], [-0.6, -1.75, WZ], [-4.7, -1.75, WZ]]);
  // Y-strainer + basket
  addSolid(csg(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 32).rotateZ(Math.PI / 2).translate(-3.6, -0.45, WZ), [['add', cylBetween([-3.68, -0.45, WZ], [-3.45, -0.8, WZ], 0.13, 24)]]), steelP, steelCut);
  const basketG = new THREE.Group(); scene.add(basketG);
  const debrisM = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.9, transparent: true, opacity: 0, clippingPlanes: clip });
  mesh(cylBetween([-3.66, -0.48, WZ], [-3.48, -0.76, WZ], 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, roughness: 0.4, metalness: 0.8, wireframe: true }), basketG);
  mesh(cylBetween([-3.66, -0.48, WZ], [-3.48, -0.76, WZ], 0.085, 16), debrisM, basketG);
  // flow switch paddle
  mesh(rbox(0.18, 0.18, 0.18, 0.03).translate(-2.9, -0.2, WZ), darkM);
  const paddle = new THREE.Group(); paddle.position.set(-2.9, -0.45, WZ); scene.add(paddle);
  mesh(new THREE.BoxGeometry(0.02, 0.16, 0.12).translate(0, -0.02, 0), M.zincNoClip, paddle);
  // pump
  addSolid(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 32).rotateX(Math.PI / 2).translate(-3.0, -1.75, WZ), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4, metalness: 0.4, clippingPlanes: clip }), cutOf(0x3f7fc0));
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32).rotateX(Math.PI / 2).translate(-3.0, -1.75, WZ - 0.35), darkM);
  // detector (leak test) + spray wand (coil cleaning)
  const det = new THREE.Group(); scene.add(det);
  mesh(rbox(0.16, 0.42, 0.1, 0.03).translate(0, 0.18, 0), new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.5 }), det);
  mesh(cylBetween([0, 0.39, 0], [0, 0.9, 0], 0.012, 8), M.zincNoClip, det);
  const detLed = mesh(new THREE.SphereGeometry(0.025, 10, 8).translate(0, 0.32, 0.055), new THREE.MeshBasicMaterial({ color: 0x103a10, toneMapped: false }), det);
  const wand = new THREE.Group(); scene.add(wand);
  mesh(cylBetween([0, 0, 0], [0.9, -0.5, 0.6], 0.03, 10), M.zincNoClip, wand);
  const spray = new Puffs(scene, { count: 70, color: 0xdff4ff, opacity: 0, size: 0.3 });
  const leakPuff = new Puffs(scene, { count: 30, color: 0xe8eef2, opacity: 0, size: 0.28 });
  const fluff = new Puffs(scene, { count: 40, color: 0x9a8a70, opacity: 0, size: 0.25 });
  const hpLight = new THREE.PointLight(0xff3020, 0, 3, 1.6); hpLight.position.set(-1.35, 0.85, 0.5); scene.add(hpLight);
  const glint = new THREE.PointLight(0xffffff, 0, 3, 1.6); scene.add(glint);

  // ------------------------------------------------ flows
  const R = mulberry(5);
  const segLUT = (segs, jitter, samples = 260) => {   // segs: [[points, tag], ...] → LUT + u boundaries per tag
    const pts = [], marks = []; let len = 0, last = null;
    for (const [p, tag] of segs) { marks.push([len, tag]); for (const q of p) { const v = new V3(...q).add(new V3((R() - 0.5) * jitter, (R() - 0.5) * jitter, (R() - 0.5) * jitter * 0.5)); if (last) len += v.distanceTo(last); pts.push(v); last = v; } }
    const L = buildLUT(pts, () => 1, samples); L.marks = marks.map(([l, tag]) => [l / len, tag]); return L;
  };
  // refrigerant: discharge → coil → liquid line → TXV → evaporator → suction
  const REF = [];
  for (let j = 0; j < 12; j++) {
    const [ty, tz] = tubeRows[j % tubeRows.length]; const z = Math.min(-0.03, tz);
    REF.push(segLUT([
      [[[COMP.x, -0.98, -0.05], [COMP.x, COMP.y1 + 0.2, -0.03], [COMP.x, 0.5, -0.03], [-0.62, 0.55, -0.03], [-0.62, COIL.y0 + 0.2, -0.03], [COIL.x0 - 0.05, ty, z]], 'hot'],
      [[[COIL.x0 + 0.3, ty, z], [1.5, ty, z], [2.6, ty, z], [COIL.x1 - 0.1, ty, z]], 'cond'],
      [[[COIL.x1 + 0.05, COIL.y0, -0.03], [COIL.x1 + 0.05, -0.15, -0.03], [3.5, -0.2, -0.03], [3.5, -1.3, -0.03], [3.25, -1.5, -0.03], [3.25, -0.9, -0.03], [2.9, -0.9, -0.03], [SG.x, SG.y, -0.02], [1.4, -0.9, -0.03], [TXV.x, -0.95, -0.03]], 'liq'],
      [[[TXV.x, TXV.y, -0.03], [TXV.x, EVAP.y0 + 0.2, -0.03], [EVAP.x1 - 0.05, EVAP.y0 + 0.2, -0.03], [EVAP.x0 + 0.03 + cw * (1.5 + 2 * (j % 3)), EVAP.y0 + 0.3, -0.05], [EVAP.x0 + 0.03 + cw * (1.5 + 2 * (j % 3)), EVAP.y1 - 0.2, -0.05]], 'evap'],
      [[[EVAP.x1 + 0.02, EVAP.y1 - 0.15, -0.03], [0.45, EVAP.y1 - 0.15, -0.03], [0.45, -0.25, -0.03], [-1.15, -0.25, -0.03], [-1.15, -1.5, -0.03], [COMP.x + 0.3, -1.5, -0.03], [COMP.x, -1.2, -0.05]], 'suc'],
    ], 0.03));
  }
  const COLS = { hot: [1.9, 0.45, 0.25], cond: [1.9, 0.9, 0.3], liq: [1.8, 1.4, 0.4], evap: [0.35, 1.2, 1.9], suc: [0.6, 1.5, 1.8] };
  const refCol = (L) => (p, u, w, c) => { let tag = 'hot', nxt = null; for (let i = 0; i < L.marks.length; i++) if (u >= L.marks[i][0]) { tag = L.marks[i][1]; nxt = L.marks[i + 1]; } const a = COLS[tag]; let b = a; if (nxt) { const k = smooth(nxt[0] - 0.04, nxt[0], u); b = COLS[nxt[1]]; c.setRGB(mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)); } else c.setRGB(...a); };
  const addMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const refS = REF.map((L, j) => new Streaks(scene, { paths: [L], count: 34, material: addMat, seed: 20 + j, speed: 1.5, radius: 0.016, lenMin: 0.06, lenMax: 0.12, colorFn: refCol(L) }));
  // chilled water
  const WIN = [], WOUT = [];
  for (let j = 0; j < 8; j++) {
    const o = () => (R() - 0.5) * 0.08;
    WIN.push(buildLUT([new V3(-4.9, -0.45 + o(), WZ + 0.06), new V3(-3.6, -0.45 + o(), WZ + 0.06), new V3(-1.2, -0.45 + o(), WZ + 0.06), new V3(-0.6, -0.5, -0.3), new V3(-0.6, EVAP.y1 - 0.15, -0.2), new V3(EVAP.x0 + 0.03 + cw * (0.5 + 2 * (j % 3)), EVAP.y1 - 0.2, -0.05), new V3(EVAP.x0 + 0.03 + cw * (0.5 + 2 * (j % 3)), EVAP.y0 + 0.25, -0.05)], () => 1, 200));
    WOUT.push(buildLUT([new V3(EVAP.x0 - 0.02, EVAP.y0 + 0.2 + o(), -0.2), new V3(-0.6, EVAP.y0 + 0.2, -0.25), new V3(-0.6, -1.75, WZ + 0.06), new V3(-2.0, -1.75 + o(), WZ + 0.06), new V3(-3.0, -1.75 + o(), WZ + 0.12), new V3(-4.9, -1.75 + o(), WZ + 0.06)], () => 1, 160));
  }
  const wIn = new Streaks(scene, { paths: WIN, count: 120, material: addMat, seed: 41, speed: 1.3, radius: 0.016, lenMin: 0.06, lenMax: 0.12, colorFn: (p, u, w, c) => c.setRGB(mix(0.4, 0.25, smooth(0.6, 1, u)), mix(1.5, 0.8, smooth(0.6, 1, u)), mix(1.2, 1.9, smooth(0.6, 1, u))) });
  const wOut = new Streaks(scene, { paths: WOUT, count: 100, material: addMat, seed: 42, speed: 1.3, radius: 0.016, lenMin: 0.06, lenMax: 0.12, colorFn: (p, u, w, c) => c.setRGB(0.25, 0.75, 1.9) });
  // air through the condenser: cool in from below, warm out of the fans
  const AIR = []; for (let j = 0; j < 22; j++) { const x = COIL.x0 + 0.2 + R() * (COIL.x1 - COIL.x0 - 0.4), z = -0.1 - R() * 0.8; const fx = x < 1.7 ? 0.6 : 2.8; AIR.push(buildLUT([new V3(x + (R() - 0.5) * 0.4, -0.3, z), new V3(x, 0.5, z), new V3(x, COIL.y0, z), new V3(x, COIL.y1, z), new V3(mix(x, fx, 0.6), 1.7, z * 0.6), new V3(fx + (R() - 0.5) * 1.2, 2.4, z * 0.5), new V3(fx + (R() - 0.5) * 1.6, 3.4, z * 0.4)], () => 1, 120)); }
  const air = new Streaks(scene, { paths: AIR, count: 130, material: addMat, seed: 43, speed: 1.6, radius: 0.009, lenMin: 0.08, lenMax: 0.16, colorFn: (p, u, w, c) => { const k = smooth(COIL.y0, COIL.y1 + 0.3, p.y); c.setRGB(mix(0.5, 0.95, k), mix(0.62, 0.72, k), mix(0.8, 0.55, k)); } });

  // ------------------------------------------------ rig 1: plate exchanger channels (front view)
  const P0 = RIG.plates;
  const plateM = new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: 0.25, metalness: 0.9 });
  const rigPlates = []; for (let k = 0; k <= 6; k++) { const m = mesh(new THREE.BoxGeometry(0.06, 3.0, 1.6), plateM); m.position.copy(P0).add(new V3(-2.1 + k * 0.7, 0, 0)); rigPlates.push(m); }
  const scaleM = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 1, transparent: true, opacity: 0 });
  const iceM = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0 });
  const scales = [], ices = [];
  for (let k = 0; k < 6; k++) if (k % 2 === 0) {
    for (const s of [-1, 1]) { const m = mesh(new THREE.BoxGeometry(0.08, 2.9, 1.5), scaleM); m.position.copy(P0).add(new V3(-2.1 + k * 0.7 + 0.35 + s * 0.29, 0, 0)); m.userData.s = s; scales.push(m); }
    const ice = mesh(new THREE.BoxGeometry(0.62, 2.8, 1.45), iceM); ice.position.copy(P0).add(new V3(-2.1 + k * 0.7 + 0.35, 0, 0)); ices.push(ice);
  }
  const rigCrack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-0.7, 1.2, 0.82), new V3(-0.65, 0.6, 0.82), new V3(-0.75, 0.0, 0.82), new V3(-0.68, -0.7, 0.82)].map((v) => v.add(P0))), 30, 0.02, 4), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0 })); scene.add(rigCrack);
  const RW = [], RRf = [];
  for (let k = 0; k < 6; k++) for (let j = 0; j < 4; j++) { const x = -2.1 + k * 0.7 + 0.35 + (R() - 0.5) * 0.3, z = 0.05 + R() * 0.6; (k % 2 === 0 ? RW : RRf).push(buildLUT([new V3(x, k % 2 === 0 ? 1.6 : -1.6, z), new V3(x + (R() - 0.5) * 0.1, 0, z), new V3(x, k % 2 === 0 ? -1.6 : 1.6, z)].map((v) => v.add(P0)), () => 1, 60)); }
  const rigW = new Streaks(scene, { paths: RW, count: 90, material: addMat, seed: 51, speed: 1.0, radius: 0.02, lenMin: 0.08, lenMax: 0.14, colorFn: (p, u, w, c) => c.setRGB(mix(0.4, 0.2, u), mix(1.5, 0.7, u), mix(1.2, 1.9, u)) });
  const rigB = new Streaks(scene, { paths: RRf, count: 110, material: new THREE.MeshStandardMaterial({ color: 0xdff6ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }), dots: 'smooth', seed: 52, speed: 0.9, radius: 0.04 });
  // rig 2: condenser fins + tubes (dust mat on the inlet face)
  const F0 = RIG.fins;
  const rf = []; for (let k = 0; k < 14; k++) rf.push(new THREE.BoxGeometry(0.025, 2.2, 2.0).translate(-2.6 + k * 0.4, 0, 0).toNonIndexed());
  mesh(mergeGeometries(rf).translate(F0.x, F0.y, F0.z), finM);
  const rigTubeM = new THREE.MeshStandardMaterial({ color: 0xb8734a, roughness: 0.35, metalness: 0.9, emissive: 0xff4010, emissiveIntensity: 0.0 });
  for (const y of [-0.6, 0.0, 0.6]) for (const z of [-0.5, 0.4]) mesh(cylBetween([F0.x - 2.9, F0.y + y, F0.z + z + (y === 0 ? 0.25 : 0)], [F0.x + 2.9, F0.y + y, F0.z + z + (y === 0 ? 0.25 : 0)], 0.12, 24), rigTubeM);
  const rigDust = mesh(new THREE.BoxGeometry(5.6, 1, 2.0).translate(0, -0.5, 0), dustM); rigDust.position.set(F0.x, F0.y - 1.1, F0.z);
  const RA = []; for (let k = 0; k < 13; k++) for (let j = 0; j < 3; j++) { const x = -2.4 + k * 0.4 + (R() - 0.5) * 0.15, z = (R() - 0.5) * 1.4; RA.push(buildLUT([new V3(x, -2.4, z), new V3(x, -1.1, z), new V3(x + (R() - 0.5) * 0.05, 1.1, z), new V3(x + (R() - 0.5) * 0.3, 2.4, z)].map((v) => v.add(F0)), () => 1, 60)); }
  const rigAir = new Streaks(scene, { paths: RA, count: 160, material: addMat, seed: 53, speed: 1.5, radius: 0.012, lenMin: 0.12, lenMax: 0.22, colorFn: (p, u, w, c) => { const k = smooth(F0.y - 1.0, F0.y + 1.0, p.y); c.setRGB(mix(0.5, 0.95, k), mix(0.62, 0.72, k), mix(0.8, 0.55, k)); } });
  // rig 3: scroll set seen from above — gas pockets pushed inward and squeezed
  const S0 = RIG.scroll;
  const scrollTop = (rot, col) => mesh(wallGeo(involute(rot, 200).map((v) => v.multiplyScalar(5)), 0.35, 0.09), new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.85 }));
  const fixedTop = scrollTop(0, 0x9aa3ad); fixedTop.position.copy(S0);
  const orbTop = scrollTop(Math.PI, 0xc8ced5);
  const base = mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.6, metalness: 0.4 })); base.position.copy(S0).add(new V3(0, -0.05, 0));
  const POCK = []; for (let j = 0; j < 2; j++) { const pts = []; for (let i = 0; i <= 80; i++) { const a = 3.4 * Math.PI + 0.6 - (i / 80) * 3.0 * Math.PI + j * Math.PI; const r = 0.15 * (a - j * Math.PI + 0.0) * 1.0; pts.push(new V3(Math.cos(a + Math.PI / 2) * Math.max(0.15, r), 0.2, Math.sin(a + Math.PI / 2) * Math.max(0.15, r)).add(S0)); } POCK.push(buildLUT(pts, () => 1, 200)); }
  const pockets = new Streaks(scene, { paths: POCK, count: 14, material: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }), dots: 'smooth', seed: 61, speed: 1.1, radius: 0.16, colorFn: (p, u, w, c) => c.setRGB(mix(0.3, 1.9, u), mix(1.1, 0.5, u), mix(1.9, 0.3, u)) });
  const rigL = new THREE.SpotLight(0xffe7cc, 0, 24, 0.6, 0.6, 1.4); scene.add(rigL, rigL.target);
  const rigSpots = [{ c: P0, pos: P0.clone().add(new V3(2, 5, 6)) }, { c: F0, pos: F0.clone().add(new V3(-2, 5, 6)) }, { c: S0, pos: S0.clone().add(new V3(1, 7, 3)) }];

  // flow clocks: integrate each flow rate over time so particles slow down / stop smoothly (never run backwards)
  const clk = (fn) => makeClock((x) => fn(stateAt(x)), 202, 0.02);
  const airRate = (q) => q.running * (1 - 0.6 * q.foulCond) * (1 - 0.7 * q.spray);
  const refClock = clk((q) => (q.running ? 0.4 + 0.6 * q.capacity * (1 - 0.3 * q.foulCond) : 0));
  const waterClock = clk((q) => q.waterFlow);
  const airClock = clk((q) => 0.3 * q.running + 0.7 * airRate(q));
  const rigBClock = clk((q) => 0.5 + 0.5 * q.capacity);
  const rigAirClock = clk((q) => 0.3 + 0.7 * (1 - 0.7 * q.foulCond));
  // ------------------------------------------------ update
  const tmp = new THREE.Color();
  function update(t, opts = {}) {
    const st = stateAt(t);
    SHARED.uTime.value = t;
    const cut = opts.cut != null ? opts.cut : 1;
    ST.setCut(cut, 2.0, 0);
    ST.lights.sectionLight.intensity = 0;
    const cam = opts.camPos || null;
    skin.visible = cut < 0.999;
    const run = st.running, cap = st.capacity, airflow = run * (1 - 0.6 * st.foulCond) * (1 - 0.7 * st.spray);
    // rotating parts
    const ang = t * 9 * run;
    rotorG.rotation.y = ang; orbG.position.set(COMP.x + Math.cos(ang) * 0.025 * run, -1.0, Math.sin(ang) * 0.025 * run);
    fans.forEach((f, i) => (f.blades.rotation.y = t * 7 * run + i));
    compM.emissive.setHex(0xff3010); compM.emissiveIntensity = 0.7 * Math.max(0, st.compHot - 0.3) * run;
    // dust layer on the coil inlet face (+ fluff in the air)
    dust.visible = st.foulCond > 0.01; dust.scale.y = 0.06 * st.foulCond; dust.position.y = COIL.y0 + 0.002;
    fluff.mat.uniforms.uOpacity.value = 0.4 * st.foulCond * (t < 117 ? 1 : 0);
    fluff.update((i, s, o) => { const age = (t * 0.25 + s[0]) % 1; o.p.set(COIL.x0 + s[1] * (COIL.x1 - COIL.x0), 0.1 + age * (COIL.y0 - 0.1), -0.2 - s[2] * 0.7); o.size = 0.08 + s[3] * 0.1; o.alpha = smooth(0, 0.2, age) * (1 - smooth(0.85, 1, age)); });
    // evaporator: fouling, ice, crack
    chanU.uFoul.value = st.foulEvap; chanU.uIce.value = st.freeze;
    crackM.material.opacity = st.crack;
    evapIce.mat.uniforms.uOpacity.value = 0.5 * st.freeze;
    evapIce.update((i, s, o) => { o.p.set(mix(EVAP.x0, EVAP.x1, s[0]), mix(EVAP.y0, EVAP.y1, s[1]), EVAP.z + 0.05); o.size = 0.1 + s[2] * 0.15; o.alpha = 1; });
    // sight glass: clear liquid normally, bubbles when the charge is low
    sgGlass.material.color.setHex(0xbfe8a0);
    sgBub.forEach((b, k) => { const on = st.bubbles > 0.05; b.visible = on; const ph = (t * 1.6 + b.userData.o) % 1; b.position.set(SG.x - 0.06 + ph * 0.12, SG.y + Math.sin(ph * 9 + k) * 0.03, 0.14); b.scale.setScalar(on ? st.bubbles : 0.01); });
    frostM.opacity = 0.9 * st.frost; frost.visible = st.frost > 0.01;
    stainM.opacity = 0.7 * Math.min(1, st.oilStain);
    hpLed.material.color.setHex(st.trip > 0.5 ? 0xff2a1a : 0x3a0a08); hpLight.intensity = st.trip > 0.5 ? 3 * (0.6 + 0.4 * Math.sin(t * 12)) : 0;
    // gauges: saturation temperatures
    gLow.set(Math.max(0, st.evap)); gHigh.set(st.running ? st.cond : 36);
    // strainer basket: debris, pulled out to clean
    debrisM.opacity = 0.95 * st.strainer; basketG.position.set(0.25 * st.basket, -0.55 * st.basket, 0.9 * st.basket);
    paddle.rotation.z = -0.5 * st.waterFlow * (1 - st.flowTest) - 0.05;
    // leak detector moving along joints; spray wand over the coil
    det.visible = st.detector > 0.01; { const k = smooth(185.3, 189.6, t); det.position.set(mix(1.6, 3.25, k), mix(-1.5, -1.45, k) - 0.35, 0.55); detLed.material.color.setHex(k > 0.92 ? (Math.sin(t * 30) > 0 ? 0xff3020 : 0x401010) : 0x20a040); }
    wand.visible = st.spray > 0.01 && cam && cam.distanceTo(F0) > 16; wand.position.set(mix(0.0, 3.4, smooth(169.2, 172.4, t)), 0.1, 0.9);
    spray.mat.uniforms.uOpacity.value = 0.5 * st.spray;
    const nearF = cam && cam.distanceTo(F0) < 16;
    spray.update((i, s, o) => { const age = (t * 1.8 + s[0]) % 1; const src = nearF ? F0.clone().add(new V3(mix(-2.6, 2.6, smooth(169.2, 172.4, t)) + (s[1] - 0.5) * 0.6, -2.6 + age * 2.0, 1.0 - age * 1.0)) : new V3(wand.position.x + 0.9 + (s[1] - 0.5) * 0.4 * age, wand.position.y - 0.5 + age * 0.9, 1.5 - age * 1.4); o.p.copy(src); o.size = 0.1 + age * 0.3; o.alpha = smooth(0, 0.15, age) * (1 - age); });
    leakPuff.mat.uniforms.uOpacity.value = 0.25 * (st.leak > 0.05 && st.leak < 0.999 ? 1 : 0) * (t < 140 ? 1 : 0);
    leakPuff.update((i, s, o) => { const age = (t * 0.9 + s[0]) % 1; o.p.set(3.25 + (s[1] - 0.5) * 0.1 + age * 0.3, -1.2 + age * 0.4, 0.1 + age * 0.3); o.size = 0.06 + age * 0.25; o.alpha = smooth(0, 0.2, age) * (1 - age); });
    glint.intensity = st.check > 0.5 ? 5 : 0; glint.position.set(t < 180.8 ? 0.6 : t < 182.4 ? COMP.x - 0.45 : COMP.x + 0.12, t < 180.8 ? 2.3 : t < 182.4 ? -1.0 : -1.9, 0.8);
    // flows
    const rf = cap * (st.foulCond > 0 ? 1 - 0.3 * st.foulCond : 1);
    refS.forEach((s) => s.update({ tau: refClock(t), vis: run ? 0.5 + 0.5 * cap : 0, camPos: cam }));
    wIn.update({ tau: waterClock(t), vis: st.waterFlow * (st.crack > 0.5 ? 0 : 1), camPos: cam }); wOut.update({ tau: waterClock(t), vis: st.waterFlow * (st.crack > 0.5 ? 0 : 1), camPos: cam });
    air.update({ tau: airClock(t), vis: 0.25 + 0.75 * airflow, camPos: cam });
    // rigs
    const nearP = cam && cam.distanceTo(P0) < 16, nearS = cam && cam.distanceTo(S0) < 16;
    scaleM.opacity = 0.95 * st.foulEvap; scales.forEach((m) => { m.visible = st.foulEvap > 0.01; m.scale.x = 0.15 + 0.85 * st.foulEvap; });
    iceM.opacity = 0.85 * st.freeze; ices.forEach((m) => { m.visible = st.freeze > 0.01; m.scale.set(st.freeze, 1, 1); });
    rigCrack.material.opacity = st.crack;
    rigW.update({ tau: waterClock(t), vis: nearP ? st.waterFlow * (1 - st.freeze) : 0, camPos: null });
    rigB.update({ tau: rigBClock(t), vis: nearP ? 0.4 + 0.6 * cap * (1 - 0.6 * st.leak) : 0, camPos: null });
    rigDust.visible = st.foulCond > 0.01; rigDust.scale.y = 0.35 * st.foulCond;
    rigTubeM.emissiveIntensity = nearF ? 0.08 + 0.12 * st.foulCond : 0;
    rigAir.update({ tau: rigAirClock(t), vis: nearF ? 1 - 0.65 * st.foulCond : 0, camPos: null });
    orbTop.position.copy(S0).add(new V3(Math.cos(t * 3) * 0.28, 0, Math.sin(t * 3) * 0.28));
    pockets.update({ tau: t, vis: nearS ? 1 : 0, camPos: null });
    const rs = cam && rigSpots.find((r) => cam.distanceTo(r.c) < 16);
    rigL.visible = !!rs; rigL.intensity = rs ? 120 : 0;
    if (rs) { rigL.position.copy(rs.pos); rigL.target.position.copy(rs.c); rigL.target.updateMatrixWorld(); }
    ST.updateDust(t);
    return { ...st, cut };
  }
  const anchors = {
    compressor: new V3(COMP.x - 0.5, -1.4, 0.1), scroll: new V3(COMP.x + 0.3, -0.92, 0.05), motor: new V3(COMP.x + 0.4, -1.75, 0.05), coil: new V3(1.6, COIL.y0, 0.1), fans: new V3(0.6, 2.15, 0.6), fan2: new V3(2.8, 2.15, 0.6),
    evaporator: new V3(EVAP.x1, -1.3, 0.2), evapW: new V3(EVAP.x0 - 0.1, EVAP.y1 - 0.15, -0.2), evapR: new V3(EVAP.x1 + 0.05, EVAP.y0 + 0.2, 0.05), txv: new V3(TXV.x + 0.12, TXV.y, 0.12), bulb: new V3(bulbX, -0.12, 0.05),
    sightGlass: new V3(SG.x, SG.y, 0.14), drier: new V3(2.85, -0.9, 0.1), receiver: new V3(3.7, -0.9, 0.1), suction: new V3(-0.3, -0.25, 0.12), discharge: new V3(-1.2, 0.55, 0.05), hpSwitch: new V3(-1.35, 0.85, 0.1),
    gLow: new V3(-3.35, 1.15, 0.5), gHigh: new V3(-2.45, 1.15, 0.5), waterIn: new V3(-4.2, -0.45, WZ), waterOut: new V3(-4.2, -1.75, WZ), strainer: new V3(-3.55, -0.7, WZ), flowSwitch: new V3(-2.9, -0.1, WZ), pump: new V3(-3.0, -1.55, WZ),
    stain: new V3(3.25, -1.2, 0.06), oilGlass: new V3(COMP.x + 0.12, -2.0, COMP.r), tbox: new V3(COMP.x - 0.45, -1.1, 0.45), heatOut: new V3(1.7, 2.9, 0), dust: new V3(2.2, COIL.y0 - 0.02, 0.1),
    rigWater: P0.clone().add(new V3(-1.75, 0.8, 0.8)), rigRef: P0.clone().add(new V3(-1.05, -0.3, 0.8)), rigScale: P0.clone().add(new V3(-1.47, 0.4, 0.8)), rigIce: P0.clone().add(new V3(-0.35, 0.6, 0.8)), rigCrack: P0.clone().add(new V3(-0.68, 0.2, 0.85)),
    rigFins: F0.clone().add(new V3(-1.0, 0.6, 1.0)), rigTube: F0.clone().add(new V3(1.2, 0.0, 0.9)), rigDust: F0.clone().add(new V3(0.4, -1.2, 1.0)), scrollOuter: S0.clone().add(new V3(-1.8, 0.3, 0.6)), scrollCentre: S0.clone().add(new V3(0.1, 0.3, 0.1)),
  };
  return { scene, update, anchors, lights: ST.lights, stage: ST };
}
