import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const src = fs.readFileSync(new URL('../../../tool/prototypes/mesh-willow-v2/index.html', import.meta.url),'utf8');
fs.writeFileSync('test.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>'+src+'</body></html>');
const shots = JSON.parse(process.argv[2]);
const browser = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:{ width: 1200, height: 900 }, deviceScaleFactor: 1 });
const logs=[]; page.on('console', m=>logs.push(m.type()+': '+m.text())); page.on('pageerror', e=>logs.push('ERR '+e.message));
for (const s of shots) {
  await page.goto('file://'+process.cwd()+'/test.html?'+s.q);
  await page.waitForFunction(()=>window.__ready && window.__ready(), null, {timeout:60000});
  await page.evaluate(t=>window.__render(t), s.t);
  await page.waitForTimeout(300);
  await page.evaluate(t=>window.__render(t), s.t);
  await page.screenshot({ path: s.out });
  if (s.stat) console.log(s.out, '\n', await page.evaluate(()=>document.getElementById('stat').textContent));
}
console.log(logs.slice(0,20).join('\n'));
await browser.close();
