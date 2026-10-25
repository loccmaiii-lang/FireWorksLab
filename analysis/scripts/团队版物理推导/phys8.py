import numpy as np, math
from phys import traj, at, g
# 龙息：分段线性阻力（母 → 单子粒接力），每段从真实状态出发，拟合 k（重力 9.81 不变）
tr=traj(2e-3,1737,380,0,T=2.0)
segs=[(0,0.04),(0.04,0.15),(0.15,0.45),(0.45,1.6)]
for a,b in segs:
    m=(tr[:,0]>=a)&(tr[:,0]<=b); t=tr[m,0]-a; X=tr[m,1]; Z=tr[m,2]
    s0=at(tr,a); i=np.searchsorted(tr[:,0],a); 
    vx=(tr[i+1,1]-tr[i,1])/(tr[i+1,0]-tr[i,0]); vz=(tr[i+1,2]-tr[i,2])/(tr[i+1,0]-tr[i,0])
    best=None
    for k in np.geomspace(0.1,200,4000):
        e=(1-np.exp(-k*t))/k; xl=s0[1]+vx*e; zl=s0[2]+(vz+g/k)*e-g*t/k; err=np.sqrt(np.mean((xl-X)**2+(zl-Z)**2))
        if best is None or err<best[1]: best=(k,err)
    print(f'  段 {a:.2f}–{b:.2f}s：起点 x={s0[1]:.1f} m v={math.hypot(vx,vz):.0f} m/s → 线性 k={best[0]:.2f}/s（段内 rms {best[1]*100:.0f} cm）；事件时刻 = 段长 {b-a:.2f} s')
