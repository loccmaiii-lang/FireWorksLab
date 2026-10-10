#!/usr/bin/env python3
"""编排体检（对话框22，10-10）：读一份三表 JSON（高 / 中 / 低任一档），展开成逐发开花，
按「整场看得出来的东西」量化：尺寸份额、种类使用、密度、对拍、同刻、高度、收尾。

为什么有这个脚本：对话框24 的自检查的是数据链（引用存在、0.1 s 网格、三表展开等价），
没有一项看「这场秀好不好看」。这里补的是后一层：用户 10-10 提的七个观察，每个都能出一个数。
这些数是编排体检，不是艺术验收；没有 UE 实播，开花时刻 = 调用时刻 + 球花条目的开花延迟。

用法：python3 analysis/scripts/编排体检.py FXtools/节目/NewYearFireWorks_v01/三表-R03-high.json
      [--offset 10] [--music analysis/music/汪洋与浩渺_分析.json]
      [--bases FXtools/节目/NewYearFireWorks_v01/基础模板与尺寸.json] [--json out.json]
"""
import argparse, bisect, collections, json, random, statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC_HEIGHT_M = {'small': 150, 'medium': 210, 'large': 330}   # 用户 10-08：相对坝顶开花高度
SKY_LIFE_S = 5.0                                               # 粗估一朵花在天上的时间，仅用于「同屏」估计


def load(path):
    return json.load(open(path, encoding='utf-8'))


def expand(d, base_size):
    subs = {s['TemplateName']: s for s in d['EffectSubTemplates']}
    tpl = {t['TemplateName']: t for t in d['EffectTemplates']}
    ev = []
    for g in d['EffectScheduleGroups']:
        for slot in g['Slots']:
            for e in tpl[slot['TemplateName']]['Entries']:
                sub = e.get('SubTemplateName')
                if not sub:
                    continue
                s = subs[sub]
                ids = [x['FXResourceId'] for x in s['Entries']]
                t0 = slot['StartTime'] + e['LocalTimeOffset']
                if any('Fan' in i for i in ids):
                    offs = [x['LocalTimeOffset'] for x in s['Entries']]
                    ev.append(dict(kind=sub, size='fan', group=g['GroupName'], point=e['SlotIndex'],
                                   call=t0, burst=t0, beams=len(offs), tpl=slot['TemplateName']))
                    continue
                main = [x for x in s['Entries'] if 'Trail' not in x['FXResourceId']][0]
                size = base_size.get(main['FXResourceId'], '?')
                ev.append(dict(kind=sub, size=size, group=g['GroupName'], point=e['SlotIndex'],
                               call=t0, burst=t0 + main['LocalTimeOffset'], res=main['FXResourceId'],
                               tpl=slot['TemplateName']))
    ev.sort(key=lambda x: (x['burst'], x['group'], x['point']))
    return ev


def clusters(times, gap):
    out = []
    for t in sorted(times):
        if out and t - out[-1][-1] <= gap:
            out[-1].append(t)
        else:
            out.append([t])
    return out


def beat_stats(burst_times, kicks, bar0, bar_s, offset, tol=0.1, seed=1):
    ks = sorted(kicks)

    def near(m):
        i = bisect.bisect_left(ks, m)
        c = [ks[j] for j in (i - 1, i) if 0 <= j < len(ks)]
        return min(abs(m - k) for k in c)
    ms = [t - offset for t in burst_times if t - offset > 0]
    hit = sum(near(m) <= tol for m in ms) / len(ms)
    rnd = random.Random(seed)
    lo, hi = min(ms), max(ms)
    chance = sum(near(rnd.uniform(lo, hi)) <= tol for _ in range(20000)) / 20000
    med = statistics.median(near(m) for m in ms)

    def bar_off(m):
        x = ((m - bar0) / bar_s) % 1.0
        return min(x, 1 - x) * bar_s
    on_bar = sum(bar_off(m) <= tol for m in ms) / len(ms)
    return dict(n=len(ms), hit=hit, chance=chance, median_offset_s=med, on_barline=on_bar)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tables')
    ap.add_argument('--offset', type=float, default=10.0, help='演出时间 = 音乐时间 + offset')
    ap.add_argument('--music', default=str(ROOT / 'analysis/music/汪洋与浩渺_分析.json'))
    ap.add_argument('--bases', default=str(ROOT / 'FXtools/节目/NewYearFireWorks_v01/基础模板与尺寸.json'))
    ap.add_argument('--json')
    a = ap.parse_args()

    bases = load(a.bases)
    base_size = {b['id']: b['sizeClass'] for b in bases['bases'] if b['role'] != 'trail'}
    d = load(a.tables)
    ev = expand(d, base_size)
    balls = [e for e in ev if e['size'] != 'fan']
    fans = [e for e in ev if e['size'] == 'fan']
    R = {}
    R['总调用'] = dict(total=len(ev), balls=len(balls), fans=len(fans), fan_share=round(len(fans) / len(ev), 3))

    # 尺寸份额与「主角时刻」
    sz = collections.Counter(e['size'] for e in balls)
    hits = clusters([e['burst'] for e in balls], 0.6)
    L = [e for e in balls if e['size'] == 'large']
    Lh = clusters([e['burst'] for e in L], 1.0)
    R['尺寸'] = dict(balls=dict(sz), share={k: round(v / len(balls), 3) for k, v in sz.items()},
                   hits=len(hits), hit_size_hist=dict(sorted(collections.Counter(len(h) for h in hits).items())),
                   large_moments=len(Lh), first_large_s=round(min(e['burst'] for e in L), 1) if L else None)

    # 种类
    kinds = collections.Counter((e['size'], e['kind']) for e in balls)
    R['种类'] = dict(used=len(kinds), counts={f'{s}/{k}': n for (s, k), n in sorted(kinds.items(), key=lambda x: (x[0][0], -x[1]))},
                   fan_kinds=dict(collections.Counter(e['kind'] for e in fans)))

    # 密度：每 10 s
    end = max(e['burst'] for e in ev)
    dens = []
    for s in range(0, int(end) + 10, 10):
        b = [e for e in balls if s <= e['burst'] < s + 10]
        dens.append(dict(t=f'{s}-{s + 10}', balls=len(b), hits=len(clusters([e['burst'] for e in b], 0.6)),
                         S=sum(e['size'] == 'small' for e in b), M=sum(e['size'] == 'medium' for e in b),
                         L=sum(e['size'] == 'large' for e in b), fans=sum(s <= e['burst'] < s + 10 for e in fans)))
    alive = len(balls) * SKY_LIFE_S / max(end, 1)
    R['密度'] = dict(per10s=dens, mean_alive_balls=round(alive, 1), mean_s_per_hit=round(end / max(len(hits), 1), 2))

    # 同刻：同一调用时刻的点数
    byt = collections.Counter((e['tpl'], round(e['call'], 2)) for e in ev)
    simul = collections.Counter(byt.values())
    R['同刻'] = dict(max_points_same_call=max(byt.values()), hist=dict(sorted(simul.items())),
                   n_ge3=sum(v for k, v in simul.items() if k >= 3))

    # 对拍
    m = load(a.music)
    bar0, bar_s = 0.18, 1.6216          # 音乐分析拟合的小节网格：bar(k) = 0.18 + 1.6216·k
    R['对拍'] = dict(offset=a.offset,
                   per_event=beat_stats([e['burst'] for e in balls], m['kickOnsetsMusicS'], bar0, bar_s, a.offset),
                   per_hit=beat_stats([statistics.mean(h) for h in hits], m['kickOnsetsMusicS'], bar0, bar_s, a.offset))

    # 高度（基础模板里的尾缀终点，相对发射点）
    hs = {}
    for f in bases['flowers']:
        sc = {'Small': 'small', 'Medium': 'medium', 'Large': 'large'}[f['tail'].rsplit('_', 1)[1]]
        hs.setdefault(sc, set()).add(round(f['endpointM'], 1))
    R['高度'] = {k: dict(endpoint_m=sorted(v), spec_m=SPEC_HEIGHT_M[k],
                       ratio=round(sorted(v)[0] / SPEC_HEIGHT_M[k], 2)) for k, v in hs.items()}

    # 开场 / 收尾
    R['开场收尾'] = dict(balls_before_music=sum(e['burst'] < a.offset for e in balls),
                     fans_before_music=sum(e['burst'] < a.offset for e in fans),
                     last_large_s=round(max(e['burst'] for e in L), 1) if L else None,
                     last_ball_s=round(max(e['burst'] for e in balls), 1),
                     last_balls=[(round(e['burst'], 1), e['size'], e['kind']) for e in balls[-6:]],
                     music_end_show_s=round(m['durationMusicS'] + a.offset, 1))

    if a.json:
        Path(a.json).write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(R, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
