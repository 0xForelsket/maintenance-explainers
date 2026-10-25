// Director camera for the 16:9 shell: SHOTS → position, target, fov, roll and sideways view shift at time t.
// Shared by video16.html (three.js frames and the overlay) and build/blender-export.mjs (camera.json for Blender),
// so every renderer frames each shot identically.
export function makeCamera(THREE, DIR) {
  const V3 = THREE.Vector3;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const EZ = { lin: (x) => x, ease, out: easeOut };
  const SH = DIR.SHOTS;
  SH.forEach((s) => {
    if (!s.keys) return;
    s.posC = new THREE.CatmullRomCurve3(s.keys.map((k) => new V3(...k[1])));
    s.tgtC = new THREE.CatmullRomCurve3(s.keys.map((k) => new V3(...k[2])));
  });
  function keyU(s, p) {
    const ks = s.keys, n = ks.length;
    if (n === 2) return p;
    for (let i = 0; i < n - 1; i++) if (p <= ks[i + 1][0]) return (i + (p - ks[i][0]) / (ks[i + 1][0] - ks[i][0])) / (n - 1);
    return 1;
  }
  const noise1 = (t, k) => Math.sin(t * 1.7 + k) * 0.5 + Math.sin(t * 3.1 + k * 2.3) * 0.3 + Math.sin(t * 7.3 + k * 4.1) * 0.2;
  // S: the built scene, for shots whose camera follows moving parts (s.cam); null when there is none
  function place(t, S = null) {
    const s = SH.find((x) => t >= x.t0 && t < x.t1) || SH[SH.length - 1];
    const p = clamp01((t - s.t0) / (s.t1 - s.t0));
    const pe = (typeof s.ez === 'function' ? s.ez : EZ[s.ez || 'ease'])(p);
    let pos, tgt, fov, roll = s.roll || 0;
    if (s.cam) { const r = s.cam(t, p, S); pos = Array.isArray(r.pos) ? new V3(...r.pos) : r.pos; tgt = Array.isArray(r.tgt) ? new V3(...r.tgt) : r.tgt; fov = r.fov; roll = r.roll || 0; }
    else {
      const u = keyU(s, pe);
      pos = s.posC.getPoint(u); tgt = s.tgtC.getPoint(u);
      const ks = s.keys; fov = ks[0][3] + (ks[ks.length - 1][3] - ks[0][3]) * pe;
    }
    const hd = s.hand ?? 0.006;
    pos.add(new V3(noise1(t, 1), noise1(t, 2), noise1(t, 3)).multiplyScalar(hd * pos.distanceTo(tgt) * 0.4));
    let sh = 0;
    for (const k of (DIR.SHAKES || [])) if (t >= k.t && t < k.t + k.d * 4) sh += k.a * Math.exp(-(t - k.t) / k.d);
    if (sh > 0) {
      const f = 38, d = pos.distanceTo(tgt);
      pos.add(new V3(Math.sin(t * f * 1.3), Math.sin(t * f * 1.7 + 1), 0).multiplyScalar(sh * d * 0.05));
      tgt.add(new V3(Math.sin(t * f * 1.1 + 2), Math.sin(t * f * 0.9 + 3), 0).multiplyScalar(sh * d * 0.04));
    }
    // shift the framing sideways (subject off-centre) so side panels don't cover it
    const shift = (typeof s.shift === 'function' ? s.shift(t, p) : s.shift) || 0;
    return { shot: s, p, pos, tgt, fov, roll, shift };
  }
  // apply a placement to a three.js PerspectiveCamera (W×H frame)
  function apply(cam, c, W, H) {
    cam.position.copy(c.pos); cam.fov = c.fov; cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    cam.lookAt(c.tgt);
    if (c.shift) cam.setViewOffset(W, H, -c.shift * W, 0, W, H); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();   // projecting labels without a render (overlay mode) needs the fresh view matrix
  }
  return { place, apply, shots: SH };
}
