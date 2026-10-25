import math, numpy as np
from phys import traj, vterm, fit_lin, fit_quad, at, rho_a, mu, g
print('(1) 砂轮寿命：偏向 ≤ 4 的最好拟合 + 三档粒径')
for d,lab in ((60e-6,'细'),(100e-6,'中'),(140e-6,'粗')):
    tr=traj(d,7800,35,0,T=0.6)
    rng=np.random.default_rng(1); u=rng.random(40000)
    # 熄灭距离 = 0.4 + Exp(0.27)，但截到该粒径能到的最远距离 0.97×xmax
    xmax=tr[:,1].max(); xs=0.4-0.27*np.log(u); xs=xs[xs<0.97*xmax]
    idx=np.minimum(np.searchsorted(tr[:,1],xs),len(tr)-1); ts=tr[idx,0]
    ps=(10,30,50,70,90,97); tq=np.percentile(ts,ps); h=np.linspace(0,1,1001)
    best=None
    for a in np.linspace(0.005,0.03,26):
        for b in np.linspace(0.04,0.4,73):
            for bi in np.linspace(1,4,31):
                q=a+(b-a)*np.percentile(h**bi,ps); e=((q-tq)**2).sum()
                if best is None or e<best[0]: best=(e,a,b,bi)
    print(f'  {lab} {d*1e6:.0f}um: 最远 {xmax:.2f} m；寿命分位 p10 {tq[0]*1e3:.0f} p50 {tq[2]*1e3:.0f} p90 {tq[4]*1e3:.0f} p97 {tq[5]*1e3:.0f} ms → [{best[1]:.3f}, {best[2]:.3f}, {best[3]:.2f}]  保留 {len(xs)/40000*100:.0f}%')
print('(2) 不等间隔爆发：短路（均值 0.35 s 指数间隔，周期 2.1333）')
P=64/30
for seed in (3,5,11):
    r=np.random.default_rng(seed); t=r.uniform(0,0.15); ev=[]
    while t<P-0.05: ev.append(t); t+=r.exponential(0.35)+0.04
    w=[round(float(x),3) for x in r.uniform(0.008,0.035,len(ev))]
    print('  seed',seed,'→',[[round(float(a),3),b] for a,b in zip(ev,w)], ' 间隔',np.round(np.diff(ev),2))
print('(3) 爆炸碎块 v0=50 45° / 60° / 30°（4 mm ρ1600）')
for ang in (30,45,60,80):
    tr=traj(4e-3,1600,50,ang,T=3.5)
    print(f'  {ang}°: '+' '.join(f'@{tq}:({at(tr,tq)[1]:.1f},{at(tr,tq)[2]:.1f},v{at(tr,tq)[3]:.0f})' for tq in (0.25,0.5,1.0,1.5,2.0,2.5,3.0)))
print('(4) 龙息：主层 2 mm 镁 v0=380，水平；t → (x, z, v)；尾长 = v × 火花寿命 0.04 s')
tr=traj(2e-3,1737,380,1.5,T=2.5)
for tq in (0.01,0.03,0.05,0.1,0.2,0.3,0.5,0.7,1.0,1.3,1.6,2.0):
    r_=at(tr,tq); print(f'  t={tq:.2f} x={r_[1]:.1f} z={r_[2]:.2f} v={r_[3]:.0f}  尾长≈{r_[3]*0.04:.2f} m')
print('  1 mm 镁 / 3 mm 镁 同 v0：', [(d, round(vterm(d,1737),1), round(at(traj(d,1737,380,1.5,T=1.2),1.0)[1],1)) for d in (1e-3,3e-3)])
print('(5) 钢命中：质量预算 → 颗粒数上限')
for frac in (0.01,0.05):
    m=8e-3*frac
    for d in (60e-6,120e-6):
        mp=7800*math.pi/6*d**3; print(f'  弹 8 g × {frac:.0%} = {m*1e3:.2f} g，d={d*1e6:.0f}um 单颗 {mp*1e9:.2f} ug → {m/mp:,.0f} 颗')
print('  子粒径：d_c = d_p (f/N)^(1/3)：', [(N, f, round(120*(f/N)**(1/3))) for N in (3,6,10) for f in (0.2,0.4)])
print('  CO 体积比（0.2%C，2400 K，1 atm）：', round((7800*0.002/0.012)*8.314*2400/101325,0), '倍粒体积')
print('(6) 韦伯数（熔滴二次破碎判据 We≈12，σ 铜 1.3 / 铝 0.9 N/m，假设）')
for nm,d,v,s in (('铜0.5@8',0.5e-3,8,1.3),('铜1@15',1e-3,15,1.3),('铝0.5@8',0.5e-3,8,0.9),('镁2@400',2e-3,400,0.55)):
    print(f'  {nm}: We={rho_a*v*v*d/s:.3f}')
