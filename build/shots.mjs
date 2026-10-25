// Render a list of test shots from web/test.html into test/shots/*.jpg
import { chromium } from 'playwright';
import fs from 'fs';
const shots = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = +(process.argv[3] || 540), H = +(process.argv[4] || 960);
fs.mkdirSync('test/shots', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 400)); });
p.on('pageerror', (e) => console.log('pageerror', e.message));
const t0 = Date.now();
await p.goto(`http://localhost:8765/web/test.html?w=${W}&h=${H}`);
await p.waitForFunction(() => window.ready, null, { timeout: 180000 });
console.log('ready in', Date.now() - t0, 'ms');
for (const s of shots) {
  const t1 = Date.now();
  await p.evaluate((s) => window.shot(s), s);
  await p.screenshot({ path: `test/shots/${s.name}.jpg`, type: 'jpeg', quality: 88 });
  console.log(s.name, Date.now() - t1, 'ms');
}
await b.close();
