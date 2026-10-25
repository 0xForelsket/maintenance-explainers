// Render the 16:9 shell in overlay mode (captions, labels, HUD, panels, cards — no 3D) to transparent PNGs, for
// compositing over frames rendered in Blender. Serves the repo itself; drives Microsoft Edge (or Chrome).
// usage (from series/): node build/overlay.mjs --topic mould-pm --out frames/mould-pm-ov (--times 2.5,40 | --fps 24 [--from 0] [--to T])
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const out = path.resolve(args.out);
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.resolve(ROOT, '.' + path.posix.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, '127.0.0.1');
await new Promise((r) => server.on('listening', r));
const port = server.address().port;

let browser;
for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
  try { browser = await chromium.launch({ ...opt, timeout: 60000 }); break; } catch (e) { console.log('launch', opt.channel || 'playwright chromium', 'failed:', String(e.message).split('\n')[0]); }
}
if (!browser) throw new Error('needs Microsoft Edge, Google Chrome or Playwright Chromium');
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${port}/series/shell/video16.html?topic=${args.topic}&overlay=1`);
await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
const total = await page.evaluate(() => window.TOTAL);

let jobs = [];
if (args.times) jobs = args.times.split(',').map((t) => ({ t: +t, name: `t_${(+t).toFixed(2)}` }));
else {
  const fps = +(args.fps || 24), n0 = Math.round(+(args.from || 0) * fps), n1 = Math.ceil(+(args.to || total) * fps);
  for (let n = n0; n < n1; n++) jobs.push({ t: n / fps, name: `f_${String(n).padStart(5, '0')}` });
  jobs = jobs.filter((j) => !fs.existsSync(path.join(out, `${j.name}.png`)));     // resumable
}
const t0 = Date.now();
for (const [i, j] of jobs.entries()) {
  await page.evaluate((t) => window.renderFrame(t), j.t);
  await page.screenshot({ path: path.join(out, `${j.name}.png`), omitBackground: true, type: 'png' });
  if ((i + 1) % 240 === 0) console.log(`${j.name} ${((Date.now() - t0) / (i + 1)) | 0} ms/frame (${i + 1}/${jobs.length})`);
}
console.log('done', jobs.length, 'overlay frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
await browser.close();
server.close();
