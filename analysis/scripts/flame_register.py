"""只增补循环火焰的参数元数据，不改现有模板或其他参数行。"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
FIELDS = [
 ('spaceScale','整体尺寸','×','整体调整','0.01–20','1','整套世界坐标和固定取景等比缩放，不改变循环时间或原值。'),
 ('emitters[].sourceScale','出生范围倍率','×','形状','0–10','[1,1,1]','根层出生范围分别乘XYZ；Z为0得到贴地面源。出生半径为0时无效，子粒继承母粒位置。'),
 ('emitters[].sourceOffset','源中心','m','形状','-10–10','[0,0,0]','根层出生中心的XYZ偏移；子粒继承母粒位置时无效。'),
 ('emitters[].flameDensity','火焰密度','1/m','形态','0–80','8','体积消光系数；0没有可见火焰，越大内部更厚实。只用于体积火焰。'),
 ('emitters[].flameDepth','纵深厚度','×','形态','0.05–4','1','密度管在观察纵深Y方向的厚度比例；改变光程。只用于体积火焰。'),
 ('emitters[].flameNoise','大块侵蚀','1','形态','0–1','0.65','粗尺度三维噪声侵蚀比例；越大空洞和破碎越多，0关闭。'),
 ('emitters[].flameDetail','细节侵蚀','1','形态','0–1','0.3','细尺度三维噪声侵蚀比例；越大边缘细碎，0关闭。'),
 ('emitters[].flameScale','细节尺度','m','形态','0.001–2','0.16','噪声的空间波长；侵蚀与卷曲全为0时无效。太小的细节需要更高单格分辨率和积分样本。'),
 ('emitters[].flameRise','细节上移速度','m/s','形态','-5–5','0.7','噪声沿Z方向移动的速度；负数向下。侵蚀与卷曲全为0时无效，不替代气流的轨迹控制。'),
 ('emitters[].flameWarp','卷曲位移','m','形态','0–0.5','0.07','连续三维噪声对密度管的横向扭曲幅度；0关闭，不改变粒子中心轨迹。'),
 ('emitters[].flameTip','尖端半径比例','1','形态','0–1','0.04','火舌顶端相对根部的半径；0最尖，1等宽。'),
 ('emitters[].flameFloorEnabled','地面截断','选项','形态','0/1','1','在地面高度下截去密度，防止向地下渗漏。只用于体积火焰。'),
 ('emitters[].flameFloor','地面高度','m','形态','-10–10','0','局部Z截断平面；关闭地面截断时无效，整体尺寸倍率随后作用。'),
 ('emitters[].flameSteps','射线积分样本','次','形态','8–64整数','24','每条观察射线的积分样本；越多越稳定，烘焙更慢；不会增加引擎消耗。'),
]

def main():
 np=ROOT/'analysis/命名/参数名称表.json'; ep=ROOT/'analysis/命名/发射器表.json'
 names=json.loads(np.read_text(encoding='utf-8')); emit=json.loads(ep.read_text(encoding='utf-8'))
 for e in emit['发射器']:
  if e['名']=='分层粒子图':
   for mod in ['形状','形态']:
    if mod not in e['模块']:e['模块'].append(mod)
 for f,n,u,mod,ran,default,desc in FIELDS:
  key='sparkGraph.'+f; ident='flame-'+f
  names=[x for x in names if x['key']!=key];emit['参数']=[x for x in emit['参数'] if x['key']!=key]
  names.append(dict(id=ident,key=key,sec='分层粒子图',old=n,cn=n,en=f,module_cn=mod,module_en='Flame Volume',desc=desc,updown=desc,unit=u,range=ran,default=default,random='固定种子；按层大小/亮度随机及曲线',ue='密度积分写入灰度序列贴图；整体尺寸写入cascade.json面片尺寸与Pivot',tag='粒子图通用',note='随资源保存；不用新材质',family='分层粒子图',tier='advanced'))
  emit['参数'].append({'id':ident,'key':key,'sec':'分层粒子图','全名':n,'发射器':'分层粒子图','模块':mod,'名':n,'类别':'引擎字段' if f.endswith('flameSteps') else '物理量','单位':u})
 for row in names:
  if row['key']=='sparkGraph.emitters[].shape':row['desc']+='；体积火焰沿同一轨迹重建密度，使用火焰参数，不使用拉丝时间/自转/翻转。' if '体积火焰' not in row['desc'] else ''
 np.write_text(json.dumps(names,ensure_ascii=False,indent=1)+'\n',encoding='utf-8');ep.write_text(json.dumps(emit,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

if __name__=='__main__':main()
