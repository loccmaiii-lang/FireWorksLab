"""Package real atlases with the filenames referenced by the baker's Cascade exports."""
from pathlib import Path
import json, hashlib, zipfile, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BASE=Path(__file__).resolve().parents[1];ROOT=BASE.parents[1];OUT=BASE/'studies'
FILAMENTS='--filaments' in sys.argv
if FILAMENTS:OUT=OUT/'filaments'
report={'packages':[], 'images':[], 'sourceIntegrity':{}}
for id in (['V14','V13'] if FILAMENTS else ['JM','V14','V13']):
 m=json.loads((OUT/f'{id}-study.json').read_text('utf-8'))
 for key,v in m['variants'].items():
  comp={'name':m['name'],'duration':m['duration'],'fixedView':v['view'],'layers':[]}
  files=[]
  for layer in v['layers']:
   jp=OUT/layer['parameters'];j=json.loads(jp.read_text('utf-8'));name=j['name'];stem=jp.stem
   entry={'name':layer['name'],'recipe':name+'.json','start':layer['segments'][0]['meta']['t0'],'segments':[]}
   files.append((jp,name+'.json'))
   for s in layer['segments']:
    p=OUT/s['file'];im=Image.open(p);assert im.size==(v['size'],v['size']);assert im.mode=='RGBA'
    extrema=im.getextrema()
    assert any(hi>0 for lo,hi in extrema),(id,key,layer['id'],s['index'],'empty atlas')
    # Hidden carriers intentionally leave early RGBA frame channels black before ignition.
    silent_carrier=layer['P']['type']=='senrin' and layer['P'].get('carrierHead',.4)==0 and layer['P']['carrierTail']==0
    assert silent_carrier or all(hi>0 for lo,hi in extrema),(id,key,layer['id'],s['index'],extrema)
    info={'file':p.name,'width':im.width,'height':im.height,'channels':extrema,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()};report['images'].append(info)
    suffix='_'+chr(65+s['index']) if len(layer['segments'])>1 else '';dest=f'T_{name}{suffix}.png';files.append((p,dest))
    entry['segments'].append({'file':dest,'t0':s['meta']['t0'],'duration':s['meta']['duration'],'frames':256,'fps':s['meta']['avgFps'],'frameKeys':s['meta']['keys']})
   comp['layers'].append(entry)
   txtp=OUT/(stem+'-Cascade.txt');txt=txtp.read_text('utf-8')
   txt=txt.replace('；1K 版本在引擎里复制一张，把最大尺寸设为 1024 即可','；2K 为引擎验证档，4K / 8K 为高精母版，具体资源预算需在项目中验证')
   # The study packages contain real atlases, not the optional debug/cutout outputs.
   txt=re.sub(r'T_[^\n]+_帧号测试.png：[\s\S]*?(?=T_[^\n]+_Ramp.png)', '本实验包未附帧号测试图或 Cutout。\n',txt)
   txt=txt.split('\n【本次复刻组合】')[0]
   txt+='\n【本次复刻组合】\n同一效果的全部图层使用同一爆点、同一取景；保持相同朝向，不要给图层单独随机旋转。按照组合清单中的 t0 设置延迟。米制尺度为模拟参数，未通过相机标定反求真实尺寸。\n'
   txtp.write_text(txt,'utf-8');files.append((txtp,name+'_Cascade参数.txt'));files.append((OUT/(stem+'-curves.csv'),name+'_曲线.csv'));files.append((OUT/(stem+'-Ramp.png'),'T_'+name+'_Ramp.png'))
  zpath=OUT/f'{id}-{key}.zip'
  with zipfile.ZipFile(zpath,'w',compression=zipfile.ZIP_STORED) as z:
   for p,dest in files:z.write(p,dest)
   z.writestr('组合清单.json',json.dumps(comp,ensure_ascii=False,indent=2))
   z.writestr('先读我.txt',f'{m["name"]} / {key}\n这是独立实验版的程序渲染结果。四尺玉配方等待美术验收，UE 4.24 未实测。\n每张贴图 8×8 格、RGBA 接力、256 帧。灰度贴图 sRGB 关闭；Ramp 按参数说明导入。A 通道存动画帧，不能当透明度。\n同一效果的图层都要放在同一爆点，统一朝向，不要逐层随机旋转。主花两段有独立延迟，见组合清单与各层参数表。\n4K/8K 是整张贴图大小，不是每帧大小；该档单帧为 {v["size"]//8}×{v["size"]//8}。\n本包不含实拍、声音、上升弹道、烟雾或镜头光晕。\nJSON 配方可导入实验烘焙器继续调整；直接重烘单层会重新计算单层取景，重做组合时使用 tests/study_bake.cjs 的共用取景计划。\n')
  with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
  report['packages'].append({'id':id,'variant':key,'file':zpath.name,'bytes':zpath.stat().st_size,'textures':sum(len(l['segments']) for l in v['layers']),'bakeAndEncodeMs':round(sum(l['ms'] for l in v['layers']))})
hashes=json.loads((BASE/'baseline/original-hashes.json').read_text('utf-8-sig'))
changed=[x['path'] for x in hashes if hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest().lower()!=x['sha256'].lower()]
assert not changed;report['sourceIntegrity']={'files':len(hashes),'changed':changed}
if FILAMENTS:
 (OUT/'package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
 print(json.dumps(report['packages'],ensure_ascii=False,indent=2))
else:
 im1=np.asarray(Image.open(OUT/'JM-fine-8k-shot-2.png')).astype(float);im2=np.asarray(Image.open(OUT/'JM-8k-proof-2.png')).astype(float)
 report['playerAgreement']={'meanAbsoluteError8bit':float(abs(im1-im2).mean()),'maximumError8bit':float(abs(im1-im2).max())}
 assert report['playerAgreement']['meanAbsoluteError8bit']<.1
 (OUT/'package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')

 font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',25);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
 sheet=Image.new('RGB',(1500,960),(10,14,21));d=ImageDraw.Draw(sheet)
 shots=['JM-baseline-no-bloom.png','JM-fine-4k-shot-2.png','JM-8k-proof-2.png']
 for i,(name,title) in enumerate(zip(shots,['原版 2K · 单帧 256 px','升级 4K · 单帧 512 px','升级 8K · 单帧 1024 px'])):
  im=Image.open(OUT/name).convert('RGB');d.text((i*500+20,18),title,font=font,fill=(241,199,131));sheet.paste(im.resize((490,490),Image.Resampling.LANCZOS),(i*500+5,62))
  crop=im.crop((610,135,890,335));sheet.paste(crop.resize((490,350),Image.Resampling.NEAREST),(i*500+5,585));d.text((i*500+20,552),'同一区域放大 · 相同配方 / 曝光 / 时间',font=small,fill=(175,188,207))
 sheet.save(OUT/'金芒菊精度对照.png')
 print(json.dumps({'packages':report['packages'],'sourceIntegrity':report['sourceIntegrity'],'playerAgreement':report['playerAgreement']},ensure_ascii=False,indent=2))
