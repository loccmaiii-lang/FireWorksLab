import numpy as np, json
G=9.81
def fib(n):
    i=np.arange(n)+.5; y=1-2*i/n; r=np.sqrt(1-y*y); th=i*np.pi*(3-5**.5)
    return np.stack([np.cos(th)*r,y,np.sin(th)*r],1)
D=fib(400)
def metrics(v0,vt,T,drag_after=None):
    c=G/vt**2; p=np.zeros((400,3)); v=D*v0; h=1/240; ts=[];rx=[];rt=[];rb=[];cy=[]
    t=0
    while t<T:
        s=np.linalg.norm(v,axis=1,keepdims=True); v+= (-c*s*v+np.array([0,-G,0]))*h; p+=v*h; t+=h
        ts.append(t); x=p[:,0]; y=p[:,1]
        rx.append(np.percentile(np.abs(x),98)); rt.append(np.percentile(np.clip(y,0,None),98)); rb.append(np.percentile(np.clip(-y,0,None),98)); cy.append(-y.mean())
    ts=np.array(ts)/T; rx=np.array(rx); sel=(ts>0.6)&(ts<0.9); R=np.median(rx[sel])
    f=lambda q: ts[np.nonzero(rx>=q*R)[0][0]] if (rx>=q*R).any() else 1
    j=np.argmin(abs(ts-0.92))
    return dict(t50=f(.5),t80=f(.8),t90=f(.9),droop=cy[j]/R,bt=rb[j]/max(rt[j],1e-6),R_m=R)
if __name__=='__main__':
    print('工具默认菊 v0=150 vt=18 T=2.5:', {k:round(v,3) for k,v in metrics(150,18,2.5).items()})
    targets={'菊（V05/V14）':dict(t50=0.175,t80=0.43,droop=0.08,bt=1.35,T=2.8),
             '锦冠/柳（V06/V12）':dict(t50=0.12,t80=0.34,droop=0.2,bt=1.38,T=5.0)}
    out={}
    for name,tg in targets.items():
        best=None
        for vt in np.arange(8,45,1.5):
            for v0 in np.arange(60,320,10):
                mm=metrics(v0,vt,tg['T'])
                e=((mm['t50']-tg['t50'])/0.03)**2+((mm['t80']-tg['t80'])/0.05)**2+((mm['droop']-tg['droop'])/0.06)**2+((mm['bt']-tg['bt'])/0.3)**2
                if best is None or e<best[0]: best=(e,v0,vt,mm)
        e,v0,vt,mm=best; out[name]=dict(T=tg['T'],v0=float(v0),vt=float(vt),fit_err=round(float(e),2),**{k:round(float(v),3) for k,v in mm.items()})
        print(name, out[name])
    json.dump(out,open('analysis/fit.json','w'),ensure_ascii=False,indent=1)
