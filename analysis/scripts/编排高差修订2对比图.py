"""B02 修订1 → 修订2 对比图（本机同步 8，用户 10-13 10:10：「会和坝体穿插，我同意在高一些的地方起飞」）。
上排修订1（高差 −60…+25 m，往下的尾缀出生点在坝顶下面）、下排修订2（只往上）；每朵花画到它尾缀出生点的竖线：
红色 = 尾缀从坝顶下面起飞（会穿进坝体），绿色 = 坝顶或坝顶上方起飞。正面投影示意，不是 UE 画面。
用法：python3 -I analysis/scripts/编排高差修订2对比图.py [旧逻辑方案] [新逻辑方案] [输出.png]
"""
import importlib.util
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('audit', ROOT / 'analysis/scripts/编排重叠体检.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
b = A.b
plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

old = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '协作/编排B01/逻辑方案_B02r1.json'
new = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / '协作/编排B01/逻辑方案_B02r2_up70.json'
out = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / '协作/编排B01/高差对比_B02_修订1vs修订2.png'
MOMENTS = [(53.8, '往返扫射 0:53.8'), (65.8, '第一次抬升 1:05.8'), (104.8, '蓄势收窄 1:44.8'), (179.6, '三主角之后 2:59.6')]
DAM = 150.0          # 正面投影里坝顶的高度（和网页动画、重叠体检同一套几何）


def scene(ax, plan, t, title):
    ax.set_facecolor('#0b0d12')
    ax.axhspan(100, DAM, color='#2a2f38')
    ax.axhline(DAM, color='#888', lw=.8, ls='--')
    cues = {c['id']: c for c in plan['cues']}
    below = 0
    for f in A.flowers(plan['cues']):
        if not (f['burst'] - 3.0 <= t < f['end']):
            continue
        dz = f['z'] - (b.PT[f['point']]['z'] + b.bloom_h(cues[f['cue']]))
        start = DAM + dz
        if f['burst'] <= t:
            age = (t - f['burst']) / max(.1, f['end'] - f['burst'])
            col = b.SPECIES[f['sp']][3]
            lit = f['lit0'] <= t < f['lit1']
            ax.add_patch(Circle((f['x'], f['z']), f['d'] / 2, facecolor=col, alpha=(.25 if lit else .07) * (1 - .5 * age), edgecolor=col, lw=1.4 if lit else .5))
        ax.plot([f['x'], f['x']], [start, f['z'] - f['d'] / 2 if f['burst'] <= t else f['z']], color='#ff6b5b' if dz < -0.5 else '#7be0a0', lw=.9, alpha=.8)
        ax.plot(f['x'], start, 'o', ms=3, color='#ff6b5b' if dz < -0.5 else '#7be0a0')
        below += dz < -0.5
    ax.set_xlim(-480, 480)
    ax.set_ylim(80, 660)
    ax.set_aspect('equal')
    ax.set_xticks([])
    ax.set_yticks([DAM, 300, 450, 600])
    ax.tick_params(colors='#888', labelsize=7)
    ax.set_title(title, fontsize=9, color='#ddd')
    ax.text(-470, 650, f'尾缀从坝顶下面起飞 {below} 根' if below else '尾缀都从坝顶或上方起飞', fontsize=8, color='#ff8a7a' if below else '#8d8', va='top')


def hist(ax, plan, label, color):
    for k, off in zip('SML', (-0.27, 0, 0.27)):
        v = [e['dz'] for c in plan['cues'] if c['size'] == k and c.get('mobile') != 'only' for e in c['events']]
        ax.boxplot([v], positions=[{'S': 0, 'M': 1, 'L': 2}[k] + (0.18 if color == '#7be0a0' else -0.18)], widths=.3, patch_artist=True,
                   boxprops=dict(facecolor=color, alpha=.35, color=color), medianprops=dict(color='#fff'), whiskerprops=dict(color=color), capprops=dict(color=color), flierprops=dict(markeredgecolor=color, ms=2))
    ax.plot([], [], color=color, lw=6, alpha=.5, label=label)


P0 = json.loads(old.read_text(encoding='utf-8'))
P1 = json.loads(new.read_text(encoding='utf-8'))
fig = plt.figure(figsize=(20, 10), facecolor='#0b0d12')
gs = fig.add_gridspec(3, 4, height_ratios=[1, 1, .7], hspace=.24, wspace=.06)
for j, (t, title) in enumerate(MOMENTS):
    scene(fig.add_subplot(gs[0, j]), P0, t, '修订1（高差 −60…+25）· ' + title)
    scene(fig.add_subplot(gs[1, j]), P1, t, '修订2（只往上）· ' + title)
ax = fig.add_subplot(gs[2, 1:3])
ax.set_facecolor('#0b0d12')
hist(ax, P0, '修订1', '#ff6b5b')
hist(ax, P1, '修订2', '#7be0a0')
ax.axhline(0, color='#888', lw=.8, ls='--')
ax.set_xticks([0, 1, 2], ['小号（尾缀 150 m）', '中号（210 m）', '大号（330 m）'], color='#ccc', fontsize=9)
ax.set_ylabel('高差 dz（m，0 = 坝顶起飞）', color='#aaa', fontsize=9)
ax.tick_params(colors='#888', labelsize=8)
ax.legend(facecolor='#0b0d12', labelcolor='#ddd', fontsize=8, loc='upper left')
for sp in ax.spines.values():
    sp.set_color('#333')
fig.suptitle('B02 修订1 → 修订2：高差只许往上，尾缀不进坝体（小号 0…+32 m、中号 0…+45、大号 0…+70；灰 = 坝体，竖线 = 尾缀从哪起飞）', color='#eee', fontsize=13)
fig.savefig(out, dpi=105, facecolor=fig.get_facecolor(), bbox_inches='tight')
print(out)
