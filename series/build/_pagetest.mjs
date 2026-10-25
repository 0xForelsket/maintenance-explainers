import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const topic of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:8765/series/site/${topic}/test_local.html`);
  await p.waitForTimeout(25000);
  await p.screenshot({ path: `/tmp/claude-0/page_${topic}.jpg`, quality: 70 });
  console.log(topic, 'errors:', errs.slice(0, 5));
  await p.close();
}
await b.close();
