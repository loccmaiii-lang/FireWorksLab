"""仙女棒非均速试配：只生成副本，保留原13层、数量、直径、亮度和爆发时刻。"""
from pathlib import Path
import copy,json
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparklerMotion';O.mkdir(parents=True,exist_ok=True)
doc=json.loads((R/'analysis/原理/条目_窜天猴与仙女棒.json').read_text(encoding='utf-8'))
entry=next(e for e in doc['entries'] if e['id']=='SGS1');base={'P':entry['p'],'M':entry['m']};trial=copy.deepcopy(base)
g=trial['P']['sparkGraph'];g['name']='仙女棒 · 快抛慢落试配';g['bounds']=[-.5,.5,-.65,.35]
# 分布偏向让多数火星处在低速段，仍保留少量高速尾部；阻力区分形态。
settings={
 'e02':([.20,2.8,2.3],8,[.05,.19,1.4]),
 'e03':([.45,2.2,1.6],5,[.07,.23,1.4]),
 'e04':([.65,1.8,1.2],2.4,[.12,.28,1.4]),
 'e05':([.45,2.3,1.8],4,[.08,.28,1.2]),
 'e06':([.12,1.6,2.2],11,[.024,.080,1.2]),
 'e07':([.15,1.5,1.8],13,[.020,.065,1.2]),
 'e08':([.05,.65,1.8],20,[.012,.032,1.2]),
 'e09':([.55,1.6,1.2],2.2,[.12,.30,1.2]),
 'e10':([.025,.55,1.8],6,[.03,.12,1.2]),
 'e11':([.40,1.3,1.2],3.2,[.18,.36,1.2]),
 'e12':([.60,2.4,1.8],2.8,[.12,.30,1.2])}
for e in g['emitters']:
 if e['id'] in settings:
  e['speed'],e['drag'],e['life']=settings[e['id']];e['gravity']=[0,0,-9.81]
 if e['parent']:e['inherit']=.35 if e['id']=='e08' else .2
 e['fieldCoupling']=0 if e['id'] in ['e01','e13'] else .2 if e['id'] in ['e04','e09','e11','e12'] else 1
# 复用现有轴向渐入：只在燃烧点上方渐入弱热羽流，不采用尾焰收束。
g.update(fieldEnabled=1,fieldResponse=8,fieldStart=.005,fieldRamp=.035,
 fieldAxisX=0,fieldAxisY=0,fieldAxisZ=1,fieldWindX=.03,fieldWindY=0,fieldWindZ=.2,
 fieldConverge=0,fieldTurbulence=.16,fieldScale=.16,fieldCycles=1,fieldSeed=29)
for k,v in [('基线参数.json',base),('候选参数.json',trial)]:
 (O/k).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
portable=dict(format='fwl.recipe/1',key='rv:SGS1',name='仙女棒_快抛慢落_试配',base='SGS1',baker='4.9.112',at='2026-10-17',snap=dict(kind='single',repId='SGS1',P=trial['P'],M=trial['M']))
(O/'仙女棒_快抛慢落_试配.recipe.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert [e['id'] for e in g['emitters']]==[e['id'] for e in base['P']['sparkGraph']['emitters']]
for e,b in zip(g['emitters'],base['P']['sparkGraph']['emitters']):
 for k in ['count','children','width','gain','shape','size','power','burstShare','clusterSize','clusterProbability','clusterWidth']:
  assert e[k]==b[k],(e['id'],k)
assert g['bursts']==base['P']['sparkGraph']['bursts']
print('已生成数据试配；13形态、数量、粗细、亮度、爆发/成簇节奏保留；原件不写')
