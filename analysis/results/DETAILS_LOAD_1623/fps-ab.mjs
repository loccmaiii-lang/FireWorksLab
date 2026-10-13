// 选中导演时的编辑器帧率 A/B（本机同步 8，10-13）。只改 Night 导演场景实例内存里的特效 4 个字段，不保存；
// 结束写回 16.0.22 原表（night-instance.json）并逐字段核对、恢复原选中。帧率 = 日志行里的帧号差 / 墙钟时间。
import fs from 'node:fs';
import {request} from '../MOBILE_TEST_20261011/ue.mjs';
import {same} from '../../../tool/workbench/src/engine.mjs';
import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';
import {migrateNumbering} from '../../../tool/workbench/src/point-numbering.mjs';
import {preflightProject} from '../../../tool/workbench/src/program-project.mjs';
import {nestedQualityEvents} from '../../../tool/workbench/src/editing-model.mjs';
import {compileDirector} from '../../../tool/workbench/src/director-model.mjs';
import {size} from './size.mjs';

const INST = '/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const LOG = 'E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const KEYS = ['EffectSubTemplates', 'EffectTemplates', 'EffectScheduleGroups', 'TotalDuration'];
const pick = c => Object.fromEntries(KEYS.map(k => [k, c[k]]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => fs.appendFileSync('fps-ab.log', `${((Date.now() - T0) / 1000).toFixed(1)} ${m}\n`);
const py = async code => {
  const r = await request('/object/call', {path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', function: 'ExecutePythonCommandEx',
    args: {PythonCommand: 'import unreal, json\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private'}}, 120000);
  const d = r.data || r, out = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) out.push(m[1].replace(/\\(.)/g, '$1'));
  if (d.return_value !== true && d.return_value !== 'True') throw Error('py: ' + String(d.out_CommandResult).slice(-300));
  return out;
};
const mark = label => py(`unreal.log('FWLFPS ${label}')`);
const select = paths => py(`acts=[unreal.find_object(None,p) for p in ${JSON.stringify(paths)}]\nunreal.EditorLevelLibrary.set_selected_level_actors([a for a in acts if a])`);

const snap = JSON.parse(fs.readFileSync('night-instance.json', 'utf8')).DefaultConfig;
const W = '../../../tool/workbench/';
const seed = migrateNumbering(JSON.parse(fs.readFileSync(W + 'public/data/score24-v05.json', 'utf8')));
const state = preflightProject(fs.readFileSync('../../../FXtools/节目/云端最新/16.0.22-B02修订2-高差只往上.dfshow', 'utf8'), seed);
const variant = step => {
  const doc = structuredClone(state.doc);
  for (const e of doc.events) e.dz = step === 0 ? 0 : Math.round((e.dz || 0) / step) * step;
  const n = nestedQualityEvents(doc, state.profiles), r = compileDirector(doc, n.events, undefined);
  if (n.issues.length || r.issues.length) throw Error('编译有问题');
  return {...r.arrays, TotalDuration: snap.TotalDuration};
};
const sel0 = JSON.parse((await py(`print('FWLSEL:'+json.dumps([a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()]))`)).find(l => l.startsWith('FWLSEL:')).slice(7));
const cur = (await request('/object/get', {path: INST, properties: ['DefaultConfig', 'bShowActive']}, 180000)).properties;
if (cur.bShowActive) throw Error('导演在播放，停止');
if (!same(cur.DefaultConfig, snap)) throw Error('Night 导演表和 16.0.22 快照不同，停止');
log('baseline ok, selected ' + JSON.stringify(sel0));
const plan = [];
const window = async (label, ms = 6000) => { await sleep(2500); await mark(label + '_a'); const t = Date.now(); await sleep(ms); await mark(label + '_b'); plan.push({label, wallMs: Date.now() - t}); log('measured ' + label); };
const result = {sizes: {}, steps: plan};
try {
  await select([INST]);
  result.sizes['16.0.22（现在）'] = size(snap);
  await window('selected_1622');
  await select([]);
  await window('deselected_1622');
  for (const [label, step] of [['selected_snap10', 10], ['selected_noheight', 0]]) {
    const cfg = variant(step);
    result.sizes[label] = size(cfg);
    await request('/object/set', {path: INST, properties: {DefaultConfig: ueText(cfg)}}, 180000);
    await select([INST]);
    await window(label);
  }
  await request('/object/set', {path: INST, properties: {DefaultConfig: ueText(pick(snap))}}, 180000);
  await select([INST]);
  await window('selected_1622_again');
} catch (e) { result.error = e.message; log('ERR ' + e.message); } finally {
  try { await request('/object/set', {path: INST, properties: {DefaultConfig: ueText(pick(snap))}}, 180000); } catch (e) { log('restore ERR ' + e.message); }
  await select(sel0);
  const after = (await request('/object/get', {path: INST, properties: ['DefaultConfig', 'bShowActive']}, 180000)).properties;
  result.restored = {config: same(after.DefaultConfig, snap), active: after.bShowActive};
  // 解析日志里的帧号
  const st = fs.statSync(LOG), fd = fs.openSync(LOG, 'r'), n = Math.min(st.size, 8e6), buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, st.size - n); fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n').filter(l => l.includes('FWLFPS '));
  const at = lab => { const l = lines.filter(x => x.includes('FWLFPS ' + lab)).at(-1); const m = l && /^\[(\d+)\.(\d+)\.(\d+)-(\d+)\.(\d+)\.(\d+):(\d+)\]\[\s*(\d+)\]/.exec(l); return m && {t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]), f: +m[8]}; };
  for (const s of plan) {
    const a = at(s.label + '_a'), b = at(s.label + '_b');
    if (!a || !b) { s.fps = null; continue; }
    const frames = (b.f - a.f + 1000) % 1000, sec = (b.t - a.t) / 1000;
    s.frames = frames; s.sec = sec; s.fps = +(frames / sec).toFixed(1); s.msPerFrame = +(1000 * sec / frames).toFixed(0);
  }
  fs.writeFileSync('fps-ab.json', JSON.stringify(result, null, 1));
  console.log(JSON.stringify({restored: result.restored, error: result.error, steps: plan.map(s => [s.label, s.fps, s.msPerFrame])}));
}
