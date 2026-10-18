// 灯光试算：B11 修订1 / 修订2（工作台 buildLightDelivery，同「同时写入灯光」）。用法：node analysis/results/LIGHT_B11r2_20261018/light_check.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {buildLightDelivery} = await import(pathToFileURL(path.join(R, 'tool/workbench/src/light-curve-model.mjs')).href);
const D = path.join(R, 'FXtools/节目/NewYearFireWorks_v01');
const files = {B11r1: 'NewYearFireWorks_v01-B11修订1-白墙奇数点-金芒菊大用2827.dfshow', B11r2: 'NewYearFireWorks_v01-B11修订2-大型拆四行-金芒菊大用新行.dfshow'};
const out = {};
for (const [k, f] of Object.entries(files)) {
  const doc = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')).payload.doc;
  const d = buildLightDelivery(doc, {programme: {name: k}, now: new Date('2026-10-18T00:00:00Z')});
  out[k] = {events: d.manifest.events, peakAtS: d.manifest.peakAtS, sMax: d.manifest.sMax, errors: d.errors, warnings: d.warnings,
    lights: d.rows.map(r => ({light: r.light, peak: +r.peak.toFixed(3), iKeys: r.intensityKeys, cKeys: r.colorKeys}))};
}
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'light_check.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, 'events', v.events, 'peakAt', v.peakAtS, 'sMax', v.sMax, 'errors', JSON.stringify(v.errors), 'warn', JSON.stringify(v.warnings), v.lights.map(l => l.light + ':' + l.peak).join(' '));
