// 跑一组对照：记日志偏移 → begin → 等结束 → 清 Actor → 从日志按顺序取每张截图时的流送状态（cfg.investigate）写 stream.json
// 用法：node run.mjs <cfg.json>
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const LOGF = 'E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const cfgFile = process.argv[2], cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const node = (...a) => execFileSync(process.execPath, ['cap.mjs', ...a], { cwd: new URL('.', import.meta.url), encoding: 'utf8' });
const off = fs.statSync(LOGF).size;
console.log(node('begin', cfgFile).trim());
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 1500)); const s = node('status'); if (/done: true/.test(s) || /error: '/.test(s)) { console.log(s.split('\n').filter(l => /done|error|elapsed/.test(l)).join(' ')); break; } }
console.log(node('cleanup').trim());
const n = fs.statSync(LOGF).size - off, buf = Buffer.alloc(n), fd = fs.openSync(LOGF, 'r'); fs.readSync(fd, buf, 0, n, off); fs.closeSync(fd);
const rows = []; let cur = null;
for (const l of buf.toString('utf8').split(/\r?\n/)) {
  let m = /LogContentStreaming: Texture: Texture2D (\S+)/.exec(l); if (m) { cur = { tex: m[1].split('.').pop() }; rows.push(cur); continue; }
  m = /Current size \[Mips\]: (\d+)x(\d+) \[(\d+)\]/.exec(l); if (m && cur) cur.current = +m[1];
  m = /Wanted size \[Mips\]:\s+(\d+)x(\d+)/.exec(l); if (m && cur) cur.wanted = +m[1];
}
const trace = JSON.parse(fs.readFileSync(cfg.folder + '/trace.json', 'utf8')), k = (cfg.investigate || []).length;
const stream = trace.shots.map((s, i) => ({ file: s.file, age: s.age, ...(k ? Object.fromEntries(rows.slice(i * k, i * k + k).map(r => [r.tex, r.current + '/' + r.wanted])) : {}) }));
fs.writeFileSync(cfg.folder + '/stream.json', JSON.stringify(stream, null, 1));
console.log(stream.map(s => s.age.toFixed(2) + 's ' + Object.entries(s).filter(([x]) => x.startsWith('T_')).map(([x, v]) => x.replace('T_EFX_FireWorks_', '') + ' ' + v).join(' | ')).join('\n'));
