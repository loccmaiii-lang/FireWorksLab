# T19 补测出图：星头高度-时间（两轮）+ 7.37 s 附近原始抓帧裁切（带米尺）。
# 用法：python t19_figure.py <measAB.json> <runA目录> <输出png>
import json, sys, os
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
font_manager.fontManager.addfont('C:/Windows/Fonts/msyh.ttc')
plt.rcParams['font.family'] = font_manager.FontProperties(fname='C:/Windows/Fonts/msyh.ttc').get_name()

meas, runA, out = sys.argv[1], sys.argv[2], sys.argv[3]
R = json.load(open(meas, encoding='utf-8'))
fig = plt.figure(figsize=(13, 6.2), dpi=110)
ax = fig.add_axes([0.06, 0.1, 0.56, 0.82])
col = {'Hero_HD': '#d97706', 'Hero_M': '#2563eb', 'L_HD': '#6b7280'}
name = {'Hero_HD': 'RiseTrail_Hero_HD（PC，2830）', 'Hero_M': 'RiseTrail_Hero_M（手游，2830）', 'L_HD': 'RiseTrail_L_HD（对照，2831）'}
for tag in ['Hero_HD', 'Hero_M', 'L_HD']:
    for k, r in enumerate(R):
        v = [(x['age'], x['top50']) for x in r['items'][tag]['rows'] if x['visible']]
        a = np.array(v)
        ax.plot(a[:, 0], a[:, 1], '-' if k == 0 else '--', color=col[tag], lw=1.6 if k == 0 else 1.0,
                label=name[tag] + ('' if k == 0 else '（第二轮）'))
ax.axhline(397.92, color='#dc2626', lw=1, ls=':')
ax.text(0.3, 398.9, 'B09 主角开花点 397.92 m', color='#dc2626', fontsize=9)
ax.axhline(330.18, color='#6b7280', lw=0.8, ls=':')
ax.text(0.3, 331.2, 'L 读数参考点 330.18 m @ 7.365 s', color='#6b7280', fontsize=9)
ax.axvline(7.37, color='#dc2626', lw=1, ls=':')
ax.text(7.45, 230, 'B09 开花时刻 7.37 s', color='#dc2626', fontsize=9, rotation=90)
ax.set_xlim(0, 11.5); ax.set_ylim(40, 420)
ax.set_xlabel('发射后时间 s（UE 编辑器世界时钟，粒子系统 10 FPS 定步长，±0.1 s）')
ax.set_ylabel('星头亮核上沿高度 m（相对发射点）')
ax.set_title('UE 实测：2830 主角尾缀星头到顶 ≈ 400.4 m @ 7.1 s（两轮一致）', fontsize=12)
ax.grid(alpha=0.3); ax.legend(fontsize=8, loc='lower right')
# 右：原始抓帧裁切（runA，age 7.316 s 那张），亮度×3 便于看
tr = json.load(open(os.path.join(runA, 'trace.json'), encoding='utf-8'))
sh = min(tr['shots'], key=lambda s: abs(s['age'] - 7.37))
img = np.asarray(Image.open(os.path.join(runA, sh['file'])).convert('RGB')).astype(np.float32)
cfg = tr['cfg']; H, s = cfg['h'], cfg['cmPerPx']; camZ = cfg['camera'][0][2]; bz = cfg['items'][0]['location'][2]
def row_of(hm):
    return int(round(H / 2 - ((hm * 100) - (camZ - bz)) / s - 0.5))
r0, r1 = row_of(420), row_of(300)
crop = np.clip(img[r0:r1, 200:1400] * 3, 0, 255).astype(np.uint8)
ax2 = fig.add_axes([0.66, 0.1, 0.32, 0.82])
ax2.imshow(crop, extent=[200, 1400, 300, 420], aspect='auto')
for hm in (330.18, 397.92, 400):
    ax2.axhline(hm, color='#ef4444' if hm != 330.18 else '#9ca3af', lw=0.7, ls=':')
ax2.set_yticks([300, 330, 360, 390, 400, 420]); ax2.set_xticks([320, 800, 1280]); ax2.set_xticklabels(['Hero_HD', 'Hero_M', 'L_HD'])
ax2.set_title('原始抓帧 %.3f s（侧视、水平机位，亮度×3）' % sh['age'], fontsize=10)
ax2.set_ylabel('高度 m')
fig.savefig(out, facecolor='white')
print(out, sh['file'], sh['age'])
