"""登记粒子图整体/分叉控制与易读名称；不改用户配方。"""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[2]
fields=[
 ('scaleCone','喷射半锥角','整体调整',0,3,'乘锥形层的半锥角；球形散射不变。有效角超过180°时拒绝修改，不改变气流。'),
 ('scaleCount','粒子数量','整体调整',0,4,'乘根层每周期粒子数并四舍五入；子孙自然随母粒增减，不逐代复乘。爆发时刻与概率保留。'),
 ('scaleWidth','粒子大小','整体调整',0,4,'乘所有层粒子直径；不改变初速、曝光或散焦光圈。增大直径会增加覆盖面积与光量。'),
 ('scaleLife','粒子寿命','整体调整',.05,4,'乘所有层寿命上下限；按寿命触发的分叉随之推迟，额外延迟仍是原秒数。不是播放速度。'),
 ('scaleGain','粒子亮度','整体调整',0,4,'乘所有层亮度，保留各层随机和曲线；不改Ramp或镜头曝光，过大会饱和。'),
 ('scaleSpeed','初速','整体调整',0,4,'乘所有层自身初速上下限；子粒继承的是调整后的母粒速度，不再重复乘。不会改变粒子直径。'),
 ('scaleGravity','重力','整体调整',0,4,'乘所有层原加速度向量；原方向不变，0关闭该加速度。不会改变气流和阻力。'),
 ('branchLife','分叉寿命','分叉调整',.05,4,'只乘全部子代寿命，延长可增加飞行距离；实际距离还受初速、继承、阻力和气流影响，不是严格距离倍率。二级出生时刻会随一级寿命变化。'),
 ('branchAngle','分叉角度','分叉调整',0,3,'乘自身散射方向与母粒速度的夹角，0沿母粒飞行方向，1保持原方向；母粒静止取子层配置轴，最大180°。继承速度独立相加，因此实际轨迹夹角还受速度继承影响。'),
 ('branchCount','分叉数量','分叉调整',0,4,'只乘一级每母粒子粒数并四舍五入；二级随一级数量变化，不再乘一次。0关闭所有分叉。总量还受子粒发生概率影响。'),
 ('branchWidth','分叉大小','分叉调整',0,4,'只乘全部子代粒子直径，与整体粒子大小相乘；不会增加飞行距离或曝光时间。'),
 ('branchSpeed','分叉初速','分叉调整',0,4,'只乘全部子代自身散射初速，与整体初速相乘；母粒传来的速度由层内速度继承单独控制。快门开启时速度增加也会拉长光迹，粒子直径不变。'),
 ('branchGravity','分叉重力','分叉调整',0,4,'只乘全部子代原加速度，与整体重力相乘；0关闭子代重力，原加速度为0时无效。寿命很短时弯曲很弱，想看明显下落可先增加分叉寿命。')]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
def save(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
names=read('analysis/命名/参数名称表.json');emit=read('analysis/命名/发射器表.json')
for e in emit['发射器']:
 if e['名']=='分层粒子图' and '分叉调整' not in e['模块']:e['模块'].insert(e['模块'].index('整体调整')+1,'分叉调整')
for k,n,module,lo,hi,desc in fields:
 key='sparkGraph.'+k;old=next((r for r in names if r['key']==key),{})
 ident=old.get('id','graph-scale-'+k)
 names=[r for r in names if r['key']!=key];emit['参数']=[r for r in emit['参数'] if r['key']!=key]
 names.append(dict(id=ident,key=key,sec='分层粒子图',old=n,cn=n,en=k,module_cn=module,module_en='Global Multipliers' if module=='整体调整' else 'Branch Multipliers',desc=desc,updown='大于1增加，小于1减少；1保持原值。',unit='×',range=f'{lo}–{hi}（常用范围）',default='1',random='保留各层种子和分布',ue='有效粒子属性烘入PC/手机序列贴图',tag='粒子图通用',note='只影响当前粒子图，不回写层原值。增大角度/速度/寿命可能越出固定取景，请看引擎回放。',family='分层粒子图',tier='core'))
 emit['参数'].append(dict(id=ident,key=key,sec='分层粒子图',全名=n,发射器='分层粒子图',模块=module,名=n,类别='物理量',单位='×'))
renames={'fieldResponse':'随风响应','fieldConverge':'收束强度','fieldTurbulence':'扰动强度','fieldScale':'扰动尺寸','fieldCycles':'扰动变化次数','emitters[].fieldCoupling':'随风强度'}
for k,n in renames.items():
 for r in names:
  if r['key']=='sparkGraph.'+k:r.update(old=n,cn=n)
 for r in emit['参数']:
  if r['key']=='sparkGraph.'+k:r.update(全名=n,名=n)
save('analysis/命名/参数名称表.json',names);save('analysis/命名/发射器表.json',emit)
p=R/'tool/src/js/10_types.js';s=p.read_text(encoding='utf-8');s=re.sub(r"const VERSION = '[^']+'","const VERSION = '4.9.114'",s,count=1);p.write_text(s,encoding='utf-8')
print('已登记13项默认1整体/分叉控制与气流显示名；内部键、单位、用户配方不变')
