"""B01 各节奏版对比图：每一行一个版本，竖线 = 一组开花（颜色 = 组里最大的花），浅色面积 = 同屏球花数（本机同步 8，2026-10-11）。
用法  python3 -I analysis/scripts/编排节奏对比图.py
输出  协作/编排B01/节奏对比.png
"""
import json
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作/编排B01'
spec = importlib.util.spec_from_file_location('st', ROOT / 'analysis/scripts/编排节奏统计.py')
st = importlib.util.module_from_spec(spec)
spec.loader.exec_module(st)
ROWS = [('逻辑方案.json', '现在 D2：每小节一组'), ('逻辑方案_RA.json', 'A 每 2 小节一组'), ('逻辑方案_RC.json', 'C 两放两歇'),
        ('逻辑方案_RD.json', 'D 段落强弱'), ('逻辑方案_RB.json', 'B 乐句起点每 4 小节')]
COL = {'L': '#e0604a', 'M': '#f0b429', 'S': '#7fa7e8'}


def main():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'SimHei', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    fig, axes = plt.subplots(len(ROWS), 1, figsize=(18, 2.1 * len(ROWS)), sharex=True)
    for ax, (f, label) in zip(axes, ROWS):
        d = json.loads((OUT / f).read_text(encoding='utf-8'))
        r = st.stats(OUT / f)
        ends = [(e['burst'], e['end']) for c in d['cues'] if c['size'] != 'F' for e in c['events']]
        ts = [i * 0.25 for i in range(0, 880)]
        alive = [sum(1 for b, e in ends if b <= t < e) for t in ts]
        ax.fill_between(ts, alive, color='#c9d3e6', step='mid')
        top = max(alive) or 1
        for g in st.groups_of(d['cues']):
            size = 'L' if any(c['size'] == 'L' for c in g['cues']) else 'M' if any(c['size'] == 'M' for c in g['cues']) else 'S'
            ax.vlines(g['t'], 0, top, color=COL[size], lw=1.4)
        for s in d['sections']:
            ax.axvline(s['start'], color='#999', lw=0.6, ls=':')
        ax.set_ylim(0, top * 1.05)
        ax.set_ylabel('同屏球花')
        ax.set_title(f"{label}：{r['groups']} 组，组间隔中位 {r['intervalMedianS']} s，球花 {r['ballsPerSecond']} 次/秒，"
                     f"天上没有球花 {round(r['noBallOnScreenShare'] * 100, 1)}% 的时间，≥ 3 s 停顿 {r['gapsOver3s']} 次", loc='left', fontsize=10)
    axes[-1].set_xlabel('演出秒（音乐 + 5）；竖线 = 一组开花（红 = 有大花、黄 = 中花、蓝 = 只有小花）；点线 = 段落')
    axes[-1].set_xlim(0, 220)
    plt.tight_layout()
    plt.savefig(OUT / '节奏对比.png', dpi=100)
    print(OUT / '节奏对比.png')


if __name__ == '__main__':
    main()
