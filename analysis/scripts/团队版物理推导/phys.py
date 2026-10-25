# 火星物理推导：阻力（Schiller–Naumann）+ 冷却（Ranz–Marshall 对流 + 辐射）+ 黑体颜色
import math, numpy as np
g=9.81; rho_a=1.2; mu=1.81e-5; Pr=0.7; sig=5.670e-8; Tinf=293.0
def Cd(Re):
    Re=max(Re,1e-9)
    return 24/Re*(1+0.15*Re**0.687) if Re<1000 else 0.44
def traj(d,rho_p,v0,ang_deg=0.0,T=3.0,dt=1e-5,cdmul=1.0):
    a=math.radians(ang_deg); vx=v0*math.cos(a); vz=v0*math.sin(a); x=z=0.0; t=0.0
    out=[(0,0,0,v0)]
    while t<T:
        v=math.hypot(vx,vz); Re=rho_a*v*d/mu; c=Cd(Re)*cdmul
        acc=0.75*rho_a/rho_p*c/d*v
        vx-= acc*vx*dt; vz-= (acc*vz+g)*dt; x+=vx*dt; z+=vz*dt; t+=dt
        if len(out)<1 or t-out[-1][0]>=1e-3: out.append((t,x,z,math.hypot(vx,vz)))
    return np.array(out)
def vterm(d,rho_p,cdmul=1.0):
    v=1.0
    for _ in range(200):
        Re=rho_a*v*d/mu; v=math.sqrt(4*rho_p*g*d/(3*rho_a*Cd(Re)*cdmul))*0.5+v*0.5
    return v
def fit_lin(tr,Tfit):
    m=tr[:,0]<=Tfit; t=tr[m,0]; x=tr[m,1]; v0=tr[0,3]
    best=None
    for k in np.geomspace(0.05,400,4000):
        xl=v0*(1-np.exp(-k*t))/k; e=np.sqrt(np.mean((xl-x)**2))
        if best is None or e<best[1]: best=(k,e)
    return best
def fit_quad(tr,Tfit):
    # 水平方向二次阻力 x = L ln(1+v0 t/L)，L = vt^2/g
    m=tr[:,0]<=Tfit; t=tr[m,0]; x=tr[m,1]; v0=tr[0,3]; best=None
    for L in np.geomspace(1e-3,500,6000):
        xl=L*np.log1p(v0*t/L); e=np.sqrt(np.mean((xl-x)**2))
        if best is None or e<best[1]: best=(L,e)
    L=best[0]; return L, math.sqrt(g*L), best[1]
def at(tr,tq):
    i=np.searchsorted(tr[:,0],tq); i=min(i,len(tr)-1); return tr[i]
def cool(d,rho_p,cp,eps,T0,v=5.0,t_hold=0.0,Tm=None,Lf=None,kf=0.067,T_end=3.0,dt=1e-5,marks=(1773,1573,1373,1273,1173,1073,973,873,798)):
    # 集总热容：m c dT/dt = -h A (T-Tinf) - eps sig A (T^4-Tinf^4)，t_hold 内燃烧放热维持 T0；凝固时在 Tm 停留放出潜热
    T=T0; t=0.0; res={}; frozen=0.0; m_over_A=rho_p*d/6
    Re=rho_a*v*d/mu; Nu=2+0.6*math.sqrt(Re)*Pr**(1/3); h=Nu*kf/d
    while t<T_end:
        if t>=t_hold:
            q=h*(T-Tinf)+eps*sig*(T**4-Tinf**4)
            if Tm and Lf and abs(T-Tm)<0.5 and frozen<Lf:
                frozen+=q*dt/m_over_A
            else:
                T-=q*dt/(m_over_A*cp)
                if Tm and Lf and T<Tm and frozen<Lf: T=Tm
        for mk in marks:
            if mk not in res and T<=mk: res[mk]=t
        t+=dt
        if T<700: break
    return h,Nu,res
if __name__=='__main__':
    import json
    print('== 终端速度 ==')
    for nm,d,rho in [('钢 50um',50e-6,7800),('钢 100um',100e-6,7800),('钢 150um',150e-6,7800),('钢 300um',300e-6,7800),('钢 1mm',1e-3,7800),
                     ('铜 0.3mm',0.3e-3,8020),('铜 0.5mm',0.5e-3,8020),('铜 1mm',1e-3,8020),('铝 0.5mm',0.5e-3,2375),('铝 1mm',1e-3,2375),
                     ('镁 1mm',1e-3,1737),('镁 2mm',2e-3,1737),('镁 2mm 片 Cd×2',2e-3,1737)]:
        cm=2.0 if '片' in nm else 1.0
        vt=vterm(d,rho,cm); Re=rho_a*vt*d/mu; tau_s=rho*d*d/(18*mu)
        print(f'{nm:14s} vt={vt:6.2f} m/s  Re(vt)={Re:7.1f}  Stokes tau={tau_s:8.4f} s')
    print('== 砂轮：d=100um 钢 v0=30/35/40，水平 ==')
    for v0 in (30,35,40):
        tr=traj(100e-6,7800,v0,0,T=1.0)
        for tq in (0.02,0.05,0.1,0.15,0.2,0.3):
            r=at(tr,tq); print(f' v0={v0} t={tq:.2f} x={r[1]:.3f} z={r[2]:.3f} v={r[3]:.2f}')
        k=fit_lin(tr,0.15); L,vtq,e=fit_quad(tr,0.15); print(f'  拟合 0–0.15 s：线性 k={k[0]:.1f}/s (rms {k[1]*100:.1f} cm)  二次 L={L:.3f} m vt_eq={vtq:.2f} (rms {e*100:.1f} cm)')
    for d in (60e-6,140e-6):
        tr=traj(d,7800,35,0,T=1.0); k=fit_lin(tr,0.15); print(f' d={d*1e6:.0f}um v0=35: x(0.1)={at(tr,0.1)[1]:.3f} x(0.2)={at(tr,0.2)[1]:.3f} 线性k={k[0]:.1f}')
    print('== 钢命中：d, v0=100/200 m/s ==')
    for d in (60e-6,100e-6,150e-6,300e-6,1e-3):
        for v0 in (100,200):
            tr=traj(d,7800,v0,30,T=2.0)
            r1=at(tr,0.05); r2=at(tr,0.1); r3=at(tr,0.3); r4=at(tr,1.0)
            L,vtq,e=fit_quad(traj(d,7800,v0,0,T=0.5),0.3); k=fit_lin(traj(d,7800,v0,0,T=0.5),0.2)
            print(f' d={d*1e6:5.0f}um v0={v0}: (x,z)@.05=({r1[1]:.2f},{r1[2]:.2f}) @.1=({r2[1]:.2f},{r2[2]:.2f}) @.3=({r3[1]:.2f},{r3[2]:.2f}) @1=({r4[1]:.2f},{r4[2]:.2f}) v@.1={r2[3]:.1f}  vt_eq={vtq:.2f} 线性k={k[0]:.1f}')
    print('== 龙息弹：镁 2mm（球 / 片），v0=300/400 ==')
    for cm in (1.0,2.0):
        for v0 in (300,400):
            tr=traj(2e-3,1737,v0,2,T=3.0,cdmul=cm)
            s=' '.join(f'@{tq}:({at(tr,tq)[1]:.1f},{at(tr,tq)[2]:.1f},v{at(tr,tq)[3]:.0f})' for tq in (0.05,0.1,0.2,0.4,0.7,1.0,1.5,2.0))
            L,vtq,e=fit_quad(traj(2e-3,1737,v0,0,T=1.2,cdmul=cm),1.0)
            print(f' Cd×{cm} v0={v0}: {s}  二次 vt_eq={vtq:.1f} (rms {e:.2f} m)')
    print('== 熔滴：铜 / 铝 0.5mm v0=6 m/s 斜上 30° ==')
    for nm,d,rho in [('铜0.5',0.5e-3,8020),('铜1',1e-3,8020),('铝0.5',0.5e-3,2375),('铜0.2',0.2e-3,8020)]:
        tr=traj(d,rho,6,30,T=1.5)
        s=' '.join(f'@{tq}:({at(tr,tq)[1]:.2f},{at(tr,tq)[2]:.2f})' for tq in (0.1,0.3,0.5,0.8,1.0))
        # 线性阻力拟合：用 z 的下落匹配 vt
        vt=vterm(d,rho); print(f' {nm}mm: {s}  vt={vt:.2f}  线性等效 k=g/vt={g/vt:.2f}/s')
    print('== 冷却 ==')
    cases=[('钢 100um 燃后 2400K',100e-6,7800,650,0.8,2400,5,0,None,None),
           ('钢 100um 静止',100e-6,7800,650,0.8,2400,0.5,0,None,None),
           ('钢 30um 子粒',30e-6,7800,650,0.8,2400,5,0,None,None),
           ('钢 300um',300e-6,7800,650,0.8,2000,10,0,None,None),
           ('钢 1mm 块 1300K',1e-3,7800,650,0.8,1300,8,0,None,None),
           ('铜 0.5mm 2073K',0.5e-3,8020,450,0.15,2073,6,0,1357.8,208.7e3),
           ('铜 1mm 2073K',1e-3,8020,450,0.15,2073,6,0,1357.8,208.7e3),
           ('铜 0.2mm 2073K',0.2e-3,8020,450,0.15,2073,6,0,1357.8,208.7e3),
           ('铝 0.5mm 1273K',0.5e-3,2375,1000,0.1,1273,6,0,933.5,397e3),
           ('MgO 渣 1mm 2300K',1e-3,3000,1000,0.4,2300,8,0,None,None)]
    for nm,d,rho,cp,eps,T0,v,th,Tm,Lf in cases:
        h,Nu,res=cool(d,rho,cp,eps,T0,v,th,Tm,Lf)
        tau=rho*cp*d/(6*h)
        print(f' {nm:18s} Nu={Nu:5.2f} h={h:7.0f} 对流 tau={tau:.3f}s  '+' '.join(f'{k-273:.0f}°C:{v*1000:.0f}ms' for k,v in sorted(res.items(),reverse=True)))
