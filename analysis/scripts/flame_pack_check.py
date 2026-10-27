"""按实际导出贴图和Cascade元数据检查循环，生成连续回放用的逐帧图。"""
from pathlib import Path
import importlib,json,shutil,zipfile,hashlib,sys
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'analysis/local/20261027_procedural-fire_实现';rc=importlib.import_module('回放检查')
def main():
 d=O/'包';d.mkdir(exist_ok=True)
 with zipfile.ZipFile(O/'GroundFlame.zip') as z:z.extractall(d)
 reports=[]
 for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
  j=json.loads((d/cfg).read_text(encoding='utf-8'));assert len(j['emitters'])==1
  e=j['emitters'][0];assert e['required']['loops']==0 and not e['gpu']
  view=d
  if platform=='手机':
   view=O/'手机包';view.mkdir(exist_ok=True);shutil.copy2(d/cfg,view/'cascade.json')
   for t in j['textures'].values():shutil.copy2(d/t['file'],view/t['file'])
  p=rc.Pack(str(view),0);assert p.cw>=(512 if platform=='PC' else 256)
  assert [p.frame_at(i/30/p.life) for i in range(64)]==list(range(64))
  result=rc.check([p],str(O/(platform+'-回放.jpg')),times_s=[0,.53,1,1.53,2.1])
  # 通用检查只自动识别一颗粒子内的锯齿帧号；本模板在发射器重生时循环，需显式补查末首。
  layer=result['layers'][0];centers={x[0]:np.array(x[1:3]) for x in layer['centers']}
  assert len(centers)==64
  seam=float(np.linalg.norm(centers[63]-centers[0]));adj=max(float(np.linalg.norm(centers[i+1]-centers[i])) for i in range(63));limit=max(3.,1.5*adj)
  ticks=[p.frame_at((i/30%p.life)/p.life) for i in range(128)]
  restart_ok=ticks==list(range(64))*2;result['emitter_restart']={'seam_px512':seam,'adjacent_max_px512':adj,'limit_px512':limit,'two_cycles_128_ticks':restart_ok,'pass':seam<=limit and restart_ok}
  result['pass']=result['pass'] and result['emitter_restart']['pass'];reports.append(result)
  for f in range(p.frames):
   c=p.cell(f);rgb=(np.clip(1-np.exp(-p.rgb(c,(f+.5)/p.frames)),0,1)**(1/2.2)*255).astype(np.uint8)
   Image.fromarray(rgb).save(O/(platform+f'-frame{f:02}.png'))
  print(platform,result['pass'],[(x.get('fails'),x.get('seam')) for x in result['layers']],flush=True)
 (O/'回放检查.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
 assert all(x['pass'] for x in reports)
if __name__=='__main__':main()
