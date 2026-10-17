"""复制用户窜天猴主体为独立柔光暗底；原件只读，运动逐项保持。"""
from pathlib import Path
import copy,json,hashlib,math,re
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/RocketSoft';O.mkdir(parents=True,exist_ok=True)
version=re.search(r"const VERSION = '([^']+)'",(R/'tool/src/js/10_types.js').read_text(encoding='utf-8'))[1]
source=next((R/'analysis/我的配方').glob('*/正式资产-窜天猴尾焰__*.json'))
raw=source.read_bytes();saved=json.loads(raw);layer=saved['snap']['layers'][0]
assert len(saved['snap']['layers'])==1
assert all(layer['L'].get(k,v)==v for k,v in [('scale',1),('delay',0),('rate',1),('mirror',False)])
base={'P':copy.deepcopy(layer['P']),'M':copy.deepcopy(layer['M'])}
for k in ['stages','headInt','tailInt','ramp0','ramp1','ramp2','ramp3','xw']:
 if k in layer['L']:base['M'][k]=copy.deepcopy(layer['L'][k])
soft=copy.deepcopy(base);g=soft['P']['sparkGraph'];g['name']='窜天猴尾焰 · 柔光暗底'
sigma=.16;fraction=.12
for e in g['emitters']:
 w=e['width'];nw=math.hypot(w,2*sigma)
 # 原镜头胶囊核的面积系数；片状粒子的裁边/翻转使实际光量有小差异，另用实包测量。
 aspect=e['aspect'] if e['shape']!='line' else 1
 area=(2*math.pi+2*math.sqrt(2*math.pi)*(aspect-1))/(2*math.pi)
 e.update(width=nw,gain=e['gain']*fraction*(w/nw)**2*area,shape='line',aspect=1,spin=0,twist=0)
soft['M'].update(ramp0='#000000',ramp1='#d06f1a',ramp2='#df8c2f',ramp3='#e8a94e')
allowed={'width','gain','shape','aspect','spin','twist'}
for e,b in zip(g['emitters'],base['P']['sparkGraph']['emitters']):
 assert {k:v for k,v in e.items() if k not in allowed}=={k:v for k,v in b.items() if k not in allowed}
assert {k:v for k,v in g.items() if k not in ['name','emitters']}=={k:v for k,v in base['P']['sparkGraph'].items() if k not in ['name','emitters']}
for name,data in [('主体参数.json',base),('候选参数.json',soft)]:
 (O/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
portable=dict(format='fwl.recipe/1',key='rv:SGRS1',name='窜天猴尾焰_柔光暗底',base='SGRS1',baker=version,at='2026-10-18',snap=dict(kind='single',repId='SGRS1',P=soft['P'],M=soft['M']))
(O/'窜天猴尾焰_柔光暗底.recipe.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
meta=dict(source=str(source.relative_to(R)),sourceSHA256=hashlib.sha256(raw).hexdigest(),sourceName=saved['name'],sourceUE=saved['ue'],sigmaM=sigma,energyFraction=fraction,phase='same birth/seed/period/shutter',bounds=g['bounds'],newEnglishName='RocketTail_Soft')
(O/'来源与设置.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('独立副本生成，源SHA',meta['sourceSHA256'],'；13层运动字段与全局流场/相位/取景完全保持')
