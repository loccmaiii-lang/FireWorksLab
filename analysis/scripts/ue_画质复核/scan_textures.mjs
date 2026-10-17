// 只读：扫烟花相关目录下全部 Texture2D 的 mip / 寻址 / 流送 / 尺寸，判断 Ramp 与序列图的共性问题
import fs from 'node:fs'; import { py } from './wbue.mjs';
const code = String.raw`import unreal,json
def wb():
 reg=unreal.AssetRegistryHelpers.get_asset_registry()
 roots=['/Game/Effects/Common/Texture/Ramp','/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD','/Game/Effects/Common/Texture/FireWorks','/Game/Effects/Common/Texture/Fireworks']
 out=[]
 for r in roots:
  f=unreal.ARFilter(package_paths=[r],recursive_paths=True,class_names=['Texture2D'])
  for ad in reg.get_assets(f):
   n=str(ad.asset_name)
   if 'FireWorks' not in n and 'Fireworks' not in n: continue
   out.append({'root':r,'name':n,'path':str(ad.object_path),
    'mip':str(ad.get_tag_value('MipGenSettings')) if False else None})
 # 读详细属性需要加载；只加载贴图对象（不改）
 res=[]
 for e in out:
  t=unreal.load_asset(e['path'])
  if t is None: continue
  res.append({'root':e['root'].split('/')[-1],'name':e['name'],'w':t.blueprint_get_size_x(),'h':t.blueprint_get_size_y(),
   'mip':str(t.get_editor_property('mip_gen_settings')).split('.')[-1].split(':')[0],
   'ax':str(t.get_editor_property('address_x')).split('.')[-1].split(':')[0],
   'ay':str(t.get_editor_property('address_y')).split('.')[-1].split(':')[0],
   'stream':not t.get_editor_property('never_stream'),'srgb':t.get_editor_property('srgb'),
   'group':str(t.get_editor_property('lod_group')).split('.')[-1].split(':')[0]})
 return res
print('WB:'+json.dumps(wb()))
del wb`;
const r = await py(code, 300000);
fs.writeFileSync(new URL('./texture-scan.json', import.meta.url), JSON.stringify(r, null, 1));
const key = x => [x.mip, x.ax + '/' + x.ay, x.stream ? 'stream' : 'nostream'].join(' ');
const groups = {};
for (const x of r) { const kind = /_R$|Ramp/i.test(x.name) ? 'ramp' : 'seq'; const k = kind + ' | ' + x.root + ' | ' + key(x); (groups[k] ??= []).push(x.name); }
for (const [k, v] of Object.entries(groups)) console.log(String(v.length).padStart(3), k, '  e.g.', v.slice(0, 4).join(', '));
console.log('total', r.length);
