// 离线：把 16.0.22 的高差按不同步长取整，看一张表的子模板 / 属性树规模（不碰 UE）
import fs from 'node:fs';
import {migrateNumbering} from '../../../tool/workbench/src/point-numbering.mjs';
import {preflightProject} from '../../../tool/workbench/src/program-project.mjs';
import {nestedQualityEvents} from '../../../tool/workbench/src/editing-model.mjs';
import {compileDirector} from '../../../tool/workbench/src/director-model.mjs';
import {size} from './size.mjs';
const W = '../../../tool/workbench/';
const seed = migrateNumbering(JSON.parse(fs.readFileSync(W + 'public/data/score24-v05.json', 'utf8')));
const file = process.argv[2] || '../../../FXtools/节目/云端最新/16.0.22-B02修订2-高差只往上.dfshow';
const state = preflightProject(fs.readFileSync(file, 'utf8'), seed);
const rows = [];
for (const step of [0, 1, 2, 4, 5, 8, 10, 15]) {
  const doc = structuredClone(state.doc);
  for (const e of doc.events) e.dz = step === 0 ? 0 : Math.round((e.dz || 0) / step) * step;
  const n = nestedQualityEvents(doc, state.profiles), r = compileDirector(doc, n.events, undefined);
  if (n.issues.length || r.issues.length) throw Error(n.issues.concat(r.issues).join('；'));
  const s = size(r.arrays);
  const moved = state.doc.events.reduce((m, e, i) => Math.max(m, Math.abs((e.dz || 0) - doc.events[i].dz)), 0);
  rows.push({step: step ? step + ' m' : '不要高差', heightVariants: r.summary.heightVariants, subs: s.subs, tpls: s.tpls, parentEntries: s.parentEntries, nodes: s.effectNodes, maxMoveM: moved,
    estMs: Math.round(s.effectNodes * 4.19 / 1000)});
}
console.table(rows);
