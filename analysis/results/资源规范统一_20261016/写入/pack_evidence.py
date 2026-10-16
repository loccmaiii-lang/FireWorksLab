# 导出本轮截图对照：从已实播的原图生成JPG交付证据，图只缩放裁图、不调曝光、不混合帧。
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
H=Path(__file__).resolve().parent;T=Path('F:/FireWorksLab/analysis/local/RSU26_tmp')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
items=[('非方形：Rectangle，正常远段长尾',T/'D1/PSA_Rectangle_t03.5_front.png'),('只换为 FacingCameraPosition：远段压短',T/'D1/PSA_FacingCameraPosition_t03.5_front.png'),('爆裂星：修订固定盒+0.98，正面',T/'C/P_EFX_FireWorks_Crackle_HD_t03.5_front.png'),('金垂柳：仅材质0.98，系统锁定未改Bounds',T/'C/P_EFX_FireWorks_GoldKamuro_HD_t06.9_front.png'),('中尾缀：Rectangle保留，修订固定盒',T/'C/P_EFX_FireWorks_RiseTrail_M_HD_t03.5_front.png'),('低角度：整根升空柱（原图）',T/'C/P_EFX_FireWorks_RiseTrail_M_HD_t03.5_low.png')]
w=1500;tilew=750;tileh=460;out=Image.new('RGB',(w,tileh*3+125),'#edf0f4');d=ImageDraw.Draw(out)
d.text((20,15),'资源规范统一（26）· 第2步 UE 4.24 实播证据',font=font,fill='#18202b')
d.text((20,50),'方向对照仅临时改内存已还原；下方为三代表关键时刻，不等于整场或手机真机验收。',font=small,fill='#374151')
for i,(label,file) in enumerate(items):
 x=(i%2)*tilew;y=95+(i//2)*tileh
 d.text((x+15,y),label,font=small,fill='#18202b')
 im=Image.open(file).convert('RGB');im.thumbnail((tilew-20,tileh-55));out.paste(im,(x+(tilew-im.width)//2,y+35))
f=H.parent/'第2步UE证据.jpg';out.save(f,quality=94)
print(f)
