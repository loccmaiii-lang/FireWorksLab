import numpy as np, math
from phys import traj, at, g, vterm
def seg(tr,a,b,grav=True):
    m=(tr[:,0]>=a)&(tr[:,0]<=b); t=tr[m,0]-a; X=tr[m,1]; Z=tr[m,2]; s0=at(tr,a); i=np.searchsorted(tr[:,0],a)
    vx=(tr[i+1,1]-tr[i,1])/(tr[i+1,0]-tr[i,0]); vz=(tr[i+1,2]-tr[i,2])/(tr[i+1,0]-tr[i,0]); best=None
    for k in np.geomspace(0.1,400,3000):
        e=(1-np.exp(-k*t))/k; xl=s0[1]+vx*e
        if grav: zl=s0[2]+(vz+g/k)*e-g*t/k
        else: zl=s0[2]+vz*e
        err=np.sqrt(np.mean((xl-X)**2+(zl-Z)**2))
        if best is None or err<best[1]: best=(k,err)
    return s0,math.hypot(vx,vz),best
for nm,d,rho,v0,cdm in (('镁 2mm',2e-3,1737,380,1.0),('镁 1mm',1e-3,1737,380,1.0),('镁 3mm',3e-3,1737,380,1.0)):
    import phys
    tr=traj(d,rho,v0,0,T=1.4,cdmul=cdm)
    print(nm)
    for a,b in ((0,0.04),(0.04,0.15),(0.15,1.2),(0,0.15),(0,0.6)):
        s0,v,(k,e)=seg(tr,a,b,grav=False)
        print(f'  {a:.2f}–{b:.2f}s: 起 x={s0[1]:.1f} v={v:.0f} → k={k:.2f}/s rms {e*100:.0f} cm（无重力，沿轴）  末 x={at(tr,b)[1]:.1f} v={at(tr,b)[3]:.1f}')
print('镁 2mm 沿轴（无重力）末端：', [ (t, round(at(traj(2e-3,1737,380,0,T=1.4),t)[1],1)) for t in (0.04,0.15,0.3,0.6,1.0,1.2)])
