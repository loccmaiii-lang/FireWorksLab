from pathlib import Path
import json, sys, subprocess, cv2, numpy as np
from PIL import Image,ImageDraw,ImageFont
from motion_analysis import LAB,ROOT,OUT,REFS,crop
sys.path.insert(0,str(LAB/'.deps'))
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
ANALYSIS=json.loads((OUT/'analysis.json').read_text('utf-8'))
FILAMENTS='--filaments' in sys.argv
REFERENCE_OUT=OUT
if FILAMENTS:OUT=LAB/'studies/filaments'
FONTS={n:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n) for n in [19,22,25,30,34]}

def read_video(path):
    cap=cv2.VideoCapture(str(path));frames=[]
    while True:
        ok,f=cap.read()
        if not ok:break
        frames.append(f)
    cap.release();return frames

def writer(path,w,h):
    return subprocess.Popen([FFMPEG,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)

def finish(p):
    p.stdin.close();msg=p.stderr.read().decode('utf8','replace');p.wait()
    if p.returncode:raise RuntimeError(msg)

def text(d,xy,s,n=25,fill='#e7edf6'):d.text(xy,s,font=FONTS[n],fill=fill)
def wrap(d,s,x,y,width,n=25):
    line=''
    for ch in s:
        if d.textlength(line+ch,font=FONTS[n])>width:text(d,(x,y),line,n);line='';y+=n*1.55
        line+=ch
    text(d,(x,y),line,n)

def phase(spec,t):
    if t<0:return [-spec['t0'],0,'升空：观察发射轨迹与开花位置','开花前作为原片背景保留；本次贴图复刻从开花开始。']
    return next((p for p in spec['phases'] if p[0]<=t<p[1]),spec['phases'][-1])

def bounds(f,roi=None):
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32);hp=g-cv2.GaussianBlur(g,(0,0),5)
    m=(g>65)&(hp>14)
    if roi is not None:m&=roi
    yy,xx=np.nonzero(m)
    return np.percentile(xx,[.5,99.5]).tolist() if len(xx)>30 else None

def color_count(f,mode):
    b,g,r=cv2.split(f.astype(np.float32))
    if mode=='purple':m=(b>85)&(b>g*1.5)&(r+g+b>220)
    else:m=(r>130)&(r>g*1.45)&(b>g*.9)&(b>75)
    return int(m.sum())

def onset(vals,fps=30,begin=0):
    for i in range(round(begin*fps),len(vals)-4):
        if all(x>16 for x in vals[i:i+4]):return round(i/fps,3)
    return None

def make(id):
    spec=ANALYSIS[id];source=read_video(ROOT/REFS[id]['path']);burst=round(spec['t0']*30)
    box=spec['crop'];N=720;anchor=round(spec['anchor_elapsed']*30)
    ref=[crop(f,box,N) for f in source[burst:]]
    versions=['before','fine-4k'];movies={v:read_video(OUT/f'{id}-{v}-playback.mp4') for v in versions}
    manifests={v:json.loads((OUT/f'before/{id}.json').read_text('utf-8')) if v=='before' else json.loads(((OUT if FILAMENTS else LAB/'studies')/f'{id}-study.json').read_text('utf-8'))['variants'][v] for v in versions}
    camera=json.loads((REFERENCE_OUT/f'{id}-camera.json').read_text('utf-8'));cx,cy=camera['center']
    target_origin=np.array([(cx-box[0])/box[2]*N,(cy-box[1])/box[3]*N])
    rb=bounds(ref[anchor]);matrices={};alignment={}
    for v in versions:
        bb=bounds(movies[v][anchor]);scale=(rb[1]-rb[0])/(bb[1]-bb[0]);view=manifests[v]['view']
        origin=np.array([N/2,N*(.5+view[1]/(2*view[3]))]);shift=target_origin-origin*scale
        M=np.float32([[scale,0,shift[0]],[0,scale,shift[1]]]);matrices[v]=M
        alignment[v]={'anchor_elapsed':spec['anchor_elapsed'],'scale':scale,'translation':shift.tolist(),'rule':'One constant similarity transform for entire video; width matched once at anchor, origin matched to burst. No per-frame reframing or time warp.'}
    count=min(len(ref),len(movies['fine-4k']));W,H=2160,984
    enc=writer(OUT/f'{id}-comparison.mp4',W,H);series=[];colors={'reference':[],'before':[],'fine-4k':[]}
    for i in range(count):
        t=i/30;p=phase(spec,t);im=Image.new('RGB',(W,H),(8,12,20));d=ImageDraw.Draw(im)
        text(d,(24,12),f'{spec["name"]} · 同步动态对照',34)
        text(d,(1560,18),f'开花后 {t:05.2f} s  |  原片 {spec["t0"]+t:05.2f} s',25,'#f6c775')
        frames={'reference':ref[i]}
        for v in versions:
            frames[v]=cv2.warpAffine(movies[v][i],matrices[v],(N,N),flags=cv2.INTER_LINEAR,borderValue=(14,12,10))
        titles=['实拍参考 · 原始视频裁切','第二版 · 点火花尾迹 / 单帧 512 px','第三版 · 连续尾丝 / 单帧 512 px'] if FILAMENTS else ['实拍参考 · 原始视频裁切','上一版 · 4K 图集 / 单帧 512 px','视频校准第二版 · 4K 图集 / 单帧 512 px']
        for j,(key,f) in enumerate(frames.items()):
            text(d,(j*N+20,66),titles[j],22,'#afbdd1');im.paste(Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)),(j*N,105))
            colors[key].append(color_count(f,'purple' if id=='V13' else 'pink'))
        text(d,(25,842),p[2],30,'#f6c775');text(d,(25,887),p[3],25)
        text(d,(25,940),'两版均关闭附加辉光；各做一次等比例位置对齐，之后固定取景。时间不拉伸，无锐化，无插帧。',22,'#9eadc1')
        if not FILAMENTS and id=='V13' and t>=11.8:text(d,(N+30,770),'上一版在 11.8 s 结束',25,'#f6c775')
        if i%6==0:
            yy,xx=np.mgrid[:N,:N];roi=yy<(700 if id=='V14' else 690)
            if id=='V13' and t<3.3:roi&=np.hypot(xx-target_origin[0],yy-target_origin[1])<(55+42*t)*N/900
            series.append({'t':t,'widths':{k:(lambda b:b[1]-b[0] if b else None)(bounds(f,roi if k=='reference' else None)) for k,f in frames.items()}})
        enc.stdin.write(np.asarray(im).tobytes())
        if i in [round(x*30) for x in ([1.4,3.2,7,8.8] if id=='V14' else [2.5,3.8,5.2,6.5,9.5])]:im.save(OUT/f'{id}-compare-{t:.1f}.jpg',quality=95)
    finish(enc)
    # Half speed repeats real decoded frames; it does not synthesize intermediate detail.
    subprocess.run([FFMPEG,'-y','-loglevel','error','-i',str(OUT/f'{id}-comparison.mp4'),'-vf','setpts=2*PTS,fps=30,tpad=stop_mode=clone:stop_duration=0.1','-frames:v',str(count*2),'-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{id}-comparison-half-speed.mp4')],check=True)
    # Annotated reference retains every original frame, including ascent and the actual source ending.
    enc=writer(OUT/f'{id}-reference-breakdown.mp4',720,1520)
    for i,f in enumerate(source):
        t=i/30-spec['t0'];p=phase(spec,t);im=Image.new('RGB',(720,1520),(8,12,20));d=ImageDraw.Draw(im)
        text(d,(20,15),spec['name']+' · 原片逐阶段拆解',30)
        text(d,(20,58),f'原片 {i/30:05.2f} s  /  第 {i} 帧  /  相对开花 {t:+.2f} s',22,'#f6c775')
        im.paste(Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)),(0,100))
        text(d,(20,1390),p[2],25,'#f6c775');wrap(d,p[3],20,1436,680,22)
        enc.stdin.write(np.asarray(im).tobytes())
    finish(enc)
    result={'frames':count,'fps':30,'duration':count/30,'alignment':alignment,'color_threshold_note':'First four consecutive frames with >16 purple/pink pixels under documented RGB threshold; search after 6 s for V14 to exclude initial red flash, after 2 s for V13. Apparent onset only, sensitive to exposure/compression.','color_onset':{k:onset(v,begin=6 if id=='V14' else 2) for k,v in colors.items()},'color_counts':colors,'envelope_samples':series}
    if id=='V14':
        result['rejected_color_threshold_onset']=result['color_onset'];result['color_onset']=None
        result['color_threshold_note']='Automatic pink threshold rejected: source white-tail color fringes and illuminated smoke trigger it before the compact red ember phase. Use the visually reviewed 7.5–8.5 s transition interval, not this threshold, for calibration.'
    (OUT/f'{id}-comparison-metrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
    print(id,'DONE',count,'frames','color onset',result['color_onset'],flush=True)

if __name__=='__main__':
    for id in [s for s in sys.argv[1:] if not s.startswith('--')] or ['V14','V13']:make(id)
