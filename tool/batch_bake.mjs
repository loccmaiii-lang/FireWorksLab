#!/usr/bin/env node
// 命令行批量重烘：把一批参数 JSON（或配方库）用烘焙器重新导出成 ZIP。
//
// 准备（只需一次）：
//   npm i playwright
//   npx playwright install chromium
// 用法：
//   node batch_bake.mjs <参数JSON、配方库JSON 或 文件夹> [输出文件夹] [--size 2048] [--show]
//   --size   覆盖贴图尺寸（例如 1024 做快速预览）
//   --show   打开可见的浏览器窗口（Windows 上无头模式可能用不到独立显卡，慢时加这个）
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const show = args.includes('--show'); if (show) args.splice(args.indexOf('--show'), 1);
const size = flag('--size');
const input = args[0], outDir = args[1] || path.join(process.cwd(), 'batch_out');
if (!input) { console.log('用法：node batch_bake.mjs <参数JSON、配方库JSON 或 文件夹> [输出文件夹] [--size 2048] [--show]'); process.exit(1); }

// 收集任务：单个 JSON、文件夹里所有 JSON、配方库里的每个配方
const jobs = [];
const addFile = f => {
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), base = path.basename(f, '.json');
  if (Array.isArray(j.recipes)) for (const r of j.recipes) jobs.push({ json: { ...r, _lib: j.recipes }, name: r.name });
  else if (j.params || j.type) jobs.push({ json: j, name: j.name || base });
};
if (fs.statSync(input).isDirectory()) for (const f of fs.readdirSync(input)) { if (f.endsWith('.json')) addFile(path.join(input, f)); }
else addFile(input);
if (!jobs.length) { console.log('没有找到可烘焙的参数'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const extra = (process.env.FWB_CHROME_ARGS || '').split(' ').filter(Boolean);
const browser = await chromium.launch({ headless: !show, args: ['--ignore-gpu-blocklist', ...extra] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.error('页面错误：', e.message));
await page.goto(pathToFileURL(path.join(here, 'FireworkBaker.html')).href);
await page.waitForFunction(() => window.__fw && window.__fw.idle(), null, { timeout: 0 });
const gpu = await page.evaluate(() => document.getElementById('gpu').textContent);
console.log(gpu);
for (const [i, job] of jobs.entries()) {
  const t0 = Date.now();
  process.stdout.write(`[${i + 1}/${jobs.length}] ${job.name} … `);
  try {
    const b64 = await page.evaluate(async ({ json, name, size }) => {
      // 配方库里的子配方需要父配方：临时放进配方列表
      if (json._lib) { window.__fw.state.recipes = json._lib; delete json._lib; }
      return window.__fw.exportZipB64(json, name, size ? { texW: +size, texH: +size } : null);
    }, { json: job.json, name: job.name, size });
    const file = path.join(outDir, job.name.replace(/[^\w\-一-龥]+/g, '_') + '.zip');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log(`完成 ${((Date.now() - t0) / 1000).toFixed(1)} s → ${file}`);
  } catch (e) { console.log('失败：' + e.message); }
}
await browser.close();
