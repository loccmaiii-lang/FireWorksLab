// 第三轮（本机同步 8，10-13）：蓝图窗口已关，选中导演时 16.0.22 原表 vs 16.0.23 修订3 表的帧率；再测不选中的底。
// 只改 Night 场景实例内存里特效 4 个字段，测完写回 16.0.22 原表并逐字段核对、恢复原选中。不保存。
import fs from 'node:fs';
import {request} from '../MOBILE_TEST_20261011/ue.mjs';
import {same} from '../../../tool/workbench/src/engine.mjs';
import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';
const INST = '/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const LOG = 'E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const KEYS = ['EffectSubTemplates', 'EffectTemplates', 'EffectScheduleGroups', 'TotalDuration'];
const pick = c => Object.fromEntries(KEYS.map(k => [k, c[k]]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => fs.appendFileSync('fps-ab3.log', `${((Date.now() - T0) / 1000).toFixed(1)} ${m}\n`);
const py = async code => {
  const r = await request('/object/call', {path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', function: 'ExecutePythonCommandEx',
    args: {PythonCommand: 'import unreal, json\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private'}}, 120000);
  const d = r.data || r, out = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) out.push(m[1].replace(/\\(.)/g, '$1'));
  if (d.return_value !== true && d.return_value !== 'True') throw Error('py: ' + String(d.out_CommandResult).slice(-300));
  return out;
};
const mark = label => py(`unreal.log('FWLFPS3 [${label}]')`);
const select = paths => py(`acts=[unreal.find_object(None,p) for p in ${JSON.stringify(paths)}]\nunreal.EditorLevelLibrary.set_selected_level_actors([a for a in acts if a])`);
const steps = [];
const measure = async (label, ms = 8000) => { await sleep(3000); await mark(label + '|a'); await sleep(ms); await mark(label + '|b'); steps.push({label}); log('measured ' + label); };
const snap = JSON.parse(fs.readFileSync('night-instance.json', 'utf8')).DefaultConfig;
const r3 = JSON.parse(fs.readFileSync('../../../FXtools/节目/NewYearFireWorks_v01/导演表-B02r3-一张表.json', 'utf8'));
const cfg3 = {EffectSubTemplates: r3.EffectSubTemplates, EffectTemplates: r3.EffectTemplates, EffectScheduleGroups: r3.EffectScheduleGroups, TotalDuration: snap.TotalDuration};
const sel0 = JSON.parse((await py(`print('FWLSEL:'+json.dumps([a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()]))`)).find(l => l.startsWith('FWLSEL:')).slice(7));
const cur = (await request('/object/get', {path: INST, properties: ['DefaultConfig', 'bShowActive']}, 180000)).properties;
if (cur.bShowActive) throw Error('导演在播放，停止');
if (!same(cur.DefaultConfig, snap)) throw Error('Night 导演表和 16.0.22 快照不同，停止');
const result = {sel0, steps};
try {
  await select([]); await measure('deselected');
  await select([INST]); await measure('selected_1622');
  await request('/object/set', {path: INST, properties: {DefaultConfig: ueText(cfg3)}}, 180000);
  const back = (await request('/object/get', {path: INST, properties: ['DefaultConfig']}, 180000)).properties.DefaultConfig;
  result.r3Readback = same(pick(back), cfg3);
  await select([]); await select([INST]); await measure('selected_1623');
} catch (e) { result.error = e.message; log('ERR ' + e.message); } finally {
  try { await request('/object/set', {path: INST, properties: {DefaultConfig: ueText(pick(snap))}}, 180000); } catch (e) { log('restore ERR ' + e.message); }
  await select(sel0);
  const after = (await request('/object/get', {path: INST, properties: ['DefaultConfig', 'bShowActive']}, 180000)).properties;
  result.restored = {config: same(after.DefaultConfig, snap), active: after.bShowActive};
  const st = fs.statSync(LOG), fd = fs.openSync(LOG, 'r'), n = Math.min(st.size, 8e6), buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, st.size - n); fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n').filter(l => l.includes('FWLFPS3 ['));
  const at = lab => { const l = lines.filter(x => x.includes('FWLFPS3 [' + lab + ']')).at(-1); const m = l && /^\[(\d+)\.(\d+)\.(\d+)-(\d+)\.(\d+)\.(\d+):(\d+)\]\[\s*(\d+)\]/.exec(l); return m && {t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]), f: +m[8]}; };
  for (const s of steps) { const a = at(s.label + '|a'), b = at(s.label + '|b'); if (!a || !b) continue; const fr = (b.f - a.f + 1000) % 1000, sec = (b.t - a.t) / 1000; Object.assign(s, {frames: fr, sec, fps: +(fr / sec).toFixed(1), ms: Math.round(1000 * sec / fr)}); }
  fs.writeFileSync('fps-ab3.json', JSON.stringify(result, null, 1));
  console.log(JSON.stringify({error: result.error, r3Readback: result.r3Readback, restored: result.restored, steps: steps.map(s => [s.label, s.fps, s.ms])}));
}
