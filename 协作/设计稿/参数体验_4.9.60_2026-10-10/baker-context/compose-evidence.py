"""把真实浏览器截图按1:1并排；不生成或重绘页面内容。"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageChops

root = Path(__file__).resolve().parent
names = ['00-原参数栏-同对象1280.png', '01-连续索引-1280.png',
         '02-模块索引-1280.png', '03-任务分页-1280.png']
titles = ['当前烘焙器', '01 连续索引', '02 模块索引', '03 任务分页']
images = [Image.open(root / name).convert('RGB') for name in names]
assert all(image.size == (1280, 720) for image in images)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
full = Image.new('RGB', (2560, 1504), '#111d21')
focus = Image.new('RGB', (1560, 704), '#111d21')
for i, (image, title) in enumerate(zip(images, titles)):
    x, y = (i % 2) * 1280, (i // 2) * 752
    ImageDraw.Draw(full).text((x + 12, y + 4), title, fill='#e4edef', font=font)
    full.paste(image, (x, y + 32))
    ImageDraw.Draw(focus).text((i * 390 + 10, 4), title, fill='#e4edef', font=font)
    focus.paste(image.crop((890, 48, 1280, 720)), (i * 390, 32))
full.save(root / '08-原页与三版整页对照.png')
focus.save(root / '08b-同宽右栏细节对照.png')
before = Image.open(root / '04-真实预览-修改前.png').convert('RGB')
edited = Image.open(root / '05-真实预览-星数63.png').convert('RGB')
undone = Image.open(root / '05b-真实预览-撤销40.png').convert('RGB')
result = {'beforeVsEditedDifferent': ImageChops.difference(before, edited).getbbox() is not None,
          'beforeVsUndoneEqual': ImageChops.difference(before, undone).getbbox() is None,
          'region': [235, 239, 640, 273], 'scrubValue': 397,
          'screenshots': names, 'composition': '1:1，无二次缩放'}
(root / 'preview-evidence.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
