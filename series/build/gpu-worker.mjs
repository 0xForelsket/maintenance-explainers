// GPU render worker (Windows/macOS/Linux desktop): serves this repo on localhost, drives Microsoft Edge or Chrome
// with hardware WebGL, and renders any job file dropped into series/jobs/. Start it with series/build/gpu-worker.bat.
// A job only describes a render: { "topic": "hot-runner", "shell": "video16", "fps": 24, "from": 0, "to": 210,
//   "out": "series/frames/hot-runner", "rscale": 1 }   or   { "topic": ..., "times": [1.5, 10, 42], "out": ..., "scale": 0.5 }
// Progress goes to series/jobs/<job>.log; a finished job gets <job>.done (or <job>.failed).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JOBS = path.join(ROOT, 'series', 'jobs');
const PORT = 8766;
fs.mkdirSync(JOBS, { recursive: true });
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (msg) => { const line = `${stamp()} ${msg}`; console.log(line); fs.appendFileSync(path.join(JOBS, 'worker.log'), line + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- static file server (repo root only)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.resolve(ROOT, '.' + path.posix.normalize(u));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(PORT, '127.0.0.1');

// ---------------------------------------------------------------- browser with hardware WebGL
const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
async function gpuName(b) {
  const p = await b.newPage();
  const name = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no webgl2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  await p.close();
  return name;
}
async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    for (const headful of [false, true]) {
      try {
        const b = await chromium.launch({ channel, headless: false, args: headful ? GPU_ARGS : [...GPU_ARGS, '--headless=new'] });
        const name = await gpuName(b);
        if (/swiftshader|llvmpipe|software|basic render/i.test(name) && !headful) { log(`${channel} headless gave software GL (${name}); retrying with a window`); await b.close(); continue; }
        log(`browser: ${channel}${headful ? ' (window)' : ' (headless)'} · GPU: ${name}`);
        fs.writeFileSync(path.join(JOBS, 'gpu.txt'), `${channel} ${headful ? 'window' : 'headless'} ${name}\n`);
        return b;
      } catch (e) { log(`launch ${channel} failed: ${String(e.message).split('\n')[0]}`); }
    }
  }
  throw new Error('Could not start Microsoft Edge or Google Chrome');
}

// ---------------------------------------------------------------- jobs
async function runJob(browser, id, job) {
  const jl = (m) => { const line = `${stamp()} ${m}`; console.log(`[${id}] ${m}`); fs.appendFileSync(path.join(JOBS, `${id}.log`), line + '\n'); };
  const shell = job.shell || 'video', land = shell === 'video16', scale = +(job.scale || 1);
  const out = path.resolve(ROOT, job.out || `series/frames/${job.topic}`);
  if (!out.startsWith(ROOT)) throw new Error('out must be inside the repo');
  fs.mkdirSync(out, { recursive: true });
  let frames = [];
  if (job.times) frames = job.times.map((t) => ({ t: +t, name: `t_${(+t).toFixed(2)}` }));
  else {
    const fps = +(job.fps || 24), n0 = Math.round(+(job.from || 0) * fps), n1 = Math.round(+job.to * fps);
    for (let n = n0; n < n1; n++) frames.push({ t: n / fps, name: `f_${String(n).padStart(5, '0')}` });
    if (job.skipExisting !== false) frames = frames.filter((f) => !fs.existsSync(path.join(out, `${f.name}.jpg`)));
  }
  jl(`start ${job.topic} ${shell} · ${frames.length} frames → ${path.relative(ROOT, out)}`);
  const page = await browser.newPage({ viewport: { width: Math.round((land ? 1920 : 1080) * scale), height: Math.round((land ? 1080 : 1920) * scale) } });
  page.on('pageerror', (e) => jl('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') jl('console ' + m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${PORT}/series/shell/${shell}.html?topic=${job.topic}&scale=${scale}&rscale=${job.rscale || 1}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 600000 });
  const cdp = await page.context().newCDPSession(page);
  const t0 = Date.now();
  let i = 0;
  for (const f of frames) {
    await page.evaluate((t) => window.renderFrame(t), f.t);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: job.quality || 92, optimizeForSpeed: true });
    fs.writeFileSync(path.join(out, `${f.name}.jpg`), Buffer.from(shot.data, 'base64'));
    i++;
    if (i % 48 === 0 || job.times) jl(`${f.name} ${((Date.now() - t0) / i) | 0}ms/frame (${i}/${frames.length})`);
  }
  await page.close();
  jl(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

log(`worker started in ${ROOT}`);
let browser = await launch();
const seen = new Set();
for (;;) {
  fs.writeFileSync(path.join(JOBS, 'worker.alive'), new Date().toISOString());
  const files = fs.readdirSync(JOBS).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const id = f.slice(0, -5);
    if (seen.has(id) || fs.existsSync(path.join(JOBS, `${id}.done`)) || fs.existsSync(path.join(JOBS, `${id}.failed`))) continue;
    seen.add(id);
    try {
      if (!browser.isConnected()) browser = await launch();
      await runJob(browser, id, JSON.parse(fs.readFileSync(path.join(JOBS, f), 'utf8')));
      fs.writeFileSync(path.join(JOBS, `${id}.done`), new Date().toISOString());
    } catch (e) {
      log(`job ${id} failed: ${e.stack || e}`);
      fs.writeFileSync(path.join(JOBS, `${id}.failed`), String(e.stack || e));
    }
  }
  await sleep(3000);
}
