"""编排节奏统计：组与组之间隔多久、每秒多少球花、有没有留白（本机同步 8，2026-10-11，用户 23:07 要求记录）。

用法  python3 -I analysis/scripts/编排节奏统计.py 协作/编排B01/逻辑方案.json [更多逻辑方案 ...] [--md 输出.md]
「组」= 0.9 s 内先后开花的一组片段（含叠层二排、城垛 L + M、A / B 间隔排等同一波的各层），用这组第一发开花的时刻算间隔。
只看球花（扇形是托底、不单算组，但会算进「每秒扇数」）。倒计时 0–10 s 单列，不进间隔统计。
"""
import json
import statistics
import sys
from pathlib import Path

BAR0, BAR = 5.18, 1.6216
WIN = 0.9


def load(path):
    d = json.loads(Path(path).read_text(encoding='utf-8'))
    return d


def groups_of(cues):
    balls = sorted((c for c in cues if c['size'] != 'F'), key=lambda c: min(e['burst'] for e in c['events']))
    out = []
    for c in balls:
        t = min(e['burst'] for e in c['events'])
        if out and t - out[-1]['t'] <= WIN:
            out[-1]['cues'].append(c)
            out[-1]['n'] += len(c['events'])
        else:
            out.append(dict(t=t, cues=[c], n=len(c['events'])))
    return out


def stats(path):
    d = load(path)
    cues = d['cues']
    g = [x for x in groups_of(cues) if x['t'] >= 10.0]          # 倒计时之后
    ts = [x['t'] for x in g]
    iv = [b - a for a, b in zip(ts, ts[1:])]
    bursts = sorted(e['burst'] for c in cues if c['size'] != 'F' for e in c['events'] if e['burst'] >= 10.0)
    fans = [e['launch'] for c in cues if c['size'] == 'F' for e in c['events'] if e['launch'] >= 10.0]
    span = (bursts[-1] - bursts[0]) if bursts else 1.0
    ends = [(e['burst'], e['end']) for c in cues if c['size'] != 'F' for e in c['events']]
    t0, t1 = 10.0, max(e for _, e in ends)
    step, empty, alive = 0.1, 0, []
    k = 0
    while t0 + k * step < t1:
        t = t0 + k * step
        n = sum(1 for b, e in ends if b <= t < e)
        alive.append(n)
        empty += n == 0
        k += 1
    per_s = {}
    for b in bursts:
        per_s[int(b)] = per_s.get(int(b), 0) + 1
    busiest = max(per_s.values()) if per_s else 0
    on_bar = sum(1 for t in ts if abs(((t - BAR0) / BAR) - round((t - BAR0) / BAR)) < 0.06)
    buckets = {'< 1 s': 0, '1–2 s': 0, '2–3 s': 0, '3–5 s': 0, '5–8 s': 0, '≥ 8 s': 0}
    for x in iv:
        key = '< 1 s' if x < 1 else '1–2 s' if x < 2 else '2–3 s' if x < 3 else '3–5 s' if x < 5 else '5–8 s' if x < 8 else '≥ 8 s'
        buckets[key] += 1
    q = statistics.quantiles(iv, n=10) if len(iv) >= 10 else [min(iv or [0])] * 9
    return dict(file=str(path), revision=d.get('revision'), groups=len(g), ballBursts=len(bursts), fanLaunches=len(fans),
                intervalMeanS=round(statistics.mean(iv), 2) if iv else None, intervalMedianS=round(statistics.median(iv), 2) if iv else None,
                intervalP10S=round(q[0], 2), intervalP90S=round(q[-1], 2), intervalMaxS=round(max(iv), 2) if iv else None,
                intervalBuckets=buckets, groupsOnDownbeat=round(on_bar / max(1, len(ts)), 3),
                ballsPerSecond=round(len(bursts) / span, 2), ballsPerSecondBusiest=busiest, groupsPerMinute=round(len(g) / span * 60, 1),
                aliveMean=round(statistics.mean(alive), 1), noBallOnScreenShare=round(empty / max(1, len(alive)), 3),
                gapsOver3s=sum(1 for x in iv if x >= 3), gapsOver5s=sum(1 for x in iv if x >= 5))


def md(rows):
    head = ['', *[Path(r['file']).stem for r in rows]]
    lines = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    def row(label, f):
        lines.append('| ' + label + ' | ' + ' | '.join(f(r) for r in rows) + ' |')
    row('组数（10 s 后）', lambda r: str(r['groups']))
    row('组间隔 平均 / 中位', lambda r: f"{r['intervalMeanS']} / {r['intervalMedianS']} s")
    row('组间隔 P10 – P90 / 最长', lambda r: f"{r['intervalP10S']}–{r['intervalP90S']} / {r['intervalMaxS']} s")
    row('间隔分布 <1 / 1–2 / 2–3 / 3–5 / 5–8 / ≥8 s', lambda r: ' / '.join(str(v) for v in r['intervalBuckets'].values()))
    row('每分钟组数', lambda r: str(r['groupsPerMinute']))
    row('球花 次 / 秒（平均 / 最忙一秒）', lambda r: f"{r['ballsPerSecond']} / {r['ballsPerSecondBusiest']}")
    row('同屏球花平均', lambda r: str(r['aliveMean']))
    row('天上没有球花的时间占比', lambda r: f"{round(r['noBallOnScreenShare'] * 100, 1)}%")
    row('≥ 3 s / ≥ 5 s 的停顿', lambda r: f"{r['gapsOver3s']} / {r['gapsOver5s']}")
    row('组落在小节第一拍', lambda r: f"{round(r['groupsOnDownbeat'] * 100)}%")
    return '\n'.join(lines)


if __name__ == '__main__':
    args = sys.argv[1:]
    out = None
    if '--md' in args:
        i = args.index('--md')
        out = args[i + 1]
        args = args[:i] + args[i + 2:]
    rows = [stats(a) for a in args]
    print(json.dumps(rows, ensure_ascii=False, indent=1))
    if out:
        Path(out).write_text(md(rows) + '\n', encoding='utf-8')
        print(md(rows))
