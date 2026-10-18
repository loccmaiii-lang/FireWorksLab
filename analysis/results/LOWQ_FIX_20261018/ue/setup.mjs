// 建对照用的临时副本（不存盘）：贴图副本在 /Engine/FWL18_TMP（未保存的新包，不流送 = 常驻），材质实例副本在 /Engine/Transient。
//   *_Mip    = 像素和设置同正式（只是常驻）→ 拆开「流送没跟上」和「mip 选错」
//   *_NoMip  = NoMipmaps（2048）
//   *_NoMip1k = NoMipmaps + MaxTextureSize 1024
import fs from 'node:fs'; import { py, get, request, txt } from './fue.mjs';
const T = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/', M = '/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/';
const obj = p => p + '.' + p.split('/').pop();
const SETS = [
  { key: 'LLoop', tex: T + 'T_EFX_FireWorks_RiseTrail_L_Loop_16x1_01_HD', mi: M + 'MI_EFX_FireWorks_RiseTrail_L_Loop_01_HD' },
  { key: 'MLoop', tex: T + 'T_EFX_FireWorks_RiseTrail_M_Loop_16x1_01_HD', mi: M + 'MI_EFX_FireWorks_RiseTrail_M_Loop_01_HD' },
  { key: 'Gold', tex: T + 'T_EFX_FireWorks_GoldRayChry_4x4_01_HD', mi: M + 'MI_EFX_FireWorks_GoldRayChry_01_HD' },
];
const VARS = [{ v: 'Mip', nomip: false, max: 0 }, { v: 'NoMip', nomip: true, max: 0 }, { v: 'NoMip1k', nomip: true, max: 1024 }];
const PROPS = ['Parent', 'ScalarParameterValues', 'VectorParameterValues', 'TextureParameterValues', 'StaticParameters', 'BasePropertyOverrides'];
const out = { at: new Date().toISOString(), textures: [], mis: [] };
for (const s of SETS) {
  const src = await get(obj(s.mi), PROPS);
  const main = src.TextureParameterValues.find(x => x.ParameterInfo.Name === 'MainTex').ParameterValue.path;
  if (main !== obj(s.tex)) throw Error('MainTex 不是预期贴图：' + main);
  for (const x of VARS) {
    const name = 'FWL18_TX_' + s.key + '_' + x.v, mname = 'FWL18_MI_' + s.key + '_' + x.v;
    const r = await py(`import unreal,json,sys,types
def fwl():
 m=sys.modules.get('fwl18_assets')
 if m is None:
  m=types.ModuleType('fwl18_assets');m.refs=[];sys.modules['fwl18_assets']=m
 p='/Engine/FWL18_TMP/${name}'
 t=unreal.find_object(None,p+'.${name}')
 if t is None:
  src=unreal.load_asset('${s.tex}')
  t=unreal.AssetToolsHelpers.get_asset_tools().duplicate_asset('${name}','/Engine/FWL18_TMP',src)
 assert t and t.get_path_name()==p+'.${name}'
 if ${x.nomip ? 'True' : 'False'}:
  t.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
 if ${x.max}:
  t.set_editor_property('max_texture_size',${x.max})
 m.refs.append(t)
 mi=unreal.find_object(None,'/Engine/Transient.${mname}')
 if mi is None:
  mi=unreal.MaterialInstanceConstant(outer=unreal.find_object(None,'/Engine/Transient'),name='${mname}')
 m.refs.append(mi)
 return {'tex':t.get_path_name(),'mi':mi.get_path_name(),'size':[t.blueprint_get_size_x(),t.blueprint_get_size_y()],'mip':str(t.get_editor_property('mip_gen_settings')),'max':t.get_editor_property('max_texture_size'),'never':t.get_editor_property('never_stream'),'group':str(t.get_editor_property('lod_group'))}
print('FWL18:'+json.dumps(fwl()))
del fwl`, 600000);
    out.textures.push({ set: s.key, variant: x.v, ...r }); console.log('tex', name, r.size, r.mip, r.max);
    await request('/object/set', { path: r.mi, properties: Object.fromEntries(PROPS.map(k => [k, txt(src[k])])) });
    const check = await get(r.mi, PROPS); const diff = PROPS.filter(k => JSON.stringify(check[k]) !== JSON.stringify(src[k]));
    if (diff.length) throw Error('材质实例副本和原件不一致 ' + mname + ' ' + diff.join(','));
    const b = await py(`import unreal,json
mi=unreal.find_object(None,'${r.mi}');t=unreal.find_object(None,'${r.tex}')
unreal.MaterialEditingLibrary.set_material_instance_texture_parameter_value(mi,'MainTex',t)
unreal.MaterialEditingLibrary.update_material_instance(mi)
print('FWL18:'+json.dumps({'main':unreal.MaterialEditingLibrary.get_material_instance_texture_parameter_value(mi,'MainTex').get_path_name(),'parent':mi.get_editor_property('parent').get_path_name()}))`);
    out.mis.push({ set: s.key, variant: x.v, src: s.mi, mi: r.mi, ...b });
  }
}
out.engineDiskTmp = fs.existsSync('E:/loc_ma5/DFMEditor/Engine/Content/FWL18_TMP');
fs.writeFileSync(new URL('./setup.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(out.mis.map(m => m.mi.split('.').pop() + ' -> ' + m.main.split('.').pop()).join('\n'), '\nEngine 目录有落盘文件：', out.engineDiskTmp);
