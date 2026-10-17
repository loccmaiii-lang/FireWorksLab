// Rise_L Ramp 副本（像素不变，Clamp + NoMipmaps）只接 RiseTrail_L 近/远两个既有 HD 实例；原共享 Ramp 不动。
// 用法：node wb_ramp_copy.mjs preflight|apply|verify|save  —— 写请求不自动重试；不 SaveAll、不保存地图、不提交 P4。
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { py, get } from './wbue.mjs';
const mode = process.argv[2];
const DIR = 'F:/FireWorksLab/analysis/local/QUALITY_REVIEW_20261017/ramp-copy';
fs.mkdirSync(DIR, { recursive: true });
const SRC = '/Game/Effects/Common/Texture/Ramp/T_EFX_FireWorks_RiseTrail_L_R.T_EFX_FireWorks_RiseTrail_L_R';
const DST_DIR = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD', DST_NAME = 'T_EFX_FireWorks_RiseTrail_L_R_01_HD';
const DST = `${DST_DIR}/${DST_NAME}.${DST_NAME}`;
const MI = n => `/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/${n}.${n}`;
const MIS = [MI('MI_EFX_FireWorks_RiseTrail_L_Loop_01_HD'), MI('MI_EFX_FireWorks_RiseTrail_L_Far_01_HD')];
const CONTENT = 'E:/loc_ma5/DFMEditor/DFM/Content/';
const file = p => CONTENT + p.split('.')[0].slice(6) + '.uasset';
const MI_FIELDS = ['Parent', 'ScalarParameterValues', 'VectorParameterValues', 'TextureParameterValues', 'StaticParameters', 'BasePropertyOverrides'];
const TX_FIELDS = ['MipGenSettings', 'Filter', 'CompressionSettings', 'SRGB', 'NeverStream', 'LODGroup', 'LODBias', 'AddressX', 'AddressY', 'MaxTextureSize'];
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const W = (n, v) => fs.writeFileSync(path.join(DIR, n), JSON.stringify(v, null, 1));
const R = n => JSON.parse(fs.readFileSync(path.join(DIR, n), 'utf8'));
const rampOf = mi => mi.TextureParameterValues.find(x => x.ParameterInfo.Name === 'EmissiveRampTex')?.ParameterValue?.path;
const codexSaved = JSON.parse(fs.readFileSync('F:/FireWorksLab/analysis/local/QUALITY_BLUR_20261017/formal-fix/saved.json', 'utf8'));
async function scc(files) {
  return py(String.raw`import unreal,json
def wb():
 out=[]
 for f in json.loads(FILES):
  s=unreal.SourceControl.query_file_state(f,True)
  out.append({'file':f,'valid':s.is_valid,'checkedOut':s.is_checked_out,'other':s.is_checked_out_other,'conflicted':s.is_conflicted,'current':s.is_current,'added':s.is_added,'source':s.is_source_controlled})
 return out
print('WB:'+json.dumps(wb()))
del wb`.replace('FILES', JSON.stringify(JSON.stringify(files))), 300000);
}
if (mode === 'preflight') {
  if (fs.existsSync(path.join(DIR, 'before.json'))) throw Error('baseline exists; do not overwrite');
  const before = { mis: {}, src: await get(SRC, TX_FIELDS) };
  for (const m of MIS) { before.mis[m] = await get(m, MI_FIELDS); if (rampOf(before.mis[m]) !== SRC) throw Error('MI ramp not original: ' + m); }
  const disk = MIS.map(m => { const f = file(m); const h = sha(f); const c = codexSaved.find(x => x.asset === m); return { asset: m, file: f, sha256: h, sameAsCodexSaved: c?.sha256 === h }; });
  if (disk.some(d => !d.sameAsCodexSaved)) throw Error('MI on disk differs from Codex saved; stop');
  if (fs.existsSync(file(DST))) throw Error('destination file exists');
  const exists = await py(String.raw`import unreal,json
print('WB:'+json.dumps({'dst':unreal.EditorAssetLibrary.does_asset_exist(DST)}))`.replace('DST', JSON.stringify(DST.split('.')[0])));
  if (exists.dst) throw Error('destination asset exists');
  const s = await scc(disk.map(d => d.file));
  if (s.some(x => !x.valid || !x.checkedOut || x.other || x.conflicted)) throw Error('MI not checked out by me: ' + JSON.stringify(s));
  for (const d of disk) { d.backup = path.join(DIR, path.basename(d.file)); fs.copyFileSync(d.file, d.backup, fs.constants.COPYFILE_EXCL); }
  W('before.json', before); W('files.json', disk); W('scc-before.json', s);
  console.log('preflight ok', { src: before.src, mis: MIS.length, disk: disk.map(d => d.sameAsCodexSaved), scc: s.map(x => x.checkedOut) });
} else if (mode === 'apply') {
  const before = R('before.json');
  for (const m of MIS) if (JSON.stringify(await get(m, MI_FIELDS)) !== JSON.stringify(before.mis[m])) throw Error('MI changed since preflight');
  for (const d of R('files.json')) if (sha(d.file) !== d.sha256) throw Error('disk changed since preflight');
  const r = await py(String.raw`import unreal,json
def wb():
 src=unreal.load_asset(SRC)
 t=unreal.AssetToolsHelpers.get_asset_tools().duplicate_asset(NAME,DIR,src)
 assert t is not None and t.get_path_name()==DSTP
 t.set_editor_property('address_x',unreal.TextureAddress.TA_CLAMP)
 t.set_editor_property('address_y',unreal.TextureAddress.TA_CLAMP)
 t.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
 out=[]
 for p in json.loads(MIS):
  m=unreal.load_asset(p)
  unreal.MaterialEditingLibrary.set_material_instance_texture_parameter_value(m,'EmissiveRampTex',t)
  unreal.MaterialEditingLibrary.update_material_instance(m)
  out.append(unreal.MaterialEditingLibrary.get_material_instance_texture_parameter_value(m,'EmissiveRampTex').get_path_name())
 return {'dst':t.get_path_name(),'bound':out}
print('WB:'+json.dumps(wb()))
del wb`.replace('SRC', JSON.stringify(SRC)).replace('NAME', JSON.stringify(DST_NAME)).replace('DIR', JSON.stringify(DST_DIR)).replace('DSTP', JSON.stringify(DST)).replace('MIS', JSON.stringify(JSON.stringify(MIS))), 300000);
  W('applied.json', r); console.log('applied in memory (not saved)', r);
} else if (mode === 'verify') {
  const before = R('before.json'); const out = { mis: {}, dst: await get(DST, TX_FIELDS), src: await get(SRC, TX_FIELDS) };
  for (const m of MIS) {
    const now = await get(m, MI_FIELDS); out.mis[m] = now;
    const a = structuredClone(before.mis[m]), b = structuredClone(now);
    const ia = a.TextureParameterValues.findIndex(x => x.ParameterInfo.Name === 'EmissiveRampTex'), ib = b.TextureParameterValues.findIndex(x => x.ParameterInfo.Name === 'EmissiveRampTex');
    if (rampOf(now) !== DST) throw Error('ramp not bound ' + m);
    a.TextureParameterValues[ia].ParameterValue = null; b.TextureParameterValues[ib].ParameterValue = null;
    if (JSON.stringify(a) !== JSON.stringify(b)) throw Error('other MI fields changed ' + m);
  }
  const expectDst = { ...before.src, AddressX: 'TA_Clamp', AddressY: 'TA_Clamp', MipGenSettings: 'TMGS_NoMipmaps' };
  const txDiff = TX_FIELDS.filter(k => JSON.stringify(out.dst[k]) !== JSON.stringify(expectDst[k]));
  if (txDiff.length) throw Error('dst texture fields unexpected: ' + txDiff.map(k => k + '=' + JSON.stringify(out.dst[k])).join(','));
  if (JSON.stringify(out.src) !== JSON.stringify(before.src)) throw Error('original ramp changed!');
  // 源像素比对
  const files = [{ o: SRC, f: DIR + '/src.tga' }, { o: DST, f: DIR + '/dst.tga' }];
  for (const x of files) if (fs.existsSync(x.f)) fs.unlinkSync(x.f);
  await py(String.raw`import unreal,json,os
def wb():
 for p in json.loads(TASKS):
  a=unreal.load_asset(p['o']);task=unreal.AssetExportTask();task.object=a;task.filename=p['f'];task.automated=True;task.prompt=False;task.replace_identical=False;task.exporter=unreal.TextureExporterTGA()
  assert unreal.Exporter.run_asset_export_task(task) and os.path.exists(p['f'])
 return True
print('WB:'+json.dumps(wb()))
del wb`.replace('TASKS', JSON.stringify(JSON.stringify(files))), 120000);
  W('verify.json', out); console.log('verify ok: only EmissiveRampTex changed on 2 MIs; dst = Clamp/Clamp/NoMipmaps; original ramp unchanged; exported', files.map(x => x.f));
} else if (mode === 'save') {
  const s0 = await scc(R('files.json').map(d => d.file));
  if (s0.some(x => !x.checkedOut || x.other || x.conflicted)) throw Error('scc state changed');
  const r = await py(String.raw`import unreal,json
def wb():
 out=[]
 for p in json.loads(PKGS):
  a=unreal.load_asset(p)
  assert a and unreal.EditorAssetLibrary.save_loaded_asset(a,False),p
  out.append(p)
 return out
print('WB:'+json.dumps(wb()))
del wb`.replace('PKGS', JSON.stringify(JSON.stringify([DST, ...MIS]))), 300000);
  const all = [file(DST), ...R('files.json').map(d => d.file)];
  const s1 = await scc(all);
  const saved = all.map(f => ({ file: f, exists: fs.existsSync(f), sha256: fs.existsSync(f) ? sha(f) : null }));
  W('saved.json', { saved: r, files: saved, scc: s1 }); console.log('saved', r, s1);
} else throw Error('mode');
