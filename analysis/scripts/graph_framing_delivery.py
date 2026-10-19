"""汇总已检查的同一候选，复制本机交付副本；不写UE或用户原存档。"""
from pathlib import Path
import json,hashlib,shutil,datetime
R=Path(__file__).resolve().parents[2]
O=R/'analysis/results/GraphFraming'
D=R/'analysis/local/输出/取景修复_20261019'
D.mkdir(parents=True,exist_ok=True)
cases=json.loads((O/'收紧取景参数.json').read_text(encoding='utf-8'))
stats=json.loads((O/'候选参数与导出锚点核对.json').read_text(encoding='utf-8'))
std=json.loads((R/'analysis/probe/标准检查/标准检查.json').read_text(encoding='utf-8'))
def save(p,d):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for c in cases:
 id=c['id'];src=O/id/'candidate';dst=D/c['name'];dst.mkdir(exist_ok=True)
 assert std['items'][id]['pass']
 packs=[]
 for p in src.iterdir():
  if p.suffix in ['.zip','.json','.jpg']:shutil.copy2(p,dst/p.name)
 z=src/(c['name']+'.zip')
 packs.append({'name':'EFX_FireWorks_'+c['name'],'replica':id,'sha256':hashlib.sha256(z.read_bytes()).hexdigest()})
 checks={pf:json.loads((src/(pf+'-回放.json')).read_text(encoding='utf-8')) for pf in ['PC','手机']}
 assert all(v['pass'] for v in checks.values())
 rec={'effect':{'SGR1':'rocket_graph','SGS1':'sparkler_graph','SGRS1':'rocket_soft'}[id],'entry':id,'ver':std['items'][id]['ver'],'version':'4.9.118','time':datetime.datetime.now().isoformat(timespec='seconds'),'dir':dst.relative_to(R).as_posix(),'packages':packs,'platforms':['PC','手机'],'params':(src/'导出核对.json').relative_to(R).as_posix(),'bounds':c['P']['sparkGraph']['bounds'],'UE实播':False}
 task=R/'analysis/results'/(id+'E118')
 save(task/'导出清单.json',rec)
 save(task/'回放检查.json',{'pass':True,'version':'4.9.118','ver':rec['ver'],'platforms':checks})
 save(dst/'导出清单.json',rec)
 for pf in ['PC','手机']:shutil.copy2(O/(id+'-'+pf+'-前后对照.jpg'),dst/(pf+'-前后对照.jpg'))
shutil.copy2(O/'候选参数与导出锚点核对.json',D/'候选参数与导出锚点核对.json')
readme='''# 取景修复 · 烘焙器4.9.118

刷新烘焙器，在「待我验收」打开尾焰、仙女棒或柔光暗底，右栏「输出 → 取景」可调左、右、下、上边界（米，相对喷口）。这是整周期固定矩形；改取景不改粒子运动或真实大小。

本目录每个效果一份推荐ZIP（内含PC/手机）和原生.recipe.json，可用「打开」载入完整副本。用户原主体/粒子/柔层存档未覆盖。原参数、真实包报告和前后对照在各自目录。

尾焰/仙女棒/柔层面片面积分别减少25.2%/26.5%/53.3%。仍各64帧，PC单格512、手机256；贴图内存不因此下降，未经UE性能测试。

**取景改变后选完整导入/全部更新**，需要同步Initial Size与独立PivotOffset。不能只换贴图；各层按各自尺寸及Pivot对齐同一喷口、同起播相位，不要求相同面片尺寸。手填以包内说明的「面板值」为准，不把JSON内部Pivot直接填入UE面板。

已检查PC/手机真实包；用户审美、UE三层叠加、Bloom、压缩和GPU扰动配合仍未验收。主序列NoMip、DistantVFX，永远不勾NeverStream。
'''
(D/'使用说明.md').write_text(readme,encoding='utf-8')
print(D)
