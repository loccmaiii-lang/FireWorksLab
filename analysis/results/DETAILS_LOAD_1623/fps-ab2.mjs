// 第二轮（本机同步 8，10-13）：没选中导演时还有 ~114 ms/帧，查是不是导演蓝图编辑器（类默认值里也是同一张大表）。
// 步骤：取消选中测 → 关掉 Night 导演蓝图的编辑器窗口测 → 选中导演测 → 取消选中、从 86 s 起预览测（看预览不选中能不能照常放）→ 停止。
// 不写导演表；只改选中、关蓝图窗口、预览用的 Debug 字段（结束恢复原值）。
import fs from 'node:fs';
import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const INST = '/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const BP = '/Game/BluePrints/ShowDirector/Instance/Ma5_NewYearFireworks/BP_NewYearFireworks_ShowDirector_Night';
const LOG = 'E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => fs.appendFileSync('fps-ab2.log', `${((Date.now() - T0) / 1000).toFixed(1)} ${m}\n`);
const py = async code => {
  const r = await request('/object/call', {path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', function: 'ExecutePythonCommandEx',
    args: {PythonCommand: 'import unreal, json\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private'}}, 120000);
  const d = r.data || r, out = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) out.push(m[1].replace(/\\(.)/g, '$1'));
  if (d.return_value !== true && d.return_value !== 'True') throw Error('py: ' + String(d.out_CommandResult).slice(-300));
  return out;
};
const mark = label => py(`unreal.log('FWLFPS2 [${label}]')`);
const select = paths => py(`acts=[unreal.find_object(None,p) for p in ${JSON.stringify(paths)}]\nunreal.EditorLevelLibrary.set_selected_level_actors([a for a in acts if a])`);
const steps = [];
const measure = async (label, ms = 6000) => { await sleep(2500); await mark(label + '|a'); await sleep(ms); await mark(label + '|b'); steps.push({label}); log('measured ' + label); };
const sel0 = JSON.parse((await py(`print('FWLSEL:'+json.dumps([a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()]))`)).find(l => l.startsWith('FWLSEL:')).slice(7));
const dbg0 = (await request('/object/get', {path: INST, properties: ['DebugPlatform', 'DebugQualityLevel', 'DebugPreviewStartTime', 'bShowActive']})).properties;
if (dbg0.bShowActive) throw Error('导演在播放，停止');
const result = {sel0, dbg0, steps};
try {
  await select([]); await measure('deselected');
  await py(`unreal.get_editor_subsystem(unreal.AssetEditorSubsystem).close_all_editors_for_asset(unreal.load_asset('${BP}'))`);
  log('closed BP editor'); await measure('deselected_bp_closed');
  await select([INST]); await measure('selected_bp_closed');
  await select([]);
  const base = new Set(((await request('/object/search', {class: 'ParticleSystemComponent', limit: 5000}, 60000)).objects || []).map(o => o.path));
  await request('/object/set', {path: INST, properties: {DebugPlatform: 'None', DebugQualityLevel: 'EQuality_High', DebugPreviewStartTime: 86}});
  await request('/object/call', {path: INST, function: 'DebugPreviewShow', args: {}});
  await measure('preview_deselected', 5000);
  const now = ((await request('/object/search', {class: 'ParticleSystemComponent', limit: 5000}, 60000)).objects || []).filter(o => !base.has(o.path));
  result.previewNewComponents = now.length; log('preview new components ' + now.length);
} catch (e) { result.error = e.message; log('ERR ' + e.message); } finally {
  try { await request('/object/call', {path: INST, function: 'DebugStopShow', args: {}}); } catch {}
  await request('/object/set', {path: INST, properties: {DebugPlatform: dbg0.DebugPlatform, DebugQualityLevel: dbg0.DebugQualityLevel, DebugPreviewStartTime: dbg0.DebugPreviewStartTime}});
  await select(sel0);
  const after = (await request('/object/get', {path: INST, properties: ['DebugPlatform', 'DebugQualityLevel', 'DebugPreviewStartTime', 'bShowActive']})).properties;
  result.restored = after;
  const st = fs.statSync(LOG), fd = fs.openSync(LOG, 'r'), n = Math.min(st.size, 8e6), buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, st.size - n); fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n').filter(l => l.includes('FWLFPS2 ['));
  const at = lab => { const l = lines.filter(x => x.includes('FWLFPS2 [' + lab + ']')).at(-1); const m = l && /^\[(\d+)\.(\d+)\.(\d+)-(\d+)\.(\d+)\.(\d+):(\d+)\]\[\s*(\d+)\]/.exec(l); return m && {t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]), f: +m[8]}; };
  for (const s of steps) { const a = at(s.label + '|a'), b = at(s.label + '|b'); if (!a || !b) continue; const fr = (b.f - a.f + 1000) % 1000, sec = (b.t - a.t) / 1000; Object.assign(s, {frames: fr, sec, fps: +(fr / sec).toFixed(1), ms: Math.round(1000 * sec / fr)}); }
  fs.writeFileSync('fps-ab2.json', JSON.stringify(result, null, 1));
  console.log(JSON.stringify({error: result.error, preview: result.previewNewComponents, restored: result.restored, steps: steps.map(s => [s.label, s.fps, s.ms])}));
}
