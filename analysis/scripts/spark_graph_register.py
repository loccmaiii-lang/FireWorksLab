"""登记本任务的参数元数据和候选条目；不改已认可效果。"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
def write(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
fields=[
('period','周期','s','大于所有粒子寿命','影响帧间隔与事件重播周期'),
('bounds','固定取景','m','[左,右,下,上]','改变取景与输出面片米数，不改变运动'),
('bursts','爆发时刻与宽度','s','[[时刻,半宽],…]','短爆发有底量；时刻允许不等间隔'),
('followAxis','跟随喷口轴','开关','true/false','导出OrientationAxisLock；未经UE验证'),
('emitters[].id','层标识','','唯一字符串','其他层的parent引用'),
('emitters[].name','层名称','','文本','显示名称'),
('emitters[].parent','母粒','','空或此前层ID','关联分叉出生位置、速度和时刻'),
('emitters[].enabled','显示这层','','布尔','隐藏本层；保留母粒运动与子粒生成'),
('emitters[].count','每周期粒子数','粒','非负整数','仅独立出生层；不随寿命改变'),
('emitters[].seed','随机种子','','整数','本层独立随机流'),
('emitters[].speed','速度分布','m/s','[下限,上限,幂]','幂大偏向小值'),
('emitters[].life','寿命分布','s','[下限,上限,幂]','上限小于周期'),
('emitters[].size','大小倍率分布','×','[下限,上限,幂]','作用于本层直径'),
('emitters[].power','亮度倍率分布','×','[下限,上限,幂]','作用于本层亮度'),
('emitters[].width','粒子直径','m','非负','亚像素以覆盖率守恒，不靠全屏模糊'),
('emitters[].gain','亮度','×','非负','烘焙灰度能量；不改变轨迹'),
('emitters[].drag','线性阻力','1/s','非负','解析阻力，不随帧率改变'),
('emitters[].gravity','三轴加速度','m/s²','[X,Y,Z]','Z向上；作用于本层'),
('emitters[].directionMode','喷射方向','','sphere/cone','球形散射或定向锥体'),
('emitters[].direction','喷射轴','','[X,Y,Z]非零','仅锥体生效'),
('emitters[].cone','喷射半锥角','°','0–180','仅锥体生效'),
('emitters[].shape','粒子形态','','line/point/fragment','历史拉丝、柔亮点、不规则碎片'),
('emitters[].history','历史线长时间','s','非负','仅line生效；根据实际速度与轨迹拉伸'),
('emitters[].taper','尾端粗细比例','×','0–1','仅line生效；0尖，1等粗'),
('emitters[].aspect','长宽比','×','≥1','点或碎片的长度，不改变轨迹'),
('emitters[].spin','自转','°/s','有限数','点或碎片生效'),
('emitters[].twist','翻转','°/s','有限数','碎片的投影宽度变化'),
('emitters[].extent','出生半径','m','非负','独立层的球形出生体积'),
('emitters[].clusterSize','每簇候选数量','粒','正整数','不是额外增加粒子'),
('emitters[].clusterProbability','成簇概率','','0–1','0独立随机；1全部成簇'),
('emitters[].clusterWidth','簇内出生半宽','s','非负','越小越集中'),
('emitters[].clusterDirection','簇内方向关联','','0–1','0独立方向；1共享方向'),
('emitters[].burstShare','爆发段粒子比例','','0–1','其余粒子保留连续底量'),
('emitters[].children','每母粒子粒数','粒','非负整数','仅子层生效'),
('emitters[].event','分叉时刻','×母粒寿命','0–1','按母粒实际随机寿命触发'),
('emitters[].delay','额外延迟','s','非负','在寿命比例时刻后延迟；母粒灭后沿同轨迹延拓'),
('emitters[].inherit','速度继承','×','非负','继承事件瞬间的完整母粒速度'),
('emitters[].probability','子粒发生概率','','0–1','逐个子粒独立决定'),
('emitters[].noise','位移扰动','m/s','非负','随年龄增加的平滑正弦位移幅度'),
('emitters[].noiseHz','扰动频率','Hz','非负','平滑扰动频率；不作为闪烁频率'),
('emitters[].sizeCurve','大小曲线','×','[[0–1寿命,非负倍率],…]','按寿命升序；空曲线恒为1'),
('emitters[].brightCurve','亮度曲线','×','[[0–1寿命,非负倍率],…]','按寿命升序；空曲线恒为1')]
a=read('analysis/命名/参数名称表.json');b=read('analysis/命名/发射器表.json')
a=[x for x in a if not x['key'].startswith('sparkGraph')];b['参数']=[x for x in b['参数'] if not x['key'].startswith('sparkGraph')]
if not any(x['名']=='分层粒子图' for x in b['发射器']):b['发射器'].append({'名':'分层粒子图','en':'Particle Graph','级':'通用父子图','说明':'固定随机流的层、事件与多形态；同一模型用于实时与烘焙','模块':['生成与运动']})
for i,(key,name,unit,ran,note) in enumerate(fields):
 key='sparkGraph.'+key;pid=f'graph-{i:02}-{key}';common={'id':pid,'sec':'分层粒子图','key':key}
 a.append({**common,'old':name,'module_cn':'生成与运动','module_en':'Particle Graph','en':key,'cn':name,'desc':note,'updown':note,'unit':unit,'range':ran,'default':'见候选完整配方；旧效果没有sparkGraph即关闭','random':'独立种子按层与粒子固定','ue':'烘入序列；方向锁与周期另写Cascade','tag':'通用','note':note,'check':'46_graph_model.js / 46_graph_render.js / 79_graph_editor.js','family':'通用（显式启用sparkGraph）','tier':'advanced'})
 b['参数'].append({**common,'全名':name,'发射器':'分层粒子图','模块':'生成与运动','名':name,'类别':'引擎字段' if key.split('.')[-1] in ['followAxis','id','name','parent','enabled','seed','shape','directionMode'] else '物理量','单位':unit or '1'})
write('analysis/命名/参数名称表.json',a);write('analysis/命名/发射器表.json',b)
entries=[]
for key,id,name in [('rocket','SGR1','窜天猴尾焰 · 分层短促喷射'),('sparkler','SGS1','仙女棒 · 13层全形态')]:
 v=read('analysis/results/SparkGraph/'+key+'-导出参数.json')
 v['P']['sparkGraph']=read('experiments/spark-graph/presets.json')[key]
 entries.append({'id':id,'date':'2026-10-14','name':name,'base':'sparkgraph','tags':'仙女棒 窜天猴 火星 分叉 分层 循环','p':v['P'],'m':v['M'],'why':'工坊V05的13层父子关系；不等间隔短爆发，固定随机流，历史轨迹拉伸。','look':'看连续底量与短爆发、长短粗细火星及延迟分叉。PC/手机都检查；不含升空弹道，喷口跟随由使用场景决定。','note':'当前尺寸和亮度为制作候选；未经UE验证。参考来源与完整报告见 analysis/results/SparkGraph。'})
write('analysis/原理/条目_窜天猴与仙女棒.json',{'说明':'本轮两套独立候选；不替换此前正式库','entries':entries})
print('参数与两套候选已登记')
