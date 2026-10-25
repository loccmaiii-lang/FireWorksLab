import numpy as np, math
from phys import traj, vterm, fit_lin, fit_quad, at, rho_a, mu, g
print('Mg/MgO 火花 80um：线性拟合 0–40 ms')
for nm,d,rho,v0 in (('Mg 80um',80e-6,1737,60),('MgO 80um',80e-6,3000,60),('Mg 80um @200',80e-6,1737,200)):
    tr=traj(d,rho,v0,0,T=0.2); k=fit_lin(tr,0.04); L,vt,e=fit_quad(tr,0.04); print(f'  {nm}: 线性 k={k[0]:.0f} (rms {k[1]*100:.1f} cm) 二次 vt_eq={vt:.2f}  x(20ms)={at(tr,0.02)[1]:.2f} x(40ms)={at(tr,0.04)[1]:.2f}  Stokes k0={18*mu/(rho*d*d):.1f}')
print('爆炸碎块：线性阻力对照（v0 50 竖直）')
vt=12.59; k=g/vt; v0=50
H_lin=v0/k-g/k**2*math.log(1+k*v0/g); H_q=vt**2/(2*g)*math.log(1+v0**2/vt**2)
print(f'  线性 k=g/vt={k:.3f}: 顶高 {H_lin:.1f} m；二次: {H_q:.1f} m；要让线性顶高 = 二次 → 解 k')
for kk in np.linspace(0.5,4,36):
    H=v0/kk-g/kk**2*math.log(1+kk*v0/g)
    if H<=H_q: print(f'   k={kk:.2f}/s 顶高 {H:.1f} m → 下落终速 g/k={g/kk:.1f} m/s（真实 {vt}）'); break
print('小碎屑 1.5 mm ρ1600 vt；龙息 1 mm 镁片 vt')
print('  1.5mm:',round(vterm(1.5e-3,1600),2),' 1mm Mg:',round(vterm(1e-3,1737),2))
print('钢命中 40um 子粒 线性拟合 @ v0=16（继承 0.5 × 16 + 7）')
tr=traj(40e-6,7800,15,0,T=0.05); kk=fit_lin(tr,0.02); print('  k=',round(kk[0],1),' x(15ms)=',round(at(tr,0.015)[1]*100,1),'cm')
print('砂轮二级 20um：线性拟合 @ 5 m/s')
tr=traj(20e-6,7800,5,0,T=0.02); kk=fit_lin(tr,0.006); print('  k=',round(kk[0],1),' Stokes',round(18*mu/(7800*4e-10),1))
print('钢命中：v0 150 时 0.1 s 的 x 对 vt 的敏感度（二次阻力解析 x=L ln(1+v0 t/L)）')
for vt in (3,4.3,6):
    L=vt*vt/g; print(f'  vt={vt}: x(0.1)={L*math.log(1+150*0.1/L):.2f} m  x(0.3)={L*math.log(1+150*0.3/L):.2f}')
print('龙息：每颗弹丸火花数与 GPU 总数')
print('  250 颗 × 1.2 s × 100/s =',250*1.2*100)
