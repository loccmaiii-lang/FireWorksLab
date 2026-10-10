// 只生成隔离设计数据；不启动应用、不烘焙、不修改生产配方。
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {taskOf} from './model.mjs';
const dir = new URL('./', import.meta.url), root = new URL('../../../../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const types = read('tool/src/js/10_types.js'), panel = read('tool/src/js/71_panel43.js'), ui = read('tool/src/js/70_ui.js');
const util = read('tool/src/js/00_util.js');
const line = (text, name) => {
  const found = text.match(new RegExp('^const ' + name + ' = .+;$', 'm'));
  if (!found) throw Error('找不到源码定义：' + name);
  return found[0];
};
const contract = [
  '// 隔离样板的纯函数桥接；以下定义逐字摘自源码。生成器维护，不手改。',
  'const state = {tab:"master", repId:null};',
  line(util, 'clamp'), line(util, 'G'),
  line(read('tool/src/js/45_physbody.js'), 'isPhysBody'),
  line(read('tool/src/js/47_risetail.js'), 'rtVtOf'),
  panel.slice(0, panel.indexOf('function p43Label')),
  ui.slice(ui.indexOf('const AUTO_DEF ='), ui.indexOf('// 4.9.5：「单格」')),
  ui.slice(ui.indexOf('const GRID_OPTS ='),ui.indexOf('const FORM_NOTES =')),
  read('tool/src/js/50_bake.js').slice(read('tool/src/js/50_bake.js').indexOf('function bakeKind(P)'),read('tool/src/js/50_bake.js').indexOf('// 4.9.27 这一层')),
  'window.ParameterSource = {version:VERSION, schema:SCHEMA, defaultsFor, typeNames:TYPE_NAMES, typeGroups:TYPE_GROUPS, auto:AUTO_DEF, autoLinked, inertWhy, legacyOf, legacyInUse, spread:SPREAD_VIEW, applyShellNo, retimeP, retimeM, tempoOf, shellCompact:tempoShellCompact, tierTypes:TYPES, familyOf, blankHas, formOptions,gridOptions:GRID_OPTS,bakeKind,usesTickPlan40,isSeq,unitAllowed};'
].join('\n');
fs.writeFileSync(new URL('source-contract.js', dir), contract);
const ctx = vm.createContext({window:{}});
vm.runInContext(types, ctx);
vm.runInContext(read('tool/src/js/12_tempo.js'), ctx);
vm.runInContext(contract, ctx);
const source = ctx.window.ParameterSource;
const mapping = JSON.parse(fs.readFileSync(new URL('../full-sample/sample-data.json', dir), 'utf8'));
if (source.version !== mapping.summary.bakerVersion) throw Error('字段映射与当前源码版本不一致');
const cases = Object.keys(source.typeNames).map(id => {
  const defaults = source.defaultsFor(id);
  return {id, name:source.typeNames[id], family:source.familyOf(id), ...JSON.parse(JSON.stringify(defaults))};
});
// 接续用户已看过的千轮18字段样板值，不改TYPES或生产默认。
Object.assign(cases.find(c=>c.id==='senrin').P, mapping.sample);
// 保留所有源出现ID；渲染时只折叠同一对象同一存储路径的重复出现。
const rows = mapping.rows.map(row => ({...row}));
const extras = mapping.extras;
const manifest = {
  sourceVersion: source.version, sourceRows: rows.length, sourceExtras: extras.length,
  cases: cases.length, generatedOn:'2026-10-10',sampleOverrides:{senrin:Object.keys(mapping.sample)},
  sources: ['tool/src/js/10_types.js','tool/src/js/12_tempo.js','tool/src/js/70_ui.js','tool/src/js/71_panel43.js','tool/src/js/45_physbody.js','tool/src/js/47_risetail.js','tool/src/js/50_bake.js'].map(file => ({file,sha256:crypto.createHash('sha256').update(read(file)).digest('hex')})),
  layouts:['continuous','modules','tasks'], sameFieldIds:rows.map(r=>r.occurrenceId).concat(extras.map(r=>r.fieldId)),
};
fs.writeFileSync(new URL('data.json', dir), JSON.stringify({manifest,cases,rows,extras},null,2)+'\n');
fs.writeFileSync(new URL('manifest.json', dir), JSON.stringify(manifest,null,2)+'\n');
const positions=[...rows,...extras].map(row=>{
  const isSchema=!!row.occurrenceId,object=row.emitter||(['M','L'].includes(row.scope)?'效果':'输出');
  const inPrototype=isSchema||/^(SPEC-|MAT-|LAYER-(delay|scale|rate|mirror)$|UI-(q|changed|en|mopen|ropen|tab)$|NAV-type$)/.test(row.fieldId);
  const module=row.module||(row.scope==='M'?'本层颜色':row.scope==='L'?'位置与时间':row.key==='form'?'产物':'帧数与贴图');
  const task=taskOf({...row,module},object);
  const base=`当前效果 / 当前层 / ${object}`;
  const viewPosition={'UI-q':'编辑器标题下 / 搜索当前对象参数','UI-changed':'编辑器标题下 / 仅改动','UI-en':'编辑器标题下 / 英文名','UI-mopen':'当前对象 / 模块标题 / 展开状态','UI-ropen':'当前对象 / 母参数 / 随机展开状态','UI-tab':'左侧 / 当前层作用对象','NAV-type':'左侧 / 花型选择'}[row.fieldId];
  const containerAlias=['info:specBox','info:specMore'].includes(row.key);
  return {id:row.occurrenceId||row.fieldId,fieldId:row.fieldId,key:row.key,dataPath:row.dataPath,oldPosition:row.oldPosition||row.registryPosition||row.source,
    continuous:viewPosition||(inPrototype?`${base} / ${task} / ${module} / ${row.label}`:'沿用生产入口；本轮不重复制作'),
    modules:viewPosition||(inPrototype?`${base} / ${module} / ${row.label}`:'沿用生产入口；本轮不重复制作'),
    tasks:viewPosition||(inPrototype?`${base} / ${task} / ${module} / ${row.label}`:'沿用生产入口；本轮不重复制作'),
    status:containerAlias?'由 SPEC 控件展示的容器；不重复生成字段':row.kind==='info'?'需烘焙回执；样板无假结果':inPrototype?'同一控件模型，按源码条件展示':'既有导航/执行/别名；保留原功能',source:row.source};
});
fs.writeFileSync(new URL('位置对齐.json',dir),JSON.stringify(positions,null,2)+'\n');
const columns=Object.keys(positions[0]),csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync(new URL('位置对齐.csv',dir),'\ufeff'+[columns.join(','),...positions.map(row=>columns.map(c=>csv(row[c])).join(','))].join('\n')+'\n');
console.log(JSON.stringify({version:source.version,rows:rows.length,extras:extras.length,cases:cases.length}));
