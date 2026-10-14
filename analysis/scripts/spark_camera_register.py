"""镜头参数与两候选登记。重跑基于旧候选归档，不累乘增益。"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
def write(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
fields=[('cameraMotion','快门运动模糊','开关','0','0/1'),('cameraShutter','曝光时间','s','0.03333333333333333','0.0001–1'),('cameraPhase','快门位置','选项','end','start/center/end'),('cameraQuality','输出成像质量','选项','high','fast/high/reference'),('cameraDof','景深与散焦','开关','0','0/1'),('cameraDistance','镜头距原点','m','1','0.001–10000'),('cameraFocus','对焦距离','m','1','0.001–10000'),('cameraAperture','光圈直径','m','0.012','0–100'),('cameraBlades','散焦光斑','选项','0','0圆形/6六边形')]
a=read('analysis/命名/参数名称表.json');b=read('analysis/命名/发射器表.json');keys=[x[0] for x in fields]
a=[x for x in a if x['key'] not in keys];b['参数']=[x for x in b['参数'] if x['key'] not in keys]
for emitter in b['发射器']:
 if emitter['名']=='输出' and '镜头成像' not in emitter['模块']:emitter['模块'].append('镜头成像')
for key,name,unit,default,ran in fields:
 common={'id':'camera-'+key,'key':key,'sec':'镜头成像'};note='按资源保存；两开关默认关闭。快门按秒积分；景深只使用真实三维粒子深度。烘入贴图，游戏镜头不重新对焦。'
 a.append({**common,'old':name,'module_cn':'镜头成像','module_en':'Camera Imaging','en':key,'cn':name,'desc':note,'updown':'曝光越长运动亮痕越长；光圈越大离焦越强；高质量更慢','unit':unit,'range':ran,'default':default,'random':'无','ue':'烘入灰度序列贴图；不新增UE材质/模块','tag':'通用','note':note,'check':'spark_camera_test.cjs / spark_camera_probe.cjs','family':'通用镜头；景深需三维模型','tier':'advanced'})
 b['参数'].append({**common,'全名':name,'发射器':'输出','模块':'镜头成像','名':name,'类别':'引擎字段' if unit in ['开关','选项'] else '物理量','单位':unit})
write('analysis/命名/参数名称表.json',a);write('analysis/命名/发射器表.json',b)
p='analysis/原理/条目_窜天猴与仙女棒.json';doc=read(p)
archive=R/'analysis/results/SparkGraph/镜头修订前参数.json'
if not archive.exists():archive.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=json.loads(archive.read_text(encoding='utf-8'))
for entry in doc['entries']:
 P=entry['p'];rocket=entry['id']=='SGR1';scale=38 if rocket else 1
 P.update(cameraMotion=1,cameraShutter=1/30,cameraPhase='end',cameraQuality='high',cameraDof=1,cameraDistance=scale,cameraFocus=scale,cameraAperture=.018*scale,cameraBlades=0)
 # 旧版沿整条几何线重复面亮度，新版曝光平均摊开能量，需重新校准同一形态的真实亮度。
 for i,e in enumerate(P['sparkGraph']['emitters']):
  if e['shape']=='line':e['gain']*=24
  if i in (1,2,4,5,6,7):e['gain']*=8
  if i==8:e['gain']*=3
  if i==10:e['gain']*=2
 entry.update(why='13层同模拟事件；可选快门曝光积分与真实Y深度散焦。',look=['快火星自动拉长、慢火星变短。','焦内细芯与焦外散焦光斑，短促爆发和分叉仍完整。'],note='镜头设置烘入贴图，不随UE相机重算；两开关按资源保存，旧资产默认关闭。')
write(p,doc)
print('镜头参数与候选登记完成')
p=R/'tool/src/js/10_types.js';s=p.read_text(encoding='utf-8');s=s.replace("const VERSION = '4.9.83'", "const VERSION = '4.9.84'");p.write_text(s,encoding='utf-8')
