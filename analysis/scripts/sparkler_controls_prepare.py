"""本轮运动修订：保留原形态和节奏，减弱下坠主导；先生成副本供审看。"""
from pathlib import Path
import json,copy,subprocess
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparklerControls';O.mkdir(parents=True,exist_ok=True)
doc=json.loads(subprocess.check_output(['git','show','58ae8755:analysis/原理/条目_窜天猴与仙女棒.json'],cwd=R).decode('utf-8'))
e=next(e for e in doc['entries'] if e['id']=='SGS1');base=dict(P=e['p'],M=e['m'])
trial=json.loads((R/'analysis/results/SparklerMotion/候选参数.json').read_text(encoding='utf-8'))
g=trial['P']['sparkGraph'];g['name']='仙女棒 · 快慢火星与轻气流'
for layer in g['emitters']:
 if layer['id'] not in ['e01','e13']:layer['gravity']=[0,0,-2.5]
 if layer['id'] in ['e02','e03','e05','e06','e07']:layer['speed'][1]*=1.3
g.update(fieldResponse=12,fieldStart=.002,fieldRamp=.025,fieldWindX=.04,fieldWindZ=.3,fieldTurbulence=.3)
for k in ['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain','scaleSpeed','scaleGravity','branchLife','branchAngle','branchCount','branchWidth','branchSpeed','branchGravity']:g[k]=1
for layer,old in zip(g['emitters'],base['P']['sparkGraph']['emitters']):
 for k in ['id','parent','count','children','width','gain','shape','size','power','burstShare','clusterSize','clusterProbability','clusterWidth']:assert layer[k]==old[k],(layer['id'],k)
assert g['bursts']==base['P']['sparkGraph']['bursts']
for name,v in [('基线参数.json',base),('候选参数.json',trial)]:
 (O/name).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
portable=dict(format='fwl.recipe/1',key='rv:SGS1',name='仙女棒_快慢火星与轻气流',base='SGS1',baker='4.9.114',at='2026-10-18',snap=dict(kind='single',repId='SGS1',P=trial['P'],M=trial['M']))
(O/'仙女棒_快慢火星与轻气流.recipe.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('运动修订副本已生成；原13形态、数量、大小、亮度及爆发节奏保持')
