from pathlib import Path
import json,zipfile,sys,importlib,shutil
R=Path.cwd();O=R/'analysis/results/FG_Afterburn';B=R/'analysis/local/FG-Afterburn';B.mkdir(exist_ok=True)
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
result={}
for v in ['anchor']:
 d=B/v;d.mkdir(exist_ok=True)
 with zipfile.ZipFile(O/(v+'.zip')) as z:z.extractall(d)
 result[v]={}
 for plat,name in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
  cfg=json.loads((d/name).read_text('utf-8'));view=d
  if plat=='Mobile':
   view=B/(v+'-mobile');view.mkdir(exist_ok=True);shutil.copy2(d/name,view/'cascade.json')
   for tx in cfg['textures'].values():shutil.copy2(d/tx['file'],view/tx['file'])
  ps=[rc.Pack(str(view),i) for i,e in enumerate(cfg['emitters']) if cfg['materials'][e['material']].get('textures',{}).get('main')]
  rep=rc.check(ps,str(O/(v+'-'+plat+'.jpg')),None,times_s=[.5,1,1.5,2,2.6,3]);
  result[v][plat]={'pass':rep['pass'],'fails':[x['fails']for x in rep['layers']],'emitters':len(cfg['emitters']),'frames':ps[0].frames,'life':ps[0].life,'delay':ps[0].delay,'cell':[ps[0].cw,ps[0].chh],'samples':[{'t':t,'size_m':(ps[0].size((t-ps[0].delay)/ps[0].life)/100).tolist(),'ppm':ps[0].cw*100/ps[0].size((t-ps[0].delay)/ps[0].life)[0]} for t in [.5,1,1.5,2,2.6,3]]}
(O/'export-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8');print(json.dumps(result,ensure_ascii=False,indent=2))
