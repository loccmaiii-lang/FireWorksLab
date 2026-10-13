// 离线：不改编排（每一发的点位、时刻、子模板、档位都不变），只换导演三表的「拆法」，看属性行能省多少。
// A 现在：一排（片段 × 组）一个父模板，条目 = 每个点。
// B 每发一个父模板：父模板只有 1 个条目（偏移 0），时刻挪进时序槽；同点同花同档的发全场共用一个父模板。
// C 一排按子模板拆：同一排里用同一个子模板的点归一个父模板（高度版本不同的点各成一组），时刻偏移按组内最早那发归零。
import fs from 'node:fs';
import {size} from './size.mjs';
import {expandDirectorSchedule} from '../../../tool/workbench/src/director-compact.mjs';
const m = JSON.parse(fs.readFileSync('../../../FXtools/节目/NewYearFireWorks_v01/导演表-B02r3-一张表.json', 'utf8'));
const A = {EffectSubTemplates: m.EffectSubTemplates, EffectTemplates: m.EffectTemplates, EffectScheduleGroups: m.EffectScheduleGroups};
const r6 = v => Math.round(v * 1e6) / 1e6;
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const parents = new Map(A.EffectTemplates.map(p => [p.TemplateName, p]));

function refactor(split) {
  const tpl = new Map(), groups = new Map();
  for (const g of A.EffectScheduleGroups) for (const s of g.Slots) {
    const p = parents.get(s.TemplateName);
    for (const part of split(p)) {
      const t0 = Math.min(...part.map(e => e.LocalTimeOffset));
      const body = {RequiredPointCount: p.RequiredPointCount, Filter: p.Filter, Entries: part.map(e => ({...e, LocalTimeOffset: r6(e.LocalTimeOffset - t0)}))};
      const key = JSON.stringify(stable(body));
      if (!tpl.has(key)) tpl.set(key, {TemplateName: 'T' + tpl.size, ...body});
      if (!groups.has(g.GroupName)) groups.set(g.GroupName, []);
      groups.get(g.GroupName).push({StartTime: r6(s.StartTime + t0), TemplateName: tpl.get(key).TemplateName, Filter: s.Filter});
    }
  }
  return {EffectSubTemplates: A.EffectSubTemplates, EffectTemplates: [...tpl.values()],
    EffectScheduleGroups: [...groups].map(([GroupName, Slots]) => ({GroupName, Slots: Slots.sort((a, b) => a.StartTime - b.StartTime)}))};
}
const B = refactor(p => p.Entries.map(e => [e]));
const C = refactor(p => { const by = new Map(); for (const e of p.Entries) { const k = e.SubTemplateName + '|' + JSON.stringify(stable(e.Filter)); if (!by.has(k)) by.set(k, []); by.get(k).push(e); } return [...by.values()]; });

// 展开核对：每一发（组、点、绝对时刻、子模板、档位）一模一样
const shots = arr => expandDirectorSchedule(arr).flatMap(r => r.parent.Entries.map(e => [r.group, e.SlotIndex, r6(r.slot.StartTime + e.LocalTimeOffset), e.SubTemplateName, JSON.stringify(stable(e.Filter)), JSON.stringify(stable(r.slot.Filter)), JSON.stringify(stable(r.parent.Filter))].join('|'))).sort();
const ref = shots(A);
const rows = [];
for (const [label, arr] of [['A 现在（一排一个父模板）', A], ['B 每发一个父模板', B], ['C 一排按子模板拆', C]]) {
  const s = size(arr), same = JSON.stringify(shots(arr)) === JSON.stringify(ref);
  rows.push({label, subs: s.subs, tpls: s.tpls, parentEntries: s.parentEntries, slots: s.slots, sub: s.sub, parent: s.parent, schedule: s.schedule, nodes: s.effectNodes, sameShots: same});
}
console.table(rows);
// 每个结构的字段数（一行 = 一个属性节点）
const per = (x) => size({EffectSubTemplates: [], EffectTemplates: [], EffectScheduleGroups: [], ...x}).effectNodes - 3;
console.log('一个父条目约', (size(A).parent - A.EffectTemplates.length * 6) / A.EffectTemplates.reduce((n, p) => n + p.Entries.length, 0), '行；一个时序槽约', (size(A).schedule - 3) / size(A).slots, '行');
fs.writeFileSync('refactor-B.json', JSON.stringify(B)); fs.writeFileSync('refactor-C.json', JSON.stringify(C));
