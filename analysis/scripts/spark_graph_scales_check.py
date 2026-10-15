"""检查倍率非1的实际PC/手机素材包，生成可连续播放的检查页。"""
from pathlib import Path
import zipfile,json,sys,importlib,shutil,hashlib
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparkScales';B=R/'analysis/local/SparkScales/pack'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
B.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(O/'倍率样例.zip') as z:z.extractall(B)
report={};data={}
for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
 j=json.loads((B/cfg).read_text(encoding='utf-8'));view=B
 assert len(j['emitters'])==1
 e=j['emitters'][0];assert not e['gpu'] and e['required']['loops']==0 and e['required']['local_space']
 if platform=='手机':
  view=B/'mobile';view.mkdir(exist_ok=True);shutil.copy2(B/cfg,view/'cascade.json')
  for t in j['textures'].values():shutil.copy2(B/t['file'],view/t['file'])
 p=rc.Pack(str(view),0);assert min(p.cw,p.chh)>=(512 if platform=='PC' else 256)
 assert [p.frame_at(i/30/p.life) for i in range(64)]==list(range(64))
 result=rc.check([p],str(O/(platform+'-回放.jpg')),times_s=[.1,.3,.5,.74,1.1,1.6,1.9])
 atlas=Image.new('RGB',(p.cw*8,p.chh*8))
 for f in range(p.frames):
  rgb=(np.clip(1-np.exp(-p.rgb(p.cell(f),(f+.5)/p.frames)),0,1)**(1/2.2)*255).astype(np.uint8)
  frame=Image.fromarray(rgb);atlas.paste(frame,((f%8)*p.cw,(f//8)*p.chh))
  if f in [12,27,47]:frame.save(O/(platform+f'-frame{f}.png'))
 atlas.save(O/(platform+'-序列.png'))
 report[platform]={'pass':result['pass'],'fails':[r['fails'] for r in result['layers']],'cell':[p.cw,p.chh],'frames':p.frames,'source':j['source']}
 data[platform]={'file':platform+'-序列.png','cell':p.cw,'frames':p.frames,'life':p.life,'aspect':float(p.size(0)[0]/p.size(0)[1])}
meta=json.loads((O/'倍率样例-导出参数.json').read_text(encoding='utf-8'))
report.update(version=meta['version'],sha256=hashlib.sha256((O/'倍率样例.zip').read_bytes()).hexdigest())
(O/'输出检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>整体倍率 · 实包检查</title>
<style>body{margin:24px;background:#111820;color:#e9eeed;font:16px system-ui}header{display:flex;gap:12px;align-items:center}button,select,input{font:inherit}canvas{display:block;width:640px;height:640px;max-width:90vw;background:#000;margin:18px 0}p{max-width:900px;line-height:1.7}a{color:#50dec5}</style>
<header><b>4.9.105 · 整体倍率实包检查</b><select id="kind"><option>PC</option><option>手机</option></select><button id="play">暂停</button><select id="rate"><option value="1">原速</option><option value=".25">¼速</option></select></header>
<canvas id="c" width="640" height="640"></canvas><input id="tick" type="range" min="0" max="63" value="0" style="width:640px;max-width:90vw"><span id="label"></span>
<p>内部验证副本：半锥角×0.8、数量×1.2、直径×1.1、寿命×1.1、亮度×0.9。实际素材包的64帧按30 fps回放；不覆盖你的存档或推荐候选。</p>
<p><a href="../../../tool/FireworkBaker.html">打开烘焙器</a> · <a href="倍率样例.zip">内部验证素材包</a></p><p>本机浏览器检查通过不代表UE实测或用户认可。</p>
<script>const data=__DATA__;let running=true,t=0,last=performance.now(),img=new Image;const c=document.getElementById('c'),ctx=c.getContext('2d'),kind=document.getElementById('kind'),rate=document.getElementById('rate'),tick=document.getElementById('tick'),label=document.getElementById('label');function load(){img.src=data[kind.value].file;t=0}kind.onchange=load;load();document.getElementById('play').onclick=e=>{running=!running;e.target.textContent=running?'暂停':'播放'};tick.oninput=()=>{t=+tick.value/30;running=false;document.getElementById('play').textContent='播放'};function draw(now){const d=data[kind.value];if(running)t=(t+(now-last)/1000*(+rate.value))%d.life;last=now;const f=Math.min(63,Math.floor(t*30+1e-6)),h=640/Math.max(1,d.aspect),w=h*d.aspect;ctx.fillStyle='#000';ctx.fillRect(0,0,640,640);if(img.complete&&img.naturalWidth)ctx.drawImage(img,f%8*d.cell,Math.floor(f/8)*d.cell,d.cell,d.cell,(640-w)/2,(640-h)/2,w,h);tick.value=f;label.textContent=` 第${f+1}/64帧 · ${(f/30).toFixed(2)}s`;requestAnimationFrame(draw)}requestAnimationFrame(draw);</script></html>'''
(O/'实包回放.html').write_text(page.replace('__DATA__',json.dumps(data,ensure_ascii=False)),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if all(report[k]['pass'] for k in ['PC','手机']) else 1)
