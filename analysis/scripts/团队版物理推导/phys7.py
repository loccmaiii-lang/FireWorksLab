import numpy as np, math
from phys import traj, vterm, at, cool, rho_a, mu, g
def gpu_model(k,c,v0,T,dt=2e-5):
    v=v0; x=0.0; t=0.0; out=[]
    while t<T:
        v-= (k*v+c*v*abs(v))*dt; x+=v*dt; t+=dt; out.append((t,x))
    return np.array(out)
def fit2(d,rho,v0,T,c_fixed=None):
    tr=traj(d,rho,v0,0,T=T*1.2); t=tr[:,0]; m=t<=T; tt=t[m]; xx=tr[m,1]
    best=None
    cs=[c_fixed] if c_fixed is not None else np.geomspace(0.05,200,90)
    for c in cs:
        for k in np.geomspace(0.5,500,90):
            mo=gpu_model(k,c,v0,T,dt=max(T/4000,2e-6)); xl=np.interp(tt,mo[:,0],mo[:,1]); e=np.sqrt(np.mean((xl-xx)**2))
            if best is None or e<best[2]: best=(k,c,e)
    return best
for nm,d,rho,v0,T in (('钢命中 一级子粒 40um',40e-6,7800,20,0.015),('爆炸 钛火花 120um',120e-6,4500,15,0.8),('龙息 镁火花 80um',80e-6,1737,40,0.05),('龙息 MgO 火花 80um',80e-6,3000,40,0.05)):
    k,c,e=fit2(d,rho,v0,T); print(f'{nm}: k={k:.1f}/s c={c:.2f}/m rms={e*1000:.1f} mm  Stokes={18*mu/(rho*d*d):.1f}')
    if '一级' in nm:
        k2,_,e2=fit2(25e-6,7800,6,0.006,c_fixed=c); print(f'   二级 25um（c 固定 {c:.2f}）: k={k2:.1f} rms {e2*1000:.2f} mm → branchKd={k2/k:.2f}')
print('粗块落地温度检查（d, T0 → 0.3 s 时温度）')
for d in (0.7e-3,1e-3,1.5e-3,2e-3):
    for T0c in (1000,1200,1400):
        h,Nu,res=cool(d,7800,650,0.8,T0c+273,10,marks=(1033,))
        t760=res.get(1033,9); print(f'  d={d*1e3:.1f}mm T0={T0c}°C: 降到 760°C 用 {t760*1000:.0f} ms')
