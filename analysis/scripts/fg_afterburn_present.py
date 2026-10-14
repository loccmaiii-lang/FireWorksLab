"""同镜头重放实际PC/手机包；不改亮度、补帧或模拟参数。"""
from pathlib import Path
import sys,json,io,base64,importlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/FG_Afterburn'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
packs={}
for variant,folder in [('baseline','FG-Sync-4984'),('trial','FG-Afterburn')]:
 for plat,suffix in [('PC','anchor'),('Mobile','anchor-mobile')]:
  p=R/'analysis/local'/folder/suffix
  packs[variant+'-'+plat]=[rc.Pack(str(p),0)]
PX=480;WORLD=4800;CY=1600

def frame(ps,t):
 acc=np.zeros((PX,PX,3),np.float32)
 for p in ps:
  age=t-p.delay
  if not 0<=age<=p.life:continue
  u=age/p.life;v=p.cell(p.frame_at(u));wh=p.size(u)/WORLD*PX
  w,h=[max(2,int(round(x))) for x in wh]
  im=np.array(Image.fromarray((v*255).astype(np.uint8)).resize((w,h),Image.Resampling.BILINEAR),np.float32)/255
  ox,oz=p.offset(u);col=p.rgb(im,u);x0=(PX-w)//2+round(ox/WORLD*PX);y0=(PX-h)//2-round((oz-CY)/WORLD*PX)
  xa,ya,xb,yb=max(0,x0),max(0,y0),min(PX,x0+w),min(PX,y0+h)
  if xb>xa and yb>ya:acc[ya:yb,xa:xb]+=col[ya-y0:yb-y0,xa-x0:xb-x0]
 return Image.fromarray((np.clip(1-np.exp(-acc),0,1)**(1/2.2)*255).astype(np.uint8))
frames={};images={}
for key,ps in packs.items():
 frames[key]=[];images[key]=[]
 for tick in range(106):
  im=frame(ps,tick/30);images[key].append(im);buf=io.BytesIO();im.save(buf,format='PNG');frames[key].append('data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode())
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
sheet=Image.new('RGB',(PX*3,2*(PX+36)),(14,15,20));dr=ImageDraw.Draw(sheet)
for j,key in enumerate(['baseline-PC','trial-PC']):
 for i,t in enumerate([1,1.5,2]):
  sheet.paste(images[key][round(t*30)],(i*PX,j*(PX+36)+36));dr.text((i*PX+8,j*(PX+36)+6),('原模板＋锚点Zoom' if j==0 else '4.9.85 末段分层／气流')+f' · {t:.1f} 秒',font=font,fill='white')
sheet.save(O/'实际贴图对照.jpg',quality=95)
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>FanGold1.0 燃尽后扰动</title><style>body{background:#10141e;color:#e9edf3;font:16px system-ui;max-width:1120px;margin:24px auto;padding:0 20px}h1{font-size:26px}p{color:#bdc8da;line-height:1.6}button,select{font:inherit;padding:8px;background:#25334a;color:white;border:1px solid #577293;border-radius:5px}main{display:flex;gap:20px}section{width:50%}.crop{overflow:hidden;aspect-ratio:1}img{width:100%;transform-origin:50% 30%}input{width:55%}</style><h1>FanGold1.0 · 燃尽后分层与弱扰动</h1><p>左侧为原模板＋锚点Zoom，右侧为正式4.9.85候选。普通火花、余烬分别用末段曲线收尾，并在各自主星燃尽后渐入0.6 m/s局部气流；前段模拟和亮头保持。</p><button id="play">暂停</button> <select id="plat"><option>PC</option><option value="Mobile">手机</option></select> <select id="speed"><option value="1">正常速度</option><option value="0.25">四分之一速度</option></select> <select id="view"><option value="1">整面</option><option value="2">局部放大2倍</option></select><br><input type="range" id="time" min="0" max="105" value="0" step="1"> <output id="stamp"></output><main><section><h3>模板＋锚点Zoom</h3><div class="crop"><img id="left"></div></section><section><h3>燃尽后分层／气流</h3><div class="crop"><img id="right"></div></section></main><p>实际导出贴图按帧号取整、大小及颜色曲线重放，30fps，无补帧、无额外提亮。固定48米视野，用于比较，非1000米游戏大小。取景和帧表按新尾部重新测量，不能把前段模拟不变理解为两包同一时刻逐像素相同。</p><p>正常速度以轻微弯散、逐渐收尾为主，不是整束大幅扭动。越晚、越暗的尾巴，扰动越难在远景辨认。未在UE实播。</p><script>const frames=DATA;let tick=0,running=true,prev=performance.now();const $=x=>document.getElementById(x);function draw(){const i=Math.min(105,Math.floor(tick)),p=$('plat').value;$('left').src=frames['baseline-'+p][i];$('right').src=frames['trial-'+p][i];$('time').value=i;$('stamp').textContent=(i/30).toFixed(2)+' s';}function loop(now){if(running){tick+=(now-prev)*.03*Number($('speed').value);if(tick>105)tick=0;draw()}prev=now;requestAnimationFrame(loop)}$('play').onclick=()=>{running=!running;$('play').textContent=running?'暂停':'播放'};$('time').oninput=()=>{tick=+$('time').value;running=false;$('play').textContent='播放';draw()};$('plat').onchange=draw;$('view').onchange=()=>{for(const id of ['left','right'])$(id).style.transform='scale('+$('view').value+')'};draw();requestAnimationFrame(loop);</script></html>'''.replace('DATA',json.dumps(frames,separators=(',',':')))
(O/'对照回放.html').write_text(html,'utf-8');print('实际贴图回放',len(html.encode()),'bytes')
