"""全局气流参数只登记一次；不会替换现有候选的其他调参。"""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[2]
fields=[
('fieldEnabled','全局气流','选项',0,1,1,'当前粒子图所有层共用，关闭不计算场。'),
('fieldResponse','随流响应率','1/s',0,100,.5,'响应越高，粒子越快追随气流；不是直接覆盖速度。'),
('fieldStart','开始影响距离','m',0,20,.05,'从喷口沿气流轴量，近段保留原锥形初速。'),
('fieldRamp','渐入长度','m',.001,20,.05,'从零平滑增加到完整影响所需距离。'),
('fieldAxisX','气流轴 · X','1',-1,1,.01,'收束轴与渐入距离的方向；从喷口原点出发。'),
('fieldAxisY','气流轴 · Y（纵深）','1',-1,1,.01,'场在三维计算。'),
('fieldAxisZ','气流轴 · Z（竖直）','1',-1,1,.01,'向下为负；轴向量自动归一化。'),
('fieldWindX','定向风 · X','m/s',-100,100,.1,'共享气流横向速度。'),
('fieldWindY','定向风 · Y（纵深）','m/s',-100,100,.1,'共享气流纵深速度。'),
('fieldWindZ','定向风 · Z（竖直）','m/s',-100,100,.1,'向下吹取负值；三个风速为0即无定向风。'),
('fieldConverge','轴向收束率','1/s',0,30,.1,'径向风速=-收束率×距轴距离，0关闭收束。造型近似，不等同真实射流卷吸解。'),
('fieldTurbulence','涡流扰动速度','m/s',0,50,.1,'空间连续共享扰动，0关闭；不是逐粒随机抖动。'),
('fieldScale','涡流空间尺度','m',.01,30,.05,'越大形成越宽的弯折；不是提高随机强度。'),
('fieldCycles','每循环演化次数','1',0,10,1,'0为静态空间场，整数保证气流本身周期重复；不会摊平均匀发射节奏。'),
('fieldSeed','气流随机种子','1',0,999999,1,'只改变共享空间场相位，不改粒子出生。')]
def read(f):return json.loads((R/f).read_text(encoding='utf-8'))
def write(f,x):(R/f).write_text(json.dumps(x,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
names=read('analysis/命名/参数名称表.json');emit=read('analysis/命名/发射器表.json')
for e in emit['发射器']:
 if e['名']=='分层粒子图':
  for mod in ['全局气流','阻力重力']:
   if mod not in e['模块']:e['模块'].append(mod)
rows=[]
for f,n,u,lo,hi,step,desc in fields+[('emitters[].fieldCoupling','随流倍率（0 不受全局气流）','×',0,4,.05,'乘全局响应率；0排除此层，小倍率保留更强惯性。')]:
 key='sparkGraph.'+f;module='阻力重力' if f.startswith('emitters') else '全局气流';ident='flow-'+f
 names=[x for x in names if x['key']!=key];emit['参数']=[x for x in emit['参数'] if x['key']!=key]
 names.append(dict(id=ident,key=key,sec='分层粒子图',old=n,cn=n,en=f,module_cn=module,module_en='Flow Field',desc=desc,updown=desc,unit=u,range=f'{lo}–{hi}',default='关闭/见面板',random='固定种子',ue='轨迹烘入序列贴图；不新增引擎模块',tag='粒子图通用',note='随资源保存；位于喷口局部坐标',family='分层粒子图',tier='advanced'))
 emit['参数'].append({'id':ident,'key':key,'sec':'分层粒子图','全名':n,'发射器':'分层粒子图','模块':module,'名':n,'类别':'物理量','单位':u})
 if f.startswith('emitters'):continue
 if f=='fieldEnabled':rows.append("{sel:'sparkGraph.fieldEnabled',label:'全局气流',io:{get:v=>v,set:v=>+v},options:[[0,'关闭'],[1,'开启']]} ")
 else:rows.append(json.dumps([key,n,u,lo,hi,step],ensure_ascii=False)[:-1]+',P=>!!P.sparkGraph.fieldEnabled]')
write('analysis/命名/参数名称表.json',names);write('analysis/命名/发射器表.json',emit)
p=R/'tool/src/js/46_graph_model.js';s=p.read_text(encoding='utf-8');marker='// 全局气流参数（由spark_flow_register.py登记）'
if marker in s:s=s[:s.index(marker)]
s+='\n'+marker+"\nSCHEMA.push({sec:'分层粒子图',graphOnly:true,show:P=>!!P.sparkGraph,hint:'全局气流作用于当前图全部层；先扩散再渐入。定向风、轴向收束和涡流可叠加。',items:[\n"+',\n'.join(rows)+'\n]});\n';p.write_text(s,encoding='utf-8')
doc=read('analysis/原理/条目_窜天猴与仙女棒.json')
archive=R/'analysis/results/SparkFlow/修订前参数.json';archive.parent.mkdir(parents=True,exist_ok=True)
if not archive.exists():archive.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for e in doc['entries']:
 if e['id']!='SGR1':continue
 g=e['p']['sparkGraph'];g.update(fieldEnabled=1,fieldResponse=25,fieldStart=1.5,fieldRamp=3.5,fieldAxisX=0,fieldAxisY=0,fieldAxisZ=-1,fieldWindX=0,fieldWindY=0,fieldWindZ=-45,fieldConverge=4.5,fieldTurbulence=12,fieldScale=10,fieldCycles=1,fieldSeed=17)
 for layer in g['emitters']:layer['fieldCoupling']=.45 if layer['id'] in ['e09','e11','e12'] else 1
 e['look']=['近喷口保留锥形扩散，中段向轴线收束，再随连续气流向下弯动。','13层形态、亲子分叉与短促爆发保留；场与镜头成像均可关闭。']
 e['why']='全局气流叠加、有限惯性响应；真实轨迹同时驱动分叉和快门拉伸。'
write('analysis/原理/条目_窜天猴与仙女棒.json',doc)
p=R/'tool/src/js/10_types.js';s=p.read_text(encoding='utf-8');s=re.sub(r"const VERSION = '[^']+'", "const VERSION = '4.9.104'",s,count=1);p.write_text(s,encoding='utf-8')
print('统一参数栏、元数据及窜天猴候选登记完成')
