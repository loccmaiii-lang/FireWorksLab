import math, numpy as np
from phys import traj, vterm, fit_lin, fit_quad, at, cool, Cd, rho_a, mu, g
def path_len(tr,t0,t1):
    m=(tr[:,0]>=t0)&(tr[:,0]<=t1); p=tr[m][:,1:3]; return float(np.sum(np.hypot(*np.diff(p,axis=0).T))) if len(p)>1 else 0.0
print('(a) 钢 120um v0=150 水平')
tr=traj(120e-6,7800,150,0,T=0.6)
for tq in (0.0,0.01,0.02,0.033,0.05,0.066,0.08,0.1,0.13,0.2):
    r=at(tr,tq); print(f'  t={tq:.3f} x={r[1]:.2f} v={r[3]:.1f}  该帧拖尾长(前1/30s)={path_len(tr,max(0,tq-1/30),tq):.2f} m')
L,vt,e=fit_quad(tr,0.12); print(f'  二次拟合 0–0.12 s: vt_eq={vt:.2f} (rms {e*100:.1f} cm)'); k=fit_lin(tr,0.12); print(f'  线性拟合 k={k[0]:.1f} (rms {k[1]*100:.1f} cm)')
for d in (80e-6,100e-6,150e-6):
    tr2=traj(d,7800,150,0,T=0.6); L,vt,e=fit_quad(tr2,0.12); print(f'  d={d*1e6:.0f}um: vt_eq={vt:.2f}  x(0.1)={at(tr2,0.1)[1]:.2f}  v(0.1)={at(tr2,0.1)[3]:.1f}')
print('(b) 子粒 40um，相对 5 m/s + 继承 8 m/s（合 ~13 m/s）')
for d,v0 in ((40e-6,13),(30e-6,10),(50e-6,13)):
    tr=traj(d,7800,v0,0,T=0.2); L,vt,e=fit_quad(tr,0.03); print(f'  d={d*1e6:.0f} v0={v0}: x(10ms)={at(tr,0.01)[1]*100:.1f}cm x(20ms)={at(tr,0.02)[1]*100:.1f}cm v(20ms)={at(tr,0.02)[3]:.1f}  二次 vt_eq={vt:.2f}')
print('(c) 粗碎块 0.7mm 钢 v0=30 斜上 30°')
for d in (0.5e-3,0.7e-3,1e-3):
    tr=traj(d,7800,30,30,T=1.2); kk=fit_lin(tr,0.6)
    print(f'  d={d*1e3:.1f}mm: '+' '.join(f'@{tq}:({at(tr,tq)[1]:.1f},{at(tr,tq)[2]:.1f})' for tq in (0.1,0.2,0.4,0.6,0.8))+f'  线性 k={kk[0]:.2f}/s (rms {kk[1]*100:.0f} cm)  vt={vterm(d,7800):.1f}')
    h,Nu,res=cool(d,7800,650,0.8,1273,15); print('    冷却 1000°C→ '+' '.join(f'{k-273:.0f}°C:{v*1000:.0f}ms' for k,v in sorted(res.items(),reverse=True) if k<=1273))
print('(d) 砂轮：100um v0=35，到达距离 → 时刻')
tr=traj(100e-6,7800,35,0,T=0.4)
def t_at_x(x):
    i=np.searchsorted(tr[:,1],x); return tr[min(i,len(tr)-1),0]
for x in (0.4,0.5,0.67,0.8,1.0,1.2,1.4,1.6):
    print(f'  x={x:.2f} m @ t={t_at_x(x)*1000:.1f} ms')
# 让终点距离在 >0.4m 部分服从 exp(-s/l)，l=0.27：取 x = 0.4 + l*(-ln u)，换成寿命分布
rng=np.random.default_rng(1); u=rng.random(20000); xs=0.4-0.27*np.log(u); xs=xs[xs<1.9]
ts=np.array([t_at_x(x) for x in xs])
print('  校准寿命分位 (s): p10 %.3f p50 %.3f p90 %.3f p99 %.3f max %.3f'%tuple(np.percentile(ts,[10,50,90,99,100])))
# 拟合 SparkGraph dist: t = a + (b-a)*h^bias；用分位拟合
best=None
for a in np.linspace(0.010,0.016,7):
    for b in np.linspace(0.06,0.16,21):
        for bias in np.linspace(1,5,41):
            h=np.linspace(0,1,2001); q=a+(b-a)*h**bias
            e=sum((np.percentile(q,p)-np.percentile(ts,p))**2 for p in (10,30,50,70,90,97))
            if best is None or e<best[0]: best=(e,a,b,bias)
print('  SparkGraph 寿命 [下限,上限,偏向] ≈ [%.3f, %.3f, %.2f]'%best[1:])
for d in (60e-6,100e-6,140e-6):
    trd=traj(d,7800,35,0,T=0.4); kk=fit_lin(trd,0.1); print(f'  d={d*1e6:.0f}um 线性拟合 0–0.1 s k={kk[0]:.1f}/s rms {kk[1]*100:.1f} cm')
print('(e) 镁 2mm v0=400：线性 vs 二次 拟合 0–1.0 s')
tr=traj(2e-3,1737,400,0,T=1.2); kk=fit_lin(tr,1.0); L,vt,e=fit_quad(tr,1.0)
print(f'  线性 k={kk[0]:.2f}/s rms {kk[1]:.2f} m ; 二次 vt={vt:.2f} rms {e:.3f} m ; x(1s)={at(tr,1.0)[1]:.1f}')
tr=traj(2e-3,1737,350,0,T=1.2,cdmul=1.4); L,vt,e=fit_quad(tr,1.0); print(f'  片状 Cd×1.4 v0=350: vt_eq={vt:.2f} x(0.5)={at(tr,0.5)[1]:.1f} x(1.0)={at(tr,1.0)[1]:.1f}')
print('(f) 爆炸燃烧碎块 4mm ρ1600 二次阻力')
vt4=vterm(4e-3,1600); print(f'  vt={vt4:.2f}  Re(vt)={rho_a*vt4*4e-3/mu:.0f}')
for v0 in (40,70,100):
    tr=traj(4e-3,1600,v0,45,T=3.0)
    print(f'  v0={v0} 45°: '+' '.join(f'@{tq}:({at(tr,tq)[1]:.1f},{at(tr,tq)[2]:.1f})' for tq in (0.25,0.5,1.0,1.5,2.0,2.5,3.0)))
    tr=traj(4e-3,1600,v0,90,T=3.0); print(f'     竖直: 顶点高 {tr[:,2].max():.1f} m @ {tr[tr[:,2].argmax(),0]:.2f} s')
for d,rho in ((3e-3,1600),(6e-3,1600),(4e-3,2700)):
    print(f'  d={d*1e3:.0f}mm ρ{rho}: vt={vterm(d,rho):.1f}')
print('(g) 尾火花 两项拟合（线性 Stokes + 平方）')
for nm,d,rho in (('钛 100um',100e-6,4500),('钛 150um',150e-6,4500),('炭 150um ρ500',150e-6,500),('钢 100um',100e-6,7800)):
    k0=18*mu/(rho*d*d)
    tr=traj(d,rho,15,0,T=1.0)
    best=None
    for c in np.geomspace(0.01,20,2000):
        # 积分 dv/dt = -k0 v - c v|v|（水平），对比
        t=tr[:,0]; dt=1e-4; v=15.0; x=0.0; xs=[]; tt=0.0; j=0; out=np.zeros_like(t)
        for i,ti in enumerate(t):
            while tt<ti: v-= (k0*v+c*v*v)*dt; x+=v*dt; tt+=dt
            out[i]=x
        m=t<=0.5; err=np.sqrt(np.mean((out[m]-tr[m,1])**2))
        if best is None or err<best[1]: best=(c,err)
    c=best[0]; vt2=(-k0+math.sqrt(k0*k0+4*c*g))/(2*c)
    print(f'  {nm}: Stokes k0={k0:.2f}/s  拟合平方 c={c:.2f}/m (rms {best[1]*100:.1f} cm)  两项终端={vt2:.2f} m/s  SN终端={vterm(d,rho):.2f}  x(0.5)={at(tr,0.5)[1]:.2f}')
print('(h) 熔滴 线性拟合（SparkGraph 只有线性阻力）')
for nm,d,rho,v0,ang in (('铜0.3',0.3e-3,8020,5,20),('铜0.5',0.5e-3,8020,5,20),('铜0.8',0.8e-3,8020,4,20),('铝0.5',0.5e-3,2375,5,20),('铜细 50um',50e-6,8020,20,10)):
    tr=traj(d,rho,v0,ang,T=1.2); T=0.4 if d>1e-4 else 0.05
    # 2D 线性拟合：位置 x = v0x(1-e^-kt)/k, z = (v0z+g/k)(1-e^-kt)/k - g t/k
    best=None; t=tr[tr[:,0]<=T,0]; X=tr[tr[:,0]<=T,1]; Z=tr[tr[:,0]<=T,2]; vx=v0*math.cos(math.radians(ang)); vz=v0*math.sin(math.radians(ang))
    for k in np.geomspace(0.05,200,3000):
        e=(1-np.exp(-k*t))/k; xl=vx*e; zl=(vz+g/k)*e-g*t/k; err=np.sqrt(np.mean((xl-X)**2+(zl-Z)**2))
        if best is None or err<best[1]: best=(k,err)
    print(f'  {nm}mm v0={v0}: 线性 k={best[0]:.2f}/s rms {best[1]*100:.1f} cm (拟合 0–{T}s)  vt={vterm(d,rho):.2f}  '+' '.join(f'@{tq}:({at(tr,tq)[1]:.2f},{at(tr,tq)[2]:.2f})' for tq in (0.1,0.2,0.4,0.6)))
for nm,d,rho,cp,eps,T0,Tm,Lf in (('铜0.3',0.3e-3,8020,450,0.15,2073,1357.8,208.7e3),('铜0.8',0.8e-3,8020,450,0.15,2073,1357.8,208.7e3),('铜细50um',50e-6,8020,450,0.15,2073,1357.8,208.7e3),('铝0.5 1000°C',0.5e-3,2375,1000,0.1,1273,933.5,397e3),('铝0.5 1500°C',0.5e-3,2375,1000,0.1,1773,933.5,397e3)):
    h,Nu,res=cool(d,rho,cp,eps,T0,4,0,Tm,Lf); print(f'  冷却 {nm}: '+' '.join(f'{k-273:.0f}°C:{v*1000:.0f}ms' for k,v in sorted(res.items(),reverse=True) if k<=T0))
print('(i) 龙息：MgO 残渣 / 冷却；镁片燃烧期的拖尾')
for d in (1e-3,2e-3):
    h,Nu,res=cool(d,3000,1000,0.4,2300,10); print(f'  MgO {d*1e3:.0f}mm 2300K: '+' '.join(f'{k-273:.0f}°C:{v*1000:.0f}ms' for k,v in sorted(res.items(),reverse=True)))
print('(j) 钢命中细火星重力偏移比例')
for d,v0,T in ((120e-6,150,0.1),(300e-6,100,0.3)):
    a=traj(d,7800,v0,0,T=T); 
    # 无重力对照
    import phys; g0=phys.g; phys.g=0.0; b=phys.traj(d,7800,v0,0,T=T); phys.g=g0
    print(f'  d={d*1e6:.0f} v0={v0} t={T}: 路径 {at(b,T)[1]:.2f} m, 重力下沉 {at(b,T)[2]-at(a,T)[2]:.3f} m ({(at(b,T)[2]-at(a,T)[2])/at(b,T)[1]*100:.1f}%)')
print('(k) 雷诺数')
for nm,d,v in (('钢命中 120um @150',120e-6,150),('砂轮 100um @35',100e-6,35),('砂轮末段 @3',100e-6,3),('镁 2mm @400',2e-3,400),('镁 2mm @10',2e-3,10),('碎块 4mm @70',4e-3,70),('铜滴 0.5mm @5',0.5e-3,5),('子粒 40um @13',40e-6,13)):
    print(f'  {nm}: Re={rho_a*v*d/mu:.0f}  Cd={Cd(rho_a*v*d/mu):.2f}')
