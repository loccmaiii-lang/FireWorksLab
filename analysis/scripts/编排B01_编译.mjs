#!/usr/bin/env node
// 编排 B01 → 工作台节目文件（.dfshow）+ 三档三表（df.director-delivery/2）
// 用法：node analysis/scripts/编排B01_编译.mjs [--density 1|2|3] [--out FXtools/节目/NewYearFireWorks_v01]
// --logic <逻辑方案.json> / --name <编排名>：读取独立逻辑输出，避免重生成时覆盖已有云端版本；仍走同一校验与编译路径。
// --audio <合并音频> [--audio-data <分析.json>]（22，用户 10-13 17:06「b03默认音频请用最新带vo的」）：节目音频换成这份文件——原字节内嵌（指纹 = 文件 SHA256，
//   要和逻辑方案 audio.mix.sha256 一致）、音乐偏移 0（演出秒 = 音频秒）、时间线波形 / 能量用 合并音频分析.py 的 display；音乐标记读逻辑方案 musicMarkers。
// --no-music / --project-id <id> / --project-name <名>（22，10-13 21:29 Day 调试版）：不带音乐的独立节目（Day 导演用），节目身份和 Night 分开，
//   免得在工作台里打开后占掉 Night 节目的保存位。
// 修订2（本机同步 8，10-11）：按 协作/编排B01/大号花型.json 建「同一资源放大升高」的大号 / 主角固定子模板；D1 / D3 输出带后缀，D2 沿用原文件名
// 输入：协作/编排B01/逻辑方案.json（analysis/scripts/编排B01.py 生成）、R04 节目（取点位、固定子模板、音乐）
// 全程只用工作台自带代码：normalize / validateDoc / preflightProject（= 8025 打开 .dfshow 时跑的那条路径）/ compileDirector（= 交付页生成三表的编译器）
// 不改原有固定子模板、不改资源、不改 tool/ 下任何文件；新增的大号花型是另存的新固定子模板（用户 10-11 19:54 授权）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalize, validateDoc, validateProfiles, qualityEvents, nestedQualityEvents} from '../../tool/workbench/src/editing-model.mjs';
import {compileDirector} from '../../tool/workbench/src/director-model.mjs';
import {preflightProject} from '../../tool/workbench/src/program-project.mjs';
import {applyTrailV2} from './尾缀v2开花点.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const args = process.argv.slice(2);
const outDir = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'FXtools/节目/NewYearFireWorks_v01');
const BASE = path.join(ROOT, 'FXtools/节目/NewYearFireWorks_v01/NewYearFireWorks_v01-R04时间规范修正.dfshow');
const DENSITY = args.includes('--density') ? Number(args[args.indexOf('--density') + 1]) : 2;
if (![1, 2, 3].includes(DENSITY)) throw Error('--density 只能是 1 / 2 / 3');
const RHYTHM = args.includes('--rhythm') ? args[args.indexOf('--rhythm') + 1] : null;
const VARY = args.includes('--vary');   // 高低 / 大小随机分布（用户 10-11 23:40 / 23:41），只配合 --rhythm   // 节奏留白版 A / B / C / D（以 D2 为底，用户 10-11 23:07）
if (RHYTHM && !['A', 'B', 'C', 'D'].includes(RHYTHM)) throw Error('--rhythm 只能是 A / B / C / D');
if (VARY && !RHYTHM) throw Error('--vary 要和 --rhythm 一起用');
// B02 修订1（22，用户 10-12 23:13）：--b02r1 = 错层 + 主角让位（逻辑方案_B02r1.json）；--b02r1m = 再加手游替身（只上手游片段，mobile:'only' → PlatformFlags 2，
//   要工作台支持「只上手游」才能打开预览，旧工作台会把替身当成 PC + 手游）
// B02 修订2（本机同步 8，用户 10-13 10:10）：--b02r2 = 修订1 + 高差只许往上（尾缀不进坝体；逻辑方案_B02r2_up70.json）
// B02 修订3（本机同步 8，用户 10-13 11:37 选中导演掉帧）：--b02r3 = 修订2 + 高差取整到 10 m（逻辑方案_B02r2_up70_s10.json），同一朵花的高度版本 257 → 约 110
const R3 = args.includes('--b02r3');
const R2 = R3 || args.includes('--b02r2');
const R1M = args.includes('--b02r1m'), R1 = R2 || R1M || args.includes('--b02r1');
const B02 = R1 || args.includes('--b02');   // B02（22，10-12）：节奏 D + 高低大小 + 尾缀 v2 高度 + 手机三档 + 小平台小花束尾（逻辑方案_B02.json）
const SFX = R3 ? '_B02r2_up70_s10' : R2 ? '_B02r2_up70' : R1M ? '_B02r1m' : R1 ? '_B02r1' : B02 ? '_B02' : RHYTHM ? `_R${RHYTHM}${VARY ? 'V' : ''}` : DENSITY === 2 ? '' : `_D${DENSITY}`;
const option = key => { const i=args.indexOf('--'+key); if(i<0)return null; const value=args[i+1]; if(!value||value.startsWith('--'))throw Error('--'+key+' 需要一个值'); return value; };
const logicInput=option('logic'),nameInput=option('name');
if(nameInput&&/[\\/:*?"<>|]/.test(nameInput))throw Error('--name 不能含文件名非法字符');
const audioInput = option('audio'), audioDataInput = option('audio-data');
const NO_MUSIC = args.includes('--no-music'), projectId = option('project-id'), projectName = option('project-name');
if (NO_MUSIC && audioInput) throw Error('--no-music 和 --audio 不能一起用');
const LOGIC = logicInput ? path.resolve(ROOT,logicInput) : path.join(ROOT, `协作/编排B01/逻辑方案${SFX}.json`);
const TAG = nameInput || (R3 ? 'B02修订3-高差只往上-10m取整' : R2 ? 'B02修订2-高差只往上' : R1M ? 'B02修订1-错层主角让位-手游替身' : R1 ? 'B02修订1-错层主角让位' : B02 ? 'B02长冈式-节奏D-高低大小-尾缀v2-手机三档-小花束尾' : 'B01长冈式' + (RHYTHM ? `-节奏${RHYTHM}${VARY ? '-高低大小' : ''}` : DENSITY === 2 ? '' : `-D${DENSITY}`));
const TABLE = nameInput || (R3 ? 'B02r3' : R2 ? 'B02r2' : R1M ? 'B02r1m' : R1 ? 'B02r1' : B02 ? 'B02' : RHYTHM ? `B01R${RHYTHM}${VARY ? 'V' : ''}` : DENSITY === 2 ? 'B01' : `B01D${DENSITY}`);
const MAIN = !B02 && !RHYTHM && DENSITY === 2;   // 只有 D2 主版带完整音乐
const FILE_VERSION = 12;   // 修订5（22，10-12）：B02 手机开关（片段 mobile:false）+ 小平台小花束尾
const HERO_ID = (args.find(a => a.startsWith('--hero-trail=')) || '').split('=')[1] || 'Hero';   // 用户 10-12 20:18：主角尾缀 ResourceFX 行叫 Hero（行加好、资源同步进基础库后再带 --hero-trail）   // 修订1：档位从两端收 + 金垂柳只当主角；修订2：大号花型 + 主角 280 + 密度 D1 / D3；修订3：节奏留白版 A–D；修订4（手游编排 10-12）：尾缀 v2 开花点
const TRAIL_V1 = args.includes('--trail-v1');   // 旧尾缀高度（190 / 265 / 410 m），只做对比；默认跟引擎里已重导的尾缀 v2（150 / 210 / 330 m）
const clone = x => structuredClone(x);
const round = x => Math.round(x * 1e6) / 1e6;
const sec = (x) => round(x);

const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const logic = JSON.parse(fs.readFileSync(LOGIC, 'utf8'));
const payload = clone(base.payload);
const doc = clone(payload.doc);

// —— 修订2：同一资源放大升高的大号 / 主角固定子模板（另存新版本，不动原花型） ——
const DERIVED = JSON.parse(fs.readFileSync(path.join(ROOT, '协作/编排B01/大号花型.json'), 'utf8')).flowers;
{
  const tmap = new Map(doc.templateLibrary.map(t => [t.id, t])), smap = new Map(doc.subTemplateLibrary.map(s => [s.key, s]));
  for (const f of DERIVED) {
    const st = tmap.get(f.source), ft = tmap.get(f.frame);
    if (!st || !ft) throw Error('大号花型的来源不存在：' + f.id);
    const ss = smap.get(st.subTemplateRef), fsub = smap.get(ft.subTemplateRef);
    const sb = ss.entries.find(e => e.role === 'burst'), ftail = fsub.entries.find(e => e.role === 'trail'), fb = fsub.entries.find(e => e.role === 'burst');
    const E = fsub.sizeEvidence.endpointM, roll = ss.coupledVariation?.rollDeg ?? 0, hOff = ss.coupledVariation?.heightOffsetM ?? 0, a = roll * Math.PI / 180;
    const trail = clone(ftail);   // 大号尾缀（升空时间、高度跟大号一致）；倾角 / 高度微偏沿用原花自己的固化随机
    trail.native.PositionOffset = {X: 0, Y: 0, Z: round(hOff * 100)};
    trail.native.RotationOffset = {...trail.native.RotationOffset, Roll: roll};
    const burst = clone(sb);      // 原花的同一个资源，放大、升到大号尾缀的终点
    const k = f.diameter / st.diameter;
    burst.native.LocalTimeOffset = fb.native.LocalTimeOffset;
    burst.native.PositionOffset = {X: 0, Y: round(-Math.sin(a) * E * 100), Z: round(Math.cos(a) * E * 100 + hOff * 100)};
    burst.native.RotationOffset = {...burst.native.RotationOffset, Roll: roll};
    burst.native.EffectScale = {X: round(sb.native.EffectScale.X * k), Y: round(sb.native.EffectScale.Y * k), Z: round(sb.native.EffectScale.Z * k)};
    burst.preview = {...burst.preview, diameterM: f.diameter};
    const sub = {...clone(ss), name: f.name, id: f.engineId, engineId: f.engineId, key: f.engineId + '@1', version: 1, entries: [trail, burst], sizeEvidence: clone(fsub.sizeEvidence),
      derivedFrom: {source: ss.key, frame: fsub.key, burstScale: round(k), rule: '同一 ResourceFX，球花 EffectScale 放大、换大号尾缀并升到大号尾缀终点', by: '本机同步（8）2026-10-11，用户 19:54 授权', engineScaleVerified: false}};
    doc.subTemplateLibrary.push(sub);
    doc.templateLibrary.push({...clone(st), id: f.id, name: f.name, kind: 'large', diameter: f.diameter, width: f.diameter, z: ft.z, burstZ: ft.burstZ, flightHeight: ft.flightHeight,
      rise: ft.rise, life: st.life, recipeDuration: round(ft.rise + st.life), subTemplateRef: sub.key, numericSource: 'derived_same_resource_scaled_20261011', engineSizeVerified: false});
  }
}
const DER_SRC = new Map(DERIVED.map(f => [f.id, f.source]));

// —— B05（22，用户 10-14 21:44 手游改 6 种）：手游替身用的放大 / 换资源花型（协作/编排B01/手游种类.json derived），只建逻辑方案用到的；
//    同大号花型的做法（同一资源 EffectScale 放大、挂到 frame 那一档尾缀的终点），可另换资源（resource，按 nativeM 算倍数）。 ——
const MOBF = JSON.parse(fs.readFileSync(path.join(ROOT, '协作/编排B01/手游种类.json'), 'utf8'));
const mobileDerivedReport = [];
{
  const used = new Set(logic.cues.map(c => c.templateId.split('__K')[0]));
  const tmap = new Map(doc.templateLibrary.map(t => [t.id, t])), smap = new Map(doc.subTemplateLibrary.map(s => [s.key, s]));
  const rowOf = new Map(MOBF.species6.map(x => [x.resource, x.rowName]));
  for (const f of MOBF.derived.filter(f => used.has(f.id))) {
    const st = tmap.get(f.source), ft = tmap.get(f.frame);
    if (!st || !ft) throw Error('手游花型的来源不存在：' + f.id);
    const ss = smap.get(st.subTemplateRef), fsub = smap.get(ft.subTemplateRef);
    const sb = ss.entries.find(e => e.role === 'burst'), ftail = fsub.entries.find(e => e.role === 'trail'), fb = fsub.entries.find(e => e.role === 'burst');
    const E = fsub.sizeEvidence.endpointM, roll = ss.coupledVariation?.rollDeg ?? 0, hOff = ss.coupledVariation?.heightOffsetM ?? 0, a = roll * Math.PI / 180;
    const trail = clone(ftail);
    trail.native.PositionOffset = {X: 0, Y: 0, Z: round(hOff * 100)};
    trail.native.RotationOffset = {...trail.native.RotationOffset, Roll: roll};
    const burst = clone(sb), k = f.diameter / (f.nativeM || st.diameter);
    burst.native.LocalTimeOffset = fb.native.LocalTimeOffset;
    burst.native.PositionOffset = {X: 0, Y: round(-Math.sin(a) * E * 100), Z: round(Math.cos(a) * E * 100 + hOff * 100)};
    burst.native.RotationOffset = {...burst.native.RotationOffset, Roll: roll};
    burst.native.EffectScale = f.nativeM ? {X: round(k), Y: round(k), Z: round(k)} : {X: round(sb.native.EffectScale.X * k), Y: round(sb.native.EffectScale.Y * k), Z: round(sb.native.EffectScale.Z * k)};
    if (f.resource) { burst.native.FXResourceId = f.resource; burst.baseTemplateRef = f.resource + '|burst'; burst.resourceSource = {table: burst.resourceSource?.table, rowName: rowOf.get(f.resource) || f.resource}; }
    burst.preview = {...burst.preview, diameterM: f.diameter};
    const sub = {...clone(ss), name: f.name, id: f.engineId, engineId: f.engineId, key: f.engineId + '@1', version: 1, entries: [trail, burst], sizeEvidence: clone(fsub.sizeEvidence),
      derivedFrom: {source: ss.key, frame: fsub.key, burstScale: round(k), resource: f.resource || null, rule: '手游 6 种替身：同一资源 EffectScale 放大（≤ 1.6）、挂到这一位的尾缀终点', by: '跨年秀（22）2026-10-14，用户 21:44', engineScaleVerified: false}};
    doc.subTemplateLibrary.push(sub);
    const kind = {S: 'small', M: 'medium', L: 'large'}[f.size];
    doc.templateLibrary.push({...clone(st), id: f.id, name: f.name, kind, diameter: f.diameter, width: f.diameter, z: ft.z, burstZ: ft.burstZ, flightHeight: ft.flightHeight,
      rise: ft.rise, life: st.life, recipeDuration: round(ft.rise + st.life), subTemplateRef: sub.key, numericSource: 'b05_mobile_species_20261014', engineSizeVerified: false, color: f.color});
    DER_SRC.set(f.id, f.source);
    mobileDerivedReport.push({id: f.id, engineId: f.engineId, resource: f.resource || burst.native.FXResourceId, diameter: f.diameter, scale: round(k)});
  }
}

// —— 大小随机版本（用户 10-11 23:41「球花的大小也相应略作随机」）：<花型>__K92 / __K108 = 同一花型只把球花条目放大 / 缩小，尾缀和开花点不动 ——
{
  const tmap = new Map(doc.templateLibrary.map(t => [t.id, t])), smap = new Map(doc.subTemplateLibrary.map(s => [s.key, s]));
  for (const id of [...new Set(logic.cues.map(c => c.templateId).filter(x => x.includes('__K')))]) {
    const [baseId, kTxt] = id.split('__K'), k = Number(kTxt) / 100, bt = tmap.get(baseId);
    if (!bt || !(k > 0.5 && k < 1.5)) throw Error('大小版本的原花型不存在或倍数不对：' + id);
    const bs = smap.get(bt.subTemplateRef), engine = (bs.engineId || bs.id) + '_K' + String(kTxt).padStart(3, '0');
    const sub = clone(bs);
    for (const e of sub.entries) if (e.role === 'burst') {
      e.native.EffectScale = {X: round(e.native.EffectScale.X * k), Y: round(e.native.EffectScale.Y * k), Z: round(e.native.EffectScale.Z * k)};
      e.preview = {...e.preview, diameterM: round(e.preview.diameterM * k)};
    }
    Object.assign(sub, {name: `${bt.name}·${k < 1 ? '略小' : '略大'}×${k}`, id: engine, engineId: engine, key: engine + '@1', version: 1,
      derivedFrom: {...(bs.derivedFrom || {}), sizeOf: bs.key, burstScaleExtra: k, rule: '同一花型，只缩放球花条目（尾缀与开花点不动）', by: '本机同步（8）2026-10-11，用户 23:41', engineScaleVerified: true}});
    doc.subTemplateLibrary.push(sub);
    doc.templateLibrary.push({...clone(bt), id, name: sub.name, diameter: round(bt.diameter * k), width: round(bt.diameter * k), subTemplateRef: sub.key});
    DER_SRC.set(id, DER_SRC.get(baseId) || baseId);
  }
}

// —— B04（22，用户 10-14 01:27）：新尾缀 Tiny / XS（协作/编排B01/新尾缀.json；ResourceFX 行名是占位，用户加行后只改那里重编）——
//   ① 片段带 trail='Tiny'：同一花型（含大小版本）只把小号尾缀换成 Tiny，另存 <花型>__TINY；球花开在 Tiny 终点（开花点按 k 沿尾缀方向收）、
//      局部延迟 = Tiny 升空时间。applyTrailV2 只认 S / M / L 三根，不会再缩它。
//   ② 前台小花（协作/编排B01/前台小花.json）：XS 尾缀（不缩放，固化倾角）+ 现成小花 EffectScale 缩小挂在 XS 终点，在 XS 到顶时开。
//   旧方案没有 trail 字段、不用前台小花，不进这一段，产物逐字节不变。
const NEWT = JSON.parse(fs.readFileSync(path.join(ROOT, '协作/编排B01/新尾缀.json'), 'utf8'));
for (const [a, k] of Object.entries(NEWT.aliases || {})) NEWT.trails[a] ??= NEWT.trails[k];   // B05：键按用途（Low80 / Front62），B04 的旧键 Tiny / XS 指向同一根
const FRONTF = JSON.parse(fs.readFileSync(path.join(ROOT, '协作/编排B01/前台小花.json'), 'utf8'));
{ const mv = FRONTF.mobileVariant;   // B05：小平台手游版（花换成手游 6 种里的分裂星），同 编排B01.py
  if (mv) for (const x of [...FRONTF.flowers]) if (x.flowers.length) FRONTF.flowers.push({...x, code: x.code + mv.codeSuffix, id: x.id + mv.idSuffix, engineId: x.engineId + mv.idSuffix,
    name: x.name + mv.nameSuffix, zh: x.zh.split('·').slice(0, -1).join('·') + '·' + FRONTF.flowerSources[mv.src].zh, flowers: x.flowers.map(f => ({...f, src: mv.src})), mobileOf: x.code, from: null}); }
const tidOf = c => c.trail ? `${c.templateId}__${c.trail.toUpperCase()}` : c.templateId;
const b04Report = {tiny: [], front: [], placeholders: Object.fromEntries(Object.entries(NEWT.trails).map(([k, v]) => [k, {resourceId: v.resourceId, confirmed: v.confirmed}]))};
const newTrail = (e, tr) => {   // 把一条尾缀条目换成新尾缀（行名占位时 resourceSource 标出来）
  e.native.FXResourceId = tr.resourceId; e.baseTemplateRef = tr.resourceId + '|trail';
  e.preview = {...e.preview, heightM: tr.burstM, durationS: tr.riseS};
  e.resourceSource = {table: e.resourceSource?.table, rowName: tr.confirmed ? (tr.rowName || tr.resourceId) : `（待加行：${tr.resourceId}）`, particle: tr.particle, placeholder: !tr.confirmed};
  return e;
};
{
  const tmap = new Map(doc.templateLibrary.map(t => [t.id, t])), smap = new Map(doc.subTemplateLibrary.map(s => [s.key, s]));
  for (const id of [...new Set(logic.cues.filter(c => c.trail).map(tidOf))]) {
    const c0 = logic.cues.find(c => tidOf(c) === id), tr = NEWT.trails[c0.trail], bt = tmap.get(c0.templateId);
    if (!tr || !bt) throw Error('新尾缀或原花型不存在：' + id);
    const bs = smap.get(bt.subTemplateRef), sub = clone(bs), tails = sub.entries.filter(e => e.role === 'trail');
    if (tails.length !== 1 || tails[0].native.FXResourceId !== 'P_EFX_FireWorks_NY_Trail_Small') throw Error(c0.trail + ' 只换小号尾缀：' + id);
    const t = tails[0], p0 = t.native.PositionOffset, riseOld = t.preview.durationS;
    let zOld = 0, zNew = 0;
    for (const e of sub.entries.filter(e => e.role === 'burst')) {
      const p = e.native.PositionOffset;
      zOld = Math.max(zOld, p.Z / 100);
      e.native.PositionOffset = {X: round(p0.X + (p.X - p0.X) * tr.k), Y: round(p0.Y + (p.Y - p0.Y) * tr.k), Z: round(p0.Z + (p.Z - p0.Z) * tr.k)};
      e.native.LocalTimeOffset = round(e.native.LocalTimeOffset - riseOld + tr.riseS);
      zNew = Math.max(zNew, e.native.PositionOffset.Z / 100);
    }
    newTrail(t, tr);
    const engine = (bs.engineId || bs.id) + '_' + c0.trail;
    Object.assign(sub, {name: `${bt.name}·${tr.zh.split(' ')[0]}`, id: engine, engineId: engine, key: engine + '@1', version: 1,
      sizeEvidence: {...sub.sizeEvidence, tailScale: 1, endpointM: tr.burstM, source: `${tr.zh}：烘焙器导出值（${tr.export.split('（')[0]}），未在 UE 量`, enginePlaybackVerified: false},
      newTrail: {trail: c0.trail, resourceId: tr.resourceId, confirmed: tr.confirmed, particle: tr.particle, k: tr.k, riseS: tr.riseS},
      derivedFrom: {...(bs.derivedFrom || {}), trailOf: bs.key, rule: '同一花型，只把小号尾缀换成新尾缀，开花点沿尾缀方向按 k 收到新终点、局部延迟换成新升空时间', by: '跨年秀（22）2026-10-14，用户 01:27', engineScaleVerified: false}});
    doc.subTemplateLibrary.push(sub);
    doc.templateLibrary.push({...clone(bt), id, name: sub.name, z: round(bt.z - zOld + zNew), burstZ: round(bt.burstZ - zOld + zNew), flightHeight: tr.burstM,
      rise: tr.riseS, recipeDuration: round(tr.riseS + bt.life), subTemplateRef: sub.key, numericSource: 'b04_new_trail_20261014', engineSizeVerified: false});
    DER_SRC.set(id, DER_SRC.get(c0.templateId) || c0.templateId);
    b04Report.tiny.push({id, engineId: engine, burstM: round(zNew - p0.Z / 100), riseS: tr.riseS});
  }
  const front = new Map(FRONTF.flowers.map(x => [x.id, x])), tr = NEWT.trails[FRONTF.trail];
  const sTrail = smap.get(tmap.get('R03_SilverChry').subTemplateRef).entries.find(e => e.role === 'trail');
  for (const id of [...new Set(logic.cues.map(c => c.templateId).filter(id => front.has(id)))]) {
    const x = front.get(id), entries = [], tips = [];
    x.trails.forEach((t, i) => {
      const e = newTrail(clone(sTrail), tr);
      e.id = `trail-${i}`;
      Object.assign(e.native, {LocalTimeOffset: round(t.off), PositionOffset: {X: 0, Y: 0, Z: 0}, RotationOffset: {Pitch: 0, Yaw: 0, Roll: round(t.roll)},
        RandomRotationRange: {Pitch: 0, Yaw: 0, Roll: round(t.randomRoll || 0)}, EffectScale: {X: 1, Y: 1, Z: 1}});
      entries.push(e);
    });
    x.flowers.forEach((f, i) => {
      const src = FRONTF.flowerSources[f.src], st = tmap.get(src.template), sb = smap.get(st.subTemplateRef).entries.find(e => e.role === 'burst'), t = x.trails[f.trail];
      const a = t.roll * Math.PI / 180, k = f.diameter / (src.nativeM || st.diameter), e = clone(sb);
      e.id = `flower-${i}`;
      Object.assign(e.native, {LocalTimeOffset: round(t.off + tr.riseS), PositionOffset: {X: 0, Y: round(-Math.sin(a) * tr.burstM * 100), Z: round(Math.cos(a) * tr.burstM * 100)},
        RotationOffset: {Pitch: 0, Yaw: 0, Roll: 0}, EffectScale: src.nativeM ? {X: round(k), Y: round(k), Z: round(k)} : {X: round(sb.native.EffectScale.X * k), Y: round(sb.native.EffectScale.Y * k), Z: round(sb.native.EffectScale.Z * k)}});
      if (src.resource && src.resource !== e.native.FXResourceId) {   // B05：小平台专用资源（2800–2803）
        e.native.FXResourceId = src.resource; e.baseTemplateRef = src.resource + '|burst'; e.resourceSource = {table: e.resourceSource?.table, rowName: src.rowName || src.resource};
      }
      e.preview = {...e.preview, diameterM: f.diameter};
      entries.push(e); tips.push({z: Math.cos(a) * tr.burstM, t: t.off + tr.riseS, end: t.off + tr.riseS + st.life});
    });
    const sub = {name: x.name, category: x.flowers.length ? 'ball' : 'trail', seed: 1, randomMode: 'materialized', entries, id: x.engineId, engineId: x.engineId, key: x.engineId + '@' + (x.version || 1), version: x.version || 1,   // B07 修订1：对称同时的倾角是版本 2
      sizeEvidence: {trailEndpointM: tr.burstM, trailRiseS: tr.riseS, source: `${tr.userName || 'XS'} 尾缀烘焙器导出值（${tr.export.split('（')[0]}）；小花 EffectScale 缩小，未在 UE 量`, enginePlaybackVerified: false},
      newTrail: {trail: FRONTF.trail, resourceId: tr.resourceId, confirmed: tr.confirmed, particle: tr.particle},
      derivedFrom: {rule: '通用尾缀 XS（不缩放、固化倾角）+ 现成小花缩小挂在 XS 终点；不新增资源', by: '跨年秀（22）2026-10-14，用户 01:27（看板 i12）', from: x.from, engineScaleVerified: false}};
    doc.subTemplateLibrary.push(sub);
    const flight = tips.length ? Math.max(...tips.map(t => t.z)) : tr.burstM, rise = tips.length ? Math.min(...tips.map(t => t.t)) : 0;
    const end = Math.max(...x.trails.map(t => t.off + tr.durationS), ...tips.map(t => t.end));
    const proto = tmap.get(FRONTF.flowerSources[x.flowers[0]?.src || 'SC'].template), dia = Math.max(0, ...x.flowers.map(f => f.diameter));
    doc.templateLibrary.push({...clone(proto), id: x.id, name: x.name, zone: 'front', kind: x.kind || 'small', shape: x.kind === 'comet' ? 'comet' : 'sphere', diameter: dia, width: dia,
      flightHeight: round(flight), z: round(50 + flight), burstZ: round(50 + flight), rise: round(rise), life: round(end - rise), recipeDuration: round(end), subTemplateRef: sub.key,
      numericSource: 'b04_front_flower_20261014', engineSizeVerified: false, color: x.flowers.length ? FRONTF.flowerSources[x.flowers[0].src].color : tr.color});
    DER_SRC.set(x.id, proto.id);
    b04Report.front.push({id: x.id, engineId: x.engineId, from: x.from, trails: x.trails.length, flowers: x.flowers.length, flightM: round(flight), rise: round(rise), end: round(end)});
  }
}

// —— B02（22，10-12，用户 20:18）：小平台小花束尾——现成银扇 / 红彗星单束缩小当尾缀（固化随机角），现成小花缩小挂在束顶；
//    定义在 协作/编排B01/小花束尾.json（编排B01.py 共用）。束长和挂花时刻是估的（estimate），UE 量到后改那三个数重编。 ——
const BEAMF = JSON.parse(fs.readFileSync(path.join(ROOT, '协作/编排B01/小花束尾.json'), 'utf8'));
const beamReport = [];
if (B02) {
  const tmap = new Map(doc.templateLibrary.map(t => [t.id, t])), smap = new Map(doc.subTemplateLibrary.map(s => [s.key, s])), est = BEAMF.estimate;
  for (const x of BEAMF.flowers) {
    const entries = [], tips = [];
    x.beams.forEach((b, i) => {
      const ss = smap.get(tmap.get(BEAMF.beamSources[b.res].template).subTemplateRef);
      const proto = ss.entries.find(e => e.native.FXResourceId === b.res);
      if (!proto) throw Error('小花束尾的束资源找不到原型：' + b.res);
      const e = clone(proto);
      e.id = `beam-${i}`; e.role = 'trail';
      Object.assign(e.native, {LocalTimeOffset: round(b.off), PositionOffset: {X: 0, Y: 0, Z: 0}, RotationOffset: {Pitch: 0, Yaw: 0, Roll: round(b.roll)},
        RandomRotationRange: {Pitch: 0, Yaw: 0, Roll: round(b.randomRoll || 0)}, EffectScale: {X: round(b.scale), Y: round(b.scale), Z: round(b.scale)}});
      e.preview = {...e.preview, heightM: round(est.beamReachM[b.res] * b.scale)};
      entries.push(e);
    });
    x.flowers.forEach((f, i) => {
      const src = BEAMF.flowerSources[f.src], st = tmap.get(src.template), sb = smap.get(st.subTemplateRef).entries.find(e => e.role === 'burst'), b = x.beams[f.beam];
      const R = est.beamReachM[b.res] * b.scale * est.tipFrac, a = b.roll * Math.PI / 180, k = f.diameter / st.diameter;
      const e = clone(sb);
      e.id = `flower-${i}`;
      Object.assign(e.native, {LocalTimeOffset: round(b.off + est.tipTimeS), PositionOffset: {X: 0, Y: round(-Math.sin(a) * R * 100), Z: round(Math.cos(a) * R * 100)},
        RotationOffset: {Pitch: 0, Yaw: 0, Roll: 0}, EffectScale: {X: round(sb.native.EffectScale.X * k), Y: round(sb.native.EffectScale.Y * k), Z: round(sb.native.EffectScale.Z * k)}});
      e.preview = {...e.preview, diameterM: f.diameter};
      entries.push(e); tips.push({z: Math.cos(a) * R, t: b.off + est.tipTimeS});
    });
    const sub = {name: x.name, category: x.flowers.length ? 'ball' : 'trail', seed: 1, randomMode: 'materialized', entries, id: x.engineId, engineId: x.engineId, key: x.engineId + '@1', version: 1,
      sizeEvidence: {beamReachM: est.beamReachM, tipFrac: est.tipFrac, tipTimeS: est.tipTimeS, source: '估算：束长取基础资源预览值，挂花点与时刻未在 UE 量', enginePlaybackVerified: false},
      derivedFrom: {rule: '现成单束缩小当尾缀（固化随机角）+ 现成小花缩小挂束顶；不新增资源', by: '跨年秀（22）2026-10-12，用户 20:18', ref: x.ref, engineScaleVerified: false}};
    doc.subTemplateLibrary.push(sub);
    const flight = tips.length ? Math.max(...tips.map(t => t.z)) : Math.max(...x.beams.map(b => est.beamReachM[b.res] * b.scale));
    const proto = tmap.get(BEAMF.flowerSources[x.flowers[0]?.src || 'SC'].template), dia = Math.max(0, ...x.flowers.map(f => f.diameter));
    const rise = tips.length ? Math.min(...tips.map(t => t.t)) : 0, end = Math.max(...entries.map(e => e.native.LocalTimeOffset + e.preview.durationS));
    doc.templateLibrary.push({...clone(proto), id: x.id, name: x.name, zone: 'front', kind: x.kind || 'small', shape: x.kind === 'comet' ? 'comet' : 'sphere', diameter: dia, width: dia,
      flightHeight: round(flight), z: round(50 + flight), burstZ: round(50 + flight), rise: round(rise), life: round(end - rise), recipeDuration: round(end), subTemplateRef: sub.key, numericSource: 'beam_flower_composite_20261012', engineSizeVerified: false,
      color: x.flowers.length ? BEAMF.flowerSources[x.flowers[0].src].color : BEAMF.beamSources[x.beams[0].res].color});
    DER_SRC.set(x.id, proto.id);
    beamReport.push({id: x.id, engineId: x.engineId, beams: x.beams.length, flowers: x.flowers.length, flightM: round(flight)});
  }
}

// —— 原型：每种花型取一条 R04 的 cue / event 当字段模板（只改时间 / 点位 / 编号） ——
const eventProto = new Map(), cueProto = new Map();
for (const e of doc.events) if (!eventProto.has(e.templateId)) eventProto.set(e.templateId, e);
for (const c of doc.cues) if (!cueProto.has(c.templateId)) cueProto.set(c.templateId, c);
for (const [id, src] of DER_SRC) { eventProto.set(id, eventProto.get(src)); cueProto.set(id, cueProto.get(src)); }   // 大号花型借原花的字段模板
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
  const tid = tidOf(c);   // B04：带新尾缀的片段用 <花型>__TINY
  const tpl = templates.get(tid);
  if (!tpl) throw Error('找不到花型 ' + tid);
  const ep = eventProto.get(tid);
  if (!ep) throw Error('R04 里没有 ' + tid + ' 的事件原型');
  const evs = c.events.map((e, i) => {
    const ev = clone(ep);
    for (const k of ['choreographyInstance', 'effectiveLaunch', 'effectiveBurst', 'effectiveEnd', 'launchJitterS', 'jitterKey', 'sectionId', 'phase', 'groupId']) delete ev[k];
    Object.assign(ev, {id: `${c.id}_E${String(i + 1).padStart(2, '0')}`, pointId: e.point, point: e.point, templateId: tid, template: tid, cueId: c.id,
      launch: round(e.launch), dt: 0, dz: e.dz, scale: 1, zone: tpl.zone ?? 'dam', burst: round(e.burst), end: round(e.end), recipeRef: tpl.subTemplateRef});
    if (tpl.shape === 'fan' || c.size === 'F') { ev.beams = ev.beams ?? 1; ev.beamGap = ev.beamGap ?? 0; ev.dir = ev.dir ?? 'L'; ev.tilt = ev.tilt ?? 0; }
    else { delete ev.beams; delete ev.beamGap; delete ev.dir; delete ev.tilt; }
    return ev;
  });
  doc.events.push(...evs);
  const cp = cueProto.get(tid) ?? {};
  const cue = {id: c.id, name: c.name, templateId: tid, pointIds: c.points, enabled: true, sourceMethod: 'visual_editor', groupingSource: 'visual_editor',
    eventIds: evs.map(e => e.id), start: Math.min(...evs.map(e => e.launch)), order: c.order, gap: c.gap, sizeScale: 1, designScale: Object.fromEntries(evs.map(e => [e.id, 1])),
    preserveRepeatedEvents: true, edited: true, warnings: [], pattern: `${c.wave ?? ''}｜${c.label}`, programSectionId: c.section, musicBinding: null};
  if (cue.order === 'source' || !['left', 'right', 'center-out', 'outside-in', 'together', 'source'].includes(cue.order)) cue.order = 'source';
  if (c.mobile === false) cue.mobile = false;   // B02：不上手机的片段（一张表里写 PlatformFlags 12）
  if (c.mobile === 'only') cue.mobile = 'only';  // 修订1 手游替身：只上手游（一张表里写 PlatformFlags 2）
  doc.cues.push(cue);
  profiles.medium[c.id] = c.profiles.medium;
  profiles.low[c.id] = c.profiles.low;
}

// —— meta ——
Object.assign(doc.meta, {version: 'nagaoka-logic-v1', duration, savedAt: '2026-10-11', musicOffset: logic.musicOffsetS, compositionRevision: logic.revision, compositionSource: 'score_from_nagaoka_logic_by_bar',
  programFileVersion: FILE_VERSION, sectionsMode: 'user', timeRule: '完整花型调用 / 点间隔 / 开花时刻取 0.1 秒整数倍；固定子模板内部时间原值；B01 无随机错开（点间用固定 0.1–0.3 s 涟漪）。',
  editingRule: '原固定子模板与 20 个基础资源不改；大号 / 主角是同一资源放大升高另存的新固定子模板（协作/编排B01/大号花型.json）；高度偏移只在编排条目里 ±25 m；球花尾缀 scale=1；三档点集从两端往里收，低 ⊂ 中 ⊂ 高。', arrangementTimeGridS: 0.1});
// —— 合并音频（--audio）：节目音频 = 这份文件，演出秒 = 音频秒 ——
let mixAudio = null;
if (audioInput) {
  const file = path.resolve(ROOT, audioInput), bytes = fs.readFileSync(file), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const want = logic.audio?.mix?.sha256;
  if (!want) throw Error('--audio 需要逻辑方案里有 audio.mix.sha256（编排B03_合并音频.py 输出）');
  if (sha256 !== want) throw Error(`--audio 文件指纹 ${sha256.slice(0, 8)}… 和逻辑方案的 ${want.slice(0, 8)}… 不一致`);
  const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, audioDataInput || 'analysis/music/合并音频_VO倒计时.json'), 'utf8'));
  if (data.mix?.sha256 !== sha256 || !data.display?.waveform?.length) throw Error('--audio-data 不是这份音频的分析结果（要有 display，重跑 合并音频分析.py）');
  const ext = path.extname(file).toLowerCase(), mime = {'.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg'}[ext];
  if (!mime) throw Error('--audio 只支持 mp3 / wav / m4a / ogg');
  const title = path.basename(file, ext), duration = data.mix.durationS;
  if (duration > logic.duration) throw Error('音频比节目长');
  mixAudio = {audioRef: {kind: 'embedded', name: path.basename(file), sha256, duration, dataUrl: `data:${mime};base64,${bytes.toString('base64')}`},
    musicData: {title, duration, sampleRate: 44100, channels: 1, sourceSha256: sha256, analysisVersion: 'merged-audio-display-v1', method: data.display.waveformMethod, waveform: data.display.waveform},
    structureData: {version: 'merged-audio-display-v1', sourceSha256: sha256, duration, method: data.display.energyMethod, energy: data.display.energy, energyStep: data.display.energyStep}};
  Object.assign(doc.meta, {musicOffset: 0, musicDuration: duration, musicSourceSha256: sha256, musicTitle: title, musicStatus: 'embedded',
    musicRule: `节目音频 = ${path.basename(file)}（0 s 起播）；原曲《${logic.audio.music?.title || '汪洋与浩渺'}》在音频里 ${logic.audio.musicStartS} s 起，小节网格 ${logic.bar0S} + ${logic.barS}·k`});
}
if (NO_MUSIC) Object.assign(doc.meta, {musicOffset: 0, musicDuration: 0, musicSourceSha256: null, musicTitle: '', musicStatus: 'none', musicRule: '不放音乐（Day 调试版）'});
if (projectId || projectName) Object.assign(doc.meta, {...(projectId ? {programId: projectId} : {}), ...(projectName ? {programName: projectName, name: projectName} : {})});
delete doc.meta.defaultStaggerEnabled;
// —— 修订4：尾缀 v2 开花点（手游编排 10-12，analysis/scripts/尾缀v2开花点.mjs）：引擎尾缀已按尺寸档重导（长度 × k、时间不变），
//   固定子模板的开花点跟着降到新尾缀终点；编排条目（点位、时刻、dz、档位）不动。主角尾缀等 ResourceFX 加行后再换（hero=true）。 ——
const trailV2 = TRAIL_V1 ? null : applyTrailV2(doc, {hero: args.some(a => a.startsWith('--hero-trail')), heroId: HERO_ID});
// —— B07 修订1（22，用户 10-15 12:14「实机手游……尾缀和点灭星的爆发位置不一样」）：--upright = 球花（一根坝顶尾缀 + 花）倾角归 0，
//    花放在尾缀正上方，沿尾缀的距离不变。原来按「Roll 正 → 局部 Y 负」把花挪到斜尾缀顶端，UE 里没实测过；UE4 FRotationMatrix
//    是 Roll 正 → +Z 倒向 +Y（相反，点灭星差 9.8 m）。倾角归 0 后不管引擎往哪边转都对得上（原倾角 ≤ 2°，看不出）。
//    小平台（Tiny 多根斜尾缀 V 形）、扇、小花束尾是有意的倾斜，不动。改过的固定子模板版本号 +1。不带开关时产物不变。 ——
const UPRIGHT = args.includes('--upright');
const uprightReport = [];
if (UPRIGHT) {
  const usedSubs = new Set(logic.cues.map(c => doc.templateLibrary.find(t => t.id === tidOf(c))?.subTemplateRef).filter(Boolean));
  for (const sub of doc.subTemplateLibrary) {
    if (!usedSubs.has(sub.key)) continue;
    const tails = sub.entries.filter(e => e.role === 'trail'), bursts = sub.entries.filter(e => e.role === 'burst');
    if (tails.length !== 1 || !bursts.length || /Tiny|Fan/.test(tails[0].native.FXResourceId)) continue;
    const t = tails[0].native, p0 = t.PositionOffset, rot = t.RotationOffset;
    if (rot.Pitch || rot.Yaw) throw Error('球花尾缀有 Pitch / Yaw，--upright 没处理：' + sub.key);
    const tilted = Math.abs(rot.Roll) > 1e-9 || (t.RandomRotationRange?.Roll || 0) !== 0 || bursts.some(b => Math.abs(b.native.PositionOffset.Y - p0.Y) > 0.5 || Math.abs(b.native.PositionOffset.X - p0.X) > 0.5);
    if (!tilted) continue;
    let moved = 0;
    for (const b of bursts) {
      const p = b.native.PositionOffset, E = Math.hypot(p.X - p0.X, p.Y - p0.Y, p.Z - p0.Z);
      moved = Math.max(moved, Math.hypot(p.X - p0.X, p.Y - p0.Y) / 100);
      b.native.PositionOffset = {X: p0.X, Y: p0.Y, Z: round(p0.Z + E)};
      b.native.RotationOffset = {...b.native.RotationOffset, Roll: 0};
    }
    const rollBefore = rot.Roll;
    t.RotationOffset = {...rot, Roll: 0};
    if (t.RandomRotationRange) t.RandomRotationRange = {...t.RandomRotationRange, Roll: 0};
    const from = sub.key, version = (sub.version || 1) + 1, key = (sub.engineId || sub.id) + '@' + version;
    for (const tp of doc.templateLibrary) if (tp.subTemplateRef === from) tp.subTemplateRef = key;
    for (const x of [...(doc.events || []), ...(doc.cues || [])]) if (x.recipeRef === from) x.recipeRef = key;   // 场内片段钉的固定版本跟着换
    if (sub.coupledVariation) sub.coupledVariation = {...sub.coupledVariation, rollDeg: 0, rollRangeDeg: 0, rollDegBefore: rollBefore};
    Object.assign(sub, {key, version, upright: {from, rollDegBefore: rollBefore, flowerMovedM: round(moved), rule: '倾角归 0，花放尾缀正上方（沿尾缀距离不变）', by: '跨年秀（22）2026-10-15，用户 12:14'}});
    uprightReport.push({key, from, trail: t.FXResourceId.replace('P_EFX_FireWorks_', ''), rollDegBefore: round(rollBefore), flowerMovedM: round(moved)});
  }
}
// —— B05（22，用户 10-14 21:44 改了 ResourceFX 命名）：--resource-map <资源名映射.json>：导演表认 ResourceId（FXResourceId），
//    按映射改名（OrangeGlitter → Glitter 等），行名 / 粒子元数据跟 T05 读回；不带这个开关时什么都不动。 ——
const resourceMapInput = option('resource-map');
let resourceMap = null;
if (resourceMapInput) {
  const rm = JSON.parse(fs.readFileSync(path.resolve(ROOT, resourceMapInput), 'utf8')), rb = JSON.parse(fs.readFileSync(path.resolve(ROOT, rm.readback), 'utf8'));
  const rows = new Map(rb.pc.map(r => [r.ResourceId, r])), ren = rm.renames || {}, renamed = {}, meta = new Set();
  const fix = e => {
    const n = e.native; if (!n?.FXResourceId) return;
    const id0 = n.FXResourceId, id = ren[id0] || id0;
    if (id !== id0) { n.FXResourceId = id; renamed[id0 + ' → ' + id] = (renamed[id0 + ' → ' + id] || 0) + 1; if (e.baseTemplateRef) e.baseTemplateRef = e.baseTemplateRef.replace(id0 + '|', id + '|'); }
    const r = rows.get(id);
    if (r) { e.resourceSource = {...(e.resourceSource || {}), table: rb.tables.pc, rowName: r._row_name, particle: r.FxSP, readAt: rb.readAt}; delete e.resourceSource.placeholder; meta.add(id); }
  };
  for (const sub of doc.subTemplateLibrary) for (const e of sub.entries || []) fix(e);
  for (const r of doc.baseResourceLibrary || []) {
    const id0 = r.id, id = ren[id0] || id0;
    if (id !== id0) { r.id = id; if (r.key) r.key = r.key.replace(id0 + '|', id + '|'); }
    const row = rows.get(id); if (row) r.resourceSource = {...(r.resourceSource || {}), table: rb.tables.pc, rowName: row._row_name, particle: row.FxSP, readAt: rb.readAt};
  }
  resourceMap = {file: resourceMapInput, readback: rm.readback, readAt: rb.readAt, rows, renamed, metadataSynced: meta.size};
}
doc.choreographyLibrary = [];
doc.notices = [];
const finalDoc = normalize(doc);

// —— 音乐标记（演出秒；声学检测，待试听） ——
const hitSet = new Set(['B01_S1', 'B01_S5', 'B01_S9', 'B01_S12', 'B01_S13']);
const grid = logic.bar0S ? `${logic.bar0S} + ${logic.barS}·k` : '5.18 + 1.6216·k';
const musicMarkers = logic.sections.map(s => ({id: `B01_${s.id.slice(4)}`, name: `B01｜${s.name}入口`, time: round(Math.round(s.start * 10) / 10), kind: hitSet.has(s.id) ? 'peak' : 'hit', confidence: `音乐小节网格（${grid}）＋能量分段；待试听`}));
if (logic.musicMarkers) musicMarkers.push(...logic.musicMarkers.map(m => ({...m, time: round(m.time)})));   // B03 起：逻辑方案自带（VO 每一声、零点、用户给定时刻搬到新时间线）
else for (const [t, name, kind] of [[112.2, 'B01｜高潮 II 回归（用户 1:47）', 'peak'], [175.4, 'B01｜⑧ 三主角垂柳墙', 'peak'], [196.5, 'B01｜终和弦 白墙', 'peak'], [10.0, 'B01｜0 点 · 开场高潮', 'peak'], [110.6, 'B01｜静默一小节', 'hit']])
  musicMarkers.push({id: `B01_M${Math.round(t * 10)}`, name, time: t, kind, confidence: '用户给定 / 小节网格；待试听'});
musicMarkers.sort((a, b) => a.time - b.time);

const newPayload = {...payload, doc: finalDoc, profiles, tier: 'high', musicMarkers: NO_MUSIC ? [] : musicMarkers, time: 0, selectedCue: logic.cues[0].id, ...(mixAudio || {}),
  ...(NO_MUSIC ? {audioRef: null, musicData: null, structureData: null} : {})};
const dfshow = {format: 'df.workbench-project/1', project: {id: projectId || base.project.id, name: projectName || base.project.name, version: FILE_VERSION}, payload: newPayload};

// —— 先走 8025 打开 .dfshow 的同一条校验路径 ——
const seed = {sourceSha: payload.sourceSha, musicMarkers: []};
const raw = JSON.stringify(dfshow);
const state = preflightProject(raw, seed);
const errors = [...validateDoc(state.doc), ...validateProfiles(state.doc, state.profiles)];
if (errors.length) throw Error('校验失败：' + errors.slice(0, 5).join('；'));

// —— 三档三表 ——
const occ = {};   // 每档展开成 (组, 时刻, 槽位, 子模板) 计数，用来查低 ⊂ 中 ⊂ 高
const report = {revision: logic.revision, density: DENSITY, rhythm: RHYTHM, derivedFlowers: DERIVED.map(f => f.id), generatedBy: 'analysis/scripts/编排B01_编译.mjs', trailV2, tiers: {}, preflight: 'preflightProject 通过（同 8025 打开 .dfshow）', file: `NewYearFireWorks_v01-${TAG}.dfshow`};
fs.mkdirSync(outDir, {recursive: true});
const onlyMobile = new Set(state.doc.cues.filter(c => c.mobile === 'only').map(c => c.id));
for (const tier of ['high', 'medium', 'low']) {
  const ev = qualityEvents(state.doc, state.profiles, tier).filter(e => !onlyMobile.has(e.cueId));   // 三档三表是 PC 表：只上手游的替身不进
  const r = compileDirector(state.doc, ev, undefined, {});
  if (r.issues.length) throw Error(`${tier} 编译问题：${r.issues.slice(0, 5).join('；')}`);
  const file = path.join(outDir, `三表-${TABLE}-${tier}.json`);
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
  const o = new Map(), stable = new Map((m.templateNaming?.subTemplates || []).map(x => [x.to, x.from]));   // 各档单独命名时同名可能对应不同子模板，按原键比
  for (const g of m.EffectScheduleGroups) for (const s of g.Slots) for (const e of tpls.get(s.TemplateName).Entries) {
    const k = [g.GroupName, Math.round((s.StartTime + e.LocalTimeOffset) * 1000), e.SlotIndex, stable.get(e.SubTemplateName) || e.SubTemplateName].join('|'); o.set(k, (o.get(k) || 0) + 1);
  }
  occ[tier] = o;
}
// —— 档位嵌套：一张表按 MinQualityLevel 嵌套的前提（宪章 §5；修订1 加） ——
const notIn = (a, b) => [...a].reduce((n, [k, v]) => n + Math.max(0, v - (b.get(k) || 0)), 0);
report.tierNesting = {lowNotInMedium: notIn(occ.low, occ.medium), mediumNotInHigh: notIn(occ.medium, occ.high)};
if (report.tierNesting.lowNotInMedium || report.tierNesting.mediumNotInHigh) throw Error('档位不嵌套：' + JSON.stringify(report.tierNesting));
// —— B02：一张导演表（MinQualityLevel 嵌套 + 片段级 PlatformFlags 14 / 12）编一遍；手机三档 = 一张表里 PlatformFlags 含手机（14）的事件按画质切 ——
if (B02) {
  const nested = nestedQualityEvents(state.doc, state.profiles);
  if (nested.issues.length) throw Error('一张表：' + nested.issues[0]);
  // 只上手游写 PlatformFlags 2（工作台支持前在这里补上，和分支 22/mobile-only-cues 的 nestedQualityEvents 同一规则）
  for (const e of nested.events) if (onlyMobile.has(e.cueId)) e.platformFlags = 2;
  const r1 = compileDirector(state.doc, nested.events, undefined, {});
  if (r1.issues.length) throw Error('一张表编译问题：' + r1.issues.slice(0, 3).join('；'));
  fs.writeFileSync(path.join(outDir, `导演表-${TABLE}-一张表.json`), JSON.stringify(r1.manifest, null, 2));
  const rank = {EQuality_VeryLow: 0, EQuality_Medium: 1, EQuality_High: 2};
  const cnt = (flags, maxQ) => nested.events.filter(e => (flags === 'mobile' ? (e.platformFlags & 2) : (e.platformFlags & 4)) && rank[e.minQuality] <= maxQ).length;
  report.oneTable = {events: nested.events.length, flags14: nested.events.filter(e => e.platformFlags === 14).length, flags12: nested.events.filter(e => e.platformFlags === 12).length,
    flags2: nested.events.filter(e => e.platformFlags === 2).length,
    subTemplates: r1.manifest.EffectSubTemplates.length, templates: r1.manifest.EffectTemplates.length, scheduleSlots: r1.manifest.EffectScheduleGroups.reduce((n, g) => n + g.Slots.length, 0),
    pc: {high: cnt('pc', 2), medium: cnt('pc', 1), low: cnt('pc', 0)}, mobile: {high: cnt('mobile', 2), medium: cnt('mobile', 1), low: cnt('mobile', 0)}};
  report.beamFlowers = beamReport;
  report.heroTrailId = HERO_ID;
  if (resourceMap) {   // B05：一张表里每个 FXResourceId 都要在 ResourceFX（T05 读回）里
    const ids = [...new Set(r1.manifest.EffectSubTemplates.flatMap(s => s.Entries.map(e => e.FXResourceId)))].sort();
    report.resources = {readback: resourceMap.readback, readAt: resourceMap.readAt, renamed: resourceMap.renamed, metadataSynced: resourceMap.metadataSynced,
      used: ids.map(id => ({id, rowName: resourceMap.rows.get(id)?._row_name || null})), missing: ids.filter(id => !resourceMap.rows.has(id))};
    if (report.resources.missing.length) console.error('一张表里有 ResourceFX 读回里没有的资源：' + report.resources.missing.join('、'));
  }
}
if (b04Report.tiny.length || b04Report.front.length) report.b04 = b04Report;
if (mobileDerivedReport.length) report.mobileDerived = mobileDerivedReport;
if (UPRIGHT) report.upright = uprightReport;   // B07 修订1：球花倾角归 0   // B05：手游替身花型   // B04：新尾缀片段 / 前台小花（旧方案不出这一项）
report.doc = {cues: finalDoc.cues.length, events: finalDoc.events.length, sections: finalDoc.sections.length, duration: finalDoc.meta.duration, musicOffset: finalDoc.meta.musicOffset, balls: finalDoc.statistics.ballCount, fans: finalDoc.statistics.fanCount};
if (mixAudio) report.audio = {file: mixAudio.audioRef.name, sha256: mixAudio.audioRef.sha256, duration: mixAudio.audioRef.duration, musicOffset: finalDoc.meta.musicOffset, embeddedBytes: Buffer.byteLength(mixAudio.audioRef.dataUrl), markers: musicMarkers.length};
fs.writeFileSync(path.join(outDir, `${TABLE}编排检查.json`), JSON.stringify(report, null, 2));
// D1 / D3 是对比版：不再各带一份 81 MB 音乐（按 sha256 用同一首《汪洋与浩渺》），D2 沿用 22 原来的完整文件
//   --audio 的节目带自己的音频（不是仓库原曲，不能退回 bundled）
const outRaw = MAIN || mixAudio || NO_MUSIC ? raw : JSON.stringify({...dfshow, payload: {...dfshow.payload, audioRef: {kind: 'bundled'}}});
if (!MAIN) preflightProject(outRaw, seed);
fs.writeFileSync(path.join(outDir, `${projectName || 'NewYearFireWorks_v01'}-${TAG}.dfshow`), outRaw);
console.log(JSON.stringify(report, null, 1));
