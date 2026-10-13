"""展示真实浏览器贴图回放，重复帧仅去重储存，不插帧或提亮。"""
from pathlib import Path
import json,hashlib,base64
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_LateMotion';B=R/'analysis/local/CS3-LateMotion'
meta=json.loads((O/'浏览器回放检查.json').read_text(encoding='utf-8'));frames={};images=[];seen={}
assert not meta['errors']
for key,rec in meta['record'].items():
 frames[key]=[]
 for i in range(rec['frames']):
  data=(B/key/(str(i)+'.png')).read_bytes();sha=hashlib.sha256(data).hexdigest()
  if sha not in seen:seen[sha]=len(images);images.append('data:image/png;base64,'+base64.b64encode(data).decode())
  frames[key].append(seen[sha])
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
for id,name in [('CSLTC','Comet'),('CSLTS','Silver')]:
 sheet=Image.new('RGB',(1440,1032),(14,15,20));dr=ImageDraw.Draw(sheet)
 for row,v in enumerate(['baseline','trial']):
  for col,t in enumerate([2.1,3,4.2]):
   sheet.paste(Image.open(B/f'{v}-{id}-PC-detail'/f'{round(t*30)}.png'),(col*480,row*516+36))
   dr.text((col*480+8,row*516+6),name+(' 原参数' if row==0 else ' 尾部扰动')+f' · {t:g}s',font=font,fill='white')
 sheet.save(O/(name+'末段对照.png'))
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>Comet / Silver 尾部扰动测试</title><style>body{background:#10141e;color:#edf1f7;font:16px system-ui;max-width:1120px;margin:24px auto;padding:0 20px}h1{font-size:26px}p{line-height:1.6;color:#bac9db}button,select{background:#25334a;color:white;border:1px solid #577293;border-radius:5px;font:inherit;padding:8px;margin:4px}a{color:#9bccff}main{display:flex;gap:16px}section{width:50%}img{width:100%;background:#0c0e15}input{width:65%}</style><h1>Comet / Silver：只改燃尽后的尾巴</h1><p>左边是原参数副本；右边从主头燃尽后渐入 0.6 m/s 局部气流。前段、亮头、颜色、粒子寿命和原版导出取景／帧表相同。右边仅在独立实验页有效，正式烘焙器和已认可原件没有修改。</p><select id="effect"><option value="CSLTC">Comet 红头金尾</option><option value="CSLTS">Silver 银尾</option></select><select id="plat"><option>PC</option><option value="Mobile">手机</option></select><select id="view"><option value="whole">整根 · 100米视野</option><option value="detail">末段细节 · 32米视野</option></select><select id="speed"><option value="1">正常速度</option><option value="0.25">四分之一速度</option></select><button id="play">暂停</button><br><input type="range" id="time" min="0" max="210" step="1" value="0"><output id="stamp"></output><main><section><h3>原参数副本</h3><img id="left"></section><section><h3>只加燃尽后扰动</h3><img id="right"></section></main><p>这是烘焙器真实 PC／手机贴图回放函数的逐帧录制，30 fps 取整；手机 Comet 红头仍是原 CPU 光点。相同固定镜头、原曝光，无补帧。细节视野是放大观察，不代表远景游戏大小；尚未在 UE 中实测。</p><p>先看正常速度，再暂停 3–4 秒比较细节。弱扰动只能让残尾轻微弯散；如果希望明显扭动，单纯等亮头燃尽再启动，作用时间可能太晚。</p><p><a href="baseline.html">打开原参数实验烘焙器</a> · <a href="trial.html">打开扰动实验烘焙器</a> · <a href="测试结论.md">检查与结论</a></p><script>const data=DATA;const $=x=>document.getElementById(x);let tick=0,run=true,last=performance.now();function draw(){const i=Math.min(210,Math.floor(tick)),s=[$('effect').value,$('plat').value,$('view').value].join('-');$('left').src=data.images[data.frames['baseline-'+s][i]];$('right').src=data.images[data.frames['trial-'+s][i]];$('time').value=i;$('stamp').textContent=(i/30).toFixed(2)+' s';}function loop(now){if(run){tick+=(now-last)*.03*+$('speed').value;if(tick>210)tick=0;draw()}last=now;requestAnimationFrame(loop)}$('play').onclick=()=>{run=!run;$('play').textContent=run?'暂停':'播放'};$('time').oninput=()=>{tick=+$('time').value;run=false;$('play').textContent='播放';draw()};for(const id of ['effect','plat','view'])$(id).onchange=draw;draw();requestAnimationFrame(loop);</script></html>'''.replace('DATA',json.dumps({'images':images,'frames':frames},separators=(',',':')))
(O/'对照回放.html').write_text(html,encoding='utf-8');print('实际回放生成，去重帧数',len(images),'字节',len(html.encode()))
