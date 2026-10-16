// 仅修四张 PC 主序列贴图和四个既有实例；不保存地图、不提交 Perforce。
// 用法：node 此脚本 snapshot|apply|verify|save <本机证据目录>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const [mode, folder] = process.argv.slice(2);
if (!['snapshot', 'apply', 'verify', 'save'].includes(mode) || !folder) {
  throw Error('需要 snapshot|apply|verify|save 及本机证据目录');
}
const names = [
  ['RiseTrail_L_Loop', 'RiseTrail_L_Loop_16x1'],
  ['RiseTrail_L_Far', 'RiseTrail_L_Far_16x4'],
  ['Comet3_GoldTail_Full', 'Comet3_GoldTail_Full_16x1'],
  ['Silver3_Layers_S_Full', 'Silver3_Layers_S_Full_16x1'],
];
const asset = (dir, name) => `/Game/Effects_HD/Common_HD/${dir}/FireWorks_HD/${name}.${name}`;
const pairs = names.map(([mi, tx]) => ({
  mi: asset('MaterialInstance_HD', `MI_EFX_FireWorks_${mi}_01_HD`),
  tx: asset('Texture_HD', `T_EFX_FireWorks_${tx}_01_HD`),
}));
const miFields = ['Parent', 'ScalarParameterValues', 'VectorParameterValues',
  'TextureParameterValues', 'StaticParameters', 'BasePropertyOverrides'];
const txFields = ['MipGenSettings', 'Filter', 'CompressionSettings', 'SRGB',
  'NeverStream', 'LODGroup', 'LODBias', 'AddressX', 'AddressY', 'MaxTextureSize'];
const json = value => JSON.stringify(value, null, 2);
const write = (name, value) => fs.writeFileSync(path.join(folder, name), json(value));
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// 写请求失败时结果可能未知，禁止自动重试；先用 verify / snapshot 诊断。
async function rpc(route, body, readRetry = false) {
  const data = Buffer.from(JSON.stringify(body));
  try { return await new Promise((resolve, reject) => {
    const q = http.request(`http://127.0.0.1:17780/gpcli/object/${route}`, {
      method: 'POST', agent: false,
      headers: {'Content-Type': 'text/plain', 'Content-Length': data.length},
    }, r => {
      let s = '';
      r.setEncoding('utf8');
      r.on('data', c => { s += c; });
      r.on('end', () => {
        try {
          const v = JSON.parse(s);
          if (r.statusCode !== 200 || v.success === false) throw Error(v.message || s.slice(0, 400));
          resolve(v.data ?? v);
        } catch (e) { reject(e); }
      });
    });
    q.on('error', reject);
    q.setTimeout(60000, () => q.destroy(Error('请求超时；先查状态，不重试写入')));
    q.end(data);
  }); } catch (e) {
    if (route === 'get' && !readRetry && ['ECONNRESET', 'EPIPE'].includes(e.code)) {
      return rpc(route, body, true);
    }
    throw e;
  }
}
async function py(code) {
  const d = await rpc('call', {path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary',
    function: 'ExecutePythonCommandEx', args: {PythonCommand: code,
      ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private'}});
  const lines = [...(d.out_LogOutput ?? '').matchAll(/Output="((?:[^"\\]|\\.)*)"/g)]
    .map(m => m[1].replace(/\\(.)/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(s => s.startsWith('QBL:'));
  if (d.return_value !== 'True' || !line) throw Error(d.out_CommandResult || lines.slice(-4).join('\n'));
  return JSON.parse(line.slice(4));
}
async function snapshot() {
  const s = {materials: {}, textures: {}};
  for (const {mi, tx} of pairs) {
    s.materials[mi] = (await rpc('get', {path: mi, properties: miFields})).properties;
    s.textures[tx] = (await rpc('get', {path: tx, properties: txFields})).properties;
  }
  return s;
}
async function checkBindings() {
  // 从当前 PC 表与所有 LOD 找发射器，禁止复用旧缓存的材质槽号。
  const systems = {
    RiseTrail_L_HD: {RiseLoop: pairs[0].mi, TrailFar: pairs[1].mi},
    Comet_Layers_HD: {L1_TrailFull: pairs[2].mi},
    FanSilver_01_HD: {TrailFull: pairs[3].mi},
    Silver_Layers_S_HD: {TrailFull: pairs[3].mi},
  };
  const psPath = name => {
    const n = `P_EFX_FireWorks_${name}`;
    return `/Game/Effects_HD/Props_HD/FireWorks_HD/${n}.${n}`;
  };
  const rows = await py(`import unreal,json
def qbl_rows():
 for p in json.loads(${JSON.stringify(JSON.stringify(Object.keys(systems).map(psPath)))}):
  assert unreal.load_asset(p),p
 t=unreal.load_asset('/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable.ResourceFXTable')
 return [{k:r.get(k) for k in ['ResourceId','FxSP','FxSP_Low','FxSP_High']} for r in json.loads(unreal.DataTableFunctionLibrary.export_data_table_to_json_string(t)) if any(n in unicode(r.get('ResourceId','')) for n in ['FanComet_01','FanSilver_01'])]
print('QBL:'+json.dumps(qbl_rows()))
del qbl_rows`);
  for (const [id, sys] of [['FanComet_01', 'Comet_Layers_HD'], ['FanSilver_01', 'FanSilver_01_HD']]) {
    const matches = rows.filter(r => r.ResourceId.endsWith(id));
    if (matches.length !== 1 || matches[0].FxSP !== psPath(sys) ||
        !['FxSP_Low', 'FxSP_High'].every(k => matches[0][k] === 'None')) {
      throw Error('当前 PC 表入口改变；停止，重新确认实际对象');
    }
  }
  const bindings = [];
  for (const [sys, wanted] of Object.entries(systems)) {
    const ps = (await rpc('get', {path: psPath(sys), properties: ['Emitters']})).properties;
    const found = new Set();
    for (let slot = 0; slot < ps.Emitters.length; slot++) {
      const e = (await rpc('get', {path: ps.Emitters[slot].path,
        properties: ['EmitterName', 'LODLevels']})).properties;
      if (!Object.hasOwn(wanted, e.EmitterName)) continue;
      found.add(e.EmitterName);
      if (!e.LODLevels.length) throw Error('缺少 LOD');
      for (const lod of e.LODLevels) {
        const l = (await rpc('get', {path: lod.path, properties: ['RequiredModule']})).properties;
        const r = (await rpc('get', {path: l.RequiredModule.path, properties: ['Material']})).properties;
        if (r.Material?.path !== wanted[e.EmitterName]) throw Error('实际发射器材质改变；停止');
      }
      bindings.push({system: sys, emitter: e.EmitterName, slot, lods: e.LODLevels.length,
        material: wanted[e.EmitterName]});
    }
    if (found.size !== Object.keys(wanted).length) throw Error('发射器结构改变；停止');
  }
  write('bindings-readback.json', {rows, bindings});
}
function expected(before) {
  const r = structuredClone(before);
  for (const {mi, tx} of pairs) {
    r.textures[tx].MipGenSettings = 'TMGS_NoMipmaps';
    r.materials[mi].BasePropertyOverrides.bOverride_TranslucencyRenderFullPercentageLast = true;
    r.materials[mi].BasePropertyOverrides.bTranslucencyRenderFullPercentageLast = true;
  }
  return r;
}
function assertEqual(actual, target) {
  if (JSON.stringify(actual) !== JSON.stringify(target)) throw Error('源字段与预期不一致；停止，不覆盖现场');
}
fs.mkdirSync(folder, {recursive: true});
await checkBindings();
if (mode === 'snapshot') {
  // 快照不得覆盖；正式应用只能接着同一份基线运行。
  if (fs.existsSync(path.join(folder, 'before.json'))) throw Error('基线已存在');
  const before = await snapshot();
  const files = await py(`import unreal,json,os
def qbl_files():
 out=[]
 for p in json.loads(${JSON.stringify(JSON.stringify(pairs.flatMap(p => [p.mi, p.tx])))}):
  f=os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),p.split('.')[0][6:]+'.uasset'))
  s=unreal.SourceControl.query_file_state(f,True)
  assert s.is_valid and s.is_current and not s.is_unknown and not s.is_checked_out_other and not s.is_conflicted
  assert not s.is_modified and not s.is_checked_out,'asset already has local work'
  out.append({'asset':p,'file':f})
 return out
print('QBL:'+json.dumps(qbl_files()))
del qbl_files`);
  for (const x of files) {
    x.sha256 = hash(x.file);
    x.backup = path.join(folder, path.basename(x.file));
    fs.copyFileSync(x.file, x.backup, fs.constants.COPYFILE_EXCL);
  }
  write('before.json', before);
  write('files.json', files);
  console.log('基线与二进制备份完成：8 个源资产');
} else {
  const before = read('before.json');
  const target = expected(before);
  if (mode === 'apply') {
    assertEqual(await snapshot(), before);
    for (const x of read('files.json')) {
      if (hash(x.file) !== x.sha256 || hash(x.backup) !== x.sha256) throw Error('磁盘或备份发生变化');
    }
    const result = await py(`import unreal,json
def qbl_apply():
 files=json.loads(${JSON.stringify(JSON.stringify(read('files.json').map(x => x.file)))})
 assert unreal.SourceControl.is_available()
 for f in files:
  s=unreal.SourceControl.query_file_state(f,True)
  assert s.is_valid and s.is_current and s.can_check_out and not s.is_checked_out_other and not s.is_modified
 assert unreal.SourceControl.check_out_files(files,True),'scoped checkout failed'
 out=[]
 for p in json.loads(${JSON.stringify(JSON.stringify(pairs))}):
  t=unreal.load_asset(p['tx']);m=unreal.load_asset(p['mi'])
  assert t and m
  t.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
  b=m.get_editor_property('base_property_overrides')
  b.set_editor_property('override_translucency_render_full_percentage_last',True)
  b.set_editor_property('translucency_render_full_percentage_last',True)
  m.set_editor_property('base_property_overrides',b)
  unreal.MaterialEditingLibrary.update_material_instance(m)
  out.extend([m.get_path_name(),t.get_path_name()])
 return out
print('QBL:'+json.dumps(qbl_apply()))
del qbl_apply`);
    write('applied.json', result);
    assertEqual(await snapshot(), target);
    console.log('8 个源资产已在内存应用；尚未保存');
  } else if (mode === 'verify') {
    const actual = await snapshot();
    write('readback.json', actual);
    assertEqual(actual, target);
    console.log('通过：仅四张主图 NoMip 与四个实例局部全分辨率改变；其余已记录字段保持');
  } else {
    assertEqual(await snapshot(), target);
    for (const x of read('files.json')) {
      if (hash(x.file) !== x.sha256) throw Error('保存前磁盘已变化；先检查，不覆盖');
    }
    // 仅在真实入口视觉回归后调用；逐包保存并读回，禁止 SaveAll。
    const result = await py(`import unreal,json
def qbl_save():
 out=[]
 for f in json.loads(${JSON.stringify(JSON.stringify(read('files.json').map(x => x.file)))}):
  s=unreal.SourceControl.query_file_state(f,True)
  assert s.is_valid and s.is_checked_out and not s.is_checked_out_other and not s.is_conflicted
 for p in json.loads(${JSON.stringify(JSON.stringify(pairs.flatMap(p => [p.mi, p.tx])))}):
  a=unreal.load_asset(p)
  assert a and unreal.EditorAssetLibrary.save_loaded_asset(a,False),p
  out.append(p)
 return out
print('QBL:'+json.dumps(qbl_save()))
del qbl_save`);
    assertEqual(await snapshot(), target);
    write('saved.json', result.map(assetPath => {
      const f = read('files.json').find(x => x.asset === assetPath);
      return {asset: assetPath, sha256: hash(f.file), changed: hash(f.file) !== f.sha256};
    }));
    console.log('仅八个资产保存完成；未保存地图、未提交 Perforce');
  }
}
