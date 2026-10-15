"""检查真实素材包，而不是实时模拟；循环出口缺cascade的回归用例。"""
from pathlib import Path
import zipfile,json,sys,importlib,shutil,hashlib,datetime
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparkGraph';B=R/'analysis/local/SparkGraph'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
report={}
playback={}
for key in ['rocket','sparkler']:
 d=B/key;d.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(O/(key+'.zip')) as z:
  assert 'cascade.json' in z.namelist(),'循环包缺少cascade.json（4.9.82已复现）'
  assert 'cascade_mobile.json' in z.namelist()
  z.extractall(d)
 for platform,cfg in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
  j=json.loads((d/cfg).read_text(encoding='utf-8'));assert len(j['emitters'])==1
  e=j['emitters'][0];assert not e['gpu'] and e['required']['loops']==0 and e['required']['local_space']
  view=d
  if platform=='Mobile':
   view=B/(key+'-mobile');view.mkdir(exist_ok=True);shutil.copy2(d/cfg,view/'cascade.json')
   for t in j['textures'].values():shutil.copy2(d/t['file'],view/t['file'])
  ps=[rc.Pack(str(view),0)]
  p=ps[0];ticks=[p.frame_at(i/30/p.life) for i in range(64)];assert ticks==list(range(64)),('逐tick重复或漏帧',ticks)
  result=rc.check(ps,str(O/(key+'-'+platform+'-回放.jpg')),times_s=[.1,.3,.5,.74,1.1,1.6,1.9])
  report[key+'-'+platform]={'pass':result['pass'],'fails':[r['fails'] for r in result['layers']],'cell':[ps[0].cw,ps[0].chh],'package_sha256':hashlib.sha256((O/(key+'.zip')).read_bytes()).hexdigest(),'source':j['source']}
  atlas=Image.new('RGB',(p.cw*8,p.chh*8));energy=[]
  for f in range(p.frames):
   c=p.cell(f);rgb=(np.clip(1-np.exp(-p.rgb(c,(f+.5)/p.frames)),0,1)**(1/2.2)*255).astype(np.uint8)
   frame=Image.fromarray(rgb);atlas.paste(frame,((f%8)*p.cw,(f//8)*p.chh));energy.append(float(c.sum()))
   if f in [3,7,12,20,27,39,47,57]:frame.save(O/(key+'-'+platform+f'-frame{f:02}.png'))
  filename=key+'-'+platform+'-回放序列.png';atlas.save(O/filename)
  playback[key+'-'+platform]={'file':filename,'cell':p.cw,'frames':p.frames,'life':p.life,'aspect':float(p.size(0)[0]/p.size(0)[1]),'energy':energy}
 entry=json.loads((O/(key+'-导出参数.json')).read_text(encoding='utf-8'));job=entry['entry']+'E1';dest=R/'analysis/results'/job;dest.mkdir(exist_ok=True)
 (dest/'导出清单.json').write_text(json.dumps({'effect':key+'_graph','entry':entry['entry'],'ver':entry['ver'],'time':datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),'dir':'analysis/local/SparkGraph/','packages':[{'name':key,'replica':entry['entry'],'files':[f.name for f in d.iterdir()],'sha256':report[key+'-PC']['package_sha256']} ]},ensure_ascii=False,indent=2),encoding='utf-8')
 (dest/'回放检查.json').write_text(json.dumps([json.loads((O/(key+'-'+plat+'-回放.json')).read_text(encoding='utf-8')) for plat in ['PC','Mobile']],ensure_ascii=False,indent=2),encoding='utf-8')
(O/'输出检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
(O/'实包回放.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>窜天猴与仙女棒 · 实包回放</title><style>body{margin:24px;background:#111820;color:#e9eeed;font:16px system-ui}header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,select,input{font:inherit}canvas{display:block;max-width:90vw;width:640px;height:640px;background:#000;margin:18px 0}p{max-width:900px;line-height:1.7}a{color:#50dec5}</style><header><b>'''+entry['version']+''' 实际素材包回放</b><select id="kind"><option value="rocket-PC">窜天猴 · PC</option><option value="rocket-Mobile">窜天猴 · 手机</option><option value="sparkler-PC">仙女棒 · PC</option><option value="sparkler-Mobile">仙女棒 · 手机</option></select><button id="play">暂停</button><select id="rate"><option value="1">原速</option><option value=".25">¼速</option></select></header><canvas id="c" width="640" height="640"></canvas><input id="tick" type="range" min="0" max="63" value="0" style="width:640px;max-width:90vw"><span id="label"></span><p>这里读取已导出的RGBA通道格与Ramp，按cascade.json的30 fps帧号播放，未使用实时粒子模拟。细丝、短促亮点、粗碎片和多级分叉在同一套序列内；手机单格256，细线会损失部分细节。固定周期中保留不等间隔爆发，原速检查节奏，慢放检查形态。</p><p><a href="../../../tool/FireworkBaker.html">打开正式烘焙器调参</a> · <a href="rocket.zip">窜天猴完整素材包</a> · <a href="sparkler.zip">仙女棒完整素材包</a></p><p>尾焰为跟随喷口的局部序列，未附加弹体弹道。米数、亮度为候选，未经UE实播。此页为放大审看，游戏内真实大小请使用烘焙器。</p><script>const data='''+json.dumps(playback,ensure_ascii=False)+''';let running=true,t=0,last=performance.now(),img=new Image;const c=document.getElementById('c'),ctx=c.getContext('2d'),kind=document.getElementById('kind'),rate=document.getElementById('rate'),tick=document.getElementById('tick'),label=document.getElementById('label');function load(){img.src=data[kind.value].file;t=0}kind.onchange=load;load();document.getElementById('play').onclick=e=>{running=!running;e.target.textContent=running?'暂停':'播放'};tick.oninput=()=>{t=+tick.value/30;running=false;document.getElementById('play').textContent='播放'};function draw(now){const d=data[kind.value];if(running)t=(t+(now-last)/1000*(+rate.value))%d.life;last=now;const f=Math.min(63,Math.floor(t*30+1e-6)),h=640/Math.max(1,d.aspect),w=h*d.aspect;ctx.fillStyle='#000';ctx.fillRect(0,0,640,640);if(img.complete&&img.naturalWidth)ctx.drawImage(img,f%8*d.cell,Math.floor(f/8)*d.cell,d.cell,d.cell,(640-w)/2,(640-h)/2,w,h);tick.value=f;label.textContent=` 第${f+1}/64帧 · ${(f/30).toFixed(2)}s`;requestAnimationFrame(draw)}requestAnimationFrame(draw);</script></html>''',encoding='utf-8')
sys.exit(0 if all(x['pass'] for x in report.values()) else 1)
