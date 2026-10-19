"""从真实RGBA包量整段二维范围；只建议安全固定框，不裁弱火星或逐帧变框。"""
from pathlib import Path
import json,sys,zipfile,math,importlib,shutil,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/GraphFraming';B=R/'analysis/local/GraphFraming/pack'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
candidate='--candidate' in sys.argv
cases=json.loads((O/('收紧取景参数.json' if candidate else '原取景参数.json')).read_text(encoding='utf-8'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def pack(c,stage,pf):
 root=B/c['id']/stage
 archive=O/c['id']/stage/(c['name']+'.zip');digest=hashlib.sha256(archive.read_bytes()).hexdigest();tag=root/'.zip.sha256'
 if not tag.exists() or tag.read_text()!=digest:
  root.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(archive) as z:
   for n in z.namelist():assert (root/n).resolve().is_relative_to(root.resolve())
   z.extractall(root)
  tag.write_text(digest)
 view=root
 if pf=='手机':
  view=root/'mobile';view.mkdir(exist_ok=True);shutil.copy2(root/'cascade_mobile.json',view/'cascade.json')
  cfg=json.loads((root/'cascade_mobile.json').read_text(encoding='utf-8'))
  for t in cfg['textures'].values():shutil.copy2(root/t['file'],view/t['file'])
 return rc.Pack(str(view))
def footprint(p,code):
 mask=np.zeros((p.chh,p.cw),bool);areas=[]
 for f in range(p.frames):
  a=p.cell(f)>code/255;mask|=a;ys,xs=np.where(a)
  areas.append(float((xs.max()-xs.min()+1)*(ys.max()-ys.min()+1)/a.size) if xs.size else 0)
 ys,xs=np.where(mask);assert xs.size
 box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
 w,h=p.size(.5)/100;cx,cz=np.asarray(p.offset(.5))/100
 # 非零像素并集外再留6纹素，之后graphPlan还有2%固定余量。
 margin=6
 world=[cx+(box[0]-margin-p.cw/2)/p.cw*w,cx+(box[2]+margin-p.cw/2)/p.cw*w,cz+(p.chh/2-box[3]-margin)/p.chh*h,cz+(p.chh/2-box[1]+margin)/p.chh*h]
 return dict(code=code,box=box,xUse=(box[2]-box[0])/p.cw,yUse=(box[3]-box[1])/p.chh,unionArea=(box[2]-box[0])*(box[3]-box[1])/(p.cw*p.chh),meanFrameBoxArea=float(np.mean(areas)),safeWorld=world,sizeM=[w,h],centerM=[cx,cz],frames=p.frames,cell=[p.cw,p.chh])
report={};new=[];failures=[]
for c in cases:
 stage='candidate' if candidate else 'before';platforms={}
 for pf in ['PC','手机']:
  p=pack(c,stage,pf);platforms[pf]={'nonzero':footprint(p,0),'low':footprint(p,1),'standard':footprint(p,3)}
  if candidate:
   out=O/c['id']/stage;check=rc.check([p],str(out/(pf+'-回放.jpg')),times_s=[.1,.4,.89,1.3,1.73,1.95]);save(out/(pf+'-回放.json'),check)
   if not check['pass']:failures.append([c['id'],pf,[x['fails'] for x in check['layers']]])
 if not candidate:
  old=c['P']['sparkGraph']['bounds'];v=[p['nonzero']['safeWorld'] for p in platforms.values()]
  measured=[min(a[0] for a in v),max(a[1] for a in v),min(a[2] for a in v),max(a[3] for a in v)]
  b=[max(old[0],math.floor(min(0,measured[0])*100)/100),min(old[1],math.ceil(max(0,measured[1])*100)/100),max(old[2],math.floor(min(0,measured[2])*100)/100),min(old[3],math.ceil(max(0,measured[3])*100)/100)]
  assert b[0]<b[1] and b[2]<b[3]
  c['P']['sparkGraph']['bounds']=b;new.append(c)
  report[c['id']]={'oldBounds':old,'proposedBounds':b,'quadAreaRatio':(b[1]-b[0])*(b[3]-b[2])/((old[1]-old[0])*(old[3]-old[2])),'platforms':platforms}
 else:report[c['id']]={'bounds':c['P']['sparkGraph']['bounds'],'platforms':platforms}
save(O/('收紧范围测量.json' if candidate else '原范围测量与建议.json'),report)
if not candidate:save(O/'收紧取景参数.json',new)
print(json.dumps({k:{a:b for a,b in v.items() if a!='platforms'} for k,v in report.items()},ensure_ascii=False,indent=2))
if failures:print('实包未通过：',json.dumps(failures,ensure_ascii=False));sys.exit(1)
