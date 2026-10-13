from pathlib import Path
import json,zipfile,sys,importlib,shutil,hashlib,io,base64
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path.cwd();O=R/'analysis/results/FC6O_FanGold10';B=R/'analysis/local/CS3-FanGold10'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
def load(p):return json.loads(p.read_text(encoding='utf-8'))
src=load(O/'测试基线.json');meta=load(O/'baseline-parameters.json')
diff={k:{x:[src[k].get(x),meta[k].get(x)] for x in src[k] if src[k][x]!=meta[k].get(x)} for k in ['P','M']}
assert not any(diff.values()),diff
checks={'parameter_diff':diff,'source_sha256':hashlib.sha256((O/'FanGold1.0原始参数.json').read_bytes()).hexdigest(),'images':{}}
for t in [.5,1,1.5,2,2.3,2.6,2.9,3.1]:
 a=np.asarray(Image.open(B/f'baseline-{t}.png')).astype(float)
 z=np.asarray(Image.open(B/f'zero-{t}.png')).astype(float)
 tr=np.asarray(Image.open(B/f'trial-{t}.png')).astype(float)
 p=np.asarray(Image.open(B/f'perstar-{t}.png')).astype(float)
 f=np.asarray(Image.open(B/f'fine-{t}.png')).astype(float)
 checks['images'][str(t)]={'zero_exact':bool(np.array_equal(a,z)),'global_exact':bool(np.array_equal(a,tr)),'perstar_exact':bool(np.array_equal(a,p)),'step_halving_rgb_mae':float(np.abs(p[:,:,:3]-f[:,:,:3]).mean()),'step_halving_max':float(np.abs(p-f).max()),'trial_rgb_mae':float(np.abs(p[:,:,:3]-a[:,:,:3]).mean())}
assert all(v['zero_exact'] for v in checks['images'].values())
assert all(checks['images'][str(t)]['global_exact'] for t in [.5,1,1.5])
assert checks['images']['0.5']['perstar_exact']
packs={};reports={}
for name in ['baseline','trial','perstar']:
 d=B/name;d.mkdir(exist_ok=True)
 with zipfile.ZipFile(B/(name+'.zip')) as z:z.extractall(d)
 if name in ['baseline','perstar']:shutil.copy2(B/(name+'.zip'),O/(name+'.zip'))
 for plat,cfg in [('PC','cascade.json'),('Mobile','cascade_mobile.json')]:
  c=load(d/cfg);view=d
  if plat=='Mobile':
   view=B/(name+'-mobile');view.mkdir(exist_ok=True);shutil.copy2(d/cfg,view/'cascade.json')
   for tx in c['textures'].values():shutil.copy2(d/tx['file'],view/tx['file'])
  ps=[rc.Pack(str(view),i) for i,e in enumerate(c['emitters']) if c['materials'][e['material']].get('textures',{}).get('main')]
  duration=max(p.delay+p.life for p in ps)
  rep=rc.check(ps,str(O/(name+'-'+plat+'.jpg')),None,times_s=[t for t in [.5,1,1.5,2,2.3,2.6,2.9,3.1] if t<=duration])
  reports[name+'-'+plat]={'pass':rep['pass'],'fails':[x['fails'] for x in rep['layers']],'emitters':len(c['emitters']),'cell':[ps[0].cw,ps[0].chh],'frames':sum(p.frames for p in ps),'duration':duration}
  packs[name+'-'+plat]=ps
checks['replay']=reports
checks['standard']=load(O/'基线标准检查.json')
(O/'验证汇总.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'parameters':diff,'images':checks['images'],'replay':reports},ensure_ascii=False,indent=2))
# 按真实导出 DynamicParameter 取整、SizeByLife 和材质重放；统一物理取景，无提亮。
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
 if key.startswith('trial'):continue
 frames[key]=[];images[key]=[]
 for tick in range(106):
  im=frame(ps,tick/30);images[key].append(im);buf=io.BytesIO();im.save(buf,format='PNG');frames[key].append('data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode())
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
sheet=Image.new('RGB',(PX*3,2*(PX+36)),(14,15,20));dr=ImageDraw.Draw(sheet)
for j,key in enumerate(['baseline-PC','perstar-PC']):
 for i,t in enumerate([1,1.5,2]):
  sheet.paste(images[key][round(t*30)],(i*PX,j*(PX+36)+36));dr.text((i*PX+8,j*(PX+36)+6),('原参数' if j==0 else '燃尽后气流试验')+f' · {t:.1f} 秒',font=font,fill='white')
sheet.save(O/'实际贴图对照.png')
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>FC6O · FanGold1.0 末段扰动对照</title><style>body{background:#10141e;color:#e9edf3;font:16px system-ui;max-width:1120px;margin:24px auto;padding:0 20px}h1{font-size:26px}p{color:#bdc8da;line-height:1.6}button,select{font:inherit;padding:8px 14px;background:#25334a;color:white;border:1px solid #577293;border-radius:5px}main{display:flex;gap:20px}section{width:50%}img{width:100%;background:black}input{width:65%}small{color:#a7b7ce}</style><h1>FC6O · FanGold1.0 燃尽后扰动测试</h1><p>左：你的原参数。右：每颗主星燃尽后，尾巴渐入 0.6 m/s 局部气流。寿命、亮度、颜色、星头、扇形和输出规格相同。右侧是隔离实验，尚未加入正式烘焙器。</p><button id="play">暂停</button> <select id="plat"><option>PC</option><option value="Mobile">手机</option></select> <select id="speed"><option value="1">正常速度</option><option value="0.25">四分之一速度</option></select> <input type="range" id="time" min="0" max="105" value="0" step="1"> <output id="stamp"></output><main><section><h3>FanGold1.0 原参数</h3><img id="left"></section><section><h3>仅燃尽后的尾部受力</h3><img id="right"></section></main><p>这是实际 PC / 手机灰度贴图按导出曲线取整重放，每秒 30 次取样；没有补中间帧，也没有提高曝光。48 米同一固定视野，用于观察细节，不是 1000 米的游戏大小。</p><p><b>测试结论：</b>局部尾线有轻微偏移，整面正常速度的收益很小。等全扇都燃尽再启动更不明显。原参数标准检查有“屏幕放大 1.07”未通过；原样保留，未为过检查改你的参数。测试包不是正式通过的成品，未经 UE 实播。</p><small>可暂停并拖动 1–2.5 秒比较。不要把慢放或放大后可辨认等同于游戏远景有效。</small><script>const frames=DATA;let tick=0,running=true,prev=performance.now();const $=x=>document.getElementById(x);function draw(){const i=Math.min(105,Math.floor(tick)),p=$('plat').value;$('left').src=frames['baseline-'+p][i];$('right').src=frames['perstar-'+p][i];$('time').value=i;$('stamp').textContent=(i/30).toFixed(2)+' s';}function loop(now){if(running){tick+=(now-prev)*.03*Number($('speed').value);if(tick>105)tick=0;draw()}prev=now;requestAnimationFrame(loop)}$('play').onclick=()=>{running=!running;$('play').textContent=running?'暂停':'播放'};$('time').oninput=()=>{tick=+$('time').value;running=false;$('play').textContent='播放';draw()};$('plat').onchange=draw;draw();requestAnimationFrame(loop);</script></html>'''.replace('DATA',json.dumps(frames,separators=(',',':')))
(O/'对照回放.html').write_text(html,encoding='utf-8')
