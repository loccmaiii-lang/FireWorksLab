"""B02 → 修订1 对比图（跨年秀 22，用户 10-12 23:13 的三张截图时刻 + 三主角之后 + 手游中低配有没有花）。
正面投影示意（和网页动画同一套几何），不是 UE 画面。
用法：python3 -I analysis/scripts/编排错层对比图.py [旧逻辑方案] [新逻辑方案] [输出.png]
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

old = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '协作/编排B01/逻辑方案_B02.json'
new = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / '协作/编排B01/逻辑方案_B02r1m.json'
out = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / '协作/编排B01/错层对比_B02_修订1.png'
MOMENTS = [(53.8, '图 1 · 往返扫射 0:53.8\n小银菊 P 排 + 小青柠 B 排'), (65.8, '图 2 · 第一次抬升 1:05.8\n多重菊城垛开在还亮的金锦菊上'),
           (104.8, '图 3 · 蓄势收窄 1:44.8\n大号金芒菊 P3 P4 P5'), (179.6, '三主角之后 2:59.6\n城垛大号压在主角上')]


def scene(ax, plan, t, title):
    ax.set_facecolor('#0b0d12')
    ax.axhline(150, color='#555', lw=.8, ls='--')
    for f in A.flowers(plan['cues']):
        if not (f['burst'] <= t < f['end']):
            continue
        age = (t - f['burst']) / max(.1, f['end'] - f['burst'])
        col = b.SPECIES[f['sp']][3]
        lit = f['lit0'] <= t < f['lit1']
        ax.add_patch(Circle((f['x'], f['z']), f['d'] / 2, facecolor=col, alpha=(.28 if lit else .08) * (1 - .5 * age), edgecolor=col, lw=1.6 if lit else .6))
    for g in ('P', 'B'):
        for i in range(9 if g == 'P' else 8):
            ax.plot(b.PT[f'{g}{i}']['x'], 150, '^' if g == 'P' else 'o', ms=3, color='#aaa')
    hits = [x for x in A.incidents(A.flowers(plan['cues'])) if x['t'] - .2 <= t <= x['until'] + .2]
    ax.set_xlim(-480, 480)
    ax.set_ylim(140, 640)
    ax.set_aspect('equal')
    ax.set_xticks([])
    ax.set_yticks([150, 300, 450, 600])
    ax.tick_params(colors='#888', labelsize=7)
    ax.set_title(title, fontsize=9, color='#ddd')
    ax.text(-470, 625, f"挤成一团 {len(hits)} 处" if hits else '没有挤成一团', fontsize=8, color='#f88' if hits else '#8d8', va='top')


def coverage(ax, plan, tier, label, y):
    fl = A.flowers(plan['cues'], tier, 'mobile')
    for f in fl:
        ax.plot([f['burst'], f['end']], [y, y], color='#7fb6ff', lw=6, solid_capstyle='butt', alpha=.35)
    for s, e in A.gaps(fl, t_to=211.0):
        ax.plot([s, e], [y, y], color='#ff7a6b', lw=6, solid_capstyle='butt')
    ax.text(-2, y, label, ha='right', va='center', fontsize=8, color='#ccc')


P0 = json.loads(old.read_text(encoding='utf-8'))
P1 = json.loads(new.read_text(encoding='utf-8'))
fig = plt.figure(figsize=(20, 9.6), facecolor='#0b0d12')
gs = fig.add_gridspec(3, 4, height_ratios=[1, 1, .62], hspace=.22, wspace=.06)
for j, (t, title) in enumerate(MOMENTS):
    scene(fig.add_subplot(gs[0, j]), P0, t, 'B02 · ' + title)
    scene(fig.add_subplot(gs[1, j]), P1, t, '修订1 · ' + title)
ax = fig.add_subplot(gs[2, :])
ax.set_facecolor('#0b0d12')
rows = [(P0, 'medium', 'B02 手游中配'), (P1, 'medium', '修订1 手游中配'), (P0, 'low', 'B02 手游低配'), (P1, 'low', '修订1 手游低配')]
for i, (pl, tier, lab) in enumerate(rows):
    coverage(ax, pl, tier, lab, -i)
for s in P1['sections']:
    ax.axvline(s['start'], color='#444', lw=.6)
    ax.text(s['start'] + .5, .6, s['name'], fontsize=7, color='#999')
ax.set_xlim(0, 215)
ax.set_ylim(-3.6, 1.0)
ax.set_yticks([])
ax.tick_params(colors='#888', labelsize=8)
ax.set_xlabel('演出秒（蓝 = 天上有手游花，红 = 断档 ≥ 4 s）', color='#aaa', fontsize=9)
for sp in ax.spines.values():
    sp.set_color('#333')
fig.suptitle('B02 → 修订1：错开高低、大号整排拆城垛、主角让位、手游替身（正面投影示意，不是 UE 画面）', color='#eee', fontsize=13)
fig.savefig(out, dpi=110, facecolor=fig.get_facecolor(), bbox_inches='tight')
print(out)
