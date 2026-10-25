// Headless frame renderer for web/video.html
// usage: node build/render.mjs --times 1,2.5,6 --out test/v      (stills)
//        node build/render.mjs --fps 24 --from 0 --to 50 --out frames [--part 0 --parts 2]
import { chromium } from 'playwright';
import fs from 'fs';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const out = args.out || 'frames';
const scale = +(args.scale || 1);
fs.mkdirSync(out, { recursive: true });
let jobs = [];
if (args.times) jobs = args.times.split(',').map((t) => ({ t: +t, name: `t_${(+t).toFixed(2)}` }));
else {
  const fps = +args.fps, from = +(args.from || 0), to = +args.to;
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  for (let n = n0; n < n1; n++) jobs.push({ t: n / fps, name: `f_${String(n).padStart(5, '0')}` });
  const parts = +(args.parts || 1), part = +(args.part || 0);
  jobs = jobs.filter((_, i) => i % parts === part);
  if (args.skipExisting) jobs = jobs.filter((j) => !fs.existsSync(`${out}/${j.name}.jpg`));
}
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) } });
p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://localhost:8765/web/video.html?scale=${scale}&rscale=${args.rscale || 1}`);
await p.waitForFunction(() => window.ready, null, { timeout: 300000 });
const cdp = await p.context().newCDPSession(p);
const t0 = Date.now();
let i = 0;
for (const j of jobs) {
  await p.evaluate((t) => window.renderFrame(t), j.t);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
  fs.writeFileSync(`${out}/${j.name}.jpg`, Buffer.from(shot.data, 'base64'));
  i++;
  if (i % 24 === 0 || args.times) console.log(`${j.name} ${(Date.now() - t0) / i | 0}ms/frame (${i}/${jobs.length})`);
}
await b.close();
console.log('done', jobs.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
