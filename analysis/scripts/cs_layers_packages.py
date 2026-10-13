"""核对实际 ZIP 的 PC/手机贴图、头层及既有回放门槛，不降低标准。"""
from pathlib import Path
import json,zipfile,shutil,hashlib,sys,importlib
import numpy as np
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_Layers';B=R/'analysis/local/CS3-Layers'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
report={'ue_verified':False,'packages':{},'head':{},'layout':{}};configs={};packs={}
for variant in ['baseline','trial']:
 for id in ['CSLRC','CSLRS']:
  dest=B/(variant+'-'+id);dest.mkdir(exist_ok=True)
  with zipfile.ZipFile(O/(variant+'-'+id+'.zip')) as z:z.extractall(dest)
  for plat,cfg in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
   c=load(dest/cfg);view=dest;configs[variant,id,plat]=c
   assert all(not e.get('gpu') and e.get('max_alive',1)<=50 for e in c['emitters'])
   for tx in c['textures'].values():assert hashlib.sha256((dest/tx['file']).read_bytes()).hexdigest()==tx['sha256']
   if plat=='Mobile':
    view=B/(variant+'-'+id+'-mobile');view.mkdir(exist_ok=True);shutil.copy2(dest/cfg,view/'cascade.json')
    for tx in c['textures'].values():shutil.copy2(dest/tx['file'],view/tx['file'])
   ps=[rc.Pack(str(view),i) for i,e in enumerate(c['emitters']) if c['materials'][e['material']].get('textures',{}).get('main')];packs[variant,id,plat]=ps
   rep=rc.check(ps,str(O/(variant+'-'+id+'-'+plat+'.jpg')),times_s=[.6,1.4,2.1,2.6,3.2,4.2])
   report['packages'][variant+'-'+id+'-'+plat]={'pass':rep['pass'],'fails':[r['fails'] for r in rep['layers']],'emitters':len(c['emitters']),'sequence_layers':len(ps),'cell_sizes':[[p.cw,p.chh] for p in ps]}
for plat in ['PC','Mobile']:
 a=configs['baseline','CSLRC',plat];b=configs['trial','CSLRC',plat]
 report['head'][plat]={'emitter_equal':a['emitters'][1]==b['emitters'][1]}
 if plat=='PC':report['head'][plat]['pixels_equal']=np.array_equal(packs['baseline','CSLRC',plat][1].tex,packs['trial','CSLRC',plat][1].tex)
 for id in ['CSLRC','CSLRS']:
  pa=packs['baseline',id,plat][0];pb=packs['trial',id,plat][0]
  report['layout'][id+'-'+plat]={'same_emitter':pa.e==pb.e,'before_duration':pa.life,'after_duration':pb.life,'before_frames':pa.frames,'after_frames':pb.frames,'note':'自动测量包含新增内容，允许取景和帧表改变；前段物理另作渲染输入逐值检查。'}
report['pass']=all(v['pass'] for v in report['packages'].values()) and all(all(v.values()) for v in report['head'].values())
(O/'素材包检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if report['pass'] else 1)
