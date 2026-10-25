import numpy as np
rng=np.random.default_rng(7); g=9.81
def dist(lo,hi,b,n): return lo+(hi-lo)*rng.random(n)**b
def endpos(k,v,t,ang):
    # 线性阻力 + 重力的解析解（粒子图 sample 同式）
    e=(1-np.exp(-k*t))/k; vx=v*np.cos(ang); vz=v*np.sin(ang)
    x=vx*e; z=vz*e-g*(t-e)/k
    return x,z
def layer(n,k,life,cone=12):
    v=dist(30,40,1,n); t=dist(*life,n)
    c=1-rng.random(n)*(1-np.cos(np.radians(cone)))   # 锥内按立体角均匀（同 direction()）
    th=np.arccos(c); ph=rng.random(n)*2*np.pi
    # 轴 (cos-15°, 0, sin-15°)；画面平面投影 (x, z)
    ax=np.radians(-15); d_par=np.cos(th); d_perp=np.sin(th)
    dx=d_par*np.cos(ax)-d_perp*np.cos(ph)*np.sin(ax); dz=d_par*np.sin(ax)+d_perp*np.cos(ph)*np.cos(ax); dy=d_perp*np.sin(ph)
    e=(1-np.exp(-k*t))/k
    X=v*dx*e; Y=v*dy*e; Z=v*dz*e-g*(t-e)/k
    return np.sqrt(X**2+Y**2+Z**2), X, Z
print('(A) 砂轮：粒子图映射能否复现 ES2019 的 l（只看 >0.4 m，MLE l = mean(d-0.4)）')
for nm,n,k,life in (('e02 主 100um',400000,23.2,(0.016,0.085,4)),('e02 偏向12',400000,23.2,(0.016,0.14,12)),('e03 细 60um',300000,43.7,(0.006,0.031,4)),('e04 粗 140um',25000,15.4,(0.031,0.167,4))):
    d,X,Z=layer(n,k,life); m=d>0.4
    print(f'  {nm}: >0.4 m 占 {m.mean()*100:.0f}%  l={np.mean(d[m]-0.4):.3f} m  中位结束距离 {np.median(d):.2f} m  p95 {np.percentile(d,95):.2f} m  最远 {d.max():.2f}  最低 z {Z.min():.2f}')
D=np.concatenate([layer(n,k,life)[0] for n,k,life in ((400000,23.2,(0.016,0.085,4)),(300000,43.7,(0.006,0.031,4)),(25000,15.4,(0.031,0.167,4)))])
m=D>0.4; print(f'  三层合计（4000:3000:250 比例）: >0.4 m 占 {m.mean()*100:.0f}%  l={np.mean(D[m]-0.4):.3f} m')
# 直方图检查是不是指数：对 >0.4 的 d-0.4 做 log 直方图斜率
for nm,DD in (('主层',layer(400000,23.2,(0.016,0.085,4))[0]),('三层合计',D)):
    s=DD[DD>0.4]-0.4; h,b=np.histogram(s,bins=np.linspace(0,1.0,21)); c=(b[:-1]+b[1:])/2; ok=h>50
    sl=np.polyfit(c[ok],np.log(h[ok]),1)[0]; print(f'  {nm} 0.4–1.4 m 对数直方图斜率拟合 l={-1/sl:.3f} m')
# 用 v0 区间 [30,40] 时，要 l=0.27 的寿命上限（偏向 4）
for hi in (0.07,0.085,0.10,0.12,0.14):
    d,_,_=layer(200000,23.2,(0.016,hi,4)); m=d>0.4; print(f'   寿命上限 {hi}: l={np.mean(d[m]-0.4):.3f}  >0.4 占 {m.mean()*100:.0f}%')
print('(B) 钢命中 L1：星头亮度 = 渐亮 min(1,a/0.05) × starBrightCurve(a/burn)；燃烧 0.049/0.07/0.091 s')
keys=np.array([[0,6],[0.1,6],[0.25,2.9],[0.4,1.8],[0.72,1],[1,1]])
def cv(x): return np.interp(x,keys[:,0],keys[:,1])
for burn in (0.049,0.07,0.091):
    a=np.array([0.002,0.005,0.01,0.017,0.025,0.033,0.05,0.06]); a=a[a<burn]
    b=np.minimum(1,a/0.05)*cv(a/burn)
    print(f'  burn {burn}: '+' '.join(f'{ai*1000:.0f}ms:{bi:.2f}' for ai,bi in zip(a,b)))
# 第一帧（0–33 ms）平均亮度
for burn in (0.049,0.07,0.091):
    a=np.linspace(0,min(0.0333,burn),400); b=np.minimum(1,a/0.05)*cv(a/burn); a2=np.linspace(0,0.0333,400); b0=np.minimum(1,a2/0.05)
    print(f'  burn {burn}: 第 1 帧平均 {b.mean():.2f}（不补偿 {b0.mean():.2f}）')
