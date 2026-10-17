// 建 WB17_ 临时材质实例（Transient，不落盘）：
//  MI_0/1 = 修前原设置(QBL17_MI_40/41) + Ramp(NoMip+Clamp)
//  MI_2/3 = 当前已保存正式 MI + Ramp(NoMip+Clamp)
//  MI_4/5 = 当前已保存正式 MI + Ramp(NoMip+Clamp)，去掉全分辨率覆盖
// Ramp 借用 Codex 已有的 Transient 副本 QBL17_TX_30（Rise_L_R 等像素，Clamp），只把 mip 关掉。
import fs from 'node:fs'; import { py, get, request } from './wbue.mjs';
function txt(v) { if (v === null) return 'None'; if (typeof v === 'boolean') return v ? 'True' : 'False'; if (typeof v === 'number') return String(v); if (typeof v === 'string') return JSON.stringify(v); if (Array.isArray(v)) return '(' + v.map(txt).join(',') + ')'; if (v._type === 'object_ref') return v.class + "'" + v.path + "'"; return '(' + Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => k + '=' + txt(x)).join(',') + ')'; }
async function setOwn(p, properties) { const d = await request('/object/set', { path: p, properties }); if (d?.failed_properties?.length) throw Error('set failed ' + JSON.stringify(d.failed_properties)); return d; }
const FORMAL = '/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/';
const src = {
  0: '/Engine/Transient.QBL17_MI_40', 1: '/Engine/Transient.QBL17_MI_41',
  2: FORMAL + 'MI_EFX_FireWorks_RiseTrail_L_Loop_01_HD.MI_EFX_FireWorks_RiseTrail_L_Loop_01_HD',
  3: FORMAL + 'MI_EFX_FireWorks_RiseTrail_L_Far_01_HD.MI_EFX_FireWorks_RiseTrail_L_Far_01_HD',
};
src[4] = src[2]; src[5] = src[3];
const RAMP = '/Engine/Transient.QBL17_TX_30';
const props = ['Parent', 'ScalarParameterValues', 'VectorParameterValues', 'TextureParameterValues', 'StaticParameters', 'BasePropertyOverrides'];
// 1) Ramp 副本关 mip（它本来就是 Transient、Clamp、像素同 Rise_L_R）
const r1 = await py(String.raw`import unreal,json
def wb():
 t=unreal.find_object(None,'/Engine/Transient.QBL17_TX_30')
 assert t is not None and t.get_outer().get_path_name()=='/Engine/Transient'
 t.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
 t.set_editor_property('address_x',unreal.TextureAddress.TA_CLAMP)
 t.set_editor_property('address_y',unreal.TextureAddress.TA_CLAMP)
 return {'mip':str(t.get_editor_property('mip_gen_settings')),'ax':str(t.get_editor_property('address_x')),'outer':t.get_outer().get_path_name()}
print('WB:'+json.dumps(wb()))
del wb`, 120000);
console.log('ramp', r1);
// 2) 建 6 个空 MI，挂到自建模块防回收
const r2 = await py(String.raw`import unreal,json,sys,types
def wb():
 m=sys.modules.get('wb17_assets')
 if m is None:
  m=types.ModuleType('wb17_assets');m.refs=[];sys.modules['wb17_assets']=m
 outer=unreal.find_object(None,'/Engine/Transient');out=[]
 for j in range(6):
  mi=unreal.find_object(None,'/Engine/Transient.WB17_MI_'+str(j))
  if mi is None: mi=unreal.MaterialInstanceConstant(outer=outer,name='WB17_MI_'+str(j))
  m.refs.append(mi);out.append(mi.get_path_name())
 return out
print('WB:'+json.dumps(wb()))
del wb`);
console.log('mis', r2);
// 3) 逐个复制字段并核对
const result = [];
for (let j = 0; j < 6; j++) {
  const orig = await get(src[j], props);
  const dst = '/Engine/Transient.WB17_MI_' + j;
  await setOwn(dst, Object.fromEntries(props.map(k => [k, txt(orig[k])])));
  const check = await get(dst, props);
  const diff = props.filter(k => JSON.stringify(check[k]) !== JSON.stringify(orig[k]));
  if (diff.length) throw Error('clone differs ' + j + ' ' + diff.join(','));
  result.push({ j, src: src[j], dst });
}
// 4) 换 Ramp；MI_4/5 关全分辨率覆盖
const r4 = await py(String.raw`import unreal,json
def wb():
 t=unreal.find_object(None,'/Engine/Transient.QBL17_TX_30');out=[]
 for j in range(6):
  a=unreal.find_object(None,'/Engine/Transient.WB17_MI_'+str(j))
  unreal.MaterialEditingLibrary.set_material_instance_texture_parameter_value(a,'EmissiveRampTex',t)
  if j>=4:
   b=a.get_editor_property('base_property_overrides')
   b.set_editor_property('override_translucency_render_full_percentage_last',False)
   b.set_editor_property('translucency_render_full_percentage_last',False)
   a.set_editor_property('base_property_overrides',b)
  unreal.MaterialEditingLibrary.update_material_instance(a)
  b=a.get_editor_property('base_property_overrides')
  out.append({'mi':a.get_name(),'main':unreal.MaterialEditingLibrary.get_material_instance_texture_parameter_value(a,'MainTex').get_name(),'ramp':unreal.MaterialEditingLibrary.get_material_instance_texture_parameter_value(a,'EmissiveRampTex').get_path_name(),'fullres':[b.get_editor_property('override_translucency_render_full_percentage_last'),b.get_editor_property('translucency_render_full_percentage_last')]})
 return out
print('WB:'+json.dumps(wb()))
del wb`, 120000);
console.log(JSON.stringify(r4, null, 1));
fs.writeFileSync(new URL('./setup.json', import.meta.url), JSON.stringify({ ramp: r1, mis: r2, clones: result, final: r4 }, null, 1));
