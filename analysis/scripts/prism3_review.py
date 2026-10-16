"""从交付JSON和真实贴图读回的CPU事件参数回放；不是UE实测。"""
from pathlib import Path
import importlib
import json
import math
import sys
import numpy as np
import cv2
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'analysis/scripts'))
rc=importlib.import_module('回放检查')
OUT=ROOT/'analysis/results/PRISM3_20261016'
DIR=OUT/'候选包/PrismWheels3'


def mods(e):return {m['m']:m for m in e['modules']}


def sample(d,rng):
    if 'uniform' in d:return rng.uniform(*d['uniform'])
    return np.asarray(rc.curve(d,0))


def color_alpha(mm,u,initial):
    """按模块的赋值/相乘语义求值；颜色以线性空间计算。"""
    c=np.asarray(initial,dtype=float);a=1.
    if 'ColorOverLife' in mm:
        m=mm['ColorOverLife'];c=np.asarray(rc.curve(m['ColorOverLife'],u));a=float(rc.curve(m['AlphaOverLife'],u))
    if 'ColorScaleOverLife' in mm:
        m=mm['ColorScaleOverLife'];c=c*rc.curve(m['ColorScaleOverLife'],u);a*=float(rc.curve(m['AlphaScaleOverLife'],u))
    return c*a


def motion(p,v,g,k,t):
    s=(1-math.exp(-k*t))/k if k else t
    return p+v*s+g*((t-s)/k if k else t*t/2),v*math.exp(-k*t)+g*s


def main():
    d=json.loads((DIR/'cascade.json').read_text(encoding='utf-8'))
    es={e['name']:e for e in d['emitters']};rng=np.random.default_rng(20261016)
    particles=[];evidence=[]
    for e in d['emitters']:
        mm=mods(e)
        if 'EventGenerator' not in mm:continue
        ev=mm['EventGenerator']['Events'][0];name=ev['CustomName'];child=es[name];cm=mods(child)
        assert len(mm['EventGenerator']['Events'])==1
        assert child['spawn']=={'rate':{'const':0},'bursts':[]}
        assert cm['EventReceiverSpawn']['bUsePSysLocation'] is False
        assert cm['EventReceiverSpawn']['SpawnCount']=={'const':1}
        n=sum(x[1] for x in e['spawn']['bursts']);r=mm['SphereLocation']['StartRadius']['const']
        for i in range(n):
            rng=np.random.default_rng(20261016+list(es).index(e['name'])*1000+i)
            direction=rng.normal(size=3);direction/=np.linalg.norm(direction)
            v=direction*r*rng.uniform(*mm['SphereLocation']['VelocityScale']['uniform'])
            lifetime=rng.uniform(*mm['Lifetime']['Lifetime']['uniform']);death=math.ceil(lifetime*30)/30
            start=direction*r;k=mm['Drag']['DragCoefficientRaw']['const'];g=np.array(mm['ConstAcceleration']['Acceleration'])
            p,vel=motion(start,v,g,k,death)
            size=rng.uniform(*[x[0] for x in cm['InitialSize']['StartSize']['uniform']])
            c0=cm.get('InitialColor',{}).get('StartColor');color=rng.uniform(*c0['uniform']) if c0 else np.ones(3)
            carrier_size=float(sample(mm['InitialSize']['StartSize'],rng)[0])
            rot=float(sample(cm['InitialRotation']['StartRotation'],rng))*360
            receiver=cm['EventReceiverSpawn']
            assert receiver['EventName']==ev['CustomName'] and receiver['EventGeneratorType']==ev['Type']
            # 这里只执行文件的接收语义，不是UE读回；不能用同值字段自证引擎正确。
            receiver_p=np.zeros(3) if receiver['bUsePSysLocation'] else p.copy()
            receiver_v=vel*np.array(receiver['InheritVelocityScale']['const']) if receiver['bInheritVelocity'] else np.zeros(3)
            particles.append(dict(name=name,parent=e['name'],start=start,v=v,k=k,g=g,death=death,lifetime=lifetime,
                                  p=receiver_p,vel=receiver_v,size=size,carrier_size=carrier_size,color=color,rotation=rot))
            evidence.append({'parent':e['name'],'index':i,'event':name,'time':death,'predicted_event_position_cm':p.tolist(),
                             'predicted_receiver_position_cm':receiver_p.tolist(),'predicted_receiver_velocity_cm_s':receiver_v.tolist(),
                             'size_cm':size,'initial_color':color.tolist(),'evidence':'离线解析模型；非UE或导入器写回证据'})
    (OUT/'事件追踪.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
    # 每个组件用交付包里的帧曲线、Ramp和灰度贴图；Pack 不负责事件，由上面的事件驱动。
    packs={e['name']:rc.Pack(str(DIR),i) for i,e in enumerate(d['emitters']) if e['name'].startswith('Bloom')}
    cache={}
    def image_at(name,age,color):
        p=packs[name];u=age/p.life;f=p.frame_at(u);key=(name,f)
        if key not in cache:
            cell=p.cell(f);ramp=p.ramp[np.minimum(254,(cell*255).astype(int))]
            cache[key]=ramp*cell[...,None]*4
        return cache[key]*color_alpha(mods(es[name]),u,color)
    def project(p,yaw,elev):
        a=math.radians(yaw);b=math.radians(elev);x=math.cos(a)*p[0]+math.sin(a)*p[1];depth=-math.sin(a)*p[0]+math.cos(a)*p[1]
        return x,math.cos(b)*p[2]-math.sin(b)*depth
    def render(t,yaw=0,elev=0,px=720):
        canvas=np.zeros((px,px,3),np.float32);ppm=px/17000
        def paste(img,p,size,rot=0,pivot=(-.5,-.5)):
            n=max(1,round(size*ppm));tile=cv2.resize(img,(n,n),interpolation=cv2.INTER_AREA)
            if rot:tile=cv2.warpAffine(tile,cv2.getRotationMatrix2D((n/2,n/2),rot,1),(n,n))
            # Pivot是面片空间偏移，随面片旋转，不能当成世界竖直位移。
            ox=(.5+pivot[0])*size;oy=(.5+pivot[1])*size
            a=math.radians(rot);dx=math.cos(a)*ox+math.sin(a)*oy;dy=-math.sin(a)*ox+math.cos(a)*oy
            x,z=project(p,yaw,elev);x=round(px/2+(x+dx)*ppm-n/2);y=round(px/2+(-z+dy)*ppm-n/2)
            x0=max(0,x);y0=max(0,y);x1=min(px,x+n);y1=min(px,y+n)
            if x1>x0 and y1>y0:canvas[y0:y1,x0:x1]+=tile[y0-y:y1-y,x0-x:x1-x]
        for q in particles:
            if t<q['death']:
                pos,_=motion(q['start'],q['v'],q['g'],q['k'],t)
                grid=np.linspace(-3,3,31)
                dot=np.exp(-(grid[:,None]**2+grid[None,:]**2)/2)[...,None]*color_alpha(mods(es[q['parent']]),min(1,t/q['lifetime']),np.ones(3))*4
                paste(dot,pos,q['carrier_size'])
            else:
                age=t-q['death'];p=packs[q['name']]
                if age>=p.life:continue
                mm=mods(es[q['name']]);vel=q['vel']
                pos,_=motion(q['p'],vel,np.array(mm['ConstAcceleration']['Acceleration']),mm['Drag']['DragCoefficientRaw']['const'],age)
                paste(image_at(q['name'],age,q['color']),pos,q['size'],q['rotation'],es[q['name']]['required'].get('pivot_offset',[-.5,-.5]))
        fm=mods(es['Flash']);flife=float(rc.curve(fm['Lifetime']['Lifetime'],0))
        if t<flife:
            grid=np.linspace(-3,3,61);im=np.exp(-(grid[:,None]**2+grid[None,:]**2)/2)[...,None]*color_alpha(fm,t/flife,np.ones(3))*4
            paste(im,np.zeros(3),float(rc.curve(fm['InitialSize']['StartSize'],0)[0]))
        return Image.fromarray((np.clip(1-np.exp(-canvas),0,1)**(1/2.2)*255).astype('uint8'))
    last_tick=math.ceil(max(q['death']+packs[q['name']].life for q in particles)*30)+1
    times=[.1,.4,.6,.8,1.1,1.4,1.8,2.2,2.6,3,3.4,last_tick/30]
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
    for yaw,elev,label in [(0,0,'正视'),(90,0,'侧视'),(35,35,'斜视')]:
        sheet=Image.new('RGB',(4*360,3*390),'#12151c');dr=ImageDraw.Draw(sheet)
        for i,t in enumerate(times):
            x=i%4*360;y=i//4*390;sheet.paste(render(t,yaw,elev,360),(x,y+30));dr.text((x+8,y+5),f'{label} {t:.2f}s · 参数回放',font=font,fill='white')
        sheet.save(OUT/f'事件链_{label}.jpg')
    frames=OUT/'回放帧';frames.mkdir(exist_ok=True)
    for i in range(last_tick+1):render(i/30).save(frames/f'{i:03}.png')
    (OUT/'事件链回放.html').write_text('''<!doctype html><meta charset="utf-8"><title>彩千轮3.0 · 参数回放</title><style>body{background:#10151c;color:#e3ecf5;font:16px sans-serif;max-width:920px;margin:24px auto}img{width:720px;max-width:100%}input{width:600px}button{padding:10px}</style><h1>彩千轮3.0 · CPU事件候选</h1><p>实际交付贴图＋JSON参数回放；非UE实测。主爆时刻暂估。组件2.5秒，16颗星头→16朵小割。</p><button id="play">暂停</button> <output id="time"></output><br><input id="seek" type="range" min="0" max="108" step="1" value="0"><br><img id="frame"><script>let i=0,playing=true;const frames=Array.from({length:109},(_,n)=>{const im=new Image;im.src='回放帧/'+String(n).padStart(3,'0')+'.png';return im});function show(){frame.src=frames[i].src;seek.value=i;time.textContent=(i/30).toFixed(2)+' s'}play.onclick=()=>{playing=!playing;play.textContent=playing?'暂停':'播放'};seek.oninput=()=>{i=+seek.value;show()};setInterval(()=>{if(playing){i=(i+1)%109;show()}},1000/30);show()</script>''',encoding='utf-8')
    # 模板中的帧数和寿命必须跟随读回结果，不能截掉后出生的小割。
    hp=OUT/'事件链回放.html';html=hp.read_text(encoding='utf-8')
    lifetimes='、'.join(f'{k} {p.life:.4g}s' for k,p in packs.items())
    html=html.replace('组件2.5秒',f'实际序列寿命：{lifetimes}')
    html=html.replace('max="108"',f'max="{last_tick}"').replace('length:109',f'length:{last_tick+1}').replace('%109',f'%{last_tick+1}')
    html=html.replace('非UE实测。','非UE实测。闪光/星头的尺寸、色和曲线读JSON，光点轮廓用高斯近似现有材质；运动用解析阻力模型，未模拟UE的积分顺序、透视与Bloom。')
    hp.write_text(html,encoding='utf-8')
    print('16星头→',len(particles),'事件；连续参数回放与3视角已生成')


if __name__=='__main__':main()
