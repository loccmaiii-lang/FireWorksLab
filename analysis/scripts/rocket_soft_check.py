"""真实RGBA包：逐帧同步、柔层贡献和叠加审看；不读取UE。"""
from pathlib import Path
import json,zipfile,sys,importlib,shutil,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/RocketSoft';B=R/'analysis/local/RocketSoft/pack';B.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
def display(rgb):return (np.clip(1-np.exp(-rgb),0,1)**(1/2.2)*255).astype(np.uint8)
def physical(rgb,p,u,background=0):
 im=Image.fromarray(display(rgb+background));w,h=p.size(u);scale=512/max(w,h);nw,nh=max(1,round(w*scale)),max(1,round(h*scale))
 out=Image.new('RGB',(512,512),tuple(display(np.full((1,1,3),background))[0,0]));out.paste(im.resize((nw,nh),Image.Resampling.LANCZOS),((512-nw)//2,(512-nh)//2));return out
def luma(rgb):return rgb@[.2126,.7152,.0722]
def hf(a):return float((np.abs(np.diff(a,axis=0)).sum()+np.abs(np.diff(a,axis=1)).sum())/(a.sum()+1e-9))
packs={};report={'platforms':{},'sha256':hashlib.sha256((O/'候选素材包.zip').read_bytes()).hexdigest()}
for key,zipname in [('source','主体素材包.zip'),('soft','候选素材包.zip')]:
 root=B/key;root.mkdir(exist_ok=True)
 with zipfile.ZipFile(O/zipname) as z:
  for name in z.namelist():assert (root/name).resolve().is_relative_to(root.resolve())
  z.extractall(root)
 for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
  d=json.loads((root/cfg).read_text(encoding='utf-8'));view=root
  if platform=='手机':
   view=root/'mobile';view.mkdir(exist_ok=True);shutil.copy2(root/cfg,view/'cascade.json')
   for t in d['textures'].values():shutil.copy2(root/t['file'],view/t['file'])
  packs[key,platform]=rc.Pack(str(view),0)
for platform in ['PC','手机']:
 a,b=packs['source',platform],packs['soft',platform];assert (a.cw,a.chh,a.frames,a.life)==(b.cw,b.chh,b.frames,b.life)
 assert min(b.cw,b.chh)>=(512 if platform=='PC' else 256)
 assert [b.frame_at(i/30/b.life) for i in range(64)]==list(range(64))
 for mod in ['Lifetime','SizeByLife','DynamicParameter']:assert a.mods.get(mod)==b.mods.get(mod),mod
 assert a.e['required']==b.e['required'],'轴锁/局部坐标/起播参数必须一致'
 result=rc.check([b],str(O/(platform+'-柔层回放.jpg')),times_s=[.1,.24,.4,.89,1.3,1.73,1.95]);assert result['pass'],result
 rows=[]
 for f in range(b.frames):
  u=(f+.5)/b.frames;x=a.rgb(a.cell(f),u);y=b.rgb(b.cell(f),u);L=luma(x);S=luma(y)
  rows.append(dict(frame=f,energyRatio=float(S.sum()/(L.sum()+1e-9)),mainPeak=float(L.max()),softPeak=float(S.max()),mainHF=hf(L),softHF=hf(S)))
 # 暗底的线性总贡献要较低；同归一化梯度检查，不能只靠调暗冒充柔化。
 mean=lambda k:float(np.mean([r[k] for r in rows]))
 assert mean('energyRatio')<.35,rows
 assert mean('softHF')<mean('mainHF')*.7,(mean('softHF'),mean('mainHF'))
 sheet=Image.new('RGB',(512*3,548*3));draw=ImageDraw.Draw(sheet)
 for row,f in enumerate([12,26,51]):
  u=(f+.5)/b.frames;x=a.rgb(a.cell(f),u);y=b.rgb(b.cell(f),u)
  for col,(label,rgb) in enumerate([('主体',x),('柔光暗底',y),('主体+柔层',x+y)]):
   im=physical(rgb,b,u);sheet.paste(im,(col*512,row*548+30));draw.text((col*512+12,row*548+5),f'{label} · {f/30:.2f}s',font=font,fill='#e0e5e4')
  if platform=='PC':
   physical(x+y,b,u).save(O/f'叠加-frame{f}.png')
   physical(x+y,b,u,.035).save(O/f'中灰背景-frame{f}.png')
 sheet.save(O/(platform+'-主体柔层叠加.jpg'),quality=94)
 if platform=='PC':sheet.crop((0,548,1536,1096)).save(O/'PC-叠加对照.png')
 report['platforms'][platform]=dict(pass_=True,cell=[b.cw,b.chh],frames=b.frames,energyRatioMean=mean('energyRatio'),softPeakMax=max(r['softPeak'] for r in rows),mainHFMean=mean('mainHF'),softHFMean=mean('softHF'),sameRequired=True,sameFrameLifetimeSize=True,framesMeasured=rows)
(O/'实包与叠加检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({p:{k:v for k,v in d.items() if k!='framesMeasured'} for p,d in report['platforms'].items()},ensure_ascii=False,indent=2))
