"""原页与草稿的浏览器截图按原像素拼接，用于设计对照。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
source = Image.open(root / '00-原参数导航-1280.png').convert('RGB')
draft = Image.open(root / '01-左栏草稿-1280.png').convert('RGB')
assert source.size == draft.size == (1280, 720)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
full = Image.new('RGB', (2560, 752), '#111d21')
focus = Image.new('RGB', (864, 704), '#111d21')
for target, image, xy, title in [(full, source, (0, 32), '当前原生导航'), (full, draft, (1280, 32), '发射器左栏草稿'), (focus, source.crop((890, 48, 1280, 720)), (0, 32), '原参数区'), (focus, draft.crop((806, 48, 1280, 720)), (390, 32), '左栏＋原宽参数区')]:
    target.paste(image, xy)
    ImageDraw.Draw(target).text((xy[0] + 10, 4), title, fill='#e4edef', font=font)
full.save(root / '06-原页与草稿整页对照.png')
focus.save(root / '07-导航细节对照.png')
print('原像素对照已生成：2560×752、864×704')
