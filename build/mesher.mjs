// Marching-cubes mesher: turns the SDFs in web/geom.js into compact indexed meshes
// and writes them to web/meshdata.js (gzip + base64) for the browser.
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';
import { sdfBody, sdfFluid, sdfParts } from '../web/geom.js';
import zlib from 'zlib';
import fs from 'fs';
import { MeshoptSimplifier as MS } from 'meshoptimizer';
await MS.ready;

function mesh(sdf, bmin, bmax, h) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1;
  const ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1;
  const nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const N = nx * ny * nz;
  const f = new Float32Array(N);
  const t0 = Date.now();
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    f[i + nx * (j + ny * k)] = sdf([bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h]);
  }
  console.log(`  field ${nx}x${ny}x${nz} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const edgeVert = new Int32Array(N * 3).fill(-1);
  const pos = [], idx = [];
  const idxOf = (i, j, k) => i + nx * (j + ny * k);
  // corner offsets (Bourke)
  const C = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  // edge -> [corner, axis]
  const E = [[0,0],[1,1],[3,0],[0,1],[4,0],[5,1],[7,0],[4,1],[0,2],[1,2],[2,2],[3,2]];
  const ev = new Int32Array(12);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0;
    const v = new Array(8);
    for (let c = 0; c < 8; c++) {
      v[c] = f[idxOf(i + C[c][0], j + C[c][1], k + C[c][2])];
      if (v[c] < 0) ci |= 1 << c;
    }
    const em = edgeTable[ci];
    if (!em) continue;
    for (let e = 0; e < 12; e++) {
      if (!(em & (1 << e))) continue;
      const [c0, ax] = E[e];
      const ii = i + C[c0][0], jj = j + C[c0][1], kk = k + C[c0][2];
      const key = idxOf(ii, jj, kk) * 3 + ax;
      let vi = edgeVert[key];
      if (vi < 0) {
        const a = f[idxOf(ii, jj, kk)];
        const b = f[idxOf(ii + (ax === 0), jj + (ax === 1), kk + (ax === 2))];
        const t = a / (a - b);
        const p = [bmin[0] + ii * h, bmin[1] + jj * h, bmin[2] + kk * h];
        p[ax] += t * h;
        vi = pos.length / 3;
        pos.push(p[0], p[1], p[2]);
        edgeVert[key] = vi;
      }
      ev[e] = vi;
    }
    const base = ci << 4;
    for (let q = 0; triTable[base + q] !== -1; q += 3) {
      idx.push(ev[triTable[base + q]], ev[triTable[base + q + 1]], ev[triTable[base + q + 2]]);
    }
  }
  // normals from SDF gradient
  const nv = pos.length / 3;
  const nrm = new Float32Array(nv * 3);
  const eps = h * 0.35;
  for (let n = 0; n < nv; n++) {
    const x = pos[3 * n], y = pos[3 * n + 1], z = pos[3 * n + 2];
    let gx = sdf([x + eps, y, z]) - sdf([x - eps, y, z]);
    let gy = sdf([x, y + eps, z]) - sdf([x, y - eps, z]);
    let gz = sdf([x, y, z + eps]) - sdf([x, y, z - eps]);
    const l = Math.hypot(gx, gy, gz) || 1;
    nrm[3 * n] = gx / l; nrm[3 * n + 1] = gy / l; nrm[3 * n + 2] = gz / l;
  }
  // orient triangles to agree with gradient (outward)
  let flipped = 0;
  for (let q = 0; q < idx.length; q += 3) {
    const a = idx[q], b = idx[q + 1], c = idx[q + 2];
    const ux = pos[3*b]-pos[3*a], uy = pos[3*b+1]-pos[3*a+1], uz = pos[3*b+2]-pos[3*a+2];
    const vx = pos[3*c]-pos[3*a], vy = pos[3*c+1]-pos[3*a+1], vz = pos[3*c+2]-pos[3*a+2];
    const fx = uy*vz-uz*vy, fy = uz*vx-ux*vz, fz = ux*vy-uy*vx;
    const gx = nrm[3*a]+nrm[3*b]+nrm[3*c], gy = nrm[3*a+1]+nrm[3*b+1]+nrm[3*c+1], gz = nrm[3*a+2]+nrm[3*b+2]+nrm[3*c+2];
    if (fx*gx + fy*gy + fz*gz < 0) { idx[q + 1] = c; idx[q + 2] = b; flipped++; }
  }
  console.log(`  ${nv} verts, ${idx.length / 3} tris (flipped ${flipped}) total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { pos: new Float32Array(pos), nrm, idx: new Uint32Array(idx), bmin, bmax };
}

function simplify(m, targetTris, err) {
  const [ni, e] = MS.simplify(m.idx, m.pos, 3, targetTris * 3, err, ['ErrorAbsolute']);
  const idx = new Uint32Array(ni);
  const [remap, unique] = MS.compactMesh(idx);
  const pos = new Float32Array(unique * 3), nrm = new Float32Array(unique * 3);
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v];
    if (r === 0xffffffff) continue;
    for (let a = 0; a < 3; a++) { pos[r * 3 + a] = m.pos[v * 3 + a]; nrm[r * 3 + a] = m.nrm[v * 3 + a]; }
  }
  console.log(`  simplified -> ${unique} verts, ${idx.length / 3} tris, err ${e.toFixed(4)}`);
  return { pos, nrm, idx, bmin: m.bmin, bmax: m.bmax };
}

function pack(m, innerFn) {
  const nv = m.pos.length / 3;
  const q = new Uint16Array(nv * 3);
  for (let n = 0; n < nv; n++) for (let a = 0; a < 3; a++) {
    q[3 * n + a] = Math.round(((m.pos[3 * n + a] - m.bmin[a]) / (m.bmax[a] - m.bmin[a])) * 65535);
  }
  const nn = new Int8Array(nv * 3);
  for (let n = 0; n < nv * 3; n++) nn[n] = Math.round(m.nrm[n] * 127);
  const header = new Float32Array([nv, m.idx.length, ...m.bmin, ...m.bmax]);
  const buf = Buffer.concat([
    Buffer.from(header.buffer), Buffer.from(q.buffer), Buffer.from(nn.buffer),
    Buffer.alloc((4 - ((q.byteLength + nn.byteLength) % 4)) % 4),
    Buffer.from(m.idx.buffer),
    Buffer.from(innerFlags(m, innerFn)),
  ]);
  return zlib.gzipSync(buf, { level: 9 }).toString('base64');
}

function innerFlags(m, fn) {
  const nv = m.pos.length / 3, out = new Uint8Array(nv);
  if (!fn) return out;
  for (let n = 0; n < nv; n++) out[n] = fn([m.pos[3*n], m.pos[3*n+1], m.pos[3*n+2]]) ? 255 : 0;
  return out;
}
const H = parseFloat(process.argv[2] || '0.035');
console.log('body');
const body = simplify(mesh(sdfBody, [-3.32, -4.78, -2.08], [4.78, 1.62, 2.08], H), 45000, 0.004);
console.log('fluid');
const fluid = simplify(mesh(sdfFluid, [-3.7, -4.6, -1.9], [4.6, 1.45, 1.9], H * 1.15), 12000, 0.006);
const out = `// generated by build/mesher.mjs — compressed cast body + fluid meshes\nexport const MESH = ${JSON.stringify({ body: pack(body, (p) => Math.abs(sdfParts(p).outer) > 0.025), fluid: pack(fluid, null) })};\n`;
fs.writeFileSync(new URL('../web/meshdata.js', import.meta.url), out);
console.log('meshdata.js', (out.length / 1e6).toFixed(2), 'MB');
