// Day 位置修复（跨年秀（22），用户 2026-10-22 21:48「现在的day不改编排，只把位置修复」）
//
// Day v4（10-15 01:29）是在编译器两次修复之前编的：旧约定「Roll 正 → 花往 −Y」和 UE 相反（B08 9295322b 改成 UE 标准「Roll 正 → +Y」，
// Night 一直用新约定、已通过）。结果是 Day 每朵带倾角的球花都偏到尾缀倾斜的反方向（花心离尾缀轴线中位约 9 m）。
//
// 这里不重编（重编会把 B08 以后改过的共用配置一起带进来，比如小平台 Tiny ×0.65 / 花 40 m），只读现有 Day 节目：
//   每个「一根有倾角的尾缀 + 花」的固定子模板，把花条目 PositionOffset.Y 改到尾缀轴线上（= 原值取反），别的字段一个不动；
//   然后用和 编排B01_编译.mjs 同一套 workbench 函数重出三表 + 一张表，并核对：除了这些花的 Y，所有事件逐项相同。
//
// 用法：node analysis/scripts/Day位置修复.mjs [--in <dfshow>] [--out <目录>]   （默认读写 FXtools/节目/NewYearFireWorks_Day/，同名覆盖，旧版在 Git 历史）
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDoc, validateProfiles, qualityEvents, nestedQualityEvents} from '../../tool/workbench/src/editing-model.mjs';
import {compileDirector} from '../../tool/workbench/src/director-model.mjs';
import {preflightProject} from '../../tool/workbench/src/program-project.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const DIR = path.join(ROOT, 'FXtools/节目/NewYearFireWorks_Day');
const TABLE = 'Day调试版-NPC试放';
const IN = opt('in', path.join(DIR, `NewYearFireWorks_Day-${TABLE}.dfshow`));
const OUT = opt('out', DIR);
const round = x => Math.round(x * 1e6) / 1e6;

const project = JSON.parse(fs.readFileSync(IN, 'utf8'));
const before = structuredClone(project);
const doc = project.payload.doc;

// —— 1. 改花的 Y：只动「一根有倾角的尾缀 + 花」的子模板 ——
const fixed = [];
for (const s of doc.subTemplateLibrary) {
  const tr = s.entries.filter(e => e.role === 'trail'), bu = s.entries.filter(e => e.role === 'burst');
  if (tr.length !== 1 || !bu.length) continue;
  const roll = tr[0].native.RotationOffset.Roll, a = roll * Math.PI / 180;
  if (Math.abs(roll) < 0.01) continue;
  const z0 = tr[0].native.PositionOffset.Z;
  for (const b of bu) {
    const p = b.native.PositionOffset, along = Math.tan(a) * (p.Z - z0);   // 尾缀轴线（UE：Roll 正 → +Y）在花这个高度的 Y
    if (Math.abs(p.Y + along) > 50) throw Error(`${s.key}：花不在旧约定的位置上（Y ${p.Y} cm，旧约定应为 ${round(-along)} cm），不敢自动改`);
    const was = p.Y;
    b.native.PositionOffset = {...p, Y: round(-p.Y)};
    if (Math.abs(b.native.PositionOffset.Y - along) > 50) throw Error(`${s.key}：改完仍不在尾缀轴线上`);
    fixed.push({sub: s.key, roll: round(roll), yWasCm: round(was), yNowCm: b.native.PositionOffset.Y, movedM: round(Math.abs(2 * was) / 100)});
  }
  s.positionFix = {rule: 'Roll 正 → +Y（UE 标准，同 B08 起的编译器）；只改花条目 PositionOffset.Y，到尾缀轴线上', by: '跨年秀（22）2026-10-22，用户 21:48「day不改编排，只把位置修复」'};
}
if (!fixed.length) throw Error('没找到要修的子模板（已经修过？）');
project.project.version = (project.project.version || 0) + 1;

// —— 2. 同一条校验路径 + 重出三表 / 一张表（同 编排B01_编译.mjs） ——
const raw = JSON.stringify(project);
const state = preflightProject(raw, {sourceSha: project.payload.sourceSha, musicMarkers: []});
const errors = [...validateDoc(state.doc), ...validateProfiles(state.doc, state.profiles)];
if (errors.length) throw Error('校验失败：' + errors.slice(0, 5).join('；'));
const onlyMobile = new Set(state.doc.cues.filter(c => c.mobile === 'only').map(c => c.id));
const out = {};
for (const tier of ['high', 'medium', 'low']) {
  const ev = qualityEvents(state.doc, state.profiles, tier).filter(e => !onlyMobile.has(e.cueId));
  const r = compileDirector(state.doc, ev, undefined, {});
  if (r.issues.length) throw Error(`${tier} 编译问题：${r.issues.slice(0, 5).join('；')}`);
  out[`三表-${TABLE}-${tier}.json`] = r.manifest;
}
const nested = nestedQualityEvents(state.doc, state.profiles);
if (nested.issues.length) throw Error('一张表：' + nested.issues[0]);
for (const e of nested.events) if (onlyMobile.has(e.cueId)) e.platformFlags = 2;
const r1 = compileDirector(state.doc, nested.events, undefined, {});
if (r1.issues.length) throw Error('一张表编译问题：' + r1.issues.slice(0, 3).join('；'));
out[`导演表-${TABLE}-一张表.json`] = r1.manifest;

// —— 3. 核对：展开成事件，除了花的 Y 之外逐项相同 ——
const expand = (m, dropY) => {
  const sub = new Map(m.EffectSubTemplates.map(s => [s.TemplateName, s])), tm = new Map(m.EffectTemplates.map(t => [t.TemplateName, t])), c = new Map();
  for (const g of m.EffectScheduleGroups) for (const s of g.Slots) for (const e of tm.get(s.TemplateName).Entries) for (const se of sub.get(e.SubTemplateName).Entries) {
    const k = JSON.stringify([g.GroupName, Math.round((s.StartTime + e.LocalTimeOffset + se.LocalTimeOffset) * 1000), e.SlotIndex, s.Filter, e.Filter, se.FXResourceId, se.EffectScale, e.EffectScale,
      {...se.PositionOffset, Y: dropY ? 0 : Math.round(se.PositionOffset.Y)}, se.RotationOffset, e.PositionOffset, e.RotationOffset, se.RandomPositionRange, se.RandomRotationRange, se.RandomScaleRatio]);
    c.set(k, (c.get(k) || 0) + 1);
  }
  return c;
};
const diff = (a, b) => [...a].reduce((n, [k, v]) => n + Math.max(0, v - (b.get(k) || 0)), 0);
const check = {};
for (const [f, m] of Object.entries(out)) {
  const old = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const sameIgnoringY = diff(expand(old, true), expand(m, true)) + diff(expand(m, true), expand(old, true));
  const changed = diff(expand(old, false), expand(m, false));
  const total = [...expand(m, false).values()].reduce((x, y) => x + y, 0);
  if (sameIgnoringY) throw Error(`${f}：除 Y 外还有 ${sameIgnoringY} 处不同，停`);
  check[f] = {events: total, yChanged: changed, otherDiffs: 0};
}

// —— 4. 写出 ——
fs.mkdirSync(OUT, {recursive: true});
fs.writeFileSync(path.join(OUT, `NewYearFireWorks_Day-${TABLE}.dfshow`), JSON.stringify(project));
for (const [f, m] of Object.entries(out)) fs.writeFileSync(path.join(OUT, f), JSON.stringify(m, null, 2));
const report = {by: '跨年秀（22）2026-10-22', user: '「OK，现在的day不改编排，只把位置修复」（10-22 21:48）', input: path.relative(ROOT, IN), projectVersion: [before.project.version, project.project.version],
  fixedSubTemplates: fixed.length, movedM: {min: Math.min(...fixed.map(x => x.movedM)), max: Math.max(...fixed.map(x => x.movedM))}, fixed, tables: check};
fs.writeFileSync(path.join(OUT, `${TABLE}-位置修复检查.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify({fixedSubTemplates: fixed.length, movedM: report.movedM, tables: check, projectVersion: report.projectVersion}, null, 1));
