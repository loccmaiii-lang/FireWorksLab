# 序列图封顶（对话框21，2026-10-07）：RGBA 四个通道都 min(值, 253)，配合 256 宽护栏 Ramp（第 255 格黑）。
# 材质按 Wrap 读 Ramp 时，254 / 255 会混到黑格（星芯出黑点），所以先压到 253；最亮 0.05% 的像素暗不到 1%，看不出。
# 跑法：python3 -I 序列封顶.py <输入.png> <输出.png>
import sys, numpy as np
from PIL import Image
im = Image.open(sys.argv[1]); assert im.mode in ('RGBA', 'RGB', 'L'), im.mode
a = np.asarray(im).copy(); n = int((a > 253).sum()); a[a > 253] = 253
Image.fromarray(a, im.mode).save(sys.argv[2]); print(sys.argv[2], im.size, im.mode, '压了', n, '个通道值')
