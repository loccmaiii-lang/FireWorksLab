"""Comet / Silver 3.0：读取统一导出的真实素材包，分别检查 PC 和手机。"""
from pathlib import Path
import sys,json,zipfile,importlib.util,hashlib,shutil,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'analysis/scripts'))
spec=importlib.util.spec_from_file_location('replay',ROOT/'analysis/scripts/回放检查.py');rc=importlib.util.module_from_spec(spec);spec.loader.exec_module(rc)
out=ROOT/'analysis/results/CS3_RT6';out.mkdir(exist_ok=True)
base=ROOT/'analysis/local/CS3-output';report={'packages':{},'ue_verified':False}
for id in ['CS3C','CS3S']:
 d=base/id;d.mkdir(exist_ok=True)
 with zipfile.ZipFile(base/(id+'.zip')) as z:z.extractall(d)
 record={'zip_sha256':hashlib.sha256((base/(id+'.zip')).read_bytes()).hexdigest(),'platforms':{}}
 for plat,cfg in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
  c=json.loads((d/cfg).read_text(encoding='utf-8'))
  assert all(not e.get('gpu') for e in c['emitters'])
  assert all(e.get('max_alive',1)<=50 for e in c['emitters'])
  refs=[]
  for k,t in c['textures'].items():
   p=d/t['file'];assert p.exists(),p
   assert hashlib.sha256(p.read_bytes()).hexdigest()==t['sha256'],p
   with Image.open(p) as im: size=im.size
   assert max(size)<=(1024 if plat=='Mobile' else 2048),(p,size)
   refs.append({'key':k,'file':p.name,'size':size})
  for e in c['emitters']:
   for mod in e['modules']:
    assert 'null' not in json.dumps(mod),mod
  seqi=[i for i,e in enumerate(c['emitters']) if c['materials'][e['material']].get('textures',{}).get('main')]
  # 检查器入口读取 cascade.json；手机在独立视图目录使用同一组实际文件。
  view=d
  if plat=='Mobile':
   view=base/(id+'-mobile-check');view.mkdir(exist_ok=True)
   shutil.copy2(d/cfg,view/'cascade.json')
   for t in c['textures'].values():shutil.copy2(d/t['file'],view/t['file'])
  packs=[rc.Pack(str(view),i) for i in seqi]
  rep=rc.check(packs,str(out/(id+'_'+plat+'_回放.jpg')),None,times_s=[0.6,1.4,2.1,2.5,3.5,5.2])
  record['platforms'][plat]={'pass':rep['pass'],'emitters':len(c['emitters']),'textures':refs,'replay':rep,'particle_note':'手机独立红头为现有 soft_dot CPU 粒子，贴图检查不适用；另核对弹道和浏览器回放。' if id=='CS3C' and plat=='Mobile' else ''}
  print(id,plat,rep['pass'],[x['fails'] for x in rep['layers']])
 record['version']=json.loads((base/(id+'-source.json')).read_text(encoding='utf-8'))['version']
 report['packages'][id]=record
report['pass']=all(x['pass'] for v in report['packages'].values() for x in v['platforms'].values())
(out/'输出检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=1),encoding='utf-8')
raise SystemExit(0 if report['pass'] else 1)
