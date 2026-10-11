"""高低 / 大小随机前后对比：同一时刻，上排 = 节奏版原样，下排 = 加了高低 / 大小随机（本机同步 8，2026-10-11）。
用法  python3 -I analysis/scripts/编排高低对比图.py [D]
输出  协作/编排B01/高低对比_R?.png
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作/编排B01'


def load_b01():
    spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
    m = importlib.util.module_from_spec(spec)
    argv = sys.argv
    sys.argv = ['x']
    spec.loader.exec_module(m)
    sys.argv = argv
    return m


def main(r='D'):
    b = load_b01()
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'SimHei', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False

    class V:
        pass
    shows = []
    for vary in (False, True):
        S = b.Show(2)
        cues = json.loads((OUT / f'逻辑方案_R{r}{"V" if vary else ""}.json').read_text(encoding='utf-8'))['cues']
        S.cues = cues
        S.sections = json.loads((OUT / f'逻辑方案_R{r}.json').read_text(encoding='utf-8'))['sections']
        shows.append(S)
    gs = b._groups_for_vary(shows[1])
    hero = [g for g in gs if any(b.fam(c['sp']) == 'GK' for c in g['cues'])]
    rest = [g for g in gs if g not in hero and g['t'] > 10]
    pick = sorted(hero + [rest[int(i * (len(rest) - 1) / 2)] for i in range(3)], key=lambda g: g['t'])[:6]
    fig, axs = plt.subplots(2, len(pick), figsize=(5.2 * len(pick), 10.5))
    for j, g in enumerate(pick):
        t = round(g['t'] + 1.2, 1)
        name = next(x['name'] for x in shows[0].sections if x['id'] == g['sec']) + (' · 主角' if g in hero else '')
        b.snapshot(axs[0][j], shows[0], t, f'原样 {name}')
        b.snapshot(axs[1][j], shows[1], t, f'高低大小随机 {name}')
    plt.tight_layout()
    out = OUT / f'高低对比_R{r}.png'
    plt.savefig(out, dpi=90)
    print(out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'D')
