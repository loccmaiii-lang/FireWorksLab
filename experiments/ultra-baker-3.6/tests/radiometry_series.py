"""Every source frame, same documented colour mask as the diagnostic samples."""
import json,cv2,numpy as np
from radiometry_analysis import LAB,ROOT,OUT,linear
from PIL import Image,ImageDraw,ImageFont
def main():
 refs=json.loads((LAB/'studies/references.json').read_text('utf-8'));font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
 for id in ['V14','V13']:
  ref=refs[id];cap=cv2.VideoCapture(str(ROOT/ref['path']));rows=[];i=0;y,x=np.mgrid[:1280,:720];cx,cy=(363,328) if id=='V14' else (362,378);rr=np.hypot(x-cx,y-cy)
  while True:
   ok,bgr=cap.read()
   if not ok:break
   t=i/30-ref['t0'];i+=1
   rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB).astype(np.float32);v=rgb.max(2);hp=v-cv2.GaussianBlur(v,(0,0),3)
   roi=(x>15)&(x<705)&(y>15)&(y<(735 if id=='V14' else 830))
   if id=='V13' and t<3.3:roi&=rr<max(10,min(135,30+60*t))
   active=roi&(hp>12)&(v>65);good=active&(v>=90)&(v<235);warm=good&(rgb[:,:,0]>rgb[:,:,2]*1.16)&(rgb[:,:,1]>rgb[:,:,2]*1.10)
   lin=linear(rgb[warm]);chroma=np.median(lin/np.maximum(1e-8,lin.max(1,keepdims=True)),axis=0).tolist() if len(lin)>=100 else None
   rows.append({'frame':i-1,'t':round(t,6),'active':int(active.sum()),'clippedFraction':float(((v>=250)&active).sum()/max(1,active.sum())),'warmPixels':len(lin),'warmLinearChroma':chroma})
  cap.release();(OUT/f'{id}-all-source-frames.json').write_text(json.dumps({'frames':len(rows),'fps':30,'note':'All decoded original frames, including ascent. Fixed regions and local contrast mask; not spectral thermometry. Missing chroma means <100 usable warm pixels.','rows':rows},separators=(',',':')),'utf-8')
  # A direct colour/time strip: no regression or inferred chemical events.
  im=Image.new('RGB',(1400,360),(12,16,24));d=ImageDraw.Draw(im);valid=[r for r in rows if r['t']>=0];duration=valid[-1]['t']
  d.text((25,15),f'{id} · 原片逐帧色度与饱和比例（{len(rows)} 帧）',font=font,fill='white')
  for j,row in enumerate(valid):
   xx=round(150+1200*j/max(1,len(valid)-1));col=row['warmLinearChroma']
   if col is not None:
    c=np.array(col)*.6;c=np.where(c<=.0031308,12.92*c,1.055*c**(1/2.4)-.055);d.line((xx,65,xx,135),fill=tuple((np.clip(c,0,1)*255).astype(int)),width=4)
   d.line((xx,280,xx,280-row['clippedFraction']*110),fill='#efad7a',width=3)
  d.text((20,80),'非饱和暖色',font=font,fill='#bcc9dc');d.text((20,183),'饱和比例',font=font,fill='#bcc9dc');d.text((40,213),'0–100%',font=font,fill='#bcc9dc')
  for t in range(int(duration)+1):
   xx=150+1200*t/duration;d.text((xx-7,300),str(t)+'s',font=font,fill='#b2c0d4')
  d.text((150,335),'黑色空档：有效样本不足；不能把高亮发白解释为已识别的金属或温度。',font=font,fill='#92a3ba');im.save(OUT/f'{id}-colour-timeline.png')
  print(id,'decoded',i,flush=True)
if __name__=='__main__':main()
