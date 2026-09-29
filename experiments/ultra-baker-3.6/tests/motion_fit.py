from pathlib import Path
import json, numpy as np, cv2
from PIL import Image,ImageDraw
from motion_analysis import LAB,ROOT,OUT,REFS,crop,FONT

rows=json.loads((OUT/'V14-per-frame.json').read_text())
r=[x for x in rows if .35<x['elapsed']<6.8 and x['frame']%6==0]
t=np.array([x['elapsed'] for x in r]);radius=np.array([(x['bounds_99'][1][0]-x['bounds_99'][0][0])/2 for x in r])
def pred(p):
    v,c,lag=p
    return np.log1p(c*v*np.maximum(0,t-lag))/c
p=np.array([240.,.008,0.])
for _ in range(30):
    residual=pred(p)-radius
    eps=[.01,1e-7,1e-5]
    jac=np.stack([(pred(p+np.eye(3)[i]*eps[i])-pred(p))/eps[i] for i in range(3)],axis=1)
    dp=np.linalg.lstsq(jac,-residual,rcond=None)[0]
    for alpha in [1,.5,.25,.1,.01]:
        q=p+dp*alpha
        if q[0]>0 and q[1]>0 and np.mean((pred(q)-radius)**2)<np.mean(residual**2):p=q;break
report={'model':'r=log(1+c*v*(t-lag))/c; image-space horizontal envelope, not physical measurement','v_pixels_per_second':p[0],'c_per_pixel':p[1],'lag_seconds':p[2],'mean_absolute_error_pixels':np.mean(abs(pred(p)-radius)),'samples':[{'t':x,'measured':y,'fitted':z} for x,y,z in zip(t,radius,pred(p))]}
(OUT/'V14-radius-fit.json').write_text(json.dumps(report,indent=2),'utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='samples'}))
for id in ['V14','V13']:
    ref=REFS[id];cap=cv2.VideoCapture(str(ROOT/ref['path']))
    sheet=Image.new('RGB',(8*170,2*205),(12,16,23));d=ImageDraw.Draw(sheet)
    for j in range(16):
        ix=round(ref['t0']*30)-2+j;cap.set(cv2.CAP_PROP_POS_FRAMES,ix);ok,f=cap.read()
        if not ok:continue
        box=(275,225,170,170) if id=='V14' else (275,245,170,170)
        im=Image.fromarray(cv2.cvtColor(crop(f,box,170),cv2.COLOR_BGR2RGB));x=j%8*170;y=j//8*205
        sheet.paste(im,(x,y+32));d.text((x+4,y+4),f'f{ix} {ix/30:.3f}s',font=FONT,fill='white')
    cap.release();sheet.save(OUT/f'{id}-onset-frames.jpg',quality=95)
