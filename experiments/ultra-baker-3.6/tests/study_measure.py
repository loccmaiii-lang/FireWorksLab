from study_reference import ROOT,OUT
import cv2, numpy as np, json
from PIL import Image, ImageDraw
refs=json.loads((OUT/'references.json').read_text('utf-8'))
settings={'V14':((360,317),(0,0,720,740),(3.8,4.6)), 'V13':((351,363),(0,40,720,820),(5.2,6.8))}
for key,(center,roi,window) in settings.items():
 r=refs[key];cap=cv2.VideoCapture(str(ROOT/r['path']));rows=[];imgs=[]
 for i in range(int(r['duration']*r['fps'])):
  ok,f=cap.read()
  if not ok:break
  t=i/r['fps'];g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(float)
  contrast=g-cv2.GaussianBlur(g,(0,0),5)
  yy,xx=np.where((contrast>18)&(g>65));dx=xx-center[0];dy=yy-center[1];rr=np.hypot(dx,dy)
  good=(xx>=roi[0])&(xx<roi[2])&(yy>=roi[1])&(yy<roi[3])&(rr>12)
  # Upper semicircle measures expansion separately from gravitational droop.
  up=good&(dy<0);rad=float(np.percentile(rr[up],95)) if up.sum()>15 else 0
  rows.append({'t':round(t,4),'radiusUpper95':round(rad,2),'brightPixels':int(good.sum())})
  if window[0]<=t<=window[1] and i%6==0:
   crop=f[max(0,center[1]-150):center[1]+150,center[0]-150:center[0]+150]
   imgs.append((t,Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB))))
 sheet=Image.new('RGB',(300*len(imgs),330));d=ImageDraw.Draw(sheet)
 for j,(t,im) in enumerate(imgs):sheet.paste(im,(j*300,30));d.text((j*300+5,5),f'{key} {t:.2f}s',fill='white')
 sheet.save(OUT/f'{key}-onset.jpg',quality=95)
 (OUT/f'{key}-measure.json').write_text(json.dumps({'method':'Upper-half 95th-percentile local-contrast pixels; fixed screen center; no camera correction; source-pixel units','center':center,'roi':roi,'rows':rows},indent=2),'utf-8')
 print(key,[(x['t'],x['radiusUpper95'],x['brightPixels']) for x in rows if window[0]<=x['t']<=window[1] and round(x['t']*30)%3==0])
 cap.release()
