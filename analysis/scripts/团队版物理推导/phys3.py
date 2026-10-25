import math, numpy as np
import phys
from phys import traj, vterm, fit_lin, fit_quad, at, cool, rho_a, mu, g
gl=lambda T: max(0,(T-900)/1150)**3
print("(1) 砂轮寿命分布拟合（向量化）")
tr=traj(100e-6,7800,35,0,T=0.5)
def t_at_x(x): i=np.searchsorted(tr[:,1],x); return tr[min(i,len(tr)-1),0]
rng=np.random.default_rng(1)
h=np.linspace(0,1,1001)
A=np.linspace(0.010,0.016,7); B=np.linspace(0.06,0.30,25); BI=np.linspace(1,12,45)
ps=(10,30,50,70,90,97,99)
for l in (0.24,0.27,0.31):
    u=rng.random(40000); xs=0.4-l*np.log(u); xs=xs[xs<1.95]
    idx=np.minimum(np.searchsorted(tr[:,1],xs),len(tr)-1); ts=tr[idx,0]
    tq=np.percentile(ts,ps)
    best=None
    hq=np.percentile(h[None,:]**BI[:,None],ps,axis=1).T  # (BI, ps)
    for a in A:
        for b in B:
            q=a+(b-a)*hq; e=((q-tq)**2).sum(1); i=e.argmin()
            if best is None or e[i]<best[0]: best=(e[i],a,b,BI[i])
    print(f'  l={l}: 分位 p10 {np.percentile(ts,10)*1e3:.0f} p50 {np.percentile(ts,50)*1e3:.0f} p90 {np.percentile(ts,90)*1e3:.0f} p99 {np.percentile(ts,99)*1e3:.0f} ms → 寿命 [{best[1]:.3f}, {best[2]:.3f}, {best[3]:.1f}]')
print('(2) 子粒（爆花碎片）线性等效阻力')
for d,v0 in ((30e-6,8),(35e-6,10),(40e-6,12),(50e-6,12)):
    t2=traj(d,7800,v0,0,T=0.1); k=fit_lin(t2,0.02); print(f'  钢 {d*1e6:.0f}um v0={v0}: k={k[0]:.0f}/s (rms {k[1]*1000:.1f} mm, 0–20 ms)  x(10ms)={at(t2,0.01)[1]*100:.1f}cm  vt={vterm(d,7800):.2f}')
print('(3) 燃烧时间按 d^2 从 54um/21ms 外推（Ning 实测，经 Mich 2023 引）')
for d in (30,35,40,60,80,100,120,150):
    print(f'  d={d}um: d^2 → {21*(d/54)**2:.0f} ms ; d^1.5 → {21*(d/54)**1.5:.0f} ms')
print('(4) 星头 50 ms 渐入的补偿曲线（亮度 = I·min(1,a/0.05)·curve(a/dur)）')
for dur in (0.05,0.06,0.08):
    keys=[]
    for x in (0.02,0.05,0.1,0.2,0.3,0.5,0.7,1.0):
        a=x*dur; ign=min(1,a/0.05); keys.append((x, round(1/ign,2) if ign>0 else 0))
    print(f'  dur={dur}: '+', '.join(f'{x}:{v}' for x,v in keys))
print('(5) 冷却 → 烘焙器 glowOf 亮度曲线（归一到出发温度）')
def curve_from(d,rho,cp,eps,T0,v,Tm=None,Lf=None,life=None):
    T=T0; t=0; dt=2e-5; out=[]; frozen=0; m_over_A=rho*d/6
    Re=rho_a*v*d/mu; Nu=2+0.6*math.sqrt(Re)*0.7**(1/3); h=Nu*0.067/d
    while T>800:
        q=h*(T-293)+eps*5.67e-8*(T**4-293**4)
        if Tm and Lf and abs(T-Tm)<0.5 and frozen<Lf: frozen+=q*dt/m_over_A
        else:
            T-=q*dt/(m_over_A*cp)
            if Tm and Lf and T<Tm and frozen<Lf: T=Tm
        t+=dt; out.append((t,T))
    out=np.array(out); tend=out[-1,0] if life is None else life
    s=[]
    for f in (0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0):
        tt=f*tend; i=min(len(out)-1,np.searchsorted(out[:,0],tt)); s.append((f,round(gl(out[i,1])/gl(T0),3),round(out[i,1]-273)))
    return tend,s
for nm,args in (('铜 0.3mm 1800°C',(0.3e-3,8020,450,0.15,2073,4,1357.8,208.7e3)),('铜 0.5mm 1800°C',(0.5e-3,8020,450,0.15,2073,4,1357.8,208.7e3)),('铜 0.8mm 1800°C',(0.8e-3,8020,450,0.15,2073,4,1357.8,208.7e3)),
                ('MgO 1mm 2300K',(1e-3,3000,1000,0.4,2300,10)),('MgO 2mm 2300K',(2e-3,3000,1000,0.4,2300,10)),('钢 0.7mm 1300K',(0.7e-3,7800,650,0.8,1300,15))):
    tend,s=curve_from(*args); print(f'  {nm}: 到 527°C 用 {tend*1000:.0f} ms；曲线 '+', '.join(f'{f}:{v}' for f,v,_ in s)+'  （温度 '+' '.join(str(T) for _,_,T in s)+'）')
print('(6) 钢命中星：二次阻力 L=vt^2/g；燃烧 50–80 ms 时位置和速度')
for d,vt in ((100e-6,3.75),(120e-6,4.32),(150e-6,5.07)):
    t2=traj(d,7800,150,0,T=0.3)
    print(f'  d={d*1e6:.0f}: L={vt*vt/g:.2f} m  @50ms x={at(t2,0.05)[1]:.2f} v={at(t2,0.05)[3]:.1f}  @80ms x={at(t2,0.08)[1]:.2f} v={at(t2,0.08)[3]:.1f}  @0.2s x={at(t2,0.2)[1]:.2f}')
print('(7) Allen 律对照（砂轮 100um v0=35）')
def Cd_allen(Re): return 24/Re if Re<2 else (18.5/Re**0.6 if Re<500 else 0.44)
def traj_allen(d,rho,v0,T):
    vx=v0; x=0; t=0; dt=1e-5; out=[]
    while t<T:
        Re=rho_a*vx*d/mu; acc=0.75*rho_a/rho*Cd_allen(max(Re,1e-6))/d*vx; vx-=acc*vx*dt; x+=vx*dt; t+=dt; out.append((t,x))
    return np.array(out)
ta=traj_allen(100e-6,7800,35,0.2)
for tq in (0.02,0.05,0.1,0.2):
    i=np.searchsorted(ta[:,0],tq); print(f'  t={tq}: Allen x={ta[min(i,len(ta)-1),1]:.3f}  SN x={at(traj(100e-6,7800,35,0,T=0.21),tq)[1]:.3f}')
print('(8) 熔滴 / 碎块 SparkGraph 线性拟合用的 k（重复用于表格）')
print('(9) 龙息：镁 2mm v0=350/400 cone，线性拟合（SparkGraph 备选）')
for v0 in (350,400):
    t2=traj(2e-3,1737,v0,0,T=1.2); k=fit_lin(t2,1.0); print(f'  v0={v0}: 线性 k={k[0]:.1f} rms {k[1]:.1f} m; x(0.3)={at(t2,0.3)[1]:.1f} x(0.7)={at(t2,0.7)[1]:.1f} x(1.0)={at(t2,1.0)[1]:.1f} v(1.0)={at(t2,1.0)[3]:.1f}')
print('(10) 爆炸碎块 两项拟合（星用二次 vt）: 4mm ρ1600 vt=12.6, L=vt²/g=%.1f m'%(12.59**2/g))
print('(11) 每星火花：木炭 120um ρ500 / 钛 120um')
for nm,d,rho in (('炭120',120e-6,500),('钛120',120e-6,4500)):
    k0=18*mu/(rho*d*d); print(f'  {nm}: Stokes k0={k0:.1f}/s vt={vterm(d,rho):.2f}')
