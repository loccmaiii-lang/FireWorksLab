from pathlib import Path
import json, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parents[1]/'studies'
OUT.mkdir(exist_ok=True)
videos=json.loads((ROOT/'analysis/视频编号.json').read_text('utf-8-sig'))
refs={
 'V14':{'path':'vidio/'+videos['V14'],'t0':4.2,'times':[4.33,5.56,7.4,9.24,11.1,12.96]},
 'V13':{'path':'vidio/'+videos['V13'],'t0':5.7,'times':[5.32,7.6,9.12,10.64,12.16,15.2]},
 'JM':{'path':'vidio/2.0/金芒菊A.mp4','t0':.867,'times':[1.1,1.65,2.4,3.2,4,4.8]}}
for key,r in refs.items():
 cap=cv2.VideoCapture(str(ROOT/r['path']))
 r['width']=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH));r['height']=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
 r['fps']=cap.get(cv2.CAP_PROP_FPS);r['duration']=cap.get(cv2.CAP_PROP_FRAME_COUNT)/r['fps']
 canvas=Image.new('RGB',(6*360,660),(10,13,18));draw=ImageDraw.Draw(canvas)
 for j,t in enumerate(r['times']):
  cap.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,f=cap.read()
  if not ok:continue
  im=Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));im.save(OUT/f'{key}-ref-{j}.png')
  im.thumbnail((360,620));canvas.paste(im,(360*j,32));draw.text((360*j+8,8),f'{key} video {t:.2f}s',fill='white')
 canvas.save(OUT/f'{key}-source-sheet.jpg',quality=95);cap.release()
(OUT/'references.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(refs,ensure_ascii=False,indent=2))
