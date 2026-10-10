#!/usr/bin/env python3
"""并发预算（对话框22，10-11）：ResourceFX 的 MaxInstanceNum 不能调（用户 10-11），
所以编排要在上限里排。上限（PC 表，手游编排评审 10-10 读回）：球花 / 扇形每个资源 10，
尾缀每个资源 20；尾缀按级共用（Trail_Small / Medium / Large 各 20）。
本脚本做两件事：
  1. `capacity()`：按上限算每级「持续」最多每秒放几发（设计时用）；
  2. 读一份三表，展开后扫描「同种同时活着的个数」和「尾缀按级同时活着的个数」，报超限时刻。
寿命是设计假设，不是实测：尾缀活着 = 球花开花延迟 D（小 2.95 / 中 4.38 / 大 7.37 s）；
球花开花后活着 小 3 / 中 4 / 大 6 / 金垂柳 7 s（计划书「开花后 s」）；扇形每束 3 s。
导演到底受不受上限、满了是拒还是挤，还没在 UE 里证实（只能在 UE 里数 R03 117.2 s 十三束银墙的实际束数来判）。
用法：python3 analysis/scripts/并发预算.py FXtools/节目/NewYearFireWorks_v01/三表-R03-high.json
"""
import json, sys, collections
from pathlib import Path

CAP_BALL, CAP_TAIL, CAP_FAN = 10, 20, 10
LIFE_AFTER = {'small': 3.0, 'medium': 4.0, 'large': 6.0, 'GoldKamuro': 7.0}
FAN_LIFE = 3.0
D = {'small': 2.9544, 'medium': 4.3772, 'large': 7.3651}


def capacity():
    """持续上限：尾缀池 20 / 升空时长；单种 10 / 开花后寿命 × 该级种类数。"""
    kinds = {'small': 6, 'medium': 7, 'large': 1}     # 大号现成只有银彩菊；金垂柳留给主角
    out = {}
    for s in D:
        tail = CAP_TAIL / D[s]
        ball = kinds[s] * CAP_BALL / LIFE_AFTER[s]
        out[s] = dict(tail_per_s=round(tail, 2), ball_per_s=round(ball, 2), binding=round(min(tail, ball), 2),
                      per_bar=round(min(tail, ball) * 1.6216, 1))
    return out


def min_wave_interval(points, size='large', kinds_rotating=1):
    """9 点一排的最小波间隔：尾缀池和同种上限都满足。"""
    import math
    k_tail = CAP_TAIL // points                       # 尾缀池里同时能有几波
    t_tail = D[size] / k_tail
    k_ball = max(CAP_BALL // points, 1)               # 同种同时能有几波
    t_ball = LIFE_AFTER[size] / (k_ball * kinds_rotating)
    return round(max(t_tail, t_ball), 2)


def events_from_tables(d, base_size):
    subs = {s['TemplateName']: s for s in d['EffectSubTemplates']}
    tpl = {t['TemplateName']: t for t in d['EffectTemplates']}
    ev = []
    for g in d['EffectScheduleGroups']:
        for slot in g['Slots']:
            for e in tpl[slot['TemplateName']]['Entries']:
                sub = e.get('SubTemplateName')
                if not sub:
                    continue
                s = subs[sub]; t0 = slot['StartTime'] + e['LocalTimeOffset']
                ids = [x['FXResourceId'] for x in s['Entries']]
                if any('Fan' in i for i in ids):
                    for x in s['Entries']:
                        ev.append(dict(res=x['FXResourceId'], t0=t0 + x['LocalTimeOffset'], t1=t0 + x['LocalTimeOffset'] + FAN_LIFE, cls='fan'))
                    continue
                main = [x for x in s['Entries'] if 'Trail' not in x['FXResourceId']][0]
                tail = [x for x in s['Entries'] if 'Trail' in x['FXResourceId']]
                size = base_size.get(main['FXResourceId'], 'medium')
                tb = t0 + main['LocalTimeOffset']
                life = LIFE_AFTER['GoldKamuro'] if 'Kamuro' in main['FXResourceId'] else LIFE_AFTER[size]
                ev.append(dict(res=main['FXResourceId'], t0=tb, t1=tb + life, cls='ball'))
                for x in tail:
                    ev.append(dict(res=x['FXResourceId'], t0=t0 + x['LocalTimeOffset'], t1=tb, cls='tail'))
    return ev


def peaks(ev):
    by = collections.defaultdict(list)
    for e in ev:
        by[e['res']].append(e)
    out = {}
    for res, L in by.items():
        pts = sorted([(e['t0'], 1) for e in L] + [(e['t1'], -1) for e in L], key=lambda x: (x[0], x[1]))
        cur = mx = 0; tmx = 0; over = 0.0; last = None
        for t, dlt in pts:
            if last is not None and cur > (CAP_TAIL if L[0]['cls'] == 'tail' else CAP_BALL):
                over += t - last
            cur += dlt; last = t
            if cur > mx: mx, tmx = cur, t
        cap = CAP_TAIL if L[0]['cls'] == 'tail' else CAP_BALL
        out[res] = dict(cls=L[0]['cls'], peak=mx, at=round(tmx, 1), cap=cap, seconds_over=round(over, 1),
                        starts=len(L), starts_when_full=0)
    return out


if __name__ == '__main__':
    print(json.dumps(capacity(), ensure_ascii=False, indent=1))
    for n in (9, 7, 5):
        print(f'{n} 点一排最小波间隔：大号只有银彩菊 {min_wave_interval(n)} s；大号两种轮换 {min_wave_interval(n, kinds_rotating=2)} s；中号（≥2 种轮换）{min_wave_interval(n, "medium", 2)} s')
    if len(sys.argv) > 1:
        root = Path(__file__).resolve().parents[2]
        bases = json.load(open(root / 'FXtools/节目/NewYearFireWorks_v01/基础模板与尺寸.json', encoding='utf-8'))
        bs = {b['id']: b['sizeClass'] for b in bases['bases'] if b['role'] != 'trail'}
        bs = {k: {'small': 'small', 'medium': 'medium', 'large': 'large'}[v] for k, v in bs.items()}
        d = json.load(open(sys.argv[1], encoding='utf-8'))
        pk = peaks(events_from_tables(d, bs))
        print(f'\n{sys.argv[1]}')
        for res, v in sorted(pk.items(), key=lambda x: -x[1]['seconds_over']):
            flag = '超限' if v['peak'] > v['cap'] else 'ok'
            print(f"{res:42s} {v['cls']:4s} 峰值 {v['peak']:3d}（上限 {v['cap']}）@{v['at']:6.1f}s  超限累计 {v['seconds_over']:5.1f}s  {flag}")
