import numpy as np, math
from phys import traj, vterm, at, rho_a, mu, g
def t_at_z(tr,z):
    i=np.argmax(tr[:,2]<=z); return tr[i,0] if tr[i,2]<=z else float('nan')
print('熔滴落地时刻（发射 v0 5 m/s 仰 20°，落差 1.0 / 1.5 m）')
for nm,d,rho,v0 in (('铜0.3',0.3e-3,8020,5),('铜0.5',0.5e-3,8020,5),('铜0.8',0.8e-3,8020,4),('铝0.5',0.5e-3,2375,5)):
    tr=traj(d,rho,v0,20,T=2.0); print(f'  {nm}: z=-1.0 @ {t_at_z(tr,-1.0):.2f}s  z=-1.5 @ {t_at_z(tr,-1.5):.2f}s  x@0.4s={at(tr,0.4)[1]:.2f}')
print('细火星 50um 铜 v0 10/20/30 水平：x(5,10,20 ms)')
for v0 in (10,20,30):
    tr=traj(50e-6,8020,v0,0,T=0.05); print(f'  v0={v0}: '+' '.join(f'{at(tr,t)[1]*100:.1f}cm' for t in (0.005,0.01,0.02)))
print('爆炸：4mm v0 60 仰 30/50/70/90°，烧完 2.0 s 时位置；火花停下距离（钛 120um 继承 1，两项阻力 k0=5, c=1.5）')
for ang in (30,50,70,90):
    tr=traj(4e-3,1600,60,ang,T=3.2); print(f'  {ang}°: @1.0 ({at(tr,1.0)[1]:.1f},{at(tr,1.0)[2]:.1f}) @2.0 ({at(tr,2.0)[1]:.1f},{at(tr,2.0)[2]:.1f}) @2.5 ({at(tr,2.5)[1]:.1f},{at(tr,2.5)[2]:.1f}) 顶 {tr[:,2].max():.1f} m')
for v in (60,30,12):
    k0,c=5.0,1.5; x=0;vv=v;t=0;dt=1e-5
    while t<1.0: vv-= (k0*vv+c*vv*vv)*dt; x+=vv*dt; t+=dt
    print(f'  火花继承 {v} m/s：1 s 内滑行 {x:.2f} m')
print('龙息 1 mm / 2 mm / 3 mm：30 m 到达时刻')
for d in (1e-3,2e-3,3e-3):
    tr=traj(d,1737,380,1.5,T=3.0); i=np.argmax(tr[:,1]>=30); print(f'  {d*1e3:.0f} mm: vt={vterm(d,1737):.1f}  '+(f'30 m @ {tr[i,0]:.2f}s' if tr[i,1]>=30 else f'到不了 30 m（最远 {tr[:,1].max():.1f}）')+f'  x(0.5)={at(tr,0.5)[1]:.1f} x(1.0)={at(tr,1.0)[1]:.1f} z(1.5)={at(tr,1.5)[2]:.1f}')
print('钢命中墙面版：v0 150 仰角 0（贴墙面射出）与 60°')
for ang in (10,45,80):
    tr=traj(120e-6,7800,150,ang,T=0.3); print(f'  {ang}°: @0.08 ({at(tr,0.08)[1]:.2f},{at(tr,0.08)[2]:.2f}) @0.2 ({at(tr,0.2)[1]:.2f},{at(tr,0.2)[2]:.2f})')
print('砂轮：100um v0 35 方向 -15°：@ p50/p90/p97 寿命 23/51/86 ms 的位置')
tr=traj(100e-6,7800,35,-15,T=0.2)
for t in (0.023,0.051,0.086,0.15): print(f'  t={t}: ({at(tr,t)[1]:.2f},{at(tr,t)[2]:.2f})')
tr=traj(140e-6,7800,40,-15,T=0.2); print('  粗 140um v0 40 @0.06:',(round(at(tr,0.06)[1],2),round(at(tr,0.06)[2],2)))
print('质量率 → 火星数：切割 2 mm 厚、片厚 1 mm、进给 10 mm/s')
V=2e-3*1e-3*1e-2; m=V*7800; print(f'  {V:.1e} m³/s = {m*1e3:.2f} g/s；100um 单颗 {7800*math.pi/6*1e-12*1e3:.2e} g → {m/(7800*math.pi/6*1e-12):,.0f} 颗/s')
print('龙息：12 号 2¾ 寸，膛径 18.5 mm，装药柱长 25 mm（假设）')
Vb=math.pi/4*0.0185**2*0.025; print(f'  体积 {Vb*1e6:.1f} cm³ × 填充 0.5 × 镁 1.737 = {Vb*0.5*1737*1e3:.1f} g；2 mm 球 {1737*math.pi/6*8e-9*1e6:.1f} mg → {Vb*0.5*1737/(1737*math.pi/6*8e-9):.0f} 颗')
print('爆炸碎块 4 mm 星 质量 / 喷火花率')
ms=1600*math.pi/6*(4e-3)**3; mt=4500*math.pi/6*(120e-6)**3; print(f'  星 {ms*1e3:.3f} g，2 s 烧完 {ms/2*1e6:.1f} mg/s；钛火花 {mt*1e9:.2f} ug；5–10% 成火花 → {0.05*ms/2/mt:.0f}–{0.1*ms/2/mt:.0f} 颗/s')
