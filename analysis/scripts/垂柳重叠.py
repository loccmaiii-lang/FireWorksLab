#!/usr/bin/env python3
"""垂柳（网格金垂柳，主角）和同刻大花 / 中花的重叠体检（跨年秀（22），用户 10-18 00:23「垂柳出现的时候，玩家在下方看，基本和其它大型的重叠在一起了」）。

用 UE 里量到的真实点位（编排实放 B09，`analysis/results/B09_DIRECTOR_20261017/实际点位.json`，无父组件根坐标）和用户的原机位
（编排实放同一份：位置 cm、Yaw −802.658°，Z 比点位低约 119 m）把每朵花投到「从机位看出去」的球面上，
算每朵大型（230 m @ 330 m）/ 中型（150 m @ 210 m）被垂柳花盘盖住的面积比例。

口径（都是推断，依据写在后面）：
- 垂柳花盘直径 = 340 m × (EffectScale ÷ 0.998)：编排实放 B09 175 s 同机位截图里，三朵垂柳花盘直径 ≈ P4–P8 间距 318 m 的 1.07 倍（≈ 340 m），
  那一帧 EffectScale 是 0.998261；T19 读回的网格局部盒宽 400–440 m 是包围盒，不是发光花盘。垂柳越往后越下垂变宽，
  所以只看开花后 0–5 s（还成花盘、最清楚的那段；编排实放 112 s「主角最清楚」）。
- 球花直径用名义值 230 / 150 / 90 m；开花高度相对发射点 330 / 210 / 150 m；垂柳 397.92 m。
- 「盖住」= 小花被垂柳花盘遮住的面积 ÷ 小花面积（两个圆盘在球面上按小角度近似为平面圆盘）。≥ 50 % 记「埋住」，20–50 % 记「压边」。
- PC 和手游分开数：片段 mobile == 'only' 是手游替身，只算手游；mobile == False 只算 PC；True（主角）两边都算。

用法：python3 -I analysis/scripts/垂柳重叠.py 协作/编排B01/逻辑方案_B09.json [协作/编排B01/逻辑方案_B10.json …] [--out 目录]
"""
import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POINTS = ROOT / 'analysis/results/B09_DIRECTOR_20261017/实际点位.json'
CAM = (366268.84375 / 100, -754650.75 / 100, -15286.675781 / 100)       # 编排实放原机位（m）
DIA = {'L': 230.0, 'M': 150.0, 'S': 90.0}
H = {'L': 330.0, 'M': 210.0, 'S': 150.0}
HERO_H = 397.92
WILLOW_DIA_AT_0998 = 340.0
HERO_BASE = 1.217391                      # R03_GoldKamuro_H280 自带的 EffectScale；__K<NN> 再乘 NN/100


def points():
    d = json.loads(POINTS.read_text(encoding='utf-8'))
    return {p['pointId']: tuple(v / 100 for v in (p['location']['X'], p['location']['Y'], p['location']['Z'])) for p in d['points']}


PT = points()


def disc(pt, h, dia):
    x, y, z = PT[pt]
    v = (x - CAM[0], y - CAM[1], z + h - CAM[2])
    n = math.sqrt(sum(a * a for a in v))
    return tuple(a / n for a in v), math.atan(dia / 2 / n)


def ang(u1, u2):
    return math.acos(max(-1.0, min(1.0, sum(a * b for a, b in zip(u1, u2)))))


def lens(r1, r2, d):
    if d >= r1 + r2:
        return 0.0
    if d <= abs(r1 - r2):
        return math.pi * min(r1, r2) ** 2
    a = r1 * r1 * math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))
    b = r2 * r2 * math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
    c = 0.5 * math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))
    return a + b - c


def covered(big, small):
    (u1, a1), (u2, a2) = big, small
    return lens(a1, a2, ang(u1, u2)) / (math.pi * a2 * a2)


def hero_scale(c):
    k = c.get('sizeK', 1.0)
    return round(HERO_BASE * k, 4)


def audit(plan, win=(0.0, 5.0)):
    cues = plan['cues']
    heroes = [(c, e) for c in cues if c['sp'] == 'GKH' for e in c['events']]
    rows, willow_gap = [], []
    for hc, he in sorted(heroes, key=lambda x: x[1]['burst']):
        wd = WILLOW_DIA_AT_0998 * hero_scale(hc) / 0.998261
        w = disc(he['point'], HERO_H, wd)
        for c in cues:
            if c['sp'] == 'GKH' or c['group'] != 'P' or c['size'] not in DIA:
                continue
            for e in c['events']:
                dt = e['burst'] - he['burst']
                if win[0] <= dt <= win[1]:
                    f = disc(e['point'], H[c['size']], DIA[c['size']])
                    rows.append(dict(hero=he['point'], heroAt=round(he['burst'], 2), willowDiaM=round(wd, 1), dt=round(dt, 1), cue=c['id'], sp=c['sp'], size=c['size'], point=e['point'],
                                     mobile=c.get('mobile'), covered=round(covered(w, f), 2)))
    trio = [(c, e) for c, e in heroes if len([1 for c2, e2 in heroes if abs(e2['burst'] - e['burst']) < 1]) > 1]
    for i, (ca, ea) in enumerate(trio):
        for cb, eb in trio[i + 1:]:
            if abs(ea['burst'] - eb['burst']) < 1 and ea['point'] != eb['point']:
                wd = WILLOW_DIA_AT_0998 * hero_scale(ca) / 0.998261
                wa, wb = disc(ea['point'], HERO_H, wd), disc(eb['point'], HERO_H, wd)
                willow_gap.append(dict(a=ea['point'], b=eb['point'], gapM=round((ang(wa[0], wb[0]) - wa[1] - wb[1]) * 500, 0), overlap=round(lens(wa[1], wb[1], ang(wa[0], wb[0])) / (math.pi * wa[1] ** 2), 2)))
    def part(sel):
        rs = [r for r in rows if sel(r)]
        return dict(buried=sum(1 for r in rs if r['covered'] >= 0.5), edge=sum(1 for r in rs if 0.2 <= r['covered'] < 0.5),
                    buriedL=sum(1 for r in rs if r['covered'] >= 0.5 and r['size'] == 'L'), coveredSum=round(sum(r['covered'] for r in rs), 2))
    return dict(pc=part(lambda r: r['mobile'] != 'only'), mobile=part(lambda r: r['mobile'] in ('only', True)), willowGap=willow_gap, rows=rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plans', nargs='+')
    ap.add_argument('--out', default=str(ROOT / 'analysis/results/垂柳重叠_20261018'))
    a = ap.parse_args()
    od = Path(a.out)
    od.mkdir(parents=True, exist_ok=True)
    res, lines = {}, ['# 垂柳和同刻大花 / 中花的重叠（开花后 0–5 s）', '', '口径见 `analysis/scripts/垂柳重叠.py` 文件头：真实点位 + 原机位；垂柳花盘 340 m × (EffectScale ÷ 0.998) 是从实放截图换算的推断。', '',
                      '| 版本 | 垂柳花盘 m | PC 埋住（≥50%） | PC 压边（20–50%） | 手游 埋住 | 手游 压边 | 三朵垂柳之间的空隙 m（负 = 重叠） |', '|---|---|---|---|---|---|---|']
    for p in a.plans:
        plan = json.loads(Path(p).read_text(encoding='utf-8'))
        r = audit(plan)
        name = Path(p).stem.replace('逻辑方案_', '')
        res[name] = r
        wd = r['rows'][0]['willowDiaM'] if r['rows'] else '—'
        gaps = '、'.join(f"{g['a']}–{g['b']} {g['gapM']:.0f}" for g in r['willowGap']) or '—'
        lines.append(f"| {name} | {wd} | {r['pc']['buried']} | {r['pc']['edge']} | {r['mobile']['buried']} | {r['mobile']['edge']} | {gaps} |")
    lines += ['', '## 埋住的花（≥ 50 %）', '']
    for name, r in res.items():
        buried = [x for x in r['rows'] if x['covered'] >= 0.5]
        lines.append(f'### {name}')
        lines += [f"- 垂柳 {x['hero']} @ {x['heroAt']} s：+{x['dt']} s {x['sp']}（{x['size']}）{x['point']} {'手游替身' if x['mobile'] == 'only' else 'PC' if x['mobile'] is False else '共用'}，盖住 {x['covered']:.0%}（{x['cue']}）" for x in buried] or ['- 无']
        lines.append('')
    stem = '_'.join(Path(p).stem.replace('逻辑方案_', '') for p in a.plans)
    (od / f'{stem}.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    (od / f'{stem}.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines[:8 + len(a.plans)]))


if __name__ == '__main__':
    main()
