"""从只读工坊参数生成候选，并在固定烘焙器快照上接通通用粒子图。"""
from pathlib import Path
import json, re, subprocess, hashlib, copy, sys
R=Path(__file__).resolve().parents[2]
D=R/'experiments/spark-graph'; O=R/'analysis/results/SparkGraph'
O.mkdir(parents=True,exist_ok=True)
if '--baseline' in sys.argv:
 s=subprocess.check_output(['git','show','714e94b2:tool/FireworkBaker.html'],cwd=R).decode('utf-8')
 (R/'analysis/local/SparkGraph/baseline.html').write_text(s.replace('<head>','<head><base href="../../../tool/">',1),encoding='utf-8');sys.exit(0)
if '--snapshot' in sys.argv:
 s=(R/'tool/FireworkBaker.html').read_text(encoding='utf-8').replace('<head>','<head><base href="../../../tool/">',1)
 s=s.replace("'fwb.'", "'fwb.sparkgraph.'")
 s=s.replace('</script>\n</body>', "setTimeout(()=>graphOpen('rocket',true),0);\n</script>\n</body>",1)
 (O/'烘焙器.html').write_text(s,encoding='utf-8');print('当前版本快照已保存');sys.exit(0)
SOURCE='714e94b2'
original=Path('D:/Blender/Firework_FX_Lab/assets/Sparkler/V05/parameters.json')
src=json.loads(original.read_text(encoding='utf-8'))
es=src['systems'][0]['emitters']; ids={e['uid']:f'e{i+1:02}' for i,e in enumerate(es)}
def distribution(p,key):
 d=p[key+'_distribution_spec'];return [*d['range'],d.get('shape_parameters',{}).get('power',1)]
def curve(e,key):return [p['location'] for p in e['curves'][key]['points']]
emitters=[]
for item in es:
 p=item['parameters'];parent=ids.get(item['parent_uid'])
 emitters.append(dict(id=ids[item['uid']],name=p['name'],parent=parent,seed=p['seed'],enabled=True,
 count=round(p['spawn_count']*64/60),speed=distribution(p,'speed'),life=distribution(p,'life'),size=distribution(p,'size'),power=distribution(p,'intensity'),
 width=p['visible_diameter'],gain=p['emission_gain']/20,drag=p['linear_drag'],gravity=p['gravity'],
 directionMode='sphere' if p['direction_mode']=='SPHERE' else 'cone',direction=p['direction'],cone=0 if p['direction_mode']=='LINE' else p['cone_angle'],
 shape={'TUBE':'line','POINT':'point','FRAGMENT':'fragment'}[p['shape_mode']],history=0 if p['trail_mode']=='OFF' else p['trail_history'] if p['trail_mode']=='ARTISTIC_PATH' else 1/30,
 taper=p['trail_taper'],aspect=p['shape_aspect'],spin=p['shape_spin'],twist=p['shape_twist'],extent=p['spawn_extent'],
 clusterSize=p['cluster_size'],clusterProbability=p['cluster_probability'],clusterWidth=p['cluster_time_width'],clusterDirection=p['cluster_direction_blend'],
 children=p['child_count'],event=p['parent_event_life_fraction'],delay=p['parent_event_delay_s'],inherit=p['inherit_velocity'],probability=p['child_probability'],
 noise=p['noise_amplitude'],noiseHz=p['noise_frequency'],sizeCurve=curve(item,'size'),brightCurve=curve(item,'intensity'),burstShare=.17 if not parent else 0))
# 灰度线条采用屏幕覆盖率能量，与Blender表面发光口径不同；按形态校准，不靠整体模糊。
for i,e in enumerate(emitters):
 e['gain']*=[.8,16,8,1,8,12,12,12,1,3,1,1,.4][i]
spark=dict(name='仙女棒 · 全形态',period=64/30,bounds=[-.36,.36,-.36,.36],bursts=[[.24,.025],[.89,.035],[1.73,.022]],emitters=emitters)
rocket=copy.deepcopy(spark);rocket.update(followAxis=True,name='窜天猴 · 短促喷射尾焰',bounds=[-7,7,-18,2],bursts=[[.18,.026],[.69,.042],[1.55,.025]])
for i,e in enumerate(rocket['emitters']):
 scale=38;e['speed'][:2]=[v*scale for v in e['speed'][:2]];e['width']*=scale;e['extent']*=scale;e['noise']*=scale;e['gravity']=[0,0,-9.81]
 e['burstShare']=.38 if not e['parent'] else 0
 if not e['parent']:
  e['directionMode']='cone';e['direction']=[0,0,-1];e['cone']=18 if i in (1,2,4) else 35
 if i in (0,12):e['speed'][:2]=[9,24];e['cone']=9;e['extent']*=.3;e['width']*=.45
 if i in (1,2,4):e['history']=.036;e['count']=round(e['count']*1.35)
 if i==3:e['count']*=2
 if i==12:e['aspect']=2.2
# 仙女棒在亚像素细丝上额外补足灰度编码能量，保留线径，避免把细丝变粗杆。
for i in [1,2,4,5,6,7]:spark['emitters'][i]['gain']*=2.5
for i,k in [(3,4),(8,4),(10,5),(11,4)]:spark['emitters'][i]['gain']*=k
for i in [5,6]:spark['emitters'][i]['speed'][:2]=[v*1.5 for v in spark['emitters'][i]['speed'][:2]]
presets={'sparkler':spark,'rocket':rocket}
for key,r in presets.items():r['presetKey']=key
(D/'presets.json').write_text(json.dumps(presets,ensure_ascii=False,indent=2),encoding='utf-8')
(O/'来源.json').write_text(json.dumps({'source':str(original),'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'base_commit':SOURCE,'shape_count':len(emitters),'note':'参数来源V05；亮度口径与光学不同，需视觉校对，非逐像素继承。周期候选64/30秒；用户不要求严格无缝，爆发节奏优先。'},ensure_ascii=False,indent=2),encoding='utf-8')
(R/'tool/src/js/17_graph_presets.js').write_text('// 从只读工坊V05生成；实际口径与来源见spark_graph_prepare.py。\nconst GRAPH_PRESETS='+json.dumps(presets,ensure_ascii=False,indent=2)+";\nTYPES.sparkgraph={p:{...TYPES.fountain.p,sparkGraph:GRAPH_PRESETS.rocket},m:{...TYPES.fountain.m}};\n",encoding='utf-8')
print('候选参数已生成；请构建后以--snapshot保存可审看版本')
