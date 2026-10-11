# -*- coding: utf-8 -*-
"""帧号点数统计：扫描导出素材包（fwl.cascade/1）里每个序列发射器的帧号曲线（DynamicParameter.frame）。

只读，不改任何素材包。按引擎口径（30 fps 按 tick 取帧、取整、不混合，spec/cascade_params_v1.md）逐 tick 求帧号：
  - 点数：帧号曲线关键点个数（用户 10-05 19:31：没变化 2 个点，有变化只加变化的点）；
  - 停留节奏：每帧停几个 tick 的序列；「来回切」= 停留时长忽长忽短的次数（1-2-1-2 / 2-3-2-3 这种），是卡顿的直接原因；
  - 跳帧 / 回跳 / 起点误差：导出曲线经 4 位小数舍入后，引擎里有没有漏掉的帧、倒退的帧；
  - Size By Life 点数（Zoom 阶梯）、其它曲线点数。
用法：python analysis/scripts/帧号点数统计.py [根目录 ...] [--json 输出.json] [--csv 输出.csv]
默认扫 D:/ProjectTextures/FireWorksLab（交付根目录）和 analysis/local/输出/素材包。
"""
import json, math, os, re, sys, csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIRS = [Path('D:/ProjectTextures/FireWorksLab'), ROOT / 'analysis/local/输出/素材包', ROOT / 'spec/UE实测包']


def ev(keys, u):
    if u <= keys[0][0]:
        return keys[0][1]
    for i in range(1, len(keys)):
        if u <= keys[i][0]:
            u0, v0 = keys[i - 1]; u1, v1 = keys[i]
            return v0 + (v1 - v0) * (u - u0) / ((u1 - u0) or 1)
    return keys[-1][1]


def const_or(d, default=None):
    if not isinstance(d, dict):
        return default
    if 'const' in d:
        v = d['const']
        return v[0] if isinstance(v, list) else v
    if 'uniform' in d:
        a, b = d['uniform']
        return (a if not isinstance(a, list) else a[0])
    return default


def cadence(keys, life):
    """引擎逐 tick 回放：返回 (帧序列, 停留表, 统计)。life = 粒子寿命（秒）。"""
    N = max(1, round(life * 30))
    shown = []
    for k in range(N):
        u = (k / 30.0) / life
        shown.append(math.floor(ev(keys, u)))
    # 每帧停几个 tick（按显示顺序）
    runs = []
    for f in shown:
        if runs and runs[-1][0] == f:
            runs[-1][1] += 1
        else:
            runs.append([f, 1])
    F_expect = math.floor(keys[-1][1]) + 1 if keys[-1][1] > keys[0][1] else 1
    seen = {f for f, _ in runs}
    back = sum(1 for i in range(1, len(runs)) if runs[i][0] < runs[i - 1][0])
    skips = sum(max(0, runs[i][0] - runs[i - 1][0] - 1) for i in range(1, len(runs)))
    holds = [h for _, h in runs]
    # 只看中间段（去掉最后一帧：最后一帧停到寿命结束，长短不算节奏）
    hs = holds[:-1] if len(holds) > 2 else holds
    flips = 0  # 停留时长方向反转次数：升了又降、降了又升（1-2-1、2-3-2）
    d_prev = 0
    for i in range(1, len(hs)):
        d = (hs[i] > hs[i - 1]) - (hs[i] < hs[i - 1])
        if d and d_prev and d != d_prev:
            flips += 1
        if d:
            d_prev = d
    changes = sum(1 for i in range(1, len(hs)) if hs[i] != hs[i - 1])
    hist = {}
    for h in hs:
        hist[h] = hist.get(h, 0) + 1
    return {
        'ticks': N, 'frames_seen': len(seen), 'frames_expect': F_expect, 'skips': skips, 'back': back,
        'hold_changes': changes, 'hold_flips': flips, 'hold_hist': dict(sorted(hist.items())),
        'hold_seq': ''.join(str(min(h, 9)) for h in holds),
        'min_fps': round(30 / max(hs), 2) if hs else 30,
    }


def scan_file(p):
    try:
        d = json.loads(Path(p).read_text(encoding='utf-8'))
    except Exception as e:
        return [{'file': str(p), 'error': str(e)}]
    if d.get('format') != 'fwl.cascade/1':
        return []
    tool = (d.get('source') or {}).get('tool', '')
    m = re.search(r'(\d+\.\d+(?:\.\d+)?)', tool)
    ver = m.group(1) if m else ''
    rows = []
    for e in d.get('emitters', []):
        mods = e.get('modules', [])
        life = None; frame = None; size_n = 0; other = 0; other_max = 0
        for mo in mods:
            n = mo.get('m')
            if n == 'Lifetime':
                life = const_or(mo.get('Lifetime'))
            elif n == 'DynamicParameter':
                fr = (mo.get('params') or {}).get('frame')
                if isinstance(fr, dict) and 'curve' in fr:
                    frame = fr['curve']
            for k, v in mo.items():
                if isinstance(v, dict) and 'curve' in v and not (n == 'DynamicParameter'):
                    c = len(v['curve'])
                    if n == 'SizeByLife':
                        size_n = max(size_n, c)
                    else:
                        other += c; other_max = max(other_max, c)
        req = e.get('required') or {}
        if life is None:
            life = req.get('duration_s')
        row = {'file': str(p), 'pkg': Path(p).parent.name, 'platform': d.get('platform', ''), 'ver': ver,
               'emitter': e.get('name', ''), 'gpu': bool(e.get('gpu')), 'life': life,
               'frame_pts': len(frame) if frame else 0, 'size_pts': size_n, 'other_curve_pts': other, 'other_curve_max': other_max}
        if frame and life:
            row.update(cadence(frame, float(life)))
        rows.append(row)
    return rows


def main(argv):
    dirs = [Path(a) for a in argv if not a.startswith('--') and not a.endswith(('.json', '.csv'))] or DEFAULT_DIRS
    out_json = next((argv[i + 1] for i, a in enumerate(argv) if a == '--json' and i + 1 < len(argv)), None)
    out_csv = next((argv[i + 1] for i, a in enumerate(argv) if a == '--csv' and i + 1 < len(argv)), None)
    rows = []
    for base in dirs:
        if not base.exists():
            continue
        for p in base.rglob('cascade*.json'):
            rows.extend(scan_file(p))
    seq = [r for r in rows if r.get('frame_pts')]
    print(f'扫描 {len(rows)} 个发射器，其中带帧号曲线的序列发射器 {len(seq)} 个')
    if out_json:
        Path(out_json).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    if out_csv:
        keys = ['pkg', 'platform', 'ver', 'emitter', 'life', 'ticks', 'frame_pts', 'frames_expect', 'frames_seen', 'skips', 'back',
                'hold_changes', 'hold_flips', 'min_fps', 'hold_hist', 'size_pts', 'hold_seq', 'file']
        with open(out_csv, 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore'); w.writeheader()
            for r in seq:
                w.writerow(r)
    return rows


if __name__ == '__main__':
    main(sys.argv[1:])
