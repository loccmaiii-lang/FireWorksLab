from pathlib import Path
import json,cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
LAB=Path(__file__).resolve().parents[1];OUT=LAB/'studies/filaments'
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
f=cv2.imread(str(OUT/'V14-source-3.2.png'))
# Manually selected visible ridge; endpoints are explicitly exposed for review.
# The inner end is a conservative visible cutoff, not a known ignition point.
path=np.array([[418,31],[405,78],[395,122],[382,184],[374,236]],float)
length=np.linalg.norm(np.diff(path,axis=0),axis=1)
gray=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(float)
hp=gray-cv2.GaussianBlur(gray,(0,0),5)
mask=(gray>65)&(hp>14);mask[700:]=False
ys,xs=np.nonzero(mask);radius=float(np.diff(np.percentile(xs,[.5,99.5]))[0]/2)
report={'source':'V14-source-3.2.png','videoTime':7.4,'elapsed':3.2,'manualRidge':path.tolist(),'whiteEnd':path[1].tolist(),'brightLengthPx':float(length[0]),'visibleLengthPx':float(length.sum()),'flowerHorizontalRadiusPx':radius,'lengthOverRadius':float(length.sum()/radius),'method':'One manually selected ridge, native source pixels. White-to-warm boundary and faint endpoint are visual estimates, roughly ±8 px. Occlusion prevents following this ridge to its physical end. Not a population statistic or physical burn-time measurement.'}
(OUT/'source-line-measurement.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
sheet=Image.new('RGB',(1420,900),'#0a0e15');d=ImageDraw.Draw(sheet)
d.text((28,20),'鸿巢 +3.2 秒：白亮段 ≠ 完整可见尾迹',font=font(30),fill='#f4d299')
source=Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB))
sheet.paste(source.crop((270,15,490,285)).resize((572,702)),(25,83))
origin=np.array([270,15]);scale=2.6;offset=np.array([25,83])
p=(path-origin)*scale+offset
# Offset the annotation to keep the actual source filament visible.
annot=p+np.array([12,0]);d.line([tuple(v) for v in annot[:2]],fill='#64e2ff',width=3);d.line([tuple(v) for v in annot[1:]],fill='#f8bd66',width=3)
for point in annot:d.ellipse((point[0]-4,point[1]-4,point[0]+4,point[1]+4),fill='#ffffff')
lines=[('选取一根可辨认亮线，标线放在旁边，不盖住原线。','#d8e0ec'),(f'白亮段约 {length[0]:.0f} px；可见全长至少约 {length.sum():.0f} px。','#64e2ff'),(f'花体水平半径约 {radius:.0f} px；全长 / 半径约 {length.sum()/radius:.2f}。','#f8bd66'),('这是一个样本，不代表每根尾迹都一样长。','#b3bdca'),('边界约有 ±8 px 人工判断误差；更暗处被重叠遮住。','#b3bdca'),('上一版缺少的主要是白亮段之后的长细尾。','#ffffff'),('因此只把亮点加粗、增亮、增多，仍然不对。','#ffffff')]
for i,(s,col) in enumerate(lines):d.text((625,95+i*66),s,font=font(22),fill=col)
d.text((625,620),'实现改动',font=font(28),fill='#f4d299')
for i,s in enumerate(['连续历史曲线 → 白亮段与暖色余辉分层','每根线有稳定的长短、粗细变化','原图没有锐化或 AI 补细节；左图仅放大']):d.text((625,675+i*44),s,font=font(23),fill='#d8e0ec')
d.text((25,840),'坐标与测量方法：source-line-measurement.json。该例用于解释结构，不是还原度评分。',font=font(22),fill='#9aa9be')
sheet.save(OUT/'线条拆解.png')
print(json.dumps(report,ensure_ascii=False))
