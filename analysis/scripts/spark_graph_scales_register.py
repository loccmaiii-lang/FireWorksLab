"""登记用户授权的五项整体倍率；不改任何候选和用户存档。"""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[2]
fields=[
 ('scaleCone','半锥角倍率',0,3,'只乘锥形层的半锥角，球形散射不变；不改出生半径、喷射轴或全局气流。有效角超过180°时拒绝修改。'),
 ('scaleCount','粒子数量倍率',0,4,'只乘根层每周期粒子数并四舍五入，子孙自然随母粒批次增减；每母粒子粒数、概率、爆发时刻不变，总量近似按倍率变化。0不生成。'),
 ('scaleWidth','粒子直径倍率',0,4,'乘每层粒子直径，保持大小随机和大小曲线；不改速度、曝光时间或散焦光圈。粗粒覆盖面积增大，总光量可能随之增加。'),
 ('scaleLife','粒子寿命倍率',.05,4,'乘所有层寿命上下限，分布偏向不变；分叉时刻随有效母粒寿命变化，额外延迟仍为原秒数。有效寿命须小于周期；不是整体播放速度。'),
 ('scaleGain','粒子亮度倍率',0,4,'乘所有层亮度，保持亮度随机及亮度曲线；不改数量、直径、Ramp或镜头曝光。增加可能导致高光饱和。')]
def load(f):return json.loads((R/f).read_text(encoding='utf-8'))
def save(f,x):(R/f).write_text(json.dumps(x,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
names=load('analysis/命名/参数名称表.json');emit=load('analysis/命名/发射器表.json')
for e in emit['发射器']:
 if e['名']=='分层粒子图' and '整体调整' not in e['模块']:e['模块'].insert(0,'整体调整')
for k,n,lo,hi,desc in fields:
 key='sparkGraph.'+k;ident='graph-scale-'+k
 names=[r for r in names if r['key']!=key];emit['参数']=[r for r in emit['参数'] if r['key']!=key]
 names.append(dict(id=ident,key=key,sec='分层粒子图',old=n,cn=n,en=k,module_cn='整体调整',module_en='Global Multipliers',desc=desc,updown='大于1增加，小于1减少；1保留原值。',unit='×',range=f'{lo}–{hi}（常用范围）',default='1',random='保留各层种子和分布',ue='有效粒子属性烘入PC/手机序列贴图',tag='粒子图通用',note='当前粒子图所有层共用；不回写层原值。固定取景下增大角度/寿命可能越界，请检查引擎回放。',family='分层粒子图',tier='core'))
 emit['参数'].append({'id':ident,'key':key,'sec':'分层粒子图','全名':n,'发射器':'分层粒子图','模块':'整体调整','名':n,'类别':'物理量','单位':'×'})
save('analysis/命名/参数名称表.json',names);save('analysis/命名/发射器表.json',emit)
p=R/'tool/src/js/10_types.js';s=p.read_text(encoding='utf-8');s=re.sub(r"const VERSION = '[^']+'","const VERSION = '4.9.105'",s,count=1);p.write_text(s,encoding='utf-8')
print('五项倍率登记完成；用户存档和候选参数未修改')
