from pathlib import Path
import json, cv2, numpy as np
from PIL import Image,ImageDraw,ImageFont
from radiometry_analysis import LAB,ROOT,OUT,linear
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
def frame(cap,t):
 cap.set(cv2.CAP_PROP_POS_FRAMES,round(t*30));ok,a=cap.read();assert ok;return a
def bounds(a):
 g=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(float);hp=g-cv2.GaussianBlur(g,(0,0),5);y,x=np.nonzero((g>65)&(hp>14));return np.percentile(x,[.5,99.5])
def colour(a):
 rgb=cv2.cvtColor(a,cv2.COLOR_BGR2RGB).astype(float);v=rgb.max(2);hp=v-cv2.GaussianBlur(v,(0,0),3)
 good=(hp>12)&(v>=90)&(v<235)&(rgb[:,:,0]>rgb[:,:,2]*1.16)&(rgb[:,:,1]>rgb[:,:,2]*1.10)
 p=linear(rgb[good]);return {'count':len(p),'chroma':np.median(p/np.maximum(1e-8,p.max(1,keepdims=True)),axis=0).tolist() if len(p) else None}
def main():
 refs=json.loads((LAB/'studies/references.json').read_text('utf-8'));metrics={};alignment={}
 for id in ['V14','V13']:
  spec=json.loads((LAB/'studies/motion/analysis.json').read_text('utf-8'))[id];box=spec['crop'];refcap=cv2.VideoCapture(str(ROOT/refs[id]['path']));oldcap=cv2.VideoCapture(str(LAB/f'studies/filaments/{id}-fine-4k-playback.mp4'))
  conf=json.loads((OUT/f'{id}-config.json').read_text('utf-8'));view=conf['view'];cam=json.loads((LAB/f'studies/motion/{id}-camera.json').read_text('utf-8'));cx,cy=cam['center'];N=720
  def crop(a):return cv2.warpAffine(a,np.float32([[N/box[2],0,-box[0]*N/box[2]],[0,N/box[3],-box[1]*N/box[3]]]),(N,N),flags=cv2.INTER_AREA)
  anchor=spec['anchor_elapsed'];r=crop(frame(refcap,refs[id]['t0']+anchor));a=cv2.imread(str(OUT/f'{id}-v4-{anchor:g}.png'));a=cv2.resize(a,(N,N),interpolation=cv2.INTER_AREA)
  rb=bounds(r);ab=bounds(a);scale=(rb[1]-rb[0])/(ab[1]-ab[0]);origin=np.array([N/2,N*(.5+view[1]/(2*view[3]))]);dst=np.array([(cx-box[0])/box[2]*N,(cy-box[1])/box[3]*N]);shift=dst-scale*origin
  M=np.float32([[scale,0,shift[0]],[0,scale,shift[1]]]);alignment[id]={'scale':float(scale),'tx':float(shift[0]/N),'ty':float(shift[1]/N),'anchor':anchor,'rule':'one fixed similarity transform for the entire sequence; no per-frame reframing'}
  oldalign=json.loads((LAB/f'studies/filaments/{id}-comparison-metrics.json').read_text('utf-8'))['alignment']['fine-4k'];os=oldalign['scale'];ot=oldalign['translation'];OM=np.float32([[os,0,ot[0]],[0,os,ot[1]]])
  times=[.5,1.4,3.2,5.1,7,8.2,8.8,9.6] if id=='V14' else [.5,1.9,3.4,4.1,5.2,6.5,8,10]
  rows=[];sheet=Image.new('RGB',(1440,len(times)*515),(9,13,20));d=ImageDraw.Draw(sheet)
  for j,t in enumerate(times):
   ref=crop(frame(refcap,refs[id]['t0']+t));old=cv2.warpAffine(frame(oldcap,t),OM,(N,N));new=cv2.resize(cv2.imread(str(OUT/f'{id}-v4-{t:g}.png')),(N,N),interpolation=cv2.INTER_AREA);new=cv2.warpAffine(new,M,(N,N))
   row={'t':t,'reference':colour(ref),'v3':colour(old),'v4':colour(new)}
   for v in ['v3','v4']:
    p=row[v];q=row['reference'];row[v]['chroma_distance']=float(np.linalg.norm(np.array(p['chroma'])[1:]-np.array(q['chroma'])[1:])) if p['chroma'] and q['chroma'] and min(p['count'],q['count'])>=100 else None
   rows.append(row)
   trio=Image.new('RGB',(2160,775),(9,13,20));td=ImageDraw.Draw(trio)
   for k,(title,a) in enumerate([('原片',ref),('第三版',old),('第四版',new)]):
    im=Image.fromarray(cv2.cvtColor(a,cv2.COLOR_BGR2RGB));trio.paste(im,(k*N,45));td.text((k*N+15,10),f'{id} +{t:g} s · {title}',font=FONT,fill='white')
    sheet.paste(im.resize((480,480),Image.Resampling.LANCZOS),(k*480,j*515+35));d.text((k*480+10,j*515+7),f'+{t:g} s · {title}',font=FONT,fill='white')
   trio.save(OUT/f'{id}-comparison-{t:g}.jpg',quality=95)
  sheet.save(OUT/f'{id}-all-phases.jpg',quality=93);metrics[id]=rows
  refcap.release();oldcap.release()
 (OUT/'alignment.json').write_text(json.dumps(alignment,indent=2),'utf-8')
 (OUT/'colour-comparison.json').write_text(json.dumps({'note':'Euclidean distance of median non-saturated warm-pixel G/R,B/R in assumed linear sRGB. Same threshold at 720px after fixed alignment. Background and pixel selection differ; descriptive colour diagnostic, NOT a fidelity score. Reject count<100. No geometry or smoke score included.','samples':metrics},indent=2),'utf-8')
 for id,rows in metrics.items():print(id,[(r['t'],r['v3']['chroma_distance'],r['v4']['chroma_distance']) for r in rows])
if __name__=='__main__':main()
