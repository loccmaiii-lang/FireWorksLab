"""绘制已有诊断数据，并用工坊独立解析参考复核线性轨迹；不渲染烟花成品。"""
import importlib.util
import json
import math
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('D:/Blender/Firework_FX_Lab')
out = root / 'analysis/results/FC6O_Blender'
data = json.loads((out / '扰动与物理数值.json').read_text(encoding='utf-8'))
spec = importlib.util.spec_from_file_location('analytic_reference', source / 'tests/fixtures/analytic_reference.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
errors = []
for row in data['actualRecipes']['blender']['samples']:
    position, velocity = module.trajectory((0, 0, 0), (19.584*math.sin(math.radians(48)), 19.584*math.cos(math.radians(48)), 0), (0, -.7, 0), (0, 0, 0), .95, row['age'])
    errors += [abs(position[1]-row['y']), abs(velocity[1]-row['vy'])]
assert max(errors) < 1e-10
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
fig, axes = plt.subplots(1, 2, figsize=(12, 4.9), layout='constrained')
for name, title, colour, cutoff in [('blender', 'Blender：线性阻力', '#b7791f', 3.4), ('baker', '当前配方：平方阻力', '#237ba5', 2.3)]:
    rows = [r for r in data['actualRecipes'][name]['samples'] if r['age'] <= 5.5]
    for ax, key in zip(axes, ['y', 'vy']):
        ax.plot([0]+[r['age'] for r in rows], [0 if key=='y' else (19.584 if name=='blender' else 27)*math.cos(math.radians(48))]+[r[key] for r in rows], color=colour, ls='--', alpha=.6)
        solid = [r for r in rows if r['age'] <= cutoff]
        ax.plot([r['age'] for r in solid], [r[key] for r in solid], color=colour, lw=2.2, label=title)
        ax.axvline(cutoff, color=colour, alpha=.35, lw=1)
    axes[1].scatter([data['actualRecipes'][name]['apex']], [0], color=colour, zorder=5)
axes[0].set(ylabel='主星高度（米）', xlabel='从主星出生起的年龄（秒）', title='外围代表轨迹：竖直向外 48°')
axes[1].set(ylabel='竖直速度（米/秒），负值才是下落', xlabel='从主星出生起的年龄（秒）', title='同一代表轨迹：到顶时间 3.09 秒 / 4.94 秒')
for ax in axes:
    ax.axhline(0, color='#555555', lw=.8)
    ax.grid(alpha=.18)
    ax.legend(loc='upper right')
fig.suptitle('FanGold 外围缺少回落：阻力与燃烧时长错配', fontsize=16)
fig.supxlabel('物理诊断，不是成品回放。实线截止：Blender 寿命上限 3.4 秒；当前配方平均寿命 2.3 秒。\n虚线仅为延长寿命的轨迹外推；隔离风与扰动，初速分别 19.584 / 27 米每秒。', fontsize=10)
fig.savefig(out / '外围轨迹物理对照.png', dpi=150)
print(f'独立解析参考复核：最大误差 {max(errors):.3g}；图已保存。')
