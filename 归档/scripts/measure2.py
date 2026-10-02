import cv2, json, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif']=['Noto Sans CJK JP']; plt.rcParams['axes.unicode_minus']=False
m=json.load(open('analysis/map.json')); src='vidio/'
T={
 'V01':dict(name='菊（金→红→银点）',hint=0.35,dur=3.7,roi=(0.2,0.0,0.85,0.72)),
 'V02':dict(name='红牡丹带芯',hint=2.15,dur=1.75,roi=(0.2,0.0,0.85,0.72)),
 'V03':dict(name='绿芯变色牡丹',hint=0.95,dur=4.6,roi=(0.2,0.0,0.85,0.72)),
 'V04':dict(name='变色菊（金→绿→银）',hint=4.3,dur=5.9,roi=(0.2,0.0,0.85,0.8)),
 'V05':dict(name='金芒菊（银白）',hint=0.3,dur=8.8,roi=(0.2,0.0,0.85,0.8)),
 'V06':dict(name='垂柳（锦冠）',hint=0.0,dur=9.4,roi=(0.2,0.0,0.85,0.9),bg='end'),
 'V11':dict(name='十寸三重芯',hint=5.6,dur=8.8,roi=(0.0,0.0,1.0,0.97)),
 'V12':dict(name='多色变色锦冠',hint=3.2,dur=10.1,roi=(0.0,0.08,1.0,1.0)),
 'V14':dict(name='鸿巢四尺玉',hint=4.1,dur=10.5,roi=(0.0,0.0,1.0,0.62)),
}
def load(f, maxdim=960):
    cap=cv2.VideoCapture(src+f); fps=cap.get(cv2.CAP_PROP_FPS); fr=[]
    while True:
        ok,x=cap.read()
        if not ok: break
        h,w=x.shape[:2]; sc=min(1,maxdim/max(h,w)); fr.append(cv2.resize(x,(int(w*sc),int(h*sc)),interpolation=cv2.INTER_AREA))
    return fps, fr
HUES=[(0,'红'),(20,'橙'),(40,'金'),(55,'黄'),(100,'绿'),(170,'青'),(215,'蓝'),(270,'紫'),(320,'粉'),(345,'红')]
def cname(rgb):
    r,g,b=[x/255 for x in rgb]; mx=max(r,g,b); mn=min(r,g,b); s=(mx-mn)/(mx+1e-6)
    if s<0.18: return '白' if mx>0.75 else '银'
    h,_s,_v=cv2.cvtColor(np.uint8([[[b*255,g*255,r*255]]]),cv2.COLOR_BGR2HSV_FULL)[0,0]; h=h/255*360
    name='红'
    for hh,n in HUES:
        if h>=hh: name=n
    return name
res={}
for k,c in T.items():
    fps,fr=load(m[k]); n=len(fr); H,W=fr[0].shape[:2]
    x0,y0,x1,y1=[int(v) for v in (c['roi'][0]*W,c['roi'][1]*H,c['roi'][2]*W,c['roi'][3]*H)]
    gray=[cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)[y0:y1,x0:x1] for f in fr]
    ih=int(c['hint']*fps)
    if c.get('bg')=='end': bg=np.median(np.stack(gray[-15:]),0)
    else:
        a=max(0,ih-int(0.9*fps)); b=max(a+3,ih-int(0.15*fps)); bg=np.median(np.stack(gray[a:b]),0)
    cnt=[int(((g-bg)>40).sum()) for g in gray]
    lo=max(0,ih-int(0.6*fps)); hi=min(n-3,ih+int(0.8*fps))
    base=np.median(cnt[max(0,lo-10):lo+1]) if lo>0 else 0
    t0i=next((i for i in range(lo,hi) if cnt[i]>base+25 and cnt[i+2]>cnt[i]), ih)
    d=np.clip(gray[min(t0i+1,n-1)]-bg,0,None); thr=max(40,np.percentile(d,99.9)*0.5)
    yy,xx=np.nonzero(d>thr); cx,cy=float(np.median(xx)),float(np.median(yy))
    rows=[]
    for i in range(t0i,min(n,t0i+int(c['dur']*fps))):
        g=gray[i]; df=g-bg
        p=np.percentile(df,99.95); thr=max(45, 0.30*p)          # 只取星体与明亮拖尾，排除烟雾与天空泛光
        mk=(df>thr)
        ys,xs=np.nonzero(mk); t=(i-t0i)/fps
        if len(xs)<15: rows.append([t,0,0,0,0,0,0,0,0,0]); continue
        dx=xs-cx; dy=ys-cy; w=df[ys,xs]
        rr=np.hypot(dx,dy); keep=rr<np.percentile(rr,99.5)+5
        rx=np.percentile(np.abs(dx[keep]),98); rt=np.percentile(np.clip(-dy[keep],0,None),98); rb=np.percentile(np.clip(dy[keep],0,None),98)
        mcy=float((dy*w).sum()/w.sum())
        bgr=fr[i][y0:y1,x0:x1][ys,xs].astype(np.float32); col=(bgr*w[:,None]).sum(0)/w.sum()
        rows.append([t,rx,rt,rb,mcy,float(w.sum()),len(xs),col[2],col[1],col[0]])
    a=np.array(rows); t=a[:,0]; N=a[:,6]
    # 燃烧结束：星体像素数在峰值后跌破 15%（平滑后）
    Ns=np.convolve(N,np.ones(3)/3,'same'); ip=int(np.argmax(Ns))
    ie=ip+next((j for j in range(len(Ns)-ip) if Ns[ip+j]<0.15*Ns[ip]), len(Ns)-ip-1); Tb=t[ie]
    i80=ip+next((j for j in range(len(Ns)-ip) if Ns[ip+j]<0.8*Ns[ip]),0); i20=ip+next((j for j in range(len(Ns)-ip) if Ns[ip+j]<0.2*Ns[ip]),0)
    # 终态半径：燃烧 60%–90% 时段水平半径的中位数
    sel=(t>0.6*Tb)&(t<0.9*Tb)&(a[:,1]>0); Rf=float(np.median(a[sel,1])) if sel.any() else float(a[:,1].max())
    rn=a[:,1]/Rf
    def tfrac(f):
        j=np.nonzero(rn>=f)[0]; return float(t[j[0]]/Tb) if len(j) else float('nan')
    j95=np.argmin(np.abs(t-0.92*Tb))
    D=float(a[j95,4]/Rf); asym=float(a[j95,3]/max(a[j95,2],1))
    # 颜色时间线：每 5% 燃烧进度取一次亮部颜色
    cols=[]
    for f in np.arange(0.02,1.0,0.06):
        j=np.argmin(np.abs(t-f*Tb)); cols.append((round(float(f),2),cname(a[j,7:10]),[int(v) for v in a[j,7:10]]))
    seq=[]
    for f,nm,_ in cols:
        if not seq or seq[-1][1]!=nm: seq.append((f,nm))
    res[k]=dict(name=c['name'],fps=fps,t0=round(t0i/fps,3),burn_video_s=round(float(Tb),2),
        t50=round(tfrac(0.5),3),t80=round(tfrac(0.8),3),t90=round(tfrac(0.9),3),droop_over_R=round(D,3),bottom_over_top=round(asym,2),
        kieguchi_over_burn=round(float((t[i20]-t[i80])/Tb),3),kieguchi_video_s=round(float(t[i20]-t[i80]),3),
        color_seq=seq,colors=cols,R_px=round(Rf,1),center=[round(cx+x0),round(cy+y0)],frame=[W,H])
    np.save(f'analysis/curves/{k}_v2.npy',a)
    print(k,{kk:v for kk,v in res[k].items() if kk not in('colors',)})
json.dump(res,open('analysis/measure2.json','w'),ensure_ascii=False,indent=1)
