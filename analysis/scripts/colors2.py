import cv2, json, numpy as np
m=json.load(open('analysis/map.json')); src='vidio/'
r2=json.load(open('analysis/measure2.json'))
HUES=[(0,'红'),(18,'橙'),(38,'金黄'),(62,'黄绿'),(85,'绿'),(160,'青'),(200,'蓝'),(255,'紫'),(300,'粉'),(340,'红')]
def hname(h):
    n='红'
    for hh,nm in HUES:
        if h>=hh: n=nm
    return n
def grab(cap,fps,t,maxdim=960):
    cap.set(cv2.CAP_PROP_POS_FRAMES,max(0,int(round(t*fps)))); ok,x=cap.read()
    if not ok: return None
    h,w=x.shape[:2]; sc=min(1,maxdim/max(h,w)); return cv2.resize(x,(int(w*sc),int(h*sc)),interpolation=cv2.INTER_AREA)
out={}
for k,v in r2.items():
    cap=cv2.VideoCapture(src+m[k]); fps=cap.get(cv2.CAP_PROP_FPS); Tb=v['burn_video_s']; t0=v['t0']; cx,cy=v['center']; R=v['R_px']*1.5
    if k=='V06': bgf=grab(cap,fps,9.3)
    else: bgf=grab(cap,fps,max(0,t0-0.4))
    bgv=cv2.cvtColor(bgf,cv2.COLOR_BGR2HSV_FULL)[...,2].astype(np.float32)/255
    seq=[]
    for f in np.arange(0.03,1.0,0.07):
        fr=grab(cap,fps,t0+f*Tb)
        if fr is None: continue
        H,W=fr.shape[:2]; yy,xx=np.mgrid[0:H,0:W]; circ=(xx-cx)**2+(yy-cy)**2<R*R
        hsv=cv2.cvtColor(fr,cv2.COLOR_BGR2HSV_FULL).astype(np.float32); h=hsv[...,0]/255*360; s=hsv[...,1]/255; val=hsv[...,2]/255
        new=circ&(val-bgv>0.2)
        clip=(new&(s<0.22)).sum()/max(new.sum(),1)
        ok=new&(s>0.3)
        if new.sum()<25: seq.append((round(float(f),2),'（暗）')); continue
        if ok.sum()<25 or clip>0.7: seq.append((round(float(f),2),'白/银')); continue
        hist=np.bincount(np.clip((h[ok]/10).astype(int),0,35),weights=(s*(val-bgv))[ok],minlength=36)
        hist=hist+np.roll(hist,1)+np.roll(hist,-1)
        top=int(np.argmax(hist)); names=[hname(top*10+5)]
        sec=hist.copy()
        for d in range(-3,4): sec[(top+d)%36]=0
        if sec.max()>0.5*hist[top]: names.append(hname(int(np.argmax(sec))*10+5))
        tag='+'.join(dict.fromkeys(names))+('（带白芯）' if clip>0.4 else '')
        seq.append((round(float(f),2),tag))
    comp=[]
    for f,nm in seq:
        if not comp or comp[-1][1]!=nm: comp.append((f,nm))
    out[k]=comp; print(k, v['name'], comp)
json.dump(out,open('analysis/colors2.json','w'),ensure_ascii=False,indent=1)
