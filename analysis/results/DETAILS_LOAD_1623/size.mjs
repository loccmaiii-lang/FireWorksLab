// 导演 DefaultConfig 属性树规模：Details 面板要为每个结构、数组元素、字段各建一个节点（10-09 卡顿报告：选中 + Details 可见时卡，切走就好）。
import fs from 'node:fs';
const nodes = v => {
  if (Array.isArray(v)) return 1 + v.reduce((n, x) => n + nodes(x), 0);
  if (v && typeof v === 'object') return 1 + Object.entries(v).filter(([k]) => k !== '_struct').reduce((n, [, x]) => n + nodes(x), 0);
  return 1;
};
export function size(cfg) {
  const subs = cfg.EffectSubTemplates, tpls = cfg.EffectTemplates, groups = cfg.EffectScheduleGroups;
  const subEntries = subs.reduce((n, s) => n + s.Entries.length, 0), parentEntries = tpls.reduce((n, t) => n + t.Entries.length, 0);
  const slots = groups.reduce((n, g) => n + g.Slots.length, 0);
  const part = {sub: nodes(subs), parent: nodes(tpls), schedule: nodes(groups)};
  return {subs: subs.length, subEntries, tpls: tpls.length, parentEntries, slots, ...part, effectNodes: part.sub + part.parent + part.schedule, allNodes: nodes(cfg)};
}
if (process.argv[1].endsWith('size.mjs')) {
  const rows = [];
  for (const [label, file, pick] of JSON.parse(process.argv[2])) {
    let j = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const k of pick) j = j[k];
    rows.push({label, ...size(j)});
  }
  console.table(rows);
}
