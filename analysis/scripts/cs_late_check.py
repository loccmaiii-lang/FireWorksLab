"""独立实验的真实输出检查：原参数、零强度、前段和收敛性。"""
from pathlib import Path
import sys,json,zipfile,shutil,hashlib,importlib
import numpy as np
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_LateMotion';B=R/'analysis/local/CS3-LateMotion'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
def load(p):return json.loads(p.read_text(encoding='utf-8'))
report={'ue_verified':False,'parameters_equal':True,'packages':{}}
base=load(O/'baseline-参数.json')
for variant in ['zero','trial','fine']:
 data=load(O/(variant+'-参数.json'))
 for id in base:
  for k in ['P','M','T','peak']:assert base[id][k]==data[id][k],(variant,id,k)
packs={}
for variant in ['baseline','zero','trial','fine']:
 for id in ['CSLTC','CSLTS']:
  d=B/(variant+'-'+id);d.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(O/(variant+'-'+id+'.zip')) as z:z.extractall(d)
  for plat,cfg in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
   c=load(d/cfg);view=d
   assert all(not e.get('gpu') and e.get('max_alive',1)<=50 for e in c['emitters'])
   for tx in c['textures'].values():assert hashlib.sha256((d/tx['file']).read_bytes()).hexdigest()==tx['sha256']
   if plat=='Mobile':
    view=B/(variant+'-'+id+'-mobile');view.mkdir(exist_ok=True);shutil.copy2(d/cfg,view/'cascade.json')
    for tx in c['textures'].values():shutil.copy2(d/tx['file'],view/tx['file'])
   ps=[rc.Pack(str(view),i) for i,e in enumerate(c['emitters']) if c['materials'][e['material']].get('textures',{}).get('main')]
   packs[variant,id,plat]=ps
   if variant in ['baseline','trial']:
    rep=rc.check(ps,str(O/(variant+'-'+id+'-'+plat+'.jpg')),times_s=[.6,1.4,2.1,2.6,3.2,4.2])
    report['packages'][variant+'-'+id+'-'+plat]={'pass':rep['pass'],'fails':[r['fails'] for r in rep['layers']],'emitters':len(c['emitters']),'sequence_layers':len(ps),'cell_sizes':[[p.cw,p.chh] for p in ps]}
report['equivalence']={}
for id in ['CSLTC','CSLTS']:
 T=base['CSLTC-T' if id=='CSLTC' else id]['T']
 for plat in ['PC','Mobile']:
  bp,zp,tp,fp=[packs[v,id,plat] for v in ['baseline','zero','trial','fine']]
  zero=all(np.array_equal(a.tex,z.tex) for a,z in zip(bp,zp));assert zero
  pre=[];mae=[];peak=[];delta=[]
  for a,t,f in zip(bp,tp,fp):
   assert (a.frames,a.cw,a.chh)==(t.frames,t.cw,t.chh)==(f.frames,f.cw,f.chh)
   # 同一取帧/尺寸/偏移；不允许各自缩放画面来隐藏差异。
   assert a.e==t.e==f.e
   ticks=[i/30 for i in range(int(np.ceil(T*30)))]
   pre.extend(np.array_equal(a.cell(a.frame_at(x/a.life)),t.cell(t.frame_at(x/t.life))) for x in ticks if x<a.life)
   for i in range(a.frames):
    diff=np.abs(t.cell(i)-f.cell(i))*255;mae.append(float(diff.mean()));peak.append(float(diff.max()))
    delta.append(float((np.abs(t.cell(i)-a.cell(i))*255).mean()))
  assert all(pre)
  if id=='CSLTC' and plat=='PC':assert np.array_equal(bp[1].tex,tp[1].tex)
  if id=='CSLTC' and plat=='Mobile':
   a=load(B/('baseline-'+id)/'cascade_mobile.json');t=load(B/('trial-'+id)/'cascade_mobile.json')
   assert a['emitters'][1]==t['emitters'][1] and a['materials']==t['materials']
  report['equivalence'][id+'-'+plat]={'zero_pixel_exact':zero,'before_burnout_pixel_exact':all(pre),'preburn_samples':len(pre),'head_unchanged':True if id=='CSLTC' else '银头包含于前段一致性检查','step_halving_cell_mae_max_255':max(mae),'step_halving_pixel_max_255':max(peak),'candidate_vs_base_cell_mae_max_255':max(delta)}
report['standard']=load(O/'标准检查.json')
report['replay_all_pass']=all(v['pass'] for v in report['packages'].values())
(O/'验证汇总.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='standard'},ensure_ascii=False,indent=2))
