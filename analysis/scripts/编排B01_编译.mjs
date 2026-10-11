#!/usr/bin/env node
// 编排 B01 → 工作台节目文件（.dfshow）+ 三档三表（df.director-delivery/2）
// 用法：node analysis/scripts/编排B01_编译.mjs [--out FXtools/节目/NewYearFireWorks_v01]
// 输入：协作/编排B01/逻辑方案.json（analysis/scripts/编排B01.py 生成）、R04 节目（取点位、固定子模板、音乐）
// 全程只用工作台自带代码：normalize / validateDoc / preflightProject（= 8025 打开 .dfshow 时跑的那条路径）/ compileDirector（= 交付页生成三表的编译器）
// 不改固定子模板、不改资源、不改 tool/ 下任何文件。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize, validateDoc, validateProfiles, qualityEvents} from '../../tool/workbench/src/editing-model.mjs';
import {compileDirector} from '../../tool/workbench/src/director-model.mjs';
import {preflightProject} from '../../tool/workbench/src/program-project.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const args = process.argv.slice(2);
const outDir = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'FXtools/节目/NewYearFireWorks_v01');
const BASE = path.join(ROOT, 'FXtools/节目/NewYearFireWorks_v01/NewYearFireWorks_v01-R04时间规范修正.dfshow');
const LOGIC = path.join(ROOT, '协作/编排B01/逻辑方案.json');
const TAG = 'B01长冈式';
const FILE_VERSION = 8;   // 修订1（本机同步 8，10-11）：档位从两端收 + 金垂柳只当主角
const clone = x => structuredClone(x);
const round = x => Math.round(x * 1e6) / 1e6;
const sec = (x) => round(x);

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const logic = JSON.parse(fs.readFileSync(LOGIC, 'utf8'));
const payload = clone(base.payload);
const doc = clone(payload.doc);

// —— 原型：每种花型取一条 R04 的 cue / event 当字段模板（只改时间 / 点位 / 编号） ——
const eventProto = new Map(), cueProto = new Map();
for (const e of doc.events) if (!eventProto.has(e.templateId)) eventProto.set(e.templateId, e);
for (const c of doc.cues) if (!cueProto.has(c.templateId)) cueProto.set(c.templateId, c);
const templates = new Map(doc.templateLibrary.map(t => [t.id, t]));

// —— 段落 ——
const colors = ['#56766e', '#5d78b4', '#8a6e3b', '#7a5d8f', '#9a5a4a', '#4f7f8f', '#6f7f3f', '#8f5f6f', '#506a9a', '#9a7f3a', '#5a8a6a', '#8a5a9a', '#9a6a3a', '#7f8fb0'];
doc.sections = logic.sections.map((s, i) => ({id: s.id, start: sec(s.start), end: sec(s.end), name: `B01｜${s.name}`, color: colors[i % colors.length], source: 'user-authored', detail: `领 ${s.lead} · 接 ${s.relay} · 插 ${s.accent}。${s.note}`, eventCount: 0, fanCount: 0, ballCount: 0}));
// 最后一段延到节目结束，其余按小节首尾，不重叠
const sections = doc.sections.sort((a, b) => a.start - b.start);
const duration = logic.duration;
sections[0].start = 0;
for (let i = 0; i < sections.length - 1; i++) sections[i].end = sections[i + 1].start;
sections[sections.length - 1].end = duration;

// —— cue / event ——
doc.cues = []; doc.events = [];
const profiles = {medium: {}, low: {}};
for (const c of logic.cues) {
  const tpl = templates.get(c.templateId);
  if (!tpl) throw Error('找不到花型 ' + c.templateId);
  const ep = eventProto.get(c.templateId);
  if (!ep) throw Error('R04 里没有 ' + c.templateId + ' 的事件原型');
  const evs = c.events.map((e, i) => {
    const ev = clone(ep);
    for (const k of ['choreographyInstance', 'effectiveLaunch', 'effectiveBurst', 'effectiveEnd', 'launchJitterS', 'jitterKey', 'sectionId', 'phase', 'groupId']) delete ev[k];
    Object.assign(ev, {id: `${c.id}_E${String(i + 1).padStart(2, '0')}`, pointId: e.point, point: e.point, templateId: c.templateId, template: c.templateId, cueId: c.id,
      launch: round(e.launch), dt: 0, dz: e.dz, scale: 1, zone: 'dam', burst: round(e.burst), end: round(e.end), recipeRef: tpl.subTemplateRef});
    if (tpl.shape === 'fan' || c.size === 'F') { ev.beams = ev.beams ?? 1; ev.beamGap = ev.beamGap ?? 0; ev.dir = ev.dir ?? 'L'; ev.tilt = ev.tilt ?? 0; }
    else { delete ev.beams; delete ev.beamGap; delete ev.dir; delete ev.tilt; }
    return ev;
  });
  doc.events.push(...evs);
  const cp = cueProto.get(c.templateId) ?? {};
  const cue = {id: c.id, name: c.name, templateId: c.templateId, pointIds: c.points, enabled: true, sourceMethod: 'visual_editor', groupingSource: 'visual_editor',
    eventIds: evs.map(e => e.id), start: Math.min(...evs.map(e => e.launch)), order: c.order, gap: c.gap, sizeScale: 1, designScale: Object.fromEntries(evs.map(e => [e.id, 1])),
    preserveRepeatedEvents: true, edited: true, warnings: [], pattern: `${c.wave ?? ''}｜${c.label}`, programSectionId: c.section, musicBinding: null};
  if (cue.order === 'source' || !['left', 'right', 'center-out', 'outside-in', 'together', 'source'].includes(cue.order)) cue.order = 'source';
  doc.cues.push(cue);
  profiles.medium[c.id] = c.profiles.medium;
  profiles.low[c.id] = c.profiles.low;
}

// —— meta ——
Object.assign(doc.meta, {version: 'nagaoka-logic-v1', duration, savedAt: '2026-10-11', musicOffset: logic.musicOffsetS, compositionRevision: 'B01_NAGAOKA_LOGIC', compositionSource: 'score_from_nagaoka_logic_by_bar',
  programFileVersion: FILE_VERSION, sectionsMode: 'user', timeRule: '完整花型调用 / 点间隔 / 开花时刻取 0.1 秒整数倍；固定子模板内部时间原值；B01 无随机错开（点间用固定 0.1–0.3 s 涟漪）。',
  editingRule: '固定子模板与 20 个基础资源一律不改；高度偏移只在编排条目里 ±25 m；球花尾缀 scale=1；三档点集 = 高全点 / 中去最外两点 / 低隔点留。', arrangementTimeGridS: 0.1});
delete doc.meta.defaultStaggerEnabled;
doc.choreographyLibrary = [];
doc.notices = [];
const finalDoc = normalize(doc);

// —— 音乐标记（演出秒；声学检测，待试听） ——
const hitSet = new Set(['B01_S1', 'B01_S5', 'B01_S9', 'B01_S12', 'B01_S13']);
const musicMarkers = logic.sections.map(s => ({id: `B01_${s.id.slice(4)}`, name: `B01｜${s.name}入口`, time: round(Math.round(s.start * 10) / 10), kind: hitSet.has(s.id) ? 'peak' : 'hit', confidence: '音乐小节网格（5.18 + 1.6216·k）＋能量分段；待试听'}));
for (const [t, name, kind] of [[112.2, 'B01｜高潮 II 回归（用户 1:47）', 'peak'], [175.4, 'B01｜⑧ 三主角垂柳墙', 'peak'], [196.5, 'B01｜终和弦 白墙', 'peak'], [10.0, 'B01｜0 点 · 开场高潮', 'peak'], [110.6, 'B01｜静默一小节', 'hit']])
  musicMarkers.push({id: `B01_M${Math.round(t * 10)}`, name, time: t, kind, confidence: '用户给定 / 小节网格；待试听'});
musicMarkers.sort((a, b) => a.time - b.time);

const newPayload = {...payload, doc: finalDoc, profiles, tier: 'high', musicMarkers, time: 0, selectedCue: logic.cues[0].id};
const dfshow = {format: 'df.workbench-project/1', project: {id: base.project.id, name: base.project.name, version: FILE_VERSION}, payload: newPayload};

// —— 先走 8025 打开 .dfshow 的同一条校验路径 ——
const seed = {sourceSha: payload.sourceSha, musicMarkers: []};
const raw = JSON.stringify(dfshow);
const state = preflightProject(raw, seed);
const errors = [...validateDoc(state.doc), ...validateProfiles(state.doc, state.profiles)];
if (errors.length) throw Error('校验失败：' + errors.slice(0, 5).join('；'));

// —— 三档三表 ——
const occ = {};   // 每档展开成 (组, 时刻, 槽位, 子模板) 计数，用来查低 ⊂ 中 ⊂ 高
const report = {revision: 'B01_NAGAOKA_LOGIC_r1', generatedBy: 'analysis/scripts/编排B01_编译.mjs', tiers: {}, preflight: 'preflightProject 通过（同 8025 打开 .dfshow）', file: `NewYearFireWorks_v01-${TAG}.dfshow`};
fs.mkdirSync(outDir, {recursive: true});
for (const tier of ['high', 'medium', 'low']) {
  const ev = qualityEvents(state.doc, state.profiles, tier);
  const r = compileDirector(state.doc, ev, undefined, {});
  if (r.issues.length) throw Error(`${tier} 编译问题：${r.issues.slice(0, 5).join('；')}`);
  const file = path.join(outDir, `三表-B01-${tier}.json`);
  fs.writeFileSync(file, JSON.stringify(r.manifest, null, 2));
  const m = r.manifest;
  // 展开等价：所有槽位引用的父模板存在、父模板引用的子模板存在、SlotIndex < RequiredPointCount、时间在 0.1 网格
  const subs = new Set(m.EffectSubTemplates.map(s => s.TemplateName)), tpls = new Map(m.EffectTemplates.map(t => [t.TemplateName, t]));
  let bad = [];
  for (const g of m.EffectScheduleGroups) for (const s of g.Slots) {
    const t = tpls.get(s.TemplateName); if (!t) { bad.push('槽位引用缺失 ' + s.TemplateName); continue; }
    if (Math.abs(s.StartTime * 10 - Math.round(s.StartTime * 10)) > 1e-6) bad.push('槽位时间不在 0.1 网格 ' + s.StartTime);
    for (const e of t.Entries) { if (!subs.has(e.SubTemplateName)) bad.push('子模板缺失 ' + e.SubTemplateName); if (e.SlotIndex >= t.RequiredPointCount) bad.push('SlotIndex 越界 ' + t.TemplateName); if (Math.abs(e.LocalTimeOffset * 10 - Math.round(e.LocalTimeOffset * 10)) > 1e-6) bad.push('条目偏移不在 0.1 网格 ' + t.TemplateName + ' ' + e.LocalTimeOffset); }
  }
  report.tiers[tier] = {events: ev.length, subTemplates: m.EffectSubTemplates.length, templates: m.EffectTemplates.length, scheduleSlots: m.EffectScheduleGroups.reduce((n, g) => n + g.Slots.length, 0),
    groups: Object.fromEntries(m.EffectScheduleGroups.map(g => [g.GroupName, g.Slots.length])), lastSlot: Math.max(...m.EffectScheduleGroups.flatMap(g => g.Slots.map(s => s.StartTime))), expansionProblems: [...new Set(bad)].slice(0, 10), status: m.status};
  if (bad.length) throw Error(`${tier} 展开检查失败：${bad[0]}`);
  const o = new Map();
  for (const g of m.EffectScheduleGroups) for (const s of g.Slots) for (const e of tpls.get(s.TemplateName).Entries) {
    const k = [g.GroupName, Math.round((s.StartTime + e.LocalTimeOffset) * 1000), e.SlotIndex, e.SubTemplateName].join('|'); o.set(k, (o.get(k) || 0) + 1);
  }
  occ[tier] = o;
}
// —— 档位嵌套：一张表按 MinQualityLevel 嵌套的前提（宪章 §5；修订1 加） ——
const notIn = (a, b) => [...a].reduce((n, [k, v]) => n + Math.max(0, v - (b.get(k) || 0)), 0);
report.tierNesting = {lowNotInMedium: notIn(occ.low, occ.medium), mediumNotInHigh: notIn(occ.medium, occ.high)};
if (report.tierNesting.lowNotInMedium || report.tierNesting.mediumNotInHigh) throw Error('档位不嵌套：' + JSON.stringify(report.tierNesting));
report.doc = {cues: finalDoc.cues.length, events: finalDoc.events.length, sections: finalDoc.sections.length, duration: finalDoc.meta.duration, musicOffset: finalDoc.meta.musicOffset, balls: finalDoc.statistics.ballCount, fans: finalDoc.statistics.fanCount};
fs.writeFileSync(path.join(outDir, 'B01编排检查.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, `NewYearFireWorks_v01-${TAG}.dfshow`), raw);
console.log(JSON.stringify(report, null, 1));
