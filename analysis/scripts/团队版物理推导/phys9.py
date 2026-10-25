import numpy as np, math
from phys import traj, at, g
def relay(d,rho,v0,segs,ang=0):
    tr=traj(d,rho,v0,ang,T=segs[-1][1]+0.05)
    for a,b in segs:
        m=(tr[:,0]>=a)&(tr[:,0]<=b); t=tr[m,0]-a; X=tr[m,1]; Z=tr[m,2]; s0=at(tr,a); i=np.searchsorted(tr[:,0],a)
        vx=(tr[i+1,1]-tr[i,1])/(tr[i+1,0]-tr[i,0]); vz=(tr[i+1,2]-tr[i,2])/(tr[i+1,0]-tr[i,0]); best=None
        for k in np.geomspace(0.1,400,4000):
            e=(1-np.exp(-k*t))/k; xl=s0[1]+vx*e; zl=s0[2]+(vz+g/k)*e-g*t/k; err=np.sqrt(np.mean((xl-X)**2+(zl-Z)**2))
            if best is None or err<best[1]: best=(k,err)
        print(f'   {a:.3f}–{b:.3f}s: x0={s0[1]:.2f} v={math.hypot(vx,vz):.1f} → k={best[0]:.1f}/s rms {best[1]*100:.1f} cm')
print('钢 120um v0 150：单段 vs 两段接力')
relay(120e-6,7800,150,[(0,0.12)]); relay(120e-6,7800,150,[(0,0.02),(0.02,0.12)])
print('爆炸团块 4mm ρ1600 v0 50 仰 45°：单段 / 两段（0–0.5, 0.5–3.0）')
relay(4e-3,1600,50,[(0,3.0)],45); relay(4e-3,1600,50,[(0,0.5),(0.5,3.0)],45)
