"""整理实际包关键帧和独立分层观察，不改变图像内容。"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
R=Path(__file__).resolve().parents[2];p=R/'analysis/results/SparkGraph'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
for key in ['rocket','sparkler']:
 o=Image.new('RGB',(1280,1440),(12,16,22));d=ImageDraw.Draw(o)
 for n,plat in enumerate(['PC','Mobile']):
  for j,f in enumerate([3,7,12,20,27,39,47,57]):
   i=n*8+j;x=i%4*320;y=i//4*360
   im=Image.open(p/(key+'-'+plat+f'-frame{f:02}.png'))
   w=round(320*(14/20 if key=='rocket' else 1));im=im.resize((w,320))
   o.paste(im,(x+(320-w)//2,y+36));d.text((x+8,y+6),f'{plat} · {f/30:.2f}s · 帧{f}',font=font,fill='white')
 o.save(p/(key+'-实包关键帧.jpg'))
a=json.loads((p/'形态对照.json').read_text(encoding='utf-8'));o=Image.new('RGB',(1200,1400),(12,16,22));d=ImageDraw.Draw(o)
for i,x in enumerate(a):
 o.paste(Image.open(p/('形态-'+x['id']+'.png')).resize((300,300)),(i%4*300,i//4*350+40));d.text((i%4*300+8,i//4*350+8),x['name'],font=font,fill='white')
o.save(p/'13层形态对照.jpg')
