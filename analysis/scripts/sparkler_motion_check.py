"""只检查本轮候选实际包，不修改旧候选或正式库。"""
from pathlib import Path
import zipfile,json,sys,importlib,shutil,hashlib,os
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/os.environ.get('SPARKLER_RESULT_DIR','analysis/results/SparklerMotion');B=R/'analysis/local'/O.name/'pack';B.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
with zipfile.ZipFile(O/'候选素材包.zip') as z:z.extractall(B)
report={}
for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
 j=json.loads((B/cfg).read_text(encoding='utf-8'));view=B
 if platform=='手机':
  view=B/'mobile';view.mkdir(exist_ok=True);shutil.copy2(B/cfg,view/'cascade.json')
  for t in j['textures'].values():shutil.copy2(B/t['file'],view/t['file'])
 p=rc.Pack(str(view),0);assert min(p.cw,p.chh)>=(512 if platform=='PC' else 256)
 assert [p.frame_at(i/30/p.life) for i in range(64)]==list(range(64))
 result=rc.check([p],str(O/(platform+'-实包回放.jpg')),times_s=[.1,.24,.4,.89,1.3,1.73,1.95])
 for f in [7,12,26,51]:
  rgb=(np.clip(1-np.exp(-p.rgb(p.cell(f),(f+.5)/p.frames)),0,1)**(1/2.2)*255).astype(np.uint8);Image.fromarray(rgb).save(O/(platform+f'-frame{f}.png'))
 report[platform]={'pass':result['pass'],'fails':[r['fails'] for r in result['layers']],'cell':[p.cw,p.chh],'frames':p.frames,'source':j['source']}
report['sha256']=hashlib.sha256((O/'候选素材包.zip').read_bytes()).hexdigest();(O/'实包检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if all(report[k]['pass'] for k in ['PC','手机']) else 1)
