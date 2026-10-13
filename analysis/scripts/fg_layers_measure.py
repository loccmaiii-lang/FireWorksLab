"""核对真实Blender图集、模板差异和同模板分簇空间预算；不改来源。"""
from pathlib import Path
import json,hashlib
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/FG_Layers'
S=Path('D:/Blender/Firework_FX_Lab/assets/Fan_Gold_Comets/V04_96_2x12_2K')
load=lambda p:json.loads(p.read_text('utf-8'))
source=load(S/'导入布局与Pivot.json');raw=R/'analysis/我的配方/my_fxmv6o6z8x/FanGold-1.0_·_我的__fxmv6o6z8x.json';user=load(raw)['snap']['layers'][0];current=load(R/'analysis/原理/FC6O_FanGold参数.json')
diff={key:{k:[user[sk].get(k),current[key].get(k)]for k in user[sk].keys()|current[key].keys() if user[sk].get(k)!=current[key].get(k)}for key,sk in [('p','P'),('m','M')]}
assert diff=={'p':{'zoom':['on','anchor']},'m':{}},diff
assets=[]
for a in source['assets']:
 p=S/'textures'/a['texture'];im=Image.open(p);assert im.size==(2048,2048) and im.mode=='RGBA'
 w,h=a['world_quad_size'];assets.append({'key':a['key'],'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':im.size,'mode':im.mode,'world_m':[w,h],'logical_cell':[2048/12,1024],'ppm':1024/h,'angle':a['restore_angle_degrees']})
base=load(O/'export-check.json');whole=base['anchor']['PC']['samples'][2]['ppm'];cl=load(O/'同模板单簇预算.json')
for s in cl['samples']:
 s['gain64_square']=s['ppm64_square']/whole;s['gain64_long']=s['ppm64_long']/whole;s['gain96_long']=s['ppm96_long']/whole
r={'template_sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'template_diff':diff,'original_assets':assets,'whole':base,'cluster_budget':cl,'memory_model':{'assumption':'BC7 16 bytes/4x4 block; resident full mip chain; sequence atlases only, not PNG sizes, excludes Ramp/Cutout/system overhead; not UE profiling','one_2048_mib':sum(max(1,(2048>>i)//4)**2*16 for i in range(12))/2**20,'four_2048_mib':4*sum(max(1,(2048>>i)//4)**2*16 for i in range(12))/2**20},'arrangement':'四种素材复用成10簇需要10张卡片，资源数4不等于卡片数4；可能多个发射器实现，准确drawcall须UE实测。','layer_mapping':[{'Blender':'明亮燃烧短头','baker':'主星：headSize/headBright/starSizeCurve/starBrightCurve','status':'模板已具备，保持原值'},{'Blender':'前段细亮尾迹','baker':'普通火花：sparkRate/Life/Size/Bright/对应曲线','status':'模板已具备，保持原值；离散光点不是Blender连续曲线'},{'Blender':'后段散落微火星','baker':'余烬：emberFrac=.4、Life=2、Bright=.1、大小/亮度曲线','status':'已有近似，非完整原版；共用普通火花受力，尚缺主星燃尽后阶段门控和持续气流'}]}
(O/'来源与测量.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n','utf-8');print('template diff',diff);print('same-template ratios',[(s['cluster'],round(s['gain64_square'],2),round(s['gain64_long'],2))for s in cl['samples']]);print(r['memory_model'])
