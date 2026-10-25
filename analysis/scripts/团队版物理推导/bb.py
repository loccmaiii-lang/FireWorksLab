import numpy as np, math
h=6.62607015e-34; c=2.99792458e8; kB=1.380649e-23
lam=np.arange(380,781,1.0)*1e-9
def g(l,mu,s1,s2):
    s=np.where(l<mu,s1,s2); return np.exp(-0.5*((l-mu)/s)**2)
L=lam*1e9
xb=1.056*g(L,599.8,37.9,31.0)+0.362*g(L,442.0,16.0,26.7)-0.065*g(L,501.1,20.4,26.2)
yb=0.821*g(L,568.8,46.9,40.5)+0.286*g(L,530.9,16.3,31.1)
zb=1.217*g(L,437.0,11.8,36.0)+0.681*g(L,459.0,26.0,13.8)
def planck(T): return 2*h*c**2/lam**5/(np.exp(h*c/(lam*kB*T))-1)
M=np.array([[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]])
def enc(u): return np.where(u<=0.0031308,12.92*u,1.055*np.power(np.maximum(u,0),1/2.4)-0.055)
Y2000=None
rows=[]
for TC in (525,600,700,800,900,1000,1085,1100,1200,1300,1400,1500,1650,1800,2000,2127,2200,2500,3100):
    T=TC+273.15; B=planck(T); X=np.trapezoid(B*xb,lam); Y=np.trapezoid(B*yb,lam); Z=np.trapezoid(B*zb,lam)
    rgb=M@np.array([X,Y,Z]); rgb=np.maximum(rgb,0); rgbn=rgb/rgb.max(); s=np.clip(enc(rgbn),0,1)
    rows.append((TC,T,Y,rgbn,s))
Yref=[r for r in rows if r[0]==2127][0][2]
gl=lambda T: max(0,(T-900)/1150)**3
for TC,T,Y,rgbn,s in rows:
    hx='#%02x%02x%02x'%tuple(int(round(v*255)) for v in s)
    print(f'{TC:5d}°C {T:6.0f}K  亮度比(相对2400K)={Y/Yref:9.2e}  烘焙器glowOf比={gl(T)/gl(2400.15):7.3f}  线性rgb={np.round(rgbn,3)}  sRGB={hx}')
